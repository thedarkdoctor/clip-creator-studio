import { useState, useEffect } from 'react';

export function useConnectedAccounts() {
  const [accounts, setAccounts] = useState<{ zapier: any }>({
    zapier: {
      provider: 'zapier',
      message: 'Zapier webhook integration is configured',
    },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No OAuth flow needed - Zapier webhook is configured directly
    setLoading(false);
  }, []);

  function connectZapier() {
    // No OAuth redirect needed
    console.log('Zapier webhook integration is configured via environment variables');
  }

  return { accounts, connectZapier, loading };
}
