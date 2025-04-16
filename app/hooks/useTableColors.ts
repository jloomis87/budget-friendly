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
        // Get user settings from Firestore
        const settings = await userSettingsService.getUserSettings(user.id);
        
        // Mark this user as loaded
        initialLoadDoneRef.current[user.id] = true;
        
        if (settings && settings.tableColors) {
          // Update local storage
          setLocalTableColors(settings.tableColors);
        } else {
          // If user has custom colors in localStorage but not in Firebase, save them to Firebase
          if (JSON.stringify(localTableColors) !== JSON.stringify(DEFAULT_TABLE_COLORS)) {
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
  }, [user]);

  // Function to update table colors both locally and in Firebase
  const setTableColors = useCallback((newColors: Record<string, string> | ((prevColors: Record<string, string>) => Record<string, string>)) => {
    // Update localStorage
    setLocalTableColors(newColors);
    
    // Update Firebase if user is authenticated
    if (user) {
      const colors = typeof newColors === 'function' 
        ? newColors(localTableColors) 
        : newColors;
      
      userSettingsService.saveTableColors(user.id, colors)
        .catch(error => {
          console.error('[useTableColors] Error saving table colors to Firebase:', error);
        });
    }
  }, [user, localTableColors, setLocalTableColors]);

  // Function to handle category renaming while preserving the color
  const handleCategoryRename = useCallback((oldCategoryName: string, newCategoryName: string) => {
    if (oldCategoryName === newCategoryName) return; // No change needed

    setLocalTableColors(prevColors => {
      // Check if the old category has a custom color
      if (prevColors[oldCategoryName]) {
        console.log(`[useTableColors] Preserving color for renamed category: ${oldCategoryName} -> ${newCategoryName}`);
        
        // Create new object with the color transferred from old to new category name
        const updatedColors = {
          ...prevColors,
          [newCategoryName]: prevColors[oldCategoryName]
        };
        
        // Remove the old category entry to avoid orphaned colors
        // (only if it's not one of the default categories)
        const isDefaultCategory = DEFAULT_TABLE_COLORS.hasOwnProperty(oldCategoryName);
        if (!isDefaultCategory) {
          delete updatedColors[oldCategoryName];
        }
        
        // Save to Firebase if user is authenticated
        if (user) {
          userSettingsService.saveTableColors(user.id, updatedColors)
            .catch(error => {
              console.error('[useTableColors] Error saving updated category colors to Firebase:', error);
            });
        }
        
        return updatedColors;
      }
      
      return prevColors; // No changes needed
    });
  }, [user, setLocalTableColors]);

  return [localTableColors, setTableColors, handleCategoryRename, isLoading] as const;
} 