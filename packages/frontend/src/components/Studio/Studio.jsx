import { lazy, Suspense, useEffect } from 'react'
import { useProfileStore } from '@store/useProfileStore'
import { useAuthStore } from '@store/useAuthStore'
import { Spinner } from '@components/Shared/Spinner/Spinner'

const LazyStudio = lazy(() =>
  import('./StudioInner')
)

export const SanityStudio = () => {
  const { user } = useAuthStore()
  const { profiles, fetchAllUserProfiles } = useProfileStore()

  useEffect(() => {
    fetchAllUserProfiles()
  }, [fetchAllUserProfiles])

  const currentProfile = (profiles || []).find((p) => p.id === user?.id)
  const isAdmin = currentProfile?.is_admin === true

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">Admin access required.</p>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="md" text="Loading studio…" />
      </div>
    }>
      <LazyStudio />
    </Suspense>
  )
}
