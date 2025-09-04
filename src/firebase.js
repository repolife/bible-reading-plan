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
    // Request permission for notifications
    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      // Get registration token
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      })
      
      if (token) {
        console.log('FCM token:', token)
        return token
      } else {
        console.log('No registration token available')
        return null
      }
    } else {
      console.log('Notification permission denied')
      return null
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error)
    return null
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
  return typeof window !== 'undefined' && 
         'serviceWorker' in navigator && 
         'Notification' in window &&
         messaging !== null
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
