import { useMemo } from 'react';
import type { Transaction } from '../../services/fileParser';
import type { TransactionUtilsHook } from './types';

export function useTransactionUtils(): TransactionUtilsHook {
  return useMemo(() => ({
    // Find the global index of a transaction in the full transactions array
    findGlobalIndex: (transaction: Transaction, allTransactions: Transaction[]): number => {
      // First try to find by ID if available
      if (transaction.id) {
        const idIndex = allTransactions.findIndex(t => t.id === transaction.id);
        if (idIndex !== -1) return idIndex;
      }
      
      // Otherwise, try to match by properties
      return allTransactions.findIndex(t => {
        if (t.category !== transaction.category) return false;
        
        const dateMatch = getDateString(t.date) === getDateString(transaction.date);
        const descriptionMatch = t.description === transaction.description;
        const amountMatch = t.amount === transaction.amount;
        
        return dateMatch && descriptionMatch && amountMatch;
      });
    },

    // Create a unique identifier for a transaction
    getTransactionId: (transaction: Transaction): string => {
      return `${transaction.date instanceof Date ? transaction.date.toISOString() : String(transaction.date)}-${transaction.description}-${transaction.amount}-${transaction.category}`;
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
    getOrdinalSuffix: (day: number): string => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    }
  }), []);
}

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

export { formatDateForDisplay, isDuplicateTransaction }; 