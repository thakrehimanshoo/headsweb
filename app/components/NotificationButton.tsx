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

  if (!isSupported) return null; // Hide if not supported to save space on mobile

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
        flex items-center justify-center gap-2 rounded-lg font-bold
        transition-all duration-200 text-sm
        /* Mobile: Circular/Square icon button | Desktop: Rectangular with text */
        p-2.5 md:px-4 md:py-2 
        ${isSubscribed
          ? 'bg-[#FFD644] text-[#0D0D0D] hover:scale-105 shadow-[0_0_15px_rgba(255,214,68,0.3)]'
          : 'bg-[#1A1A1A] text-[#F4F4F4] border border-[#2A2A2A] hover:border-[#FFD644]'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
      `}
      title={isSubscribed ? "Notifications On" : "Enable Notifications"}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="hidden md:inline">Processing...</span>
        </>
      ) : isSubscribed ? (
        <>
          <Bell className="w-5 h-5" />
          <span className="hidden md:inline">Notifications On</span>
        </>
      ) : (
        <>
          <BellOff className="w-5 h-5 text-[#666666]" />
          <span className="hidden md:inline">Enable Notifications</span>
        </>
      )}
    </button>
  );
}