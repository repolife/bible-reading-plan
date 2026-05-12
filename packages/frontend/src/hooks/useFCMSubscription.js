import { supabase } from "@/supabaseClient"
import { useState, useEffect, useCallback } from 'react'
import { 
  getFCMToken, 
  isFCMSupported, 
  getNotificationPermission, 
  requestNotificationPermission,
  onForegroundMessage 
} from '@/firebase'
import { 
  subscribeToFCM, 
  unsubscribeFromFCM, 
  sendTestNotification 
} from '@/utils/fcmNotificationService'

export const useFCMSubscription = (userId = null, userEmail = null) => {
  const [status, setStatus] = useState({
    available: false,
    subscribed: false,
    permission: null,
    token: null,
    loading: false,
    error: null
  })

  // Check subscription status on mount and when dependencies change
  useEffect(() => {
    checkStatus()
  }, [userId])

  // Check current subscription status
  const checkStatus = useCallback(async () => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.log('useFCMSubscription: No valid user ID, skipping status check')
      setStatus(prev => ({
        ...prev,
        available: false,
        subscribed: false,
        permission: null,
        token: null,
        loading: false
      }))
      return
    }

    setStatus(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      console.log('useFCMSubscription: Checking status for user:', userId)
      
      const available = isFCMSupported()
      const permission = getNotificationPermission()
      
      // Check if user has FCM token in database
      const { data: profile } = await supabase
        .from('profiles')
        .select('fcm_token')
        .eq('id', userId)
        .single()

      const hasToken = !!profile?.fcm_token
      const subscribed = available && permission === 'granted' && hasToken
      
      setStatus(prev => ({
        ...prev,
        available,
        subscribed,
        permission,
        token: profile?.fcm_token || null,
        loading: false
      }))
    } catch (error) {
      console.log('useFCMSubscription: Error checking status:', error.message)
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }, [userId])

  // Subscribe to notifications
  const subscribe = useCallback(async () => {
    if (!userId) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: 'You must be logged in to subscribe to notifications'
      }))
      return { success: false, reason: 'User not authenticated' }
    }

    setStatus(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await subscribeToFCM(userId)
      
      if (result.success) {
        // Re-check status after successful subscription
        await checkStatus()
        return { success: true, token: result.token }
      } else {
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: 'Subscription failed'
        }))
        return { success: false, reason: 'Subscription failed' }
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
      return { success: false, reason: error.message }
    }
  }, [userId, checkStatus])

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async () => {
    if (!userId) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: 'You must be logged in to unsubscribe from notifications'
      }))
      return { success: false, reason: 'User not authenticated' }
    }

    setStatus(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await unsubscribeFromFCM(userId)
      
      if (result.success) {
        // Re-check status after successful unsubscription
        await checkStatus()
        return { success: true }
      } else {
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to unsubscribe'
        }))
        return { success: false }
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
      return { success: false, reason: error.message }
    }
  }, [userId, checkStatus])

  // Send test notification
  const sendTest = useCallback(async (title, message, url = null) => {
    if (!userId) {
      setStatus(prev => ({
        ...prev,
        error: 'You must be logged in to send test notifications'
      }))
      return { success: false, reason: 'User not authenticated' }
    }

    try {
      console.log('useFCMSubscription: Sending test notification')
      
      const success = await sendTestNotification(title, message, url)
      
      if (success) {
        setStatus(prev => ({ ...prev, error: null }))
        return { success: true }
      } else {
        setStatus(prev => ({
          ...prev,
          error: 'Failed to send test notification'
        }))
        return { success: false, reason: 'Failed to send notification' }
      }
    } catch (error) {
      console.error('useFCMSubscription: Error sending test notification:', error)
      setStatus(prev => ({
        ...prev,
        error: error.message
      }))
      return { success: false, reason: error.message }
    }
  }, [userId])

  // Clear error
  const clearError = useCallback(() => {
    setStatus(prev => ({ ...prev, error: null }))
  }, [])

  // Refresh status
  const refresh = useCallback(() => {
    checkStatus()
  }, [checkStatus])

  // Set up foreground message listener
  useEffect(() => {
    if (status.subscribed) {
      const unsubscribe = onForegroundMessage((payload) => {
        console.log('Foreground message received:', payload)
        // You can add custom handling here, like showing a toast
      })
      
      return unsubscribe
    }
  }, [status.subscribed])

  return {
    // State
    ...status,
    
    // Actions
    subscribe,
    unsubscribe,
    sendTest,
    refresh,
    clearError,
    
    // Computed values
    canSubscribe: status.available && !status.subscribed && status.permission !== 'denied' && !!userId,
    canUnsubscribe: status.available && status.subscribed && !!userId,
    canSendTest: status.available && (status.permission === 'granted' || status.subscribed) && !!userId,
    
    // Helper methods
    isPermissionGranted: status.permission === 'granted',
    isPermissionDenied: status.permission === 'denied',
    isPermissionDefault: status.permission === 'default',
    
    // Authentication status
    isAuthenticated: !!userId
  }
}
