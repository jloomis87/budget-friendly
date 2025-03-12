import { useState, useCallback } from 'react';
import type { Transaction } from '../services/fileParser';
import { 
  calculateBudgetSummary, 
  create503020Plan, 
  getBudgetSuggestions,
  type BudgetSummary,
  type BudgetPlan
} from '../services/budgetCalculator';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from './useLocalStorage';

export function useTransactions() {
  // State for transactions and budget data
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.TRANSACTIONS, 
    LEGACY_STORAGE_KEYS.TRANSACTIONS, 
    []
  );
  
  const [budgetSummary, setBudgetSummary] = useLocalStorage<BudgetSummary | null>(
    STORAGE_KEYS.SUMMARY, 
    LEGACY_STORAGE_KEYS.SUMMARY, 
    null
  );
  
  const [budgetPlan, setBudgetPlan] = useLocalStorage<BudgetPlan | null>(
    STORAGE_KEYS.PLAN, 
    LEGACY_STORAGE_KEYS.PLAN, 
    null
  );
  
  const [suggestions, setSuggestions] = useLocalStorage<string[]>(
    STORAGE_KEYS.SUGGESTIONS, 
    LEGACY_STORAGE_KEYS.SUGGESTIONS, 
    []
  );
  
  const [alertMessage, setAlertMessage] = useState<{ 
    type: 'success' | 'error' | 'warning'; 
    message: string 
  } | null>(null);

  // Add a transaction
  const addTransaction = useCallback((transaction: Transaction) => {
    try {
      // Add the transaction to our list
      const updatedTransactions = [...transactions, {
        ...transaction,
        date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date)
      }];
      
      setTransactions(updatedTransactions);
      
      // Automatically process transactions
      try {
        // Calculate budget summary
        const summary = calculateBudgetSummary(updatedTransactions);
        setBudgetSummary(summary);
        
        // Create budget plan
        const plan = create503020Plan(summary);
        setBudgetPlan(plan);
        
        // Generate suggestions
        const budgetSuggestions = getBudgetSuggestions(plan);
        setSuggestions(budgetSuggestions);
        
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
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      setAlertMessage({
        type: 'error',
        message: `Error adding transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }, [transactions, setTransactions, setBudgetSummary, setBudgetPlan, setSuggestions]);

  // Update a transaction
  const updateTransaction = useCallback((index: number, updatedTransaction: Partial<Transaction>) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      console.error(`Invalid transaction index: ${index}`);
      setAlertMessage({
        type: 'error',
        message: 'Could not update transaction: Invalid index'
      });
      return;
    }

    const updatedTransactions = [...transactions];
    updatedTransactions[index] = {
      ...updatedTransactions[index],
      ...updatedTransaction
    };
    
    setTransactions(updatedTransactions);
    
    // Automatically recalculate budget
    try {
      // Calculate budget summary
      const summary = calculateBudgetSummary(updatedTransactions);
      setBudgetSummary(summary);
      
      // Create budget plan
      const plan = create503020Plan(summary);
      setBudgetPlan(plan);
      
      // Get suggestions
      const budgetSuggestions = getBudgetSuggestions(plan);
      setSuggestions(budgetSuggestions);
      
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
    }
  }, [transactions, setTransactions, setBudgetSummary, setBudgetPlan, setSuggestions]);

  // Delete a transaction
  const deleteTransaction = useCallback((index: number) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      console.error(`Invalid transaction index: ${index}`);
      setAlertMessage({
        type: 'error',
        message: 'Could not delete transaction: Invalid index'
      });
      return;
    }

    // Create a copy of the transactions array without the deleted transaction
    const updatedTransactions = transactions.filter((_, i) => i !== index);
    
    setTransactions(updatedTransactions);
    
    // Automatically recalculate budget
    try {
      // Calculate budget summary
      const summary = calculateBudgetSummary(updatedTransactions);
      setBudgetSummary(summary);
      
      // Create budget plan
      const plan = create503020Plan(summary);
      setBudgetPlan(plan);
      
      // Get suggestions
      const budgetSuggestions = getBudgetSuggestions(plan);
      setSuggestions(budgetSuggestions);
      
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
    }
  }, [transactions, setTransactions, setBudgetSummary, setBudgetPlan, setSuggestions]);

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
      const signedAmount = isIncome ? newAmount : -newAmount;

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

  // Get total income
  const getTotalIncome = useCallback(() => {
    return transactions
      .filter(t => t.category === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Reset all transaction data
  const resetTransactions = useCallback(() => {
    setTransactions([]);
    setBudgetSummary(null);
    setBudgetPlan(null);
    setSuggestions([]);
    setAlertMessage({
      type: 'success',
      message: 'Budget data has been reset.'
    });
  }, [setTransactions, setBudgetSummary, setBudgetPlan, setSuggestions]);

  // Move a transaction to a different category
  const moveTransaction = useCallback((transactionIndex: number, targetCategory: string) => {
    if (transactionIndex < 0 || transactionIndex >= transactions.length) {
      console.error(`Invalid transaction index: ${transactionIndex}`);
      return;
    }

    const updatedTransactions = [...transactions];
    updatedTransactions[transactionIndex] = {
      ...updatedTransactions[transactionIndex],
      category: targetCategory as Transaction['category']
    };
    
    setTransactions(updatedTransactions);
    
    // Recalculate budget
    try {
      // Calculate budget summary
      const summary = calculateBudgetSummary(updatedTransactions);
      setBudgetSummary(summary);
      
      // Create budget plan
      const plan = create503020Plan(summary);
      setBudgetPlan(plan);
      
      // Get suggestions
      const budgetSuggestions = getBudgetSuggestions(plan);
      setSuggestions(budgetSuggestions);
    } catch (error) {
      console.error('Error processing transactions after move:', error);
    }
  }, [transactions, setTransactions, setBudgetSummary, setBudgetPlan, setSuggestions]);

  return {
    transactions,
    budgetSummary,
    budgetPlan,
    suggestions,
    alertMessage,
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