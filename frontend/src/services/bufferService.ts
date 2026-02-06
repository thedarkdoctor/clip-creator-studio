// /services/bufferService.ts
// Simplified service for Zapier webhook integration
// No longer handles OAuth or token storage

export const bufferService = {
  /**
   * Stub function - OAuth is no longer used
   * Kept for backward compatibility
   */
  async getConnectedAccount(userId: string) {
    // Return a stub indicating Zapier webhook is used
    return {
      provider: 'zapier',
      message: 'Using Zapier webhook integration - no user credentials stored',
    };
  },

  /**
   * Stub function - OAuth is no longer used
   */
  async exchangeCodeForToken(code: string) {
    throw new Error('Buffer OAuth is no longer supported. Using Zapier webhook integration instead.');
  },

  /**
   * Stub function - OAuth is no longer used
   */
  async saveConnectedAccount() {
    throw new Error('Buffer OAuth is no longer supported. Using Zapier webhook integration instead.');
  },
};
