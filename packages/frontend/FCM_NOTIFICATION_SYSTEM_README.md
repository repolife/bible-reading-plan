# Firebase Cloud Messaging (FCM) Push Notifications for Bible Reading Plan

This implementation provides comprehensive Firebase Cloud Messaging push notifications for the Bible Reading Plan app, specifically for event creation and prayer request management.

## Features

### 🎯 Event Notifications
- **Event Creation**: All users receive notifications when new events are created
- **Event Details**: Includes event title, date, time, and location
- **Global Targeting**: Sends to all users who have enabled event notifications

### 🙏 Prayer Request Notifications
- **New Prayer Requests**: Family members are notified when prayer requests are added
- **Status Updates**: Notifications when prayer request status changes (pending → in progress → answered → closed)
- **Anonymous Support**: Respects anonymous prayer request settings
- **Content Preview**: Shows truncated description for privacy

### ⚙️ User Management
- **Subscription Control**: Users can enable/disable notifications
- **Granular Preferences**: Control specific notification types (events, prayer requests, general)
- **Cross-Device Support**: Notifications work across all user devices
- **Permission Handling**: Smart browser permission management

## Setup Instructions

### 1. Firebase Project Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project for your Bible Reading Plan
   - Enable Cloud Messaging

2. **Configure Web App**:
   - Add a web app to your Firebase project
   - Copy the Firebase configuration object
   - Generate a VAPID key in Project Settings > Cloud Messaging

3. **Get Configuration Values**:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID
   - Measurement ID (optional)
   - VAPID Key

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### 3. Database Schema Updates

Ensure your `profiles` table has these columns:

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"events": true, "prayer_requests": true, "general": true}';

