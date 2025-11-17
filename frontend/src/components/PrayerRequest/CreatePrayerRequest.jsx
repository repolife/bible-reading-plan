import React, { useState } from 'react'
import { 
  Button,
  Card,
  CardBody,
  Typography,
  Textarea,
  Checkbox
} from '@material-tailwind/react'
import { supabase } from '@/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'react-toastify'

export const CreatePrayerRequest = ({ onRequestCreated, onClose, isOpen = false, editingRequest = null }) => {
  const { user } = useAuthStore()
  const [formData, setFormData] = useState({
    description: '',
    is_anonymous: false,
    status: 'pending' // default status
  })
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Set edit mode and populate form when editingRequest changes
  React.useEffect(() => {
    if (editingRequest) {
      setIsEditMode(true)
      setFormData({
        description: editingRequest.description || '',
        is_anonymous: editingRequest.is_anonymous || false,
        status: editingRequest.status || 'pending'
      })
    } else {
      setIsEditMode(false)
      setFormData({
        description: '',
        is_anonymous: false,
        status: 'pending'
      })
    }
  }, [editingRequest])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.description.trim()) {
      toast.error('Please enter a prayer request description')
      return
    }

    if (!user?.id) {
      toast.error('You must be logged in to create a prayer request')
      return
    }

    if (isEditMode && (!editingRequest || !editingRequest.id)) {
      toast.error('Invalid prayer request to edit')
      return
    }

    setLoading(true)

    try {
      let data, error
      
      if (isEditMode && editingRequest) {
        // Update existing prayer request
        console.log('Updating prayer request:', editingRequest.id)
        const { data: updateData, error: updateError } = await supabase
          .from('prayer_request')
          .update({
            description: formData.description.trim(),
            is_anonymous: formData.is_anonymous,
            status: formData.status
          })
          .eq('id', editingRequest.id)
          .eq('user_id', user.id) // Ensure user owns the request
          .select()
        
        if (updateError) {
          throw updateError
        }
        
        if (!updateData || updateData.length === 0) {
          throw new Error('Prayer request not found or you do not have permission to edit it')
        }
        
        data = updateData[0] // Take first result since we're updating by unique ID
        error = null
      } else {
        // Create new prayer request
        console.log('Creating new prayer request for user:', user.id)
        const { data: insertData, error: insertError } = await supabase
          .from('prayer_request')
          .insert([{
            user_id: user.id,
            description: formData.description.trim(),
            is_anonymous: formData.is_anonymous,
            status: formData.status
          }])
          .select()
        
        if (insertError) {
          throw insertError
        }
        
        if (!insertData || insertData.length === 0) {
          throw new Error('Failed to create prayer request')
        }
        
        data = insertData[0]
        error = null
      }

      if (error) {
        throw error
      }

      toast.success(isEditMode ? 'Prayer request updated successfully' : 'Prayer request created successfully')
      
      // Reset form
      setFormData({
        description: '',
        is_anonymous: false,
        status: 'pending'
      })

      // Notify parent component
      if (onRequestCreated) {
        onRequestCreated(data)
      }

      // Close modal if controlled externally
      if (onClose) {
        onClose()
      }

    } catch (error) {
      console.error('Error creating prayer request:', error)
      toast.error(error.message || 'Failed to create prayer request')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
      description: '',
      is_anonymous: false,
      status: 'pending'
    })

    if (onClose) {
      onClose()
    }
  }

  // If not open and no external control, don't render
  if (!isOpen && onClose) {
    return null
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardBody className="p-6">
          <Typography variant="h4" className="text-gray-900 dark:text-white font-bold mb-6 text-center">
            {isEditMode ? 'Edit Prayer Request' : 'Create Prayer Request'}
          </Typography>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div>
              <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-2">
                Prayer Request Description *
              </Typography>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Please describe your prayer request..."
                rows={4}
                className="w-full px-4 py-3 text-black dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
              <Typography variant="small" className="text-gray-500 dark:text-gray-400 mt-1">
                Share as much detail as you're comfortable with
              </Typography>
            </div>

            {/* Anonymous Option */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="anonymous"
                checked={formData.is_anonymous}
                onChange={(e) => handleInputChange('is_anonymous', e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="anonymous" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                Make this prayer request anonymous
              </label>
            </div>

            {/* Status Selection */}
            <div>
              <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-2">
                Status
              </Typography>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-4 py-3 text-black dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="answered">Answered</option>
                <option value="closed">Closed</option>
              </select>
              <Typography variant="small" className="text-gray-500 dark:text-gray-400 mt-1">
                You can update this status later
              </Typography>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-6 py-2"
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={loading || !formData.description.trim()}
                className="px-6 py-2"
              >
                {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Prayer Request' : 'Create Prayer Request')}
              </Button>
            </div>
          </form>

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Typography variant="small" className="text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Your prayer request will be shared with the community for prayer support. 
              {formData.is_anonymous ? ' It will be posted anonymously.' : ' Your name will be visible to other members.'}
            </Typography>
          </div>
        </CardBody>
      </Card>
    </div>
  )
} 