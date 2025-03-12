// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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