import { useState, useCallback, useEffect } from 'react';
import type { Transaction } from '../services/fileParser';
import { 
  calculateBudgetSummary, 
  create503020Plan, 
  getBudgetSuggestions,
  type BudgetSummary,
  type BudgetPlan
} from '../services/budgetCalculator';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from './useLocalStorage';
import { useAuth } from '../contexts/AuthContext';
import * as transactionService from '../services/transactionService';
import { collection, getDocs, writeBatch, type QueryDocumentSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import ReactDOM from 'react-dom';
import { useCategorizer } from './useCategories';
import { useCategories } from '../contexts/CategoryContext';
import { v4 as uuidv4 } from 'uuid';
import type { BudgetPreferences } from '../components/BudgetActions';

export function useTransactions(initialBudgetId?: string) {
  // Get current user from auth context
  const { user, isAuthenticated } = useAuth();
  
  // State for transactions and budget data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [budgetPreferences, setBudgetPreferences] = useState<BudgetPreferences | null>(null);
  
  // State for current budget ID
  const [currentBudgetId, setCurrentBudgetId] = useState<string | undefined>(initialBudgetId);
  
  // Get the setCurrentBudgetId function from CategoryContext
  const { setCurrentBudgetId: setCategoriesBudgetId } = useCategories();
  
  // Set categories budget ID on first load if initialBudgetId is provided
  useEffect(() => {
    if (initialBudgetId) {
      setCategoriesBudgetId(initialBudgetId);
    }
  }, [initialBudgetId, setCategoriesBudgetId]);
  
  // Add a reset flag to trigger transaction reload
  const [shouldReload, setShouldReload] = useState(false);

  // Get the categorizing function
  const { categorizeTransaction } = useCategorizer();

  // Update currentBudgetId when initialBudgetId changes
  useEffect(() => {
    console.log('[useTransactions] Budget ID change detected:', {
      currentBudgetId,
      initialBudgetId,
      hasExistingTransactions: transactions.length > 0
    });

    // Only update if initialBudgetId is defined and different from currentBudgetId
    if (initialBudgetId && initialBudgetId !== currentBudgetId) {
      console.log('[useTransactions] Budget ID changed:', {
        from: currentBudgetId,
        to: initialBudgetId
      });
      
      // Immediately clear all data when budget changes
      setTransactions([]);
      setBudgetSummary(null);
      setBudgetPlan(null);
      setSuggestions([]);
      
      // Set the new budget ID
      setCurrentBudgetId(initialBudgetId);
      // Force a reload of transactions
      setShouldReload(true);
    }
  }, [initialBudgetId]); // Only depend on initialBudgetId changes

  // Fallback to localStorage for non-authenticated users or during loading
  const [localTransactions, setLocalTransactions] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.TRANSACTIONS, 
    LEGACY_STORAGE_KEYS.TRANSACTIONS, 
    []
  );
  
  const [localBudgetSummary, setLocalBudgetSummary] = useLocalStorage<BudgetSummary | null>(
    STORAGE_KEYS.SUMMARY, 
    LEGACY_STORAGE_KEYS.SUMMARY, 
    null
  );
  
  const [localBudgetPlan, setLocalBudgetPlan] = useLocalStorage<BudgetPlan | null>(
    STORAGE_KEYS.PLAN, 
    LEGACY_STORAGE_KEYS.PLAN, 
    null
  );
  
  const [localSuggestions, setLocalSuggestions] = useLocalStorage<string[]>(
    STORAGE_KEYS.SUGGESTIONS, 
    LEGACY_STORAGE_KEYS.SUGGESTIONS, 
    []
  );
  
  const [alertMessage, setAlertMessage] = useState<{ 
    type: 'success' | 'error' | 'warning' | 'info'; 
    message: string 
  } | null>(null);

  // Load budget preferences from Firestore
  useEffect(() => {
    const loadBudgetPreferences = async () => {
      if (isAuthenticated && user?.id) {
        try {
          const userDocRef = doc(db, 'users', user.id);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data()?.budgetPreferences) {
            const prefs = userDoc.data().budgetPreferences;
            setBudgetPreferences(prefs);
          }
        } catch (error) {
          console.error('[useTransactions] Error loading budget preferences:', error);
        }
      }
    };

    loadBudgetPreferences();
  }, [isAuthenticated, user]);

  // Listen for budget preferences changes
  useEffect(() => {
    const handlePreferencesChanged = (event: Event) => {
      // TypeScript type assertion
      const customEvent = event as CustomEvent<{ preferences: BudgetPreferences }>;
      const newPreferences = customEvent.detail.preferences;
      
      // Update the preferences state
      setBudgetPreferences(newPreferences);
      
      // Recalculate the budget plan if we have a summary
      if (budgetSummary) {
        const plan = create503020Plan(budgetSummary, { ratios: newPreferences.ratios });
        setBudgetPlan(plan);
        
        // Also update suggestions based on the new plan
        const budgetSuggestions = getBudgetSuggestions(plan);
        setSuggestions(budgetSuggestions);
      }
    };
    
    // Add event listener
    window.addEventListener('budgetPreferencesChanged', handlePreferencesChanged as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('budgetPreferencesChanged', handlePreferencesChanged as EventListener);
    };
  }, [budgetSummary]); // Only re-run if budgetSummary changes

  // Add a transaction
  const addTransaction = useCallback(async (transaction: Transaction) => {
    try {
      // If no category is provided, categorize the transaction
      if (!transaction.category) {
        transaction.category = categorizeTransaction(transaction.description, transaction.amount);
      }
      
      // Ensure the transaction has an ID
      if (!transaction.id) {
        transaction.id = uuidv4();
      }
      
      // Determine if this is an income or expense
      if (!transaction.type) {
        transaction.type = transaction.amount > 0 ? 'income' : 'expense';
      }
      
      setIsLoading(true);
      const newTransaction = {
        ...transaction,
        date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date)
      };
      
      let transactionId: string | undefined;
      
      // If authenticated, save to Firestore
      if (isAuthenticated && user?.id) {
        console.log('Saving to Firestore for user:', user.id);
        transactionId = await transactionService.addTransaction(user.id, newTransaction, currentBudgetId);
        newTransaction.id = transactionId;
        
        // Set shouldReload to true after successful Firestore save
        setShouldReload(true);
      }

      // Update all states in a single batch
      ReactDOM.unstable_batchedUpdates(() => {
        const updatedTransactions = [...transactions, newTransaction];
        
        // Calculate all updates at once
        const summary = calculateBudgetSummary(updatedTransactions);
        const plan = create503020Plan(summary, { ratios: budgetPreferences?.ratios });
        const budgetSuggestions = getBudgetSuggestions(plan);
        
        // Update all states together
        setTransactions(updatedTransactions);
        setBudgetSummary(summary);
        setBudgetPlan(plan);
        setSuggestions(budgetSuggestions);
        setIsLoading(false);
        setAlertMessage({
          type: 'success',
          message: transactions.length === 0 
            ? 'First transaction added! Continue adding transactions to see your budget plan.'
            : 'Transaction added successfully!'
        });
        
        // Update localStorage if needed
        if (!isAuthenticated || !user?.id) {
          setLocalTransactions(updatedTransactions);
          setLocalBudgetSummary(summary);
          setLocalBudgetPlan(plan);
          setLocalSuggestions(budgetSuggestions);
        }
      });
      
    } catch (error) {
      console.error('[useTransactions] Error adding transaction:', error);
      ReactDOM.unstable_batchedUpdates(() => {
        setIsLoading(false);
        setAlertMessage({
          type: 'error',
          message: `Error adding transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      });
    }
  }, [
    transactions,
    isAuthenticated,
    user,
    currentBudgetId,
    setLocalTransactions,
    setLocalBudgetSummary,
    setLocalBudgetPlan,
    setLocalSuggestions,
    setShouldReload,
    categorizeTransaction,
    budgetPreferences
  ]);

  // Load transactions from Firestore when authenticated or when budget changes
  useEffect(() => {
    const loadTransactions = async () => {
      // Skip if missing requirements
      if (!isAuthenticated || !user?.id || !currentBudgetId) {
        console.log('[useTransactions] Skipping transaction load due to missing requirements:', {
          isAuthenticated,
          userId: user?.id,
          currentBudgetId
        });
        return;
      }

      // Skip if already loading
      if (isLoading) {
        console.log('[useTransactions] Skipping load - already loading');
        return;
      }

      console.log('[useTransactions] Loading transactions for budget:', {
        userId: user.id,
        currentBudgetId,
        isAuthenticated
      });
      
      try {
        setIsLoading(true);
        const userTransactions = await transactionService.getUserTransactions(user.id, currentBudgetId);
        
        // Sort transactions by category and order
        const sortedTransactions = [...userTransactions].sort((a, b) => {
          if (a.category !== b.category) {
            return (a.category || '').localeCompare(b.category || '');
          }
          return (a.order || 0) - (b.order || 0);
        });

        // Calculate all updates at once
        const summary = calculateBudgetSummary(sortedTransactions);
        const plan = create503020Plan(summary, { ratios: budgetPreferences?.ratios });
        const budgetSuggestions = getBudgetSuggestions(plan);
        
        // Update all states in a single batch
        ReactDOM.unstable_batchedUpdates(() => {
          setTransactions(sortedTransactions);
          setBudgetSummary(summary);
          setBudgetPlan(plan);
          setSuggestions(budgetSuggestions);
          setIsLoading(false);
          
          // Reset shouldReload flag after loading completes
          if (shouldReload) {
            setShouldReload(false);
          }
        });
       
      } catch (error) {
        console.error('[useTransactions] Error loading transactions:', error);
        ReactDOM.unstable_batchedUpdates(() => {
          setIsLoading(false);
          setShouldReload(false); // Reset even on error
          setAlertMessage({
            type: 'error',
            message: 'Failed to load transactions. Please try again.'
          });
        });
      }
    };
    
    // Load transactions immediately when the budget ID is set and we're not already loading
    // or when shouldReload is true
    if ((currentBudgetId && !isLoading) || shouldReload) {
      loadTransactions();
    }
  }, [currentBudgetId, isAuthenticated, user?.id, shouldReload]); // Remove isLoading from dependencies to prevent infinite loop

  // Update a transaction
  const updateTransaction = useCallback(async (index: number, updatedFields: Partial<Transaction>) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      console.error(`Invalid transaction index: ${index}`);
      setAlertMessage({
        type: 'error',
        message: 'Could not update transaction: Invalid index'
      });
      return;
    }

    const transaction = transactions[index];
    
    // Fix for FirebaseError: Ensure icon is never undefined by replacing with empty string
    if (updatedFields.icon === undefined && 'icon' in updatedFields) {
      updatedFields.icon = '';
    }
    
    const updatedTransaction = {
      ...transaction,
      ...updatedFields
    };
    
    // If date is being updated, ensure it's in the correct format
    if (updatedFields.date !== undefined) {
      if (typeof updatedFields.date === 'number') {
        // If it's a day number, keep it as-is
        updatedTransaction.date = updatedFields.date;
      } else if (updatedFields.date instanceof Date) {
        // If it's already a Date object, keep it as-is
        updatedTransaction.date = updatedFields.date;
      } else {
        // If it's a string or something else, try to convert to Date
        try {
          updatedTransaction.date = new Date(updatedFields.date);
        } catch (e) {
          console.error('Invalid date format:', updatedFields.date, e);
        }
      }
    }
    
    try {
      // If authenticated and transaction has an ID, update in Firestore
      if (isAuthenticated && user?.id && transaction.id) {
        setIsLoading(true);
        // Clean updatedFields to ensure no undefined values are sent to Firestore
        const cleanUpdatedFields = Object.fromEntries(
          Object.entries(updatedFields).map(([key, value]) => {
            // Replace undefined values with empty strings for string fields like icon
            if (value === undefined && (key === 'icon' || key === 'description')) {
              return [key, ''];
            }
            return [key, value];
          })
        );
        
        // Pass the budgetId for updating in the specific budget collection
        await transactionService.updateTransaction(transaction.id, cleanUpdatedFields, user.id, currentBudgetId);
      } 
      
      // Update local state
      const updatedTransactions = [...transactions];
      updatedTransactions[index] = updatedTransaction;
      setTransactions(updatedTransactions);
      
      // If not authenticated, update in localStorage
      if (!isAuthenticated || !user?.id) {
        setLocalTransactions(updatedTransactions);
      }
      
      // Recalculate budget
      try {
        // Calculate budget summary
        const summary = calculateBudgetSummary(updatedTransactions);
        setBudgetSummary(summary);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user?.id) {
          setLocalBudgetSummary(summary);
        }
        
        // Create budget plan
        const plan = create503020Plan(summary, { ratios: budgetPreferences?.ratios });
        setBudgetPlan(plan);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user?.id) {
          setLocalBudgetPlan(plan);
        }
        
        // Get suggestions
        const budgetSuggestions = getBudgetSuggestions(plan);
        setSuggestions(budgetSuggestions);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user?.id) {
          setLocalSuggestions(budgetSuggestions);
        }
        
        setAlertMessage({
          type: 'success',
          message: 'Transaction updated successfully!'
        });
      } catch (error) {
        console.error('[useTransactions] Error recalculating budget:', error);
        setAlertMessage({
          type: 'error',
          message: 'Error updating budget calculations. Please try again.'
        });
      }
    } catch (error) {
      console.error('[useTransactions] Error updating transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error updating transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      if (isAuthenticated && user?.id) {
        setIsLoading(false);
      }
    }
  }, [
    transactions, 
    isAuthenticated, 
    user, 
    setLocalTransactions, 
    setLocalBudgetSummary, 
    setLocalBudgetPlan, 
    setLocalSuggestions,
    currentBudgetId,  // Add currentBudgetId dependency
    budgetPreferences
  ]);

  // Update transaction by description
  const updateTransactionByDescription = useCallback((description: string, updates: Partial<Transaction>) => {
    // Find the transaction index
    const index = transactions.findIndex(t => t.description === description);
    
    // If the transaction exists, update it
    if (index !== -1) {
      updateTransaction(index, updates);
    } else {
      console.warn(`Transaction with description "${description}" not found`);
    }
  }, [transactions, updateTransaction]);

  // Get transactions by category
  const getTransactionsByCategory = useCallback(() => {
    // Create an object to hold transactions by category
    const categories = {} as Record<string, Transaction[]>;
    
    // Loop through transactions and group by category
    transactions.forEach(transaction => {
      // Skip income transactions as they are handled separately
      if (transaction.category !== 'Income' && transaction.category) {
        // Ensure category exists in the object
        if (!categories[transaction.category]) {
          categories[transaction.category] = [];
        }
        // Add transaction to appropriate category
        categories[transaction.category].push(transaction);
      }
    });
    
    return categories;
  }, [transactions]);

  // Get total income
  const getTotalIncome = useCallback(() => {
    return transactions
      .filter(t => t.category === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Delete a transaction
  const deleteTransaction = useCallback(async (index: number) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      console.error(`Invalid transaction index: ${index}`);
      setAlertMessage({
        type: 'error',
        message: 'Could not delete transaction: Invalid index'
      });
      return;
    }

    const transaction = transactions[index];
    
    try {
      // If authenticated and transaction has an ID, delete from Firestore
      if (isAuthenticated && user?.id && transaction.id) {
        setIsLoading(true);
        // Pass budgetId to delete from the specific budget collection
        await transactionService.deleteTransaction(transaction.id, user.id, currentBudgetId);
      }
      
      // Update local state
      const updatedTransactions = transactions.filter((_, i) => i !== index);
      setTransactions(updatedTransactions);
      
      // If not authenticated, update in localStorage
      if (!isAuthenticated || !user?.id) {
        setLocalTransactions(updatedTransactions);
      }
      
      // Recalculate budget
      try {
        // If no transactions left, clear everything
        if (updatedTransactions.length === 0) {
          setBudgetSummary(null);
          setBudgetPlan(null);
          setSuggestions([]);
          
          // Update localStorage if needed
          if (!isAuthenticated || !user?.id) {
            setLocalBudgetSummary(null);
            setLocalBudgetPlan(null);
            setLocalSuggestions([]);
          }
        } else {
          // Calculate new budget summary
          const summary = calculateBudgetSummary(updatedTransactions);
          setBudgetSummary(summary);
          
          // Save to localStorage if not authenticated
          if (!isAuthenticated || !user?.id) {
            setLocalBudgetSummary(summary);
          }
          
          // Create new budget plan
          const plan = create503020Plan(summary, { ratios: budgetPreferences?.ratios });
          setBudgetPlan(plan);
          
          // Save to localStorage if not authenticated
          if (!isAuthenticated || !user?.id) {
            setLocalBudgetPlan(plan);
          }
          
          // Generate new suggestions
          const budgetSuggestions = getBudgetSuggestions(plan);
          setSuggestions(budgetSuggestions);
          
          // Save to localStorage if not authenticated
          if (!isAuthenticated || !user?.id) {
            setLocalSuggestions(budgetSuggestions);
          }
        }
        
        setAlertMessage({
          type: 'success',
          message: 'Transaction deleted successfully!'
        });
      } catch (error) {
        console.error('[useTransactions] Error recalculating budget after deletion:', error);
        setAlertMessage({
          type: 'error',
          message: 'Error updating budget calculations. Please try again.'
        });
      }
    } catch (error) {
      console.error('[useTransactions] Error deleting transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error deleting transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      if (isAuthenticated && user?.id) {
        setIsLoading(false);
      }
    }
  }, [
    transactions, 
    isAuthenticated, 
    user, 
    setLocalTransactions, 
    setLocalBudgetSummary, 
    setLocalBudgetPlan, 
    setLocalSuggestions,
    currentBudgetId,  // Add currentBudgetId dependency
    budgetPreferences
  ]);

  // Reset all transactions
  const resetTransactions = useCallback(async () => {
    try {
      // If user is authenticated, delete all Firebase transactions
      if (isAuthenticated && user?.id) {
        setIsLoading(true);
        
        if (currentBudgetId) {
          // Get all transactions for this budget
          const allTransactions = await transactionService.getUserTransactions(user.id, currentBudgetId);
          
          // Delete each transaction
          const deletePromises = allTransactions.map(transaction => {
            if (transaction.id) {
              return transactionService.deleteTransaction(transaction.id, user.id, currentBudgetId);
            }
            return Promise.resolve();
          });
          
          await Promise.all(deletePromises);
        } else {
          // Get all transactions from the legacy path
          const allTransactions = await transactionService.getUserTransactions(user.id);
          
          // Delete each transaction
          const deletePromises = allTransactions.map(transaction => {
            if (transaction.id) {
              return transactionService.deleteTransaction(transaction.id, user.id);
            }
            return Promise.resolve();
          });
          
          await Promise.all(deletePromises);
        }
      }
      
      // Clear local state
      setTransactions([]);
      setBudgetSummary(null);
      setBudgetPlan(null);
      setSuggestions([]);
      
      // Clear localStorage if not authenticated or as a backup
      setLocalTransactions([]);
      setLocalBudgetSummary(null);
      setLocalBudgetPlan(null);
      setLocalSuggestions([]);
      
      setAlertMessage({
        type: 'success',
        message: 'All transactions have been cleared.'
      });
    } catch (error) {
      console.error('[useTransactions] Error resetting transactions:', error);
      setAlertMessage({
        type: 'error',
        message: `Error resetting budget: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated, 
    user, 
    setLocalTransactions, 
    setLocalBudgetSummary, 
    setLocalBudgetPlan, 
    setLocalSuggestions,
    currentBudgetId  // Add currentBudgetId dependency
  ]);

  // Move a transaction to a new category
  const moveTransaction = useCallback(async (index: number, targetCategory: string) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      console.error(`Invalid transaction index: ${index}`);
      return;
    }
    
    // Validate the target category
    if (!['Income', 'Essentials', 'Wants', 'Savings'].includes(targetCategory)) {
      console.error(`Invalid target category: ${targetCategory}`);
      return;
    }

    // Get the transaction
    const transaction = transactions[index];
    
    try {
      if (isAuthenticated && user?.id && transaction.id) {
        setIsLoading(true);
        await transactionService.moveTransactionToCategory(
          transaction.id, 
          targetCategory as 'Income' | 'Essentials' | 'Wants' | 'Savings',
          user.id,
          currentBudgetId  // Pass currentBudgetId
        );
      }
      
      // Update local state
      await updateTransaction(index, { 
        category: targetCategory as 'Income' | 'Essentials' | 'Wants' | 'Savings' 
      });
    } catch (error) {
      console.error('Error moving transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error moving transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [transactions, updateTransaction, isAuthenticated, user, setAlertMessage, currentBudgetId]);

  // Reorder transactions within a category
  const reorderTransactions = useCallback(async (category: string, orderedTransactionIds: string[]) => {
    try {
      // If authenticated, update in Firestore
      if (isAuthenticated && user?.id) {
        setIsLoading(true);
        await transactionService.reorderTransactions(
          user.id, 
          category, 
          orderedTransactionIds,
          currentBudgetId  // Pass currentBudgetId
        );
      }
      
      // Update local state
      const updatedTransactions = [...transactions];
      
      // Create a map of id to new order
      const orderMap = new Map<string, number>();
      orderedTransactionIds.forEach((id, index) => {
        orderMap.set(id, index + 1);
      });
      
      // Update the order of each transaction
      updatedTransactions.forEach(transaction => {
        if (transaction.category === category && transaction.id && orderMap.has(transaction.id)) {
          transaction.order = orderMap.get(transaction.id);
        }
      });
      
      setTransactions(updatedTransactions);
      
      // If not authenticated, update in localStorage
      if (!isAuthenticated || !user?.id) {
        setLocalTransactions(updatedTransactions);
      }
      
      setAlertMessage({
        type: 'success',
        message: 'Transaction order updated successfully!'
      });
    } catch (error) {
      console.error('[useTransactions] Error reordering transactions:', error);
      setAlertMessage({
        type: 'error',
        message: 'Failed to reorder transactions. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    transactions, 
    isAuthenticated, 
    user, 
    setLocalTransactions, 
    setAlertMessage,
    currentBudgetId  // Add currentBudgetId dependency
  ]);

  // Update all transactions with the same name to have the same icon
  const updateAllTransactionsWithSameName = useCallback(async (description: string, icon: string, excludeId?: string) => {
    if (!description) {
      console.log('[DEBUG] updateAllTransactionsWithSameName called with empty description');
      return;
    }
    
    // Ensure icon is never undefined - always use empty string as fallback
    const safeIcon = icon || '';
    
    console.log(`[DEBUG] Starting updateAllTransactionsWithSameName for "${description}" with icon "${safeIcon}"`);
    console.log(`[DEBUG] Total transactions before filtering: ${transactions.length}`);
    
    const normalizedDescription = description.trim().toLowerCase();
    const transactionsToUpdate: { index: number, transaction: Transaction }[] = [];
    
    // Find all transactions with the same description
    transactions.forEach((transaction, index) => {
      if (excludeId && transaction.id === excludeId) {
        console.log(`[DEBUG] Skipping transaction with excludeId: ${excludeId}`);
        return;
      }
      
      const transactionDescription = transaction.description.trim().toLowerCase();
      
      console.log(`[DEBUG] Checking transaction: "${transactionDescription}" against "${normalizedDescription}"`);
      console.log(`[DEBUG] Current icon: "${transaction.icon}", New icon: "${safeIcon}"`);
      
      if (transactionDescription === normalizedDescription) {
        console.log(`[DEBUG] Found matching description`);
        
        if (transaction.icon !== safeIcon) {
          console.log(`[DEBUG] Icons differ, will update`);
          transactionsToUpdate.push({ index, transaction });
        } else {
          console.log(`[DEBUG] Icons are the same, skipping update`);
        }
      }
    });
    
    console.log(`[DEBUG] Found ${transactionsToUpdate.length} transactions with name "${description}" to update icon`);
    
    if (transactionsToUpdate.length === 0) {
      console.log(`[DEBUG] No transactions to update for "${description}"`);
      return 0;
    }
    
    // Print detailed info about transactions to be updated
    console.log('[DEBUG] Transactions to update:', transactionsToUpdate.map(({ transaction }) => ({
      id: transaction.id,
      description: transaction.description,
      category: transaction.category,
      icon: transaction.icon,
      newIcon: safeIcon
    })));
    
    // Create a deep copy of transactions to ensure state changes properly reflect in UI
    const updatedTransactions = [...transactions];
    
    // First, immediately update all transactions in local state for a quick UI refresh
    transactionsToUpdate.forEach(({ index, transaction }) => {
      updatedTransactions[index] = {
        ...transaction,
        icon: safeIcon
      };
      console.log(`[DEBUG] Updated transaction at index ${index} in local state`);
    });
    
    // Force a state update immediately to refresh the UI with the new icons
    console.log('[DEBUG] Setting transactions state with updated icons');
    setTransactions([...updatedTransactions]);
    
    // For synchronized updates that include Firestore/database updates, process in parallel
    try {
      console.log('[DEBUG] Starting database updates for matching transactions');
      
      const updatePromises = transactionsToUpdate.map(async ({ index, transaction }) => {
        // Return a promise for the database update
        if (isAuthenticated && user?.id && transaction.id && currentBudgetId) {
          console.log(`[DEBUG] Updating transaction in Firestore: ${transaction.id}`);
          return transactionService.updateTransaction(
            transaction.id, 
            { icon: safeIcon }, 
            user.id, 
            currentBudgetId
          );
        }
        console.log('[DEBUG] Skipping database update - not authenticated or missing ID');
        return Promise.resolve();
      });
      
      // Wait for all database updates to complete
      await Promise.all(updatePromises);
      console.log('[DEBUG] All database updates completed');
      
      // After database updates, trigger another state refresh for good measure
      console.log('[DEBUG] Refreshing state after database updates');
      setTransactions(prev => [...prev]);
      
      // Dispatch custom events for different components to react to the change
      const affectedCategories = [...new Set(transactionsToUpdate.map(item => item.transaction.category))];
      console.log(`[DEBUG] Affected categories: ${JSON.stringify(affectedCategories)}`);
      
      affectedCategories.forEach(category => {
        // Dispatch events for each affected category
        if (category) {
          try {
            console.log(`[DEBUG] Dispatching events for category ${category}`);
            
            // First event for TransactionTable
            const event1 = new CustomEvent('transactionIconsUpdated', {
              detail: { category, icon: safeIcon, description }
            });
            document.dispatchEvent(event1);
            console.log(`[DEBUG] Dispatched transactionIconsUpdated event`);
            
            // Second event for general UI refresh
            const event2 = new CustomEvent('forceTransactionRefresh', {
              detail: { category, icon: safeIcon, description, timestamp: Date.now() }
            });
            document.dispatchEvent(event2);
            console.log(`[DEBUG] Dispatched forceTransactionRefresh event`);
            
            console.log(`[DEBUG] Dispatched refresh events for category ${category}`);
          } catch (error) {
            console.error(`[DEBUG] Error dispatching events for category ${category}:`, error);
          }
        }
      });
      
      return transactionsToUpdate.length;
    } catch (error) {
      console.error('[DEBUG] Error updating transactions with same name:', error);
      // Still dispatch events even if there was an error with some updates
      try {
        const refreshEvent = new CustomEvent('transactionIconsUpdated', {
          detail: { category: 'all', icon: safeIcon, description, timestamp: Date.now() }
        });
        document.dispatchEvent(refreshEvent);
        console.log('[DEBUG] Dispatched fallback event after error');
      } catch (e) {
        console.error('[DEBUG] Error dispatching fallback event:', e);
      }
      return undefined;
    }
  }, [transactions, isAuthenticated, user, currentBudgetId, setTransactions]);

  return {
    transactions,
    budgetSummary,
    budgetPlan, 
    suggestions,
    alertMessage,
    isLoading,
    currentBudgetId,
    setCurrentBudgetId,
    setAlertMessage,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateTransactionByDescription,
    getTransactionsByCategory,
    getTotalIncome,
    resetTransactions,
    moveTransaction,
    reorderTransactions,
    updateAllTransactionsWithSameName,
    budgetPreferences
  };
} 