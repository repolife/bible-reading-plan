import React, { useState, useEffect } from 'react'
import { Card, CardBody, Typography, Button } from '@material-tailwind/react'
import { useAuthStore } from '@/store/useAuthStore'
import { getFCMToken, isFCMSupported } from '@/firebase'
import { sendTestNotification as sendTestNotificationUtil, sendTestPushNotification as sendTestPushNotificationUtil } from '@/utils/fcmNotificationService'
import { 
  registerDeviceFCMToken, 
  getUserFCMTokens, 
  sendNotificationToAllDevices, 
  getDeviceStats,
  unregisterDeviceFCMToken 
} from '@/utils/multiDeviceFCMService'

export const FCMDebug = () => {
  const { user } = useAuthStore()
  const [debugInfo, setDebugInfo] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    collectDebugInfo()
    if (user?.id) {
      loadDeviceInfo()
    }
  }, [user?.id])

  const collectDebugInfo = () => {
    const info = {
      // Environment
      userAgent: navigator.userAgent,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isStandalone: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone,
      isSecureContext: window.isSecureContext,
      
      // Service Worker Support
      hasServiceWorker: 'serviceWorker' in navigator,
      hasNotification: 'Notification' in window,
      notificationPermission: 'Notification' in window ? Notification.permission : 'not available',
      
      // Firebase Config
      hasVapidKey: !!import.meta.env.VITE_FIREBASE_VAPID_KEY,
      vapidKeyLength: import.meta.env.VITE_FIREBASE_VAPID_KEY?.length || 0,
      hasFirebaseConfig: !!(
        import.meta.env.VITE_FIREBASE_API_KEY &&
        import.meta.env.VITE_FIREBASE_PROJECT_ID &&
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
      ),
      
      // Network
      isOnline: navigator.onLine,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : 'not available',
      
      // PWA
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
      hasManifest: document.querySelector('link[rel="manifest"]') !== null,
    }
    
    setDebugInfo(info)
  }

  const testServiceWorker = async () => {
    setLoading(true)
    try {
      if ('serviceWorker' in navigator) {
        // Test PWA service worker
        const pwaRegistration = await navigator.serviceWorker.register('/sw.js')
        console.log('PWA service worker registered:', pwaRegistration)
        
        // Test Firebase messaging service worker
        const fcmRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        console.log('Firebase messaging service worker registered:', fcmRegistration)
        
        const ready = await navigator.serviceWorker.ready
        console.log('Service worker ready:', ready)
        
        setDebugInfo(prev => ({
          ...prev,
          pwaServiceWorkerStatus: 'registered',
          fcmServiceWorkerStatus: 'registered',
          serviceWorkerScope: ready.scope
        }))
      }
    } catch (error) {
      console.error('Service worker test failed:', error)
      setDebugInfo(prev => ({
        ...prev,
        serviceWorkerError: error.message
      }))
    }
    setLoading(false)
  }

  const testNotificationPermission = async () => {
    setLoading(true)
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission()
        setDebugInfo(prev => ({
          ...prev,
          notificationPermission: permission,
          permissionTestResult: `Permission ${permission} at ${new Date().toLocaleTimeString()}`
        }))
        
        if (permission === 'granted') {
          // Test showing a notification
          new Notification('Test Notification', {
            body: 'This is a test notification from FCM Debug',
            icon: '/icons/icon-96x96.svg'
          })
        }
      }
    } catch (error) {
      console.error('Notification permission test failed:', error)
      setDebugInfo(prev => ({
        ...prev,
        permissionError: error.message
      }))
    }
    setLoading(false)
  }

  const testFCMToken = async () => {
    setLoading(true)
    try {
      console.log('Testing FCM token registration...')
      
      if (!isFCMSupported()) {
        throw new Error('FCM not supported on this device/browser')
      }
      
      const token = await getFCMToken()
      
      if (token) {
        setDebugInfo(prev => ({
          ...prev,
          fcmTokenTest: 'success',
          fcmToken: token.substring(0, 20) + '...',
          fcmTokenFull: token,
          fcmTestTime: new Date().toLocaleTimeString()
        }))
        console.log('FCM token test successful:', token.substring(0, 20) + '...')
      } else {
        throw new Error('No token received')
      }
    } catch (error) {
      console.error('FCM token test failed:', error)
      setDebugInfo(prev => ({
        ...prev,
        fcmTokenTest: 'failed',
        fcmTokenError: error.message,
        fcmTestTime: new Date().toLocaleTimeString()
      }))
    }
    setLoading(false)
  }

  const sendTestNotification = async () => {
    setLoading(true)
    try {
      console.log('Sending test notification...')
      
      const success = await sendTestNotificationUtil(
        'Test Notification from FCM Debug',
        'This is a test notification to verify that notifications work in your browser!',
        '/'
      )
      
      if (success) {
        setDebugInfo(prev => ({
          ...prev,
          testNotificationSent: true,
          testNotificationTime: new Date().toLocaleTimeString(),
          testNotificationResult: 'success'
        }))
        console.log('Test notification sent successfully')
      } else {
        throw new Error('Notification API returned false')
      }
    } catch (error) {
      console.error('Test notification failed:', error)
      setDebugInfo(prev => ({
        ...prev,
        testNotificationSent: false,
        testNotificationError: error.message,
        testNotificationTime: new Date().toLocaleTimeString(),
        testNotificationResult: 'failed'
      }))
    }
    setLoading(false)
  }

  const sendTestPushNotification = async () => {
    setLoading(true)
    try {
      console.log('Sending test push notification...')
      
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      
      const result = await sendTestPushNotificationUtil(
        user.id,
        'Test Push Notification',
        'This is a real push notification sent through FCM! 🔔'
      )
      
      if (result.success) {
        setDebugInfo(prev => ({
          ...prev,
          pushNotificationSent: true,
          pushNotificationTime: new Date().toLocaleTimeString(),
          pushNotificationResult: 'success',
          pushNotificationEventId: result.eventId
        }))
        console.log('Test push notification sent successfully:', result.eventId)
      } else {
        throw new Error(result.error || 'Push notification failed')
      }
    } catch (error) {
      console.error('Test push notification failed:', error)
      setDebugInfo(prev => ({
        ...prev,
        pushNotificationSent: false,
        pushNotificationError: error.message,
        pushNotificationTime: new Date().toLocaleTimeString(),
        pushNotificationResult: 'failed'
      }))
    }
    setLoading(false)
  }

  const loadDeviceInfo = async () => {
    if (!user?.id) return
    
    try {
      const [tokens, stats] = await Promise.all([
        getUserFCMTokens(user.id),
        getDeviceStats(user.id)
      ])
      
      setDebugInfo(prev => ({
        ...prev,
        registeredDevices: tokens,
        deviceStats: stats
      }))
    } catch (error) {
      console.error('Error loading device info:', error)
    }
  }

  const registerCurrentDevice = async () => {
    if (!user?.id) {
      setDebugInfo(prev => ({
        ...prev,
        deviceRegistrationError: 'User not authenticated'
      }))
      return
    }

    setLoading(true)
    try {
      const result = await registerDeviceFCMToken(user.id)
      
      setDebugInfo(prev => ({
        ...prev,
        deviceRegistrationResult: result,
        deviceRegistrationTime: new Date().toLocaleTimeString()
      }))
      
      // Reload device info
      await loadDeviceInfo()
      
      console.log('Device registered successfully:', result)
    } catch (error) {
      console.error('Device registration failed:', error)
      setDebugInfo(prev => ({
        ...prev,
        deviceRegistrationError: error.message,
        deviceRegistrationTime: new Date().toLocaleTimeString()
      }))
    }
    setLoading(false)
  }

  const unregisterCurrentDevice = async () => {
    if (!user?.id) {
      setDebugInfo(prev => ({
        ...prev,
        deviceUnregistrationError: 'User not authenticated'
      }))
      return
    }

    setLoading(true)
    try {
      const result = await unregisterDeviceFCMToken(user.id)
      
      setDebugInfo(prev => ({
        ...prev,
        deviceUnregistrationResult: result,
        deviceUnregistrationTime: new Date().toLocaleTimeString()
      }))
      
      // Reload device info
      await loadDeviceInfo()
      
      console.log('Device unregistered successfully:', result)
    } catch (error) {
      console.error('Device unregistration failed:', error)
      setDebugInfo(prev => ({
        ...prev,
        deviceUnregistrationError: error.message,
        deviceUnregistrationTime: new Date().toLocaleTimeString()
      }))
    }
    setLoading(false)
  }

  const sendToAllDevices = async () => {
    if (!user?.id) {
      setDebugInfo(prev => ({
        ...prev,
        multiDeviceNotificationError: 'User not authenticated'
      }))
      return
    }

    setLoading(true)
    try {
      const result = await sendNotificationToAllDevices(
        user.id,
        'Multi-Device Test Notification',
        'This notification should appear on ALL your registered devices! 🔔'
      )
      
      if (result.success) {
        setDebugInfo(prev => ({
          ...prev,
          multiDeviceNotificationSent: true,
          multiDeviceNotificationTime: new Date().toLocaleTimeString(),
          multiDeviceNotificationResult: result
        }))
        console.log('Multi-device notification sent successfully:', result)
      } else {
        throw new Error(result.error || 'Multi-device notification failed')
      }
    } catch (error) {
      console.error('Multi-device notification failed:', error)
      setDebugInfo(prev => ({
        ...prev,
        multiDeviceNotificationSent: false,
        multiDeviceNotificationError: error.message,
        multiDeviceNotificationTime: new Date().toLocaleTimeString(),
        multiDeviceNotificationResult: 'failed'
      }))
    }
    setLoading(false)
  }

  if (process.env.NODE_ENV !== 'development') {
    return null // Only show in development
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mt-6">
      <CardBody className="p-6">
        <Typography variant="h5" className="text-red-600 mb-4">
          🐛 FCM Debug Information (Development Only)
        </Typography>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <Typography variant="h6" className="text-blue-800">Basic Tests</Typography>
            <Button onClick={testServiceWorker} disabled={loading} color="blue" size="sm">
              Test Service Worker
            </Button>
            <Button onClick={testNotificationPermission} disabled={loading} color="green" size="sm">
              Test Notification Permission
            </Button>
            <Button onClick={testFCMToken} disabled={loading} color="orange" size="sm">
              Test FCM Token
            </Button>
          </div>
          
          <div className="space-y-2">
            <Typography variant="h6" className="text-purple-800">Notification Tests</Typography>
            <Button onClick={sendTestNotification} disabled={loading} color="purple" size="sm">
              Send Local Test
            </Button>
            <Button onClick={sendTestPushNotification} disabled={loading} color="red" size="sm">
              Send Single Push
            </Button>
            <Button onClick={sendToAllDevices} disabled={loading} color="indigo" size="sm">
              Send to ALL Devices
            </Button>
          </div>
          
          <div className="space-y-2">
            <Typography variant="h6" className="text-green-800">Device Management</Typography>
            <Button onClick={registerCurrentDevice} disabled={loading} color="green" size="sm">
              Register This Device
            </Button>
            <Button onClick={unregisterCurrentDevice} disabled={loading} color="red" size="sm">
              Unregister This Device
            </Button>
            <Button onClick={loadDeviceInfo} disabled={loading} color="blue" size="sm">
              Refresh Device Info
            </Button>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="mt-4 text-sm text-gray-600 space-y-2">
          <Typography variant="h6">Common Issues:</Typography>
          <ul className="list-disc ml-6 space-y-1">
            <li><strong>iOS Safari:</strong> Requires PWA installation (isStandalone should be true)</li>
            <li><strong>Missing VAPID Key:</strong> hasVapidKey should be true</li>
            <li><strong>HTTP (not HTTPS):</strong> isSecureContext should be true</li>
            <li><strong>Service Worker:</strong> hasServiceWorker should be true</li>
            <li><strong>Notification Permission:</strong> Should be "granted"</li>
          </ul>
        </div>
      </CardBody>
    </Card>
  )
} 