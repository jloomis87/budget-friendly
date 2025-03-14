import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Grid, Stack, Card, CardContent, IconButton, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import { Add as AddIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { isColorDark } from '../../utils/colorUtils';
import { useTableColors } from '../../hooks/useTableColors';
import { useTransactionUtils } from './useTransactionUtils';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { MobileEditDialog } from './MobileEditDialog';
import { MobileAddDialog } from './MobileAddDialog';
import type { Transaction } from '../../services/fileParser';
import type { EditingRow } from './types';
import { CategoryColorPicker } from '../CategoryColorPicker';
import { v4 as uuidv4 } from 'uuid';
import { CopyMonthConfirmationDialog } from './CopyMonthConfirmationDialog';
import {
  DeleteIcon,
  EditOutlinedIcon
} from '../../utils/materialIcons';

interface TransactionTableProps {
  category: string;
  transactions: Transaction[];
  allTransactions: Transaction[];
  onUpdateTransaction: (index: number, updatedTransaction: Partial<Transaction>) => void;
  onDeleteTransaction: (index: number) => void;
  onAddTransaction: (transaction: Transaction) => void;
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
}

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
    
    // Log for debugging Income transactions
    if (transaction.category === 'Income') {
      console.log(`Adding Income transaction to ${month}:`, {
        description: transaction.description,
        amount: transaction.amount,
        date: date.toISOString(),
        id: transaction.id,
        order: transaction.order
      });
    }
    
    grouped[month].push(transaction);
  });
  
  // Sort transactions within each month
  Object.entries(grouped).forEach(([month, monthTransactions]) => {
    console.log(`Sorting ${monthTransactions.length} transactions for ${month}`);
    
    monthTransactions.sort((a, b) => {
      // First sort by order property if available
      if (a.order !== undefined && b.order !== undefined) {
        console.log(`Sorting by order: ${a.description} (${a.order}) vs ${b.description} (${b.order})`);
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
    
    // Log the sorted order for debugging
    if (monthTransactions.some(t => t.category === 'Income')) {
      console.log(`Sorted Income transactions for ${month}:`, 
        monthTransactions
          .filter(t => t.category === 'Income')
          .map(t => ({ 
            description: t.description, 
            order: t.order, 
            id: t.id 
          }))
      );
    }
  });
  
  return grouped;
};

export function TransactionTable({
  category,
  transactions,
  allTransactions,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddTransaction,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverCategory,
  recentlyDropped,
  onReorder,
  selectedMonths,
  month,
  isDark,
  onTransactionsChange
}: TransactionTableProps) {
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ transaction: Transaction, index: number } | null>(null);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
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

  const [tableColors] = useTableColors();
  const utils = useTransactionUtils();
  const isIncome = category === 'Income';

  const hasCustomColor = tableColors[category] !== '#f5f5f5';
  
  // Check if the custom color is dark (for Income category)
  const hasCustomDarkColor = category === 'Income' && hasCustomColor && isColorDark(tableColors[category]);

  // Function to get background color based on category and custom color
  const getCategoryBackgroundColor = () => {
    if (category === 'Income') {
      return hasCustomColor ? tableColors[category] : '#a5d6a7'; // Use custom color if set, otherwise default green
    }
    return undefined; // For expense categories, background is handled differently
  };

  // Function to get card background color based on category and custom color
  const getCardBackgroundColor = (isHover = false) => {

    // For expense categories
    return isHover 
      ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 118, 210, 0.05)')
      : (isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)');
  };

  // Function to get card hover styles - consistent for both Income and Expense
  const getCardHoverStyles = () => {
    if (category === 'Income') {
      return {
        boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)', // Stronger shadow on hover
        transform: 'translateY(-2px)', // Slight lift effect
        bgcolor: getCardBackgroundColor(true)
      };
    } else {
      // For expense categories, use a different hover style
      return {
        boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)', // Stronger shadow on hover
        transform: 'translateY(-2px)', // Slight lift effect
        bgcolor: getCardBackgroundColor(true)
      };
    }
  };

  // Filter transactions by selected months
  const filteredTransactions = React.useMemo(() => {
    // For debugging
    console.log(`Filtering transactions for ${category}:`, {
      totalTransactions: transactions.length,
      selectedMonths,
      hasSelectedMonths: Boolean(selectedMonths?.length)
    });
    
    if (!selectedMonths?.length) {
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
      return selectedMonths.includes(transactionMonth);
    });
    
    // For debugging
    console.log(`Filtered ${category} transactions:`, {
      before: transactions.length,
      after: filtered.length
    });
    
    return filtered;
  }, [transactions, selectedMonths, category]);

  // Calculate total amount
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const handleEditingChange = (field: keyof EditingRow, value: string) => {
    if (editingRow) {
      setEditingRow({
        ...editingRow,
        [field]: value
      });
    }
  };

  const handleSaveEdit = () => {
    if (mobileEditTransaction && editingRow) {
      const [year, month, day] = editingRow.date.split('-').map(Number);
      
      const updatedTransaction: Partial<Transaction> = {
        description: editingRow.description,
        date: new Date(year, month - 1, day),
        amount: parseFloat(editingRow.amount) * (isIncome ? 1 : -1)
      };
      
      const globalIndex = utils.findGlobalIndex(mobileEditTransaction.transaction, allTransactions);
      onUpdateTransaction(globalIndex, updatedTransaction);
      handleCloseMobileEdit();
    }
  };

  const handleAddTransaction = () => {
    if (!newDescription.trim() || !newAmount.trim()) return;

    const [year, month, day] = newDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    const transaction: Transaction = {
      description: newDescription.trim(),
      amount: parseFloat(newAmount) * (isIncome ? 1 : -1),
      date: date,
      category: category as 'Income' | 'Essentials' | 'Wants' | 'Savings',
      id: uuidv4(),
    };

    onAddTransaction(transaction);
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setMobileAddDialogOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent | undefined, transaction: Transaction) => {
    // Only call stopPropagation if e is a valid event object
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    
    const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
    
    if (globalIndex !== -1) {
      setTransactionToDelete({ transaction, index: globalIndex });
      setDeleteConfirmOpen(true);
    }
  };

  const handleOpenMobileEdit = (transaction: Transaction, index: number) => {
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
      description: transaction.description
    });
    
    setMobileEditDialogOpen(true);
  };

  const handleCloseMobileEdit = () => {
    setMobileEditDialogOpen(false);
    setMobileEditTransaction(null);
    setEditingRow(null);
  };

  const handleOpenMobileAdd = (month: string) => {
    const currentYear = new Date().getFullYear();
    const monthIndex = new Date(`${month} 1`).getMonth();
    const firstOfMonth = new Date(currentYear, monthIndex, 1);
    const newDateValue = firstOfMonth.toISOString().split('T')[0];

    setNewDescription('');
    setNewAmount('');
    setNewDate(newDateValue);
    setMobileAddDialogOpen(true);
  };

  const handleCloseMobileAdd = () => {
    setMobileAddDialogOpen(false);
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
  };

  const getNextMonth = (currentMonth: string): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentIndex = months.indexOf(currentMonth);
    return months[(currentIndex + 1) % 12];
  };

  const handleCopyMonthClick = (month: string, transactions: Transaction[]) => {
    const nextMonth = getNextMonth(month);
    setCopySourceMonth(month);
    setCopyTargetMonth(nextMonth);
    setCopyTransactions(transactions);
    setCopyMonthDialogOpen(true);
  };

  const handleCopyMonthConfirm = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const targetMonthIndex = months.indexOf(copyTargetMonth);

    const targetMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      const month = date.toLocaleString('default', { month: 'long' });
      return month === copyTargetMonth && t.category === category;
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
        amount: category === 'Income' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount)
      };

      onAddTransaction(newTransaction);
      addedCount++;
    });

    // Show notification about duplicates if any were skipped
    if (duplicateCount > 0) {
      showNotification(`Copied ${addedCount} transactions. Skipped ${duplicateCount} duplicate transactions.`, 'success');
    }

    setCopyMonthDialogOpen(false);
  };

  const getBackgroundStyles = () => {
    if (dragOverCategory === category) {
      return {
        backgroundColor: 'rgba(25, 118, 210, 0.08)',
        transition: 'background-color 0.3s ease',
        transform: 'scale(1.01)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      };
    }
    if (recentlyDropped === category) {
      return {
        backgroundColor: 'rgba(76, 175, 80, 0.08)',
        transition: 'background-color 0.8s ease'
      };
    }
    return hasCustomColor ? { backgroundColor: tableColors[category] } : {};
  };

  const getMonthOrder = (month: string): number => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
  };

  // Add state for custom drag and drop
  const [draggedTransaction, setDraggedTransaction] = useState<Transaction | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragSourceMonth, setDragSourceMonth] = useState<string | null>(null);
  const [dragOverMonth, setDragOverMonth] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [dragLeaveTimeout, setDragLeaveTimeout] = useState<number | null>(null);
  // Add state for intra-month sorting
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isIntraMonthDrag, setIsIntraMonthDrag] = useState(false);
  
  // Custom drag and drop handlers
  const handleTransactionDragStart = (e: React.DragEvent, transaction: Transaction, index: number, sourceMonth: string) => {
    // For debugging
    console.log(`Starting drag for ${category} transaction:`, {
      description: transaction.description,
      index,
      sourceMonth,
      globalIndex: utils.findGlobalIndex(transaction, allTransactions),
      category: transaction.category || category,
      id: transaction.id,
      order: transaction.order
    });
    
    // Set data for the drag operation
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: transaction.id,
      description: transaction.description,
      index: index,
      month: sourceMonth,
      category: transaction.category || category
    }));
    
    // Also set application/json data for more reliable parsing
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: transaction.id,
      description: transaction.description,
      index: index,
      month: sourceMonth,
      category: transaction.category || category,
      globalIndex: utils.findGlobalIndex(transaction, allTransactions)
    }));
    
    // Check if Ctrl/Cmd key is pressed to determine copy vs. move
    setIsCopyMode(e.ctrlKey || e.metaKey);
    
    // Set visual feedback for drag operation
    if (e.ctrlKey || e.metaKey) {
      e.dataTransfer.effectAllowed = 'copy';
    } else {
      e.dataTransfer.effectAllowed = 'move';
    }
    
    // Store the dragged transaction info in state
    setDraggedTransaction(transaction);
    setDraggedIndex(index);
    setDragSourceMonth(sourceMonth);
    setIsDragging(true);
    
    // Call the parent drag start handler if provided
    if (onDragStart) {
      const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
      onDragStart(e, transaction, globalIndex);
    }
  };

  // Add handler for transaction drag over
  const handleTransactionDragOver = (e: React.DragEvent, targetMonth: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle if we're dragging within the same month
    if (dragSourceMonth === targetMonth && draggedIndex !== null) {
      setIsIntraMonthDrag(true);
      setDragOverIndex(targetIndex);
      e.dataTransfer.dropEffect = 'move';
      
      // For debugging
      if (dragOverIndex !== targetIndex) {
        console.log(`Dragging over ${category} transaction:`, {
          targetMonth,
          targetIndex,
          draggedIndex,
          category,
          draggedTransaction: draggedTransaction ? {
            description: draggedTransaction.description,
            category: draggedTransaction.category || category,
            id: draggedTransaction.id
          } : null
        });
      }
    }
  };
  
  // Add handler for transaction drop
  const handleTransactionDrop = (e: React.DragEvent, targetMonth: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // For debugging
    console.log(`Drop on ${category} transaction:`, {
      targetMonth,
      targetIndex,
      draggedIndex,
      dragSourceMonth,
      category,
      isIntraMonthDrag
    });
    
    // Only handle if we're dragging within the same month
    if (dragSourceMonth === targetMonth && draggedIndex !== null && draggedIndex !== targetIndex) {
      // Get the transactions for this month
      const groupedTransactions = groupTransactionsByMonth(filteredTransactions);
      const monthTransactions = [...(groupedTransactions[targetMonth] || [])];
      
      console.log(`Month transactions for ${targetMonth}:`, {
        count: monthTransactions.length,
        transactions: monthTransactions.map(t => ({ 
          id: t.id, 
          description: t.description,
          category: t.category || category
        }))
      });
      
      if (onReorder && monthTransactions.length > 1) {
        try {
          // Ensure we have valid indices
          if (draggedIndex < 0 || draggedIndex >= monthTransactions.length) {
            throw new Error(`Invalid source index: ${draggedIndex} (max: ${monthTransactions.length - 1})`);
          }
          
          if (targetIndex < 0 || targetIndex >= monthTransactions.length) {
            throw new Error(`Invalid target index: ${targetIndex} (max: ${monthTransactions.length - 1})`);
          }
          
          // Find the global indices of the transactions
          const sourceTransaction = monthTransactions[draggedIndex];
          if (!sourceTransaction) {
            throw new Error(`Source transaction not found at index ${draggedIndex}`);
          }
          
          // Ensure the source transaction has the correct category
          const sourceCategory = sourceTransaction.category || category;
          
          const sourceGlobalIndex = utils.findGlobalIndex(sourceTransaction, allTransactions);
          
          // Get the target transaction's global index
          const targetTransaction = monthTransactions[targetIndex];
          if (!targetTransaction) {
            throw new Error(`Target transaction not found at index ${targetIndex}`);
          }
          
          const targetGlobalIndex = utils.findGlobalIndex(targetTransaction, allTransactions);
          
          console.log('Reordering transactions:', {
            sourceTransaction: sourceTransaction.description,
            targetTransaction: targetTransaction.description,
            sourceGlobalIndex,
            targetGlobalIndex,
            sourceCategory,
            targetCategory: targetTransaction.category || category
          });
          
          if (sourceGlobalIndex !== -1 && targetGlobalIndex !== -1) {
            // Call the parent reorder handler with the global indices
            // Use the transaction's category if available, otherwise use the table category
            const effectiveCategory = sourceCategory || category;
            onReorder(effectiveCategory, sourceGlobalIndex, targetGlobalIndex);
            
            // Show success notification
            showNotification(`Reordered "${sourceTransaction.description}" within ${targetMonth}`, 'success');
          } else {
            console.error('Could not find global indices for transactions', { 
              sourceIndex: draggedIndex, 
              targetIndex, 
              sourceGlobalIndex, 
              targetGlobalIndex,
              sourceCategory,
              tableCategory: category
            });
            
            // Log the transactions to help debug
            console.log('Source transaction:', sourceTransaction);
            console.log('Target transaction:', targetTransaction);
            console.log('All transactions count:', allTransactions?.length);
            
            showNotification(`Could not reorder transaction - indices not found`, 'error');
          }
        } catch (error) {
          console.error('Error during transaction reordering:', error);
          showNotification(`Error reordering transaction: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      }
    }
    
    // Reset drag state
    setIsIntraMonthDrag(false);
    setDragOverIndex(null);
    setIsDragging(false);
    setDraggedTransaction(null);
    setDraggedIndex(null);
    setDragSourceMonth(null);
    setDragOverMonth(null);
  };
  
  const handleMonthDragOver = (e: React.DragEvent, targetMonth: string) => {
    e.preventDefault();
    
    // Set the drop effect based on whether we're copying or moving
    e.dataTransfer.dropEffect = isCopyMode ? 'copy' : 'move';
    
    // Clear any existing timeout to prevent the highlight from being removed
    if (dragLeaveTimeout) {
      window.clearTimeout(dragLeaveTimeout);
      setDragLeaveTimeout(null);
    }
    
    // Only update the dragOverMonth state if it's different from the current value
    // This prevents unnecessary re-renders that can cause flickering
    if (dragOverMonth !== targetMonth) {
      setDragOverMonth(targetMonth);
    }
    
    // Call the parent handler if provided
    if (onDragOver) {
      onDragOver(e, category);
    }
  };
  
  const handleMonthDragLeave = (e: React.DragEvent) => {
    // Check if we're still within the same column by examining the related target
    // This prevents flickering when dragging over child elements within the column
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return; // Still within the same column, don't reset dragOverMonth
    }
    
    // Add a small delay before removing the highlight to prevent flickering
    // when moving between child elements or briefly outside the column
    if (dragLeaveTimeout) {
      window.clearTimeout(dragLeaveTimeout);
    }
    
    const timeoutId = window.setTimeout(() => {
      setDragOverMonth(null);
      setDragLeaveTimeout(null);
    }, 50); // 50ms delay is short enough to not be noticeable but long enough to prevent flickering
    
    setDragLeaveTimeout(timeoutId);
  };
  
  const handleMonthDrop = (e: React.DragEvent, targetMonth: string) => {
    e.preventDefault();
    
    // Clear any existing timeout
    if (dragLeaveTimeout) {
      window.clearTimeout(dragLeaveTimeout);
      setDragLeaveTimeout(null);
    }
    
    // Reset drag state
    setDragOverMonth(null);
    
    // Ensure we have a dragged transaction
    if (!draggedTransaction || draggedIndex === null || !dragSourceMonth) {
      setIsDragging(false);
      return;
    }
    
    // Get the months array for date manipulation
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // If dropping in the same month, do nothing
    if (dragSourceMonth === targetMonth) {
      setIsDragging(false);
      setDraggedTransaction(null);
      setDraggedIndex(null);
      setDragSourceMonth(null);
      return;
    }
    
    // Get the target month index
    const targetMonthIndex = months.indexOf(targetMonth);
    
    // Get the current date of the transaction
    const currentDate = new Date(draggedTransaction.date);
    
    // Create a new date with the target month
    const newDate = new Date(currentDate.getFullYear(), targetMonthIndex, currentDate.getDate());
    
    // Get transactions in the target month
    const groupedTransactions = groupTransactionsByMonth(filteredTransactions);
    const targetMonthTransactions = groupedTransactions[targetMonth] || [];
    
    // Check if a transaction with the same description and amount already exists in the target month
    const isDuplicate = targetMonthTransactions.some(transaction => 
      transaction.description === draggedTransaction.description && 
      Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount)
    );
    
    // If it's a duplicate, show a visual indicator and don't add/move the transaction
    if (isDuplicate) {
      showNotification(`Duplicate transaction "${draggedTransaction.description}" already exists in ${targetMonth}`, 'warning');
    } else {
      if (isCopyMode) {
        // COPY MODE: Create a new transaction with the same details but a new ID
        const newTransaction: Transaction = {
          ...draggedTransaction,
          id: uuidv4(), // Generate a new UUID
          date: newDate
        };
        
        // Add the new transaction
        onAddTransaction(newTransaction);
        
        // Show success notification
        showNotification(`Transaction "${draggedTransaction.description}" copied to ${targetMonth}`, 'success');
      } else {
        // MOVE MODE: Update the existing transaction with the new date
        const globalIndex = utils.findGlobalIndex(draggedTransaction, allTransactions);
        
        if (globalIndex !== -1) {
          // Update the transaction with the new date
          onUpdateTransaction(globalIndex, {
            date: newDate
          });
          
          // Show success notification
          showNotification(`Transaction "${draggedTransaction.description}" moved to ${targetMonth}`, 'success');
        }
      }
    }
    
    // Reset drag state
    setIsDragging(false);
    setDraggedTransaction(null);
    setDraggedIndex(null);
    setDragSourceMonth(null);
    setIsCopyMode(false);
    
    // Call the parent drop handler if provided
    if (onDrop) {
      onDrop(e, category);
    }
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Clear any existing timeout
    if (dragLeaveTimeout) {
      window.clearTimeout(dragLeaveTimeout);
      setDragLeaveTimeout(null);
    }
    
    // Reset all drag state
    setIsDragging(false);
    setDraggedTransaction(null);
    setDraggedIndex(null);
    setDragSourceMonth(null);
    setDragOverMonth(null);
    setIsCopyMode(false);
    setIsIntraMonthDrag(false);
    setDragOverIndex(null);
  };

  // Function to get text color based on category and custom color
  const getTextColor = (isHover = false) => {
    if (category === 'Income') {
      if (hasCustomDarkColor) {
        // For dark custom colors, use white text
        return 'rgba(255, 255, 255, 0.87)';
      }
      if (hasCustomColor) {
        // For light custom colors, use dark text
        return isHover ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, 0.7)';
      }
      // Default Income text color - use white text for dark green background
      return isHover ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)';
    }
    // For expense categories
    return isHover 
      ? (isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)')
      : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)');
  };

  // Add keyboard event listeners to update copy mode during drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDragging && (e.ctrlKey || e.metaKey)) {
        setIsCopyMode(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (isDragging && !(e.ctrlKey || e.metaKey)) {
        setIsCopyMode(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDragging]);

  // Helper function to show notifications
  const showNotification = (message: string, type: 'error' | 'warning' | 'success' = 'error') => {
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
  };

  // Clean up any timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (dragLeaveTimeout) {
        window.clearTimeout(dragLeaveTimeout);
      }
    };
  }, [dragLeaveTimeout]);

  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      {/* Add a drag mode indicator that appears when dragging */}
      {isDragging && (
        <Box
          sx={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: isCopyMode ? 'rgba(76, 175, 80, 0.9)' : 'rgba(33, 150, 243, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
        >
          {isCopyMode ? (
            <>
              <span style={{ fontSize: '18px' }}>📋</span>
              Copy Mode: Creating a copy in the target month
            </>
          ) : isIntraMonthDrag ? (
            <>
              <span style={{ fontSize: '18px' }}>🔄</span>
              Sort Mode: Reordering within {dragSourceMonth}
            </>
          ) : (
            <>
              <span style={{ fontSize: '18px' }}>↕️</span>
              Move Mode: Moving to the target month
            </>
          )}
        </Box>
      )}
      
      <Paper 
        elevation={1} 
        sx={{ 
          mb: 1,
          borderRadius: 2,
          overflow: 'hidden',
          ...getBackgroundStyles(),
          transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.3s',
          bgcolor: getCategoryBackgroundColor() // Use the function to get the background color
        }}
        className={`drag-target ${dragOverCategory === category ? 'drag-target-hover' : ''}`}
        onDragOver={(e) => onDragOver && onDragOver(e, category)}
        onDrop={(e) => onDrop && onDrop(e, category)}
        onDragLeave={handleMonthDragLeave}
      >
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.1)'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.87)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? '#fff' : 'inherit')),
              fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              letterSpacing: '0.01em',
            }}
          >
            {category}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography 
              component="span" 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 500, 
                color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.7)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)')),
                fontSize: '0.9rem'
              }}
            >
              (Total: ${Math.abs(totalAmount).toFixed(2)})
            </Typography>
            <CategoryColorPicker category={category} />
          </Box>
        </Box>

        {/* Add drag and drop instructions */}
        <Box sx={{ 
          px: 2, 
          py: 1, 
          display: 'flex', 
          justifyContent: 'center',
          borderBottom: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.05)',
          backgroundColor: 'rgba(0, 0, 0, 0.02)'
        }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'),
              fontStyle: 'italic',
              textAlign: 'center'
            }}
          >
            Drag transactions between months to move them. Hold Ctrl/Cmd while dragging to copy instead. Drag within a month to reorder.
          </Typography>
        </Box>

        <Box sx={{ p: 1 }}>
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'nowrap',
              justifyContent: 'space-between',
              alignItems: 'stretch',
              width: '100%',
              gap: '0px',
              overflowX: 'auto',
              pb: 1.5,
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.3)' : (category === 'Income' ? 'rgba(0,0,0,0.2)' : 'rgba(25, 118, 210, 0.3)'),
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.5)' : (category === 'Income' ? 'rgba(0,0,0,0.3)' : 'rgba(25, 118, 210, 0.5)'),
                }
              }
            }}
          >
            {(() => {
              const groupedTransactions = groupTransactionsByMonth(filteredTransactions);
              const allMonths = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              
              // Always use selectedMonths if available, regardless of category
              const monthsToShow = !selectedMonths?.length ? allMonths : selectedMonths;
              const monthCount = monthsToShow.length;
              
              // Calculate width based on number of months to show
              const getColumnWidth = () => {
                if (monthCount === 1) return '100%'; // Full width for single month
                return `${100 / monthCount}%`; // Equal width for all columns without gap
              };
              
              return monthsToShow
                .map(month => [month, groupedTransactions[month] || [] as Transaction[]])
                .sort(([monthA], [monthB]) => getMonthOrder(monthA as string) - getMonthOrder(monthB as string))
                .map(([month, monthTransactions]) => (
                  <Box 
                    key={month as string} 
                    sx={{ 
                      width: getColumnWidth(),
                      minWidth: {
                        xs: '113px', // Minimum width for screens below 1500px
                        sm: '113px',
                        md: '113px',
                        lg: '113px',
                        xl: monthCount > 12 ? '180px' : 'unset', // Original behavior for xl screens (1500px+)
                      },
                      maxWidth: 'none',
                      flexGrow: 1,
                      flexShrink: {
                        xs: 0, // Don't allow shrinking below 1500px
                        sm: 0,
                        md: 0,
                        lg: 0,
                        xl: 1, // Allow shrinking at 1500px+
                      },
                      flexBasis: getColumnWidth(),
                      px: 0.5,
                      display: 'flex',
                      flexDirection: 'column',
                      // Add styles for when this month is the drop target
                      ...(dragOverMonth === month ? {
                        backgroundColor: isCopyMode 
                          ? 'rgba(76, 175, 80, 0.15)' // Green for copy
                          : 'rgba(33, 150, 243, 0.15)', // Blue for move
                        borderRadius: 1,
                        transition: 'all 0.3s ease',
                        transform: 'scale(1.02)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        border: `2px dashed ${isCopyMode ? '#4caf50' : '#2196f3'}`,
                      } : {})
                    }}
                    // Add drag and drop event handlers for the month column
                    onDragOver={(e) => handleMonthDragOver(e, month as string)}
                    onDragLeave={handleMonthDragLeave}
                    onDrop={(e) => handleMonthDrop(e, month as string)}
                  >
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 0.5,
                      borderBottom: 1,
                      borderColor: category === 'Income' ? 'rgba(0, 0, 0, 0.1)' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider'),
                      pb: 0.5
                    }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 500,
                          color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.9)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.9)' : (isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)')),
                        }}
                      >
                        {month as string}
                      </Typography>
                      <Tooltip title={`Copy ${month} ${category} to ${getNextMonth(month as string)}`}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyMonthClick(month as string, monthTransactions as Transaction[])}
                          sx={{
                            color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.54)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)')),
                            '&:hover': {
                              color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.9)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)')),
                              backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            }
                          }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: {
                          xs: '0.65rem',
                          sm: '0.75rem',
                          md: '0.85rem'
                        },
                        color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.85)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.87)')),
                        mb: 1
                      }}
                    >
                      ${Math.abs((monthTransactions as Transaction[]).reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                    </Typography>
                    <Stack 
                      spacing={1}
                      sx={{ 
                        flexGrow: 1,
                        minHeight: '100px',
                        maxHeight: '500px',
                        overflowY: 'auto',
                        pr: 0.5,
                        pt: 0.5,
                        pb: 0.5,
                        '&::-webkit-scrollbar': {
                          width: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: 'rgba(0,0,0,0.05)',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.3)' : (category === 'Income' ? 'rgba(0,0,0,0.2)' : 'rgba(25, 118, 210, 0.3)'),
                          borderRadius: '3px',
                          '&:hover': {
                            backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.5)' : (category === 'Income' ? 'rgba(0,0,0,0.3)' : 'rgba(25, 118, 210, 0.5)'),
                          }
                        }
                      }}
                    >
                      {(monthTransactions as Transaction[]).map((transaction, index) => (
                        <Card
                          key={transaction.id || utils.getTransactionId(transaction)}
                          draggable={true}
                          onDragStart={(e) => handleTransactionDragStart(e, transaction, index, month as string)}
                          onDragOver={(e) => handleTransactionDragOver(e, month as string, index)}
                          onDrop={(e) => handleTransactionDrop(e, month as string, index)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleOpenMobileEdit(transaction, index)}
                          sx={{
                            mb: 1,
                            p: 0.75,
                            height: '60px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            bgcolor: getCardBackgroundColor(),
                            border: 'none',
                            borderRadius: 1,
                            transition: 'all 0.2s ease-in-out',
                            transform: draggedTransaction?.id === transaction.id ? 'scale(1.02)' : 'none',
                            cursor: 'pointer',
                            boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
                            opacity: draggedTransaction?.id === transaction.id ? 0.5 : 1,
                            // Add styles for when this card is the drop target for intra-month sorting
                            ...(isIntraMonthDrag && dragOverIndex === index && dragSourceMonth === month ? {
                              borderTop: draggedIndex !== null && draggedIndex > index 
                                ? `2px solid ${isCopyMode ? '#4caf50' : '#2196f3'}`
                                : 'none',
                              borderBottom: draggedIndex !== null && draggedIndex < index
                                ? `2px solid ${isCopyMode ? '#4caf50' : '#2196f3'}`
                                : 'none',
                              marginTop: draggedIndex !== null && draggedIndex > index ? 1 : 0,
                              marginBottom: draggedIndex !== null && draggedIndex < index ? 1 : 0,
                              position: 'relative',
                              '&::before': draggedIndex !== null && draggedIndex > index ? {
                                content: '""',
                                position: 'absolute',
                                top: -10,
                                left: 0,
                                right: 0,
                                height: 10,
                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                borderRadius: '4px 4px 0 0',
                                zIndex: 1
                              } : {},
                              '&::after': draggedIndex !== null && draggedIndex < index ? {
                                content: '""',
                                position: 'absolute',
                                bottom: -10,
                                left: 0,
                                right: 0,
                                height: 10,
                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                borderRadius: '0 0 4px 4px',
                                zIndex: 1
                              } : {}
                            } : {}),
                            '&:hover': {
                              boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
                              transform: 'translateY(-2px)',
                              bgcolor: category === 'Income' ? (hasCustomDarkColor ? 'rgba(255, 255, 255, 0.3)' : '#ffffff') : getCardBackgroundColor(true)
                            }
                          }}
                        >
                          <Typography 
                            variant="subtitle1"
                            sx={{ 
                              color: hasCustomDarkColor || (!hasCustomColor && category === 'Income')
                                ? 'rgba(255, 255, 255, 0.85)' 
                                : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.87)')),
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              fontSize: {
                                xs: '0.64rem', // 75% of 0.85rem
                                sm: '0.64rem',
                                md: '0.64rem',
                                lg: '0.64rem',
                                xl: '0.85rem', // Original size at 1500px and above
                              },
                              lineHeight: 1.2
                            }}
                          >
                            {transaction.description}
                          </Typography>
                          
                          {/* Bottom row with date and amount */}
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            width: '100%',
                            mt: 0.5
                          }}>
                            <Typography 
                              variant="body2"
                              sx={{ 
                                color: hasCustomDarkColor || (!hasCustomColor && category === 'Income') 
                                  ? 'rgba(255, 255, 255, 0.7)' 
                                  : (category === 'Income' ? 'rgba(0, 0, 0, 0.7)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)')),
                                fontSize: {
                                  xs: '0.56rem', // 75% of 0.75rem
                                  sm: '0.56rem',
                                  md: '0.56rem',
                                  lg: '0.56rem',
                                  xl: '0.75rem', // Original size at 1500px and above
                                }
                              }}
                            >
                              {new Date(transaction.date).toLocaleDateString('en-US', { 
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Typography>
                            
                            {/* Amount to the right of date */}
                            <Typography 
                              variant="body2"
                              sx={{ 
                                color: hasCustomDarkColor || (!hasCustomColor && category === 'Income')
                                  ? 'rgba(255, 255, 255, 0.85)' 
                                  : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.87)')),
                                fontSize: {
                                  xs: '0.56rem', // 75% of 0.75rem
                                  sm: '0.56rem',
                                  md: '0.56rem',
                                  lg: '0.56rem',
                                  xl: '0.75rem', // Original size at 1500px and above
                                }
                              }}
                            >
                              ${Math.abs(transaction.amount).toFixed(2)}
                            </Typography>
                          </Box>
                        </Card>
                      ))}
                      
                      {/* Add button as the last card in the list */}
                      <Card
                        onClick={() => handleOpenMobileAdd(month as string)}
                        sx={{
                          p: 0.75,
                          height: '60px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          bgcolor: getCardBackgroundColor(),
                          border: 'none',
                          borderRadius: 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.15)',
                          mb: 3,
                          '&:hover': {
                            boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
                            transform: 'translateY(-2px)',
                            bgcolor: category === 'Income' ? (hasCustomDarkColor ? 'rgba(255, 255, 255, 0.3)' : '#ffffff') : getCardBackgroundColor(true)
                          }
                        }}
                      >
                        <AddIcon 
                          sx={{ 
                            fontSize: {
                              xs: '1.125rem', // 75% of 1.5rem (which was 75% of 2rem)
                              sm: '1.125rem',
                              md: '1.125rem',
                              lg: '1.125rem',
                              xl: '1.5rem', // 75% of original 2rem size
                            },
                            color: getTextColor(),
                            '&:hover': {
                              color: getTextColor(true)
                            }
                          }} 
                        />
                      </Card>
                    </Stack>
                  </Box>
                ));
            })()}
          </Box>
        </Box>
      </Paper>

      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        transactionToDelete={transactionToDelete}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (transactionToDelete) {
            onDeleteTransaction(transactionToDelete.index);
            setDeleteConfirmOpen(false);
            setTransactionToDelete(null);
          }
        }}
      />

      <MobileEditDialog
        open={mobileEditDialogOpen}
        category={category}
        editingRow={editingRow}
        onClose={handleCloseMobileEdit}
        onSave={handleSaveEdit}
        onDelete={() => {
          if (mobileEditTransaction) {
            handleDeleteClick(undefined, mobileEditTransaction.transaction);
          }
          handleCloseMobileEdit();
        }}
        handleEditingChange={handleEditingChange}
        generateDayOptions={utils.generateDayOptions}
        getOrdinalSuffix={utils.getOrdinalSuffix}
        tableColor={tableColors[category]}
        isDark={isDark}
      />

      <MobileAddDialog
        open={mobileAddDialogOpen}
        onClose={handleCloseMobileAdd}
        onAdd={handleAddTransaction}
        newDescription={newDescription}
        newAmount={newAmount}
        newDate={newDate}
        setNewDescription={setNewDescription}
        setNewAmount={setNewAmount}
        setNewDate={setNewDate}
        generateDayOptions={utils.generateDayOptions}
        getOrdinalSuffix={utils.getOrdinalSuffix}
        isDark={isDark}
        category={category}
        tableColor={tableColors[category]}
      />

      <CopyMonthConfirmationDialog
        open={copyMonthDialogOpen}
        onClose={() => setCopyMonthDialogOpen(false)}
        onConfirm={handleCopyMonthConfirm}
        sourceMonth={copySourceMonth}
        targetMonth={copyTargetMonth}
        category={category}
        transactionCount={copyTransactions.length}
      />
    </Box>
  );
} 
