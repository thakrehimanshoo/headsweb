// app/components/NotificationButton.tsx
'use client';

import { useWebPush } from '@/app/hooks/useWebPush';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export default function NotificationButton() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  } = useWebPush();

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-500">
        Push notifications not supported
      </div>
    );
  }

  const handleClick = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium
        transition-all duration-200
        ${isSubscribed
          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
          : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : isSubscribed ? (
        <>
          <Bell className="w-5 h-5" />
          <span>Notifications On</span>
        </>
      ) : (
        <>
          <BellOff className="w-5 h-5" />
          <span>Enable Notifications</span>
        </>
      )}
    </button>
  );
}
