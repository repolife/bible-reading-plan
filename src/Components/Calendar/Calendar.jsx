import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Calendar as ReactBigCalendar, Views, dateFnsLocalizer } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { NewEvent } from './CreateEvent'
import { Card } from '@material-tailwind/react'
import { useFamilyCalendarStore, useFamilyCalendarSelectors } from '../../store/useFamilyCalendarStore'
import { useProfileStore } from '../../store/useProfileStore'
import { useAuthStore } from '../../store/useAuthStore'

// Set up the localizer
const locales = {
  'en-US': enUS
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export const Calendar = () => {
  const { user: authUser } = useAuthStore()
  const { profile, fetchAndSetUserProfile } = useProfileStore()
  const { 
    events, 
    loading, 
    error, 
    fetchFamilyEvents, 
    clearError 
  } = useFamilyCalendarStore()
  
  // State for CreateEvent modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  
  // Get family events for the current user
  const familyEvents = useFamilyCalendarSelectors.useFamilyEvents(profile?.family_id)
  
  // Convert family calendar events to React Big Calendar format
  const calendarEvents = useMemo(() => {
    return familyEvents.map(event => ({
      id: event.id,
      title: event.event_title,
      start: new Date(event.event_start),
      end: event.event_end ? new Date(event.event_end) : new Date(event.event_start),
      allDay: event.all_day,
      desc: event.event_description,
      location: event.location,
      eventType: event.event_type,
      familyId: event.family_id,
      createdBy: event.created_by
    }))
  }, [familyEvents])

  // Show error if any
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
          <button 
            onClick={clearError}
            className="ml-2 text-red-700 hover:text-red-900 underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  // Fetch profile when auth user changes
  useEffect(() => {
    if (authUser?.id) {
      fetchAndSetUserProfile(authUser.id)
    }
  }, [authUser?.id, fetchAndSetUserProfile])

  // Fetch events when component mounts or profile changes
  useEffect(() => {
    if (profile?.family_id) {
      fetchFamilyEvents(profile.family_id)
    }
  }, [profile?.family_id, fetchFamilyEvents])

  const handleEventCreate = useCallback(
    async (newEvent) => {
      if (!profile?.family_id || !authUser?.id) {
        console.error('Missing profile or auth user')
        return
      }

      const eventData = {
        event_title: newEvent.title,
        event_description: newEvent.desc || '',
        event_start: newEvent.start.toISOString().split('T')[0],
        event_end: newEvent.end ? newEvent.end.toISOString().split('T')[0] : null,
        all_day: newEvent.allDay || false,
        location: newEvent.location || null,
        family_id: profile.family_id,
        created_by: authUser.id,
        event_type: newEvent.eventType || 'shabbat'
      }

      try {
        const createdEvent = await useFamilyCalendarStore.getState().createEvent(eventData)
        if (createdEvent) {
          setShowCreateModal(false)
          setSelectedSlot(null)
        }
      } catch (error) {
        console.error('Error creating event:', error)
      }
    },
    [profile?.family_id, authUser?.id]
  )

  const handleSelectEvent = useCallback(
    (event) => {
      window.alert(`${event.title}\n\n${event.desc || 'No description'}\n\nLocation: ${event.location || 'No location'}`)
    },
    []
  )

  const handleSelectSlot = useCallback(
    (slotInfo) => {
      const { start, end } = slotInfo
      setSelectedSlot({
        date: start,
        time: start.toTimeString().slice(0, 5),
        start: start,
        end: end
      })
      setShowCreateModal(true)
    },
    []
  )

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false)
    setSelectedSlot(null)
  }, [])

  const { defaultDate, scrollToTime } = useMemo(
    () => ({
      defaultDate: new Date(),
      scrollToTime: new Date(1970, 1, 1, 6),
    }),
    []
  )

  return (
    <>
      <NewEvent onEventCreate={handleEventCreate} />
      
      {loading && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          Loading calendar events...
        </div>
      )}
      
      <Card className="height600">
        <ReactBigCalendar
        className='text-foreground'
          localizer={localizer}
          defaultDate={defaultDate}
          events={calendarEvents}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable={true}
          scrollToTime={scrollToTime}
          style={{ height: '600px' }}
          min={new Date(1970, 1, 1, 6, 0, 0)}
          max={new Date(1970, 1, 1, 22, 0, 0)}
          step={60}
          timeslots={1}
          showMultiDayTimes={true}
          views={{
            month: true,
            week: true,
            day: true,
            agenda: true
          }}
          defaultView={Views.WEEK}
          toolbar={true}
          popup={true}
          longPressThreshold={500}
        />
      </Card>
      
      {calendarEvents.length === 0 && !loading && (
        <div className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded text-center">
          No events found. Create your first event using the button above!
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <NewEvent 
          onEventCreate={handleEventCreate}
          onClose={handleCloseCreateModal}
          selectedSlot={selectedSlot}
          isOpen={showCreateModal}
        />
      )}
    </>
  )
}
