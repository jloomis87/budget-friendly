import { useCallback } from 'react';
import type { Transaction } from '../../services/fileParser';
import type { TransactionUtilsHook } from './types';

export function useTransactionUtils(): TransactionUtilsHook {
  // Generate options for day dropdown (1-31)
  const generateDayOptions = useCallback(() => {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i);
    }
    return days;
  }, []);

  // Helper function to get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = useCallback((day: number): string => {
    if (day > 3 && day < 21) return `${day}th`; // 4th through 20th
    switch (day % 10) {
      case 1:  return `${day}st`;
      case 2:  return `${day}nd`;
      case 3:  return `${day}rd`;
      default: return `${day}th`;
    }
  }, []);

  // Helper to get date string for comparison 
  const getDateString = useCallback((date: Date | string | number): string => {
    if (typeof date === 'number') {
      // If it's a day number, just return the string representation
      return date.toString();
    } else if (date instanceof Date) {
      // For backwards compatibility, extract the day from the date
      return date.getDate().toString();
    } else if (typeof date === 'string') {
      // Try to convert string to date and extract day, or return as is if it's already a day
      if (/^\d{1,2}$/.test(date)) {
        // It's already a day number as string
        return date;
      }
      try {
        return new Date(date).getDate().toString();
      } catch (e) {
        return date;
      }
    }
    // Fallback
    return String(date);
  }, []);

  // Helper to format date for display
  const formatDateForDisplay = useCallback((date: Date | string | number): string => {
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
  }, [getOrdinalSuffix]);

  // Find the global index of a transaction in the full transactions array
  const findGlobalIndex = useCallback((transaction: Transaction, allTransactions: Transaction[]): number => {
    return allTransactions.findIndex(t => {
      const dateMatch = getDateString(t.date) === getDateString(transaction.date);
      return dateMatch && 
        t.description === transaction.description && 
        t.amount === transaction.amount &&
        t.category === transaction.category;
    });
  }, [getDateString]);

  // Create a unique identifier for a transaction
  const getTransactionId = useCallback((transaction: Transaction): string => {
    return `${getDateString(transaction.date)}-${transaction.description}-${transaction.amount}-${transaction.category}`;
  }, [getDateString]);

  // Check if two transactions are duplicates
  const isDuplicateTransaction = useCallback((a: Transaction, b: Transaction): boolean => {
    const dateMatch = getDateString(a.date) === getDateString(b.date);
    return dateMatch && 
      a.description === b.description && 
      a.amount === b.amount &&
      a.category === b.category;
  }, [getDateString]);

  return {
    generateDayOptions,
    getOrdinalSuffix,
    getDateString,
    formatDateForDisplay,
    findGlobalIndex,
    getTransactionId,
    isDuplicateTransaction
  };
} 