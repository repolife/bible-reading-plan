import { supabase } from '@/supabaseClient'
import { getFCMToken, isFCMSupported, getNotificationPermission, requestNotificationPermission } from '@/firebase'

/**
 * Multi-Device FCM Service
 * Handles FCM tokens for multiple devices per user
 */

// Device information helpers
const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isTablet: /iPad|Android(?=.*\bMobile\b)/i.test(navigator.userAgent),
    timestamp: new Date().toISOString()
  }
}

// Register FCM token for current device
export const registerDeviceFCMToken = async (userId) => {
  if (!isFCMSupported()) {
    throw new Error('FCM not supported on this device')
  }

  try {
    console.log('Registering FCM token for device...')
    
    // Request permission first
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    // Get FCM token
    const fcmToken = await getFCMToken()
    if (!fcmToken) {
      throw new Error('Failed to generate FCM token')
    }

    // Get device information
    const deviceInfo = getDeviceInfo()

    // Check if token already exists
    const { data: existingToken, error: checkError } = await supabase
      .from('user_fcm_tokens')
      .select('id, device_info')
      .eq('fcm_token', fcmToken)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing token: ${checkError.message}`)
    }

    if (existingToken) {
      // Update existing token
      const { error: updateError } = await supabase
        .from('user_fcm_tokens')
        .update({
          device_info: deviceInfo,
          last_used: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existingToken.id)

      if (updateError) {
        throw new Error(`Failed to update existing token: ${updateError.message}`)
      }

      console.log('Updated existing FCM token for device')
      return { success: true, token: fcmToken, action: 'updated' }
    } else {
      // Insert new token
      const { error: insertError } = await supabase
        .from('user_fcm_tokens')
        .insert({
          user_id: userId,
          fcm_token: fcmToken,
          device_info: deviceInfo,
          is_active: true
        })

      if (insertError) {
        throw new Error(`Failed to register new token: ${insertError.message}`)
      }

      console.log('Registered new FCM token for device')
      return { success: true, token: fcmToken, action: 'registered' }
    }

  } catch (error) {
    console.error('Error registering device FCM token:', error)
    throw error
  }
}

// Unregister current device's FCM token
export const unregisterDeviceFCMToken = async (userId) => {
  try {
    console.log('Unregistering FCM token for current device...')
    
    // Get current FCM token
    const fcmToken = await getFCMToken()
    if (!fcmToken) {
      console.log('No FCM token found to unregister')
      return { success: true, action: 'none' }
    }

    // Remove token from database
    const { error } = await supabase
      .from('user_fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('fcm_token', fcmToken)

    if (error) {
      throw new Error(`Failed to unregister token: ${error.message}`)
    }

    console.log('Unregistered FCM token for device')
    return { success: true, action: 'unregistered' }

  } catch (error) {
    console.error('Error unregistering device FCM token:', error)
    throw error
  }
}

// Get all FCM tokens for a user
export const getUserFCMTokens = async (userId) => {
  try {
    const { data: tokens, error } = await supabase
      .from('user_fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_used', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch user tokens: ${error.message}`)
    }

    return tokens || []
  } catch (error) {
    console.error('Error fetching user FCM tokens:', error)
    throw error
  }
}

// Send notification to all user devices
export const sendNotificationToAllDevices = async (userId, title, message, data = {}) => {
  try {
    console.log('Sending notification to all devices for user:', userId)
    
    // Get all active FCM tokens for the user
    const tokens = await getUserFCMTokens(userId)
    
    if (tokens.length === 0) {
      console.log('No active FCM tokens found for user')
      return { success: true, sentTo: 0, tokens: [] }
    }

    // Extract FCM tokens
    const fcmTokens = tokens.map(token => token.fcm_token)
    
    console.log(`Sending notification to ${fcmTokens.length} devices`)

    // Send to all tokens (you'll need to implement batch sending)
    // For now, we'll create a test calendar event to trigger notifications
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', userId)
      .single()

    if (userError || !userProfile?.family_id) {
      throw new Error('User does not belong to a family group')
    }

    // Create test event to trigger FCM notifications
    const testEventData = {
      event_title: title,
      event_description: message,
      event_start: new Date().toISOString(),
      location: 'Multi-Device Test',
      created_by: userId,
      family_id: userProfile.family_id,
      is_multi_device_test: true,
      target_tokens: fcmTokens // Store tokens for the FCM function to use
    }

    const { data: event, error: eventError } = await supabase
      .from('family_calendar')
      .insert([testEventData])
      .select()
      .single()

    if (eventError) {
      throw new Error(`Failed to create test event: ${eventError.message}`)
    }

    console.log('Multi-device notification sent via calendar event:', event.id)
    
    // Clean up test event
    setTimeout(async () => {
      try {
        await supabase
          .from('family_calendar')
          .delete()
          .eq('id', event.id)
        console.log('Multi-device test event cleaned up:', event.id)
      } catch (cleanupError) {
        console.warn('Failed to clean up test event:', cleanupError)
      }
    }, 5000)

    return {
      success: true,
      sentTo: fcmTokens.length,
      tokens: fcmTokens,
      eventId: event.id
    }

  } catch (error) {
    console.error('Error sending notification to all devices:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Update token last_used timestamp
export const updateTokenLastUsed = async (fcmToken) => {
  try {
    const { error } = await supabase
      .from('user_fcm_tokens')
      .update({ last_used: new Date().toISOString() })
      .eq('fcm_token', fcmToken)

    if (error) {
      console.warn('Failed to update token last used:', error)
    }
  } catch (error) {
    console.warn('Error updating token last used:', error)
  }
}

// Remove inactive tokens
export const cleanupInactiveTokens = async (userId) => {
  try {
    const { error } = await supabase
      .from('user_fcm_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)
      .lt('last_used', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (error) {
      console.warn('Failed to cleanup inactive tokens:', error)
    }
  } catch (error) {
    console.warn('Error cleaning up inactive tokens:', error)
  }
}

// Get device statistics
export const getDeviceStats = async (userId) => {
  try {
    const tokens = await getUserFCMTokens(userId)
    
    const stats = {
      totalDevices: tokens.length,
      mobileDevices: tokens.filter(t => t.device_info?.isMobile).length,
      tabletDevices: tokens.filter(t => t.device_info?.isTablet).length,
      desktopDevices: tokens.filter(t => !t.device_info?.isMobile && !t.device_info?.isTablet).length,
      recentDevices: tokens.filter(t => {
        const lastUsed = new Date(t.last_used)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return lastUsed > weekAgo
      }).length
    }

    return stats
  } catch (error) {
    console.error('Error getting device stats:', error)
    throw error
  }
}
