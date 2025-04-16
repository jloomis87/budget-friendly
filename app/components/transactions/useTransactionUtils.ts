import { useMemo } from 'react';
import type { Transaction } from '../../services/fileParser';
import type { TransactionUtilsHook } from './types';

// Helper to get date string for comparison 
function getDateString(date: Date | string | number): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  
  if (typeof date === 'string' && date.includes('-')) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toISOString();
  }
  
  if (typeof date === 'number') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), date).toISOString();
  }
  
  return new Date(date).toISOString();
}

// Helper to get ordinal suffix (st, nd, rd, th)
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Helper to format date for display
const formatDateForDisplay = (date: Date | string | number): string => {
  if (typeof date === 'number') {
    // If it's a day number, format it with ordinal suffix
    return getOrdinalSuffix(date);
  } else if (date instanceof Date) {
    // For backwards compatibility, extract the day
    return getOrdinalSuffix(date.getDate());
  } else if (typeof date === 'string') {
    // Check if it's already a day number as string
    if (/^\d{1,2}$/.test(date)) {
      return getOrdinalSuffix(parseInt(date, 10));
    }
    try {
      return getOrdinalSuffix(new Date(date).getDate());
    } catch (e) {
      return date;
    }
  }
  return String(date);
};

// Check if two transactions are duplicates
const isDuplicateTransaction = (a: Transaction, b: Transaction): boolean => {
  const dateMatch = getDateString(a.date) === getDateString(b.date);
  return dateMatch && 
    a.description === b.description && 
    a.amount === b.amount &&
    a.category === b.category;
};

export function useTransactionUtils(): TransactionUtilsHook {
  return useMemo(() => ({
    // Find the global index of a transaction in the full transactions array
    findGlobalIndex: (transaction: Transaction, allTransactions: Transaction[]): number => {
      // Validate inputs
      if (!transaction || !allTransactions || !Array.isArray(allTransactions)) {
        console.error('Invalid arguments to findGlobalIndex', { 
          hasTransaction: !!transaction, 
          hasAllTransactions: !!allTransactions,
          isArray: Array.isArray(allTransactions)
        });
        return -1;
      }
      
      // First try to find by ID if available
      if (transaction.id) {
        const idIndex = allTransactions.findIndex(t => t.id === transaction.id);
        if (idIndex !== -1) {
          console.log(`Found transaction by ID at index ${idIndex}`, {
            id: transaction.id,
            description: transaction.description
          });
          return idIndex;
        }
      }
      
      // Log the transaction we're trying to find
      console.log('Finding transaction by properties:', {
        description: transaction.description,
        category: transaction.category,
        amount: transaction.amount,
        date: transaction.date
      });
      
      // Otherwise, try to match by properties
      const index = allTransactions.findIndex(t => {
        // For Income transactions, we need to be more careful with category matching
        const categoryMatch = t.category === transaction.category;
        if (!categoryMatch) return false;
        
        const dateMatch = getDateString(t.date) === getDateString(transaction.date);
        const descriptionMatch = t.description === transaction.description;
        const amountMatch = t.amount === transaction.amount;
        
        const isMatch = dateMatch && descriptionMatch && amountMatch;
        
        // Log potential matches for debugging
        if (descriptionMatch && t.category === 'Income' && transaction.category === 'Income') {
          console.log('Potential Income match:', {
            description: t.description,
            dateMatch,
            amountMatch,
            isMatch
          });
        }
        
        return isMatch;
      });
      
      if (index === -1) {
        console.warn('Could not find transaction in allTransactions', {
          description: transaction.description,
          category: transaction.category,
          totalTransactions: allTransactions.length
        });
      } else {
        console.log(`Found transaction by properties at index ${index}`, {
          description: transaction.description,
          category: transaction.category
        });
      }
      
      return index;
    },

    // Create a unique identifier for a transaction
    getTransactionId: (transaction: Transaction): string => {
      // If the transaction already has an ID, use it
      if (transaction.id) {
        return transaction.id;
      }
      
      // Otherwise, create a composite ID from transaction properties
      return `${transaction.date instanceof Date ? transaction.date.toISOString() : String(transaction.date)}-${transaction.description}-${transaction.amount}-${transaction.category}`;
    },

    // Find all transactions with the same name and return their indices
    updateTransactionsWithSameName: (
      description: string, 
      icon: string, 
      allTransactions: Transaction[], 
      excludeId?: string
    ): number[] => {
      if (!description || !allTransactions || !Array.isArray(allTransactions)) {
        console.error('Invalid arguments to updateTransactionsWithSameName', {
          hasDescription: !!description,
          hasAllTransactions: !!allTransactions,
          isArray: Array.isArray(allTransactions)
        });
        return [];
      }

      const normalizedDescription = description.trim().toLowerCase();
      const indicesToUpdate: number[] = [];

      allTransactions.forEach((transaction, index) => {
        // Skip if this is the transaction we're currently editing (if excludeId is provided)
        if (excludeId && transaction.id === excludeId) {
          return;
        }

        // Make sure to normalize the transaction description for comparison
        const transactionDescription = transaction.description.trim().toLowerCase();
        
        // Check if descriptions match (case-insensitive) and icons are different
        if (transactionDescription === normalizedDescription && transaction.icon !== icon) {
          indicesToUpdate.push(index);
          console.log(`Found transaction with same name at index ${index}`, {
            description: transaction.description,
            currentIcon: transaction.icon,
            newIcon: icon
          });
        }
      });

      return indicesToUpdate;
    },

    // Generate day options (1st, 2nd, 3rd, etc.)
    generateDayOptions: () => {
      const options = [];
      for (let i = 1; i <= 31; i++) {
        options.push({
          value: i.toString(),
          label: `${i}${getOrdinalSuffix(i)}`
        });
      }
      return options;
    },

    // Get ordinal suffix (st, nd, rd, th)
    getOrdinalSuffix,
    
    // Added exports for use in the hook interface
    getDateString,
    formatDateForDisplay,
    isDuplicateTransaction
  }), []);
}

export { formatDateForDisplay, isDuplicateTransaction }; 