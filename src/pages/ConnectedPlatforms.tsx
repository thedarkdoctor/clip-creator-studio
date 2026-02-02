import React from 'react';
import { useConnectedAccounts } from '../hooks/useConnectedAccounts';

export default function ConnectedPlatforms() {
  const { accounts, connectZapier, loading } = useConnectedAccounts();

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Connected Platforms</h2>
      <div className="mb-6">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={connectZapier}
          disabled={loading}
        >
          {accounts.zapier ? 'Zapier Connected' : 'Connect Zapier'}
        </button>
        {accounts.zapier && (
          <div className="mt-2 text-green-700">
            Status: <b>{accounts.zapier.message}</b>
          </div>
        )}
      </div>
      {/* Posting frequency and auto-schedule mode UI */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Default Posting Frequency</label>
        <select className="border rounded px-2 py-1">
          <option>Manual</option>
          <option>Daily</option>
          <option>Weekly</option>
        </select>
      </div>
      <div>
        <label className="inline-flex items-center">
          <input type="checkbox" className="mr-2" />
          Enable Auto-Schedule Mode
        </label>
      </div>
    </div>
  );
}
