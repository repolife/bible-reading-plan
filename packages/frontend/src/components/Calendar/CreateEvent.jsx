import React, { Fragment, useState, useEffect } from 'react'
import { useFamilyCalendarStore, useFamilyCalendarSelectors } from '../../store/useFamilyCalendarStore' 
import { useFamilyStore } from '../../store/useFamilyGroupStore' 
import { useProfileStore } from '../../store/useProfileStore'
import { Button } from '@material-tailwind/react'
import Autocomplete from "react-google-autocomplete"
import { toDateInputValue, toLocalDateString } from '../../utils/dateTime'


const env = import.meta.env;

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
    food_theme: 'none', // Default food theme
    max_capacity: ''
  })
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
        startDate: toDateInputValue(editingEvent.event_start, { preferStoredDate: editingEvent.all_day }),
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: toDateInputValue(editingEvent.event_end || editingEvent.event_start, { preferStoredDate: editingEvent.all_day }),
        endTime: endDate.toTimeString().slice(0, 5),
        allDay: editingEvent.all_day || false,
        location: editingEvent.location || '',
        eventType: editingEvent.event_type || '',
        food_theme: editingEvent.food_theme || 'none',
        max_capacity: editingEvent.max_capacity || ''
      })
    }
  }, [editingEvent, isEdit, eventTypes])

  // Update form when selectedSlot changes (from calendar click)
  useEffect(() => {
    if (selectedSlot && isOpen) {
      const { date, time } = selectedSlot
      const formattedDate = toLocalDateString(date)

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
        food_theme: eventData.food_theme,
        max_capacity: eventData.max_capacity || null
      }

      if (onEventCreate) {
        onEventCreate(updatedEvent)
        // Send Telegram Alert only if fields changed
        const hasChanges = 
          updatedEvent.event_title !== editingEvent.event_title ||
          updatedEvent.event_description !== (editingEvent.event_description || '') ||
          updatedEvent.event_start !== editingEvent.event_start ||
          updatedEvent.event_end !== editingEvent.event_end ||
          updatedEvent.all_day !== editingEvent.all_day ||
          (updatedEvent.location || '') !== (editingEvent.location || '') ||
          updatedEvent.event_type !== editingEvent.event_type ||
          (updatedEvent.food_theme || 'none') !== (editingEvent.food_theme || 'none') ||
          (updatedEvent.max_capacity || '') !== (editingEvent.max_capacity || '')

        if (hasChanges) {
          fetch(`${env.VITE_TELEGRAM_ACTION_URL}`, {
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
        } else {
          console.log('No changes detected in CreateEvent, skipping Telegram alert.')
        }
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
        food_theme: eventData.food_theme,
        max_capacity: eventData.max_capacity || null
      }

      if (onEventCreate) {
        const createdEvent = await onEventCreate(newEvent)
        console.log('Created event in CreateEvent.jsx:', createdEvent)
        
        if (createdEvent) {
          // Send Telegram Alert
          fetch(`${env.VITE_TELEGRAM_ACTION_URL}`, {
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
      food_theme: 'none', // Reset to default value
      max_capacity: ''
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
      <div className="fixed inset-0 z-[60] h-[100dvh] flex flex-col bg-white dark:bg-neutral-900 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {isEdit ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {selectedSlot && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {selectedSlot.date.toLocaleDateString()} at {selectedSlot.time}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Title *</label>
            <input
              type="text"
              value={eventData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
            <textarea
              value={eventData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-black dark:text-white bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496] resize-none"
              placeholder="Optional description"
            />
          </div>

          {/* Start row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Start Date *</label>
              <input
                type="date"
                value={eventData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Start Time</label>
              <input
                type="time"
                value={eventData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
              />
            </div>
          </div>

          {/* End row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">End Date</label>
              <input
                type="date"
                value={eventData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">End Time</label>
              <input
                type="time"
                value={eventData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Location</label>
            <Autocomplete
              apiKey={env.VITE_ADDRESS_VALIDATION}
              onPlaceSelected={(place) => handleInputChange('location', place.formatted_address || place.name || '')}
              value={eventData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
              placeholder={familyGroup?.address || "Location"}
              options={{ types: ['establishment', 'geocode'], componentRestrictions: { country: 'us' } }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Event Type</label>
            <select
              value={eventData.eventType}
              onChange={(e) => handleInputChange('eventType', e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
              disabled={eventTypes.length === 0}
            >
              {eventTypes.length === 0
                ? <option value="">Loading…</option>
                : eventTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)
              }
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Food Theme</label>
            <input
              type="text"
              value={eventData.food_theme}
              onChange={(e) => handleInputChange('food_theme', e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
              placeholder="e.g. Mediterranean, BBQ (or leave as 'none')"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Max Families / People</label>
            <input
              type="text"
              value={eventData.max_capacity}
              onChange={(e) => handleInputChange('max_capacity', e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
              placeholder="Leave empty for no limit"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={eventData.allDay}
              onChange={(e) => handleInputChange('allDay', e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-[#0e9496] focus:ring-[#0e9496]"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">All Day Event</span>
          </label>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-700 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-3">
          {isEdit && (
            <button
              onClick={() => {
                if (window.confirm('Delete this event?')) {
                  if (onEventCreate && editingEvent) onEventCreate({ ...editingEvent, _action: 'delete' })
                }
              }}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!eventData.title || !eventData.startDate}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#0e9496] text-white hover:bg-[#0c7c7e] disabled:opacity-50 transition-colors"
          >
            {isEdit ? 'Update' : 'Create'}
          </button>
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
