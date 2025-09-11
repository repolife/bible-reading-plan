// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

const env = import.meta.env;


// Initialize Firebase in service worker
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
}

firebase.initializeApp(firebaseConfig)

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload)
  
  const notificationTitle = payload.notification?.title || 'Bible Reading Plan'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    const urlToOpen = event.notification.data?.url || '/'
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus()
          }
        }
        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
    )
  }
})
