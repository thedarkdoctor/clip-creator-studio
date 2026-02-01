import { useState, useEffect } from 'react';
import { bufferService } from '../services/bufferService';

export function useConnectedAccounts() {
  const [accounts, setAccounts] = useState<{ buffer?: any }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch connected accounts (Buffer only for now)
    async function fetchAccounts() {
      setLoading(true);
      try {
        // Replace with actual user ID from auth context
        const userId = window.localStorage.getItem('user_id');
        if (userId) {
          const buffer = await bufferService.getConnectedAccount(userId);
          setAccounts({ buffer });
        }
      } catch {
        setAccounts({});
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  function connectBuffer() {
    // Redirect to Buffer OAuth
    window.location.href = '/api/auth/buffer/connect?state=' + window.localStorage.getItem('user_id');
  }

  return { accounts, connectBuffer, loading };
}
