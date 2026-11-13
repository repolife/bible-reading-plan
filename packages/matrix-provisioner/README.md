# matrix-provisioner

A small service that runs **on the Synapse host** and does exactly three things
for the website's Members & Chat page:

1. create an **ordinary** (never admin) Matrix account for a website member,
2. issue a fresh password for an account **it created**, for the member it was created for,
3. DM a one-time link code to an existing Matrix account.

Nothing else is exposed. The general Synapse admin API stays private.

```
Admin UI → Netlify Function (session + is_admin checked) → HTTPS /provision/* → this service (127.0.0.1:8787) → Synapse (127.0.0.1:8008)
```

Members whom an admin invited to the website can also create their own account
from `/chat/join`. That goes through the `member-matrix` function, which checks
the invitation server-side and only ever creates the account for the caller.

No runtime dependencies; Node ≥ 20.

## Security model

- **Authentication:** every request carries an HMAC-SHA256 signature over
  `timestamp \n nonce \n METHOD \n path \n body` (see `src/auth.mjs`).
  Requests older than 5 minutes or with a reused nonce are rejected. Nonces
  survive restarts. Netlify has no fixed egress IPs, so an IP allowlist is not
  used; TLS comes from the existing reverse proxy.
- **Loopback only:** the service refuses to bind to anything except
  `127.0.0.1`/`::1`. The proxy forwards only `/provision/*`.
- **Ordinary accounts only:** registration always sends `admin: false`, and
  the shared-secret MAC includes `notadmin`, so Synapse rejects anything else.
