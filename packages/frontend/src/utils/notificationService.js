import { supabase } from '@/supabaseClient'

// OneSignal REST API configuration
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONE_SIGNAL_APP_ID
const ONESIGNAL_REST_API_KEY = import.meta.env.VITE_ONE_SIGNAL_REST_API_KEY

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
        onesignal_player_id
      `)
      .not('onesignal_player_id', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('No users found with OneSignal subscriptions')
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

    // Prepare OneSignal notification payload
    const playerIds = eligibleUsers
      .map(user => user.onesignal_player_id)
      .filter(id => id) // Remove any null/undefined values

    if (playerIds.length === 0) {
      console.log('No valid OneSignal player IDs found')
      return { success: true, sentTo: 0 }
    }

    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: {
        en: title
      },
      contents: {
        en: message
      },
      data: {
        ...data,
        type: notificationType,
        url: url
      },
      url: url,
      chrome_web_icon: '/favicon.ico',
      chrome_web_image: '/notification-icon.png'
    }

    // Send notification via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationPayload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OneSignal API error: ${errorData.errors?.join(', ') || response.statusText}`)
    }

    const result = await response.json()
    
    console.log(`Global notification sent successfully to ${playerIds.length} users`)
    
    // Log notification to database for tracking
    await logNotification({
      notification_type: notificationType,
      title,
      message,
      sent_to_count: playerIds.length,
      one_signal_response: result
    })

    return {
      success: true,
      sentTo: playerIds.length,
      oneSignalResponse: result
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
        onesignal_player_id
      `)
      .eq('family_id', familyId)
      .not('onesignal_player_id', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    if (!familyMembers || familyMembers.length === 0) {
      console.log('No family members found with OneSignal subscriptions')
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

    // Prepare OneSignal notification payload
    const playerIds = eligibleMembers
      .map(member => member.onesignal_player_id)
      .filter(id => id) // Remove any null/undefined values

    if (playerIds.length === 0) {
      console.log('No valid OneSignal player IDs found')
      return { success: true, sentTo: 0 }
    }

    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: {
        en: title
      },
      contents: {
        en: message
      },
      data: {
        ...data,
        type: notificationType,
        url: url
      },
      url: url,
      chrome_web_icon: '/favicon.ico',
      chrome_web_image: '/notification-icon.png'
    }

    // Send notification via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationPayload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OneSignal API error: ${errorData.errors?.join(', ') || response.statusText}`)
    }

    const result = await response.json()
    
    console.log(`Notification sent successfully to ${playerIds.length} family members`)
    
    // Log notification to database for tracking
    await logNotification({
      family_id: familyId,
      notification_type: notificationType,
      title,
      message,
      sent_to_count: playerIds.length,
      one_signal_response: result
    })

    return {
      success: true,
      sentTo: playerIds.length,
      oneSignalResponse: result
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

    // Get user's OneSignal player ID
    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        notification_preferences,
        onesignal_player_id
      `)
      .eq('id', userId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!user || !user.onesignal_player_id) {
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

    // Prepare OneSignal notification payload
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [user.onesignal_player_id],
      headings: {
        en: title
      },
      contents: {
        en: message
      },
      data: {
        ...data,
        type: notificationType,
        url: url
      },
      url: url,
      chrome_web_icon: '/favicon.ico',
      chrome_web_image: '/notification-icon.png'
    }

    // Send notification via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationPayload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OneSignal API error: ${errorData.errors?.join(', ') || response.statusText}`)
    }

    const result = await response.json()
    
    console.log('Notification sent successfully to user')
    
    // Log notification to database for tracking
    await logNotification({
      user_id: userId,
      notification_type: notificationType,
      title,
      message,
      sent_to_count: 1,
      one_signal_response: result
    })

    return {
      success: true,
      sentTo: 1,
      oneSignalResponse: result
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