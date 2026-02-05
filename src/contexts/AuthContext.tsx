import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface LynkscopeUser {
  id: string;
  email: string;
  businessName: string | null;
  niche: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Lynkscope SSO fields
  lynkscopeUser: LynkscopeUser | null;
  isLynkscopeSession: boolean;
  // Combined user info (works for both auth types)
  userId: string | null;
  businessName: string | null;
  niche: string | null;
  // Auth methods
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  // Profile methods
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Parse Lynkscope SSO token from URL
 */
function parseLynkscopeToken(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('lynkscope_token') || urlParams.get('sso_token');
}

/**
 * Decode JWT token
 */
function decodeJWT(token: string): { sub: string; email: string; exp: number; source?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get stored Lynkscope session
 */
function getStoredLynkscopeSession(): { token: string; user: LynkscopeUser } | null {
  const token = localStorage.getItem('cliplyst_lynkscope_token');
  const userJson = localStorage.getItem('cliplyst_lynkscope_user');
  if (!token || !userJson) return null;
  
  try {
    const decoded = decodeJWT(token);
    if (!decoded) {
      localStorage.removeItem('cliplyst_lynkscope_token');
      localStorage.removeItem('cliplyst_lynkscope_user');
      return null;
    }
    return { token, user: JSON.parse(userJson) };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Supabase auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Lynkscope SSO state
  const [lynkscopeUser, setLynkscopeUser] = useState<LynkscopeUser | null>(null);
  const [isLynkscopeSession, setIsLynkscopeSession] = useState(false);
  
  // Profile data (from users table)
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [niche, setNiche] = useState<string | null>(null);

  /**
   * Fetch user profile from database
   */
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('brand_name, niche')
        .eq('id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setBusinessName(data.brand_name);
        setNiche(data.niche);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, []);

  /**
   * Handle Lynkscope SSO token
   */
  const handleLynkscopeSSO = useCallback(async (token: string) => {
    const decoded = decodeJWT(token);
    if (!decoded) {
      console.warn('Invalid Lynkscope token');
      return false;
    }

    // Fetch user data from database
    const { data: userData } = await supabase
      .from('users')
      .select('brand_name, niche')
      .eq('id', decoded.sub)
      .maybeSingle();

    const lynkUser: LynkscopeUser = {
      id: decoded.sub,
      email: decoded.email,
      businessName: userData?.brand_name || null,
      niche: userData?.niche || null
    };

    // Store session
    localStorage.setItem('cliplyst_lynkscope_token', token);
    localStorage.setItem('cliplyst_lynkscope_user', JSON.stringify(lynkUser));

    setLynkscopeUser(lynkUser);
    setIsLynkscopeSession(true);
    setBusinessName(lynkUser.businessName);
    setNiche(lynkUser.niche);

    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete('lynkscope_token');
    url.searchParams.delete('sso_token');
    window.history.replaceState({}, '', url.pathname + url.search);

    return true;
  }, []);

  /**
   * Refresh profile data
   */
  const refreshProfile = useCallback(async () => {
    const userId = user?.id || lynkscopeUser?.id;
    if (userId) {
      await fetchUserProfile(userId);
      
      // Update Lynkscope user if applicable
      if (lynkscopeUser) {
        const { data } = await supabase
          .from('users')
          .select('brand_name, niche')
          .eq('id', userId)
          .maybeSingle();
        
        if (data) {
          const updatedUser = {
            ...lynkscopeUser,
            businessName: data.brand_name,
            niche: data.niche
          };
          setLynkscopeUser(updatedUser);
          localStorage.setItem('cliplyst_lynkscope_user', JSON.stringify(updatedUser));
        }
      }
    }
  }, [user?.id, lynkscopeUser, fetchUserProfile]);

  useEffect(() => {
    const initAuth = async () => {
      // Check for Lynkscope SSO token in URL first
      const ssoToken = parseLynkscopeToken();
      if (ssoToken) {
        const success = await handleLynkscopeSSO(ssoToken);
        if (success) {
          setLoading(false);
          return;
        }
      }

      // Check for stored Lynkscope session
      const storedLynkscope = getStoredLynkscopeSession();
      if (storedLynkscope) {
        setLynkscopeUser(storedLynkscope.user);
        setIsLynkscopeSession(true);
        setBusinessName(storedLynkscope.user.businessName);
        setNiche(storedLynkscope.user.niche);
        
        // Refresh from DB
        await fetchUserProfile(storedLynkscope.user.id);
        setLoading(false);
        return;
      }

      // Fall back to Supabase auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          if (event === 'SIGNED_IN' && session?.user) {
            setTimeout(() => {
              createUserProfileIfNeeded(session.user.id);
              fetchUserProfile(session.user.id);
            }, 0);
          }
        }
      );

      const { data: { session: existingSession } } = await supabase.auth.getSession();
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        await fetchUserProfile(existingSession.user.id);
      }
      
      setLoading(false);

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, [handleLynkscopeSSO, fetchUserProfile]);

  const createUserProfileIfNeeded = async (userId: string) => {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from('users').insert({ id: userId });
    }
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Clear Lynkscope session
    localStorage.removeItem('cliplyst_lynkscope_token');
    localStorage.removeItem('cliplyst_lynkscope_user');
    setLynkscopeUser(null);
    setIsLynkscopeSession(false);
    setBusinessName(null);
    setNiche(null);
    
    // Sign out from Supabase
    await supabase.auth.signOut();
  };

  // Computed userId that works for both auth types
  const userId = user?.id || lynkscopeUser?.id || null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      lynkscopeUser,
      isLynkscopeSession,
      userId,
      businessName,
      niche,
      signUp, 
      signIn, 
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
