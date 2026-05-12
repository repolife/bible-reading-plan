import OneSignal from 'react-onesignal';
import { supabase } from '@/supabaseClient';

// Check if OneSignal is available
export const isOneSignalAvailable = () => {
  return typeof window !== 'undefined' && OneSignal;
};

// Detect OneSignal API version
export const detectOneSignalAPI = () => {
  if (!isOneSignalAvailable()) {
    return 'unavailable';
  }

  const apiInfo = {
    version: 'unknown',
    methods: []
  };

  // Check for new v5+ API
  if (OneSignal.User && OneSignal.User.PushSubscription) {
    apiInfo.version = 'v5+';
    if (OneSignal.User.PushSubscription.getPushSubscriptionId) apiInfo.methods.push('getPushSubscriptionId');
    if (OneSignal.User.addAlias) apiInfo.methods.push('addAlias');
    if (OneSignal.User.addEmail) apiInfo.methods.push('addEmail');
  }

  // Check for legacy API
  if (OneSignal.getUserId) apiInfo.methods.push('getUserId');
  if (OneSignal.getPlayerId) apiInfo.methods.push('getPlayerId');
  if (OneSignal.setExternalUserId) apiInfo.methods.push('setExternalUserId');
  if (OneSignal.setEmail) apiInfo.methods.push('setEmail');
  if (OneSignal.getNotificationPermission) apiInfo.methods.push('getNotificationPermission');
  if (OneSignal.requestNotificationPermission) apiInfo.methods.push('requestNotificationPermission');

  // Check for notification methods
  if (OneSignal.Notifications) {
    if (OneSignal.Notifications.permission) apiInfo.methods.push('Notifications.permission');
    if (OneSignal.Notifications.requestPermission) apiInfo.methods.push('Notifications.requestPermission');
    if (OneSignal.Notifications.addEventListener) apiInfo.methods.push('Notifications.addEventListener');
  }

  // Check for event methods
  if (OneSignal.on) apiInfo.methods.push('on');
  if (OneSignal.off) apiInfo.methods.push('off');

  console.log('OneSignal API detected:', apiInfo);
  return apiInfo;
};

// Check if OneSignal is available AND user is authenticated
export const isOneSignalAvailableForUser = (userId) => {
  // Double-check that we have a valid user ID
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.log('OneSignal blocked: Invalid or missing user ID');
    return false;
  }
  
  // Check if OneSignal is available
  if (!isOneSignalAvailable()) {
    console.log('OneSignal blocked: OneSignal not available');
    return false;
  }
  
  return true;
};

// Initialize OneSignal with proper configuration
export const initializeOneSignal = async (appId, safariWebId = null) => {
  if (!isOneSignalAvailable() || !appId) {
    console.warn('OneSignal not available or App ID missing');
    return false;
  }

  try {
    // Detect and log the OneSignal API version
    const apiInfo = detectOneSignalAPI();
    console.log('Initializing OneSignal with detected API:', apiInfo);

    const config = {
      appId,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: false, // Disable the notification bell button
      },
      autoPrompt: false, // Disable automatic prompts
      // Remove all promptOptions to prevent any automatic prompts
    };

    if (safariWebId) {
      config.safari_web_id = safariWebId;
    }

    await OneSignal.init(config);
    console.log('OneSignal initialized successfully - all automatic prompts disabled');
    return true;
  } catch (error) {
    console.error('Error initializing OneSignal:', error);
    return false;
  }
};

// Request notification permission
export const requestNotificationPermission = async (userId) => {
  if (!isOneSignalAvailableForUser(userId)) {
    throw new Error('OneSignal not available or user not authenticated');
  }

  try {
    // Try different OneSignal API methods for getting permission
    let currentPermission = null;
    
    // Method 1: Try the new v5+ API
    if (OneSignal.Notifications && typeof OneSignal.Notifications.permission === 'string') {
      currentPermission = OneSignal.Notifications.permission;
    }
    // Method 2: Try the legacy API
    else if (OneSignal.getNotificationPermission && typeof OneSignal.getNotificationPermission === 'function') {
      currentPermission = await OneSignal.getNotificationPermission();
    }
    // Method 3: Try browser API as fallback
    else if ('Notification' in window) {
      currentPermission = Notification.permission;
    }
    else {
      throw new Error('No notification permission method available');
    }
    
    if (currentPermission === 'granted') {
      return currentPermission;
    }
    
    if (currentPermission === 'denied') {
      throw new Error('Notification permission has been denied. Please enable it in your browser settings.');
    }
    
    // Only request permission if it's in default state
    if (currentPermission === 'default') {
      let permission = null;
      
      // Try different methods for requesting permission
      if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
        permission = await OneSignal.Notifications.requestPermission();
      }
      else if (OneSignal.requestNotificationPermission && typeof OneSignal.requestNotificationPermission === 'function') {
        permission = await OneSignal.requestNotificationPermission();
      }
      else if ('Notification' in window && typeof Notification.requestPermission === 'function') {
        permission = await Notification.requestPermission();
      }
      else {
        throw new Error('No permission request method available');
      }
      
      console.log('Notification permission result:', permission);
      return permission;
    }
    
    return currentPermission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw error;
  }
};

