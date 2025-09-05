import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging = null

// Check if we're in a browser environment and service worker is supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app)
  } catch (error) {
    console.warn('Firebase messaging not available:', error)
  }
}

// Get FCM token
export const getFCMToken = async () => {
  if (!messaging) {
    console.warn('Firebase messaging not available')
    return null
  }

  try {
    // Check if we're on iOS and not in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone
    
    if (isIOS && !isStandalone) {
      console.warn('FCM tokens are not available on iOS Safari. Please install the app to home screen.')
      throw new Error('iOS requires PWA installation for push notifications')
    }

    // Check if service worker is registered
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported')
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready
    console.log('Service worker ready:', registration)

    // Request permission for notifications
    const permission = await Notification.requestPermission()
    console.log('Notification permission:', permission)
    
    if (permission !== 'granted') {
      throw new Error(`Notification permission ${permission}`)
    }

    // Check if VAPID key is configured
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      throw new Error('VAPID key not configured. Please set VITE_FIREBASE_VAPID_KEY in your environment.')
    }

    console.log('Getting FCM token with VAPID key...')
    
    // Get registration token with service worker registration
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration
    })
    
    if (token) {
      console.log('FCM token retrieved successfully:', token.substring(0, 20) + '...')
      return token
    } else {
      throw new Error('No registration token available. This may be due to browser restrictions, network issues, or missing service worker.')
    }
    
  } catch (error) {
    console.error('Error retrieving FCM token:', error)
    
    // Provide more specific error messages
    if (error.message.includes('messaging/unsupported-browser')) {
      throw new Error('Your browser does not support push notifications')
    } else if (error.message.includes('messaging/permission-blocked')) {
      throw new Error('Notification permissions are blocked. Please enable them in browser settings.')
    } else if (error.message.includes('messaging/token-unsubscribe-failed')) {
      throw new Error('Failed to unsubscribe from previous token. Please try again.')
    } else if (error.message.includes('iOS requires PWA')) {
      throw new Error('On iPhone/iPad, notifications require installing the app to your home screen')
    } else {
      throw new Error(`Failed to get FCM token: ${error.message}`)
    }
  }
}

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  if (!messaging) {
    console.warn('Firebase messaging not available')
    return () => {}
  }

  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload)
    callback(payload)
  })
}

// Check if FCM is supported
export const isFCMSupported = () => {
  if (typeof window === 'undefined') return false
  
  // Basic requirements
  const hasBasicSupport = 'serviceWorker' in navigator && 
                         'Notification' in window &&
                         messaging !== null
  
  if (!hasBasicSupport) return false
  
  // iOS specific checks
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    // Check if running as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone
    
    // On iOS, notifications only work in standalone mode (installed PWA)
    return isStandalone
  }
  
  // For non-iOS devices, basic support is sufficient
  return true
}

// Get current notification permission
export const getNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

// Request notification permission
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

export { messaging }
export default app
