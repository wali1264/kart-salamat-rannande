import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { offlineDb } from '../lib/db';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, retries = 2) => {
    // 1. Try to load from local cache first for instant UI response
    try {
      const cached = await offlineDb.cache.get(['profiles', userId]);
      if (cached && !profile) {
        console.log('Loaded profile from offline cache');
        setProfile(cached.data);
      }
    } catch (err) {
      console.warn('Failed to load profile from cache:', err);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (retries > 0) {
          console.log(`Retrying profile fetch... (${retries} left)`);
          await new Promise(res => setTimeout(res, 1000));
          return fetchProfile(userId, retries - 1);
        }
        console.error('Error fetching profile:', error);
        // We stay with cached profile if online fetch fails
        setLoading(false);
        return;
      }
      
      if (data) {
        setProfile(data);
        // Update local cache
        await offlineDb.cache.put({
          id: userId,
          collection: 'profiles',
          data,
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
    } finally {
      setLoading(false); 
    }
  };

  const refreshProfile = async () => {
    if (user) {
      setLoading(true);
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Direct check of current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Real-time listener for profile updates
    let profileSubscription: any = null;
    
    if (user) {
      profileSubscription = supabase
        .channel(`public:profiles:id=eq.${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          if (mounted && payload.new) {
            console.log('Profile updated in real-time:', payload.new);
            setProfile(payload.new as Profile);
          }
        })
        .subscribe();
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
