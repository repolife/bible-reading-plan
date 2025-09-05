import React, { useState, useEffect } from 'react'
import { Card, CardBody, Typography, Button } from '@material-tailwind/react'
import { useAuthStore } from '@/store/useAuthStore'

export const FCMDebug = () => {
  const { user } = useAuthStore()
  const [debugInfo, setDebugInfo] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    collectDebugInfo()
  }, [])

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
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service worker registered:', registration)
        
        const ready = await navigator.serviceWorker.ready
        console.log('Service worker ready:', ready)
        
        setDebugInfo(prev => ({
          ...prev,
          serviceWorkerStatus: 'registered and ready',
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

  if (process.env.NODE_ENV !== 'development') {
    return null // Only show in development
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mt-6">
      <CardBody className="p-6">
        <Typography variant="h5" className="text-red-600 mb-4">
          🐛 FCM Debug Information (Development Only)
        </Typography>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button onClick={testServiceWorker} disabled={loading} color="blue">
            Test Service Worker
          </Button>
          <Button onClick={testNotificationPermission} disabled={loading} color="green">
            Test Notification Permission
          </Button>
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