// Get current notification permission
export const getNotificationPermission = async (userId) => {
  if (!isOneSignalAvailableForUser(userId)) {
    return null;
  }

  try {
    // Try different OneSignal API methods for getting permission
    if (OneSignal.Notifications && typeof OneSignal.Notifications.permission === 'string') {
      return OneSignal.Notifications.permission;
    }
    else if (OneSignal.getNotificationPermission && typeof OneSignal.getNotificationPermission === 'function') {
      return await OneSignal.getNotificationPermission();
    }
    else if ('Notification' in window) {
      return Notification.permission;
    }
    else {
      console.warn('No notification permission method available');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// Get the user's OneSignal Player ID (subscription ID)
export const getPlayerId = async (userId) => {
  if (!isOneSignalAvailableForUser(userId)) {
    return null;
  }

  try {
    // Try different OneSignal API methods for getting player ID
    let playerId = null;
    
    // Method 1: Try the new v5+ API
    if (OneSignal.User && OneSignal.User.PushSubscription && typeof OneSignal.User.PushSubscription.getPushSubscriptionId === 'function') {
      playerId = await OneSignal.User.PushSubscription.getPushSubscriptionId();
    }
    // Method 2: Try the legacy API
    else if (OneSignal.getUserId && typeof OneSignal.getUserId === 'function') {
      playerId = await OneSignal.getUserId();
    }
    // Method 3: Try direct property access
    else if (OneSignal.User && OneSignal.User.PushSubscription && OneSignal.User.PushSubscription.id) {
      playerId = OneSignal.User.PushSubscription.id;
    }
    // Method 4: Try the old API
    else if (OneSignal.getPlayerId && typeof OneSignal.getPlayerId === 'function') {
      playerId = await OneSignal.getPlayerId();
    }
    else {
      console.warn('OneSignal API method not found for getting player ID');
      return null;
    }
    
    return playerId;
  } catch (error) {
    console.error('Error getting player ID:', error);
    return null;
  }
};

// Check if user is subscribed to push notifications
export const isSubscribed = async (userId) => {
  if (!isOneSignalAvailableForUser(userId)) {
    return false;
  }

  try {
    // Get permission status
    const permission = await getNotificationPermission(userId);
    console.log('Permission status:', permission);
    
    // Get player ID
    const playerId = await getPlayerId(userId);
    console.log('Player ID:', playerId);
    
    // Check if we have both permission and player ID
    const subscribed = permission === 'granted' && !!playerId;
    console.log('Subscription status:', subscribed, 'Permission:', permission, 'Player ID:', !!playerId);
    
    return subscribed;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

// Set user ID for OneSignal (for targeting notifications)
export const setOneSignalUserId = async (userId) => {
  if (!isOneSignalAvailableForUser(userId)) {
    console.log('setOneSignalUserId blocked: Invalid user ID or OneSignal not available');
    return false;
  }

  try {
    // Try different OneSignal API methods for setting user ID
    if (OneSignal.User && OneSignal.User.addAlias && typeof OneSignal.User.addAlias === 'function') {
      await OneSignal.User.addAlias('user_id', userId);
      console.log('OneSignal user ID set via new API:', userId);
    }
    else if (OneSignal.setExternalUserId && typeof OneSignal.setExternalUserId === 'function') {
      await OneSignal.setExternalUserId(userId);
      console.log('OneSignal user ID set via legacy API:', userId);
    }
    else if (OneSignal.setExternalUserId && typeof OneSignal.setExternalUserId === 'function') {
      OneSignal.setExternalUserId(userId);
      console.log('OneSignal user ID set via sync API:', userId);
    }
    else {
      console.warn('No OneSignal method available for setting user ID');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting OneSignal user ID:', error);
    return false;
  }
};

// Set user email for OneSignal
export const setOneSignalUserEmail = async (email) => {
  if (!isOneSignalAvailable() || !email) {
    console.log('setOneSignalUserEmail blocked: OneSignal not available or no email');
    return false;
  }

  try {
    // Try different OneSignal API methods for setting email
    if (OneSignal.User && OneSignal.User.addEmail && typeof OneSignal.User.addEmail === 'function') {
      await OneSignal.User.addEmail(email);
      console.log('OneSignal user email set via new API:', email);
    }
    else if (OneSignal.setEmail && typeof OneSignal.setEmail === 'function') {
      await OneSignal.setEmail(email);
      console.log('OneSignal user email set via legacy API:', email);
    }
    else {
      console.warn('No OneSignal method available for setting email');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting OneSignal user email:', error);
    return false;
  }
};

// Subscribe user to push notifications
export const subscribeToNotifications = async (userId = null) => {
  if (!isOneSignalAvailable()) {
    throw new Error('OneSignal not available');
  }

  // Require user ID for subscription
  if (!userId) {
    throw new Error('User must be authenticated to subscribe to notifications');
  }

  try {
    console.log('Starting subscription process for user:', userId);
    
    // Request permission first
    const permission = await requestNotificationPermission(userId);
    console.log('Permission result:', permission);
    
    if (permission) {
      console.log('Permission granted, waiting for OneSignal to be ready...');
      
      // Wait for OneSignal to be fully ready
      await waitForOneSignalReady(10000);
      console.log('OneSignal is ready');
      
      // Try to get the player ID with retries
      let playerId = null;
      let attempts = 0;
      const maxAttempts = 5;
      const delay = 1000;
      
      while (!playerId && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts} to get player ID`);
        
        try {
          playerId = await getPlayerId(userId);
          console.log(`Player ID attempt ${attempts}:`, playerId);
          
          if (playerId) {
            break;
          }
          
          // Wait before next attempt
          if (attempts < maxAttempts) {
            console.log(`Waiting ${delay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.log(`Error getting player ID on attempt ${attempts}:`, error.message);
          
          if (attempts < maxAttempts) {
            console.log(`Waiting ${delay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (playerId) {
        // Set user ID for targeting
        await setOneSignalUserId(userId);
        
        // Store player ID in user's profile
        try {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ onesignal_player_id: playerId })
            .eq('id', userId);
          
          if (updateError) {
            console.error('Error storing player ID in profile:', updateError);
          } else {
            console.log('Player ID stored in user profile');
          }
        } catch (error) {
          console.error('Error storing player ID in profile:', error);
        }
        
        console.log('User subscribed successfully. Player ID:', playerId, 'User ID:', userId);
        return { success: true, playerId };
      } else {
        console.error('Failed to get player ID after', maxAttempts, 'attempts');
        
        // Try alternative methods to get player ID
        console.log('Trying alternative methods to get player ID...');
        
        // Method 1: Check if OneSignal has any stored player ID
        if (OneSignal.User && OneSignal.User.PushSubscription) {
          try {
            // Try to access the player ID directly
            if (OneSignal.User.PushSubscription.id) {
              playerId = OneSignal.User.PushSubscription.id;
              console.log('Got player ID from direct property access:', playerId);
            }
          } catch (error) {
            console.log('Direct property access failed:', error.message);
          }
        }
        
        // Method 2: Try legacy API
        if (!playerId && OneSignal.getUserId && typeof OneSignal.getUserId === 'function') {
          try {
            playerId = await OneSignal.getUserId();
            console.log('Got player ID from legacy API:', playerId);
          } catch (error) {
            console.log('Legacy API failed:', error.message);
          }
        }
        
        // Method 3: Try old API
        if (!playerId && OneSignal.getPlayerId && typeof OneSignal.getPlayerId === 'function') {
          try {
            playerId = await OneSignal.getPlayerId();
            console.log('Got player ID from old API:', playerId);
          } catch (error) {
            console.log('Old API failed:', error.message);
          }
        }
        
        if (playerId) {
          // Set user ID for targeting
          await setOneSignalUserId(userId);
          
          // Store player ID in user's profile
          try {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ onesignal_player_id: playerId })
              .eq('id', userId);
            
            if (updateError) {
              console.error('Error storing player ID in profile:', updateError);
            } else {
              console.log('Player ID stored in user profile');
            }
          } catch (error) {
            console.error('Error storing player ID in profile:', error);
          }
          
          console.log('User subscribed successfully via alternative method. Player ID:', playerId, 'User ID:', userId);
          return { success: true, playerId };
        } else {
          throw new Error(`Failed to get player ID after ${maxAttempts} attempts and alternative methods. OneSignal may not be fully initialized.`);
        }
      }
    } else {
      return { success: false, reason: 'Permission denied' };
    }
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    throw error;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromNotifications = async () => {
  if (!isOneSignalAvailable()) {
    return false;
  }

  try {
    // Note: OneSignal doesn't have a direct unsubscribe method
    // Users need to disable notifications in their browser settings
    // We can only remove user data
    await OneSignal.User.removeAllAliases();
    await OneSignal.User.removeAllEmails();
    console.log('OneSignal user data removed');
    return true;
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return false;
  }
};

// Send a test notification to the current user
export const sendTestNotification = async (title, message, url = null) => {
  if (!isOneSignalAvailable()) {
    return false;
  }

  try {
    console.log('Attempting to send test notification:', { title, message, url });
    
    // Check if we have permission first
    let hasPermission = false;
    
    // Check browser permission
    if ('Notification' in window) {
      hasPermission = Notification.permission === 'granted';
      console.log('Browser notification permission:', hasPermission);
    }
    
    // Check OneSignal permission if browser permission is granted
    if (hasPermission) {
      try {
        // Try to get OneSignal permission status
        if (OneSignal.Notifications && typeof OneSignal.Notifications.permission === 'string') {
          const oneSignalPermission = OneSignal.Notifications.permission;
          console.log('OneSignal permission:', oneSignalPermission);
          hasPermission = oneSignalPermission === 'granted';
        } else if (OneSignal.getNotificationPermission && typeof OneSignal.getNotificationPermission === 'function') {
          const oneSignalPermission = await OneSignal.getNotificationPermission();
          console.log('OneSignal permission (legacy):', oneSignalPermission);
          hasPermission = oneSignalPermission === 'granted';
        }
      } catch (error) {
        console.log('Error checking OneSignal permission, using browser permission:', error.message);
      }
    }
    
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }
    
    console.log('Permission check passed, attempting to send notification');
    
    // Try to send via OneSignal first (if we have a player ID)
    let oneSignalSuccess = false;
    
    try {
      // Check if we have any player ID available
      let playerId = null;
      
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        try {
          if (typeof OneSignal.User.PushSubscription.getPushSubscriptionId === 'function') {
            playerId = await OneSignal.User.PushSubscription.getPushSubscriptionId();
          } else if (OneSignal.User.PushSubscription.id) {
            playerId = OneSignal.User.PushSubscription.id;
          }
        } catch (error) {
          console.log('Error getting player ID from new API:', error.message);
        }
      }
      
      if (!playerId && OneSignal.getUserId && typeof OneSignal.getUserId === 'function') {
        try {
          playerId = await OneSignal.getUserId();
        } catch (error) {
          console.log('Error getting player ID from legacy API:', error.message);
        }
      }
      
      if (!playerId && OneSignal.getPlayerId && typeof OneSignal.getPlayerId === 'function') {
        try {
          playerId = await OneSignal.getPlayerId();
        } catch (error) {
          console.log('Error getting player ID from old API:', error.message);
        }
      }
      
      if (playerId) {
        console.log('Player ID found, OneSignal should be able to send notifications');
        oneSignalSuccess = true;
      } else {
        console.log('No player ID found, will use browser notifications as fallback');
      }
    } catch (error) {
      console.log('Error checking OneSignal status, will use browser notifications:', error.message);
    }
    
    // Always try to send a local notification if permission is granted
    let localNotificationSuccess = false;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: message,
          data: { url },
          tag: 'test-notification' // Prevent duplicate notifications
        });

        // Handle notification click
        notification.onclick = () => {
          if (url) {
            window.open(url, '_blank');
          }
          notification.close();
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
        
        localNotificationSuccess = true;
        console.log('Local notification sent successfully');
      } catch (error) {
        console.log('Error sending local notification:', error.message);
      }
    }
    
    // Log the results
    console.log('Test notification results:', {
      oneSignalSuccess,
      localNotificationSuccess,
      hasPermission
    });
    
    // Consider it successful if either method worked
    if (oneSignalSuccess || localNotificationSuccess) {
      console.log('Test notification sent successfully');
      return true;
    } else {
      throw new Error('Failed to send notification via any method');
    }
    
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
};

// Listen for notification events
export const setupNotificationListeners = (onNotificationReceived, onNotificationClicked, userId = null) => {
  if (!isOneSignalAvailableForUser(userId)) {
    console.log('setupNotificationListeners blocked: Invalid user ID or OneSignal not available');
    return;
  }

  try {
    // Try different OneSignal API methods for setting up listeners
    if (OneSignal.Notifications && OneSignal.Notifications.addEventListener && typeof OneSignal.Notifications.addEventListener === 'function') {
      // New v5+ API
      OneSignal.Notifications.addEventListener('click', onNotificationClicked);
      console.log('OneSignal notification listeners set up via new API for user:', userId);
    }
    else if (OneSignal.on && typeof OneSignal.on === 'function') {
      // Legacy API
      OneSignal.on('notificationClick', onNotificationClicked);
      OneSignal.on('notificationReceived', onNotificationReceived);
      console.log('OneSignal notification listeners set up via legacy API for user:', userId);
    }
    else {
      console.warn('No OneSignal method available for setting up notification listeners');
    }
  } catch (error) {
    console.error('Error setting up notification listeners:', error);
  }
};

// Remove notification listeners
export const removeNotificationListeners = (onNotificationReceived, onNotificationClicked, userId = null) => {
  if (!isOneSignalAvailableForUser(userId)) {
    console.log('removeNotificationListeners blocked: Invalid user ID or OneSignal not available');
    return;
  }

  try {
    // Try different OneSignal API methods for removing listeners
    if (OneSignal.Notifications && OneSignal.Notifications.removeEventListener && typeof OneSignal.Notifications.removeEventListener === 'function') {
      // New v5+ API
      OneSignal.Notifications.removeEventListener('click', onNotificationClicked);
      console.log('OneSignal notification listeners removed via new API for user:', userId);
    }
    else if (OneSignal.off && typeof OneSignal.off === 'function') {
      // Legacy API
      OneSignal.off('notificationClick', onNotificationClicked);
      OneSignal.off('notificationReceived', onNotificationReceived);
      console.log('OneSignal notification listeners removed via legacy API for user:', userId);
    }
    else {
      console.warn('No OneSignal method available for removing notification listeners');
    }
  } catch (error) {
    console.error('Error removing notification listeners:', error);
  }
};

// Wait for OneSignal to be fully ready
export const waitForOneSignalReady = async (timeout = 10000) => {
  if (!isOneSignalAvailable()) {
    throw new Error('OneSignal not available');
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkReady = () => {
      // Check if OneSignal is ready
      if (OneSignal.isPushNotificationsEnabled && typeof OneSignal.isPushNotificationsEnabled === 'function') {
        resolve(true);
        return;
      }
      
      // Check if we have the new API
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        resolve(true);
        return;
      }
      
      // Check if we have the legacy API
      if (OneSignal.getUserId && typeof OneSignal.getUserId === 'function') {
        resolve(true);
        return;
      }
      
      // Check timeout
      if (Date.now() - startTime > timeout) {
        reject(new Error('OneSignal ready timeout'));
        return;
      }
      
      // Try again in 100ms
      setTimeout(checkReady, 100);
    };
    
    checkReady();
  });
};

// Manually check OneSignal status and diagnose issues
export const diagnoseOneSignalStatus = async (userId) => {
  if (!isOneSignalAvailableForUser(userId)) {
    return {
      success: false,
      error: 'OneSignal not available or user not authenticated',
      details: {}
    };
  }

  try {
    console.log('Diagnosing OneSignal status for user:', userId);
    
    const diagnosis = {
      success: true,
      oneSignalAvailable: false,
      oneSignalReady: false,
      permissionStatus: null,
      playerId: null,
      alternativePlayerIds: [],
      apiMethods: [],
      errors: []
    };

    // Check if OneSignal is available
    diagnosis.oneSignalAvailable = !!OneSignal;
    
    // Check OneSignal readiness
    try {
      await waitForOneSignalReady(5000);
      diagnosis.oneSignalReady = true;
    } catch (error) {
      diagnosis.errors.push(`OneSignal not ready: ${error.message}`);
    }

    // Check permission status
    try {
      diagnosis.permissionStatus = await getNotificationPermission(userId);
    } catch (error) {
      diagnosis.errors.push(`Permission check failed: ${error.message}`);
    }

    // Check for Player ID using multiple methods
    try {
      // Method 1: New API
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        try {
          if (typeof OneSignal.User.PushSubscription.getPushSubscriptionId === 'function') {
            const playerId = await OneSignal.User.PushSubscription.getPushSubscriptionId();
            if (playerId) {
              diagnosis.playerId = playerId;
              diagnosis.apiMethods.push('getPushSubscriptionId');
            }
          }
        } catch (error) {
          diagnosis.errors.push(`getPushSubscriptionId failed: ${error.message}`);
        }
      }

      // Method 2: Direct property access
      if (!diagnosis.playerId && OneSignal.User && OneSignal.User.PushSubscription) {
        try {
          if (OneSignal.User.PushSubscription.id) {
            diagnosis.playerId = OneSignal.User.PushSubscription.id;
            diagnosis.apiMethods.push('direct property access');
          }
        } catch (error) {
          diagnosis.errors.push(`Direct property access failed: ${error.message}`);
        }
      }

      // Method 3: Legacy API
      if (!diagnosis.playerId && OneSignal.getUserId && typeof OneSignal.getUserId === 'function') {
        try {
          const playerId = await OneSignal.getUserId();
          if (playerId) {
            diagnosis.playerId = playerId;
            diagnosis.apiMethods.push('getUserId');
          }
        } catch (error) {
          diagnosis.errors.push(`getUserId failed: ${error.message}`);
        }
      }

      // Method 4: Old API
      if (!diagnosis.playerId && OneSignal.getPlayerId && typeof OneSignal.getPlayerId === 'function') {
        try {
          const playerId = await OneSignal.getPlayerId();
          if (playerId) {
            diagnosis.playerId = playerId;
            diagnosis.apiMethods.push('getPlayerId');
          }
        } catch (error) {
          diagnosis.errors.push(`getPlayerId failed: ${error.message}`);
        }
      }

      // Check for any stored player IDs
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        try {
          // Check if there are any other properties that might contain the ID
          const pushSubscription = OneSignal.User.PushSubscription;
          for (const key in pushSubscription) {
            if (pushSubscription[key] && typeof pushSubscription[key] === 'string' && pushSubscription[key].length > 20) {
              diagnosis.alternativePlayerIds.push(`${key}: ${pushSubscription[key]}`);
            }
          }
        } catch (error) {
          diagnosis.errors.push(`Alternative ID search failed: ${error.message}`);
        }
      }

    } catch (error) {
      diagnosis.errors.push(`Player ID check failed: ${error.message}`);
    }

    // Check browser notification API
    if ('Notification' in window) {
      diagnosis.browserNotificationPermission = Notification.permission;
    }

    console.log('OneSignal diagnosis complete:', diagnosis);
    return diagnosis;

  } catch (error) {
    console.error('Error during OneSignal diagnosis:', error);
    return {
      success: false,
      error: error.message,
      details: {}
    };
  }
};

// Try to reset and request notification permission again
export const resetAndRequestPermission = async (userId) => {
  if (!isOneSignalAvailableForUser(userId)) {
    throw new Error('OneSignal not available or user not authenticated');
  }

  try {
    console.log('Attempting to reset and request notification permission for user:', userId);
    
    // First, check if we can detect the current permission
    let currentPermission = null;
    
    // Try browser API first
    if ('Notification' in window) {
      currentPermission = Notification.permission;
      console.log('Current browser permission:', currentPermission);
    }
    
    // If permission is denied, we need to guide the user
    if (currentPermission === 'denied') {
      console.log('Permission is denied - user needs to manually enable in browser settings');
      throw new Error('Permission denied. Please enable notifications in your browser settings and try again.');
    }
    
    // If permission is default, try to request it
    if (currentPermission === 'default') {
      console.log('Permission is default - attempting to request permission');
      
      let permission = null;
      
      // Try different methods for requesting permission
      if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
        permission = await OneSignal.Notifications.requestPermission();
        console.log('OneSignal Notifications.requestPermission result:', permission);
      } else if (OneSignal.requestNotificationPermission && typeof OneSignal.requestNotificationPermission === 'function') {
        permission = await OneSignal.requestNotificationPermission();
        console.log('OneSignal requestNotificationPermission result:', permission);
      } else if ('Notification' in window && typeof Notification.requestPermission === 'function') {
        permission = await Notification.requestPermission();
        console.log('Browser Notification.requestPermission result:', permission);
      } else {
        throw new Error('No permission request method available');
      }
      
      return permission;
    }
    
    // If permission is already granted, return it
    if (currentPermission === 'granted') {
      console.log('Permission already granted');
      return currentPermission;
    }
    
    throw new Error('Unable to determine current permission status');
  } catch (error) {
    console.error('Error resetting and requesting permission:', error);
    throw error;
  }
};

// Force a fresh OneSignal status check
export const forceRefreshOneSignalStatus = async (userId) => {
  if (!isOneSignalAvailableForUser(userId)) {
    return false;
  }

  try {
    console.log('Forcing fresh OneSignal status check for user:', userId);
    
    // Wait for OneSignal to be ready
    await waitForOneSignalReady(5000);
    
    // Try to get fresh permission status
    let permission = null;
    
    // Check browser permission first
    if ('Notification' in window) {
      permission = Notification.permission;
      console.log('Browser notification permission:', permission);
    }
    
    // Try OneSignal permission methods
    try {
      if (OneSignal.Notifications && typeof OneSignal.Notifications.permission === 'string') {
        permission = OneSignal.Notifications.permission;
        console.log('OneSignal Notifications.permission:', permission);
      } else if (OneSignal.getNotificationPermission && typeof OneSignal.getNotificationPermission === 'function') {
        permission = await OneSignal.getNotificationPermission();
        console.log('OneSignal getNotificationPermission:', permission);
      }
    } catch (error) {
      console.log('Error getting OneSignal permission, using browser permission:', error.message);
    }
    
    // Get fresh player ID
    const playerId = await getPlayerId(userId);
    console.log('Fresh player ID:', playerId);
    
    // Determine subscription status
    const subscribed = permission === 'granted' && !!playerId;
    
    console.log('Fresh subscription status:', {
      permission,
      playerId: !!playerId,
      playerIdValue: playerId,
      subscribed
    });
    
    return {
      available: true,
      subscribed,
      permission,
      playerId
    };
  } catch (error) {
    console.error('Error forcing fresh OneSignal status:', error);
    return false;
  }
};

// Get subscription status summary with retry logic
export const getSubscriptionStatusWithRetry = async (userId, maxRetries = 3, delay = 1000) => {
  if (!isOneSignalAvailableForUser(userId)) {
    return {
      available: false,
      subscribed: false,
      permission: null,
      playerId: null
    };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Getting subscription status for user: ${userId} (attempt ${attempt}/${maxRetries})`);
      
      // Wait for OneSignal to be ready
      await waitForOneSignalReady(5000);
      
      // Get permission status
      const permission = await getNotificationPermission(userId);
      console.log('Permission status:', permission);
      
      // Get player ID
      const playerId = await getPlayerId(userId);
      console.log('Player ID:', playerId);
      
      // Determine subscription status
      let subscribed = false;
      
      if (permission === 'granted' && playerId) {
        subscribed = true;
      } else if (permission === 'granted' && !playerId) {
        // Permission granted but no player ID - might need to wait for OneSignal to finish setup
        console.log('Permission granted but no player ID - OneSignal might still be initializing');
        if (attempt < maxRetries) {
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        subscribed = false;
      } else if (permission === 'denied') {
        subscribed = false;
      } else if (permission === 'default') {
        subscribed = false;
      }
      
      console.log('Final subscription status:', {
        available: true,
        subscribed,
        permission,
        playerId: !!playerId,
        playerIdValue: playerId,
        attempt
      });

      return {
        available: true,
        subscribed,
        permission,
        playerId
      };
    } catch (error) {
      console.error(`Error getting subscription status (attempt ${attempt}):`, error);
      
      if (attempt === maxRetries) {
        return {
          available: true,
          subscribed: false,
          permission: null,
          playerId: null,
          error: error.message
        };
      }
      
      // Wait before retry
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}; 

// Get subscription status summary (backward compatibility)
export const getSubscriptionStatus = async (userId) => {
  return getSubscriptionStatusWithRetry(userId, 1, 0);
}; 