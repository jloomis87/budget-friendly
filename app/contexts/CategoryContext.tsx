import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from './AuthContext';

export interface Category {
  id: string; // Unique identifier
  name: string; // Display name
  color: string; // Color for UI elements
  icon: string; // Emoji or icon identifier
  isDefault: boolean; // Whether this is a default category (can be renamed but not deleted)
  isIncome?: boolean; // Special flag for income category
  percentage?: number; // Allocation percentage of budget/income
  budgetId?: string; // The budget this category belongs to
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
  setCurrentBudgetId: (budgetId: string) => void;
  currentBudgetId: string | null;
}

const defaultCategories: Omit<Category, 'budgetId'>[] = [
  { 
    id: 'essentials', 
    name: 'Essentials', 
    color: '#2196f3', 
    icon: '🏠', 
    isDefault: true,
    percentage: 50
  },
  { 
    id: 'wants', 
    name: 'Wants', 
    color: '#ff9800', 
    icon: '🛍️', 
    isDefault: true,
    percentage: 30
  },
  { 
    id: 'savings', 
    name: 'Savings', 
    color: '#4caf50', 
    icon: '💰', 
    isDefault: true,
    percentage: 20
  },
  { 
    id: 'income', 
    name: 'Income', 
    color: '#4caf50', 
    icon: '💵', 
    isDefault: true,
    isIncome: true,
    percentage: 0
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBudgetId, setCurrentBudgetId] = useState<string | null>(null);
  const { user } = useAuth();

  // Load categories from Firestore when currentBudgetId changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!user || !currentBudgetId) {
        // If no user or budget is selected, use defaults (without saving to database)
        setCategories(defaultCategories.map(cat => ({ ...cat, budgetId: currentBudgetId || 'default' })));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Look for categories specific to this budget
        const budgetCategoriesRef = doc(db, 'users', user.id, 'budgets', currentBudgetId);
        const budgetDoc = await getDoc(budgetCategoriesRef);
        
        if (budgetDoc.exists() && budgetDoc.data()?.categories) {
          // Budget has its own categories
          const loadedCategories = budgetDoc.data().categories as Category[];
          
          // Ensure all default categories exist
          const mergedCategories = [...loadedCategories];
          defaultCategories.forEach(defaultCat => {
            if (!mergedCategories.some(cat => cat.id === defaultCat.id)) {
              mergedCategories.push({
                ...defaultCat,
                budgetId: currentBudgetId
              });
            }
          });
          
          setCategories(mergedCategories);
        } else {
          // No categories found for this budget, create defaults
          const categoriesWithBudgetId = defaultCategories.map(cat => ({
            ...cat,
            budgetId: currentBudgetId
          }));
          
          // Save defaults to this budget
          await updateDoc(budgetCategoriesRef, {
            categories: categoriesWithBudgetId
          });
          
          setCategories(categoriesWithBudgetId);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setError('Failed to load categories');
        
        // Use defaults as fallback
        setCategories(defaultCategories.map(cat => ({
          ...cat,
          budgetId: currentBudgetId
        })));
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, [user, currentBudgetId]);

  // Save categories to Firestore - now saving to the budget's document
  const saveCategories = useCallback(async (newCategories: Category[]) => {
    if (!user || !currentBudgetId) return;

    try {
      const budgetCategoriesRef = doc(db, 'users', user.id, 'budgets', currentBudgetId);
      await updateDoc(budgetCategoriesRef, {
        categories: newCategories
      });
    } catch (error) {
      console.error('Error saving categories:', error);
      setError('Failed to save categories');
      throw error;
    }
  }, [user, currentBudgetId]);

  // Add a new category to the current budget
  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    if (!currentBudgetId) {
      throw new Error('No active budget to add category to');
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Generate a unique ID
      const id = Date.now().toString();
      const newCategory: Category = {
        ...category,
        id,
        isDefault: false,
        budgetId: currentBudgetId
      };

      // Check if category with this name already exists
      if (categories.some(c => c.name.toLowerCase() === category.name.toLowerCase())) {
        throw new Error(`Category "${category.name}" already exists in this budget`);
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
  }, [categories, saveCategories, currentBudgetId]);

  // Update a category in the current budget
  const updateCategory = useCallback(async (
    id: string, 
    updates: Partial<Omit<Category, 'id' | 'isDefault' | 'isIncome'>>
  ) => {
    if (!currentBudgetId) {
      throw new Error('No active budget to update category in');
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const categoryIndex = categories.findIndex(cat => cat.id === id);
      if (categoryIndex === -1) {
        throw new Error(`Category with ID "${id}" not found in this budget`);
      }

      // Check if name is being updated and if it already exists
      if (updates.name && 
          updates.name !== categories[categoryIndex].name && 
          categories.some(c => c.name.toLowerCase() === updates.name?.toLowerCase())) {
        throw new Error(`Category "${updates.name}" already exists in this budget`);
      }

      const updatedCategories = [...categories];
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        ...updates,
        budgetId: currentBudgetId // Ensure budgetId remains correct
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
  }, [categories, saveCategories, currentBudgetId]);

  // Delete a category from the current budget
  const deleteCategory = useCallback(async (id: string) => {
    if (!currentBudgetId) {
      throw new Error('No active budget to delete category from');
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const categoryToDelete = categories.find(cat => cat.id === id);
      if (!categoryToDelete) {
        throw new Error(`Category with ID "${id}" not found in this budget`);
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
  }, [categories, saveCategories, currentBudgetId]);

  // Get a category by ID (from current budget only)
  const getCategoryById = useCallback((id: string) => {
    return categories.find(cat => cat.id === id);
  }, [categories]);

  // Get a category by name (case insensitive, from current budget only)
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
    error,
    setCurrentBudgetId,
    currentBudgetId
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}; 