import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction } from '../../services/fileParser';
import type { DragDropState, TransactionTableContextProps } from './types';
import { useTransactionUtils } from './useTransactionUtils';
import { useTableColors } from '../../hooks/useTableColors';
import { isColorDark } from '../../utils/colorUtils';

// Create the context
const TransactionTableContext = createContext<{
  // Props passed from parent
  props: TransactionTableContextProps;
  // Drag and drop state
  dragState: DragDropState;
  // Helper functions
  utils: ReturnType<typeof useTransactionUtils>;
  // State management functions
  resetDragState: (preserveCopyMode?: boolean) => void;
  setDraggedTransaction: React.Dispatch<React.SetStateAction<Transaction | null>>;
  setDraggedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setDragSourceMonth: React.Dispatch<React.SetStateAction<string | null>>;
  setDragOverMonth: React.Dispatch<React.SetStateAction<string | null>>;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCopyMode: React.Dispatch<React.SetStateAction<boolean>>;
  setDragLeaveTimeout: React.Dispatch<React.SetStateAction<number | null>>;
  setDragOverIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setIsIntraMonthDrag: React.Dispatch<React.SetStateAction<boolean>>;
  // Helper functions for transactions
  groupTransactionsByMonth: (transactions: Transaction[]) => Record<string, Transaction[]>;
  formatDate: (date: string | number | Date) => string;
  // UI state
  totalAmount: number;
  filteredTransactions: Transaction[];
  // Dialog state
  dialogState: {
    editingRow: any | null;
    deleteConfirmOpen: boolean;
    transactionToDelete: { transaction: Transaction, index: number } | null;
    mobileEditDialogOpen: boolean;
    mobileEditTransaction: { transaction: Transaction; index: number; identifier: string; } | null;
    mobileAddDialogOpen: boolean;
    copyMonthDialogOpen: boolean;
    copySourceMonth: string;
    copyTargetMonth: string;
    copyTransactions: Transaction[];
    newDescription: string;
    newAmount: string;
    newDate: string;
  };
  // Dialog actions
  setEditingRow: React.Dispatch<React.SetStateAction<any | null>>;
  setDeleteConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTransactionToDelete: React.Dispatch<React.SetStateAction<{ transaction: Transaction, index: number } | null>>;
  setMobileEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setMobileEditTransaction: React.Dispatch<React.SetStateAction<{ transaction: Transaction; index: number; identifier: string; } | null>>;
  setMobileAddDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCopyMonthDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCopySourceMonth: React.Dispatch<React.SetStateAction<string>>;
  setCopyTargetMonth: React.Dispatch<React.SetStateAction<string>>;
  setCopyTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setNewDescription: React.Dispatch<React.SetStateAction<string>>;
  setNewAmount: React.Dispatch<React.SetStateAction<string>>;
  setNewDate: React.Dispatch<React.SetStateAction<string>>;
  // Action handlers
  handleEditingChange: (field: string, value: string) => void;
  handleSaveEdit: () => void;
  handleAddTransaction: () => void;
  handleDeleteClick: (e: React.MouseEvent | undefined, transaction: Transaction) => void;
  handleOpenMobileEdit: (transaction: Transaction, index: number) => void;
  handleCloseMobileEdit: () => void;
  handleOpenMobileAdd: (month: string) => void;
  handleCloseMobileAdd: () => void;
  getNextMonth: (currentMonth: string) => string;
  handleCopyMonthClick: (month: string, transactions: Transaction[]) => void;
  handleCopyMonthConfirm: () => void;
  // Utility functions
  forceRefresh: () => void;
  showNotification: (message: string, type?: 'error' | 'warning' | 'success') => void;
  // Styling functions
  getBackgroundStyles: () => Record<string, any>;
  getCategoryBackgroundColor: () => string | undefined;
  getCardBackgroundColor: (isHover?: boolean) => string;
  getCardHoverStyles: () => Record<string, any>;
  getTextColor: (isHover?: boolean) => string;
  getMonthOrder: (month: string) => number;
  // Utility functions
  isColorDark: (color: string) => boolean;
} | undefined>(undefined);

