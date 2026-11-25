import { useCallback, useEffect, useRef, useState } from "react";
import { callServer } from "@/utils/serverApi";
import { MATRIX_SERVER, checkLocalpart, suggestLocalpart } from "@/utils/matrixLocalpart";
import { useProfileStore } from "@store/useProfileStore";

const button =
  "w-full py-2.5 rounded-lg bg-[#0e9496] text-white text-sm font-medium hover:bg-[#0c7c7e] transition-colors disabled:opacity-50";
const secondaryButton =
  "w-full py-2 rounded-lg border border-[#c8e8e9] text-[#0e9496] text-sm font-medium hover:bg-[#f0fafa] transition-colors disabled:opacity-50";

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128;
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function checkPassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Keep it under ${MAX_PASSWORD_LENGTH} characters.`;
  }
  for (let i = 0; i < password.length; i++) {
    const code = password.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return "Use normal letters, numbers, or symbols.";
  }
  return null;
}

function suggestPassword() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]);
  return chars.join("").match(/.{4}/g).join("-");
}

const CopyRow = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <p className="text-xs text-[#3d6e70] mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-sm bg-[#f0fafa] rounded-lg px-3 py-2 break-all">{value}</code>
        <button type="button" onClick={copy} className="text-xs px-2.5 py-2 rounded-lg border border-[#c8e8e9] text-[#0e9496]">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
};

const PasswordInput = ({ id, label, value, onChange, showHint }) => {
  const [visible, setVisible] = useState(false);
  const passwordError = checkPassword(value);

  const fillSuggested = () => {
    onChange(suggestPassword());
    setVisible(true);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-gray-700">
          {label}
        </label>
        <button type="button" onClick={fillSuggested} className="text-xs text-[#0e9496] hover:underline">
          Suggest one
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="At least 10 characters"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e9496] focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-xs px-2.5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {showHint && passwordError ? (
        <p className="text-xs text-red-600">{passwordError}</p>
      ) : (
        <p className="text-xs text-gray-500">At least {MIN_PASSWORD_LENGTH} characters. You can change it here anytime.</p>
      )}
    </div>
  );
};

// Opens Element X with our server already chosen, so nobody types a homeserver.
const elementXLink = (matrixUserId) =>
  `https://mobile.element.io/element?account_provider=${matrixUserId.slice(matrixUserId.indexOf(":") + 1)}&login_hint=${encodeURIComponent(`mxid:${matrixUserId}`)}`;

const SignInSteps = ({ homeserver, matrixUserId }) => (
  <div className="space-y-3">
    <a href={elementXLink(matrixUserId)} target="_blank" rel="noreferrer" className={`${button} block text-center`}>
      Open chat in Element X
    </a>
    <p className="text-xs text-gray-500">
      On your phone, this opens the Element X app with our server already chosen. Enter your password when it asks.
    </p>
    <p className="text-sm font-medium text-gray-900">On a computer, or the button didn&apos;t work?</p>
    <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
      <li>
        Open Element (<a className="text-[#0e9496] underline" href="https://app.element.io" target="_blank" rel="noreferrer">app.element.io</a> or the Element app) and choose <strong>Sign in</strong>.
      </li>
      <li>
        Next to the homeserver, choose <strong>Edit</strong> and enter <strong>{homeserver}</strong>.
      </li>
      <li>
        Username: <strong>{matrixUserId.slice(1, matrixUserId.indexOf(":"))}</strong>
      </li>
    </ol>
  </div>
);

const SETUP_ERRORS = {
  username_taken: "That username is taken. Try another.",
  matrix_id_in_use: "That username is taken. Try another.",
};

const SetupForm = ({ defaultName, busy, error, onSubmit }) => {
  const [localpart, setLocalpart] = useState(() => suggestLocalpart(defaultName));
  const [password, setPassword] = useState("");
  const localpartError = checkLocalpart(localpart);
  const passwordError = checkPassword(password);
  const submit = (e) => {
    e.preventDefault();
    onSubmit(localpart, password);
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <h3 className="font-semibold text-gray-900">Set up chat</h3>
      <p className="text-sm text-gray-700">
        Choose a username and password for chat. Most people use their name, like <strong>jane.doe</strong>. The username can&apos;t be changed later.
      </p>
      <div className="space-y-1">
        <label htmlFor="chat-setup-username" className="text-xs font-medium text-gray-700">
          Chat username
        </label>
        <input
          id="chat-setup-username"
          value={localpart}
          onChange={(e) => setLocalpart(e.target.value)}
          placeholder="jane.doe"
          aria-label="Chat username"
          autoCapitalize="none"
          autoComplete="username"
          spellCheck={false}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e9496] focus:border-transparent"
        />
        {localpartError ? (
          <p className="text-xs text-red-600">{localpartError}</p>
        ) : (
          <p className="text-xs text-gray-500">
            Your chat ID: <strong className="break-all">@{localpart}:{MATRIX_SERVER}</strong>
          </p>
        )}
      </div>
      <PasswordInput
        id="chat-setup-password"
        label="Chat password"
        value={password}
        onChange={setPassword}
        showHint={password.length > 0}
      />
      {error && <p role="alert" className="text-sm text-red-600">{SETUP_ERRORS[error.code] || error.message}</p>}
      <button type="submit" disabled={busy || !!localpartError || !!passwordError} className={button}>
        {busy ? "Creating your account…" : "Create my chat account"}
      </button>
    </form>
  );
};