-- Create notification logs table (optional)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  family_id UUID REFERENCES family_groups(id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_to_count INTEGER DEFAULT 0,
  fcm_tokens JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Service Worker Setup

The service worker file `public/firebase-messaging-sw.js` is already created and configured. Make sure to:

1. Update the Firebase configuration in the service worker
2. Deploy the service worker to your domain
3. Ensure HTTPS is enabled (required for FCM)

## Usage

### 1. User Subscription Management

Users can manage their notification preferences through the `NotificationPreferences` component:

```jsx
import { NotificationPreferences } from '@/components/Notifications/NotificationPreferences'

// In your component
<NotificationPreferences />
```

### 2. Automatic Notifications

Notifications are automatically sent when:

#### Events are Created
```javascript
// In useFamilyCalendarStore.js - createEvent function
const createdEvent = await createEvent(eventData)
// Notification is automatically sent to all users
```

#### Prayer Requests are Added
```javascript
// In usePrayerRequestStore.js - createPrayerRequest function
const newRequest = await createPrayerRequest(requestData)
// Notification is automatically sent to family members
```

#### Prayer Request Status Changes
```javascript
// In usePrayerRequestStore.js - updatePrayerRequestStatus function
const updatedRequest = await updatePrayerRequestStatus(requestId, newStatus)
// Notification is automatically sent if status changed
```

### 3. Manual Notification Sending

You can manually send notifications using the FCM notification service:

```javascript
import { 
  sendGlobalNotification, 
  sendFamilyNotification,
  sendUserNotification,
  notifyEventCreated,
  notifyPrayerRequestAdded 
} from '@/utils/fcmNotificationService'

// Send to all users
await sendGlobalNotification({
  title: 'Custom Title',
  message: 'Custom message',
  url: '/custom-url',
  notificationType: 'custom_type'
})

// Send to family members
await sendFamilyNotification({
  familyId: 'family-uuid',
  title: 'Family Notification',
  message: 'This is for family members only',
  url: '/family-url',
  notificationType: 'family_type'
})

// Send to specific user
await sendUserNotification({
  userId: 'user-uuid',
  title: 'Personal Notification',
  message: 'This is just for you',
  url: '/personal-url',
  notificationType: 'personal'
})
```

## Notification Types

### Event Notifications
- **Type**: `event_created`
- **Trigger**: New event creation
- **Content**: Event title, date, time, location, creator name
- **Target**: All users with event notifications enabled

### Prayer Request Notifications
- **Type**: `prayer_request_added`
- **Trigger**: New prayer request creation
- **Content**: Creator name (or "A family member" if anonymous), truncated description
- **Target**: All family members with prayer request notifications enabled

- **Type**: `prayer_request_updated`
- **Trigger**: Prayer request status change
- **Content**: Updater name, old status, new status
- **Target**: All family members with prayer request notifications enabled

## User Preferences

Users can control their notification preferences:

### Notification Types
- **Events**: Receive notifications for new events from any user
- **Prayer Requests**: Receive notifications for prayer request updates from family members
- **General**: Receive general app notifications

### Subscription Status
- **Browser Permission**: Shows current browser notification permission
- **FCM Subscription**: Shows FCM subscription status
- **FCM Token**: Shows FCM token for debugging

## Backend Integration

For production use, you'll need to implement a backend service to send FCM notifications. Here's an example using Node.js:

```javascript
const admin = require('firebase-admin')

// Initialize Firebase Admin SDK
const serviceAccount = require('./path/to/serviceAccountKey.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

// Send notification to multiple tokens
async function sendNotificationToTokens(tokens, title, body, data = {}) {
  const message = {
    notification: {
      title,
      body
    },
    data,
    tokens
  }

  try {
    const response = await admin.messaging().sendMulticast(message)
    console.log('Successfully sent message:', response)
    return response
  } catch (error) {
    console.log('Error sending message:', error)
    throw error
  }
}
```

## Error Handling

The system includes comprehensive error handling:

- **Permission Denied**: Graceful handling when users deny notifications
- **Network Errors**: Retry logic for failed API calls
- **Invalid Data**: Validation for required notification data
- **User Not Found**: Handling for missing user profiles
- **Token Management**: Automatic token refresh and cleanup

## Security Considerations

- **VAPID Keys**: Used for secure web push notifications
- **User Validation**: All notifications require valid user authentication
- **Family Scoping**: Prayer request notifications are scoped to family members only
- **Permission Respect**: System respects user notification preferences
- **HTTPS Required**: FCM requires HTTPS for production use

## Troubleshooting

### Common Issues

1. **Notifications Not Sending**
   - Check Firebase console for configuration
   - Verify environment variables are set
   - Check browser console for errors
   - Ensure user has subscribed to notifications
   - Verify HTTPS is enabled

2. **Permission Issues**
   - Clear browser site data
   - Check browser notification settings
   - Try in incognito mode
   - Verify Firebase initialization

3. **Missing FCM Tokens**
   - Ensure Firebase is properly initialized
   - Check user subscription status
   - Verify service worker is registered
   - Check VAPID key configuration

4. **Service Worker Issues**
   - Clear browser cache
   - Check if service worker is registered in DevTools > Application > Service Workers
   - Verify `public/firebase-messaging-sw.js` exists and is accessible
   - Check Firebase configuration in service worker

### Debug Mode

Enable debug logging by checking browser console for detailed FCM logs.

## Best Practices

1. **Request Permissions Appropriately**: Only prompt after user action
2. **Respect User Preferences**: Always check notification settings
3. **Provide Value**: Make notifications meaningful and actionable
4. **Test Thoroughly**: Test across different browsers and devices
5. **Monitor Performance**: Track notification delivery rates
6. **Handle Token Refresh**: Implement token refresh logic
7. **Clean Up Tokens**: Remove invalid tokens from database

## API Reference

### FCM Service Functions

- `sendGlobalNotification(notificationData)`: Send to all users (for events)
- `sendFamilyNotification(notificationData)`: Send to family members (for prayer requests)
- `sendUserNotification(notificationData)`: Send to specific user
- `notifyEventCreated(eventData, creatorName)`: Event creation notification
- `notifyPrayerRequestAdded(prayerData, creatorName)`: Prayer request notification
- `notifyPrayerRequestUpdated(prayerData, updaterName, oldStatus, newStatus)`: Status update notification

### FCM Hook

- `useFCMSubscription(userId, userEmail)`: Manage FCM subscription
- `subscribe()`: Enable notifications
- `unsubscribe()`: Disable notifications
- `sendTest(title, message, url)`: Send test notification

### Firebase Functions

- `getFCMToken()`: Get FCM registration token
- `isFCMSupported()`: Check if FCM is supported
- `getNotificationPermission()`: Get current permission status
- `requestNotificationPermission()`: Request notification permission
- `onForegroundMessage(callback)`: Listen for foreground messages

## Migration from OneSignal

If migrating from OneSignal:

1. **Update Environment Variables**: Replace OneSignal variables with Firebase variables
2. **Update Database Schema**: Change `onesignal_player_id` to `fcm_token`
3. **Update Components**: Replace OneSignal hooks with FCM hooks
4. **Update Service Workers**: Replace OneSignal service worker with FCM service worker
5. **Test Thoroughly**: Ensure all notification functionality works correctly

## Support

For issues with the FCM notification system:

1. Check the browser console for error messages
2. Verify Firebase console configuration
3. Test with the built-in test notification feature
4. Check user notification preferences
5. Verify environment variables are correctly set
6. Ensure HTTPS is enabled for production
7. Check service worker registration and functionality
