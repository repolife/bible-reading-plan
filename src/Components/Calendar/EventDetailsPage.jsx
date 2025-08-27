import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Button,
  Card,
  CardBody,
  Typography,
  IconButton
} from '@material-tailwind/react'
import { XMarkIcon, PencilIcon, TrashIcon, MapPinIcon, CalendarIcon, ClockIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useFamilyStore } from '@/store/useFamilyGroupStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useFamilyCalendarStore } from '@/store/useFamilyCalendarStore'
import { Cutlery, Group, InfoCircle, Eye } from 'iconoir-react'
import { FamilyAllergiesTable } from '@/Components/FamilyAllergiesTable'
import { EventRSVPButton } from './EventRSVPButton'
import { toast } from 'react-toastify'

export const EventDetailsPage = () => {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { fetchFamilyGroup } = useFamilyStore()
  const { profile, fetchAndSetUserProfile } = useProfileStore()
  const { user: authUser } = useAuthStore()
  const { fetchAllEvents } = useFamilyCalendarStore()

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
              desc: foundEvent.description,
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
    navigate(`/calendar?editEvent=${event.id}`)
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      // Navigate to calendar for deletion
      navigate('/calendar')
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
          <div className="flex items-center justify-between py-4">
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
                Event Details
              </Typography>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              {profile && canEditEvent && (
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
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete Event
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
                <Typography variant="h2" className="text-gray-900 dark:text-white font-bold mb-3">
                  {event.title}
                </Typography>
                {event.eventTypeLabel && (
                  <div className="inline-flex items-center  px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {event.eventTypeLabel}
                    
                  </div>
                )}
                  <button
                 
                  onClick={() => {
                    // Create a more Telegram-friendly share format with proper URL formatting
                    let eventUrl = window.location.href
                    const eventTitle = event.title || 'Event'
                    
                    // For development (localhost), keep as is
                    // For production, ensure proper format
                    if (!eventUrl.includes('localhost')) {
                      // Only modify production URLs
                      if (!eventUrl.includes('www.')) {
                        // Add www. if it's missing
                        eventUrl = eventUrl.replace('https://', 'https://www.')
                      }
                    }
                    
                    const shareText = `Check out this event: ${eventTitle}\n\n${eventUrl}`
                    
                    // Try to use Telegram's direct share if available
                    if (navigator.share) {
                      navigator.share({
                        title: eventTitle,
                        text: `Check out this event: ${eventTitle}`,
                        url: eventUrl
                      }).catch(() => {
                        // Fallback to Telegram share
                        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(`Check out this event: ${eventTitle} hosted by the ${familyGroup?.family_last_name || 'Unknown'} family`)}`
                        window.open(shareUrl, '_blank')
                      })
                    } else {
                      // Fallback to Telegram share
                      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(`Check out this event: ${eventTitle} hosted by the ${familyGroup?.family_last_name  || 'Unknown'} family`)}`
                      window.open(shareUrl, '_blank')
                    }
                  }}
                  className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-colors cursor-pointer"
                  title="Share on Telegram"
                >
                  <svg 
                    className="w-6 h-6" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </button>
              </CardBody>
            </Card>

            {/* Event Description */}
            {event.desc && (
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardBody className="p-6">
                  <Typography variant="h5" className="text-gray-700 dark:text-gray-300 mb-3">
                    Description
                  </Typography>
                  <Typography className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {event.desc}
                  </Typography>
                </CardBody>
              </Card>
            )}

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
                  
                  {event.location ? (
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
                  
                  <Typography className="text-gray-900 dark:text-white text-lg">
                    {event.food_theme && event.food_theme !== 'none' ? event.food_theme : 'No specific food theme'}
                  </Typography>
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

          {/* Sidebar - Actions & Quick Info */}
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
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete Event
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
        </div>
      </div>
    </div>
  )
} 