import React, { useState, useEffect } from 'react'
import {
  Card,
  CardBody,
  Typography,
  Button,
  Switch,
  Alert
} from '@material-tailwind/react'
import { BellIcon, BellSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useFCMSubscription } from '@/hooks/useFCMSubscription'
import { useAuthStore } from '@/store/useAuthStore'
import { useProfileStore } from '@/store/useProfileStore'
import { toast } from 'react-toastify'
import { FCMDebug } from './FCMDebug'

export const NotificationPreferences = () => {
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  
  const {
    available,
    subscribed,
    permission,
    token,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTest,
    canSubscribe,
    canUnsubscribe,
    canSendTest,
    isPermissionGranted,
    isPermissionDenied,
    isPermissionDefault,
    refresh,
    clearError
  } = useFCMSubscription(user?.id, user?.email)

  const [preferences, setPreferences] = useState({
    events: true,
    prayer_requests: true,
    general: true
  })

  const [testNotificationLoading, setTestNotificationLoading] = useState(false)

  // Load notification preferences from profile or localStorage
  useEffect(() => {
    if (profile?.notification_preferences) {
      setPreferences(profile.notification_preferences)
    } else {
      // Fallback to localStorage
      const saved = localStorage.getItem(`notification_preferences_${user?.id}`)
      if (saved) {
        try {
          setPreferences(JSON.parse(saved))
        } catch (error) {
          console.error('Error parsing saved preferences:', error)
        }
      }
    }
  }, [profile, user?.id])

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`notification_preferences_${user.id}`, JSON.stringify(preferences))
    }
  }, [preferences, user?.id])

  const handleSubscribe = async () => {
    const result = await subscribe()
    if (result.success) {
      toast.success('Notifications enabled successfully!')
      refresh()
    } else {
      toast.error(result.reason || 'Failed to enable notifications')
    }
  }

  const handleUnsubscribe = async () => {
    const result = await unsubscribe()
    if (result.success) {
      toast.success('Notifications disabled successfully!')
      refresh()
    } else {
      toast.error(result.reason || 'Failed to disable notifications')
    }
  }

  const handleSendTest = async () => {
    setTestNotificationLoading(true)
    try {
      const result = await sendTest(
        'Test Notification',
        'This is a test notification from your Bible Reading Plan app!'
      )
      
      if (result.success) {
        toast.success('Test notification sent!')
      } else {
        toast.error(result.reason || 'Failed to send test notification')
      }
    } catch (error) {
      toast.error('Failed to send test notification')
    } finally {
      setTestNotificationLoading(false)
    }
  }

  const handlePreferenceChange = (type, enabled) => {
    setPreferences(prev => ({
      ...prev,
      [type]: enabled
    }))
  }

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardBody className="text-center p-8">
          <Typography variant="h5" className="text-gray-600 mb-4">
            Please log in to manage notification preferences
          </Typography>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Main Notification Settings */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <BellIcon className="h-6 w-6 text-blue-600" />
            <Typography variant="h4" className="text-gray-900 dark:text-white">
              Notification Settings
            </Typography>
          </div>

          {/* Error Display */}
          {error && (
            <Alert               
              className="mb-4"
              dismissible
              onClose={clearError}
            >
              <ExclamationTriangleIcon className="h-5 w-5" />
              {error}
            </Alert>
          )}

          {/* FCM Support Check */}
          {!available && (
            <Alert color="amber" className="mb-4">
              <ExclamationTriangleIcon className="h-5 w-5" />
              {(() => {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
                
                if (isIOS && !isStandalone) {
                  return "On iPhone/iPad, notifications require installing this app to your home screen. Tap the share button and select 'Add to Home Screen'."
                } else if (isIOS && isStandalone) {
                  return "Notifications should be supported. Please check your iOS version (requires iOS 16.4+) and browser settings."
                } else {
                  return "Push notifications are not supported in this browser or environment."
                }
              })()}
            </Alert>
          )}

          {/* Permission Status */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-3">
              Notification Status
            </Typography>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Browser Support:</span>
                <span className={`font-medium ${available ? 'text-green-600' : 'text-red-600'}`}>
                  {available ? 'Supported' : 'Not Supported'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Permission:</span>
                <span className={`font-medium ${
                  isPermissionGranted ? 'text-green-600' : 
                  isPermissionDenied ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {isPermissionGranted ? 'Granted' : 
                   isPermissionDenied ? 'Denied' : 'Default'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Subscription:</span>
            <span className={`font-medium ${subscribed ? 'text-green-600' : 'text-gray-600'}`}>
                  {subscribed ? 'Active' : 'Not Active'}
                </span>
              </div>
            </div>
          </div>

          {/* iOS Installation Prompt */}
          {(() => {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
            
            if (isIOS && !isStandalone) {
              return (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 text-2xl">📱</div>
                    <div>
                      <Typography variant="h6" className="text-blue-700 dark:text-blue-300 mb-2">
                        Install App for Notifications
                      </Typography>
                      <Typography variant="small" className="text-blue-600 dark:text-blue-400 mb-3">
                        To receive push notifications on iPhone/iPad, you need to install this app to your home screen:
                      </Typography>
                      <ol className="text-sm text-blue-600 dark:text-blue-400 space-y-1 ml-4">
                        <li>1. Tap the <strong>Share</strong> button (square with arrow) in Safari</li>
                        <li>2. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                        <li>3. Tap <strong>"Add"</strong> to install the app</li>
                        <li>4. Open the app from your home screen</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* Main Subscription Controls */}
          <div className="space-y-4">
            {!subscribed ? (
              <div className="text-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <BellSlashIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-2">
                  Push Notifications Disabled
                </Typography>
                <Typography variant="small" className="text-gray-500 dark:text-gray-400 mb-4">
                  Enable notifications to stay updated on events and prayer requests
                </Typography>
                
                {canSubscribe && (
                  <Button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Enabling...' : 'Enable Notifications'}
                  </Button>
                )}

                {isPermissionDenied && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <Typography variant="small" className="text-red-700 dark:text-red-300">
                      Notifications are blocked. Please enable them in your browser settings.
                    </Typography>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <BellIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <Typography variant="h6" className="text-green-700 dark:text-green-300 mb-2">
                  Notifications Enabled
                </Typography>
                <Typography variant="small" className="text-green-600 dark:text-green-400 mb-4">
                  You'll receive notifications for events and prayer requests
                </Typography>
                
                <div className="flex justify-center gap-3">
                  {canSendTest && (
                    <Button
                      onClick={handleSendTest}
                      disabled={testNotificationLoading}
                     
                    >
                      {testNotificationLoading ? 'Sending...' : 'Send Test'}
                    </Button>
                  )}
                  
                  {canUnsubscribe && (
                    <Button
                      onClick={handleUnsubscribe}
                      disabled={loading}
                     
                    >
                      {loading ? 'Disabling...' : 'Disable Notifications'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Notification Type Preferences */}
      {subscribed && (
        <Card>
          <CardBody className="p-6">
            <Typography variant="h5" className="text-gray-700 dark:text-gray-300 mb-4">
              Notification Types
            </Typography>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="h6" className="text-gray-900 dark:text-white">
                    Event Notifications
                  </Typography>
                  <Typography variant="small" className="text-gray-500 dark:text-gray-400">
                    Get notified about new events and RSVP reminders
                  </Typography>
                </div>
                <Switch
                  checked={preferences.events}
                  onChange={(e) => handlePreferenceChange('events', e.target.checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="h6" className="text-gray-900 dark:text-white">
                    Prayer Request Notifications
                  </Typography>
                  <Typography variant="small" className="text-gray-500 dark:text-gray-400">
                    Get notified about new prayer requests from your family
                  </Typography>
                </div>
                <Switch
                  checked={preferences.prayer_requests}
                  onChange={(e) => handlePreferenceChange('prayer_requests', e.target.checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="h6" className="text-gray-900 dark:text-white">
                    General Notifications
                  </Typography>
                  <Typography variant="small" className="text-gray-500 dark:text-gray-400">
                    Get notified about app updates and general announcements
                  </Typography>
                </div>
                <Switch
                  checked={preferences.general}
                  onChange={(e) => handlePreferenceChange('general', e.target.checked)}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === 'development' && token && (
        <Card>
          <CardBody className="p-6">
            <Typography variant="h6" className="text-gray-700 dark:text-gray-300 mb-4">
              Debug Information
            </Typography>
            
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <Typography variant="small" className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                FCM Token: {token}
              </Typography>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Firebase Cloud Messaging Preferences */}
      <Card>
        <CardBody className="p-6">
          <Typography variant="h5" className="text-gray-700 dark:text-gray-300 mb-4">
            Firebase Cloud Messaging Preferences
          </Typography>
          
          <Typography variant="small" className="text-gray-500 dark:text-gray-400">
            This app uses Firebase Cloud Messaging to deliver push notifications. 
            Your notification preferences are stored locally and used to filter which 
            notifications you receive.
          </Typography>
        </CardBody>
      </Card>

      {/* Debug Component (Development Only) */}
      <FCMDebug />
    </div>
  )
} 