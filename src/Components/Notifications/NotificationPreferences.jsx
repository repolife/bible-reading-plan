import React, { useState, useEffect } from 'react'
import { 
  Card,
  CardBody,
  Typography,
  Switch,
  Button,
  Alert
} from '@material-tailwind/react'
import { supabase } from '@/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useFCMSubscription } from '@/hooks/useFCMSubscription'
import { toast } from 'react-toastify'

export const NotificationPreferences = () => {
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const {
    subscribed,
    permission,
    token,
    subscribe,
    unsubscribe,
    sendTest,
    loading,
    error,
    clearError
  } = useFCMSubscription(user?.id, user?.email)

  const [preferences, setPreferences] = useState({
    events: true,
    prayer_requests: true,
    general: true
  })
  const [saving, setSaving] = useState(false)
  const [testSending, setTestSending] = useState(false)

  // Load current preferences
  useEffect(() => {
    if (profile?.notification_preferences) {
      setPreferences({
        events: profile.notification_preferences.events !== false,
        prayer_requests: profile.notification_preferences.prayer_requests !== false,
        general: profile.notification_preferences.general !== false
      })
    }
  }, [profile?.notification_preferences])

  const handlePreferenceChange = async (key, value) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    }
    setPreferences(newPreferences)

    // Save to database
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: newPreferences
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      toast.success('Notification preferences updated')
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      toast.error('Failed to update notification preferences')
      // Revert the change
      setPreferences({
        ...preferences,
        [key]: !value
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubscribe = async () => {
    const result = await subscribe()
    if (result.success) {
      toast.success('Notifications enabled successfully!')
    } else {
      toast.error(result.reason || 'Failed to enable notifications')
    }
  }

  const handleUnsubscribe = async () => {
    const result = await unsubscribe()
    if (result.success) {
      toast.success('Notifications disabled successfully!')
    } else {
      toast.error('Failed to disable notifications')
    }
  }

  const handleSendTest = async () => {
    setTestSending(true)
    try {
      const result = await sendTest(
        'Test Notification',
        'This is a test notification from your Bible Reading Plan app!',
        '/notifications'
      )
      
      if (result.success) {
        toast.success('Test notification sent!')
      } else {
        toast.error(result.reason || 'Failed to send test notification')
      }
    } catch (error) {
      toast.error('Error sending test notification')
    } finally {
      setTestSending(false)
    }
  }

  const getPermissionStatusText = () => {
    switch (permission) {
      case 'granted':
        return 'Notifications are enabled'
      case 'denied':
        return 'Notifications are blocked by browser'
      case 'default':
        return 'Notifications are not set'
      default:
        return 'Checking notification status...'
    }
  }

  const getPermissionStatusColor = () => {
    switch (permission) {
      case 'granted':
        return 'green'
      case 'denied':
        return 'red'
      case 'default':
        return 'yellow'
      default:
        return 'blue'
    }
  }

  if (!user) {
    return (
      <Card className="shadow-lg">
        <CardBody className="p-6">
          <Typography variant="h5" className="text-gray-900 dark:text-white font-bold mb-4">
            Notification Preferences
          </Typography>
          <Alert color="blue">
            Please log in to manage your notification preferences.
          </Alert>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardBody className="p-6">
        <Typography variant="h5" className="text-gray-900 dark:text-white font-bold mb-6">
          Firebase Cloud Messaging Preferences
        </Typography>

        {/* Subscription Status */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-2">
            Subscription Status
          </Typography>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Browser Permission:
              </span>
              <Alert color={getPermissionStatusColor()} className="py-1 px-3 text-sm">
                {getPermissionStatusText()}
              </Alert>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                FCM Subscription:
              </span>
              <span className={`text-sm font-medium ${subscribed ? 'text-green-600' : 'text-red-600'}`}>
                {subscribed ? 'Active' : 'Inactive'}
              </span>
            </div>

            {token && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  FCM Token:
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {token.substring(0, 8)}...
                </span>
              </div>
            )}
          </div>

          {/* Subscription Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {!subscribed && permission !== 'denied' && (
              <Button
               
                onClick={handleSubscribe}
                disabled={loading}
                className="text-xs"
              >
                {loading ? 'Enabling...' : 'Enable Notifications'}
              </Button>
            )}

            {subscribed && (
              <Button
             
              
                onClick={handleUnsubscribe}
                disabled={loading}
                className="text-xs"
              >
                {loading ? 'Disabling...' : 'Disable Notifications'}
              </Button>
            )}

            {subscribed && (
              <Button
                onClick={handleSendTest}
                disabled={testSending}
                className="text-xs"
              >
                {testSending ? 'Sending...' : 'Send Test'}
              </Button>
            )}
          </div>

          {error && (
            <Alert color="red" className="mt-3">
              {error}
              <Button                
                onClick={clearError}
                className="ml-2"
              >
                Dismiss
              </Button>
            </Alert>
          )}
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-4">
            Notification Types
          </Typography>

          <div className="space-y-4">
            {/* Events */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border">
              <div>
                <Typography variant="h6" className="text-gray-900 dark:text-white">
                  Events
                </Typography>
                <Typography variant="small" className="text-gray-600 dark:text-gray-400">
                  Get notified when any user creates new events
                </Typography>
              </div>
              <Switch
                checked={preferences.events}
                onChange={(e) => handlePreferenceChange('events', e.target.checked)}
                disabled={!subscribed || saving}
              />
            </div>

            {/* Prayer Requests */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border">
              <div>
                <Typography variant="h6" className="text-gray-900 dark:text-white">
                  Prayer Requests
                </Typography>
                <Typography variant="small" className="text-gray-600 dark:text-gray-400">
                  Get notified when family members add or update prayer requests
                </Typography>
              </div>
              <Switch
                checked={preferences.prayer_requests}
                onChange={(e) => handlePreferenceChange('prayer_requests', e.target.checked)}
                disabled={!subscribed || saving}
              />
            </div>

            {/* General */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border">
              <div>
                <Typography variant="h6" className="text-gray-900 dark:text-white">
                  General Notifications
                </Typography>
                <Typography variant="small" className="text-gray-600 dark:text-gray-400">
                  Receive general app updates and announcements
                </Typography>
              </div>
              <Switch
                checked={preferences.general}
                onChange={(e) => handlePreferenceChange('general', e.target.checked)}
                disabled={!subscribed || saving}
              />
            </div>
          </div>

          {saving && (
            <Alert color="blue" className="mt-4">
              Saving preferences...
            </Alert>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Typography variant="small" className="text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> You can change these preferences at any time. 
            If you disable notifications in your browser settings, you'll need to 
            re-enable them there first before you can receive notifications again.
          </Typography>
        </div>
      </CardBody>
    </Card>
  )
}
