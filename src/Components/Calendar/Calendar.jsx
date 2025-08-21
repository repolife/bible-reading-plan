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
    fetchEventTypes,
    clearError 
  } = useFamilyCalendarStore()
  
  // State for CreateEvent modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  
  // State for editing events
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  
  // Get family events and event types
  const familyEvents = useFamilyCalendarSelectors.useFamilyEvents(profile?.family_id)
  const eventTypes = useFamilyCalendarSelectors.useEventTypes()
  
  // Convert family calendar events to React Big Calendar format
  const calendarEvents = useMemo(() => {
    return familyEvents.map(event => {
      // Find the event type label
      const eventType = eventTypes.find(type => type.id === event.event_type)
      const eventTypeLabel = eventType ? eventType.label : 'Unknown Type'
      
      return {
        id: event.id,
        title: event.event_title,
        start: new Date(event.event_start),
        end: event.event_end ? new Date(event.event_end) : new Date(event.event_start),
        allDay: event.all_day,
        desc: event.event_description,
        location: event.location,
        eventType: event.event_type,
        eventTypeLabel: eventTypeLabel, // Add the human-readable label
        familyId: event.family_id,
        createdBy: event.created_by
      }
    })
  }, [familyEvents, eventTypes])

  // Show error if any
  // Do not early-return on error. Render a banner below instead to keep hooks order stable.

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

  // Fetch event types when component mounts
  useEffect(() => {
    fetchEventTypes()
  }, [fetchEventTypes])

  const handleEventCreate = useCallback(
    async (newEvent) => {
      if (!profile?.family_id || !authUser?.id) {
        console.error('Missing profile or auth user')
        return
      }

      const eventData = {
        event_title: newEvent.title,
        event_description: newEvent.desc || '',
        event_start: newEvent.start.toISOString(), // Send full timestamp
        event_end: newEvent.end ? newEvent.end.toISOString() : null, // Send full timestamp
        all_day: newEvent.allDay || false,
        location: newEvent.location || null,
        family_id: profile.family_id,
        created_by: authUser.id,
        event_type: newEvent.eventType || null
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
      // Show options for edit/delete instead of just displaying info
      const action = window.confirm(
        `Event: ${event.title}\n\n` +
        `Type: ${event.eventTypeLabel || 'Unknown Type'}\n` +
        `Description: ${event.desc || 'No description'}\n` +
        `Location: ${event.location || 'No location'}\n` +
        `Start: ${event.start.toLocaleString()}\n` +
        `End: ${event.end.toLocaleString()}\n` +
        `${event.allDay ? 'All Day Event' : ''}\n\n` +
        `Click OK to edit, Cancel to close`
      )
      
      if (action) {
        // Convert calendar event back to database format for editing
        const dbEvent = {
          id: event.id,
          event_title: event.title,
          event_description: event.desc || '',
          event_start: event.start.toISOString(),
          event_end: event.end ? event.end.toISOString() : null,
          all_day: event.allDay,
          location: event.location,
          event_type: event.eventType,
          family_id: event.familyId,
          created_by: event.createdBy
        }
        
        setEditingEvent(dbEvent)
        setShowEditModal(true)
      }
    },
    []
  )

  const handleDeleteEvent = useCallback(
    async (eventId) => {
      if (!window.confirm('Are you sure you want to delete this event?')) {
        return
      }

      try {
        const success = await useFamilyCalendarStore.getState().deleteEvent(eventId)
        if (success) {
          setShowEditModal(false)
          setEditingEvent(null)
          // Refresh events
          if (profile?.family_id) {
            fetchFamilyEvents(profile.family_id)
          }
        }
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    },
    [profile?.family_id, fetchFamilyEvents]
  )

  const handleEditEvent = useCallback(
    async (updatedEvent) => {
      // Check if this is a delete action
      if (updatedEvent._action === 'delete') {
        await handleDeleteEvent(updatedEvent.id)
        return
      }

      try {
        const success = await useFamilyCalendarStore.getState().updateEvent(updatedEvent.id, updatedEvent)
        if (success) {
          setShowEditModal(false)
          setEditingEvent(null)
          // Refresh events
          if (profile?.family_id) {
            fetchFamilyEvents(profile.family_id)
          }
        }
      } catch (error) {
        console.error('Error updating event:', error)
      }
    },
    [profile?.family_id, fetchFamilyEvents, handleDeleteEvent]
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
      {error && (
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
      )}
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
          eventPropGetter={(event) => {
            // Color events based on event type
            let backgroundColor = '#2563eb' // default blue
            
            if (event.eventTypeLabel) {
              switch (event.eventTypeLabel) {
                case 'Weekly Shabbat':
                  backgroundColor = '#059669' // green
                  break
                case 'Passover':
                  backgroundColor = '#dc2626' // red
                  break
                case 'Yom Kippur (Day of Atonement)':
                  backgroundColor = '#7c3aed' // purple
                  break
                case 'Sukkot (Feast of Tabernacles)':
                  backgroundColor = '#ea580c' // orange
                  break
                case 'Yom Teruah (Day of Trumpets)':
                  backgroundColor = '#0891b2' // cyan
                  break
                case 'Birthday Gathering':
                  backgroundColor = '#ec4899' // pink
                  break
                default:
                  backgroundColor = '#6b7280' // gray
              }
            }
            
            return {
              style: {
                backgroundColor,
                color: 'white',
                borderRadius: '4px',
                border: 'none',
                fontSize: '12px',
                padding: '2px 4px',
                fontWeight: '500'
              }
            }
          }}
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

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <NewEvent 
          onEventCreate={handleEditEvent}
          onClose={() => {
            setShowEditModal(false)
            setEditingEvent(null)
          }}
          editingEvent={editingEvent}
          isEdit={true}
          isOpen={showEditModal}
        />
      )}
    </>
  )
}
