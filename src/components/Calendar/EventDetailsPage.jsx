import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Button,
  Card,
  CardBody,
  Typography,
  IconButton,
  Input,
  Textarea
} from '@material-tailwind/react'
import { XMarkIcon, PencilIcon, TrashIcon, MapPinIcon, CalendarIcon, ClockIcon, ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useFamilyStore } from '@store/useFamilyGroupStore'
import { useProfileStore } from '@store/useProfileStore'
import { useAuthStore } from '@store/useAuthStore'
import { useFamilyCalendarStore } from '@store/useFamilyCalendarStore'
import { Cutlery, Group, InfoCircle, Eye } from 'iconoir-react'
import { FamilyAllergiesTable } from '@components/FamilyAllergiesTable'
import { EventRSVPButton } from './EventRSVPButton'
import { toast } from 'react-toastify'

export const EventDetailsPage = () => {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    eventType: '',
    food_theme: 'none'
  })

  const { fetchFamilyGroup } = useFamilyStore()
  const { profile, fetchAndSetUserProfile } = useProfileStore()
  const { user: authUser } = useAuthStore()
  const { fetchAllEvents, updateEvent, deleteEvent, loading: storeLoading } = useFamilyCalendarStore()

  useEffect(() => {
    // Fetch user profile if not already loaded
    if (authUser?.id && !profile) {
      fetchAndSetUserProfile(authUser.id)
    }
  }, [authUser?.id, profile, fetchAndSetUserProfile])

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return

      try {
        setLoading(true)
        setError(null)

        // Fetch all events to get the specific one
        const events = await fetchAllEvents()
        
        if (events) {
          const foundEvent = events.find(e => e.id === eventId)
          
          if (foundEvent) {
            // Transform the event data to match the expected format
            const transformedEvent = {
              id: foundEvent.id,
              title: foundEvent.event_title,
              desc: foundEvent.event_description,
              start: new Date(foundEvent.event_start),
              end: foundEvent.event_end ? new Date(foundEvent.event_end) : null,
              allDay: foundEvent.all_day || false,
              location: foundEvent.location,
              eventType: foundEvent.event_type,
              eventTypeLabel: foundEvent.event_type_label || 'Event',
              family_id: foundEvent.family_id,
              createdBy: foundEvent.created_by,
              food_theme: foundEvent.food_theme
            }
            
            setEvent(transformedEvent)
            
            // Initialize edit form with current event data
            setEditForm({
              title: transformedEvent.title,
              description: transformedEvent.desc || '',
              startDate: transformedEvent.start.toISOString().split('T')[0],
              startTime: transformedEvent.start.toTimeString().slice(0, 5),
              endDate: transformedEvent.end ? transformedEvent.end.toISOString().split('T')[0] : transformedEvent.start.toISOString().split('T')[0],
              endTime: transformedEvent.end ? transformedEvent.end.toTimeString().slice(0, 5) : transformedEvent.start.toTimeString().slice(0, 5),
              allDay: transformedEvent.allDay,
              location: transformedEvent.location || '',
              eventType: transformedEvent.eventType || '',
              food_theme: transformedEvent.food_theme || 'none'
            })
            
            // Fetch family group information
            if (foundEvent.family_id) {
              fetchFamilyGroup(foundEvent.family_id)
            }
          } else {
            setError('Event not found')
          }
        }
      } catch (err) {
        console.error('Error fetching event:', err)
        setError('Failed to load event details')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId, fetchAllEvents, fetchFamilyGroup])

  const { familyGroup } = useFamilyStore()
  
  // Check if current user can edit/delete this event
  const canEditEvent = profile?.family_id === event?.family_id

  const formatDateTime = (date) => {
    if (!date) return 'Not specified'
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (date) => {
    if (!date) return 'Not specified'
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    // Reset form to original values
    if (event) {
      setEditForm({
        title: event.title,
        description: event.event_description || '',
        startDate: event.start.toISOString().split('T')[0],
        startTime: event.start.toTimeString().slice(0, 5),
        endDate: event.end ? event.end.toISOString().split('T')[0] : event.start.toISOString().split('T')[0],
        endTime: event.end ? event.end.toTimeString().slice(0, 5) : event.start.toTimeString().slice(0, 5),
        allDay: event.allDay,
        location: event.location || '',
        eventType: event.eventType || '',
        food_theme: event.food_theme || 'none'
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!event) return

    setSaving(true)
    try {
      const startDateTime = new Date(`${editForm.startDate}T${editForm.startTime}`)
      const endDateTime = new Date(`${editForm.endDate}T${editForm.endTime}`)

      const updatedEventData = {
        event_title: editForm.title,
        event_description: editForm.description,
        event_start: startDateTime.toISOString(),
        event_end: endDateTime.toISOString(),
        all_day: editForm.allDay,
        location: editForm.location,
        event_type: editForm.eventType,
        food_theme: editForm.food_theme
      }

      const success = await updateEvent(event.id, updatedEventData)
      
      if (success) {
        // Update local event state
        setEvent(prev => ({
          ...prev,
          title: editForm.title,
          desc: editForm.description,
          start: startDateTime,
          end: endDateTime,
          allDay: editForm.allDay,
          location: editForm.location,
          eventType: editForm.eventType,
          food_theme: editForm.food_theme
        }))
        
        setIsEditing(false)
        toast.success('Event updated successfully!')
      } else {
        toast.error('Failed to update event')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Failed to update event')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDelete = async () => {
    if (!event) return
    
    const confirmMessage = 'Are you sure you want to delete this event? This action cannot be undone.'
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      console.log('Deleting event from EventDetailsPage:', event.id)
      const success = await deleteEvent(event.id)
      
      if (success) {
        toast.success('Event deleted successfully!')
        console.log('Event deleted, navigating to calendar')
        navigate('/calendar')
      } else {
        console.error('Delete operation returned false')
        const errorMessage = useFamilyCalendarStore.getState().error || 'Failed to delete event'
        toast.error(`Error: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error(`Failed to delete event: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <Typography variant="h6" className="text-gray-600 dark:text-gray-400">
            Loading event details...
          </Typography>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Typography variant="h5" className="text-red-600 dark:text-red-400 mb-4">
            {error || 'Event not found'}
          </Typography>
          <Typography className="text-gray-600 dark:text-gray-400 mb-6">
            The event you're looking for doesn't exist or has been removed.
          </Typography>
          <div className="space-x-4">
            <Button 
              onClick={() => navigate('/calendar')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              View Calendar
            </Button>
            <Button 
              onClick={() => navigate('/')}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center flex-wrap justify-between py-4 gap-2">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/calendar')}
                className="flex items-center gap-2"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                Back to Calendar
              </Button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <Typography variant="h4" className="text-gray-900 dark:text-white font-bold">
                {isEditing ? 'Edit Event' : 'Event Details'}
              </Typography>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              {profile && canEditEvent && !isEditing && (
                <>
                  <Button
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleEdit}
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit Event
                  </Button>
                  
                  <Button
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleDelete}
                    disabled={storeLoading}
                  >
                    <TrashIcon className="h-4 w-4" />
                    {storeLoading ? 'Deleting...' : 'Delete Event'}
                  </Button>
                </>
              )}

              {isEditing && (
                <>
                  <Button
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleSaveEdit}
                    disabled={saving}
                  >
                    <CheckIcon className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  
                  <Button
                    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Title */}
            <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
              <CardBody className="p-6">
                {isEditing ? (
                  <Input
                    label="Event Title"
                    value={editForm.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="text-2xl font-bold"
                  />
                ) : (
                  <Typography variant="h2" className="text-gray-900 dark:text-white font-bold mb-3">
                    {event.title}
                  </Typography>
                )}
               <div className="flex items-center gap-2">
               {event.eventTypeLabel && (
                  <div className="inline-flex items-center  px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {event.eventTypeLabel}
                    
                  </div>
                )}
               
               </div>
              </CardBody>
            </Card>

            {/* Event Description */}
            <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
              <CardBody className="p-6">
                <Typography variant="h5" className="text-gray-700 dark:text-gray-300 mb-3">
                  Description
                </Typography>
                {isEditing ? (
                  <Textarea
                    label="Event Description"
                    value={editForm.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                ) : (
                  <Typography className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {event.desc || 'No description provided'}
                  </Typography>
                )}
              </CardBody>
            </Card>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date & Time */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CalendarIcon className="h-6 w-6 text-blue-600" />
                    <Typography variant="h5" className="text-gray-700 dark:text-gray-300">
                      Date & Time
                    </Typography>
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="date"
                          label="Start Date"
                          value={editForm.startDate}
                          onChange={(e) => handleInputChange('startDate', e.target.value)}
                        />
                        <Input
                          type="time"
                          label="Start Time"
                          value={editForm.startTime}
                          onChange={(e) => handleInputChange('startTime', e.target.value)}
                          disabled={editForm.allDay}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="date"
                          label="End Date"
                          value={editForm.endDate}
                          onChange={(e) => handleInputChange('endDate', e.target.value)}
                        />
                        <Input
                          type="time"
                          label="End Time"
                          value={editForm.endTime}
                          onChange={(e) => handleInputChange('endTime', e.target.value)}
                          disabled={editForm.allDay}
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="allDay"
                          checked={editForm.allDay}
                          onChange={(e) => handleInputChange('allDay', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="allDay" className="text-sm text-gray-600 dark:text-gray-400">
                          All Day Event
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Typography variant="small" className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Start
                        </Typography>
                        <Typography className="text-gray-900 dark:text-white font-medium text-lg">
                          {formatDateTime(event.start)}
                        </Typography>
                      </div>
                      
                      {event.end && event.end.getTime() !== event.start.getTime() && (
                        <div>
                          <Typography variant="small" className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            End
                          </Typography>
                          <Typography className="text-gray-900 dark:text-white font-medium text-lg">
                            {formatDateTime(event.end)}
                          </Typography>
                        </div>
                      )}
                      
                      {event.allDay && (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          All Day Event
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Location */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPinIcon className="h-6 w-6 text-blue-600" />
                    <Typography variant="h5" className="text-gray-700 dark:text-gray-300">
                      Location
                    </Typography>
                  </div>
                  
                  {isEditing ? (
                    <Input
                      label="Location"
                      value={editForm.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  ) : (
                    event.location ? (
                      <button
                        onClick={() => {
                          const encodedAddress = encodeURIComponent(event.location)
                          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
                          window.open(googleMapsUrl, '_blank')
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer text-left text-lg"
                        title="Click to open in Google Maps"
                      >
                        {event.location}
                      </button>
                    ) : (
                      <Typography className="text-gray-900 dark:text-white text-lg">
                        No location specified
                      </Typography>
                    )
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Type */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardBody className="p-6">
                  <Typography variant="h5" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
                    <Eye className="h-6 w-6 text-blue-600" /> Event Type
                  </Typography>
                  <Typography className="text-gray-900 dark:text-white text-lg">
                    {event.eventTypeLabel || 'Not specified'}
                  </Typography>
                </CardBody>
              </Card>

              {/* Food Theme */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardBody className="p-6">
                  <Typography variant="h5" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
                    <Cutlery className="h-6 w-6 text-blue-600" /> Food Theme  
                  </Typography>
                  
                  {isEditing ? (
                    <Input
                      label="Food Theme"
                      value={editForm.food_theme}
                      onChange={(e) => handleInputChange('food_theme', e.target.value)}
                    />
                  ) : (
                    <Typography className="text-gray-900 dark:text-white text-lg">
                      {event.food_theme && event.food_theme !== 'none' ? event.food_theme : 'No specific food theme'}
                    </Typography>
                  )}
                </CardBody>
              </Card>

              {/* Family Group Details */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardBody className="p-6">
                  <Typography variant="h5" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
                    <InfoCircle className="h-6 w-6 text-blue-600" /> Host Details 
                  </Typography>
                  <Typography variant="h6" className="text-gray-700 font-bold dark:text-gray-300 mb-2">
                    Allergies
                  </Typography>
                  <Typography className="text-gray-900 dark:text-white mb-4">
                    {familyGroup?.food_allergies || 'None'}
                  </Typography>
                  <Typography variant="h6" className="text-gray-700 font-bold dark:text-gray-300 mb-2">
                    House Rules
                  </Typography>
                  <Typography className="text-gray-900 dark:text-white">
                    {familyGroup?.house_rules || 'None'}
                  </Typography>
                </CardBody>
              </Card>

              {/* Created By */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardBody className="p-6">
                  <Typography variant="h5" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
                    <Group className="h-6 w-6 text-blue-600" /> Hosted by
                  </Typography>
                  <Typography className="text-gray-900 dark:text-white text-lg">
                    The {familyGroup?.family_last_name || 'Unknown'} family
                  </Typography>
                </CardBody>
              </Card>
            </div>
                 {/* RSVP Section */}
                 <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
              <CardBody className="p-6">
                <Typography variant="h5" className="text-gray-700 dark:text-gray-300 mb-4">
                  RSVP
                </Typography>
                <EventRSVPButton 
                  eventId={event.id}
                  eventTitle={event.title}
                  onRSVPChange={(isAttending, newCount) => {
                    console.log(`RSVP changed: ${isAttending}, count: ${newCount}`)
                  }}
                />
              </CardBody>
            </Card>

            {/* Family Allergies Table */}
            <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
              <CardBody className="p-6">
                <Typography variant="h4" className="text-gray-900 dark:text-white mb-4">
                  Family Allergies & Dietary Information
                </Typography>
                <FamilyAllergiesTable />
              </CardBody>
            </Card>
          </div>

          {/* Sidebar - Actions & Quick Info - Only show when not editing */}
          {!isEditing && (
            <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
              <CardBody className="p-6">
                <Typography variant="h5" className="text-gray-700 dark:text-gray-300 mb-4">
                  Quick Actions
                </Typography>
                <div className="space-y-3">
                  {!profile ? (
                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Typography variant="small" className="text-gray-500 dark:text-gray-400">
                        Loading permissions...
                      </Typography>
                    </div>
                  ) : canEditEvent ? (
                    <>
                      <Button
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleEdit}
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit Event
                      </Button>
                      
                      <Button
                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleDelete}
                        disabled={storeLoading}
                      >
                        <TrashIcon className="h-4 w-4" />
                        {storeLoading ? 'Deleting...' : 'Delete Event'}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Typography variant="small" className="text-gray-500 dark:text-gray-400">
                        You can only edit events hosted by your family
                      </Typography>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

       

            {/* Event Summary */}
            <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
              <CardBody className="p-6">
                <Typography variant="h5" className="text-gray-700 dark:text-gray-300 mb-4">
                  Event Summary
                </Typography>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {event.start && event.end ? 
                        `${Math.round((event.end - event.start) / (1000 * 60 * 60) * 10) / 10} hours` : 
                        'Not specified'
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">All Day:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {event.allDay ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Has Location:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {event.location ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Time Details */}
            <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
              <CardBody className="p-6">
                <Typography variant="h5" className="text-gray-700 dark:text-gray-300 mb-4">
                  Time Details
                </Typography>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {event.start ? formatTime(event.start) : 'Not specified'}
                    </span>
                  </div>
                  
                  {event.end && event.end.getTime() !== event.start.getTime() && (
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">
                        {event.end ? formatTime(event.end) : 'Not specified'}
                      </span>
                    </div>
                  )}
                </div>
              

              </CardBody>
            </Card>
          </div>
          )}
        </div>
      </div>
    </div>
  )
} 