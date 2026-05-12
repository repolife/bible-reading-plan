import { supabase } from '@/supabaseClient'
import { getFCMToken, isFCMSupported, getNotificationPermission, requestNotificationPermission } from '@/firebase'

// Notification types
export const NOTIFICATION_TYPES = {
  EVENT_CREATED: 'event_created',
  PRAYER_REQUEST_ADDED: 'prayer_request_added',
  PRAYER_REQUEST_UPDATED: 'prayer_request_updated'
}

// Send notification to all users (for events)
export const sendGlobalNotification = async (notificationData) => {
  try {
    const {
      title,
      message,
      url = null,
      data = {},
      notificationType
    } = notificationData

    if (!title || !message) {
      throw new Error('Missing required notification data')
    }

    // Get all users who have subscribed to notifications
    const { data: allUsers, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        notification_preferences,
        fcm_token
      `)
      .not('fcm_token', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('No users found with FCM tokens')
      return { success: true, sentTo: 0 }
    }

    // Filter users based on notification preferences
    const eligibleUsers = allUsers.filter(user => {
      const preferences = user.notification_preferences || {}
      
      switch (notificationType) {
        case NOTIFICATION_TYPES.EVENT_CREATED:
          return preferences.events !== false
        case NOTIFICATION_TYPES.PRAYER_REQUEST_ADDED:
        case NOTIFICATION_TYPES.PRAYER_REQUEST_UPDATED:
          return preferences.prayer_requests !== false
        default:
          return true
      }
    })

    if (eligibleUsers.length === 0) {
      console.log('No users eligible for this notification type')
      return { success: true, sentTo: 0 }
    }

    // Send notifications via Supabase Edge Function or your backend
    const tokens = eligibleUsers.map(user => user.fcm_token).filter(token => token)
    
    if (tokens.length === 0) {
      console.log('No valid FCM tokens found')
      return { success: true, sentTo: 0 }
    }

    // For now, we'll use a simple approach - in production, you'd call your backend
    console.log(`Would send notification to ${tokens.length} users:`, {
      title,
      message,
      tokens,
      data
    })

    // Log notification to database for tracking
    await logNotification({
      notification_type: notificationType,
      title,
      message,
      sent_to_count: tokens.length,
      fcm_tokens: tokens
    })

    return {
      success: true,
      sentTo: tokens.length,
      tokens: tokens
    }

  } catch (error) {
    console.error('Error sending global notification:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Send notification to family members (for prayer requests)
export const sendFamilyNotification = async (notificationData) => {
  try {
    const {
      familyId,
      title,
      message,
      url = null,
      data = {},
      notificationType
    } = notificationData

    if (!familyId || !title || !message) {
      throw new Error('Missing required notification data')
    }

    // Get all family members who have subscribed to notifications
    const { data: familyMembers, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        notification_preferences,
        fcm_token
      `)
      .eq('family_id', familyId)
      .not('fcm_token', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    if (!familyMembers || familyMembers.length === 0) {
      console.log('No family members found with FCM tokens')
      return { success: true, sentTo: 0 }
    }

    // Filter members based on notification preferences
    const eligibleMembers = familyMembers.filter(member => {
      const preferences = member.notification_preferences || {}
      
      switch (notificationType) {
        case NOTIFICATION_TYPES.EVENT_CREATED:
          return preferences.events !== false
        case NOTIFICATION_TYPES.PRAYER_REQUEST_ADDED:
        case NOTIFICATION_TYPES.PRAYER_REQUEST_UPDATED:
          return preferences.prayer_requests !== false
        default:
          return true
      }
    })

    if (eligibleMembers.length === 0) {
      console.log('No family members eligible for this notification type')
      return { success: true, sentTo: 0 }
    }

    const tokens = eligibleMembers.map(member => member.fcm_token).filter(token => token)
    
    if (tokens.length === 0) {
      console.log('No valid FCM tokens found')
      return { success: true, sentTo: 0 }
    }

    console.log(`Would send family notification to ${tokens.length} members:`, {
      title,
      message,
      tokens,
      data
    })

    // Log notification to database for tracking
    await logNotification({
      family_id: familyId,
      notification_type: notificationType,
      title,
      message,
      sent_to_count: tokens.length,
      fcm_tokens: tokens
    })

    return {
      success: true,
      sentTo: tokens.length,
      tokens: tokens
    }

  } catch (error) {
    console.error('Error sending family notification:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Send notification to specific user
export const sendUserNotification = async (notificationData) => {
  try {
    const {
      userId,
      title,
      message,
      url = null,
      data = {},
      notificationType
    } = notificationData

    if (!userId || !title || !message) {
      throw new Error('Missing required notification data')
    }

    // Get user's FCM token
    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        notification_preferences,
        fcm_token
      `)
      .eq('id', userId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!user || !user.fcm_token) {
      console.log('User not found or not subscribed to notifications')
      return { success: true, sentTo: 0 }
    }

    // Check notification preferences
    const preferences = user.notification_preferences || {}
    let shouldSend = true

    switch (notificationType) {
      case NOTIFICATION_TYPES.EVENT_CREATED:
        shouldSend = preferences.events !== false
        break
      case NOTIFICATION_TYPES.PRAYER_REQUEST_ADDED:
      case NOTIFICATION_TYPES.PRAYER_REQUEST_UPDATED:
        shouldSend = preferences.prayer_requests !== false
        break
      default:
        shouldSend = true
    }

    if (!shouldSend) {
      console.log('User has disabled this notification type')
      return { success: true, sentTo: 0 }
    }

    console.log(`Would send user notification:`, {
      title,
      message,
      token: user.fcm_token,
      data
    })

    // Log notification to database for tracking
    await logNotification({
      user_id: userId,
      notification_type: notificationType,
      title,
      message,
      sent_to_count: 1,
      fcm_tokens: [user.fcm_token]
    })

    return {
      success: true,
      sentTo: 1,
      token: user.fcm_token
    }

  } catch (error) {
    console.error('Error sending user notification:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Log notification to database for tracking
const logNotification = async (notificationLog) => {
  try {
    const { error } = await supabase
      .from('notification_logs')
      .insert([{
        ...notificationLog,
        created_at: new Date().toISOString()
      }])

    if (error) {
      console.error('Error logging notification:', error)
    }
  } catch (error) {
    console.error('Error logging notification:', error)
  }
}

// Event notification helpers
export const notifyEventCreated = async (eventData, creatorName) => {
  const { event_title, event_start, location } = eventData
  
  const eventDate = new Date(event_start)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return await sendGlobalNotification({
    title: 'New Event Created',
    message: `${creatorName} created "${event_title}" on ${formattedDate} at ${formattedTime}${location ? ` at ${location}` : ''}`,
    url: `/events/${eventData.id}`,
    data: {
      event_id: eventData.id,
      event_title: event_title,
      event_start: event_start
    },
    notificationType: NOTIFICATION_TYPES.EVENT_CREATED
  })
}

// Prayer request notification helpers
export const notifyPrayerRequestAdded = async (prayerData, creatorName) => {
  const { family_id, description, is_anonymous } = prayerData
  
  const displayName = is_anonymous ? 'A family member' : creatorName
  const truncatedDescription = description.length > 100 
    ? `${description.substring(0, 100)}...` 
    : description

  return await sendFamilyNotification({
    familyId: family_id,
    title: 'New Prayer Request Added',
    message: `${displayName} added a new prayer request: "${truncatedDescription}"`,
    url: `/prayer-requests`,
    data: {
      prayer_request_id: prayerData.id,
      is_anonymous: is_anonymous
    },
    notificationType: NOTIFICATION_TYPES.PRAYER_REQUEST_ADDED
  })
}

export const notifyPrayerRequestUpdated = async (prayerData, updaterName, oldStatus, newStatus) => {
  const { family_id, description, is_anonymous } = prayerData
  
  const displayName = is_anonymous ? 'A family member' : updaterName
  const statusLabels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    answered: 'Answered',
    closed: 'Closed'
  }

  return await sendFamilyNotification({
    familyId: family_id,
    title: 'Prayer Request Status Updated',
    message: `${displayName} updated a prayer request status from "${statusLabels[oldStatus]}" to "${statusLabels[newStatus]}"`,
    url: `/prayer-requests`,
    data: {
      prayer_request_id: prayerData.id,
      old_status: oldStatus,
      new_status: newStatus,
      is_anonymous: is_anonymous
    },
    notificationType: NOTIFICATION_TYPES.PRAYER_REQUEST_UPDATED
  })
}

// FCM subscription management
export const subscribeToFCM = async (userId) => {
  if (!isFCMSupported()) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone
    
    if (isIOS && !isStandalone) {
      throw new Error('On iPhone/iPad, please install the app to your home screen first, then try enabling notifications.')
    } else {
      throw new Error('Push notifications are not supported in this browser.')
    }
  }

  try {
    console.log('Starting FCM subscription process for user:', userId)
    
    // Request permission first
    const permission = await requestNotificationPermission()
    console.log('Permission result:', permission)
    
    if (permission !== 'granted') {
      throw new Error('Notification permissions are required. Please allow notifications and try again.')
    }

    // Get FCM token (this will throw detailed errors)
    const token = await getFCMToken()
    
    if (!token) {
      throw new Error('Unable to generate notification token. Please check your internet connection and try again.')
    }

    console.log('FCM token obtained, saving to database...')

    // Store token in user profile
    const { error } = await supabase
      .from('profiles')
      .update({ fcm_token: token })
      .eq('id', userId)

    if (error) {
      console.error('Database error storing FCM token:', error)
      throw new Error('Failed to save notification settings. Please try again.')
    }

    console.log('FCM subscription successful for user:', userId)
    return { success: true, token }
  } catch (error) {
    console.error('Error subscribing to FCM:', error)
    throw error
  }
}

export const unsubscribeFromFCM = async (userId) => {
  try {
    // Remove token from user profile
    const { error } = await supabase
      .from('profiles')
      .update({ fcm_token: null })
      .eq('id', userId)

    if (error) {
      throw error
    }

    console.log('FCM unsubscription successful for user:', userId)
    return { success: true }
  } catch (error) {
    console.error('Error unsubscribing from FCM:', error)
    throw error
  }
}

// Send test notification (local browser notification)
export const sendTestNotification = async (title, message, url = null) => {
  if (!isFCMSupported()) {
    throw new Error('FCM not supported')
  }

  const permission = getNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  // Create a local notification for testing
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: message,
      data: { url },
      tag: 'test-notification',
      icon: '/favicon.ico'
    })

    notification.onclick = () => {
      if (url) {
        window.open(url, '_blank')
      }
      notification.close()
    }

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)

    return true
  }

  return false
}

// Send test push notification through FCM
export async function sendTestPushNotification(userId, title = 'Test Push Notification', message = 'This is a test push notification from your Bible Reading Plan app!') {
  try {
    console.log('Sending test push notification to user:', userId)
    
    // First, check if user has an FCM token
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch user profile: ${fetchError.message}`)
    }

    if (!profile?.fcm_token) {
      throw new Error('User does not have an FCM token. Please enable notifications first.')
    }

    // Get user's family_id first
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', userId)
      .single()

    if (userError || !userProfile?.family_id) {
      throw new Error('User does not belong to a family group')
    }

    // Create a test calendar event to trigger the FCM webhook
    // This will use your existing send-fcm function
    const testEventData = {
      event_title: title,
      event_description: message,
      event_start: new Date().toISOString(),
      location: 'Test Location',
      created_by: userId,
      family_id: userProfile.family_id,
      is_test: true // Flag to indicate this is a test event
    }

    const { data: event, error: eventError } = await supabase
      .from('family_calendar')
      .insert([testEventData])
      .select()
      .single()

    if (eventError) {
      throw new Error(`Failed to create test event: ${eventError.message}`)
    }

    console.log('Test push notification sent successfully via calendar event:', event.id)
    
    // Clean up the test event after a short delay
    setTimeout(async () => {
      try {
        await supabase
          .from('family_calendar')
          .delete()
          .eq('id', event.id)
        console.log('Test event cleaned up:', event.id)
      } catch (cleanupError) {
        console.warn('Failed to clean up test event:', cleanupError)
      }
    }, 5000)

    return {
      success: true,
      message: 'Test push notification sent successfully',
      eventId: event.id
    }

  } catch (error) {
    console.error('Error sending test push notification:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
