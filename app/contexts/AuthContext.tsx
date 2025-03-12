import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

// Define user interface
export interface User {
  id: string;
  email: string | null;
  name: string;
  createdAt: string;
}

// Define auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {

        try {
          // Get user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            // User exists in Firestore
            const userData = userDoc.data() as Omit<User, 'id'>;
            
            const userObj = {
              id: firebaseUser.uid,
              ...userData
            };
            
            setUser(userObj);
          } else {
            // User exists in Auth but not in Firestore
            // This is a fallback that should rarely happen
            
            const userObj = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              createdAt: new Date().toISOString()
            };
            
            setUser(userObj);
          }
        } catch (err) {
          console.error('[AuthContext] Error fetching user data:', err);
          setError('Failed to load user data');
        }
      } else {
        
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => {
      
      unsubscribe();
    };
  }, []);

  // Login function with Firebase
  const login = async (email: string, password: string) => {
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Sign in with Firebase Authentication
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Auth state change listener will update the user state
    } catch (err: any) {
      console.error('[AuthContext] Login error:', err);
      
      // Handle specific Firebase error codes
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later');
      } else {
        setError('Failed to login. Please try again.');
      }
      setIsLoading(false);
    }
  };

  // Signup function with Firebase
  const signup = async (email: string, password: string, name: string) => {
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create user with Firebase Authentication

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update user profile with name

      await updateProfile(firebaseUser, { displayName: name });
      
      // Create user document in Firestore
      
      const newUser: Omit<User, 'id'> = {
        email,
        name,
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      
      // Auth state change listener will update the user state
    } catch (err: any) {
      console.error('[AuthContext] Signup error:', err);
      
      // Handle specific Firebase error codes
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already in use');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. It should be at least 6 characters');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Failed to create account. Please try again.');
      }
      setIsLoading(false);
    }
  };

  // Logout function with Firebase
  const logout = async () => {
    try {
      await signOut(auth);
      // Auth state change listener will update the user state
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out');
    }
  };

  // Provide the auth context to children components
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 