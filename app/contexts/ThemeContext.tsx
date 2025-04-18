import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Define the palette mode type
type PaletteMode = 'light' | 'dark';

// Define the context type
interface ThemeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
  isLoading: boolean;
}

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
  isLoading: false,
});

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Use localStorage to persist theme preference for non-authenticated users
  const [storedMode, setStoredMode] = useLocalStorage<PaletteMode>(
    'theme-mode',
    'theme-mode-legacy',
    'light'
  );
  
  // State to track current theme mode
  const [mode, setMode] = useState<PaletteMode>(storedMode);
  // Flag to track if theme preferences are loading
  const [isLoading, setIsLoading] = useState(false);
  // Flag to track if there's an error with Firebase operations
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  // Ref to track if we've loaded from Firebase for the current user
  const loadedUserIdRef = useRef<string | null>(null);

  // Save theme to Firebase
  const saveThemeToFirebase = useCallback(async (themeMode: PaletteMode) => {
    if (isAuthenticated && user) {
      try {
        setFirebaseError(null);
        
        // Add a slight delay to ensure authentication is complete
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Store theme preference directly in the user document
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        const existingPreferences = userDoc.exists() ? userDoc.data()?.preferences || {} : {};
        
        await updateDoc(userDocRef, { 
          preferences: { 
            ...existingPreferences,
            theme: themeMode,
            updatedAt: new Date().toISOString() 
          }
        });
      } catch (error) {
        console.error('Error saving theme preference to Firebase:', error);
        setFirebaseError('Failed to save theme preference to Firebase');
        // Silently continue - the app will still work with localStorage
      }
    }
  }, [isAuthenticated, user]);

  // Function to toggle between light and dark mode
  const toggleColorMode = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    
    // Save to Firebase immediately on toggle
    if (isAuthenticated && user) {
      saveThemeToFirebase(newMode);
    }
  }, [mode, isAuthenticated, user, saveThemeToFirebase]);

  // Load theme preference from Firebase when user is authenticated
  useEffect(() => {
    const loadUserThemePreference = async () => {
      // Only load if authenticated and we haven't loaded for this user yet
      if (isAuthenticated && user && loadedUserIdRef.current !== user.id) {
        setIsLoading(true);
       
        // Add a small delay to ensure Firebase authentication is fully processed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          setFirebaseError(null);
          // Get theme preference from the user document
          const userDocRef = doc(db, 'users', user.id);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().preferences?.theme) {
            // User has a theme preference stored in Firebase
            const userTheme = userDoc.data().preferences.theme as PaletteMode;
            setMode(userTheme);
          } else {
            // No theme preference in Firebase, use the local one
            // Don't immediately try to save back to Firebase, which might fail
            // Just use localStorage value until we know Firebase access works
            console.log('No theme preference found in Firebase, using local setting:', mode);
          }
          
          // Mark this user as loaded
          loadedUserIdRef.current = user.id;
        } catch (error) {
          console.error('Error loading theme preference from Firebase:', error);
          setFirebaseError('Failed to load theme preference from Firebase');
          
          // Gracefully continue with localStorage theme without showing errors to user
          // We'll silently fall back to the localStorage value
        } finally {
          setIsLoading(false);
        }
      } else if (!isAuthenticated) {
        // Reset the loaded user when logging out
        loadedUserIdRef.current = null;
      }
    };

    loadUserThemePreference();
  }, [isAuthenticated, user, saveThemeToFirebase, mode]);

  // Update localStorage when mode changes
  useEffect(() => {
    // Always update localStorage
    setStoredMode(mode);
  }, [mode, setStoredMode]);

  // Log Firebase errors for debugging
  useEffect(() => {
    if (firebaseError) {
      console.error('Firebase theme operation error:', firebaseError);
    }
  }, [firebaseError]);

  // Create the theme based on current mode
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode palette
                primary: {
                  main: '#2563eb',
                  light: '#3b82f6',
                  dark: '#1d4ed8',
                },
                secondary: {
                  main: '#8b5cf6',
                  light: '#a78bfa',
                  dark: '#7c3aed',
                },
                background: {
                  default: '#f5f7fa',
                  paper: '#ffffff',
                },
                divider: 'rgba(0, 0, 0, 0.12)',
              }
            : {
                // Dark mode palette
                primary: {
                  main: '#3b82f6',
                  light: '#60a5fa',
                  dark: '#2563eb',
                },
                secondary: {
                  main: '#a78bfa',
                  light: '#c4b5fd',
                  dark: '#8b5cf6',
                },
                background: {
                  default: '#111827',
                  paper: '#1f2937',
                },
                divider: 'rgba(255, 255, 255, 0.12)',
                text: {
                  primary: '#f3f4f6',
                  secondary: '#d1d5db',
                },
              }),
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'dark' 
                  ? '0 4px 20px 0 rgba(0, 0, 0, 0.5)' 
                  : '0 4px 20px 0 rgba(0, 0, 0, 0.08)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode, isLoading }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 