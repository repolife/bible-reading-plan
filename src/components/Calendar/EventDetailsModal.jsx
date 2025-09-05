import React, { useEffect } from 'react'
import { 
  Button,
  Card,
  CardBody,
  Typography,
  IconButton
} from '@material-tailwind/react'
import { XMarkIcon, PencilIcon, TrashIcon, MapPinIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'
import {  useFamilyStore } from '@/store/useFamilyGroupStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Cutlery, Group, InfoCircle, Eye, } from 'iconoir-react';
import { FamilyAllergiesTable } from '@components/FamilyAllergiesTable'

export const EventDetailsModal = ({ 
  event, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  if (!event || !isOpen) return null

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

  const formatDate = (date) => {
    if (!date) return 'Not specified'
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const { fetchFamilyGroup } = useFamilyStore()
  const { profile, fetchAndSetUserProfile } = useProfileStore()
  const { user: authUser } = useAuthStore()

  useEffect(() => {
    // Fetch user profile if not already loaded
    if (authUser?.id && !profile) {
      fetchAndSetUserProfile(authUser.id)
    }
  }, [authUser?.id, profile, fetchAndSetUserProfile])

  useEffect(() => {
   if(event.family_id) {
    fetchFamilyGroup(event.family_id)
   }
  }, [event, fetchFamilyGroup])

  const { familyGroup } = useFamilyStore()
  
  // Check if current user can edit/delete this event
  const canEditEvent = profile?.family_id === event.family_id
  
  console.log("familyGroup", familyGroup)
  console.log("event object:", event)
  console.log("event.food_theme:", event.food_theme)
  console.log("profile:", profile)
  console.log("authUser:", authUser)
  console.log("event.family_id:", event.family_id)
  console.log("profile?.family_id:", profile?.family_id)
  console.log("canEditEvent:", canEditEvent)

  return (
    <div className="fixed inset-0 z-[99999] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-white"></div>
            <Typography variant="h4" className="text-white">
              Event Details
            </Typography>
          </div>
          <IconButton
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
            {/* Main Content */}
            <div className="lg:col-span-2 p-6 space-y-6">
              {/* Event Title */}
              <div>
                <Typography variant="h3" className="text-gray-900 dark:text-white font-bold mb-2">
                  {event.title}
                </Typography>
                {event.eventTypeLabel && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {event.eventTypeLabel}
                  </div>
                )}
              </div>

              {/* Event Description */}
              {event.desc && (
                <div>
                  <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </Typography>
                  <Typography className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {event.desc}
                  </Typography>
                </div>
              )}

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date & Time */}
                <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                      <Typography variant="h6" className="text-gray-700 dark:text-gray-300">
                        Date & Time
                      </Typography>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <Typography variant="small" className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Start
                        </Typography>
                        <Typography className="text-gray-900 dark:text-white font-medium">
                          {formatDateTime(event.start)}
                        </Typography>
                      </div>
                      
                      {event.end && event.end.getTime() !== event.start.getTime() && (
                        <div>
                          <Typography variant="small" className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            End
                          </Typography>
                          <Typography className="text-gray-900 dark:text-white font-medium">
                            {formatDateTime(event.end)}
                          </Typography>
                        </div>
                      )}
                      
                      {event.allDay && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          All Day Event
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>

                {/* Location */}
                <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <MapPinIcon className="h-5 w-5 text-blue-600" />
                      <Typography variant="h6" className="text-gray-700 dark:text-gray-300">
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
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer text-left"
                        title="Click to open in Google Maps"
                      >
                        {event.location}
                      </button>
                    ) : (
                      <Typography className="text-gray-900 dark:text-white">
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
                  <CardBody className="p-4">
                    <Typography variant="h6" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                     <Eye className="h-5 w-5 text-blue-600" /> Event Type
                    </Typography>
                    <Typography className="text-gray-900 dark:text-white">
                      {event.eventTypeLabel || 'Not specified'}
                    </Typography>
                  </CardBody>
                </Card>

                {/* Food Theme */}
                <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                  <CardBody className="p-4">
                    <Typography variant="h6" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                    <Cutlery className="h-5 w-5 text-blue-600"  /> Food Theme  
                    </Typography>
                    
                    <Typography className="text-gray-900 dark:text-white">
                      {event.food_theme && event.food_theme !== 'none' ? event.food_theme : 'No specific food theme'}
                    </Typography>
                  </CardBody>
                </Card>

                {/* Family Group Details */}
                <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                  <CardBody className="p-4">
                    <Typography variant="h6" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                  <InfoCircle className="h-5 w-5 text-blue-600" />    Host Details 
                    </Typography>
                    <Typography variant="h6" className="text-gray-700 font-bold dark:text-gray-300 mb-2">
                      Allergies
                    </Typography>
                    <Typography className="text-gray-900 dark:text-white">
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
                  <CardBody className="p-4">
                    <Typography variant="h6" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                    <Group  className="h-5 w-5 text-blue-600" /> Hosted by
                    </Typography>
                    <Typography className="text-gray-900 dark:text-white">
                     The {familyGroup?.family_last_name || 'Unknown'} family
                    </Typography>
                  </CardBody>
                </Card>
              </div>

              {/* Family Allergies Table */}
              <div className="mt-6">
                <Typography variant="h5" className="text-gray-900 dark:text-white mb-4">
                  Family Allergies & Dietary Information
                </Typography>
                <FamilyAllergiesTable />
              </div>
            </div>

            {/* Sidebar - Actions & Quick Info */}
            <div className="lg:col-span-1 bg-gray-50 dark:bg-gray-800 p-6 border-l border-gray-200 dark:border-gray-700">
              <div className="space-y-6">
                {/* Quick Actions */}
                <div>
                  <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-3">
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
                          onClick={onEdit}
                        >
                          <PencilIcon className="h-4 w-4" />
                          Edit Event
                        </Button>
                        
                        <Button
                          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                          onClick={onDelete}
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
                </div>

                {/* Event Summary */}
                <div>
                  <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-3">
                    Event Summary
                  </Typography>
                  <div className="space-y-2 text-sm">
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
                </div>

                {/* Time Details */}
                <div>
                  <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-3">
                    Time Details
                  </Typography>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">
                        {event.start ? formatTime(event.start) : 'Not specified'}
                      </span>
                    </div>
                    
                    {event.end && event.end.getTime() !== event.start.getTime() && (
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {formatTime(event.end)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <Button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onClick={onClose}>
            Close
          </Button>
          {profile && canEditEvent && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onEdit}>
              Edit Event
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 