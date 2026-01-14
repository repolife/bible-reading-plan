import React, { Fragment, useState, useEffect } from 'react'
import { useFamilyCalendarStore, useFamilyCalendarSelectors } from '../../store/useFamilyCalendarStore' 
import { useFamilyStore } from '../../store/useFamilyGroupStore' 
import { useProfileStore } from '../../store/useProfileStore'
import { Button } from '@material-tailwind/react'
import Autocomplete from "react-google-autocomplete"

export const NewEvent = ({ onEventCreate, onClose, selectedSlot, isOpen, editingEvent, isEdit = false }) => {
  const { profile } = useProfileStore()
  const { familyGroup, fetchFamilyGroup } = useFamilyStore()
  const { fetchEventTypes } = useFamilyCalendarStore()
  const eventTypes = useFamilyCalendarSelectors.useEventTypes()
  const loading = useFamilyCalendarSelectors.useLoading()

  const [open, setOpen] = useState(false)
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    eventType: '', // Will be set to first available event type UUID
    food_theme: 'none' // Default food theme
  })

  const env = import.meta.env;


  // Fetch family group and event types when component mounts
  useEffect(() => {
    if (profile?.family_id) {
      fetchFamilyGroup(profile.family_id)
    }
    fetchEventTypes()
  }, [profile?.family_id, fetchFamilyGroup, fetchEventTypes])

  // Set default event type when event types are loaded
  useEffect(() => {
    if (eventTypes.length > 0 && !eventData.eventType) {
      // Find "Weekly Shabbat" by label and set it as default, or use first available
      const shabbatType = eventTypes.find(type => type.label === 'Weekly Shabbat')
      const defaultType = shabbatType || eventTypes[0]

      setEventData(prev => ({
        ...prev,
        eventType: defaultType.id
      }))
    }
  }, [eventTypes, eventData.eventType])

  // Populate form when editing an existing event
  useEffect(() => {
    if (editingEvent && isEdit && eventTypes.length > 0) {
      const startDate = new Date(editingEvent.event_start)
      const endDate = editingEvent.event_end ? new Date(editingEvent.event_end) : startDate

      setEventData({
        title: editingEvent.event_title,
        description: editingEvent.event_description || '',
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toTimeString().slice(0, 5),
        allDay: editingEvent.all_day || false,
        location: editingEvent.location || '',
        eventType: editingEvent.event_type || '',
        food_theme: editingEvent.food_theme || 'none'
      })
    }
  }, [editingEvent, isEdit, eventTypes])

  // Update form when selectedSlot changes (from calendar click)
  useEffect(() => {
    if (selectedSlot && isOpen) {
      const { date, time } = selectedSlot
      const formattedDate = date.toISOString().split('T')[0] // YYYY-MM-DD

      // Create a proper end time (1 hour after start time)
      const startTime = time
      const endTime = new Date(date.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5) // 1 hour later

      setEventData(prev => ({
        ...prev,
        startDate: formattedDate,
        startTime: startTime,
        endDate: formattedDate,
        endTime: endTime
      }))
    }
  }, [selectedSlot, isOpen])

  // Set default location when family group is loaded (only once)
  useEffect(() => {
    if (familyGroup?.address && !eventData.location && !editingEvent) {
      setEventData(prev => ({
        ...prev,
        location: familyGroup.address
      }))
    }
  }, [familyGroup?.address]) // Remove eventData.location dependency to prevent overriding user input

  const handleOpen = () => {
    if (isOpen) {
      // If modal is controlled externally (from calendar), don't change local state
      return
    }
    setOpen(!open)
  }

  const handleClose = () => {
    if (onClose) {
      // If external close handler exists, use it
      onClose()
    } else {
      // Otherwise use local state
      setOpen(!open)
    }
  }

  const handleInputChange = (field, value) => {
    setEventData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    if (!eventData.title || !eventData.startDate) {
      return
    }

    // Set default start time if not provided
    const startTime = eventData.startTime || '00:00'
    const endTime = eventData.endTime || '23:59'

    const startDateTime = new Date(`${eventData.startDate}T${startTime}`)
    const endDateTime = new Date(`${eventData.endDate || eventData.startDate}T${endTime}`)

    if (isEdit && editingEvent) {
      // Edit mode - update existing event
      const updatedEvent = {
        id: editingEvent.id,
        event_title: eventData.title,
        event_description: eventData.description,
        event_start: startDateTime.toISOString(),
        event_end: endDateTime.toISOString(),
        all_day: eventData.allDay,
        location: eventData.location || familyGroup?.address || null,
        event_type: eventData.eventType,
        food_theme: eventData.food_theme
      }

      if (onEventCreate) {
        onEventCreate(updatedEvent)
        // Send Telegram Alert
        fetch('/.netlify/functions/telegram-alert', {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'update', 
            
            event: {
              ...updatedEvent,
              event_type: eventTypes.find(type => type.id === updatedEvent.event_type)?.label || updatedEvent.event_type
            },
            familyName: familyGroup?.family_last_name || 'Family',
            origin: window.location.origin
          })
        }).catch(err => console.error('Failed to send alert:', err))
      }
    } else {
      // Create mode - create new event
      const newEvent = {
        title: eventData.title,
        desc: eventData.description,
        start: startDateTime,
        end: endDateTime,
        allDay: eventData.allDay,
        location: eventData.location || familyGroup?.address || null,
        eventType: eventData.eventType,
        food_theme: eventData.food_theme
      }

      if (onEventCreate) {
        const createdEvent = await onEventCreate(newEvent)
        console.log('Created event in CreateEvent.jsx:', createdEvent)
        
        if (createdEvent) {
          // Send Telegram Alert
          fetch('/.netlify/functions/telegram-alert', {
            method: 'POST',
            body: JSON.stringify({ 
              action: 'create', 
              event: {
                ...createdEvent,
                event_type: eventTypes.find(type => type.id === createdEvent.event_type)?.label || createdEvent.event_type
              },
              familyName: familyGroup?.family_last_name || 'Family',
              origin: window.location.origin
            })
          }).catch(err => console.error('Failed to send alert:', err))
        }
      }
    }

    // Reset form
    setEventData({
      title: '',
      description: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      allDay: false,
      location: '',
      eventType: '', // Reset to empty string
      food_theme: 'none' // Reset to default value
    })

    handleClose()
  }

  // Determine if modal should be open
  const shouldShowModal = isOpen || open

  // Render logic - all hooks must be called before this point
  let content = null

  // If controlled externally (from calendar), always respect isOpen
  if (isOpen !== undefined && !isOpen && !open) {
    content = (
      <Button
        variant='outlined'
        onClick={handleOpen}
        className="mb-4 bt-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        + Create New Event
      </Button>
    )
  }
  // Show loading state while event types are being fetched
  else if (eventTypes.length === 0 && !loading) {
    content = (
      <button
        onClick={() => fetchEventTypes()}
        className="mb-4 bg-gray-500 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        Loading Event Types...
      </button>
    )
  }
  // If modal should be open, show the modal
  else if (shouldShowModal) {
    content = (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary">
        <div className="w-full h-full bg-primary  overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-neutral-200 dark:bg-neutral-800 border-b border-neutral-border p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {isEdit ? 'Edit Event' : (selectedSlot ? 'Create Event at Selected Time' : 'Create New Event')}
              </h2>
              <button
                onClick={handleClose}
                className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Show selected slot info if available */}
            {selectedSlot && (
              <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Selected: {selectedSlot.date.toLocaleDateString()} at {selectedSlot.time}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={eventData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                placeholder="Enter event title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                Description
              </label>
              <textarea
                value={eventData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 text-black dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none shadow-sm"
                placeholder="Enter event description"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={eventData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={eventData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={eventData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={eventData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                  Location
                </label>
                <Autocomplete
                  apiKey={env.VITE_ADDRESS_VALIDATION}
                  onPlaceSelected={(place) => {
                    const address = place.formatted_address || place.name || ''
                    handleInputChange('location', address)
                  }}
                  value={eventData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  placeholder={familyGroup?.address || "Enter event location"}
                  options={{
                    types: ['establishment', 'geocode'],
                    componentRestrictions: { country: 'us' }
                  }}
                />
                {familyGroup?.address && (
                  <div className="mt-1 text-xs text-white dark:text-neutral-400">
                    Default: {familyGroup.address}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                  Event Type
                </label>
                <select
                  value={eventData.eventType}
                  onChange={(e) => handleInputChange('eventType', e.target.value)}
                  className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  disabled={eventTypes.length === 0}
                >
                  {eventTypes.length === 0 ? (
                    <option value="">Loading event types...</option>
                  ) : (
                    eventTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))
                  )}
                </select>
                {eventTypes.length === 0 && (
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    No event types available. Please try refreshing.
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                Food Theme
              </label>
              <input
                type="text"
                value={eventData.food_theme}
                onChange={(e) => handleInputChange('food_theme', e.target.value)}
                className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                placeholder="e.g., Mediterranean, BBQ, Italian, Vegetarian, or leave as 'none'"
              />
              <div className="mt-1 text-xs text-white dark:text-neutral-400">
                Optional: Specify the food theme for this event (default: none)
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allDay"
                checked={eventData.allDay}
                onChange={(e) => handleInputChange('allDay', e.target.checked)}
                className="w-4 h-4 text-primary bg-white dark:bg-neutral-700 border-neutral-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="allDay" className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">
                All Day Event
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0  p-6">
            <div className="flex justify-between">
              {isEdit && (
                <Button
                  variant="solid"
                  color="red"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this event?')) {
                      // Call the delete handler from parent component
                      if (onEventCreate && editingEvent) {
                        // We'll use the onEventCreate prop to handle deletion
                        // The parent component will need to check if the event has a special flag
                        onEventCreate({ ...editingEvent, _action: 'delete' })
                      }
                    }
                  }}
                >
                  Delete Event
                </Button>
              )}
              <div className="flex space-x-3">
                <Button
                  variant="solid"
                  color='secondary'
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  color='secondary'
                  variant="solid"

                  onClick={handleSubmit}
                  disabled={!eventData.title || !eventData.startDate}
                >
                  {isEdit ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  // Fallback: show the button
  else {
    content = (
      <Button
        className='mb-2'

        onClick={handleOpen}
      >
        + Create New Event
      </Button>
    )
  }

  return content
}
