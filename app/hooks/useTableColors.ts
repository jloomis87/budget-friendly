import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from './useLocalStorage';
import { useAuth } from '../contexts/AuthContext';
import * as userSettingsService from '../services/userSettingsService';

// Default table colors
const DEFAULT_TABLE_COLORS: Record<string, string> = {
  'Essentials': '#f5f5f5', // Default light gray
  'Wants': '#f5f5f5',
  'Savings': '#f5f5f5',
  'Income': '#f5f5f5'
};

/**
 * Custom hook to manage table colors with both localStorage and Firebase synchronization
 * @returns A tuple with the table colors and a function to set them
 */
export function useTableColors() {
  // Use the localStorage hook for local persistence
  const [localTableColors, setLocalTableColors] = useLocalStorage<Record<string, string>>(
    STORAGE_KEYS.TABLE_COLORS,
    LEGACY_STORAGE_KEYS.TABLE_COLORS,
    DEFAULT_TABLE_COLORS
  );

  // Get user from auth context
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Use a ref to track if we've already loaded from Firebase for this user session
  const initialLoadDoneRef = useRef<Record<string, boolean>>({});
  
  // Load initial table colors from Firebase when the user is authenticated
  useEffect(() => {
    // Skip if no user or if we've already loaded for this user
    if (!user) return;
    if (initialLoadDoneRef.current[user.id]) return;
    
    const loadTableColorsFromFirebase = async () => {
      setIsLoading(true);
      try {
        console.log(`[useTableColors] Loading table colors from Firebase for user: ${user.id}`);
        
        // Get user settings from Firestore
        const settings = await userSettingsService.getUserSettings(user.id);
        
        // Mark this user as loaded
        initialLoadDoneRef.current[user.id] = true;
        
        if (settings && settings.tableColors) {
          console.log('[useTableColors] Found table colors in Firebase:', settings.tableColors);
          
          // Update local storage
          setLocalTableColors(settings.tableColors);
        } else {
          console.log('[useTableColors] No table colors found in Firebase, using local settings');
          
          // If user has custom colors in localStorage but not in Firebase, save them to Firebase
          if (JSON.stringify(localTableColors) !== JSON.stringify(DEFAULT_TABLE_COLORS)) {
            console.log('[useTableColors] Saving local table colors to Firebase:', localTableColors);
            await userSettingsService.saveTableColors(user.id, localTableColors);
          }
        }
      } catch (error) {
        console.error('[useTableColors] Error loading table colors from Firebase:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTableColorsFromFirebase();
  }, [user]); // Only depend on user, not on setLocalTableColors or localTableColors

  // Function to update table colors both locally and in Firebase
  const setTableColors = useCallback((newColors: Record<string, string> | ((prevColors: Record<string, string>) => Record<string, string>)) => {
    // Update localStorage
    setLocalTableColors(newColors);
    
    // Update Firebase if user is authenticated
    if (user) {
      const colors = typeof newColors === 'function' 
        ? newColors(localTableColors) 
        : newColors;
      
      console.log(`[useTableColors] Saving table colors to Firebase for user: ${user.id}`, colors);
      userSettingsService.saveTableColors(user.id, colors)
        .catch(error => {
          console.error('[useTableColors] Error saving table colors to Firebase:', error);
        });
    }
  }, [user, localTableColors, setLocalTableColors]);

  return [localTableColors, setTableColors, isLoading] as const;
} 