- **Never someone else's account:** the service records `localpart →
  website profile` in its state file before registering. It refuses any
  username that already exists in Synapse and was not created by it, and
  allows one account per website profile. Passwords are reset only for
  accounts it created, and only when asked for that same profile.
- **Crash-safe retries:** if registration succeeded but the response was lost,
  a retry finds the account in Synapse, checks it was created after the
  recorded attempt started, and reports it as already created. An older
  account with that name is treated as someone else's.
- **No secrets at rest:** the state file (`0600`) holds no passwords or codes.
  Logs contain method, path, status and error code only.
- **Blocked:** `@jared.duel` (the misspelled duplicate) can never be created,
  reset or messaged. Reserved names (`admin`, `root`, `provisioner`, …) cannot be created.
- **One announcements room:** `POST /v1/announcements` posts only to the room
  in `ANNOUNCEMENTS_ROOM_ID`. Callers cannot name a room, so the HMAC secret
  alone cannot reach members' direct chats or other rooms.

**Residual risk:** password resets and user lookups need a Synapse
server-admin access token (the `@provisioner` bot). That token is powerful.
It never leaves this host, sits in a root-owned `0600` file, and only the
operations below can be triggered remotely. If the host is compromised, rotate
it (log the bot out) along with the HMAC secret.

## API

All endpoints are `POST` with a JSON body and the signature headers
`X-Provisioner-Timestamp`, `X-Provisioner-Nonce`, `X-Provisioner-Signature`.
Errors are `{ "error": "<code>" }`. `401` codes: `missing_signature`,
`bad_signature`, `stale_request`, `replayed_request`.

### `POST /v1/accounts`

`{ "profile_id": "<uuid>", "localpart": "jane.doe", "idempotency_key": "<uuid>" }`

| Status | Body | Meaning |
|---|---|---|
| 201 | `{ "user_id": "@jane.doe:ozark-fellowship.netlify.app" }` | Created now |
| 200 | `{ "user_id": … }` | Already created by this service for this profile (safe retry) |
| 409 | `{ "error": "username_taken" }` | Exists and is not ours; nothing was changed |
| 409 | `{ "error": "profile_has_account", "user_id": … }` | This profile already has a different account |
| 400 | `invalid_username`, `reserved_username`, `blocked_username`, `invalid_request` | |
| 502 | `synapse_unavailable`, … | Safe to retry with the same body |

### `POST /v1/accounts/password`

`{ "profile_id": "<uuid>", "user_id": "@jane.doe:…" }` → `200 { "password": "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx" }`.
Logs out the account's other sessions. `403 not_managed` for any account this
service did not create for that profile.

### `POST /v1/link-codes`

`{ "user_id": "@jane.doe:…", "code": "ABCD2345" }` → `202`. The bot opens (or
reuses) a direct chat with the user and posts the code. `404 user_not_found`
for unknown or deactivated users. The room is not end-to-end encrypted; codes
expire after 15 minutes and are single-use on the website side.

### `POST /v1/announcements`

`{ "text": "…", "idempotency_key": "<uuid>" }` → `202`. Posts `text` (plain
text, at most 2,000 characters, newlines allowed) as an `m.text` message to the
"Calendar alerts" room configured in `ANNOUNCEMENTS_ROOM_ID`. `m.text` rather
than `m.notice`, because clients mute notices by default. The idempotency key
is the Matrix transaction ID, so a retry does not post twice.
`503 announcements_not_configured` without the room setting;
`502 announcements_room_unavailable` if the bot can no longer post there.

**Setup:** create the room, invite `@provisioner`, accept the invite as the bot
(or create the room as the bot), and let it post if the room limits who can.
Put the room ID (`!…`, from the room's advanced settings) in
`/etc/matrix-provisioner/env` and restart the service.

### `GET /healthz`

Unauthenticated. `200 { "ok": true }`.

## Deploying on the Linode

Run these on the Synapse host. Paths assume a Debian/Ubuntu package install of
Synapse; adjust if yours differs.

1. **Node ≥ 20:** `node --version`.
2. **Registration shared secret:** confirm `registration_shared_secret` is set
   in `homeserver.yaml` (it works even though public registration is
   disabled). If you add it, restart Synapse.
3. **Bot account** (a server admin, needed for password resets and lookups):
   ```sh
   register_new_matrix_user -c /etc/matrix-synapse/homeserver.yaml -u provisioner -a http://127.0.0.1:8008
   ```
   Then get its access token over loopback:
   ```sh
   curl -s http://127.0.0.1:8008/_matrix/client/v3/login -H 'Content-Type: application/json' \
     -d '{"type":"m.login.password","identifier":{"type":"m.id.user","user":"provisioner"},"password":"<bot password>","initial_device_display_name":"matrix-provisioner"}'
   ```
   Keep `access_token`. Store the bot password in your password manager.
4. **Install:**
   ```sh
   sudo useradd --system --no-create-home --shell /usr/sbin/nologin matrix-provisioner
   sudo mkdir -p /opt/matrix-provisioner /etc/matrix-provisioner
   sudo cp -r src package.json /opt/matrix-provisioner/
   sudo cp deploy/env.example /etc/matrix-provisioner/env
   sudo chmod 600 /etc/matrix-provisioner/env
   ```
   Fill in `/etc/matrix-provisioner/env`. Generate the HMAC secret with
   `openssl rand -hex 32`.
5. **Start:**
   ```sh
   sudo cp deploy/matrix-provisioner.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now matrix-provisioner
   curl -s http://127.0.0.1:8787/healthz   # {"ok":true}
   ```
6. **Reverse proxy:** add `deploy/Caddyfile.snippet` or `deploy/nginx.snippet`
   to the existing `172-238-169-102.sslip.io` site and reload the proxy. Do not
   change the rules that keep `/_synapse/admin` private.
7. **Check from outside:**
   ```sh
   curl -s https://172-238-169-102.sslip.io/provision/healthz                      # {"ok":true}
   curl -s -X POST https://172-238-169-102.sslip.io/provision/v1/accounts -d '{}'  # {"error":"missing_signature"}
   curl -s -o /dev/null -w '%{http_code}\n' https://172-238-169-102.sslip.io/_synapse/admin/v1/server_version  # still blocked
   ```
8. **Netlify env vars:** `MATRIX_PROVISIONER_URL=https://172-238-169-102.sslip.io/provision`
   and `MATRIX_PROVISIONER_SECRET=<same HMAC secret>`.
9. **Backups:** include `/var/lib/matrix-provisioner/state.json`. If it is
   lost, Synapse still refuses existing names and the website database still
   allows one Matrix account per member, but this service loses its own
   one-account-per-profile check and can no longer issue passwords for
   accounts it created earlier.

## Tests

```sh
npm test   # node --test, with an in-process fake Synapse
```

`packages/netlify/tests/provisioner-contract.test.ts` also runs the real
Netlify client against this service.
