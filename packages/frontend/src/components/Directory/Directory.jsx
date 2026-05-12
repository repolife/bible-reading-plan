import { useEffect, useState } from 'react'
import { useProfileStore } from '@store/useProfileStore'
import { useAuthStore } from '@store/useAuthStore'
import { Typography } from '@material-tailwind/react'
import { toast } from 'react-toastify'

const SERVANT_ROLES = [
  'Adult Teaching',
  'Care & Support',
  'Discipleship',
  'Elder',
  'Encouragement',
  'Evangelism',
  'Feast Planning',
  'Feasts',
  'Kid Ministry',
  "Men's Events",
  'New Member Care',
  'Nursery',
  'On-Call Support',
  'Outreach Planning',
  'Prayer',
  'Shabbat Schedule Coordination',
  'Teen Ministry',
  "Women's Events",
  'Worship',
]

export const Directory = () => {
  const { profiles, fetchAllUserProfiles, loading, updateMemberServantRoles, updateMemberDirectoryVisibility } = useProfileStore()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [selectedRoles, setSelectedRoles] = useState([])
  const [editingMember, setEditingMember] = useState(null)
  const [editRoles, setEditRoles] = useState([])
  const [saving, setSaving] = useState(false)
  const [reachOutMember, setReachOutMember] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchAllUserProfiles()
  }, [fetchAllUserProfiles])

  const currentProfile = (profiles || []).find((p) => p.id === user?.id)
  const isAdmin = currentProfile?.is_admin === true

  const toggleRole = (role) =>
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )

  // Only show roles that exist on at least one visible member
  const availableRoles = SERVANT_ROLES.filter((role) =>
    (profiles || []).some(
      (p) => (!p.hidden_from_directory || isAdmin) && p.servant_roles?.includes(role)
    )
  )

  const filtered = (profiles || []).filter((p) => {
    if (!isAdmin && p.hidden_from_directory) return false
    if (selectedRoles.length > 0 && !selectedRoles.some((r) => p.servant_roles?.includes(r))) return false
    if (!search) return true
    const term = search.toLowerCase()
    return (
      p.name?.toLowerCase().includes(term) ||
      p.servant_roles?.some((r) => r.toLowerCase().includes(term))
    )
  })

  const openEdit = (member) => {
    setEditingMember(member)
    setEditRoles(member.servant_roles || [])
  }

  const closeEdit = () => {
    setEditingMember(null)
    setEditRoles([])
  }

  const openReachOut = (member) => {
    setReachOutMember(member)
    setCopied(false)
  }

  const closeReachOut = () => {
    setReachOutMember(null)
    setCopied(false)
  }

  const firstName = reachOutMember?.name?.split(' ')[0] || 'there'
  const reachOutMessage = reachOutMember
    ? isAdmin
      ? `Hi ${firstName}! We'd love to have you serve in our community. Would you be interested in taking on a servant role? Let us know and we'll get you added to the directory!`
      : `Hi ${firstName}! I'd love to get involved and serve in our community. Could you help add me to a servant role? I'm excited to contribute!`
    : ''

  const copyMessage = async () => {
    await navigator.clipboard.writeText(reachOutMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveRoles = async () => {
    setSaving(true)
    try {
      await updateMemberServantRoles(editingMember.id, editRoles)
      toast.success('Roles updated')
      closeEdit()
    } catch (e) {
      toast.error(e.message || 'Failed to update roles')
    } finally {
      setSaving(false)
    }
  }

  const toggleHide = async (member) => {
    try {
      await updateMemberDirectoryVisibility(member.id, !member.hidden_from_directory)
      toast.success(member.hidden_from_directory ? 'Member visible in directory' : 'Member hidden from directory')
    } catch (e) {
      toast.error(e.message || 'Failed to update visibility')
    }
  }

  return (
    <div className="px-4 py-4">
      <Typography variant="h5" className="text-gray-900 dark:text-white font-semibold mb-4">
        Community Directory
      </Typography>

      <input
        type="text"
        placeholder="Search by name or role…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0e9496] focus:border-transparent dark:bg-neutral-800 dark:text-white text-sm"
      />

      {availableRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {availableRoles.map((role) => (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selectedRoles.includes(role)
                  ? 'bg-[#0e9496] text-white border-[#0e9496]'
                  : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-neutral-600 hover:border-[#0e9496] hover:text-[#0e9496]'
              }`}
            >
              {role}
            </button>
          ))}
          {selectedRoles.length > 0 && (
            <button
              onClick={() => setSelectedRoles([])}
              className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-neutral-600 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#0e9496] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">No members found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 border rounded-xl ${
                member.hidden_from_directory
                  ? 'border-amber-300 dark:border-amber-600 opacity-60'
                  : 'border-gray-200 dark:border-neutral-700'
              }`}
            >
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 border-2 border-[#0e9496]">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {member.name || 'Unnamed Member'}
                  </p>
                  {member.is_admin && (
                    <span className="text-xs bg-[#0e9496]/10 text-[#0e9496] dark:bg-[#0e9496]/20 dark:text-[#5ecfcf] px-1.5 py-0.5 rounded font-medium">
                      Admin
                    </span>
                  )}
                  {isAdmin && member.hidden_from_directory && (
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded">
                      hidden
                    </span>
                  )}
                </div>
                {member.servant_roles?.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {member.servant_roles.map((role) => (
                      <span
                        key={role}
                        className="text-xs bg-[#e0f5f5] text-[#0e9496] dark:bg-[#0e9496]/20 dark:text-[#5ecfcf] px-2 py-0.5 rounded-full"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No roles assigned</p>
                )}
              </div>

              {/* Non-admin: reach out to admin to request a servant role */}
              {!isAdmin && member.is_admin && (
                <button
                  onClick={() => openReachOut(member)}
                  title="Request to serve — reach out to this admin"
                  className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#0e9496]/10 text-[#0e9496] dark:bg-[#0e9496]/20 dark:text-[#5ecfcf] hover:bg-[#0e9496] hover:text-white transition-colors font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Reach Out
                </button>
              )}

              {/* Admin controls */}
              {isAdmin && (
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(member)}
                    title="Edit roles"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-[#0e9496] hover:bg-[#e0f5f5] dark:hover:bg-[#0e9496]/20 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => openReachOut(member)}
                    title="Reach out to invite to a role"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-[#0e9496] hover:bg-[#e0f5f5] dark:hover:bg-[#0e9496]/20 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleHide(member)}
                    title={member.hidden_from_directory ? 'Show in directory' : 'Hide from directory'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      member.hidden_from_directory
                        ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        : 'text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    }`}
                  >
                    {member.hidden_from_directory ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin role edit modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeEdit}>
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Edit Roles</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{editingMember.name}</p>
            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1 mb-5">
              {SERVANT_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRoles.includes(role)}
                    onChange={() =>
                      setEditRoles((prev) =>
                        prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
                      )
                    }
                    className="w-4 h-4 rounded border-neutral-300 text-[#0e9496] focus:ring-[#0e9496]"
                  />
                  <span className="text-sm text-neutral-800 dark:text-neutral-200">{role}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeEdit}
                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRoles}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-[#0e9496] text-white text-sm font-medium hover:bg-[#0c7c7e] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reach out modal */}
      {reachOutMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeReachOut}>
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {isAdmin ? 'Invite to Serve' : 'Request to Serve'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isAdmin
                ? `Send ${reachOutMember.name} an invitation to take on a servant role`
                : `Send ${reachOutMember.name} a message asking to be added to a servant role`}
            </p>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4 mb-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {reachOutMessage}
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeReachOut}
                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={copyMessage}
                className={`flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                  copied ? 'bg-green-500 hover:bg-green-600' : 'bg-[#0e9496] hover:bg-[#0c7c7e]'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
