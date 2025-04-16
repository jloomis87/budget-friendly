import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction } from '../../services/fileParser';
import type { DragDropState, TransactionTableContextProps } from './types';
import { useTransactionUtils } from './useTransactionUtils';
import { useTableColors } from '../../hooks/useTableColors';
import { isColorDark } from '../../utils/colorUtils';
import { useCategories } from '../../contexts/CategoryContext';
import { MobileEditDialog } from './MobileEditDialog';
import { MobileAddDialog } from './MobileAddDialog';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { CopyMonthConfirmationDialog } from './CopyMonthConfirmationDialog';

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
    newIcon: string;
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
  setNewIcon: React.Dispatch<React.SetStateAction<string>>;
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
  // Get the categories from the CategoryContext
  const { categories } = useCategories();
  
  // Get utils for transaction operations
  const utils = useTransactionUtils();
  
  // Get color schemes for each category
  const { getTableColor } = useTableColors();
  
  // Extract props
  const props = value;
  const { category, transactions, allTransactions, isDark } = props;
  
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
  
  // Add an icon state for new transactions
  const [newIcon, setNewIcon] = useState<string>('');
  
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
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Filter transactions by selected months
  const filteredTransactions = React.useMemo(() => {
    if (!props.selectedMonths?.length) {
      return transactions;
    }
    
    const filtered = transactions.filter(transaction => {
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
      return props.selectedMonths?.includes(transactionMonth);
    });
    
    return filtered;
  }, [transactions, props.selectedMonths, props.category, refreshCounter]);
  
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
        amount: parseFloat(editingRow.amount) * (props.category === 'Income' ? 1 : -1),
        icon: editingRow.icon
      };
      
      const globalIndex = utils.findGlobalIndex(mobileEditTransaction.transaction, allTransactions);
      
      // Update all transactions with the same description to have the same icon
      if (editingRow.icon !== mobileEditTransaction.transaction.icon) {
        const indicesToUpdate = utils.updateTransactionsWithSameName(
          editingRow.description,
          editingRow.icon,
          allTransactions,
          mobileEditTransaction.transaction.id
        );
        
        // Update each transaction with the same description to have the same icon
        indicesToUpdate.forEach(idx => {
          props.onUpdateTransaction(idx, { icon: editingRow.icon });
        });
      }
      
      props.onUpdateTransaction(globalIndex, updatedTransaction);
      handleCloseMobileEdit();
    }
  }, [mobileEditTransaction, editingRow, props.category, utils, allTransactions, props.onUpdateTransaction]);
  
  const handleAddTransaction = useCallback(() => {
    if (!newDescription.trim() || !newAmount.trim()) return;

    const [year, month, day] = newDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    // First check if there are existing transactions with the same description
    // If so, use their icon for consistency
    let iconToUse = newIcon;
    const normalizedNewDescription = newDescription.trim().toLowerCase();
    
    const existingTransactionsWithSameName = allTransactions.filter(
      t => t.description.trim().toLowerCase() === normalizedNewDescription
    );
    
    if (existingTransactionsWithSameName.length > 0 && existingTransactionsWithSameName[0].icon) {
      // Use the icon from existing transactions
      iconToUse = existingTransactionsWithSameName[0].icon;
      console.log(`Using existing icon ${iconToUse} for transaction with description "${newDescription}"`);
    }

    const transaction: Transaction = {
      description: newDescription.trim(),
      amount: parseFloat(newAmount) * (props.category === 'Income' ? 1 : -1),
      date: date,
      category: props.category as 'Income' | 'Essentials' | 'Wants' | 'Savings',
      id: uuidv4(),
      type: props.category === 'Income' ? 'income' : 'expense',
      icon: iconToUse || undefined
    };

    props.onAddTransaction(transaction);
    
    // If we have an icon (either from input or from existing transactions),
    // update all other transactions with the same name to have this icon
    if (iconToUse) {
      const indicesToUpdate = utils.updateTransactionsWithSameName(
        newDescription.trim(),
        iconToUse,
        allTransactions,
        transaction.id
      );
      
      // Update each transaction with the same description to have the same icon
      if (indicesToUpdate.length > 0) {
        console.log(`Updating ${indicesToUpdate.length} transactions with description "${newDescription}" to have icon "${iconToUse}"`);
        
        indicesToUpdate.forEach(idx => {
          props.onUpdateTransaction(idx, { icon: iconToUse });
        });
      }
    }

    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewIcon('');
    setMobileAddDialogOpen(false);
  }, [newDescription, newAmount, newDate, newIcon, props.category, props.onAddTransaction, allTransactions, utils, props.onUpdateTransaction]);
  
  const handleDeleteClick = useCallback((e: React.MouseEvent | undefined, transaction: Transaction) => {
    // Only call stopPropagation if e is a valid event object
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    
    const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
    
    if (globalIndex !== -1) {
      setTransactionToDelete({ transaction, index: globalIndex });
      setDeleteConfirmOpen(true);
    }
  }, [utils, allTransactions]);
  
  const handleOpenMobileEdit = useCallback((transaction: Transaction, index: number) => {
    const transactionId = utils.getTransactionId(transaction);
    const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
    
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
      description: transaction.description,
      icon: transaction.icon || ''
    });
    
    setMobileEditDialogOpen(true);
  }, [utils, allTransactions]);
  
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
    setNewIcon('');
    setMobileAddDialogOpen(true);
  }, []);
  
  const handleCloseMobileAdd = useCallback(() => {
    setMobileAddDialogOpen(false);
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewIcon('');
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

    const targetMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      const month = date.toLocaleString('default', { month: 'long' });
      return month === copyTargetMonth && t.category === props.category;
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
      // Create a clean object without any undefined values to avoid Firestore errors
      const newTransaction: Transaction = {
        description: transaction.description,
        amount: props.category === 'Income' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount),
        date: newDate,
        category: props.category === 'Income' ? 'Income' : 'Expense',
        id: uuidv4(), // Generate new ID for the copy
        type: props.category === 'Income' ? 'income' : 'expense'
      };
      
      // Only include icon if it exists and is not undefined
      if (transaction.icon) {
        newTransaction.icon = transaction.icon;
      }

      // Add the new transaction
      props.onAddTransaction(newTransaction);
      
      // Force refresh the component
      forceRefresh();
      addedCount++;
    });

    // Show notification about duplicates if any were skipped
    if (duplicateCount > 0) {
      showNotification(`Copied ${addedCount} transactions. Skipped ${duplicateCount} duplicate transactions.`, 'success');
    }

    setCopyMonthDialogOpen(false);
  }, [copyTargetMonth, copyTransactions, props.category, props.onAddTransaction]);
  
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
  
  // Style functions
  const getBackgroundStyles = useCallback(() => {
    // First try to get color from categories
    const categoryObj = categories.find(cat => cat.name === category);
    let backgroundColor = categoryObj?.color;
    
    // If not found, fall back to the getTableColor function
    if (!backgroundColor) {
      backgroundColor = getTableColor(category);
    }
    
    // Apply the background color
    return {
      backgroundColor,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      // Add more styles as needed
    };
  }, [category, isDark, categories, getTableColor]);
  
  const getCategoryBackgroundColor = useCallback(() => {
    // First try to get color from categories
    const categoryObj = categories.find(cat => cat.name === category);
    if (categoryObj) {
      return categoryObj.color;
    }
    
    // Fall back to the table color
    return getTableColor(category);
  }, [category, categories, getTableColor]);
  
  const getCardBackgroundColor = useCallback((isHover = false) => {
    // Get the background color for the category
    const baseColor = getCategoryBackgroundColor() || '#f5f5f5';
    const isCustomColor = baseColor !== '#f5f5f5';
    const isDarkColor = isCustomColor && isColorDark(baseColor);
    
    // Apply hover effect if needed
    if (isHover) {
      return isDarkColor 
        ? adjustColor(baseColor, 20) // Lighten dark colors
        : adjustColor(baseColor, -10); // Darken light colors
    }
    
    return baseColor;
  }, [getCategoryBackgroundColor]);
  
  // Function to adjust color lightness
  const adjustColor = (hex: string, amount: number) => {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);
    
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };
  
  // Get card hover styles
  const getCardHoverStyles = useCallback(() => {
    return {
      backgroundColor: getCardBackgroundColor(true),
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    };
  }, [getCardBackgroundColor]);
  
  // Get text color based on background
  const getTextColor = useCallback((isHover = false) => {
    const bgColor = getCardBackgroundColor(isHover);
    return isColorDark(bgColor) ? '#ffffff' : '#000000';
  }, [getCardBackgroundColor]);
  
  const contextValue = {
    props,
    dragState: {
      draggedTransaction,
      draggedIndex,
      dragSourceMonth,
      dragOverMonth,
      isDragging,
      isCopyMode,
      dragLeaveTimeout,
      dragOverIndex,
      isIntraMonthDrag
    },
    utils,
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
    groupTransactionsByMonth,
    formatDate,
    totalAmount,
    filteredTransactions,
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
      newDate,
      newIcon
    },
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
    setNewIcon,
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
    forceRefresh,
    showNotification,
    getBackgroundStyles,
    getCategoryBackgroundColor,
    getCardBackgroundColor,
    getCardHoverStyles,
    getTextColor,
    getMonthOrder,
    isColorDark
  };
  
  return (
    <TransactionTableContext.Provider value={contextValue}>
      {children}
      
      {/* Mobile edit dialog */}
      <MobileEditDialog
        open={mobileEditDialogOpen}
        category={props.category}
        editingRow={editingRow}
        onClose={handleCloseMobileEdit}
        onSave={handleSaveEdit}
        onDelete={() => {
          if (mobileEditTransaction) {
            handleDeleteClick(undefined, mobileEditTransaction.transaction);
            handleCloseMobileEdit();
          }
        }}
        handleEditingChange={handleEditingChange}
        generateDayOptions={utils.generateDayOptions}
        getOrdinalSuffix={utils.getOrdinalSuffix}
        tableColor={getCategoryBackgroundColor() || '#f5f5f5'}
        isDark={isDark}
      />
      
      {/* Mobile add dialog */}
      <MobileAddDialog
        open={mobileAddDialogOpen}
        category={props.category}
        newDescription={newDescription}
        newAmount={newAmount}
        newDate={newDate}
        setNewDescription={setNewDescription}
        setNewAmount={setNewAmount}
        setNewDate={setNewDate}
        onClose={handleCloseMobileAdd}
        onAdd={handleAddTransaction}
        generateDayOptions={utils.generateDayOptions}
        getOrdinalSuffix={utils.getOrdinalSuffix}
        tableColor={getCategoryBackgroundColor() || '#f5f5f5'}
        isDark={isDark}
        icon={newIcon}
        setIcon={setNewIcon}
      />
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        transactionToDelete={transactionToDelete}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTransactionToDelete(null);
        }}
        onConfirm={() => {
          if (transactionToDelete) {
            props.onDeleteTransaction(transactionToDelete.index);
            setDeleteConfirmOpen(false);
            setTransactionToDelete(null);
          }
        }}
      />
      
      {/* Copy month confirmation dialog */}
      <CopyMonthConfirmationDialog
        open={copyMonthDialogOpen}
        onClose={() => setCopyMonthDialogOpen(false)}
        onConfirm={handleCopyMonthConfirm}
        sourceMonth={copySourceMonth}
        targetMonth={copyTargetMonth}
        transactionCount={copyTransactions.length}
        onTargetMonthChange={setCopyTargetMonth}
      />
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