const SetPasswordForm = ({ idPrefix, label, submitLabel, showLogoutOption, busy, error, onSubmit, onCancel }) => {
  const [password, setPassword] = useState("");
  const [logoutDevices, setLogoutDevices] = useState(false);
  const passwordError = checkPassword(password);

  const submit = async (e) => {
    e.preventDefault();
    const ok = await onSubmit(password, logoutDevices);
    if (ok) {
      setPassword("");
      setLogoutDevices(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <PasswordInput
        id={`${idPrefix}-password`}
        label={label}
        value={password}
        onChange={setPassword}
        showHint={password.length > 0}
      />
      {showLogoutOption && (
        <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={logoutDevices}
            onChange={(e) => setLogoutDevices(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-[#0e9496] focus:ring-[#0e9496]"
          />
          <span>
            Sign out of other devices{" "}
            <span className="text-gray-500">(leave unchecked to stay signed in on your phone)</span>
          </span>
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
      <div className={onCancel ? "flex gap-2" : undefined}>
        <button type="submit" disabled={busy || !!passwordError} className={button}>
          {busy ? "Saving password…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

// Passwords live only in this component's state. They are never stored, logged,
// or sent anywhere except straight to the server to update Synapse.
export const ChatAccount = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(null);
  const { profile } = useProfileStore();

  const load = useCallback(async () => {
    try {
      setStatus(await callServer("member-matrix"));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
      setIssued(null);
    };
  }, [load]);

  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await callServer("member-matrix", { body: { action: "claim-password" } });
      setIssued({ ...res, chosen: false });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      load();
    }
  };

  const savePassword = async (password, logoutDevices = false, { showSignInCard = false } = {}) => {
    setBusy(true);
    setError(null);
    setPasswordSaved(false);
    try {
      const res = await callServer("member-matrix", {
        body: { action: "set-password", password, logoutDevices },
      });
      if (!mounted.current) return true;
      if (showSignInCard) {
        setIssued({ matrixUserId: res.matrixUserId, homeserver: res.homeserver, password, chosen: true });
      } else {
        setChangingPassword(false);
        setPasswordSaved(true);
      }
      await load();
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Creates the account, then sets the member's chosen password in the same step.
  const setup = async (localpart, password) => {
    setBusy(true);
    setError(null);
    try {
      await callServer("member-matrix", { body: { action: "setup", localpart } });
      if (!mounted.current) return;
      if (password) {
        const res = await callServer("member-matrix", {
          body: { action: "set-password", password, logoutDevices: false },
        });
        if (!mounted.current) return;
        setIssued({ matrixUserId: res.matrixUserId, homeserver: res.homeserver, password, chosen: true });
      }
      load();
    } catch (err) {
      // Reload first: load() clears the error on success.
      await load();
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    setCodeError(null);
    try {
      await callServer("member-matrix", { body: { action: "confirm-link", code } });
      setCode("");
      await load();
    } catch (err) {
      setCodeError(err);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading chat status…</p>;
  if (error && !status) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error.message}</p>
        <button onClick={() => { setLoading(true); load(); }} className={button}>Try again</button>
      </div>
    );
  }

  const { account, pendingLink, homeserver, selfSetupAllowed } = status;

  if (issued) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">
          {issued.chosen ? "Your chat account is ready" : "Your chat password"}
        </h3>
        <div className="text-xs bg-amber-50 text-amber-800 rounded-lg p-3">
          {issued.chosen ? (
            <>
              Copy your password below if you want to paste it into Element X. We don&apos;t save it, and you can
              change it anytime from <strong>Account → Chat</strong> on this website.
            </>
          ) : (
            <>
              This is shown <strong>only once</strong> and is not saved anywhere. Save it in your password manager now—you
              can also change your chat password anytime from <strong>Account → Chat</strong> on this website.
            </>
          )}
        </div>
        <CopyRow label="Matrix ID" value={issued.matrixUserId} />
        <CopyRow label="Password" value={issued.password} />
        <SignInSteps homeserver={issued.homeserver} matrixUserId={issued.matrixUserId} />
        <button onClick={() => setIssued(null)} className={secondaryButton}>
          {issued.chosen ? "Done" : "I've saved it"}
        </button>
      </div>
    );
  }

  if (pendingLink && account?.status === "link_pending") {
    return (
      <form onSubmit={confirm} className="space-y-3">
        <h3 className="font-semibold text-gray-900">Link your chat account</h3>
        <p className="text-sm text-gray-700">
          We sent a code by Matrix direct message to <strong className="break-all">{pendingLink.matrixUserId}</strong>.
          Open Element, accept the chat invitation from the Ozark Fellowship bot, and enter the code here.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCD-2345"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center tracking-widest font-mono focus:ring-2 focus:ring-[#0e9496] focus:border-transparent"
        />
        {codeError && (
          <p role="alert" className="text-sm text-red-600">
            {codeError.message}
            {codeError.details?.attemptsRemaining !== undefined &&
              ` (${codeError.details.attemptsRemaining} ${codeError.details.attemptsRemaining === 1 ? "try" : "tries"} left)`}
          </p>
        )}
        <button type="submit" disabled={busy || code.trim().length < 8} className={button}>
          {busy ? "Checking…" : "Link account"}
        </button>
        <p className="text-xs text-gray-500">
          Code expires {new Date(pendingLink.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
          Didn&apos;t get it, or not your account? Tell an admin.
        </p>
      </form>
    );
  }

  if (!account && selfSetupAllowed) {
    return <SetupForm defaultName={profile?.name} busy={busy} error={error} onSubmit={setup} />;
  }

  if (!account || account.status === "link_pending") {
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">Chat</h3>
        <p className="text-sm text-gray-700">
          Chat isn&apos;t set up for your account yet. Ask an admin to enable it.
        </p>
      </div>
    );
  }

  // An unfinished attempt must be retried with the same username.
  if (account.status !== "active" && account.origin === "provisioned" && selfSetupAllowed) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Set up chat</h3>
        <p className="text-sm text-gray-700">
          Setting up <strong className="break-all">{account.matrixUserId}</strong> didn&apos;t finish. It is safe to try again.
        </p>
        {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
        <button
          onClick={() => setup(account.matrixUserId.slice(1, account.matrixUserId.indexOf(":")))}
          disabled={busy}
          className={button}
        >
          {busy ? "Creating your account…" : "Try again"}
        </button>
        <p className="text-xs text-gray-500">Still stuck? Tell an admin.</p>
      </div>
    );
  }

  if (account.status !== "active") {
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">Chat</h3>
        <p className="text-sm text-gray-700">Your chat account is being set up. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Chat</h3>
      <CopyRow label="Your Matrix ID" value={account.matrixUserId} />
      {account.origin === "linked" ? (
        <p className="text-sm text-gray-700">
          This chat account is linked to your website account. Sign in with your existing password. To change it, sign in at{" "}
          <a className="text-[#0e9496] underline" href="https://app.element.io" target="_blank" rel="noreferrer">app.element.io</a>{" "}
          and open <strong>Settings → General</strong>.
        </p>
      ) : account.passwordClaimAllowed ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Your chat account is ready. Choose a password to sign in to Element X.</p>
          <SetPasswordForm
            idPrefix="chat-initial"
            label="Chat password"
            submitLabel="Set chat password"
            showLogoutOption={false}
            busy={busy}
            error={error}
            onSubmit={(pw) => savePassword(pw, false, { showSignInCard: true })}
          />
          <button type="button" onClick={claim} disabled={busy} className="w-full text-xs text-[#0e9496] hover:underline py-1">
            Or generate a one-time password for me
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {passwordSaved && (
            <div role="status" className="text-xs bg-emerald-50 text-emerald-800 rounded-lg p-3">
              Your chat password has been updated. Use your new password next time you sign in to Element X.
            </div>
          )}
          {changingPassword ? (
            <SetPasswordForm
              idPrefix="chat-change"
              label="New chat password"
              submitLabel="Save new password"
              showLogoutOption
              busy={busy}
              error={error}
              onSubmit={(pw, logout) => savePassword(pw, logout)}
              onCancel={() => {
                setChangingPassword(false);
                setError(null);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setChangingPassword(true);
                setPasswordSaved(false);
                setError(null);
              }}
              className={secondaryButton}
            >
              Change chat password
            </button>
          )}
        </div>
      )}
      <SignInSteps homeserver={homeserver} matrixUserId={account.matrixUserId} />
    </div>
  );
};
