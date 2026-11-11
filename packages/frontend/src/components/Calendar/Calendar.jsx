import { useState, useCallback, useMemo, useEffect } from 'react'
import { Calendar as ReactBigCalendar, Views, dateFnsLocalizer } from 'react-big-calendar'
import { useNavigate } from 'react-router-dom'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { NewEvent } from './CreateEvent'
import { EventDetailsModal } from './EventDetailsModal'
import { CalendarSubscribe } from './CalendarSubscribe'
import { Card } from '@material-tailwind/react'
import { useFamilyCalendarStore, useFamilyCalendarSelectors } from '../../store/useFamilyCalendarStore'
import { useProfileStore } from '../../store/useProfileStore'
import { useFamilyStore } from '../../store/useFamilyGroupStore'
import { useAuthStore } from '../../store/useAuthStore'
import { toast } from 'react-toastify'

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
  const navigate = useNavigate()
  const { user: authUser } = useAuthStore()
  const { profile, fetchAndSetUserProfile } = useProfileStore()
  const { familyGroup, fetchFamilyGroup } = useFamilyStore()
  const { 
    events, 
    loading, 
    error, 
    fetchAllEvents, 
    fetchEventTypes,
    clearError,
    fetchFamilyEvents
  } = useFamilyCalendarStore()
  
  // State for CreateEvent modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  
  // State for editing events
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  
  // State for event details modal
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  
  // Get all events from all families and event types
  const allEvents = useFamilyCalendarSelectors.useAllEvents()
  const eventTypes = useFamilyCalendarSelectors.useEventTypes()
  
  // Convert all calendar events to React Big Calendar format
  const calendarEvents = useMemo(() => {
    console.log('Mapping allEvents:', allEvents)
    
    return allEvents.map(event => {
      // Find the event type label
      const eventType = eventTypes.find(type => type.id === event.event_type)
      const eventTypeLabel = eventType ? eventType.label : 'Unknown Type'
      
      const mappedEvent = {
        id: event.id,
        title: event.event_title,
        start: new Date(event.event_start),
        end: event.event_end ? new Date(event.event_end) : new Date(event.event_start),
        allDay: event.all_day,
        desc: event.event_description,
        location: event.location,
        eventType: event.event_type,
        eventTypeLabel: eventTypeLabel, // Add the human-readable label
        family_id: event.family_id, // Keep snake_case for consistency
        createdBy: event.created_by,
        food_theme: event.food_theme, // Add food theme property
        max_capacity: event.max_capacity, // Add max capacity property
        cancelled: Boolean(event.cancelled_at),
        familyGroupName: 'Family Group', // Will be updated when we have family group data
        familyGroupAddress: null
      }
      
      console.log('Mapped event:', mappedEvent)
      return mappedEvent
    })
  }, [allEvents, eventTypes])

  // Show error if any
  // Do not early-return on error. Render a bann
  // er below instead to keep hooks order stable.

  
  useEffect(() => {
    fetchAllEvents()
  }, [fetchAllEvents])

  // Fetch profile when auth user changes
  useEffect(() => {
    if (authUser?.id) {
      fetchAndSetUserProfile(authUser.id)
    }
  }, [authUser?.id, fetchAndSetUserProfile])

  // Fetch events when component mounts or profile changes
  useEffect(() => {
    if (profile?.family_id) {
      fetchFamilyGroup(profile.family_id)
    }
  }, [profile?.family_id,  fetchFamilyGroup])

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
        event_type: newEvent.eventType || null,
        food_theme: newEvent.food_theme || null, // Add food theme property
        max_capacity: newEvent.max_capacity || null // Add max capacity property
      }

      try {
        const createdEvent = await useFamilyCalendarStore.getState().createEvent(eventData)
        if (createdEvent) {
          setShowCreateModal(false)
          setSelectedSlot(null)
          // Refresh all events to show the new event
          fetchAllEvents()
          return createdEvent
        }
      } catch (error) {
        console.error('Error creating event:', error)
      }
    },
    [profile?.family_id, authUser?.id, fetchAllEvents]
  )

  const handleSelectEvent = useCallback(
    (event) => {
      // Navigate to event details page
      navigate(`/events/${event.id}`)
    },
    [navigate]
  )

  const handleCancelEvent = useCallback(
    async (eventId) => {
      if (!eventId) {
        console.error('No event ID provided for cancellation')
        return
      }

      const confirmMessage = 'Cancel this event? It stays on the calendar marked as cancelled, and members are notified.'
      if (!window.confirm(confirmMessage)) {
        return
      }

      try {
        const success = await useFamilyCalendarStore.getState().setEventCancelled(eventId, true)
        
        if (success) {
          // Close any open modals
          setShowEditModal(false)
          setEditingEvent(null)
          setShowEventDetailsModal(false)
          setSelectedEvent(null)
          
          // Refresh all events to ensure UI is in sync
          await fetchAllEvents()
          
          toast.success('Event cancelled')
        } else {
          const errorMessage = useFamilyCalendarStore.getState().error || 'Failed to cancel event'
          toast.error(`Error: ${errorMessage}`)
        }
      } catch (error) {
        console.error('Error cancelling event:', error)
        toast.error(`Failed to cancel event: ${error.message}`)
      }
    },
    [fetchAllEvents]
  )

  const handleEditEvent = useCallback(
    async (updatedEvent) => {
      if (updatedEvent._action === 'cancel') {
        await handleCancelEvent(updatedEvent.id)
        return
      }

      try {
        const success = await useFamilyCalendarStore.getState().updateEvent(updatedEvent.id, updatedEvent)
        if (success) {
          setShowEditModal(false)
          setEditingEvent(null)
          // Refresh all events
          fetchAllEvents()
        }
      } catch (error) {
        console.error('Error updating event:', error)
      }
    },
    [fetchAllEvents, handleCancelEvent]
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

  const handleEditFromDetails = useCallback(() => {
    if (selectedEvent) {
      // Convert calendar event back to database format for editing
      const dbEvent = {
        id: selectedEvent.id,
        event_title: selectedEvent.title,
        event_description: selectedEvent.desc || '',
        event_start: selectedEvent.start.toISOString(),
        event_end: selectedEvent.end ? selectedEvent.end.toISOString() : null,
        all_day: selectedEvent.allDay,
        location: selectedEvent.location,
        event_type: selectedEvent.eventType,
        family_id: selectedEvent.family_id,
        created_by: selectedEvent.createdBy,
        food_theme: selectedEvent.food_theme, // Add food theme property
        max_capacity: selectedEvent.max_capacity // Add max capacity property
      }
      
      setEditingEvent(dbEvent)
      setShowEditModal(true)
      setShowEventDetailsModal(false)
    }
  }, [selectedEvent])

  const handleCancelFromDetails = useCallback(() => {
    if (selectedEvent) {
      handleCancelEvent(selectedEvent.id)
      setShowEventDetailsModal(false)
      setSelectedEvent(null)
    }
  }, [selectedEvent, handleCancelEvent])

  const { defaultDate, scrollToTime } = useMemo(
    () => ({
      defaultDate: new Date(),
      scrollToTime: new Date(1970, 1, 1, 6),
    }),
    []
  )

  return (
    <div className="px-4 py-4">
      {error && (
        <div className="mb-4">
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
      {/* Keyed by user so a different sign-in never sees the previous person's link. */}
      <CalendarSubscribe key={authUser?.id ?? 'signed-out'} />
      
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
                backgroundColor: event.cancelled ? '#9ca3af' : backgroundColor,
                textDecoration: event.cancelled ? 'line-through' : undefined,
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
          defaultView={Views.MONTH}
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

      {/* Event Details Modal */}
      {showEventDetailsModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={showEventDetailsModal}
          onClose={() => setShowEventDetailsModal(false)}
          onEdit={handleEditFromDetails}
          onCancelEvent={handleCancelFromDetails}
        />
      )}
    </div>
  )
}
