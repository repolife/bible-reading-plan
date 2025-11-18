import React from 'react';
import { useOneSignalSubscription } from '../../hooks/useOneSignalSubscription';
import { useAuthStore } from '../../store/useAuthStore';

export const NotificationManager = () => {
  const { user } = useAuthStore();
  
  // Aggressively check for valid user
  if (!user || !user.id || typeof user.id !== 'string' || user.id.trim() === '') {
    console.log('NotificationManager: No valid user, showing login message');
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Push Notification Settings</h3>
        <p className="text-gray-600">
          Please log in to manage your notification preferences.
        </p>
      </div>
    );
  }

  console.log('NotificationManager: User authenticated, initializing OneSignal hook with ID:', user.id);

  const {
    available,
    subscribed,
    permission,
    playerId,
    loading,
    error,
    diagnosis,
    canSubscribe,
    canUnsubscribe,
    canSendTest,
    subscribe,
    unsubscribe,
    sendTest,
    refresh,
    forceRefresh,
    runDiagnosis,
    clearError,
    isPermissionGranted,
    isPermissionDenied,
    isPermissionDefault
  } = useOneSignalSubscription(user.id, user.email);

  const handleSubscribe = async () => {
    try {
      const result = await subscribe();
      if (result.success) {
        console.log('Successfully subscribed to notifications');
        // Force refresh status after subscription
        setTimeout(() => forceRefresh(), 1000);
      } else {
        console.log('Subscription failed:', result.reason);
      }
    } catch (error) {
      console.error('Subscription error:', error.message);
      
      // If it's a Player ID error, run diagnosis
      if (error.message.includes('Failed to get player ID')) {
        console.log('Player ID error detected, running diagnosis...');
        await runDiagnosis();
      }
    }
  };

  const handleUnsubscribe = async () => {
    const result = await unsubscribe();
    if (result.success) {
      console.log('Successfully unsubscribed from notifications');
      // Force refresh status after unsubscription
      setTimeout(() => forceRefresh(), 1000);
    }
  };

  const handleTestNotification = async () => {
    const result = await sendTest(
      'Bible Reading Plan',
      'This is a test notification! 📖',
      window.location.href
    );
    
    if (result.success) {
      console.log('Test notification sent successfully');
    }
  };

  const handleForceRefresh = async () => {
    console.log('Manual force refresh triggered');
    await forceRefresh();
  };

  const handleRunDiagnosis = async () => {
    console.log('Running OneSignal diagnosis...');
    await runDiagnosis();
  };

  if (!available) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Push notifications are not available in your browser or OneSignal is not configured.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Push Notification Settings</h3>
      
      <div className="space-y-4">
        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Status:</span>
            <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
              subscribed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {subscribed ? 'Subscribed' : 'Not Subscribed'}
            </span>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Permission:</span>
            <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
              isPermissionGranted ? 'bg-green-100 text-green-800' :
              isPermissionDenied ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {permission || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Test Notification Status */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="font-medium">Test Notifications:</span>
          <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
            canSendTest ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {canSendTest ? 'Available' : 'Not Available'}
          </span>
          <p className="text-xs text-gray-600 mt-1">
            {canSendTest 
              ? 'You can send test notifications to verify your setup'
              : 'Enable notifications first to test them'
            }
          </p>
        </div>

        {/* Player ID Display */}
        {playerId && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="font-medium">OneSignal Player ID:</span>
            <p className="text-sm text-blue-600 mt-1 break-all font-mono">
              {playerId}
            </p>
          </div>
        )}

        {/* Debug Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="font-medium">Debug Info:</span>
          <div className="text-xs text-gray-600 mt-1 space-y-1">
            <p>Available: {available.toString()}</p>
            <p>Subscribed: {subscribed.toString()}</p>
            <p>Permission: {permission || 'null'}</p>
            <p>Player ID: {playerId ? 'Present' : 'Missing'}</p>
            <p>Loading: {loading.toString()}</p>
          </div>
        </div>

        {/* Diagnosis Results */}
        {diagnosis && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-3">OneSignal Diagnosis Results</h4>
            <div className="text-sm text-blue-700 space-y-2">
              <p><strong>OneSignal Available:</strong> {diagnosis.oneSignalAvailable.toString()}</p>
              <p><strong>OneSignal Ready:</strong> {diagnosis.oneSignalReady.toString()}</p>
              <p><strong>Permission Status:</strong> {diagnosis.permissionStatus || 'null'}</p>
              <p><strong>Player ID:</strong> {diagnosis.playerId ? 'Found' : 'Missing'}</p>
              <p><strong>Browser Permission:</strong> {diagnosis.browserNotificationPermission || 'unknown'}</p>
              
              {diagnosis.apiMethods.length > 0 && (
                <p><strong>Working API Methods:</strong> {diagnosis.apiMethods.join(', ')}</p>
              )}
              
              {diagnosis.alternativePlayerIds.length > 0 && (
                <div>
                  <strong>Alternative IDs Found:</strong>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    {diagnosis.alternativePlayerIds.map((id, index) => (
                      <li key={index} className="font-mono text-xs">{id}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {diagnosis.errors.length > 0 && (
                <div>
                  <strong>Errors:</strong>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    {diagnosis.errors.map((error, index) => (
                      <li key={index} className="text-red-600">{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {canSubscribe && (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Enable Push Notifications'}
            </button>
          )}

          {canUnsubscribe && (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Disable Push Notifications'}
            </button>
          )}

          {canSendTest && (
            <button
              onClick={handleTestNotification}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Test Notification
            </button>
          )}

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh
            </button>
            
            <button
              onClick={handleForceRefresh}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Force Refresh
            </button>
            
            <button
              onClick={handleRunDiagnosis}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Diagnose
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 text-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={clearError}
                className="text-red-600 hover:text-red-800 underline text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Permission Help */}
        {isPermissionDenied && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">
                  Notification Permission Denied
                </h3>
                <div className="mt-2 text-sm text-orange-700">
                  <p className="mb-3">
                    Your browser has blocked notifications for this site. To enable push notifications, you need to:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-orange-800 mb-2">Chrome/Edge:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Click the lock/info icon (🔒) in the address bar</li>
                        <li>Change "Notifications" from "Block" to "Allow"</li>
                        <li>Refresh this page</li>
                      </ol>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-orange-800 mb-2">Firefox:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Click the shield icon (🛡️) in the address bar</li>
                        <li>Click "Site Permissions"</li>
                        <li>Change "Send Notifications" to "Allow"</li>
                        <li>Refresh this page</li>
                      </ol>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-orange-800 mb-2">Safari:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Go to Safari &gt; Preferences &gt; Websites &gt; Notifications</li>
                        <li>Find this site and change to "Allow"</li>
                        <li>Refresh this page</li>
                      </ol>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-orange-100 rounded">
                    <p className="text-sm">
                      <strong>Note:</strong> After changing the permission, you may need to close and reopen your browser, 
                      or wait a few minutes for the change to take effect.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Permission Help */}
        {isPermissionDefault && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Permission Not Set:</strong> Click "Enable Push Notifications" to request permission.
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="text-sm text-gray-600 space-y-2">
          <p>• Push notifications help you stay updated with prayer requests and important updates</p>
          <p>• You can change notification settings anytime in your browser</p>
          <p>• Test notifications are sent locally and won't appear on other devices</p>
          <p>• Your OneSignal Player ID is used to send you targeted notifications</p>
        </div>

        {/* Test Notification Help */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">About Test Notifications</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Local Test Notifications:</strong> These are sent directly from your browser and appear immediately on your device.</p>
            <p><strong>OneSignal Push Notifications:</strong> These are sent through OneSignal's servers and can appear on multiple devices.</p>
            <p><strong>Permission vs Subscription:</strong> You can test notifications as soon as permission is granted, even if OneSignal subscription is still setting up.</p>
            <p><strong>Debugging:</strong> Use the "Diagnose" button if you encounter issues with OneSignal setup.</p>
          </div>
        </div>

        {/* Debug Info (for development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">Debug Info</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded font-mono">
              <p>Available: {available.toString()}</p>
              <p>Subscribed: {subscribed.toString()}</p>
              <p>Permission: {permission}</p>
              <p>Player ID: {playerId || 'None'}</p>
              <p>User ID: {user?.id || 'None'}</p>
              <p>User Email: {user?.email || 'None'}</p>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}; 