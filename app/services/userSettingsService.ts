import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Collection references
const USERS_COLLECTION = 'users';
const SETTINGS_SUBCOLLECTION = 'settings';

// Interface for user settings
export interface UserSettings {
  tableColors?: Record<string, string>;
}

/**
 * Get user settings from Firestore
 * @param userId The ID of the user
 * @returns The user settings or null if not found
 */
export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    
    
    if (!userId) {
      console.error('[Firebase] Error: getUserSettings called with empty userId');
      return null;
    }
    
    // Reference to the user's settings document
    const settingsDocRef = doc(db, USERS_COLLECTION, userId, SETTINGS_SUBCOLLECTION, 'preferences');
    
    // Get the settings document
    const settingsDoc = await getDoc(settingsDocRef);
    
    if (settingsDoc.exists()) {
     
      return settingsDoc.data() as UserSettings;
    } else {
     
      
      // Create default settings if none exist
      const defaultSettings: UserSettings = {
        tableColors: {
          'Essentials': '#f5f5f5',
          'Wants': '#f5f5f5',
          'Savings': '#f5f5f5',
          'Income': '#f5f5f5'
        }
      };
      
      // Save default settings
      await setDoc(settingsDocRef, defaultSettings);
      
      return defaultSettings;
    }
  } catch (error) {
    console.error('[Firebase] Error getting user settings:', error);
    return null;
  }
};

/**
 * Save user settings to Firestore
 * @param userId The ID of the user
 * @param settings The settings to save
 * @returns True if successful, false otherwise
 */
export const saveUserSettings = async (userId: string, settings: UserSettings): Promise<boolean> => {
  try {
    
    
    if (!userId) {
      console.error('[Firebase] Error: saveUserSettings called with empty userId');
      return false;
    }
    
    // Reference to the user's settings document
    const settingsDocRef = doc(db, USERS_COLLECTION, userId, SETTINGS_SUBCOLLECTION, 'preferences');
    
    // Check if the document exists
    const settingsDoc = await getDoc(settingsDocRef);
    
    if (settingsDoc.exists()) {
      // Update existing settings
      await updateDoc(settingsDocRef, settings);
    } else {
      // Create new settings document
      await setDoc(settingsDocRef, settings);
    }
    
   
    return true;
  } catch (error) {
    console.error('[Firebase] Error saving user settings:', error);
    return false;
  }
};

/**
 * Save table colors to Firestore
 * @param userId The ID of the user
 * @param tableColors The table colors to save
 * @returns True if successful, false otherwise
 */
export const saveTableColors = async (userId: string, tableColors: Record<string, string>): Promise<boolean> => {
  try {
    
    
    if (!userId) {
      console.error('[Firebase] Error: saveTableColors called with empty userId');
      return false;
    }
    
    // Reference to the user's settings document
    const settingsDocRef = doc(db, USERS_COLLECTION, userId, SETTINGS_SUBCOLLECTION, 'preferences');
    
    // Check if the document exists
    const settingsDoc = await getDoc(settingsDocRef);
    
    if (settingsDoc.exists()) {
      // Update existing settings
      await updateDoc(settingsDocRef, { tableColors });
    } else {
      // Create new settings document with just the table colors
      await setDoc(settingsDocRef, { tableColors });
    }
    
   
    return true;
  } catch (error) {
    console.error('[Firebase] Error saving table colors:', error);
    return false;
  }
}; 