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

  // Load transactions from Firestore when authenticated
  useEffect(() => {
    const loadTransactions = async () => {
      if (isAuthenticated && user) {
        console.log('[useTransactions] User is authenticated, loading transactions from Firebase');
        console.log('[useTransactions] Current user:', user);
        
        setIsLoading(true);
        try {
          console.log('[useTransactions] Fetching transactions for user ID:', user.id);
          const userTransactions = await transactionService.getUserTransactions(user.id);
          console.log('[useTransactions] Transactions fetched successfully:', userTransactions.length);
          
          // Log some info about the transactions to help with debugging
          if (userTransactions.length > 0) {
            console.log('[useTransactions] First few transactions:', userTransactions.slice(0, 3));
          }
          
          // This is a successful result, even if the array is empty (user has no transactions)
          setTransactions(userTransactions);
          
          // Process loaded transactions
          if (userTransactions.length > 0) {
            console.log('[useTransactions] Processing loaded transactions');
            // Calculate budget summary
            const summary = calculateBudgetSummary(userTransactions);
            setBudgetSummary(summary);
            
            // Create budget plan
            const plan = create503020Plan(summary);
            setBudgetPlan(plan);
            
            // Generate suggestions
            const budgetSuggestions = getBudgetSuggestions(plan);
            setSuggestions(budgetSuggestions);
            
            console.log('[useTransactions] Transaction processing complete');
          } else {
            // Clear any previous data if there are no transactions
            console.log('[useTransactions] No transactions found, clearing budget data');
            setBudgetSummary(null);
            setBudgetPlan(null);
            setSuggestions([]);
          }
        } catch (error) {
          // Log the detailed error for debugging
          console.error('[useTransactions] Detailed error loading transactions:', error);
          if (error instanceof Error) {
            console.error('[useTransactions] Error name:', error.name);
            console.error('[useTransactions] Error message:', error.message);
            console.error('[useTransactions] Error stack:', error.stack);
          }
          
          // For now, just clear the data without showing an error message
          // This will prevent the error from displaying to users
          setTransactions([]);
          setBudgetSummary(null);
          setBudgetPlan(null);
          setSuggestions([]);
          
          // Temporarily commented out until we can fix the root cause
          /*
          setAlertMessage({
            type: 'error',
            message: 'Failed to load your transactions. Please try again later.'
          });
          */
        } finally {
          setIsLoading(false);
        }
      } else {
        // If not authenticated, use local storage data
        console.log('[useTransactions] User not authenticated, using local storage data');
        setTransactions(localTransactions);
        setBudgetSummary(localBudgetSummary);
        setBudgetPlan(localBudgetPlan);
        setSuggestions(localSuggestions);
      }
    };
    
    loadTransactions();
  }, [isAuthenticated, user, localTransactions, localBudgetSummary, localBudgetPlan, localSuggestions]);

  // Add a transaction
  const addTransaction = useCallback(async (transaction: Transaction) => {
    try {
      console.log('[useTransactions] Adding transaction:', transaction);
      
      const newTransaction = {
        ...transaction,
        date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date)
      };
      
      // If authenticated, save to Firestore
      if (isAuthenticated && user) {
        console.log('[useTransactions] User authenticated, saving to Firebase. User ID:', user.id);
        setIsLoading(true);
        const transactionId = await transactionService.addTransaction(user.id, newTransaction);
        console.log('[useTransactions] Transaction saved to Firebase with ID:', transactionId);
        
        // Add the id to the transaction
        newTransaction.id = transactionId;
      } else {
        console.log('[useTransactions] User not authenticated, transaction will be saved locally only');
      }
      
      // Update local state
      const updatedTransactions = [...transactions, newTransaction];
      console.log('[useTransactions] Updating local state with new transaction');
      setTransactions(updatedTransactions);
      
      // If not authenticated, save to localStorage
      if (!isAuthenticated || !user) {
        console.log('[useTransactions] Saving transaction to localStorage');
        setLocalTransactions(updatedTransactions);
      }
      
      // Process transactions for budget calculations
      try {
        // Calculate budget summary
        const summary = calculateBudgetSummary(updatedTransactions);
        setBudgetSummary(summary);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user) {
          setLocalBudgetSummary(summary);
        }
        
        // Create budget plan
        const plan = create503020Plan(summary);
        setBudgetPlan(plan);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user) {
          setLocalBudgetPlan(plan);
        }
        
        // Generate suggestions
        const budgetSuggestions = getBudgetSuggestions(plan);
        setSuggestions(budgetSuggestions);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user) {
          setLocalSuggestions(budgetSuggestions);
        }
        
        // Show success message
        setAlertMessage({
          type: 'success',
          message: transactions.length === 0 
            ? 'First transaction added! Continue adding transactions to see your budget plan.'
            : 'Transaction added successfully!'
        });
      } catch (error) {
        console.error('Error processing transaction:', error);
        setAlertMessage({
          type: 'error',
          message: 'Error processing transaction. Please try again.'
        });
      } finally {
        if (isAuthenticated && user) {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error adding transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      if (isAuthenticated && user) {
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
    
    // If date is being updated, ensure it's a Date object
    if (updatedFields.date) {
      updatedTransaction.date = updatedFields.date instanceof Date 
        ? updatedFields.date 
        : new Date(updatedFields.date);
    }
    
    try {
      // If authenticated and transaction has an ID, update in Firestore
      if (isAuthenticated && user && transaction.id) {
        setIsLoading(true);
        await transactionService.updateTransaction(transaction.id, updatedFields);
      }
      
      // Update local state
      const updatedTransactions = [...transactions];
      updatedTransactions[index] = updatedTransaction;
      setTransactions(updatedTransactions);
      
      // If not authenticated, update in localStorage
      if (!isAuthenticated || !user) {
        setLocalTransactions(updatedTransactions);
      }
      
      // Recalculate budget
      try {
        // Calculate budget summary
        const summary = calculateBudgetSummary(updatedTransactions);
        setBudgetSummary(summary);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user) {
          setLocalBudgetSummary(summary);
        }
        
        // Create budget plan
        const plan = create503020Plan(summary);
        setBudgetPlan(plan);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user) {
          setLocalBudgetPlan(plan);
        }
        
        // Get suggestions
        const budgetSuggestions = getBudgetSuggestions(plan);
        setSuggestions(budgetSuggestions);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user) {
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
        if (isAuthenticated && user) {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error updating transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      if (isAuthenticated && user) {
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
      if (isAuthenticated && user && transaction.id) {
        setIsLoading(true);
        await transactionService.deleteTransaction(transaction.id);
      }
      
      // Update local state
      const updatedTransactions = transactions.filter((_, i) => i !== index);
      setTransactions(updatedTransactions);
      
      // If not authenticated, update in localStorage
      if (!isAuthenticated || !user) {
        setLocalTransactions(updatedTransactions);
      }
      
      // Recalculate budget
      try {
        // Calculate budget summary
        const summary = calculateBudgetSummary(updatedTransactions);
        setBudgetSummary(summary);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user) {
          setLocalBudgetSummary(summary);
        }
        
        // Create budget plan
        const plan = create503020Plan(summary);
        setBudgetPlan(plan);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user) {
          setLocalBudgetPlan(plan);
        }
        
        // Get suggestions
        const budgetSuggestions = getBudgetSuggestions(plan);
        setSuggestions(budgetSuggestions);
        
        // Save to localStorage if not authenticated
        if (!isAuthenticated || !user) {
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
        if (isAuthenticated && user) {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error deleting transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      if (isAuthenticated && user) {
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
    
    // Group transactions (excluding Income)
    transactions.forEach(transaction => {
      if (transaction.category && transaction.category !== 'Income' && 
          (transaction.category === 'Essentials' || 
           transaction.category === 'Wants' || 
           transaction.category === 'Savings')) {
        grouped[transaction.category].push(transaction);
      }
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
  const resetTransactions = useCallback(() => {
    // Reset state
    setTransactions([]);
    setBudgetSummary(null);
    setBudgetPlan(null);
    setSuggestions([]);
    
    // If authenticated, no need to clear local storage
    if (!isAuthenticated || !user) {
      // Reset local storage
      setLocalTransactions([]);
      setLocalBudgetSummary(null);
      setLocalBudgetPlan(null);
      setLocalSuggestions([]);
    } else {
      // TODO: Implement bulk delete in Firestore if needed
      // This would require implementing a bulk delete function in the transaction service
      // and calling it here
      setAlertMessage({
        type: 'info',
        message: 'Your data has been reset locally. Refresh the page to see the changes in your account.'
      });
    }
  }, [
    isAuthenticated, 
    user, 
    setLocalTransactions, 
    setLocalBudgetSummary, 
    setLocalBudgetPlan, 
    setLocalSuggestions
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
    
    // Update the transaction with the new category
    await updateTransaction(index, { category: targetCategory });
  }, [transactions, updateTransaction]);

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