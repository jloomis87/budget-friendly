import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User as FirebaseAuthUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    currency?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserPreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  logout: async () => {},
  updateUserPreferences: async () => {},
  updatePassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();
          
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            preferences: userData?.preferences || {},
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Failed to sign in');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        createdAt: new Date().toISOString(),
        preferences: {
          theme: 'light',
          notifications: true,
          currency: 'USD',
        },
      });
    } catch (err) {
      console.error('Sign up error:', err);
      setError('Failed to create account');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out');
      throw err;
    }
  };

  const updateUserPreferences = async (preferences: Partial<User['preferences']>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      setError(null);
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);
      const currentPreferences = userDoc.data()?.preferences || {};
      
      await setDoc(userRef, {
        preferences: {
          ...currentPreferences,
          ...preferences,
        },
      }, { merge: true });
      
      setUser(prev => prev ? {
        ...prev,
        preferences: {
          ...prev.preferences,
          ...preferences,
        },
      } : null);
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to update preferences');
      throw err;
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email || !auth.currentUser) throw new Error('No user logged in');
    
    try {
      setError(null);
      setIsLoading(true);
      
      // First, re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Then update the password
      await firebaseUpdatePassword(auth.currentUser, newPassword);
    } catch (err) {
      console.error('Password update error:', err);
      setError('Failed to update password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        signIn,
        signUp,
        logout,
        updateUserPreferences,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 