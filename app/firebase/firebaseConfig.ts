// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// Replace these values with your Firebase project details
const firebaseConfig = {
  apiKey: "AIzaSyDqT65FRMlnmSGEAVdeXe42ByLPeoTMYvg",
  authDomain: "friendlybudgets-260b9.firebaseapp.com",
  projectId: "friendlybudgets-260b9",
  storageBucket: "friendlybudgets-260b9.appspot.com",
  messagingSenderId: "559850329147",
  appId: "1:559850329147:web:e3f6a51197c37983e5f81e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Function to save user preferences
export const saveUserPreferences = async (userId: string, preferences: { selectedMonths: string[] }) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { preferences }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
};

// Function to get user preferences
export const getUserPreferences = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data()?.preferences;
    }
    return null;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}; 