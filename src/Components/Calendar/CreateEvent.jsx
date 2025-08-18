import React, { Fragment, useState, useEffect } from 'react'
import { EVENT_TYPES } from '../../store/useFamilyCalendarStore'
import { useFamilyStore } from '../../store/useFamilyGroupStore'
import { useProfileStore } from '../../store/useProfileStore'
import { Button } from '@material-tailwind/react'

export const NewEvent = ({ onEventCreate, onClose, selectedSlot, isOpen }) => {
  const { profile } = useProfileStore()
  const { familyGroup, fetchFamilyGroup } = useFamilyStore()
  
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
    eventType: EVENT_TYPES.SHABBAT
  })

  // Fetch family group when component mounts or profile changes
  useEffect(() => {
    if (profile?.family_id) {
      fetchFamilyGroup(profile.family_id)
    }
  }, [profile?.family_id, fetchFamilyGroup])

  // Update form when selectedSlot changes (from calendar click)
  useEffect(() => {
    if (selectedSlot && isOpen) {
      const { date, time } = selectedSlot
      const formattedDate = date.toISOString().split('T')[0] // YYYY-MM-DD
      
      setEventData(prev => ({
        ...prev,
        startDate: formattedDate,
        startTime: time,
        endDate: formattedDate,
        endTime: time
      }))
    }
  }, [selectedSlot, isOpen])

  // Set default location when family group is loaded
  useEffect(() => {
    if (familyGroup?.address && !eventData.location) {
      setEventData(prev => ({
        ...prev,
        location: familyGroup.address
      }))
    }
  }, [familyGroup?.address, eventData.location])

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

  const handleSubmit = () => {
    if (!eventData.title || !eventData.startDate) {
      return
    }

    // Set default start time if not provided
    const startTime = eventData.startTime || '00:00'
    const endTime = eventData.endTime || '23:59'

    const startDateTime = new Date(`${eventData.startDate}T${startTime}`)
    const endDateTime = new Date(`${eventData.endDate || eventData.startDate}T${endTime}`)

    const newEvent = {
      id: Date.now(),
      title: eventData.title,
      desc: eventData.description,
      start: startDateTime,
      end: endDateTime,
      allDay: eventData.allDay,
      location: eventData.location || familyGroup?.address || null,
      eventType: eventData.eventType
    }

    if (onEventCreate) {
      onEventCreate(newEvent)
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
      eventType: EVENT_TYPES.SHABBAT
    })

    handleClose()
  }

  // Determine if modal should be open
  const shouldShowModal = isOpen || open

  // If controlled externally (from calendar), always respect isOpen
  if (isOpen !== undefined && !isOpen && !open) {
    return (
      <button 
        onClick={handleOpen} 
        className="mb-4 bt-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        + Create New Event
      </button>
    )
  }

  // If modal should be open, show the modal
  if (shouldShowModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary">
        <div className="w-full h-full bg-primary  overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-neutral-200 dark:bg-neutral-800 border-b border-neutral-border p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {selectedSlot ? 'Create Event at Selected Time' : 'Create New Event'}
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
                <input
                  type="text"
                  value={eventData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  placeholder={familyGroup?.address || "Enter event location"}
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
                >
                  <option value={EVENT_TYPES.SHABBAT}>Shabbat</option>
                  <option value={EVENT_TYPES.FEASTDAY}>Feast Day</option>
                  <option value={EVENT_TYPES.BIRTHDAY}>Birthday</option>
                  <option value={EVENT_TYPES.OTHER}>Other</option>
                </select>
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
            <div className="flex justify-end space-x-3">
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
                Create Event
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback: show the button
  return (
    <Button 
      onClick={handleOpen} 
    >
      + Create New Event
    </Button>
  )
}