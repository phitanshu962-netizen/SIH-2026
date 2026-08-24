'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  signInWithGoogle, logoutFirebase, subscribeAuthState, 
  seedInitialDatabaseIfEmpty, fetchStandardsFromFirebase 
} from '@/lib/firebase';
import { getDynamicStandards, setDynamicStandardsStore } from '@/lib/data/bisDatabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dbConnected: boolean;
  dbStandardsCount: number;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  syncDatabase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  dbConnected: false,
  dbStandardsCount: 0,
  signInWithGoogle: async () => {},
  logout: async () => {},
  syncDatabase: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);
  const [dbStandardsCount, setDbStandardsCount] = useState(12);

  // Auto-connect to Firebase Database, seed if empty, and sync standards
  const syncDatabase = async () => {
    try {
      const fetched = await fetchStandardsFromFirebase();
      setDynamicStandardsStore(fetched || []);
      setDbStandardsCount(fetched ? fetched.length : 0);
      setDbConnected(true);
    } catch (err) {
      console.warn("Database sync error:", err);
      setDbConnected(true);
      setDbStandardsCount(getDynamicStandards().length);
    }
  };

  useEffect(() => {
    // 1. Subscribe to Firebase Auth changes
    const unsubscribe = subscribeAuthState((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // 2. Initialize and sync Firebase Database
    syncDatabase();

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google Sign-In Failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutFirebase();
    } catch (error) {
      console.error("Logout Failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        dbConnected,
        dbStandardsCount,
        signInWithGoogle: handleGoogleSignIn,
        logout: handleLogout,
        syncDatabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
