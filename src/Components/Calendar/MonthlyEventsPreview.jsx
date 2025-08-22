import React, { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, Typography, Button } from '@material-tailwind/react'
import { CalendarIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useFamilyCalendarStore, useFamilyCalendarSelectors } from '../../store/useFamilyCalendarStore'
import { useProfileStore } from '../../store/useProfileStore'
import { useAuthStore } from '../../store/useAuthStore'
import { EventDetailsModal } from './EventDetailsModal'
import { useFamilyStore } from '@/store/useFamilyGroupStore'
import { supabase } from '@/supabaseClient'


export const MonthlyEventsPreview = () => {
  const navigate = useNavigate()
  const { user: authUser } = useAuthStore()
  const { profile, fetchAndSetUserProfile } = useProfileStore()
  const {  fetchEventTypes, fetchAllEvents } = useFamilyCalendarStore()
  const { familyGroup, fetchFamilyGroup } = useFamilyStore()
  // State for event details modal
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [familyGroups, setFamilyGroups] = useState({})
  
  // Get all events from all users and event types
  const allEvents = useFamilyCalendarSelectors.useAllEvents()
  const eventTypes = useFamilyCalendarSelectors.useEventTypes()
  const loading = useFamilyCalendarSelectors.useLoading()

  // Fetch profile when auth user changes
  useEffect(() => {
    if (authUser?.id) {
      fetchAndSetUserProfile(authUser.id)
    }
  }, [authUser?.id, fetchAndSetUserProfile])
  

  // Fetch events and event types when component mounts or profile changes
  useEffect(() => {
    fetchAllEvents()
    if (profile?.family_id) {
      fetchEventTypes()
      fetchFamilyGroup(profile.family_id)
    }
  }, [profile?.family_id, fetchAllEvents, fetchEventTypes, fetchFamilyGroup])

  // Fetch family group information for all events
  useEffect(() => {
    const fetchFamilyGroupsForEvents = async () => {
      if (allEvents && allEvents.length > 0) {
        const uniqueFamilyIds = [...new Set(allEvents.map(event => event.family_id).filter(Boolean))]
        
        for (const familyId of uniqueFamilyIds) {
          if (!familyGroups[familyId]) {
            try {
              const { data, error } = await supabase
                .from('family_groups')
                .select('family_last_name')
                .eq('id', familyId)
                .single()
              
              if (data && !error) {
                setFamilyGroups(prev => ({
                  ...prev,
                  [familyId]: data.family_last_name
                }))
              }
            } catch (error) {
              console.error('Error fetching family group:', error)
            }
          }
        }
      }
    }

    fetchFamilyGroupsForEvents()
  }, [allEvents, familyGroups])

  // Handlers for event details modal
  const handleEventClick = (event) => {
    setSelectedEvent(event)
    setShowEventDetailsModal(true)
  }

  const handleCloseModal = () => {
    setShowEventDetailsModal(false)
    setSelectedEvent(null)
  }

  const handleEditEvent = () => {
    // Navigate to calendar for editing
    navigate('/calendar')
    handleCloseModal()
  }

  const handleDeleteEvent = () => {
    // Navigate to calendar for deletion
    navigate('/calendar')
    handleCloseModal()
  }

  // Get current month events (limited to 4)
  const currentMonthEvents = useMemo(() => {
    if (!allEvents || allEvents.length === 0) return []

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return allEvents
      .filter(event => {
        const eventDate = new Date(event.event_start)
        return eventDate.getMonth() === currentMonth && 
               eventDate.getFullYear() === currentYear
      })
      .sort((a, b) => new Date(a.event_start) - new Date(b.event_start))
      .slice(0, 4)
      .map(event => {
        // Find the event type label
        const eventType = eventTypes.find(type => type.id === event.event_type)
        const eventTypeLabel = eventType ? eventType.label : 'Unknown Type'
        
        return {
          ...event,
          eventTypeLabel
        }
      })
  }, [allEvents, eventTypes])

  // If no profile, don't render anything
  if (!profile) {
    return null
  }

  // If loading, show loading state
  if (loading) {
    return (
      <Card className="mb-6">
        <CardBody className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading events...</span>
          </div>
        </CardBody>
      </Card>
    )
  }

  // If no events this month
  if (currentMonthEvents.length === 0) {
    return (
      <Card className="mb-6">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h5" className="text-gray-900 dark:text-white font-semibold">
              This Month's Community Events
            </Typography>
            <Button
              className=" hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => navigate('/calendar')}
            >
              View Calendar
            </Button>
          </div>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <Typography variant="h6" className="text-gray-500 dark:text-gray-400 mb-2">
              No events scheduled this month
            </Typography>
            <Typography className="text-gray-400 dark:text-gray-500">
              Create your first event to get started!
            </Typography>
          </div>
        </CardBody>
      </Card>
    )
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
    <Card className="mb-6 w-full">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Typography variant="h5" className="text-gray-900 dark:text-white font-semibold">
            This Month's Community Events
          </Typography>
    
        </div>

        <div className="space-y-4">
          {currentMonthEvents.map((event, index) => (
            <div
              key={event.id}
              className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => handleEventClick(event)}
            >
              {/* Date/Time Column */}
              <div className="flex-shrink-0 text-center sm:min-w-[80px]">
                <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg p-2">
                  <Typography variant="small" className="font-semibold">
                    {formatDate(event.event_start)}
                  </Typography>
                </div>
              </div>

              {/* Event Details Column */}
              <div className="flex-1 min-w-0 space-y-2">
                <Typography variant="h6" className="text-gray-900 dark:text-white font-semibold mb-1 truncate">
                  {event.event_title}
                </Typography>
                
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400 mb-2">
                  Hosted by {familyGroups[event.family_id] || 'Family Group'}
                </Typography>
                
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  {event.location && (
                    <div className="flex items-center space-x-1">
                      <MapPinIcon className="h-4 w-4" />
                      <button
                        onClick={() => {
                          const encodedAddress = encodeURIComponent(event.location)
                          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
                          window.open(googleMapsUrl, '_blank')
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer truncate text-left"
                        title="Click to open in Google Maps"
                      >
                        {event.location}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Type Badge */}
              {event.event_type && (
                <div className="flex-shrink-0 self-start sm:self-auto">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {event.eventTypeLabel}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* View All Events Button */}
        <div className="mt-6 text-center">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            onClick={() => navigate('/calendar')}
          >
            View All Events
          </Button>
        </div>
      </CardBody>
    </Card>

    {/* Event Details Modal */}
    {showEventDetailsModal && selectedEvent && (
      <EventDetailsModal
        event={selectedEvent}
        isOpen={showEventDetailsModal}
        onClose={handleCloseModal}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
    )}
  </>
  )
} 