// Helper function to format date for display
const formatDate = (date: string | number | Date) => {
  if (typeof date === 'number') {
    const now = new Date();
    const fullDate = new Date(now.getFullYear(), now.getMonth(), date);
    return fullDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  if (date instanceof Date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  if (typeof date === 'string' && date.includes('-')) {
    const [year, month, day] = date.split('-').map(Number);
    const fullDate = new Date(year, month - 1, day);
    return fullDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to group transactions by month
const groupTransactionsByMonth = (transactions: Transaction[]) => {
  const grouped: Record<string, Transaction[]> = {};
  
  transactions.forEach(transaction => {
    let date: Date;
    
    try {
      if (typeof transaction.date === 'number') {
        // If it's just a day number, use current month/year
        const now = new Date();
        date = new Date(now.getFullYear(), now.getMonth(), transaction.date);
      } else if (transaction.date instanceof Date) {
        date = transaction.date;
      } else {
        // If it's a string or something else, convert to Date
        date = new Date(transaction.date);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.error('Invalid date in transaction:', transaction);
          // Use current date as fallback
          date = new Date();
        }
      }
    } catch (error) {
      console.error('Error parsing date:', error, transaction);
      // Use current date as fallback
      date = new Date();
    }
    
    const month = date.toLocaleString('default', { month: 'long' });
    
    if (!grouped[month]) {
      grouped[month] = [];
    }
    
    grouped[month].push(transaction);
  });
  
  // Sort transactions within each month
  Object.entries(grouped).forEach(([month, monthTransactions]) => {
    monthTransactions.sort((a, b) => {
      // First sort by order property if available
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      
      // Fall back to sorting by date
      const getDate = (d: string | number | Date) => {
        if (typeof d === 'number') return d;
        if (typeof d === 'string' && d.includes('-')) {
          const [, , day] = d.split('-').map(Number);
          return day;
        }
        if (d instanceof Date) {
          return d.getDate();
        }
        return new Date(d).getDate();
      };
      
      try {
        return getDate(a.date) - getDate(b.date);
      } catch (error) {
        console.error('Error sorting by date:', error, { a, b });
        return 0; // Keep original order if there's an error
      }
    });
  });
  
  return grouped;
};

// Provider component
export const TransactionTableProvider = ({ 
  children, 
  value 
}: { 
  children: React.ReactNode; 
  value: TransactionTableContextProps; 
}) => {
  const utils = useTransactionUtils();
  const isIncome = value.category === 'Income';
  
  // Get table colors from the hook
  const [tableColors, setTableColors] = useTableColors();
  const hasCustomColor = value.category && tableColors[value.category] !== '#f5f5f5';
  
  // State for drag and drop
  const [draggedTransaction, setDraggedTransaction] = useState<Transaction | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragSourceMonth, setDragSourceMonth] = useState<string | null>(null);
  const [dragOverMonth, setDragOverMonth] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [dragLeaveTimeout, setDragLeaveTimeout] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isIntraMonthDrag, setIsIntraMonthDrag] = useState(false);
  
  // State for dialogs
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ transaction: Transaction, index: number } | null>(null);
  const [mobileEditDialogOpen, setMobileEditDialogOpen] = useState(false);
  const [mobileEditTransaction, setMobileEditTransaction] = useState<{
    transaction: Transaction;
    index: number;
    identifier: string;
  } | null>(null);
  const [mobileAddDialogOpen, setMobileAddDialogOpen] = useState(false);
  const [copyMonthDialogOpen, setCopyMonthDialogOpen] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState('');
  const [copyTargetMonth, setCopyTargetMonth] = useState('');
  const [copyTransactions, setCopyTransactions] = useState<Transaction[]>([]);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Add a force refresh counter
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Helper function to reset all drag state
  const resetDragState = useCallback((preserveCopyMode = false) => {
    setIsIntraMonthDrag(false);
    setDragOverIndex(null);
    setIsDragging(false);
    setDraggedTransaction(null);
    setDraggedIndex(null);
    setDragSourceMonth(null);
    setDragOverMonth(null);
    if (!preserveCopyMode) {
      setIsCopyMode(false);
    }
  }, []);
  
  // Calculate total amount
  const totalAmount = value.transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Filter transactions by selected months
  const filteredTransactions = React.useMemo(() => {
    if (!value.selectedMonths?.length) {
      return value.transactions;
    }
    
    const filtered = value.transactions.filter(transaction => {
      // Ensure transaction.date is properly handled
      let transactionDate: Date;
      
      if (typeof transaction.date === 'number') {
        // If it's just a day number, use current month/year
        const now = new Date();
        transactionDate = new Date(now.getFullYear(), now.getMonth(), transaction.date);
      } else if (transaction.date instanceof Date) {
        transactionDate = transaction.date;
      } else {
        // If it's a string or something else, convert to Date
        transactionDate = new Date(transaction.date);
      }
      
      const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
      return value.selectedMonths?.includes(transactionMonth);
    });
    
    return filtered;
  }, [value.transactions, value.selectedMonths, value.category, refreshCounter]);
  
  // Handler functions
  const handleEditingChange = useCallback((field: string, value: string) => {
    if (editingRow) {
      setEditingRow({
        ...editingRow,
        [field]: value
      });
    }
  }, [editingRow]);
  
  const handleSaveEdit = useCallback(() => {
    if (mobileEditTransaction && editingRow) {
      const [year, month, day] = editingRow.date.split('-').map(Number);
      
      const updatedTransaction: Partial<Transaction> = {
        description: editingRow.description,
        date: new Date(year, month - 1, day),
        amount: parseFloat(editingRow.amount) * (isIncome ? 1 : -1)
      };
      
      const globalIndex = utils.findGlobalIndex(mobileEditTransaction.transaction, value.allTransactions);
      value.onUpdateTransaction(globalIndex, updatedTransaction);
      handleCloseMobileEdit();
    }
  }, [mobileEditTransaction, editingRow, isIncome, utils, value]);
  
  const handleAddTransaction = useCallback(() => {
    if (!newDescription.trim() || !newAmount.trim()) return;

    const [year, month, day] = newDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    const transaction: Transaction = {
      description: newDescription.trim(),
      amount: parseFloat(newAmount) * (isIncome ? 1 : -1),
      date: date,
      category: value.category as 'Income' | 'Essentials' | 'Wants' | 'Savings',
      id: uuidv4(),
    };

    value.onAddTransaction(transaction);
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setMobileAddDialogOpen(false);
  }, [newDescription, newAmount, newDate, isIncome, value]);
  
  const handleDeleteClick = useCallback((e: React.MouseEvent | undefined, transaction: Transaction) => {
    // Only call stopPropagation if e is a valid event object
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    
    const globalIndex = utils.findGlobalIndex(transaction, value.allTransactions);
    
    if (globalIndex !== -1) {
      setTransactionToDelete({ transaction, index: globalIndex });
      setDeleteConfirmOpen(true);
    }
  }, [utils, value.allTransactions]);
  
  const handleOpenMobileEdit = useCallback((transaction: Transaction, index: number) => {
    const transactionId = utils.getTransactionId(transaction);
    const globalIndex = utils.findGlobalIndex(transaction, value.allTransactions);
    
    setMobileEditTransaction({
      transaction,
      index,
      identifier: transactionId
    });
    
    const dateString = transaction.date instanceof Date 
      ? transaction.date.toISOString().split('T')[0]
      : (typeof transaction.date === 'string' 
        ? new Date(transaction.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]);
    
    setEditingRow({
      index: globalIndex,
      identifier: transactionId,
      amount: Math.abs(transaction.amount).toString(),
      date: dateString,
      description: transaction.description
    });
    
    setMobileEditDialogOpen(true);
  }, [utils, value.allTransactions]);
  
  const handleCloseMobileEdit = useCallback(() => {
    setMobileEditDialogOpen(false);
    setMobileEditTransaction(null);
    setEditingRow(null);
  }, []);
  
  const handleOpenMobileAdd = useCallback((month: string) => {
    const currentYear = new Date().getFullYear();
    const monthIndex = new Date(`${month} 1`).getMonth();
    const firstOfMonth = new Date(currentYear, monthIndex, 1);
    const newDateValue = firstOfMonth.toISOString().split('T')[0];

    setNewDescription('');
    setNewAmount('');
    setNewDate(newDateValue);
    setMobileAddDialogOpen(true);
  }, []);
  
  const handleCloseMobileAdd = useCallback(() => {
    setMobileAddDialogOpen(false);
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
  }, []);
  
  const getNextMonth = useCallback((currentMonth: string): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentIndex = months.indexOf(currentMonth);
    return months[(currentIndex + 1) % 12];
  }, []);
  
  const handleCopyMonthClick = useCallback((month: string, transactions: Transaction[]) => {
    const nextMonth = getNextMonth(month);
    setCopySourceMonth(month);
    setCopyTargetMonth(nextMonth);
    setCopyTransactions(transactions);
    setCopyMonthDialogOpen(true);
  }, [getNextMonth]);
  
  const handleCopyMonthConfirm = useCallback(() => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const targetMonthIndex = months.indexOf(copyTargetMonth);

    const targetMonthTransactions = value.transactions.filter(t => {
      const date = new Date(t.date);
      const month = date.toLocaleString('default', { month: 'long' });
      return month === copyTargetMonth && t.category === value.category;
    });

    let duplicateCount = 0;
    let addedCount = 0;

    copyTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
      
      // Check if a transaction with the same description and amount already exists in the target month
      const existingTransaction = targetMonthTransactions.find(t => 
        t.description === transaction.description && 
        Math.abs(t.amount) === Math.abs(transaction.amount)
      );

      if (existingTransaction) {
        // Skip this transaction as it's a duplicate
        duplicateCount++;
        return;
      }

      // If no matching transaction exists, create a new one
      const newTransaction: Transaction = {
        ...transaction,
        id: uuidv4(), // Generate new ID for the copy
        date: newDate,
        // Preserve the sign based on category
        amount: value.category === 'Income' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount)
      };

      // Add the new transaction
      value.onAddTransaction(newTransaction);
      
      // Force refresh the component
      forceRefresh();
      addedCount++;
    });

    // Show notification about duplicates if any were skipped
    if (duplicateCount > 0) {
      showNotification(`Copied ${addedCount} transactions. Skipped ${duplicateCount} duplicate transactions.`, 'success');
    }

    setCopyMonthDialogOpen(false);
  }, [copyTargetMonth, copyTransactions, value]);
  
  // Force a refresh of the component
  const forceRefresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);
  
  // Helper function to show notifications
  const showNotification = useCallback((message: string, type: 'error' | 'warning' | 'success' = 'error') => {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    
    // Set color based on type
    const bgColor = type === 'error' 
      ? 'rgba(244, 67, 54, 0.9)'  // Red for errors
      : type === 'warning' 
        ? 'rgba(255, 152, 0, 0.9)'  // Orange for warnings
        : 'rgba(76, 175, 80, 0.9)'; // Green for success
    
    notification.style.backgroundColor = bgColor;
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.zIndex = '9999';
    notification.style.fontFamily = 'Arial, sans-serif';
    notification.style.fontSize = '14px';
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }, []);
  
  const getMonthOrder = useCallback((month: string): number => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
  }, []);
  
  // Clean up any timeouts when component unmounts
  React.useEffect(() => {
    return () => {
      if (dragLeaveTimeout) {
        window.clearTimeout(dragLeaveTimeout);
      }
    };
  }, [dragLeaveTimeout]);
  
  // Styling functions
  const getBackgroundStyles = useCallback(() => {
    // Get the background color for the category
    const tableColor = value.category && tableColors[value.category];
    const isCustomColor = hasCustomColor && tableColor && tableColor !== '#f5f5f5';
    const isDarkColor = isCustomColor && isColorDark(tableColor);
    
    // Return the appropriate styles based on the category and color
    return {
      bgcolor: isCustomColor ? tableColor : (value.isDark ? '#424242' : '#f5f5f5'),
      color: isDarkColor ? 'rgba(255, 255, 255, 0.87)' : (value.isDark ? '#fff' : 'inherit'),
      boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
      borderRadius: 2,
      position: 'relative',
      // Add a subtle gradient overlay for better text readability on custom colors
      ...(isCustomColor && {
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkColor 
            ? 'linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.2))' 
            : 'linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0.2))',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }
      })
    };
  }, [value.category, value.isDark, tableColors, hasCustomColor]);
  
  const getCategoryBackgroundColor = useCallback(() => {
    // Get the background color for the category
    const tableColor = value.category && tableColors[value.category];
    const isCustomColor = hasCustomColor && tableColor && tableColor !== '#f5f5f5';
    
    if (isCustomColor) {
      return tableColor;
    }
    
    return value.isDark ? '#424242' : '#f5f5f5';
  }, [value.category, value.isDark, tableColors, hasCustomColor]);
  
  const getCardBackgroundColor = useCallback((isHover = false) => {
    // Get the background color for the category
    const tableColor = value.category && tableColors[value.category];
    const isCustomColor = hasCustomColor && tableColor && tableColor !== '#f5f5f5';
    const isDarkColor = isCustomColor && isColorDark(tableColor);
    
    // Apply the same lightening logic for all categories, including Income
    if (isCustomColor) {
      // Lighten the color for cards
      const lightenAmount = isHover ? 0.2 : 0.1;
      const r = parseInt(tableColor.slice(1, 3), 16);
      const g = parseInt(tableColor.slice(3, 5), 16);
      const b = parseInt(tableColor.slice(5, 7), 16);
      
      // Lighten the color
      const newR = Math.min(255, r + (255 - r) * lightenAmount);
      const newG = Math.min(255, g + (255 - g) * lightenAmount);
      const newB = Math.min(255, b + (255 - b) * lightenAmount);
      
      return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
    }
    
    // Default card colors based on dark mode
    return value.isDark 
      ? (isHover ? '#5a5a5a' : '#4a4a4a') 
      : (isHover ? '#ffffff' : '#f9f9f9');
  }, [value.category, value.isDark, tableColors, hasCustomColor]);
  
  const getCardHoverStyles = useCallback(() => {
    return {
      boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
      transform: 'translateY(-2px)',
      bgcolor: getCardBackgroundColor(true)
    };
  }, [getCardBackgroundColor]);
  
  const getTextColor = useCallback((isHover = false) => {
    // Get the background color for the category
    const tableColor = value.category && tableColors[value.category];
    const isCustomColor = hasCustomColor && tableColor && tableColor !== '#f5f5f5';
    const isDarkColor = isCustomColor && isColorDark(tableColor);
    
    // For all categories, determine text color based on background darkness
    if (isCustomColor && isDarkColor) {
      return isHover ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.87)';
    }
    
    return value.isDark 
      ? (isHover ? '#ffffff' : 'rgba(255, 255, 255, 0.87)') 
      : (isHover ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 0.87)');
  }, [value.category, value.isDark, tableColors, hasCustomColor]);
  
  const contextValue = {
    props: value,
    dragState: {
      isDragging,
      draggedTransaction,
      draggedIndex,
      dragSourceMonth,
      dragOverMonth,
      dragOverIndex,
      isIntraMonthDrag,
      isCopyMode,
      dragLeaveTimeout
    },
    utils,
    // State management functions
    resetDragState,
    setDraggedTransaction,
    setDraggedIndex,
    setDragSourceMonth,
    setDragOverMonth,
    setIsDragging,
    setIsCopyMode,
    setDragLeaveTimeout,
    setDragOverIndex,
    setIsIntraMonthDrag,
    // Helper functions for transactions
    groupTransactionsByMonth,
    formatDate,
    // UI state
    totalAmount,
    filteredTransactions,
    // Dialog state
    dialogState: {
      editingRow,
      deleteConfirmOpen,
      transactionToDelete,
      mobileEditDialogOpen,
      mobileEditTransaction,
      mobileAddDialogOpen,
      copyMonthDialogOpen,
      copySourceMonth,
      copyTargetMonth,
      copyTransactions,
      newDescription,
      newAmount,
      newDate
    },
    // Dialog actions
    setEditingRow,
    setDeleteConfirmOpen,
    setTransactionToDelete,
    setMobileEditDialogOpen,
    setMobileEditTransaction,
    setMobileAddDialogOpen,
    setCopyMonthDialogOpen,
    setCopySourceMonth,
    setCopyTargetMonth,
    setCopyTransactions,
    setNewDescription,
    setNewAmount,
    setNewDate,
    // Action handlers
    handleEditingChange,
    handleSaveEdit,
    handleAddTransaction,
    handleDeleteClick,
    handleOpenMobileEdit,
    handleCloseMobileEdit,
    handleOpenMobileAdd,
    handleCloseMobileAdd,
    getNextMonth,
    handleCopyMonthClick,
    handleCopyMonthConfirm,
    // Utility functions
    forceRefresh,
    showNotification,
    // Styling functions
    getBackgroundStyles,
    getCategoryBackgroundColor,
    getCardBackgroundColor,
    getCardHoverStyles,
    getTextColor,
    getMonthOrder,
    // Utility functions
    isColorDark
  };
  
  return (
    <TransactionTableContext.Provider value={contextValue}>
      {children}
    </TransactionTableContext.Provider>
  );
};

// Custom hook to use the context
export const useTransactionTableContext = () => {
  const context = useContext(TransactionTableContext);
  if (context === undefined) {
    throw new Error('useTransactionTableContext must be used within a TransactionTableProvider');
  }
  return context;
}; 