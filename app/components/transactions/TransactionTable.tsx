import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Paper, Typography, useTheme, useMediaQuery, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, Tooltip } from '@mui/material';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { MobileEditDialog } from './MobileEditDialog';
import { MobileAddDialog } from './MobileAddDialog';
import { CopyMonthConfirmationDialog } from './CopyMonthConfirmationDialog';
import { TransactionTableProvider, useTransactionTableContext } from './TransactionTableContext';
import { TransactionTableHeader } from './TransactionTableHeader';
import { MonthColumn } from './MonthColumn';
import { DragIndicator } from './DragIndicator';
import type { Transaction } from '../../services/fileParser';
import type { TransactionTableContextProps, SortOption } from './types';
import { v4 as uuidv4 } from 'uuid';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useTableColors } from '../../hooks/useTableColors';
import { EmptyTable } from './EmptyTable';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface TransactionTableProps {
  category: string;
  transactions: Transaction[];
  allTransactions: Transaction[];
  onUpdateTransaction: (index: number, updatedTransaction: Partial<Transaction>) => void;
  onDeleteTransaction: (index: number) => void;
  onAddTransaction: (transaction: Transaction) => void;
  onAddTransactionBatch?: (transactions: Transaction[]) => void;
  onUpdateAllTransactionsWithSameName?: (description: string, icon: string, excludeId?: string) => Promise<number | undefined>;
  onForceReload?: () => void;
  onDragStart?: (e: React.DragEvent, transaction: Transaction, globalIndex: number) => void;
  onDragOver?: (e: React.DragEvent, category: string) => void;
  onDrop?: (e: React.DragEvent, targetCategory: string) => void;
  dragOverCategory?: string | null;
  recentlyDropped?: string | null;
  onReorder?: (category: string, sourceIndex: number, targetIndex: number) => void;
  selectedMonths?: string[];
  month: string;
  isDark: boolean;
  onTransactionsChange: (newTransactions: Transaction[]) => void;
  onAlertMessage?: (message: { type: 'error' | 'warning' | 'info' | 'success', message: string }) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = (props) => {
  console.log('TransactionTable props:', {
    hasAddTransactionBatch: !!props.onAddTransactionBatch,
    category: props.category
  });
  
  return (
    <TransactionTableProvider value={props as TransactionTableContextProps}>
      <TransactionTableContent />
    </TransactionTableProvider>
  );
};

export const TransactionTableContent: React.FC = () => {
  const context = useTransactionTableContext();
  const { user } = useAuth();
  const { categories, updateCategory, deleteCategory, getCategoryByName } = useCategories();
  const [tableColors] = useTableColors();
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'date', direction: 'desc' });
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  
  // Load initial expanded state from localStorage and save changes
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(`category_${context.props.category}_expanded`);
      if (savedState !== null) {
        setIsExpanded(JSON.parse(savedState));
      }
    } catch (error) {
      console.error('Error loading expanded state:', error);
    }
  }, [context.props.category]);
  
  // Toggle expand/collapse function
  const toggleExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    // Save to localStorage
    try {
      localStorage.setItem(`category_${context.props.category}_expanded`, JSON.stringify(newExpandedState));
    } catch (error) {
      console.error('Error saving expanded state:', error);
    }
  };

  const { 
    props, 
    dragState, 
    utils,
    dialogState,
    setDeleteConfirmOpen,
    setTransactionToDelete,
    handleCloseMobileEdit,
    handleSaveEdit,
    handleEditingChange,
    handleCloseMobileAdd,
    handleAddTransaction,
    setCopyMonthDialogOpen,
    handleCopyMonthConfirm,
    getBackgroundStyles,
    getTextColor,
    getMonthOrder,
    groupTransactionsByMonth,
    handleOpenMobileEdit,
    handleOpenMobileAdd,
    handleCopyMonthClick,
    getNextMonth,
    handleDeleteClick,
    filteredTransactions,
    isColorDark,
    setDraggedTransaction,
    setDraggedIndex,
    setDragSourceMonth,
    setIsDragging,
    setIsCopyMode,
    setIsIntraMonthDrag,
    setDragOverMonth,
    setDragOverIndex,
    setDragLeaveTimeout,
    resetDragState,
    showNotification
  } = context;
  
  const { category, transactions, isDark, onDeleteTransaction, selectedMonths } = props;
  const { 
    isDragging, 
    draggedTransaction, 
    draggedIndex, 
    dragSourceMonth, 
    dragOverMonth, 
    dragOverIndex, 
    isIntraMonthDrag, 
    isCopyMode,
    dragLeaveTimeout
  } = dragState;
  
  // First, define the getCategoryBackgroundColor function
  const getCategoryBackgroundColor = useCallback(() => {
    // First check if we have a custom color set via the color picker
    if (tableColors && tableColors[category]) {
      return tableColors[category];
    }
    
    // If no custom color is set in tableColors, fallback to category colors
    const foundCategory = categories.find(c => c.name === category);
    
    if (foundCategory) {
      return foundCategory.color;
    }
    
    // Fallback to default table color for this category
    return props.isDark ? '#424242' : '#f5f5f5';
  }, [category, categories, props.isDark, tableColors]);

  // Determine if we have custom colors - define these before using them
  const hasCustomColor = getCategoryBackgroundColor() !== (isDark ? '#424242' : '#f5f5f5');
  const hasCustomDarkColor = hasCustomColor && isColorDark(getCategoryBackgroundColor() || '');

  // Update this function to handle light Essentials colors correctly
  const getTextColorForBackground = (backgroundColor: string) => {
    // If the background color is light (not dark), text should be black
    return isColorDark(backgroundColor) ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)';
  };

  // Now define getUpdatedBackgroundStyles using the variables we've already defined
  const getUpdatedBackgroundStyles = () => {
    const baseStyles = getBackgroundStyles();
    if (hasCustomColor) {
      const bgColor = getCategoryBackgroundColor();
      return {
        ...baseStyles,
        backgroundColor: bgColor,
        // Adjust text colors based on background darkness
        color: getTextColorForBackground(bgColor || ''),
      };
    }
    return baseStyles;
  };

  const backgroundStyles = getUpdatedBackgroundStyles();
  
  // Get the current category data to pass to the header
  const categoryData = categories.find(c => c.name === category);
  
  // Function to determine if the Essentials category is using a light background 
  // that requires black text for better visibility
  const needsDarkText = () => {
    // For Essentials category, check if it's using a light background
    if (category === 'Essentials') {
      const bgColor = getCategoryBackgroundColor();
      if (bgColor && !isColorDark(bgColor)) {
        return true;
      }
    }
    return false;
  };

  // Calculate total budget across all non-income categories
  const calculateTotalBudget = () => {
    // Filter out income transactions
    const nonIncomeTransactions = props.allTransactions.filter(t => {
      const transactionCategory = categories.find(c => c.name === t.category);
      return transactionCategory && !transactionCategory.isIncome;
    });
    
    // Sum the absolute amounts
    return nonIncomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };
  
  const totalBudget = calculateTotalBudget();
  
  // Listen for category icon update events and update all transaction icons
  useEffect(() => {
    const handleCategoryIconUpdated = async (event: Event) => {
      // Cast the event to CustomEvent with the correct type
      const customEvent = event as CustomEvent<{category: string, icon: string}>;
      const { category: updatedCategory, icon } = customEvent.detail;

      // Only proceed if this is our category
      if (updatedCategory === category && props.onUpdateAllTransactionsWithSameName) {
        
        // Filter transactions to find all that belong to this category
        const categoryTransactions = transactions.filter(t => t.category === category);
        
        // Update all transactions in the category with the new icon
        for (const transaction of categoryTransactions) {
          // For each description in the category, update all transactions with that description
          try {
            await props.onUpdateAllTransactionsWithSameName(transaction.description, icon);
          } catch (error) {
            console.error('Error updating transaction icons:', error);
          }
        }
      }
    };
    
    // Listen for the custom event
    document.addEventListener('categoryIconUpdated', handleCategoryIconUpdated);
    
    // Clean up when the component unmounts
    return () => {
      document.removeEventListener('categoryIconUpdated', handleCategoryIconUpdated);
    };
  }, [category, transactions, props.onUpdateAllTransactionsWithSameName]);
  
  // Load sort preference from Firebase
  useEffect(() => {
    const loadSortPreference = async () => {
      if (!user?.id || !props.category) return;
      
      try {
        const sortPrefDoc = await getDoc(doc(db, 'users', user.id, 'sortPreferences', props.category));
        if (sortPrefDoc.exists()) {
          setSortOption(sortPrefDoc.data().option as SortOption);
        }
      } catch (error) {
        console.error('Error loading sort preference:', error);
      }
    };
    
    loadSortPreference();
  }, [user?.id, props.category]);

  // Save sort preference to Firebase
  const handleSortChange = async (field: string, direction: 'asc' | 'desc') => {
    // Cast the field to the correct type
    const newSortOption: SortOption = { field: field as SortOption['field'], direction }; 
    setSortOption(newSortOption);
    
    if (!user?.id || !props.category) return;
    
    try {
      await setDoc(doc(db, 'users', user.id, 'sortPreferences', props.category), {
        option: newSortOption,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving sort preference:', error);
    }
  };

  // Sort transactions
  const sortTransactions = (transactions: Transaction[]) => {
    return [...transactions].sort((a, b) => {
      switch (sortOption.field) {
        case 'amount':
          return sortOption.direction === 'desc' ? Math.abs(b.amount) - Math.abs(a.amount) : Math.abs(a.amount) - Math.abs(b.amount);
        case 'date':
          return sortOption.direction === 'desc' ? new Date(b.date).getTime() - new Date(a.date).getTime() : new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'description':
          return sortOption.direction === 'desc' ? b.description.localeCompare(a.description) : a.description.localeCompare(b.description);
        default:
          return 0;
      }
    });
  };

  // Group transactions by month - use filteredTransactions to respect selectedMonths
  const groupedTransactions = useMemo(() => {
    const initialGrouped = groupTransactionsByMonth(filteredTransactions);
    // Create a new object to hold sorted results, preventing mutation
    const sortedGrouped: Record<string, Transaction[]> = {}; 
    
    Object.keys(initialGrouped).forEach(month => {
      // Sort and assign to the new object
      sortedGrouped[month] = sortTransactions(initialGrouped[month]); 
    });
    
    return sortedGrouped; // Return the new, non-mutated object
  }, [filteredTransactions, sortOption, groupTransactionsByMonth]); // Added groupTransactionsByMonth dependency
  
  // Ensure all months are displayed based on selection
  const ensureAllMonths = () => {
    const allMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    if (selectedMonths && selectedMonths.length > 0) {
      // Return selected months, sorted correctly
      return [...selectedMonths].sort((a, b) => getMonthOrder(a) - getMonthOrder(b));
    } else {
      // Return all months in standard order
      return allMonths;
    }
  };
  
  // Get months in order, ensuring all months are displayed
  const months = ensureAllMonths();
  
  // These handlers need to be implemented in the context or passed from props
  const handleTransactionDragStart = (e: React.DragEvent, transaction: Transaction, index: number, sourceMonth: string) => {
    // Set drag state in the context
    setDraggedTransaction(transaction);
    setDraggedIndex(index);
    setDragSourceMonth(sourceMonth);
    setIsDragging(true);
    
    // Always start in move mode
    setIsCopyMode(false);
    
    // Call the parent drag start handler if provided
    if (props.onDragStart) {
      const globalIndex = utils.findGlobalIndex(transaction, props.allTransactions);
      props.onDragStart(e, transaction, globalIndex);
    }
  };
  
  const handleTransactionDragOver = (e: React.DragEvent, targetMonth: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Special indices: -888 for Copy Here zone, -999 for Move Here zone
    const isOverCopyZone = targetIndex === -888;
    const isOverMoveZone = targetIndex === -999;
    
    // Clear any existing drag leave timeout first
    if (dragLeaveTimeout) {
      window.clearTimeout(dragLeaveTimeout);
      setDragLeaveTimeout(null);
    }

    // Always set the mode based on which zone we're over
    if (isOverCopyZone) {
      setIsCopyMode(true);
      e.dataTransfer.dropEffect = 'copy';
    } else if (isOverMoveZone) {
      setIsCopyMode(false);
      e.dataTransfer.dropEffect = 'move';
    } else {
      // For regular areas, default to move mode
      setIsCopyMode(false);
      e.dataTransfer.dropEffect = 'move';
    }

    // Update drag over state
    setDragOverMonth(targetMonth);
    setDragOverIndex(targetIndex);
    setIsIntraMonthDrag(dragSourceMonth === targetMonth);
  };
  
  const handleMonthDragOver = (e: React.DragEvent, targetMonth: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't change copy mode, just update drag over state
    setDragOverMonth(targetMonth);
    
    // Set drag effect based on current copy mode
    if (isCopyMode) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.dropEffect = 'move';
    }
    
    // Clear any existing drag leave timeout
    if (dragLeaveTimeout) {
      window.clearTimeout(dragLeaveTimeout);
      setDragLeaveTimeout(null);
    }
  };
  
  const handleMonthDragLeave = (e: React.DragEvent) => {
    // Set a timeout to clear the drag over state
    // This prevents flickering when dragging between elements
    const timeout = window.setTimeout(() => {
      setDragOverMonth(null);
      setDragOverIndex(null);
    }, 50);
    
    setDragLeaveTimeout(timeout);
  };
  
  const handleTransactionDrop = (e: React.DragEvent, targetMonth: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only process if we have a dragged transaction
    if (!draggedTransaction || draggedIndex === null || !dragSourceMonth) {
      resetDragState();
      return;
    }

    try {
      // Check if we're dropping on the copy zone (-888) or move zone (-999)
      const isDropOnCopyZone = targetIndex === -888;
      const isDropOnMoveZone = targetIndex === -999;

      // Get transactions for the target month
      const targetMonthTransactions = props.allTransactions.filter(t => {
        const transactionMonth = new Date(t.date).toLocaleString('default', { month: 'long' });
        return transactionMonth === targetMonth;
      });

      // Check for duplicates in the target month
      const isDuplicate = targetMonthTransactions.some(
        transaction => 
          transaction.description === draggedTransaction.description && 
          Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount) &&
          transaction.id !== draggedTransaction.id // Exclude the transaction being dragged
      );

      if (isDuplicate) {
        showNotification('Cannot create duplicate transaction in the same month', 'error');
        resetDragState();
        return;
      }
      
      // Handle copy operations - either explicit copy zone or copy mode
      if (isDropOnCopyZone || (isCopyMode && !isDropOnMoveZone)) {
        
        // Update the date to the target month while preserving the year and day
        const currentDate = new Date(draggedTransaction.date);
        const targetMonthIndex = new Date(`${targetMonth} 1`).getMonth();
        const newDate = new Date(
          currentDate.getFullYear(),
          targetMonthIndex,
          currentDate.getDate()
        );
        
        // Create a clean new transaction object
        const transactionCopy: Transaction = {
          description: draggedTransaction.description,
          amount: draggedTransaction.amount,
          date: newDate,
          category: draggedTransaction.category,
          id: uuidv4(),
          type: draggedTransaction.type || (draggedTransaction.amount > 0 ? 'income' : 'expense')
        };
        
        // Only include icon if it exists and is not undefined
        if (draggedTransaction.icon) {
          transactionCopy.icon = draggedTransaction.icon;
        }
        
        // Add the transaction to the target month
        props.onAddTransaction(transactionCopy);
        
        // Show a notification
        showNotification(`Copied transaction to ${targetMonth}`, 'success');
        
        // Reset drag state after successful copy
        resetDragState();
        return;
      }
      
      // Handle move operations - either move zone or regular move
      if (isDropOnMoveZone || (!isCopyMode && !isDropOnCopyZone)) {
        // Update the date to the target month
        const date = new Date(draggedTransaction.date);
        const targetMonthIndex = new Date(`${targetMonth} 1`).getMonth();
        const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
        
        // Create a clean transaction object for moving
        const transactionToMove: Transaction = {
          description: draggedTransaction.description,
          amount: draggedTransaction.amount,
          date: newDate,
          category: draggedTransaction.category,
          id: draggedTransaction.id,
          type: draggedTransaction.type || (draggedTransaction.amount > 0 ? 'income' : 'expense')
        };
        
        // Only include icon if it exists and is not undefined
        if (draggedTransaction.icon) {
          transactionToMove.icon = draggedTransaction.icon;
        }
        
        // Find the global index of the transaction to remove
        const globalIndex = utils.findGlobalIndex(draggedTransaction, props.allTransactions);
        
        if (globalIndex !== -1) {
          // First, remove the transaction from its original position
          props.onDeleteTransaction(globalIndex);
          
          // Then add it to the new month
          props.onAddTransaction(transactionToMove);
          
          // Show a notification
          showNotification(`Moved transaction to ${targetMonth}`, 'success');
        } else {
          showNotification('Error: Could not find transaction to move', 'error');
        }
        
        // Reset drag state after successful move
        resetDragState();
        return;
      }
    } catch (error) {
      console.error("Error handling drop:", error);
      showNotification('Error handling drop operation', 'error');
    } finally {
      // Always reset drag state
      resetDragState();
    }
  };
  
  const handleMonthDrop = (e: React.DragEvent, targetMonth: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't handle if we're over the copy zone
    if (dragOverIndex === -888) {
      return;
    }
    
    // Only process if we have a dragged transaction
    if (draggedTransaction && draggedIndex !== null && dragSourceMonth) {
      // Skip if dropping on the same month it came from (when not copying)
      if (!isCopyMode && dragSourceMonth === targetMonth) {
        resetDragState();
        return;
      }

      // Get transactions for the target month
      const targetMonthTransactions = props.allTransactions.filter(t => {
        const transactionMonth = new Date(t.date).toLocaleString('default', { month: 'long' });
        return transactionMonth === targetMonth;
      });

      // Check for duplicates in the target month
      const isDuplicate = targetMonthTransactions.some(
        transaction => 
          transaction.description === draggedTransaction.description && 
          Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount) &&
          transaction.id !== draggedTransaction.id // Exclude the transaction being dragged
      );

      if (isDuplicate) {
        showNotification('Cannot create duplicate transaction in the same month', 'error');
        resetDragState();
        return;
      }
      
      // Update the date to the target month
      const date = new Date(draggedTransaction.date);
      const targetMonthIndex = new Date(`${targetMonth} 1`).getMonth();
      const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
      
      // Determine if this is a copy operation based on copy mode
      if (isCopyMode) {
        // Create a clean transaction object for copying
        const transactionCopy: Transaction = {
          description: draggedTransaction.description,
          amount: draggedTransaction.amount,
          date: newDate,
          category: draggedTransaction.category,
          id: uuidv4(),
          type: draggedTransaction.type || (draggedTransaction.amount > 0 ? 'income' : 'expense')
        };
        
        // Only include icon if it exists and is not undefined
        if (draggedTransaction.icon) {
          transactionCopy.icon = draggedTransaction.icon;
        }
        
        // Add the transaction to the target month
        props.onAddTransaction(transactionCopy);
        
        // Show a notification
        showNotification(`Copied transaction to ${targetMonth}`, 'success');
      } else {
        // This is a move operation
        // Create a clean transaction object for moving
        const transactionToMove: Transaction = {
          description: draggedTransaction.description,
          amount: draggedTransaction.amount,
          date: newDate,
          category: draggedTransaction.category,
          id: draggedTransaction.id,
          type: draggedTransaction.type || (draggedTransaction.amount > 0 ? 'income' : 'expense')
        };
        
        // Only include icon if it exists and is not undefined
        if (draggedTransaction.icon) {
          transactionToMove.icon = draggedTransaction.icon;
        }
        
        // Find the global index of the transaction to remove
        const globalIndex = utils.findGlobalIndex(draggedTransaction, props.allTransactions);
        
        if (globalIndex !== -1) {
          // First, remove the transaction from its original position
          props.onDeleteTransaction(globalIndex);
          
          // Then add it to the new month
          props.onAddTransaction(transactionToMove);
          
          // Show a notification
          showNotification(`Moved transaction to ${targetMonth}`, 'success');
        } else {
          showNotification('Error: Could not find transaction to move', 'error');
        }
      }
    }
    
    // Reset drag state
    resetDragState();
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Reset drag state completely
    resetDragState();
  };

  // Listen for transaction icons updated events to force UI refresh
  useEffect(() => {
    const handleTransactionIconsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{category: string, icon: string}>;
      const { category: updatedCategory } = customEvent.detail;
      
      // Only proceed if this is our category
      if (updatedCategory === category) {
        // Force a refresh of the component using the context's forceRefresh function
        context.forceRefresh();
        
        // If there's a callback to notify parent, call it
        if (props.onTransactionsChange) {
          props.onTransactionsChange(transactions);
        }
      }
    };
    
    // Listen for the custom event
    document.addEventListener('transactionIconsUpdated', handleTransactionIconsUpdated);
    
    // Clean up when the component unmounts
    return () => {
      document.removeEventListener('transactionIconsUpdated', handleTransactionIconsUpdated);
    };
  }, [category, transactions, props.onTransactionsChange, context]);

  // Get the months in correct order for grouping
  const sortedMonths = selectedMonths ? [...selectedMonths].sort(getMonthOrder) : [];
  
  // Group transactions by month for better organization
  const transactionsByMonth = groupTransactionsByMonth(filteredTransactions);
  
  // Add a function to copy a transaction to all months
  const handleCopyToAllMonths = (transaction: Transaction) => {
    // Get all available months
    const allMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Get the current month of the transaction
    const transactionMonth = new Date(transaction.date).toLocaleString('default', { month: 'long' });
    
    // Create a count for successful copies
    let copyCount = 0;
    
    // Array to hold transactions to add
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
      const transactionCopy = {
        ...transaction,
        date: newDate,
        id: uuidv4() // Generate a new ID
      };
      
      // Add the transaction copy to the batch array
      transactionsToAdd.push(transactionCopy);
      
      // Increment copy count
      copyCount++;
    });

    console.log('transactionsToAdd:', transactionsToAdd);
    console.log('props.onAddTransactionBatch exists:', !!props.onAddTransactionBatch);

    // Add all transactions at once if possible using the batch function
    if (props.onAddTransactionBatch && transactionsToAdd.length > 0) {
      console.log('Using batch function to add transactions');
      console.log('onAddTransactionBatch type:', typeof props.onAddTransactionBatch);
      try {
        props.onAddTransactionBatch(transactionsToAdd);
        console.log('Batch function called successfully');
      } catch (error) {
        console.error('Error calling batch function:', error);
        // Fall back to individual adds
        console.log('Falling back to individual adds due to error');
        transactionsToAdd.forEach(copy => {
          props.onAddTransaction(copy);
        });
      }
    } else {
      console.log('Falling back to adding transactions one by one');
      // Fallback: add one by one (less efficient, ensure onAddTransaction is optimistic)
      transactionsToAdd.forEach(copy => {
        props.onAddTransaction(copy);
      });
    }
    
    // Show a notification about the result
    if (copyCount > 0) {
      showNotification(`Copied "${transaction.description}" to ${copyCount} other months`, 'success');
    } else {
      showNotification('No additional months to copy to (duplicate check)', 'warning');
    }
  };

  // Add a function to handle transaction deletion directly from the card
  const handleDeleteTransaction = (transaction: Transaction, index: number) => {
    // Find the global index of the transaction to remove
    const globalIndex = utils.findGlobalIndex(transaction, props.allTransactions);
    
    if (globalIndex !== -1) {
      // Delete the transaction
      props.onDeleteTransaction(globalIndex);
      
      // Show a notification
      showNotification(`Deleted "${transaction.description}"`, 'success');
    } else {
      showNotification('Error: Could not find transaction to delete', 'error');
    }
  };

  // Define more reusable styles
  const tableStyles = {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    position: 'relative',
    mt: 1
  };

  return (
    <Box sx={{ position: 'relative', mb: 2}}>
      {/* Drag mode indicator */}
      <DragIndicator 
        isDragging={isDragging} 
        isCopyMode={isCopyMode}
        isIntraMonthDrag={isIntraMonthDrag}
        dragSourceMonth={dragSourceMonth}
      />
      
      <Paper 
        elevation={3}
        sx={{
          ...backgroundStyles,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Table header with category name and total */}
        <TransactionTableHeader 
          category={props.category}
          totalAmount={filteredTransactions.reduce((sum, t) => sum + t.amount, 0)}
          totalBudget={totalBudget}
          isDark={isDark}
          hasCustomColor={hasCustomColor}
          hasCustomDarkColor={hasCustomDarkColor}
          tableColors={tableColors}
          sortOption={sortOption}
          onSortChange={handleSortChange}
          categoryData={categoryData}
          isExpanded={isExpanded}
          onToggleExpand={toggleExpand}
          hasItems={filteredTransactions.length > 0}
          transactions={filteredTransactions}
          categories={categories}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          getCategoryByName={getCategoryByName}
        />
        
        {/* Transaction content with smooth animation */}
        <Box
          sx={{
            maxHeight: isExpanded ? '2000px' : '0px',
            opacity: isExpanded ? 1 : 0,
            overflow: 'hidden',
            visibility: isExpanded ? 'visible' : 'hidden',
            // Keep content visible longer during collapse (opacity change happens later)
            transition: isExpanded 
              ? 'max-height 0.45s ease-out, opacity 0.25s ease-in, visibility 0s' 
              : 'max-height 0.4s ease-in-out, opacity 0.38s ease-out, visibility 0s 0.4s',
            // Remove padding transitions that might affect content visibility
            transformOrigin: 'top',
          }}
        >
          {/* Instructions for dragging - show even if no transactions */}
          <Typography 
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mb: 1.5,
              mt: 1.5, // More spacing above
              px: 2, // Add horizontal padding
              py: 0.5, // Add vertical padding
              color: hasCustomColor ? 
                (hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)') : 
                (props.category === 'Income' ? 'rgba(0, 0, 0, 0.7)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)')),
              // Make it slightly more opaque for better visibility
              borderRadius: '4px',
              // Transparent background
              backgroundColor: 'transparent',
              // Show only when expanded
              opacity: isExpanded ? 1 : 0,
              visibility: isExpanded ? 'visible' : 'hidden',
              transition: 'opacity 0.3s ease-in-out, visibility 0s',
              fontWeight: 500, // Slightly bolder
            }}
          >
            {filteredTransactions.length > 0 
              ? 'Drag to move transactions between months' 
              : 'Add transactions using the + button in each month'}
          </Typography>
          
          {/* Scrollable area for months */}
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: 'row',
              overflowX: 'auto',
              px: 2,
              pb: 2,
              pt: 1,
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.05)',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: hasCustomColor ? 
                  (hasCustomDarkColor ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : 
                  (props.category === 'Income' ? 'rgba(0,0,0,0.2)' : 'rgba(25, 118, 210, 0.3)'),
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: hasCustomColor ? 
                    (hasCustomDarkColor ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') : 
                    (props.category === 'Income' ? 'rgba(0,0,0,0.3)' : 'rgba(25, 118, 210, 0.5)'),
                }
              }
            }}
          >
            {months.map((month) => (
              <MonthColumn
                key={month}
                month={month}
                monthTransactions={groupedTransactions[month] || []}
                category={props.category}
                isDark={isDark}
                hasCustomColor={hasCustomColor}
                hasCustomDarkColor={hasCustomDarkColor}
                isDragging={isDragging}
                draggedTransaction={draggedTransaction}
                draggedIndex={draggedIndex}
                dragSourceMonth={dragSourceMonth}
                dragOverMonth={dragOverMonth}
                dragOverIndex={dragOverIndex}
                isIntraMonthDrag={isIntraMonthDrag}
                isCopyMode={isCopyMode}
                getCardBackgroundColor={getCategoryBackgroundColor}
                getTextColor={getTextColor}
                handleMonthDragOver={handleMonthDragOver}
                handleMonthDragLeave={handleMonthDragLeave}
                handleMonthDrop={handleMonthDrop}
                handleTransactionDragStart={handleTransactionDragStart}
                handleTransactionDragOver={handleTransactionDragOver}
                handleTransactionDrop={handleTransactionDrop}
                handleDragEnd={handleDragEnd}
                handleOpenMobileEdit={handleOpenMobileEdit}
                handleOpenMobileAdd={handleOpenMobileAdd}
                handleCopyMonthClick={handleCopyMonthClick}
                handleCopyToAllMonths={(transaction) => {
                  console.log('Context before handleCopyToAllMonths:', {
                    props: JSON.stringify({
                      hasAddTransactionBatch: !!props.onAddTransactionBatch,
                      category: props.category,
                      hasAddTransaction: !!props.onAddTransaction
                    })
                  });
                  handleCopyToAllMonths(transaction);
                }}
                handleDeleteTransaction={handleDeleteTransaction}
                getNextMonth={getNextMonth}
                getMonthOrder={getMonthOrder}
                tableColors={tableColors}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Dialogs */}
      <DeleteConfirmationDialog
        open={dialogState.deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (dialogState.transactionToDelete) {
            onDeleteTransaction(dialogState.transactionToDelete.index);
            setDeleteConfirmOpen(false);
            setTransactionToDelete(null);
          }
        }}
        transactionToDelete={dialogState.transactionToDelete}
      />

      <MobileEditDialog
        open={dialogState.mobileEditDialogOpen}
        onClose={handleCloseMobileEdit}
        onSave={handleSaveEdit}
        onDelete={() => {
          if (dialogState.mobileEditTransaction) {
            handleDeleteClick(undefined, dialogState.mobileEditTransaction.transaction);
            handleCloseMobileEdit(); // Close the dialog after delete
          }
        }}
        category={props.category}
        editingRow={dialogState.editingRow}
        handleEditingChange={handleEditingChange}
        generateDayOptions={() => Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
        getOrdinalSuffix={(day) => {
          if (day > 3 && day < 21) return 'th';
          switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
          }
        }}
        tableColor={getCategoryBackgroundColor() || '#f5f5f5'}
        isDark={isDark}
      />

      <MobileAddDialog
        open={dialogState.mobileAddDialogOpen}
        onClose={handleCloseMobileAdd}
        onAdd={handleAddTransaction}
        category={props.category}
        newDescription={dialogState.newDescription}
        newAmount={dialogState.newAmount}
        newDate={dialogState.newDate}
        setNewDescription={context.setNewDescription}
        setNewAmount={context.setNewAmount}
        setNewDate={context.setNewDate}
        tableColor={getCategoryBackgroundColor() || '#f5f5f5'}
        isDark={isDark}
        generateDayOptions={() => Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
        getOrdinalSuffix={(day) => {
          if (day > 3 && day < 21) return 'th';
          switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
          }
        }} 
      />

      <CopyMonthConfirmationDialog
        open={dialogState.copyMonthDialogOpen}
        onClose={() => setCopyMonthDialogOpen(false)}
        onConfirm={handleCopyMonthConfirm}
        sourceMonth={dialogState.copySourceMonth}
        targetMonth={dialogState.copyTargetMonth}
        category={props.category}
        transactionCount={dialogState.copyTransactions.length}
      />
    </Box>
  );
};

export default TransactionTable;
