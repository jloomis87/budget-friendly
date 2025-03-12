import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPreferences, saveTableColors } from '../services/userPreferencesService';

// Constants for localStorage keys
export const STORAGE_KEYS = {
  TRANSACTIONS: 'friendlyBudgets_transactions',
  SUMMARY: 'friendlyBudgets_summary',
  PLAN: 'friendlyBudgets_plan',
  SUGGESTIONS: 'friendlyBudgets_suggestions',
  TABLE_COLORS: 'friendlyBudgets_tableColors'
};

// Legacy keys for backward compatibility
export const LEGACY_STORAGE_KEYS = {
  TRANSACTIONS: 'budgetFriendly_transactions',
  SUMMARY: 'budgetFriendly_summary',
  PLAN: 'budgetFriendly_plan',
  SUGGESTIONS: 'budgetFriendly_suggestions',
  TABLE_COLORS: 'budgetFriendly_tableColors'
};

// Create a global event system for synchronizing localStorage changes across components
const storageEventMap: Record<string, Set<() => void>> = {};

/**
 * Register a listener for a specific localStorage key
 */
function registerStorageListener(key: string, callback: () => void): () => void {
  if (!storageEventMap[key]) {
    storageEventMap[key] = new Set();
  }
  
  storageEventMap[key].add(callback);
  
  // Return a cleanup function
  return () => {
    if (storageEventMap[key]) {
      storageEventMap[key].delete(callback);
      if (storageEventMap[key].size === 0) {
        delete storageEventMap[key];
      }
    }
  };
}

/**
 * Notify all listeners for a specific localStorage key
 */
function notifyStorageListeners(key: string): void {
  if (storageEventMap[key]) {
    storageEventMap[key].forEach(callback => callback());
  }
}

/**
 * Get an item from localStorage with legacy key fallback
 */
export const getStorageItem = (key: string, legacyKey: string, userId?: string) => {
  // If userId is provided, create a user-specific key
  const personalizedKey = userId ? `${key}_${userId}` : key;
  
  const item = localStorage.getItem(personalizedKey);
  
  // If item doesn't exist, check legacy key
  if (!item) {
    // Try the non-personalized key as fallback
    if (userId) {
      const nonPersonalizedItem = localStorage.getItem(key);
      if (nonPersonalizedItem) {
        return nonPersonalizedItem;
      }
    }
    
    // Check legacy key
    if (legacyKey) {
      const legacyItem = localStorage.getItem(legacyKey);
      
      if (legacyItem) {
        // If found in legacy, migrate to new key
        if (userId) {
          localStorage.setItem(personalizedKey, legacyItem);
        } else {
          localStorage.setItem(key, legacyItem);
        }
        return legacyItem;
      }
    }
  }
  
  return item;
};

/**
 * Custom hook for managing localStorage state with cross-component synchronization
 * For table colors, it will also sync with Firebase if the user is authenticated
 */
export function useLocalStorage<T>(key: string, legacyKey: string, initialValue: T) {
  // Get the current user ID for personalized storage
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  
  // Create a personalized key if user is logged in
  const personalizedKey = userId ? `${key}_${userId}` : key;
  
  // Memoize the initial value to prevent it from causing rerenders
  const memoizedInitialValue = useMemo(() => initialValue, []);
  
  // Track if we've loaded from Firebase
  const [loadedFromFirebase, setLoadedFromFirebase] = useState(false);
  
  // Initialize state only once
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = getStorageItem(key, legacyKey, userId);
      return item ? JSON.parse(item) : memoizedInitialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return memoizedInitialValue;
    }
  });

  // Load from Firebase when user is authenticated
  useEffect(() => {
    // Only sync table colors with Firebase
    if (!isAuthenticated || !userId || key !== STORAGE_KEYS.TABLE_COLORS) return;
    
    const loadFromFirebase = async () => {
      try {
        console.log('[useLocalStorage] Loading table colors from Firebase for user:', userId);
        const userPrefs = await getUserPreferences(userId);
        
        if (userPrefs?.tableColors) {
          console.log('[useLocalStorage] Found table colors in Firebase:', userPrefs.tableColors);
          setStoredValue(userPrefs.tableColors as unknown as T);
          localStorage.setItem(personalizedKey, JSON.stringify(userPrefs.tableColors));
          setLoadedFromFirebase(true);
        } else {
          console.log('[useLocalStorage] No table colors found in Firebase, saving current colors');
          // Save current colors to Firebase
          if (storedValue && Object.keys(storedValue).length > 0) {
            await saveTableColors(userId, storedValue as unknown as Record<string, string>);
          }
          setLoadedFromFirebase(true);
        }
      } catch (error) {
        console.error('[useLocalStorage] Error loading from Firebase:', error);
        setLoadedFromFirebase(true); // Mark as loaded even on error to prevent infinite retries
      }
    };
    
    if (!loadedFromFirebase) {
      loadFromFirebase();
    }
  }, [isAuthenticated, userId, key, personalizedKey, storedValue, loadedFromFirebase]);

  // Update local state when user changes
  useEffect(() => {
    if (!userId) return; // Skip if no user ID (prevents unnecessary updates)
    
    try {
      const item = getStorageItem(key, legacyKey, userId);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error('Error reading from localStorage during user change:', error);
    }
  }, [userId, key, legacyKey]); // Remove initialValue from dependencies
  
  // Update local state when another component changes the same key
  useEffect(() => {
    // Function to handle external updates
    const handleExternalUpdate = () => {
      try {
        const item = localStorage.getItem(personalizedKey);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error('Error reading from localStorage during sync:', error);
      }
    };
    
    // Register this component with the event system
    const unregister = registerStorageListener(personalizedKey, handleExternalUpdate);
    
    // Also listen for window storage events (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === personalizedKey) {
        handleExternalUpdate();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      unregister();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [personalizedKey]); // Remove initialValue from dependencies

  // Update localStorage when the state changes
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function for previous state pattern
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save to state
      setStoredValue(valueToStore);
      
      // Save to localStorage with personalized key if user is logged in
      localStorage.setItem(personalizedKey, JSON.stringify(valueToStore));
      
      // If this is table colors and user is authenticated, save to Firebase
      if (key === STORAGE_KEYS.TABLE_COLORS && isAuthenticated && userId && loadedFromFirebase) {
        console.log('[useLocalStorage] Saving table colors to Firebase:', valueToStore);
        saveTableColors(userId, valueToStore as unknown as Record<string, string>)
          .then(success => {
            if (success) {
              console.log('[useLocalStorage] Successfully saved table colors to Firebase');
            } else {
              console.error('[useLocalStorage] Failed to save table colors to Firebase');
            }
          })
          .catch(error => {
            console.error('[useLocalStorage] Error saving table colors to Firebase:', error);
          });
      }
      
      // Notify all other components using this key
      notifyStorageListeners(personalizedKey);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
} 