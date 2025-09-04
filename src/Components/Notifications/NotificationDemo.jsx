import React from 'react'
import { Card, CardBody, Typography, Button, Alert } from '@material-tailwind/react'
import { NotificationPreferences } from '@/Components/Notifications/NotificationPreferences'
import { useAuthStore } from '@/store/useAuthStore'

export const NotificationDemo = () => {
  const { user } = useAuthStore()

  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card className="shadow-lg">
          <CardBody className="p-6">
            <Typography variant="h5" className="text-gray-900 dark:text-white font-bold mb-4">
              Notification Demo
            </Typography>
            <Alert color="blue">
              Please log in to access the notification demo.
            </Alert>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Typography variant="h4" className="text-gray-900 dark:text-white font-bold mb-2">
          OneSignal Notification System Demo
        </Typography>
        <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
          This page demonstrates the OneSignal push notification system for the Bible Reading Plan app.
          You can manage your notification preferences and test the system here.
        </Typography>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Preferences */}
        <div>
          <Typography variant="h5" className="text-gray-900 dark:text-white font-bold mb-4">
            Notification Preferences
          </Typography>
          <NotificationPreferences />
        </div>

        {/* Demo Information */}
        <div>
          <Card className="shadow-lg">
            <CardBody className="p-6">
              <Typography variant="h5" className="text-gray-900 dark:text-white font-bold mb-4">
                How It Works
              </Typography>
              
              <div className="space-y-4">
                <div>
                  <Typography variant="h6" className="text-gray-800 dark:text-gray-200 mb-2">
                    🎯 Event Notifications
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    When any user creates a new event, all users who have enabled event 
                    notifications will receive a push notification with the event details.
                  </Typography>
                </div>

                <div>
                  <Typography variant="h6" className="text-gray-800 dark:text-gray-200 mb-2">
                    🙏 Prayer Request Notifications
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    When prayer requests are added or their status is updated, family 
                    members receive notifications. Anonymous requests are handled 
                    with privacy in mind.
                  </Typography>
                </div>

                <div>
                  <Typography variant="h6" className="text-gray-800 dark:text-gray-200 mb-2">
                    ⚙️ Smart Targeting
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Event notifications are sent to all users who have subscribed to 
                    notifications. Prayer request notifications are only sent to family members.
                  </Typography>
                </div>

                <div>
                  <Typography variant="h6" className="text-gray-800 dark:text-gray-200 mb-2">
                    🔒 Privacy & Security
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Event notifications are sent to all users, while prayer request 
                    notifications are scoped to family members only. All notifications 
                    respect user preferences.
                  </Typography>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Typography variant="small" className="text-green-800 dark:text-green-200">
                  <strong>Tip:</strong> Use the "Send Test" button in the notification preferences 
                  to test the system. Make sure you have enabled notifications first!
                </Typography>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card className="shadow-lg">
          <CardBody className="p-6">
            <Typography variant="h5" className="text-gray-900 dark:text-white font-bold mb-4">
              Quick Actions
            </Typography>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                color="blue"
                variant="outlined"
                onClick={() => window.open('/calendar', '_blank')}
                className="h-12"
              >
                Create Test Event
              </Button>
              
              <Button
                color="green"
                variant="outlined"
                onClick={() => window.open('/prayer-requests', '_blank')}
                className="h-12"
              >
                Add Prayer Request
              </Button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Typography variant="small" className="text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> These buttons will take you to the respective pages where 
                you can create events or prayer requests to test the notification system.
              </Typography>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
} 