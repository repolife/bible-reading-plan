import { useCallback, useEffect, useState } from 'react'
import { Typography } from '@material-tailwind/react'
import { toast } from 'react-toastify'
import { useProfileStore } from '@store/useProfileStore'
import { callServer } from '@/utils/serverApi'
import { MATRIX_SERVER, checkLocalpart, suggestLocalpart } from '@/utils/matrixLocalpart'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0e9496] focus:border-transparent dark:bg-neutral-800 dark:text-white text-sm'
const primaryButton =
  'py-2 px-3 rounded-lg bg-[#0e9496] text-white text-sm font-medium hover:bg-[#0c7c7e] transition-colors disabled:opacity-50'
const secondaryButton =
  'py-2 px-3 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50'

const Modal = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{subtitle}</p>}
      {children}
    </div>
  </div>
)

const ErrorNote = ({ error }) =>
  error ? (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-3">
      {error.message}
      {error.details?.matrixUserId ? ` (${error.details.matrixUserId})` : ''}
    </p>
  ) : null

const ChatStatus = ({ member }) => {
  const m = member.matrix
  if (!m) return <span className="text-xs text-gray-400 dark:text-gray-500">Chat not enabled</span>
  const styles = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    provisioning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    link_pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  }
  const labels = {
    active: m.origin === 'linked' ? 'Linked' : 'Active',
    provisioning: 'Setting up…',
    failed: `Failed${m.lastErrorCode ? `: ${m.lastErrorCode}` : ''}`,
    link_pending: 'Waiting for code',
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${styles[m.status]}`}>{labels[m.status]}</span>
      <span className="text-xs text-gray-600 dark:text-gray-300 break-all">{m.userId}</span>
      {m.status === 'active' && m.origin === 'provisioned' && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {m.passwordClaimAllowed ? '· password ready to collect' : m.passwordClaimedAt ? '· password collected' : ''}
        </span>
      )}
    </div>
  )
}

const InviteModal = ({ onClose, onDone }) => {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await callServer('admin-invite', { body: { email, name } })
      toast.success(`Invitation sent to ${email}`)
      onDone()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Invite member" subtitle="They'll get an email to set a password and finish their profile." onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input className={inputClass} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputClass} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <ErrorNote error={error} />
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className={`flex-1 ${secondaryButton}`}>Cancel</button>
          <button type="submit" disabled={busy} className={`flex-1 ${primaryButton}`}>{busy ? 'Sending…' : 'Send invite'}</button>
        </div>
      </form>
    </Modal>
  )
}

const RolesModal = ({ member, servantRoles, onClose, onDone }) => {
  const [roles, setRoles] = useState(member.servantRoles)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await callServer('admin-servant-roles', { body: { profileId: member.id, roles } })
      toast.success('Roles updated')
      onDone()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Servant roles" subtitle={member.name || member.email} onClose={onClose}>
      <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1 mb-4">
        {servantRoles.map((role) => (
          <label key={role} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={roles.includes(role)}
              onChange={() => setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))}
              className="w-4 h-4 rounded border-neutral-300 text-[#0e9496] focus:ring-[#0e9496]"
            />
            <span className="text-sm text-neutral-800 dark:text-neutral-200">{role}</span>
          </label>
        ))}
      </div>
      <ErrorNote error={error} />
      <div className="flex gap-3">
        <button onClick={onClose} className={`flex-1 ${secondaryButton}`}>Cancel</button>
        <button onClick={save} disabled={busy} className={`flex-1 ${primaryButton}`}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  )
}

const EnableChatModal = ({ member, onClose, onDone }) => {
  const [mode, setMode] = useState('create')
  const [localpart, setLocalpart] = useState(() => suggestLocalpart(member.name))
  const [existingId, setExistingId] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const localpartError = checkLocalpart(localpart)

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      await callServer('admin-matrix', { body: { action: 'provision', profileId: member.id, localpart } })
      toast.success(`Chat account @${localpart}:${MATRIX_SERVER} created`)
      onDone()
    } catch (err) {
      setError(err)
      if (err.details?.retryable) onDone({ keepOpen: true })
    } finally {
      setBusy(false)
    }
  }

  const link = async () => {
    setBusy(true)
    setError(null)
    try {
      await callServer('admin-matrix', { body: { action: 'start-link', profileId: member.id, matrixUserId: existingId.trim() } })
      toast.success('Link code sent by Matrix direct message')
      onDone()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const tab = (key, label) => (
    <button
      onClick={() => { setMode(key); setError(null) }}
      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${mode === key ? 'bg-[#0e9496] text-white' : 'text-[#3d6e70] dark:text-gray-300 hover:bg-[#f0fafa] dark:hover:bg-neutral-800'}`}
    >
      {label}
    </button>
  )

  return (
    <Modal title="Enable chat" subtitle={member.name || member.email} onClose={onClose}>
      <div className="flex gap-1 border border-[#c8e8e9] dark:border-neutral-700 rounded-xl p-1 mb-4">
        {tab('create', 'Create new account')}
        {tab('link', 'Link existing account')}
      </div>

      {mode === 'create' ? (
        <div className="space-y-3">
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Matrix username
            <div className="flex items-center mt-1">
              <span className="text-sm text-gray-500 mr-1">@</span>
              <input className={inputClass} value={localpart} onChange={(e) => { setLocalpart(e.target.value); setUnderstood(false) }} autoCapitalize="none" spellCheck={false} />
            </div>
          </label>
          {localpartError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{localpartError}</p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-300 break-all">
              Matrix ID: <strong>@{localpart}:{MATRIX_SERVER}</strong>
            </p>
          )}
          <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg p-3">
            Matrix IDs are permanent and <strong>cannot be renamed</strong> later. Check spelling carefully.
            The account will be an ordinary member account. {member.name?.split(' ')[0] || 'The member'} collects
            their password themselves under Account → Chat; you never see it.
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-[#0e9496] focus:ring-[#0e9496]" />
            I&apos;ve checked the spelling and understand it can&apos;t be changed.
          </label>
          <ErrorNote error={error} />
          <div className="flex gap-3">
            <button onClick={onClose} className={`flex-1 ${secondaryButton}`}>Cancel</button>
            <button onClick={create} disabled={busy || !!localpartError || !understood} className={`flex-1 ${primaryButton}`}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Existing Matrix ID
            <input className={`${inputClass} mt-1`} placeholder={`@name:${MATRIX_SERVER}`} value={existingId} onChange={(e) => setExistingId(e.target.value)} autoCapitalize="none" spellCheck={false} />
          </label>
          <div className="text-xs bg-[#f0fafa] dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-lg p-3">
            A one-time code will be sent by Matrix direct message to this account. The link only completes when{' '}
            {member.name?.split(' ')[0] || 'the member'} enters the code while signed in to the website, proving they
            control both accounts. Don&apos;t rely on matching names.
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-[#0e9496] focus:ring-[#0e9496]" />
            I&apos;ve confirmed with this member that this Matrix ID is theirs.
          </label>
          <ErrorNote error={error} />
          <div className="flex gap-3">
            <button onClick={onClose} className={`flex-1 ${secondaryButton}`}>Cancel</button>
            <button onClick={link} disabled={busy || !existingId.trim() || !verified} className={`flex-1 ${primaryButton}`}>
              {busy ? 'Sending…' : 'Send link code'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const ChatActions = ({ member, onEnable, onChanged }) => {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const m = member.matrix

  const run = async (label, body, success) => {
    setBusy(label)
    setError(null)
    try {
      await callServer('admin-matrix', { body: { profileId: member.id, ...body } })
      if (success) toast.success(success)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
      onChanged()
    }
  }

  const localpart = m?.userId?.slice(1, m.userId.indexOf(':'))
  const small = 'text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50'
  const teal = `${small} bg-[#0e9496]/10 text-[#0e9496] dark:bg-[#0e9496]/20 dark:text-[#5ecfcf] hover:bg-[#0e9496] hover:text-white`
  const plain = `${small} border border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800`

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {!m && (
          <button onClick={onEnable} disabled={!member.hasProfile} title={member.hasProfile ? '' : 'Member must accept their invitation first'} className={teal}>
            Enable chat
          </button>
        )}
        {(m?.status === 'failed' || m?.status === 'provisioning') && (
          <>
            <button onClick={() => run('retry', { action: 'provision', localpart }, 'Chat account created')} disabled={!!busy} className={teal}>
              {busy === 'retry' ? 'Retrying…' : `Retry @${localpart}`}
            </button>
            {m.status === 'failed' && (
              <button onClick={() => run('discard', { action: 'discard' })} disabled={!!busy} className={plain}>Discard attempt</button>
            )}
          </>
        )}
        {m?.status === 'link_pending' && (
          <>
            <button onClick={() => run('resend', { action: 'start-link', matrixUserId: m.userId }, 'New link code sent')} disabled={!!busy} className={teal}>
              {busy === 'resend' ? 'Sending…' : 'Resend code'}
            </button>
            <button onClick={() => run('cancel', { action: 'discard' }, 'Link cancelled')} disabled={!!busy} className={plain}>Cancel link</button>
          </>
        )}
        {m?.status === 'active' && m.origin === 'provisioned' && !m.passwordClaimAllowed && (
          <button
            onClick={() => run('allow', { action: 'allow-password-claim' }, 'Member can now collect a new chat password')}
            disabled={!!busy}
            title="Lets the member collect a fresh password under Account → Chat. Their current password stops working when they do."
            className={plain}
          >
            {busy === 'allow' ? 'Saving…' : 'Issue new password'}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">
          {error.message}
          {error.details?.retryable ? ' You can retry safely.' : ''}
        </p>
      )}
    </div>
  )
}

export const MembersChat = () => {
  const { profile } = useProfileStore()
  const [members, setMembers] = useState([])
  const [servantRoles, setServantRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [inviting, setInviting] = useState(false)
  const [editingRoles, setEditingRoles] = useState(null)
  const [enablingChat, setEnablingChat] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await callServer('admin-members')
      setMembers(data.members)
      setServantRoles(data.servantRoles)
      setLoadError(null)
    } catch (err) {
      setLoadError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (profile && profile.is_admin !== true) {
    return (
      <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">This page is for admins only.</div>
    )
  }

  const term = search.trim().toLowerCase()
  const filtered = members.filter(
    (m) =>
      !term ||
      m.name?.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.matrix?.userId?.includes(term) ||
      m.servantRoles.some((r) => r.toLowerCase().includes(term))
  )

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Typography variant="h5" className="text-gray-900 dark:text-white font-semibold">
          Members &amp; Chat
        </Typography>
        <button onClick={() => setInviting(true)} className={primaryButton}>Invite member</button>
      </div>

      <input
        type="search"
        placeholder="Search by name, email, role or Matrix ID…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${inputClass} mb-4`}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#0e9496] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400 mb-3">{loadError.status === 403 ? 'This page is for admins only.' : loadError.message}</p>
          {loadError.status !== 403 && <button onClick={() => { setLoading(true); load() }} className={secondaryButton}>Try again</button>}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">No members found.</p>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((member) => (
            <li key={member.id} className="p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 border-2 border-[#0e9496]">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{member.name || 'Unnamed member'}</p>
                    {member.isAdmin && (
                      <span className="text-xs bg-[#0e9496]/10 text-[#0e9496] dark:bg-[#0e9496]/20 dark:text-[#5ecfcf] px-1.5 py-0.5 rounded font-medium">Website admin</span>
                    )}
                    {!member.hasProfile && (
                      <span className="text-xs bg-gray-100 text-gray-600 dark:bg-neutral-700 dark:text-gray-300 px-1.5 py-0.5 rounded">No profile yet</span>
                    )}
                    {member.invitedAt && !member.lastSignInAt && (
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded">Invited</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email || 'No email'}</p>

                  <div className="flex flex-wrap items-center gap-1 mt-2">
                    {member.servantRoles.length > 0 ? (
                      member.servantRoles.map((role) => (
                        <span key={role} className="text-xs bg-[#e0f5f5] text-[#0e9496] dark:bg-[#0e9496]/20 dark:text-[#5ecfcf] px-2 py-0.5 rounded-full">{role}</span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">No roles</span>
                    )}
                    {member.hasProfile && (
                      <button onClick={() => setEditingRoles(member)} className="text-xs text-[#0e9496] dark:text-[#5ecfcf] hover:underline ml-1">Edit roles</button>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-neutral-700">
                    <ChatStatus member={member} />
                    <ChatActions member={member} onEnable={() => setEnablingChat(member)} onChanged={load} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {inviting && <InviteModal onClose={() => setInviting(false)} onDone={() => { setInviting(false); load() }} />}
      {editingRoles && (
        <RolesModal
          member={editingRoles}
          servantRoles={servantRoles}
          onClose={() => setEditingRoles(null)}
          onDone={() => { setEditingRoles(null); load() }}
        />
      )}
      {enablingChat && (
        <EnableChatModal
          member={enablingChat}
          onClose={() => setEnablingChat(null)}
          onDone={(opts) => { if (!opts?.keepOpen) setEnablingChat(null); load() }}
        />
      )}
    </div>
  )
}
