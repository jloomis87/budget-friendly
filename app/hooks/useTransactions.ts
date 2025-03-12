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
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export function useTransactions() {
  // Get current user from auth context
  const { user, isAuthenticated } = useAuth();
  
  // State for transactions and budget data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  // Add a reset flag to trigger transaction reload
  const [shouldReload, setShouldReload] = useState(false);

  // Load transactions from Firestore when authenticated
  useEffect(() => {
    const loadTransactions = async () => {
      // Only proceed if we have both authentication and a valid user ID
      if (isAuthenticated && user?.id) {
        console.log('[useTransactions] Loading transactions for user:', user.id);
        
        setIsLoading(true);
        try {
          const userTransactions = await transactionService.getUserTransactions(user.id);
          console.log('[useTransactions] Loaded transactions:', userTransactions.length);
          
          setTransactions(userTransactions);
          
          if (userTransactions.length > 0) {
            const summary = calculateBudgetSummary(userTransactions);
            setBudgetSummary(summary);
            
            const plan = create503020Plan(summary);
            setBudgetPlan(plan);
            
            const budgetSuggestions = getBudgetSuggestions(plan);
            setSuggestions(budgetSuggestions);
          } else {
            setBudgetSummary(null);
            setBudgetPlan(null);
            setSuggestions([]);
          }
        } catch (error) {
          console.error('[useTransactions] Error loading transactions:', error);
          setTransactions([]);
          setBudgetSummary(null);
          setBudgetPlan(null);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
          setShouldReload(false);
        }
      } else if (!isAuthenticated) {
        // If not authenticated, use local storage
        console.log('[useTransactions] Using local storage data (not authenticated)');
        setTransactions(localTransactions);
        setBudgetSummary(localBudgetSummary);
        setBudgetPlan(localBudgetPlan);
        setSuggestions(localSuggestions);
      } else {
        // User is authenticated but id is not yet available
        console.log('[useTransactions] Waiting for user ID to be available...');
        setIsLoading(true);
      }
    };
    
    loadTransactions();
  }, [isAuthenticated, user?.id, localTransactions, localBudgetSummary, localBudgetPlan, localSuggestions, shouldReload]);

  // Add a transaction
  const addTransaction = useCallback(async (transaction: Transaction) => {
    try {
      console.log('[useTransactions] Starting to add transaction:', transaction);
      console.log('[useTransactions] Auth state:', { isAuthenticated, userId: user?.id });
      
      const newTransaction = {
        ...transaction,
        date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date)
      };
      
      let transactionId: string | undefined;
      
      // If authenticated, save to Firestore
      if (isAuthenticated && user?.id) {
        console.log('[useTransactions] User authenticated, saving to Firebase. User ID:', user.id);
        setIsLoading(true);
        
        try {
          transactionId = await transactionService.addTransaction(user.id, newTransaction);
          console.log('[useTransactions] Transaction saved to Firebase with ID:', transactionId);
          
          // Add the id to the transaction
          newTransaction.id = transactionId;
        } catch (firebaseError) {
          console.error('[useTransactions] Firebase error:', firebaseError);
          throw firebaseError;
        }
      } else {
        console.log('[useTransactions] User not authenticated or no ID, transaction will be saved locally only');
      }
      
      // Update local state
      const updatedTransactions = [...transactions, newTransaction];
      console.log('[useTransactions] Updating local state with new transaction. Total transactions:', updatedTransactions.length);
      setTransactions(updatedTransactions);
      
      // If not authenticated, save to localStorage
      if (!isAuthenticated || !user?.id) {
        console.log('[useTransactions] Saving transaction to localStorage');
        setLocalTransactions(updatedTransactions);
      }
      
      // Process transactions for budget calculations
      try {
        console.log('[useTransactions] Processing budget calculations');
        // Calculate budget summary
        const summary = calculateBudgetSummary(updatedTransactions);
        setBudgetSummary(summary);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user?.id) {
          setLocalBudgetSummary(summary);
        }
        
        // Create budget plan
        const plan = create503020Plan(summary);
        setBudgetPlan(plan);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user?.id) {
          setLocalBudgetPlan(plan);
        }
        
        // Generate suggestions
        const budgetSuggestions = getBudgetSuggestions(plan);
        setSuggestions(budgetSuggestions);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user?.id) {
          setLocalSuggestions(budgetSuggestions);
        }
        
        // Show success message
        setAlertMessage({
          type: 'success',
          message: transactions.length === 0 
            ? 'First transaction added! Continue adding transactions to see your budget plan.'
            : 'Transaction added successfully!'
        });
        
        // Trigger a reload to ensure Firebase data is in sync
        setShouldReload(true);
        
      } catch (error) {
        console.error('[useTransactions] Error processing transaction:', error);
        setAlertMessage({
          type: 'error',
          message: 'Error processing transaction. Please try again.'
        });
      }
    } catch (error) {
      console.error('[useTransactions] Error adding transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error adding transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    setShouldReload
  ]);

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
        console.log('[useTransactions] Updating transaction in Firebase:', {
          transactionId: transaction.id,
          userId: user.id,
          updates: updatedFields
        });
        setIsLoading(true);
        await transactionService.updateTransaction(transaction.id, updatedFields, user.id);
      } else {
        console.log('[useTransactions] Skipping Firebase update:', {
          isAuthenticated,
          hasUserId: Boolean(user?.id),
          hasTransactionId: Boolean(transaction.id)
        });
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
        const plan = create503020Plan(summary);
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
        console.error('Error processing transactions:', error);
        setAlertMessage({
          type: 'error',
          message: `Error updating transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      } finally {
        if (isAuthenticated && user?.id) {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error updating transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
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
    setLocalSuggestions
  ]);

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
        await transactionService.deleteTransaction(transaction.id, user.id);
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
        // Calculate budget summary
        const summary = calculateBudgetSummary(updatedTransactions);
        setBudgetSummary(summary);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user?.uid) {
          setLocalBudgetSummary(summary);
        }
        
        // Create budget plan
        const plan = create503020Plan(summary);
        setBudgetPlan(plan);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user?.uid) {
          setLocalBudgetPlan(plan);
        }
        
        // Get suggestions
        const budgetSuggestions = getBudgetSuggestions(plan);
        setSuggestions(budgetSuggestions);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user?.uid) {
          setLocalSuggestions(budgetSuggestions);
        }
        
        setAlertMessage({
          type: 'success',
          message: 'Transaction deleted successfully!'
        });
      } catch (error) {
        console.error('Error processing transactions after deletion:', error);
        setAlertMessage({
          type: 'error',
          message: `Error updating budget after deletion: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      } finally {
        if (isAuthenticated && user?.uid) {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error deleting transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      if (isAuthenticated && user?.uid) {
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
    setLocalSuggestions
  ]);

  // Update transaction by description (for speech recognition)
  const updateTransactionByDescription = useCallback((description: string, newAmount: number) => {
    // Clean up the description for better matching
    const cleanDescription = description
      .replace(/^(the|my)\s+/i, '') // Remove "the" or "my" from the beginning
      .replace(/\s+(expense|transaction|bill|payment)$/i, '') // Remove trailing "expense", "transaction", etc.
      .trim();

    // Try exact match first (case-insensitive)
    let transactionIndex = transactions.findIndex(t => 
      t.description.toLowerCase() === cleanDescription.toLowerCase()
    );

    // If no exact match, try fuzzy matching
    if (transactionIndex === -1) {
      // Try to find a transaction that contains the description as a substring
      transactionIndex = transactions.findIndex(t => 
        t.description.toLowerCase().includes(cleanDescription.toLowerCase())
      );

      // If still no match, try to find a transaction where the description contains any word from the search
      if (transactionIndex === -1) {
        const searchWords = cleanDescription.toLowerCase().split(/\s+/).filter(word => word.length > 2);

        if (searchWords.length > 0) {
          for (let i = 0; i < transactions.length; i++) {
            const transactionDesc = transactions[i].description.toLowerCase();

            // Check if any search word is in the transaction description
            for (const word of searchWords) {
              if (transactionDesc.includes(word)) {
                transactionIndex = i;
                break;
              }
            }

            if (transactionIndex !== -1) break;
          }
        }
      }
    }

    if (transactionIndex !== -1) {
      const transaction = transactions[transactionIndex];
      const isIncome = transaction.category === 'Income';
      const signedAmount = isIncome ? Math.abs(newAmount) : -Math.abs(newAmount);

      updateTransaction(transactionIndex, { amount: signedAmount });
      return true;
    }
    
    return false;
  }, [transactions, updateTransaction]);

  // Group transactions by category
  const getTransactionsByCategory = useCallback(() => {
    const grouped: Record<string, Transaction[]> = {
      'Essentials': [],
      'Wants': [],
      'Savings': []
    };
    
    console.log('[useTransactions] getTransactionsByCategory - Total transactions:', transactions.length);
    
    // Group transactions (excluding Income)
    transactions.forEach(transaction => {
      console.log('[useTransactions] Processing transaction:', transaction);
      
      if (transaction.category && transaction.category !== 'Income' && 
          (transaction.category === 'Essentials' || 
           transaction.category === 'Wants' || 
           transaction.category === 'Savings')) {
        grouped[transaction.category].push(transaction);
      } else {
        console.log('[useTransactions] Skipped transaction - Category:', transaction.category);
      }
    });
    
    console.log('[useTransactions] Grouped transactions count:', {
      Essentials: grouped['Essentials'].length,
      Wants: grouped['Wants'].length,
      Savings: grouped['Savings'].length
    });
    
    return grouped;
  }, [transactions]);
  
  // Calculate total income
  const getTotalIncome = useCallback(() => {
    return transactions
      .filter(t => t.category === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);
  
  // Reset all data
  const resetTransactions = useCallback(async () => {
    // Check for both authentication and valid user ID
    if (!isAuthenticated || !user?.id) {
      console.log('[resetTransactions] Not authenticated or no user ID, skipping Firebase deletion');
      // Reset local storage only
      setLocalTransactions([]);
      setLocalBudgetSummary(null);
      setLocalBudgetPlan(null);
      setLocalSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      console.log('[resetTransactions] Starting reset for user:', user.id);

      // Delete all transactions from Firebase for the current user
      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      console.log('[resetTransactions] Fetching transactions from:', transactionsRef.path);
      
      const querySnapshot = await getDocs(transactionsRef);
      console.log('[resetTransactions] Found transactions:', querySnapshot.size);

      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        let deleteCount = 0;

        querySnapshot.forEach((doc) => {
          console.log('[resetTransactions] Adding doc to batch delete:', doc.id);
          batch.delete(doc.ref);
          deleteCount++;
        });

        console.log(`[resetTransactions] Attempting to delete ${deleteCount} transactions`);
        await batch.commit();
        console.log('[resetTransactions] Batch delete completed successfully');

        // Verify deletion
        const verifySnapshot = await getDocs(transactionsRef);
        if (verifySnapshot.empty) {
          console.log('[resetTransactions] Verification: All transactions deleted successfully');
        } else {
          console.warn('[resetTransactions] Verification: Some transactions still exist:', verifySnapshot.size);
        }
      } else {
        console.log('[resetTransactions] No transactions found to delete');
      }

      // Reset all state and trigger reload
      console.log('[resetTransactions] Resetting application state');
      setTransactions([]);
      setBudgetSummary(null);
      setBudgetPlan(null);
      setSuggestions([]);
      setShouldReload(true);

      setAlertMessage({
        type: 'success',
        message: 'Your budget has been reset successfully.'
      });

    } catch (error) {
      console.error('[resetTransactions] Error details:', {
        error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      setAlertMessage({
        type: 'error',
        message: 'Failed to reset your budget. Please try again.'
      });
      throw error;
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
    setAlertMessage,
    setIsLoading
  ]);
  
  // Move a transaction to a different category
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
        await transactionService.moveTransactionToCategory(transaction.id, targetCategory, user.id);
      }
      
      // Update local state
      await updateTransaction(index, { category: targetCategory });
    } catch (error) {
      console.error('Error moving transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error moving transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [transactions, updateTransaction, isAuthenticated, user, setAlertMessage]);

  return {
    transactions,
    budgetSummary,
    budgetPlan, 
    suggestions,
    alertMessage,
    isLoading,
    setAlertMessage,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateTransactionByDescription,
    getTransactionsByCategory,
    getTotalIncome,
    resetTransactions,
    moveTransaction
  };
} 