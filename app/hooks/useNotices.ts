// hooks/useNotices.ts
// Polling-based hook to replace SSE

import { useEffect, useState } from 'react';

interface Notice {
  id: string;
  type: string;
  category: string;
  company: string;
  notice_time: string;
}

interface NoticesData {
  scraped_at: string;
  total_notices?: number;
  notices: Notice[];
}

export function useNotices(pollingInterval = 5000) {
  const [data, setData] = useState<NoticesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    async function fetchNotices() {
      try {
        const response = await fetch('/api/notices');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const json = await response.json();
        
        if (isMounted) {
          setData(json);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch notices');
          setIsLoading(false);
        }
      }
    }

    // Initial fetch
    fetchNotices();

    // Set up polling
    intervalId = setInterval(fetchNotices, pollingInterval);

    // Cleanup
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [pollingInterval]);

  return { data, isLoading, error };
}

// Alternative: Smart polling that only fetches when tab is visible
export function useSmartNotices(pollingInterval = 5000) {
  const [data, setData] = useState<NoticesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    async function fetchNotices() {
      // Only fetch if tab is visible
      if (!isVisible) return;

      try {
        const response = await fetch('/api/notices');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const json = await response.json();
        
        if (isMounted) {
          setData(json);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch notices');
          setIsLoading(false);
        }
      }
    }

    // Initial fetch
    fetchNotices();

    // Set up polling (only when visible)
    intervalId = setInterval(fetchNotices, pollingInterval);

    // Cleanup
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [pollingInterval, isVisible]);

  return { data, isLoading, error, isVisible };
}