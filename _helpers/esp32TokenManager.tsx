import { useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, set, remove } from 'firebase/database';
import { auth, realtimeDb } from '@/firebase/firebaseConfig';

/**
 * ESP32 Token Manager Hook
 * 
 * This hook manages automatic token refresh for ESP32 authentication.
 * It should be added to your main app component or auth context provider.
 * 
 * Features:
 * - Automatically refreshes tokens every 50 minutes (before 1-hour expiry)
 * - Monitors auth state changes
 * - Cleans up tokens on component unmount
 * - Handles token refresh errors gracefully
 */
export const useESP32TokenManager = () => {
  const refreshIntervalRef = useRef<NodeJS.Timeout | number >(null);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);

  const storeESP32Token = async (user: User) => {
    try {
      console.log('🔄 [ESP32 Token Manager] Refreshing token for:', user.email);
      
      // Force token refresh
      const idToken = await user.getIdToken(true);
      
      const tokenRef = ref(realtimeDb, 'esp32Auth/currentUser');
      
      await set(tokenRef, {
        uid: user.uid,
        email: user.email,
        idToken: idToken,
        timestamp: Date.now(),
        expiresAt: Date.now() + (3600 * 1000), // 1 hour
        lastRefresh: new Date().toISOString(),
      });
      
      console.log('✅ [ESP32 Token Manager] Token refreshed successfully');
      
    } catch (error) {
      console.error('❌ [ESP32 Token Manager] Token refresh failed:', error);
    }
  };

  const clearESP32Token = async () => {
    try {
      console.log('🧹 [ESP32 Token Manager] Clearing token');
      
      const tokenRef = ref(realtimeDb, 'esp32Auth/currentUser');
      await remove(tokenRef);
      
      console.log('✅ [ESP32 Token Manager] Token cleared');
      
    } catch (error) {
      console.error('❌ [ESP32 Token Manager] Token clear failed:', error);
    }
  };

  const startTokenRefresh = (user: User) => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Initial token store
    storeESP32Token(user);

    // Set up refresh interval (50 minutes = 3,000,000 ms)
    // Tokens expire in 60 minutes, so we refresh at 50 minutes
    refreshIntervalRef.current = setInterval(() => {
      if (auth.currentUser) {
        storeESP32Token(auth.currentUser);
      }
    }, 50 * 60 * 1000);

    console.log('⏰ [ESP32 Token Manager] Auto-refresh started (every 50 minutes)');
  };

  const stopTokenRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
      console.log('⏸️ [ESP32 Token Manager] Auto-refresh stopped');
    }
  };

  useEffect(() => {
    console.log('🚀 [ESP32 Token Manager] Initializing...');

    // Monitor auth state changes
    authUnsubscribeRef.current = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('👤 [ESP32 Token Manager] User authenticated:', user.email);
        startTokenRefresh(user);
      } else {
        console.log('👤 [ESP32 Token Manager] User signed out');
        stopTokenRefresh();
        clearESP32Token();
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('🛑 [ESP32 Token Manager] Cleaning up...');
      
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
      }
      
      stopTokenRefresh();
    };
  }, []);

  return {
    // Expose manual refresh function if needed
    manualRefresh: async () => {
      if (auth.currentUser) {
        await storeESP32Token(auth.currentUser);
      }
    },
  };
};

/**
 * ESP32 Token Manager Component
 * 
 * Use this component in your app's root layout or auth context.
 * It runs in the background and handles all token management automatically.
 * 
 * Example usage in your main layout:
 * 
 * import { ESP32TokenManager } from '@/services/esp32TokenManager';
 * 
 * export default function RootLayout() {
 *   return (
 *     <>
 *       <ESP32TokenManager />
 *       {... your app content ...}
 *     </>
 *   );
 * }
 */
export const ESP32TokenManager = () => {
  useESP32TokenManager();
  return null; // This component doesn't render anything
};

export default ESP32TokenManager;
