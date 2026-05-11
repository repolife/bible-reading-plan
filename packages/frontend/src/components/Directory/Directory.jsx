import { useEffect, useState } from 'react'
import { useProfileStore } from '@store/useProfileStore'
import { Typography } from '@material-tailwind/react'

export const Directory = () => {
  const { profiles, fetchAllUserProfiles, loading } = useProfileStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAllUserProfiles()
  }, [fetchAllUserProfiles])

  const filtered = (profiles || []).filter((p) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      p.name?.toLowerCase().includes(term) ||
      p.servant_roles?.some((r) => r.toLowerCase().includes(term))
    )
  })

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
        className="w-full mb-5 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0e9496] focus:border-transparent dark:bg-neutral-800 dark:text-white text-sm"
      />

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
              className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl"
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
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {member.name || 'Unnamed Member'}
                </p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
