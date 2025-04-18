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
  showNotification: (message: string, type?: 'error' | 'warning' | 'success' | 'info') => void;
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
  console.log('TransactionTableProvider value:', {
    hasAddTransactionBatch: !!value.onAddTransactionBatch,
    category: value.category
  });
  
  // Get the categories from the CategoryContext
  const { categories } = useCategories();
  
  // Get utils for transaction operations
  const utils = useTransactionUtils();
  
  // Get color schemes for each category
  const [tableColors, , handleCategoryRename] = useTableColors();
  
  // Helper function to get the table color for a specific category
  const getTableColor = useCallback((categoryName: string) => {
    return tableColors[categoryName] || '#f5f5f5'; // Default light gray if no color is set
  }, [tableColors]);
  
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
  const [dialogState, setDialogState] = useState({
    deleteConfirmOpen: false,
    transactionToDelete: null as { transaction: Transaction, index: number } | null,
    mobileEditDialogOpen: false,
    mobileEditTransaction: null as { transaction: Transaction; index: number; identifier: string; } | null,
    mobileAddDialogOpen: false,
    copyMonthDialogOpen: false,
    copySourceMonth: '',
    copyTargetMonth: '',
    copyTransactions: [] as Transaction[],
    newDescription: '',
    newAmount: '',
    newDate: '',
    newIcon: '',
    editingRow: null as any | null
  });
  
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
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Filter transactions by selected months
  const filteredTransactions = React.useMemo(() => {
    console.log(`Recomputing filtered transactions for ${category}, refresh counter: ${refreshCounter}`);
    
    // Create a unique key for debugging transaction updates
    const transactionIds = transactions.map(t => t.id).join(',').substring(0, 50);
    console.log(`Transaction IDs hash: ${transactionIds}... (${transactions.length} transactions total)`);
    
    if (!props.selectedMonths?.length) {
      console.log(`No months selected, returning all ${transactions.length} transactions`);
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
      
      // Log when filtering transactions for debugging purposes
      if (props.category === 'Income' && transaction.description.includes('test')) {
        console.log(`Filtering transaction: ${transaction.description} in ${transactionMonth}, selected: ${props.selectedMonths?.includes(transactionMonth)}`);
      }
      
      return props.selectedMonths?.includes(transactionMonth);
    });
    
    console.log(`Filtered from ${transactions.length} to ${filtered.length} transactions for ${category}`);
    return filtered;
  }, [transactions, props.selectedMonths, props.category, refreshCounter, category]);
  
  // Handler functions
  const handleEditingChange = useCallback((field: string, value: string) => {
    if (dialogState.editingRow) {
      setDialogState(prev => ({
        ...prev,
        editingRow: {
          ...prev.editingRow,
          [field]: value
        }
      }));
    }
  }, [dialogState.editingRow]);
  
  const handleCloseMobileEdit = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      mobileEditDialogOpen: false,
      mobileEditTransaction: null,
      editingRow: null
    }));
  }, []);
  
  const handleSaveEdit = useCallback(() => {
    if (!dialogState.mobileEditTransaction || !dialogState.editingRow) {
      console.warn("Cannot save edit: missing mobileEditTransaction or editingRow in dialogState", { 
        hasMobileEditTransaction: !!dialogState.mobileEditTransaction,
        hasEditingRow: !!dialogState.editingRow
      });
      return;
    }
    
    // Validate required fields
    const { description, amount, date } = dialogState.editingRow;
    if (!description || !amount || !date) {
      console.warn("Cannot save edit: missing required fields", { description, amount, date });
      return;
    }
    
    // Check that date is in the correct format (YYYY-MM-DD)
    const dateparts = date.split('-');
    if (dateparts.length !== 3) {
      console.warn("Cannot save edit: invalid date format", { date });
      return;
    }
    
    const [year, month, day] = dateparts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn("Cannot save edit: invalid date components", { year, month, day });
      return;
    }
    
    // Check that amount is a valid number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      console.warn("Cannot save edit: invalid amount", { amount });
      return;
    }
    
    const updatedTransaction: Partial<Transaction> = {
      description: description,
      date: new Date(year, month - 1, day),
      amount: parsedAmount * (props.category === 'Income' ? 1 : -1),
      icon: dialogState.editingRow.icon
    };
    
    const globalIndex = utils.findGlobalIndex(dialogState.mobileEditTransaction.transaction, allTransactions);
    if (globalIndex === -1) {
      console.error("Cannot save edit: transaction not found in allTransactions", dialogState.mobileEditTransaction.transaction);
      handleCloseMobileEdit();
      return;
    }
    
    // Check if icon was changed
    if (dialogState.editingRow.icon !== dialogState.mobileEditTransaction.transaction.icon) {
      // First update the specific transaction
      props.onUpdateTransaction(globalIndex, updatedTransaction);
      
      // Then use the specialized function to update all transactions with the same name
      if (props.onUpdateAllTransactionsWithSameName) {
        props.onUpdateAllTransactionsWithSameName(dialogState.editingRow.description, dialogState.editingRow.icon, dialogState.mobileEditTransaction.transaction.id);
      } else {
        // Fallback to the old method if the specialized function is not available
        const indicesToUpdate = utils.updateTransactionsWithSameName(
          dialogState.editingRow.description,
          dialogState.editingRow.icon,
          allTransactions,
          dialogState.mobileEditTransaction.transaction.id
        );
        
        // Update each transaction with the same description to have the same icon
        indicesToUpdate.forEach(idx => {
          props.onUpdateTransaction(idx, { icon: dialogState.editingRow.icon });
        });
      }
    } else {
      // No icon change, just update the transaction normally
      props.onUpdateTransaction(globalIndex, updatedTransaction);
    }
    
    handleCloseMobileEdit();
  }, [dialogState, props.category, utils, allTransactions, props.onUpdateTransaction, props.onUpdateAllTransactionsWithSameName, handleCloseMobileEdit]);
  
  const handleAddTransaction = useCallback(() => {
    if (!dialogState.newDescription.trim() || !dialogState.newAmount.trim()) return;

    const [year, month, day] = dialogState.newDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    // First check if there are existing transactions with the same description
    // If so, use their icon for consistency
    let iconToUse = dialogState.newIcon;
    const normalizedNewDescription = dialogState.newDescription.trim().toLowerCase();
    
    const existingTransactionsWithSameName = allTransactions.filter(
      t => t.description.trim().toLowerCase() === normalizedNewDescription
    );
    
    if (existingTransactionsWithSameName.length > 0 && existingTransactionsWithSameName[0].icon) {
      // Use the icon from existing transactions
      iconToUse = existingTransactionsWithSameName[0].icon;
    }

    const transaction: Transaction = {
      description: dialogState.newDescription.trim(),
      amount: parseFloat(dialogState.newAmount) * (props.category === 'Income' ? 1 : -1),
      date: date,
      category: props.category as any,
      id: uuidv4(),
      type: props.category === 'Income' ? 'income' : 'expense',
      icon: iconToUse || undefined
    };

    props.onAddTransaction(transaction);
    
    // If we have an icon (either from input or from existing transactions),
    // update all other transactions with the same name to have this icon
    if (iconToUse) {
      const indicesToUpdate = utils.updateTransactionsWithSameName(
        dialogState.newDescription.trim(),
        iconToUse,
        allTransactions,
        transaction.id
      );
      
      // Update each transaction with the same description to have the same icon
      if (indicesToUpdate.length > 0) {
        
        indicesToUpdate.forEach(idx => {
          props.onUpdateTransaction(idx, { icon: iconToUse });
        });
      }
    }

    // Reset form values
    setDialogState(prev => ({
      ...prev,
      newDescription: '',
      newAmount: '',
      newDate: new Date().toISOString().split('T')[0],
      newIcon: '',
      mobileAddDialogOpen: false
    }));
  }, [dialogState, props.category, props.onAddTransaction, allTransactions, utils, props.onUpdateTransaction]);
  
  const handleDeleteClick = useCallback((e: React.MouseEvent | undefined, transaction: Transaction) => {
    // Only call stopPropagation if e is a valid event object
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    
    const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
    
    if (globalIndex !== -1) {
      setDialogState(prev => ({
        ...prev,
        transactionToDelete: { transaction, index: globalIndex },
        deleteConfirmOpen: true
      }));
    }
  }, [utils, allTransactions]);
  
  const handleOpenMobileEdit = useCallback((transaction: Transaction, index: number) => {
    const transactionId = utils.getTransactionId(transaction);
    const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
    
    if (globalIndex === -1) {
      console.error("Could not find transaction in allTransactions:", transaction);
      return;
    }
    
    const dateString = transaction.date instanceof Date 
      ? transaction.date.toISOString().split('T')[0]
      : (typeof transaction.date === 'string' 
        ? new Date(transaction.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]);
    
    // Create a deep copy of the transaction to prevent reference issues
    const transactionCopy = JSON.parse(JSON.stringify(transaction));
    
    setDialogState(prev => ({
      ...prev,
      mobileEditTransaction: {
        transaction: transactionCopy,
        index,
        identifier: transactionId
      },
      editingRow: {
        index: globalIndex,
        identifier: transactionId,
        amount: Math.abs(transaction.amount).toString(),
        date: dateString,
        description: transaction.description,
        icon: transaction.icon || ''
      },
      mobileEditDialogOpen: true
    }));
  }, [utils, allTransactions]);
  
  const handleOpenMobileAdd = useCallback((month: string) => {
    const currentYear = new Date().getFullYear();
    const monthIndex = new Date(`${month} 1`).getMonth();
    const firstOfMonth = new Date(currentYear, monthIndex, 1);
    const newDateValue = firstOfMonth.toISOString().split('T')[0];

    setDialogState(prev => ({
      ...prev,
      newDescription: '',
      newAmount: '',
      newDate: newDateValue,
      newIcon: '',
      mobileAddDialogOpen: true
    }));
  }, []);
  
  const handleCloseMobileAdd = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      mobileAddDialogOpen: false,
      newDescription: '',
      newAmount: '',
      newDate: new Date().toISOString().split('T')[0],
      newIcon: ''
    }));
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
    setDialogState(prev => ({
      ...prev,
      copySourceMonth: month,
      copyTargetMonth: nextMonth,
      copyTransactions: transactions,
      copyMonthDialogOpen: true
    }));
  }, [getNextMonth]);
  
  // Force a refresh of the component
  const forceRefresh = useCallback(() => {
    console.log('Forcing refresh with counter:', refreshCounter + 1);
    setRefreshCounter(prev => prev + 1);
    
    // Also dispatch a custom event that parent components can listen for
    const refreshEvent = new CustomEvent('transactionsUpdated', {
      detail: { 
        category,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(refreshEvent);
  }, [refreshCounter, category]);
  
  // Helper function to show notifications
  const showNotification = useCallback((message: string, type: 'error' | 'warning' | 'success' | 'info' = 'error') => {
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
        : type === 'info'
          ? 'rgba(33, 150, 243, 0.9)' // Blue for info
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
  
  const handleCopyMonthConfirm = useCallback(() => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Get the source month's index
    const sourceMonthIndex = months.indexOf(dialogState.copySourceMonth || '');
    const targetMonthIndex = months.indexOf(dialogState.copyTargetMonth || '');
    
    if (sourceMonthIndex === -1 || targetMonthIndex === -1) {
      return; // Invalid month
    }
    
    // Count for tracking
    let addedCount = 0;
    let duplicateCount = 0;
    
    // Get all transactions in the target month
    const targetMonthTransactions = props.allTransactions.filter(t => {
      const date = new Date(t.date);
      const month = date.toLocaleString('default', { month: 'long' });
      return month === dialogState.copyTargetMonth;
    });
    
    // Array to hold transactions to add
    const transactionsToAdd: Transaction[] = [];

    // Copy each transaction if it doesn't already exist in target month
    dialogState.copyTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
      
      // Check for duplicates
      const existingTransaction = targetMonthTransactions.find(t => 
        t.description === transaction.description && 
        Math.abs(t.amount) === Math.abs(transaction.amount)
      );

      if (existingTransaction) {
        duplicateCount++;
        return;
      }

      // Create a clean transaction object
      const newTransaction: Transaction = {
        description: transaction.description,
        amount: props.category === 'Income' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount),
        date: newDate,
        category: props.category as any,
        id: uuidv4(),
        type: props.category === 'Income' ? 'income' : 'expense'
      };
      
      // Only include icon if it exists
      if (transaction.icon) {
        newTransaction.icon = transaction.icon;
      }

      // Add to batch instead of adding immediately
      transactionsToAdd.push(newTransaction);
      addedCount++;
    });

    console.log('Copy month - transactionsToAdd:', transactionsToAdd);
    console.log('Copy month - props.onAddTransactionBatch exists:', !!props.onAddTransactionBatch);
    
    // Close the dialog immediately to prevent double-clicks
    setDialogState(prev => ({
      ...prev,
      copyMonthDialogOpen: false
    }));
    
    // Store the timestamp when we started the operation
    const operationStartTime = Date.now();
    
    // Add all transactions at once if possible
    if (typeof props.onAddTransactionBatch === 'function' && transactionsToAdd.length > 0) {
      console.log('Copy month - Using batch function to add transactions');
      
      // Call the batch add function and handle the promise
      props.onAddTransactionBatch(transactionsToAdd)
        .then(() => {
          console.log('Batch transaction add completed successfully');
          
          // Notify any parent components that they need to refresh their data
          const refreshEvent = new CustomEvent('forceParentDataRefresh', {
            detail: { 
              category,
              timestamp: operationStartTime,
              count: transactionsToAdd.length
            }
          });
          document.dispatchEvent(refreshEvent);
          
          // Show success message
          if (addedCount > 0) {
            showNotification(`Copied ${addedCount} transactions from ${dialogState.copySourceMonth} to ${dialogState.copyTargetMonth}`, 'success');
          }
          
          // Force our own refresh
          console.log('Forcing multiple UI refreshes after batch completion');
          [0, 100, 300, 500, 1000, 2000].forEach(delay => {
            setTimeout(() => {
              console.log(`Post-batch refresh at ${delay}ms`);
              forceRefresh();
            }, delay);
          });
        })
        .catch(error => {
          console.error('Error in batch transaction add:', error);
          showNotification('Error adding transactions', 'error');
        });
    } else {
      console.log('Copy month - Falling back to adding one by one');
      
      // Create an array of promises for each transaction add
      const addPromises = transactionsToAdd.map(transaction => 
        props.onAddTransaction(transaction)
          .catch(error => {
            console.error('Error adding transaction:', error);
            return null;
          })
      );
      
      // Wait for all transactions to be added
      Promise.all(addPromises)
        .then(() => {
          console.log('All individual transaction adds completed');
          
          // Notify any parent components that they need to refresh their data
          const refreshEvent = new CustomEvent('forceParentDataRefresh', {
            detail: { 
              category,
              timestamp: operationStartTime,
              count: transactionsToAdd.length
            }
          });
          document.dispatchEvent(refreshEvent);
          
          // Force our own refresh
          console.log('Forcing multiple UI refreshes after individual adds completion');
          [0, 100, 300, 500, 1000, 2000].forEach(delay => {
            setTimeout(() => {
              console.log(`Post-individual refresh at ${delay}ms`);
              forceRefresh();
            }, delay);
          });
        });
    }
    
    // Show info message if we skipped any duplicates
    if (duplicateCount > 0) {
      showNotification(`Skipped ${duplicateCount} duplicate transactions`, 'info');
    }
    
  }, [
    dialogState,
    props, 
    forceRefresh, 
    showNotification,
    category
  ]);
  
  // Add a function to copy a transaction to all months
  const handleCopyToAllMonths = useCallback((transaction: Transaction) => {
    // Get all available months
    const allMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Get the current month of the transaction
    const transactionMonth = new Date(transaction.date).toLocaleString('default', { month: 'long' });
    
    // Show immediate feedback
    showNotification(`Copying transaction to other months...`, 'info');
    
    // Create a count for successful copies
    let copyCount = 0;
    
    // Prepare transactions to add in batch
    const transactionsToAdd: Transaction[] = [];
    
    // Copy to all other months
    allMonths.forEach(month => {
      // Skip the month that already has this transaction
      if (month === transactionMonth) {
        return;
      }
      
      // Check if the transaction already exists in this month
      const monthTransactions = props.allTransactions.filter(t => {
        const tMonth = new Date(t.date).toLocaleString('default', { month: 'long' });
        return tMonth === month && t.category === transaction.category;
      });
      
      // Check for duplicates in the target month
      const isDuplicate = monthTransactions.some(
        t => 
          t.description === transaction.description && 
          Math.abs(t.amount) === Math.abs(transaction.amount)
      );
      
      if (isDuplicate) {
        // Skip if duplicate exists
        return;
      }
      
      // Convert the target month to a date
      const targetMonthIndex = new Date(`${month} 1`).getMonth();
      
      // Create a new date for the copied transaction
      const currentDate = new Date(transaction.date);
      const newDate = new Date(
        currentDate.getFullYear(),
        targetMonthIndex,
        currentDate.getDate()
      );
      
      // Create a copy of the transaction with the new date and a new ID
      const transactionCopy: Transaction = {
        ...transaction,
        date: newDate,
        id: uuidv4() // Generate a new ID
      };
      
      // Add to batch instead of adding immediately
      transactionsToAdd.push(transactionCopy);
      copyCount++;
    });
    
    // If no transactions to add, show a message and return early
    if (transactionsToAdd.length === 0) {
      showNotification('No additional months to copy to (duplicate check)', 'warning');
      return;
    }
    
    // Store the timestamp when we started the operation
    const operationStartTime = Date.now();
    
    // Add all transactions at once if possible
    if (typeof props.onAddTransactionBatch === 'function' && transactionsToAdd.length > 0) {
      console.log(`Copying "${transaction.description}" to ${copyCount} other months using batch function`);
      
      // Call the batch add function and handle the promise
      props.onAddTransactionBatch(transactionsToAdd)
        .then(() => {
          console.log('Batch transaction add completed for copy to all months');
          
          // TARGETED APPROACH: Update just this component by forcing a refresh
          forceRefresh();
          
          // Show success message
          showNotification(`Copied "${transaction.description}" to ${copyCount} other months`, 'success');
          
          // Force a reload of the transactions list from the server ONLY if needed
          // This is a more targeted approach that doesn't refresh the whole screen
          if (props.onForceReload) {
            console.log('Calling onForceReload with targeted approach');
            
            // Dispatch a custom event specifically for updating this category's transactions
            const updateEvent = new CustomEvent('updateCategoryTransactions', {
              detail: { 
                category,
                operation: 'copyToAllMonths',
                timestamp: Date.now()
              }
            });
            document.dispatchEvent(updateEvent);
            
            // Only call force reload once
            props.onForceReload();
          }
        })
        .catch(error => {
          console.error('Error in batch transaction add for copy to all months:', error);
          showNotification('Error copying transaction to all months', 'error');
        });
    } else {
      console.log(`Copying "${transaction.description}" to ${copyCount} other months one by one`);
      
      // Create an array of promises for each transaction add
      const addPromises = transactionsToAdd.map(transaction => 
        props.onAddTransaction(transaction)
          .catch(error => {
            console.error('Error adding transaction:', error);
            return null;
          })
      );
      
      // Wait for all transactions to be added
      Promise.all(addPromises)
        .then(() => {
          console.log('All individual transaction adds completed for copy to all months');
          
          // TARGETED APPROACH: Update just this component by forcing a refresh
          forceRefresh();
          
          // Show a notification about the result
          showNotification(`Copied "${transaction.description}" to ${copyCount} other months`, 'success');
          
          // Force a reload of the transactions list from the server ONLY if needed
          if (props.onForceReload) {
            console.log('Calling onForceReload with targeted approach');
            
            // Dispatch a custom event specifically for updating this category's transactions
            const updateEvent = new CustomEvent('updateCategoryTransactions', {
              detail: { 
                category,
                operation: 'copyToAllMonths',
                timestamp: Date.now()
              }
            });
            document.dispatchEvent(updateEvent);
            
            // Only call force reload once
            props.onForceReload();
          }
        });
    }
  }, [props.allTransactions, props.category, props.onAddTransaction, props.onAddTransactionBatch, props.onForceReload, forceRefresh, showNotification, category]);
  
  const getMonthOrder = useCallback((month: string): number => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
  }, []);
  
  // Listen for transaction updates from the parent
  React.useEffect(() => {
    const handleParentUpdate = (event: Event) => {
      // Force a refresh when parent transactions update
      forceRefresh();
    };
    
    // Listen for the custom event
    document.addEventListener('parentTransactionsUpdated', handleParentUpdate);
    
    // Clean up when the component unmounts
    return () => {
      document.removeEventListener('parentTransactionsUpdated', handleParentUpdate);
    };
  }, [forceRefresh]);
  
  // Listen for transaction icons updated event
  React.useEffect(() => {
    const handleTransactionIconsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{category: string, icon: string}>;
      const { category: updatedCategory } = customEvent.detail;
      
      // Only proceed if this is our category
      if (updatedCategory === category) {
        // Force re-render to update icons in the UI
        forceRefresh();
      }
    };
    
    // Listen for the custom event
    document.addEventListener('transactionIconsUpdated', handleTransactionIconsUpdated);
    
    // Clean up when the component unmounts
    return () => {
      document.removeEventListener('transactionIconsUpdated', handleTransactionIconsUpdated);
    };
  }, [category, forceRefresh]);
  
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
  
  // Update dialog setter and getter convenience methods for better readability
  const setDialogStateValue = useCallback(<K extends keyof typeof dialogState>(key: K, value: typeof dialogState[K]) => {
    setDialogState(prev => ({ ...prev, [key]: value }));
  }, []);
  
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
    dialogState,
    setEditingRow: (value: any) => setDialogStateValue('editingRow', value),
    setDeleteConfirmOpen: (value: boolean) => setDialogStateValue('deleteConfirmOpen', value),
    setTransactionToDelete: (value: { transaction: Transaction, index: number } | null) => 
      setDialogStateValue('transactionToDelete', value),
    setMobileEditDialogOpen: (value: boolean) => setDialogStateValue('mobileEditDialogOpen', value),
    setMobileEditTransaction: (value: { transaction: Transaction; index: number; identifier: string; } | null) => 
      setDialogStateValue('mobileEditTransaction', value),
    setMobileAddDialogOpen: (value: boolean) => setDialogStateValue('mobileAddDialogOpen', value),
    setCopyMonthDialogOpen: (value: boolean) => setDialogStateValue('copyMonthDialogOpen', value),
    setCopySourceMonth: (value: string) => setDialogStateValue('copySourceMonth', value),
    setCopyTargetMonth: (value: string) => setDialogStateValue('copyTargetMonth', value),
    setCopyTransactions: (value: Transaction[]) => setDialogStateValue('copyTransactions', value),
    setNewDescription: (value: string) => setDialogStateValue('newDescription', value),
    setNewAmount: (value: string) => setDialogStateValue('newAmount', value),
    setNewDate: (value: string) => setDialogStateValue('newDate', value),
    setNewIcon: (value: string) => setDialogStateValue('newIcon', value),
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
    handleCopyToAllMonths,
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
        open={dialogState.mobileEditDialogOpen}
        category={props.category}
        editingRow={dialogState.editingRow}
        onClose={handleCloseMobileEdit}
        onSave={handleSaveEdit}
        onDelete={() => {
          if (dialogState.mobileEditTransaction) {
            handleDeleteClick(undefined, dialogState.mobileEditTransaction.transaction);
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
        open={dialogState.mobileAddDialogOpen}
        category={props.category}
        newDescription={dialogState.newDescription}
        newAmount={dialogState.newAmount}
        newDate={dialogState.newDate}
        setNewDescription={(value) => setDialogStateValue('newDescription', value)}
        setNewAmount={(value) => setDialogStateValue('newAmount', value)}
        setNewDate={(value) => setDialogStateValue('newDate', value)}
        onClose={handleCloseMobileAdd}
        onAdd={handleAddTransaction}
        generateDayOptions={utils.generateDayOptions}
        getOrdinalSuffix={utils.getOrdinalSuffix}
        tableColor={getCategoryBackgroundColor() || '#f5f5f5'}
        isDark={isDark}
        icon={dialogState.newIcon}
        setIcon={(value) => setDialogStateValue('newIcon', value)}
      />
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={dialogState.deleteConfirmOpen}
        transactionToDelete={dialogState.transactionToDelete}
        onClose={() => {
          setDialogState(prev => ({
            ...prev,
            deleteConfirmOpen: false,
            transactionToDelete: null
          }));
        }}
        onConfirm={() => {
          if (dialogState.transactionToDelete) {
            props.onDeleteTransaction(dialogState.transactionToDelete.index);
            setDialogState(prev => ({
              ...prev,
              deleteConfirmOpen: false,
              transactionToDelete: null
            }));
          }
        }}
      />
      
      {/* Copy month confirmation dialog */}
      <CopyMonthConfirmationDialog
        open={dialogState.copyMonthDialogOpen}
        onClose={() => setDialogStateValue('copyMonthDialogOpen', false)}
        onConfirm={handleCopyMonthConfirm}
        sourceMonth={dialogState.copySourceMonth}
        targetMonth={dialogState.copyTargetMonth}
        category={props.category}
        transactionCount={dialogState.copyTransactions.length}
        onTargetMonthChange={(value) => setDialogStateValue('copyTargetMonth', value)}
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