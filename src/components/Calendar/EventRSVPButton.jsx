import React, { useEffect, useState } from 'react'
import { Button, Typography } from '@material-tailwind/react'
import { CheckIcon, XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useEventAttendeesStore, useEventAttendeesSelectors } from '@/store/useEventAttendeesStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'react-toastify'

export const EventRSVPButton = ({ eventId, eventTitle, onRSVPChange }) => {
  const { user: authUser } = useAuthStore()
  const { profile } = useProfileStore()
  const { 
    addAttendee, 
    removeAttendee, 
    fetchEventAttendees 
  } = useEventAttendeesStore()
  
  // Get current attendance status and count
  const isAttending = useEventAttendeesSelectors.useIsFamilyAttending(eventId, profile?.family_id)
  const attendeeCount = useEventAttendeesSelectors.useEventAttendeeCount(eventId)
  const attendees = useEventAttendeesSelectors.useEventAttendees(eventId)
  const loading = useEventAttendeesSelectors.useLoading()
  const error = useEventAttendeesSelectors.useError()

  // Local state for immediate UI feedback
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize local state when component mounts or data changes
  useEffect(() => {
    console.log('RSVP State Update:', { isAttending, attendeeCount, eventId })
  }, [isAttending, attendeeCount, eventId])

  // Fetch attendees when component mounts
  useEffect(() => {
    if (eventId) {
      fetchEventAttendees(eventId)
    }
  }, [eventId, fetchEventAttendees])

  // Handle RSVP toggle
  const handleRSVPToggle = async () => {
    if (!authUser?.id || !profile?.family_id) {
      toast.error('You must be logged in and have a family profile to RSVP')
      return
    }

    if (isProcessing) {
      return // Prevent double-clicks
    }

    setIsProcessing(true)

    console.log('RSVP Toggle:', { 
      eventId, 
      familyId: profile.family_id, 
      currentAttending: isAttending,
      currentCount: attendeeCount 
    })

    try {
      if (isAttending) {
        // Cancel RSVP
        console.log('Cancelling RSVP...')
        const success = await removeAttendee(eventId, profile.family_id)
        if (success) {
          toast.success('RSVP cancelled successfully')
          // Notify parent component with updated count
          if (onRSVPChange) {
            onRSVPChange(false, attendeeCount - 1)
          }
        }
      } else {
        // Add RSVP
        console.log('Adding RSVP...')
        const newAttendee = await addAttendee(eventId, profile.family_id)
        if (newAttendee) {
          toast.success('RSVP successful! You are now attending this event.')
          // Notify parent component with updated count
          if (onRSVPChange) {
            onRSVPChange(true, attendeeCount + 1)
          }
        }
      }
    } catch (error) {
      console.error('RSVP error:', error)
      toast.error(error.message || 'Failed to update RSVP')
    } finally {
      setIsProcessing(false)
    }
  }

  // Show loading state
  if (loading && attendeeCount === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <Typography variant="small" className="text-gray-600">
          Loading...
        </Typography>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error: {error}
      </div>
    )
  }

  // If user is not logged in or doesn't have a family profile
  if (!authUser?.id || !profile?.family_id) {
    return (
      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Typography variant="small" className="text-gray-600 dark:text-gray-400">
          Sign in and complete your profile to RSVP
        </Typography>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* RSVP Button */}
      <Button
        onClick={handleRSVPToggle}
        disabled={loading || isProcessing}
        className={`w-full flex items-center justify-center gap-2 transition-all duration-200 ${
          isAttending
            ? 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-500'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading || isProcessing ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : isAttending ? (
          <>
            <XMarkIcon className="h-4 w-4" />
            Cancel RSVP
          </>
        ) : (
          <>
            <UserGroupIcon className="h-4 w-4" />
            RSVP to Attend
          </>
        )}
      </Button>

      {/* Attendee Count */}
      <div className="text-center">
        <Typography variant="small" className="text-gray-600 dark:text-gray-400">
          {attendeeCount} {attendeeCount === 1 ? 'family' : 'families'} attending
        </Typography>
        
        {/* RSVP Status Indicator */}
        {isAttending && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <Typography variant="small" className="text-green-700 dark:text-green-300 font-medium">
              ✓ You are attending this event
            </Typography>
          </div>
        )}
      </div>

      {/* Attendees List (if any) */}
      {attendees.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <Typography variant="small" className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Who's attending:
          </Typography>
          <div className="space-y-1">
            {attendees.map((attendee) => (
              <div 
                key={attendee.id} 
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <CheckIcon className="h-3 w-3 text-green-600" />
                <span>
                  {attendee.family_groups?.family_last_name || 'Unknown Family'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {isAttending && (
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <Typography variant="small" className="text-blue-700 dark:text-blue-300 font-medium mb-1">
            Want to cancel?
          </Typography>
          <Typography variant="small" className="text-blue-600 dark:text-blue-400">
            Click the red "Cancel RSVP" button above to remove your attendance
          </Typography>
        </div>
      )}
    </div>
  )
}

// Alternative: Simple RSVP Button (minimal version)
export const SimpleRSVPButton = ({ eventId, eventTitle, className = "" }) => {
  const { user: authUser } = useAuthStore()
  const { profile } = useProfileStore()
  const { addAttendee, removeAttendee } = useEventAttendeesStore()
  
  const isAttending = useEventAttendeesSelectors.useIsFamilyAttending(eventId, profile?.family_id)
  const loading = useEventAttendeesSelectors.useLoading()

  const handleClick = async () => {
    if (!authUser?.id || !profile?.family_id) {
      toast.error('You must be logged in to RSVP')
      return
    }

    try {
      if (isAttending) {
        await removeAttendee(eventId, profile.family_id)
        toast.success('RSVP cancelled')
      } else {
        await addAttendee(eventId, profile.family_id)
        toast.success('RSVP successful!')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update RSVP')
    }
  }

  if (!authUser?.id || !profile?.family_id) {
    return null // Don't show button if user can't RSVP
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      size="sm"
      className={`flex items-center gap-2 ${
        isAttending 
          ? 'bg-green-600 hover:bg-green-700' 
          : 'bg-blue-600 hover:bg-blue-700'
      } ${className}`}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
      ) : isAttending ? (
        <>
          <CheckIcon className="h-3 w-3" />
          Attending
        </>
      ) : (
        <>
          <UserGroupIcon className="h-3 w-3" />
          RSVP
        </>
      )}
    </Button>
  )
} 