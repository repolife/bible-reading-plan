import { useCallback, useEffect, useState } from "react";
import { callServer } from "@/utils/serverApi";
import { MATRIX_SERVER, checkLocalpart, suggestLocalpart } from "@/utils/matrixLocalpart";
import { useProfileStore } from "@store/useProfileStore";

const button =
  "w-full py-2.5 rounded-lg bg-[#0e9496] text-white text-sm font-medium hover:bg-[#0c7c7e] transition-colors disabled:opacity-50";

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
        <button onClick={copy} className="text-xs px-2.5 py-2 rounded-lg border border-[#c8e8e9] text-[#0e9496]">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
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
  const localpartError = checkLocalpart(localpart);
  const submit = (e) => {
    e.preventDefault();
    onSubmit(localpart);
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <h3 className="font-semibold text-gray-900">Set up chat</h3>
      <p className="text-sm text-gray-700">
        Choose a username for chat. Most people use their name, like <strong>jane.doe</strong>. It can&apos;t be changed later.
      </p>
      <input
        value={localpart}
        onChange={(e) => setLocalpart(e.target.value)}
        placeholder="jane.doe"
        aria-label="Chat username"
        autoCapitalize="none"
        autoComplete="off"
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
      {error && <p role="alert" className="text-sm text-red-600">{SETUP_ERRORS[error.code] || error.message}</p>}
      <button type="submit" disabled={busy || !!localpartError} className={button}>
        {busy ? "Creating your account…" : "Create my chat account"}
      </button>
    </form>
  );
};

// The one-time password lives only in this component's state. It is never
// stored, logged, or sent anywhere else.
export const ChatAccount = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(null);
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

  useEffect(() => {
    load();
    return () => setIssued(null);
  }, [load]);

  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      setIssued(await callServer("member-matrix", { body: { action: "claim-password" } }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      load();
    }
  };

  // Creates the account, then collects the password in the same step.
  const setup = async (localpart) => {
    setBusy(true);
    setError(null);
    try {
      await callServer("member-matrix", { body: { action: "setup", localpart } });
      setIssued(await callServer("member-matrix", { body: { action: "claim-password" } }));
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
        <h3 className="font-semibold text-gray-900">Your chat password</h3>
        <div className="text-xs bg-amber-50 text-amber-800 rounded-lg p-3">
          This is shown <strong>only once</strong> and is not saved anywhere. Copy it into your password manager now,
          then change it in Element under Settings → Security if you like.
        </div>
        <CopyRow label="Matrix ID" value={issued.matrixUserId} />
        <CopyRow label="Password" value={issued.password} />
        <SignInSteps homeserver={issued.homeserver} matrixUserId={issued.matrixUserId} />
        <button onClick={() => setIssued(null)} className={button}>I&apos;ve saved it</button>
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
        <p className="text-sm text-gray-700">This chat account is linked to your website account. Sign in with your existing password.</p>
      ) : account.passwordClaimAllowed ? (
        <>
          <p className="text-sm text-gray-700">Your chat account is ready. Get your password to sign in.</p>
          {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
          <button onClick={claim} disabled={busy} className={button}>{busy ? "Creating password…" : "Get my chat password"}</button>
        </>
      ) : (
        <p className="text-sm text-gray-700">
          You collected your chat password
          {account.passwordClaimedAt ? ` on ${new Date(account.passwordClaimedAt).toLocaleDateString()}` : ""}.
          Forgot it? Ask an admin to issue a new one.
        </p>
      )}
      <SignInSteps homeserver={homeserver} matrixUserId={account.matrixUserId} />
    </div>
  );
};
