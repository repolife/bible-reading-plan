import React, { Fragment, useState, useCallback, useMemo, useEffect } from 'react'
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

// Custom CSS for better calendar display
const customCalendarStyles = `
  .rbc-calendar {
    font-family: 'IBM Plex Mono', monospace;
  }
  
  .rbc-time-view {
    background: white;
  }
  
  .rbc-time-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .rbc-time-content {
    border-left: 1px solid #e2e8f0;
  }
  
  .rbc-time-gutter {
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
    font-weight: 500;
    color: #374151;
  }
  
  .rbc-time-slot {
    border-bottom: 1px solid #f1f5f9;
  }
  
  .rbc-day-slot {
    border-right: 1px solid #e2e8f0;
  }
  
  .rbc-header {
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
    color: #374151;
    padding: 8px;
  }
  
  .rbc-event {
    background: #2563eb !important;
    color: white !important;
    border-radius: 4px !important;
    border: none !important;
    font-size: 12px !important;
    padding: 2px 4px !important;
  }
  
  .rbc-today {
    background: #f0f9ff !important;
    font-weight: bold !important;
  }
  
  .rbc-toolbar {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 12px;
    margin-bottom: 0;
  }
  
  .rbc-toolbar button {
    background: white;
    border: 1px solid #d1d5db;
    color: #374151;
    padding: 6px 12px;
    border-radius: 6px;
    margin: 0 2px;
    font-size: 14px;
  }
  
  .rbc-toolbar button:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
  
  .rbc-toolbar button.rbc-active {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }
  
  .rbc-month-view {
    background: white;
  }
  
  .rbc-month-row {
    border-bottom: 1px solid #e2e8f0;
  }
  
  .rbc-date-cell {
    padding: 4px 8px;
    font-weight: 500;
  }
  
  .rbc-off-range-bg {
    background: #f9fafb;
  }
  
  .rbc-off-range {
    color: #9ca3af;
  }
`

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
  const { user } = useProfileStore()
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
  const familyEvents = useFamilyCalendarSelectors.useFamilyEvents(user?.family_id)
  
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

  // Fetch events when component mounts or user changes
  useEffect(() => {
    if (user?.family_id) {
      fetchFamilyEvents(user.family_id)
    }
  }, [user?.family_id, fetchFamilyEvents])

  const handleEventCreate = useCallback(
    async (newEvent) => {
      if (!user?.family_id) {
        console.error('No family ID available')
        return
      }

      // Convert the form data to the store format
      const eventData = {
        event_title: newEvent.title,
        event_description: newEvent.desc || '',
        event_start: newEvent.start.toISOString().split('T')[0], // YYYY-MM-DD format
        event_end: newEvent.end ? newEvent.end.toISOString().split('T')[0] : null,
        all_day: newEvent.allDay || false,
        location: newEvent.location || null,
        family_id: user.family_id,
        created_by: user.id,
        event_type: newEvent.eventType || 'shabbat'
      }

      // Create event using the store
      const createdEvent = await useFamilyCalendarStore.getState().createEvent(eventData)
      
      if (createdEvent) {
        console.log('Event created successfully:', createdEvent)
        // Close modal after successful creation
        setShowCreateModal(false)
        setSelectedSlot(null)
      }
    },
    [user?.family_id, user?.id]
  )

  const handleSelectEvent = useCallback(
    (event) => {
      // You can expand this to show event details or edit modal
      window.alert(`${event.title}\n\n${event.desc || 'No description'}\n\nLocation: ${event.location || 'No location'}`)
    },
    []
  )

  const handleSelectSlot = useCallback(
    (slotInfo) => {
      // Extract date and time from the selected slot
      const { start, end, slots } = slotInfo
      const selectedDate = start
      const selectedTime = start.toTimeString().slice(0, 5) // HH:MM format
      
      setSelectedSlot({
        date: selectedDate,
        time: selectedTime,
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

  return (
    <Fragment>
      {/* Inject custom CSS */}
      <style>{customCalendarStyles}</style>
      
      <NewEvent onEventCreate={handleEventCreate} />
      
      {loading && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          Loading calendar events...
        </div>
      )}
      
      <Card className="height600">
        <ReactBigCalendar
          localizer={localizer}
          defaultDate={defaultDate}
          events={calendarEvents}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          scrollToTime={scrollToTime}
          style={{ height: '600px' }}
          min={new Date(1970, 1, 1, 6, 0, 0)} // 6 AM start
          max={new Date(1970, 1, 1, 22, 0, 0)} // 10 PM end
          step={60} // 1 hour steps
          timeslots={1} // 1 time slot per step
          showMultiDayTimes={true}
          dayPropGetter={(date) => {
            const today = new Date()
            const isToday = date.toDateString() === today.toDateString()
            return {
              style: {
                backgroundColor: isToday ? '#f0f9ff' : 'transparent',
                fontWeight: isToday ? 'bold' : 'normal'
              }
            }
          }}
          eventPropGetter={(event) => {
            return {
              style: {
                backgroundColor: '#2563eb', // brand-primary color
                color: 'white',
                borderRadius: '4px',
                border: 'none',
                fontSize: '12px',
                padding: '2px 4px'
              }
            }
          }}
          views={['month', 'week', 'day', 'agenda']}
          defaultView={Views.WEEK}
          toolbar={true}
          popup={true}
          longPressThreshold={15}
          onNavigate={(newDate) => {
            // Handle date navigation if needed
            console.log('Navigated to:', newDate)
          }}
        />
      </Card>
      
      {calendarEvents.length === 0 && !loading && (
        <div className="mt-4 p-4 bg-gray-100 border border-gray-400 text-gray-700 rounded text-center">
          No events found. Create your first event using the button above!
        </div>
      )}

      {/* Create Event Modal with selected slot data */}
      {showCreateModal && selectedSlot && (
        <NewEvent 
          onEventCreate={handleEventCreate}
          onClose={handleCloseCreateModal}
          selectedSlot={selectedSlot}
          isOpen={showCreateModal}
        />
      )}
    </Fragment>
  )
}
