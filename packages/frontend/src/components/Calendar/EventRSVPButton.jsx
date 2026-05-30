import React, { useEffect, useState } from 'react'
import { Button, Typography } from '@material-tailwind/react'
import { CheckIcon, XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useEventAttendeesStore, useEventAttendeesSelectors } from '@/store/useEventAttendeesStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'react-toastify'

// The three RSVP choices
const RSVP_OPTIONS = [
  { value: 'yes', label: 'Yes', icon: CheckIcon, active: 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-500' },
  { value: 'maybe', label: 'Maybe', icon: QuestionMarkCircleIcon, active: 'bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-400' },
  { value: 'no', label: 'No', icon: XMarkIcon, active: 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-500' }
]

const STATUS_LABEL = { yes: 'attending', maybe: 'a maybe', no: 'not attending' }

// Text colors for the responses table
const RSVP_TEXT_COLOR = {
  yes: 'text-green-600 dark:text-green-400',
  maybe: 'text-amber-600 dark:text-amber-400',
  no: 'text-red-600 dark:text-red-400'
}

export const EventRSVPButton = ({ eventId, onRSVPChange }) => {
  const { user: authUser } = useAuthStore()
  const { profile } = useProfileStore()
  const { setRSVP, fetchEventAttendees } = useEventAttendeesStore()

  // Current RSVP choice + count
  const rsvpStatus = useEventAttendeesSelectors.useFamilyRSVPStatus(eventId, profile?.family_id)
  const attendeeCount = useEventAttendeesSelectors.useEventAttendeeCount(eventId)
  const attendees = useEventAttendeesSelectors.useEventAttendees(eventId)
  const loading = useEventAttendeesSelectors.useLoading()
  const error = useEventAttendeesSelectors.useError()

  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch attendees when component mounts
  useEffect(() => {
    if (eventId) {
      fetchEventAttendees(eventId)
    }
  }, [eventId, fetchEventAttendees])

  const handleRSVP = async (status) => {
    if (!authUser?.id || !profile?.family_id) {
      toast.error('You must be logged in and have a family profile to RSVP')
      return
    }
    if (isProcessing || status === rsvpStatus) {
      return
    }

    setIsProcessing(true)
    try {
      const result = await setRSVP(eventId, profile.family_id, status)
      if (result) {
        toast.success(`RSVP saved: ${STATUS_LABEL[status]}`)
        if (onRSVPChange) {
          // Get the post-update attendee count from the store
          const newAttendeeCount = useEventAttendeesStore.getState().getEventAttendeeCount(eventId)
          onRSVPChange(status, newAttendeeCount)
        }
      }
    } catch (err) {
      console.error('RSVP error:', err)
      toast.error(err.message || 'Failed to update RSVP')
    } finally {
      setIsProcessing(false)
    }
  }

  // Show loading state
  if (loading && !rsvpStatus && attendeeCount === 0) {
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
      {/* RSVP Choice Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {RSVP_OPTIONS.map(({ value, label, icon: Icon, active }) => {
          const selected = rsvpStatus === value
          return (
            <Button
              key={value}
              onClick={() => handleRSVP(value)}
              disabled={loading || isProcessing}
              className={`flex items-center justify-center gap-1 transition-all duration-200 ${
                selected
                  ? active
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          )
        })}
      </div>

      {/* Attendee Count + current choice */}
      <div className="text-center">
        <Typography variant="small" className="text-gray-600 dark:text-gray-400">
          {attendeeCount} {attendeeCount === 1 ? 'family' : 'families'} attending
        </Typography>

        {rsvpStatus && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <Typography variant="small" className="text-blue-700 dark:text-blue-300 font-medium">
              Your RSVP: {STATUS_LABEL[rsvpStatus]}
            </Typography>
          </div>
        )}
      </div>

      {/* Responses table (every family + their choice) */}
      {attendees.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <Typography variant="small" className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Responses:
          </Typography>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="font-medium pb-1">Family</th>
                <th className="font-medium pb-1 text-right">Response</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((attendee) => {
                const status = attendee.rsvp_status ?? 'yes'
                const meta = RSVP_OPTIONS.find(o => o.value === status)
                const Icon = meta?.icon ?? CheckIcon
                return (
                  <tr key={attendee.id} className="text-gray-600 dark:text-gray-400">
                    <td className="py-0.5">
                      {attendee.family_groups?.family_last_name || 'Unknown Family'}
                    </td>
                    <td className="py-0.5">
                      <span className={`flex items-center justify-end gap-1 font-medium ${RSVP_TEXT_COLOR[status]}`}>
                        <Icon className="h-3 w-3" />
                        {meta?.label ?? status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Alternative: Simple RSVP Button (minimal yes/maybe/no version)
export const SimpleRSVPButton = ({ eventId, className = "" }) => {
  const { user: authUser } = useAuthStore()
  const { profile } = useProfileStore()
  const { setRSVP } = useEventAttendeesStore()

  const rsvpStatus = useEventAttendeesSelectors.useFamilyRSVPStatus(eventId, profile?.family_id)
  const loading = useEventAttendeesSelectors.useLoading()

  const handleClick = async (status) => {
    if (!authUser?.id || !profile?.family_id) {
      toast.error('You must be logged in to RSVP')
      return
    }
    if (status === rsvpStatus) return

    try {
      const result = await setRSVP(eventId, profile.family_id, status)
      if (result) {
        toast.success(`RSVP saved: ${STATUS_LABEL[status]}`)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update RSVP')
    }
  }

  if (!authUser?.id || !profile?.family_id) {
    return null
  }

  return (
    <div className={`flex gap-1 ${className}`}>
      {RSVP_OPTIONS.map(({ value, label, icon: Icon, active }) => {
        const selected = rsvpStatus === value
        return (
          <Button
            key={value}
            onClick={() => handleClick(value)}
            disabled={loading}
            size="sm"
            className={`flex items-center gap-1 ${
              selected ? active : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </Button>
        )
      })}
    </div>
  )
}
