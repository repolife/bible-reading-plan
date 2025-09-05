// PWA Service Worker Registration and Utilities
export class PWAManager {
  constructor() {
    this.swRegistration = null
    this.isOnline = navigator.onLine
    this.updateAvailable = false
    
    // Bind methods
    this.handleOnline = this.handleOnline.bind(this)
    this.handleOffline = this.handleOffline.bind(this)
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
  }

  // Register Service Worker
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('PWA: Registering service worker...')
        
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        console.log('PWA: Service worker registered successfully', this.swRegistration)

        // Handle service worker updates
        this.swRegistration.addEventListener('updatefound', () => {
          console.log('PWA: New service worker found, installing...')
          
          const newWorker = this.swRegistration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('PWA: New service worker installed, update available')
                this.updateAvailable = true
                this.showUpdateNotification()
              }
            })
          }
        })

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('PWA: Message from service worker:', event.data)
          
          if (event.data && event.data.type === 'CACHE_UPDATED') {
            this.showUpdateNotification()
          }
        })

        return this.swRegistration
      } catch (error) {
        console.error('PWA: Service worker registration failed:', error)
        return null
      }
    } else {
      console.log('PWA: Service workers not supported')
      return null
    }
  }

  // Check for updates
  async checkForUpdates() {
    if (this.swRegistration) {
      try {
        await this.swRegistration.update()
        console.log('PWA: Checked for service worker updates')
      } catch (error) {
        console.error('PWA: Failed to check for updates:', error)
      }
    }
  }

  // Apply update
  applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      console.log('PWA: Applying service worker update...')
      
      // Tell the waiting service worker to skip waiting
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload the page to activate new service worker
      window.location.reload()
    }
  }

  // Show update notification
  showUpdateNotification() {
    // You can customize this to show a toast, modal, or banner
    console.log('PWA: Update available')
    
    // Example: Show a simple notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Update Available', {
        body: 'A new version of the Bible Reading Plan app is available. Refresh to update.',
        icon: '/icons/icon-192x192.png',
        tag: 'app-update'
      })
    }

    // Dispatch custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('pwa-update-available', {
      detail: { updateAvailable: true }
    }))
  }

  // Handle online event
  handleOnline() {
    console.log('PWA: App is online')
    this.isOnline = true
    
    // Check for updates when coming back online
    this.checkForUpdates()
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-online', {
      detail: { isOnline: true }
    }))
  }

  // Handle offline event
  handleOffline() {
    console.log('PWA: App is offline')
    this.isOnline = false
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-offline', {
      detail: { isOnline: false }
    }))
  }

  // Check if app can be installed
  canInstall() {
    return window.deferredPrompt !== null
  }

  // Prompt for installation
  async promptInstall() {
    if (window.deferredPrompt) {
      try {
        console.log('PWA: Showing install prompt')
        
        // Show the install prompt
        window.deferredPrompt.prompt()
        
        // Wait for the user's response
        const { outcome } = await window.deferredPrompt.userChoice
        
        console.log('PWA: Install prompt outcome:', outcome)
        
        // Reset the deferred prompt
        window.deferredPrompt = null
        
        return outcome === 'accepted'
      } catch (error) {
        console.error('PWA: Install prompt failed:', error)
        return false
      }
    }
    return false
  }

  // Get installation status
  async getInstallStatus() {
    if ('getInstalledRelatedApps' in navigator) {
      try {
        const relatedApps = await navigator.getInstalledRelatedApps()
        return relatedApps.length > 0
      } catch (error) {
        console.error('PWA: Failed to get install status:', error)
      }
    }
    
    // Fallback detection
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true
  }

  // Clear all caches (useful for debugging)
  async clearCaches() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        console.log('PWA: All caches cleared')
        return true
      } catch (error) {
        console.error('PWA: Failed to clear caches:', error)
        return false
      }
    }
    return false
  }

  // Get cache info
  async getCacheInfo() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys()
        const cacheInfo = {}
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName)
          const keys = await cache.keys()
          cacheInfo[cacheName] = keys.length
        }
        
        return cacheInfo
      } catch (error) {
        console.error('PWA: Failed to get cache info:', error)
        return {}
      }
    }
    return {}
  }

  // Cleanup
  destroy() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }
}

// Global PWA instance
export const pwaManager = new PWAManager()

// Handle beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (event) => {
  console.log('PWA: Before install prompt triggered')
  
  // Prevent the mini-infobar from appearing
  event.preventDefault()
  
  // Save the event for later use
  window.deferredPrompt = event
  
  // Dispatch custom event for UI components
  window.dispatchEvent(new CustomEvent('pwa-installable', {
    detail: { canInstall: true }
  }))
})

// Handle app installed event
window.addEventListener('appinstalled', () => {
  console.log('PWA: App was installed')
  
  // Clear the deferred prompt
  window.deferredPrompt = null
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('pwa-installed', {
    detail: { installed: true }
  }))
})

// Initialize PWA when module loads
pwaManager.registerServiceWorker()

export default pwaManager 