// src/lib/lynkscope-auth.ts
/**
 * Lynkscope Authentication & Authorization
 * Validates Bearer tokens and API credentials for Lynkscope integration
 */

/**
 * Validate Lynkscope Bearer token from Authorization header
 * @param authHeader - Authorization header value (e.g., "Bearer token123")
 * @returns true if token is valid, false otherwise
 */
export function validateLynkscopeBearerToken(authHeader?: string): boolean {
  if (!authHeader) return false;

  const expectedKey = import.meta.env.VITE_LYNKSCOPE_INTERNAL_KEY;
  if (!expectedKey) {
    console.error(
      'VITE_LYNKSCOPE_INTERNAL_KEY not configured. Configure in .env'
    );
    return false;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer') {
    console.warn('Invalid authorization scheme. Expected "Bearer"');
    return false;
  }

  if (!token) {
    console.warn('No token provided in Authorization header');
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const isValid = constantTimeCompare(token, expectedKey);

  if (!isValid) {
    console.warn('Invalid Lynkscope API token');
  }

  return isValid;
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal, false otherwise
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get Lynkscope API key from environment
 * @returns API key or null if not configured
 */
export function getLynkscopeApiKey(): string | null {
  return import.meta.env.VITE_LYNKSCOPE_INTERNAL_KEY || null;
}

/**
 * Check if Lynkscope integration is configured
 * @returns true if all required credentials are present
 */
export function isLynkscopeConfigured(): boolean {
  return (
    !!import.meta.env.VITE_LYNKSCOPE_INTERNAL_KEY &&
    !!import.meta.env.VITE_JWT_SECRET &&
    !!import.meta.env.VITE_CLIPLYST_API_URL
  );
}

/**
 * Verify Lynkscope integration health
 * @returns object with configuration status
 */
export function getLynkscopeConfigStatus(): {
  configured: boolean;
  missingVariables: string[];
} {
  const missing: string[] = [];

  if (!import.meta.env.VITE_LYNKSCOPE_INTERNAL_KEY) {
    missing.push('VITE_LYNKSCOPE_INTERNAL_KEY');
  }
  if (!import.meta.env.VITE_JWT_SECRET) {
    missing.push('VITE_JWT_SECRET');
  }
  if (!import.meta.env.VITE_CLIPLYST_API_URL) {
    missing.push('VITE_CLIPLYST_API_URL');
  }

  return {
    configured: missing.length === 0,
    missingVariables: missing,
  };
}
