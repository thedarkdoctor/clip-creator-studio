// src/hooks/useAutoLogin.ts
/**
 * Auto-login hook for Lynkscope SSO integration
 * Handles session token validation and user context hydration
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface LynkscopeUser {
  id: string;
  email: string;
  businessName: string | null;
  niche: string | null;
}

interface AutoLoginState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: LynkscopeUser | null;
  error: string | null;
}

interface LynkscopeSSOParams {
  token?: string;
  user_id?: string;
  email?: string;
  business_name?: string;
  niche?: string;
}

/**
 * Parse Lynkscope SSO parameters from URL
 */
function parseLynkscopeParams(): LynkscopeSSOParams | null {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for JWT token in URL
  const token = urlParams.get('lynkscope_token') || urlParams.get('sso_token');
  if (token) {
    return { token };
  }
  
  // Check for direct params (fallback, less secure)
  const user_id = urlParams.get('user_id');
  const email = urlParams.get('email');
  
  if (user_id && email) {
    return {
      user_id,
      email,
      business_name: urlParams.get('business_name') || undefined,
      niche: urlParams.get('niche') || undefined
    };
  }
  
  return null;
}

/**
 * Decode and validate a JWT token (basic validation, full validation happens server-side)
 */
function decodeJWT(token: string): { sub: string; email: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.warn('JWT token expired');
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Store session in localStorage
 */
function storeSession(token: string, user: LynkscopeUser) {
  localStorage.setItem('cliplyst_lynkscope_token', token);
  localStorage.setItem('cliplyst_lynkscope_user', JSON.stringify(user));
}

/**
 * Get stored session from localStorage
 */
function getStoredSession(): { token: string; user: LynkscopeUser } | null {
  const token = localStorage.getItem('cliplyst_lynkscope_token');
  const userJson = localStorage.getItem('cliplyst_lynkscope_user');
  
  if (!token || !userJson) return null;
  
  try {
    const user = JSON.parse(userJson);
    
    // Validate token hasn't expired
    const decoded = decodeJWT(token);
    if (!decoded) {
      clearSession();
      return null;
    }
    
    return { token, user };
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Clear stored session
 */
function clearSession() {
  localStorage.removeItem('cliplyst_lynkscope_token');
  localStorage.removeItem('cliplyst_lynkscope_user');
}

/**
 * Main auto-login hook
 */
export function useAutoLogin() {
  const navigate = useNavigate();
  const [state, setState] = useState<AutoLoginState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null
  });

  /**
   * Fetch user data from database
   */
  const fetchUserData = useCallback(async (userId: string): Promise<LynkscopeUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, brand_name, niche')
        .eq('id', userId)
        .maybeSingle();
      
      if (error || !data) {
        console.error('Failed to fetch user data:', error);
        return null;
      }
      
      return {
        id: data.id,
        email: '', // Email not stored in users table
        businessName: data.brand_name,
        niche: data.niche
      };
    } catch (err) {
      console.error('Error fetching user:', err);
      return null;
    }
  }, []);

  /**
   * Handle SSO authentication via token
   */
  const handleSSOToken = useCallback(async (token: string) => {
    const decoded = decodeJWT(token);
    if (!decoded) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Invalid or expired token' }));
      return;
    }

    // Fetch full user data from database
    const userData = await fetchUserData(decoded.sub);
    
    const user: LynkscopeUser = {
      id: decoded.sub,
      email: decoded.email,
      businessName: userData?.businessName || null,
      niche: userData?.niche || null
    };

    storeSession(token, user);
    
    setState({
      isLoading: false,
      isAuthenticated: true,
      user,
      error: null
    });

    // Clean URL params
    const url = new URL(window.location.href);
    url.searchParams.delete('lynkscope_token');
    url.searchParams.delete('sso_token');
    window.history.replaceState({}, '', url.pathname);

    // Navigate to appropriate page
    if (!user.businessName || !user.niche) {
      navigate('/brand-setup');
    } else {
      navigate('/trends');
    }
  }, [fetchUserData, navigate]);

  /**
   * Initialize auto-login
   */
  useEffect(() => {
    const initAutoLogin = async () => {
      // Check for SSO params in URL
      const ssoParams = parseLynkscopeParams();
      
      if (ssoParams?.token) {
        await handleSSOToken(ssoParams.token);
        return;
      }

      // Check for stored session
      const storedSession = getStoredSession();
      if (storedSession) {
        // Refresh user data from database
        const freshUserData = await fetchUserData(storedSession.user.id);
        
        setState({
          isLoading: false,
          isAuthenticated: true,
          user: freshUserData || storedSession.user,
          error: null
        });
        return;
      }

      // No SSO session found
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null
      });
    };

    initAutoLogin();
  }, [handleSSOToken, fetchUserData]);

  /**
   * Manual logout
   */
  const logout = useCallback(() => {
    clearSession();
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      error: null
    });
    navigate('/');
  }, [navigate]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    if (!state.user?.id) return;
    
    const freshUserData = await fetchUserData(state.user.id);
    if (freshUserData) {
      const storedSession = getStoredSession();
      if (storedSession) {
        storeSession(storedSession.token, freshUserData);
      }
      setState(prev => ({ ...prev, user: freshUserData }));
    }
  }, [state.user?.id, fetchUserData]);

  return {
    ...state,
    logout,
    refreshUser
  };
}

/**
 * Check if current session is from Lynkscope SSO
 */
export function isLynkscopeSession(): boolean {
  return !!localStorage.getItem('cliplyst_lynkscope_token');
}

/**
 * Get Lynkscope user data from stored session
 */
export function getLynkscopeUser(): LynkscopeUser | null {
  const session = getStoredSession();
  return session?.user || null;
}
