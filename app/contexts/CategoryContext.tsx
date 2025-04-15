import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from './AuthContext';

export interface Category {
  id: string; // Unique identifier
  name: string; // Display name
  color: string; // Color for UI elements
  icon: string; // Emoji or icon identifier
  isDefault: boolean; // Whether this is a default category (can be renamed but not deleted)
  isIncome?: boolean; // Special flag for income category
}

interface CategoryContextType {
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'isDefault' | 'isIncome'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  isLoading: boolean;
  error: string | null;
}

const defaultCategories: Category[] = [
  { 
    id: 'essentials', 
    name: 'Essentials', 
    color: '#2196f3', 
    icon: '🏠', 
    isDefault: true 
  },
  { 
    id: 'wants', 
    name: 'Wants', 
    color: '#ff9800', 
    icon: '🛍️', 
    isDefault: true 
  },
  { 
    id: 'savings', 
    name: 'Savings', 
    color: '#4caf50', 
    icon: '💰', 
    isDefault: true 
  },
  { 
    id: 'income', 
    name: 'Income', 
    color: '#4caf50', 
    icon: '💵', 
    isDefault: true,
    isIncome: true
  }
];

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load categories from Firestore
  useEffect(() => {
    const loadCategories = async () => {
      if (!user) {
        setCategories(defaultCategories);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data()?.categories) {
          // Make sure we always have the default categories
          let loadedCategories = userDoc.data().categories as Category[];
          
          // Ensure all default categories exist
          defaultCategories.forEach(defaultCat => {
            if (!loadedCategories.some(cat => cat.id === defaultCat.id)) {
              loadedCategories.push(defaultCat);
            }
          });
          
          setCategories(loadedCategories);
        } else {
          // If no categories found, use defaults
          await updateDoc(userDocRef, {
            categories: defaultCategories
          });
          setCategories(defaultCategories);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setError('Failed to load categories');
        setCategories(defaultCategories);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, [user]);

  // Save categories to Firestore
  const saveCategories = useCallback(async (newCategories: Category[]) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        categories: newCategories
      });
    } catch (error) {
      console.error('Error saving categories:', error);
      setError('Failed to save categories');
      throw error;
    }
  }, [user]);

  // Add a new category
  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate a unique ID
      const id = Date.now().toString();
      const newCategory: Category = {
        ...category,
        id,
        isDefault: false,
      };

      // Check if category with this name already exists
      if (categories.some(c => c.name.toLowerCase() === category.name.toLowerCase())) {
        throw new Error(`Category "${category.name}" already exists`);
      }

      const newCategories = [...categories, newCategory];
      setCategories(newCategories);
      await saveCategories(newCategories);
    } catch (error) {
      console.error('Error adding category:', error);
      setError(error instanceof Error ? error.message : 'Failed to add category');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [categories, saveCategories]);

  // Update a category
  const updateCategory = useCallback(async (
    id: string, 
    updates: Partial<Omit<Category, 'id' | 'isDefault' | 'isIncome'>>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const categoryIndex = categories.findIndex(cat => cat.id === id);
      if (categoryIndex === -1) {
        throw new Error(`Category with ID "${id}" not found`);
      }

      // Check if name is being updated and if it already exists
      if (updates.name && 
          updates.name !== categories[categoryIndex].name && 
          categories.some(c => c.name.toLowerCase() === updates.name?.toLowerCase())) {
        throw new Error(`Category "${updates.name}" already exists`);
      }

      const updatedCategories = [...categories];
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        ...updates
      };

      setCategories(updatedCategories);
      await saveCategories(updatedCategories);
    } catch (error) {
      console.error('Error updating category:', error);
      setError(error instanceof Error ? error.message : 'Failed to update category');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [categories, saveCategories]);

  // Delete a category
  const deleteCategory = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const categoryToDelete = categories.find(cat => cat.id === id);
      if (!categoryToDelete) {
        throw new Error(`Category with ID "${id}" not found`);
      }

      if (categoryToDelete.isDefault) {
        throw new Error(`Cannot delete default category "${categoryToDelete.name}"`);
      }

      const newCategories = categories.filter(cat => cat.id !== id);
      setCategories(newCategories);
      await saveCategories(newCategories);
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete category');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [categories, saveCategories]);

  // Get a category by ID
  const getCategoryById = useCallback((id: string) => {
    return categories.find(cat => cat.id === id);
  }, [categories]);

  // Get a category by name (case insensitive)
  const getCategoryByName = useCallback((name: string) => {
    return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
  }, [categories]);

  const value = {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryByName,
    isLoading,
    error
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}; 