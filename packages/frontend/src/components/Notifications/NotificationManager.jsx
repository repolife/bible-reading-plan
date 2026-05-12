import React from 'react';
import { useOneSignalSubscription } from '../../hooks/useOneSignalSubscription';
import { useAuthStore } from '../../store/useAuthStore';

export const NotificationManager = () => {
  const { user } = useAuthStore();

  if (!user?.id) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">Please log in to manage notification preferences.</p>
      </div>
    );
  }

  const {
    available,
    subscribed,
    permission,
    loading,
    error,
    canSubscribe,
    canUnsubscribe,
    canSendTest,
    subscribe,
    unsubscribe,
    sendTest,
    forceRefresh,
    clearError,
    isPermissionDenied,
    isPermissionDefault,
  } = useOneSignalSubscription(user.id, user.email);

  const handleSubscribe = async () => {
    const result = await subscribe();
    if (result?.success) setTimeout(() => forceRefresh(), 1000);
  };

  const handleUnsubscribe = async () => {
    const result = await unsubscribe();
    if (result?.success) setTimeout(() => forceRefresh(), 1000);
  };

  const handleTest = () =>
    sendTest('MO Fellowship', 'Test notification working!', window.location.href);

  if (!available) {
    return (
      <div className="p-6">
        <p className="text-amber-700 dark:text-amber-400">
          Push notifications are not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Push Notifications</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Stay updated with prayer requests and community announcements.
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl">
        <div className={`w-3 h-3 rounded-full shrink-0 ${subscribed ? 'bg-green-500' : 'bg-gray-300 dark:bg-neutral-600'}`} />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {subscribed ? 'Notifications enabled' : 'Notifications disabled'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {subscribed ? 'You will receive push notifications on this device' : 'Enable to receive push notifications'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {canSubscribe && (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0e9496] text-white font-medium text-sm hover:bg-[#0c7c7e] transition-colors disabled:opacity-50"
          >
            {loading ? 'Setting up…' : 'Enable Notifications'}
          </button>
        )}

        {canUnsubscribe && (
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing…' : 'Disable Notifications'}
          </button>
        )}

        {canSendTest && (
          <button
            onClick={handleTest}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            Send Test Notification
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <span>{error}</span>
          <button onClick={clearError} className="ml-3 underline shrink-0">Dismiss</button>
        </div>
      )}

      {/* Permission denied help */}
      {isPermissionDenied && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300 space-y-2">
          <p className="font-medium">Notifications blocked by browser</p>
          <p>To enable them, click the lock icon in your address bar, set Notifications to "Allow", then refresh the page.</p>
        </div>
      )}

      {/* Permission default nudge */}
      {isPermissionDefault && !subscribed && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Your browser will ask for permission when you tap Enable.
        </p>
      )}
    </div>
  );
};
