import React, { useEffect, useMemo, useState } from 'react'
import { 
  Card, 
  CardBody, 
  Typography, 
  Button,
  Chip,
  IconButton
} from '@material-tailwind/react'
import { 
  ClockIcon, 
  UserIcon, 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { usePrayerRequestStore, usePrayerRequestSelectors } from '@/store/usePrayerRequestStore'
import { useAuthStore } from '@/store/useAuthStore'
import { CreatePrayerRequest } from './CreatePrayerRequest'
import { toast } from 'react-toastify'

export const WeeklyPrayerRequests = () => {
  const { user } = useAuthStore()
  const { fetchPrayerRequestsForWeek, updatePrayerRequestStatus, deletePrayerRequest } = usePrayerRequestStore()
  const prayerRequests = usePrayerRequestSelectors.usePrayerRequests()
  const loading = usePrayerRequestSelectors.useLoading()
  const error = usePrayerRequestSelectors.useError()
  const statusCounts = usePrayerRequestSelectors.usePrayerRequestsCountByStatus()
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)

  // Calculate current week dates
  const { startOfWeek, endOfWeek } = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(start)
    end.setDate(start.getDate() + 6) // End of week (Saturday)
    end.setHours(23, 59, 59, 999)
    
    return { startOfWeek: start, endOfWeek: end }
  }, [])

  // Fetch prayer requests for the current week
  useEffect(() => {
    fetchPrayerRequestsForWeek(startOfWeek, endOfWeek)
  }, [fetchPrayerRequestsForWeek, startOfWeek, endOfWeek])

  // Filter prayer requests for current week
  const weeklyPrayerRequests = useMemo(() => {
    return prayerRequests.filter(request => {
      const requestDate = new Date(request.created_at)
      return requestDate >= startOfWeek && requestDate <= endOfWeek
    })
  }, [prayerRequests, startOfWeek, endOfWeek])


  

  // Group prayer requests by day
  const prayerRequestsByDay = useMemo(() => {
    const grouped = {}
    
    weeklyPrayerRequests.forEach(request => {
      const date = new Date(request.created_at)
      const dayKey = date.toDateString()
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = []
      }
      grouped[dayKey].push(request)
    })
    
    return grouped
  }, [weeklyPrayerRequests])

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await updatePrayerRequestStatus(requestId, newStatus)
      toast.success('Prayer request status updated')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this prayer request?')) {
      return
    }

    try {
      await deletePrayerRequest(requestId)
      toast.success('Prayer request deleted')
    } catch (error) {
      toast.error('Failed to delete prayer request')
    }
  }

  const handleRequestCreated = (newRequest) => {
    setShowCreateModal(false)
    setIsEditMode(false)
    setSelectedRequest(null)
    toast.success('Prayer request created successfully')
    
    // Refresh the prayer requests to show the new one
    fetchPrayerRequestsForWeek(startOfWeek, endOfWeek)
  }

  const handleRequestUpdated = (updatedRequest) => {
    setShowCreateModal(false)
    setIsEditMode(false)
    setSelectedRequest(null)
    toast.success('Prayer request updated successfully')
    
    // Refresh the prayer requests to show the updated one
    fetchPrayerRequestsForWeek(startOfWeek, endOfWeek)
  }

  const handleEditClick = (request) => {
    setSelectedRequest(request)
    setIsEditMode(true)
    setShowCreateModal(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'blue'
      case 'in_progress':
        return 'yellow'
      case 'answered':
        return 'green'
      case 'closed':
        return 'gray'
      default:
        return 'blue'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardBody className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading prayer requests...</span>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardBody className="p-6">
          <div className="text-center py-8">
            <Typography variant="h6" className="text-red-600 mb-2">
              Error loading prayer requests
            </Typography>
            <Typography className="text-gray-600 mb-4">
              {error}
            </Typography>
            <Button onClick={() => fetchPrayerRequestsForWeek(startOfWeek, endOfWeek)}>
              Try Again
            </Button>
          </div>
        </CardBody>
      </Card>
    )
  }

  if(!user){
    return null
  }
  return (
    <>
      <Card className="mb-6">
        <CardBody className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="text-center sm:text-left">
              <Typography variant="h4" className="text-gray-900 dark:text-white font-bold mb-2 text-xl sm:text-2xl">
                This Week's Prayer Requests
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400 text-sm">
                {startOfWeek.toLocaleDateString()} - {endOfWeek.toLocaleDateString()}
              </Typography>
            </div>
            
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm sm:text-base"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">New Prayer Request</span>
              <span className="sm:hidden">New Request</span>
            </Button>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Typography variant="h4" className="text-blue-600 dark:text-blue-400 font-bold text-lg sm:text-xl">
                {statusCounts.pending}
              </Typography>
              <Typography variant="small" className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                Pending
              </Typography>
            </div>
            <div className="text-center p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Typography variant="h4" className="text-yellow-600 dark:text-yellow-400 font-bold text-lg sm:text-xl">
                {statusCounts.in_progress}
              </Typography>
              <Typography variant="small" className="text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm">
                In Progress
              </Typography>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Typography variant="h4" className="text-green-600 dark:text-green-400 font-bold text-lg sm:text-xl">
                {statusCounts.answered}
              </Typography>
              <Typography variant="small" className="text-green-600 dark:text-green-400 text-xs sm:text-sm">
                Answered
              </Typography>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <Typography variant="h4" className="text-gray-600 dark:text-gray-400 font-bold text-lg sm:text-xl">
                {statusCounts.closed}
              </Typography>
              <Typography variant="small" className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                Closed
              </Typography>
            </div>
          </div>

          {/* Prayer Requests by Day */}
          {Object.keys(prayerRequestsByDay).length === 0 ? (
            <div className="text-center py-12">
              <Typography variant="h6" className="text-gray-500 dark:text-gray-400 mb-2">
                No prayer requests this week
              </Typography>
              <Typography className="text-gray-400 dark:text-gray-500">
                Be the first to create a prayer request for the community
              </Typography>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(prayerRequestsByDay).map(([dayKey, requests]) => (
                <div key={dayKey} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                  <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-3 font-semibold text-base sm:text-lg">
                    {new Date(dayKey).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                  
                  <div className="space-y-3 sm:space-y-4">
                    {requests.map((request) => (
                      <Card key={request.id} className="shadow-sm border border-gray-200 dark:border-gray-700">
                        <CardBody className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <Typography variant="small" className="text-gray-600 dark:text-gray-400 text-sm">
                                {request.is_anonymous ? 'Anonymous' : (request.profiles?.name || 'Unknown User')}
                              </Typography>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Chip
                                value={request.status.replace('_', ' ')}
                                color={getStatusColor(request.status)}
                                size="sm"
                                className="capitalize text-xs"
                              />
                              
                              {user?.id === request.user_id && (
                                <div className="flex gap-1">
                                  <IconButton
                                    onClick={() => handleEditClick(request)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => handleDelete(request.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </IconButton>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Typography className="text-gray-900 dark:text-white mb-3 text-sm sm:text-base">
                            {request.description}
                          </Typography>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <ClockIcon className="h-4 w-4" />
                                {formatTime(request.created_at)}
                              </div>
                            </div>
                            
                            {/* Status Update Buttons (for request owner) */}
                            {user?.id === request.user_id && request.status !== 'answered' && request.status !== 'closed' && (
                              <div className="flex flex-wrap gap-2">
                                {request.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(request.id, 'in_progress')}
                                    className="text-xs px-2 py-1"
                                  >
                                    <span className="hidden sm:inline">Mark In Progress</span>
                                    <span className="sm:hidden">In Progress</span>
                                  </Button>
                                )}
                                {request.status === 'in_progress' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(request.id, 'answered')}
                                    className="text-xs px-2 py-1"
                                  >
                                    <span className="hidden sm:inline">Mark Answered</span>
                                    <span className="sm:hidden">Answered</span>
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(request.id, 'closed')}
                                  className="text-xs px-2 py-1"
                                >
                                  Close
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create Prayer Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <Typography variant="h5" className="text-gray-900 dark:text-white font-semibold text-lg sm:text-xl">
                  {isEditMode ? 'Edit Prayer Request' : 'Create New Prayer Request'}
                </Typography>
                <Button
                  color="gray"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 sm:p-2"
                >
                  ✕
                </Button>
              </div>
              <CreatePrayerRequest
                onRequestCreated={isEditMode ? handleRequestUpdated : handleRequestCreated}
                onClose={() => {
                  setShowCreateModal(false)
                  setIsEditMode(false)
                  setSelectedRequest(null)
                }}
                isOpen={showCreateModal}
                editingRequest={isEditMode ? selectedRequest : null}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
} 