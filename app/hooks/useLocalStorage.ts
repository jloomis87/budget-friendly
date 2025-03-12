import { useState, useEffect } from 'react';

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
export const getStorageItem = (key: string, legacyKey: string) => {
  const item = localStorage.getItem(key);
  
  // If item doesn't exist, check legacy key
  if (!item && legacyKey) {
    const legacyItem = localStorage.getItem(legacyKey);
    
    if (legacyItem) {
      // If found in legacy, migrate to new key
      localStorage.setItem(key, legacyItem);
      return legacyItem;
    }
  }
  
  return item;
};

/**
 * Custom hook for managing localStorage state with cross-component synchronization
 */
export function useLocalStorage<T>(key: string, legacyKey: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = getStorageItem(key, legacyKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  // Update local state when another component changes the same key
  useEffect(() => {
    // Function to handle external updates
    const handleExternalUpdate = () => {
      try {
        const item = localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
      } catch (error) {
        console.error('Error reading from localStorage during sync:', error);
      }
    };
    
    // Register this component with the event system
    const unregister = registerStorageListener(key, handleExternalUpdate);
    
    // Also listen for window storage events (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        handleExternalUpdate();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      unregister();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  // Update localStorage when the state changes
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function for previous state pattern
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save to state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Notify all other components using this key
      notifyStorageListeners(key);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
} 