const CACHE_NAME = 'bible-reading-plan-v1'
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Add your main CSS and JS files here when built
]

const RUNTIME_CACHE = 'bible-reading-plan-runtime-v1'

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install Event')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS.map(url => new Request(url, { credentials: 'same-origin' })))
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error)
      })
  )
  
  // Force activation of new service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate Event')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Take control of all clients
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  const { request } = event

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Serve offline page for navigation requests when offline
          return caches.match('/offline.html') || 
                 caches.match('/') ||
                 new Response('Offline', { status: 200, statusText: 'Offline' })
        })
    )
    return
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache
          return cachedResponse
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Cache API responses and assets
            if (request.url.includes('/api/') || 
                request.url.includes('.js') || 
                request.url.includes('.css') ||
                request.url.includes('.png') ||
                request.url.includes('.jpg') ||
                request.url.includes('.svg')) {
              
              const responseToCache = response.clone()
              caches.open(RUNTIME_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache)
                })
            }

            return response
          })
          .catch(() => {
            // Network failed, try to serve from cache
            return caches.match(request) ||
                   new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
          })
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background Sync', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync logic here
      console.log('Service Worker: Background sync completed')
    )
  }
})

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push Event', event)
  
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body || 'New notification from Bible Reading Plan',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'general',
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/icon-96x96.png'
        }
      ]
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Bible Reading Plan', options)
    )
  }
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification Click', event)
  
  event.notification.close()
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === self.location.origin + '/' && 'focus' in client) {
            return client.focus()
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
    )
  }
})

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
}) 