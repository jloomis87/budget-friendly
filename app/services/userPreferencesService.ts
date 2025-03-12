import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Constants
const USER_PREFS_COLLECTION = 'userPreferences';

// User preferences interface
export interface UserPreferences {
  tableColors?: Record<string, string>;
  [key: string]: any; // Allow for future preference expansions
}

/**
 * Get user preferences from Firestore
 */
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    console.log(`[Firebase] Getting preferences for user ID: "${userId}"`);
    
    if (!userId) {
      console.error('[Firebase] Error: getUserPreferences called with empty userId');
      return null;
    }
    
    const prefsDocRef = doc(db, USER_PREFS_COLLECTION, userId);
    const prefsDoc = await getDoc(prefsDocRef);
    
    if (prefsDoc.exists()) {
      console.log('[Firebase] User preferences found:', prefsDoc.data());
      return prefsDoc.data() as UserPreferences;
    } else {
      console.log('[Firebase] No preferences found for user, creating default');
      return null;
    }
  } catch (error) {
    console.error('[Firebase] Error getting user preferences:', error);
    return null;
  }
};

/**
 * Save user preferences to Firestore
 */
export const saveUserPreferences = async (userId: string, preferences: UserPreferences): Promise<boolean> => {
  try {
    console.log(`[Firebase] Saving preferences for user ID: "${userId}"`, preferences);
    
    if (!userId) {
      console.error('[Firebase] Error: saveUserPreferences called with empty userId');
      return false;
    }
    
    const prefsDocRef = doc(db, USER_PREFS_COLLECTION, userId);
    
    // Check if document exists
    const docSnap = await getDoc(prefsDocRef);
    
    if (docSnap.exists()) {
      // Update existing document
      await updateDoc(prefsDocRef, preferences);
      console.log('[Firebase] User preferences updated successfully');
    } else {
      // Create new document
      await setDoc(prefsDocRef, preferences);
      console.log('[Firebase] User preferences created successfully');
    }
    
    return true;
  } catch (error) {
    console.error('[Firebase] Error saving user preferences:', error);
    return false;
  }
};

/**
 * Save only table colors to Firestore
 */
export const saveTableColors = async (userId: string, tableColors: Record<string, string>): Promise<boolean> => {
  return saveUserPreferences(userId, { tableColors });
}; 