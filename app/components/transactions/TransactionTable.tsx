import React, { useEffect, useState, useMemo } from 'react';
import { Box, Paper, Typography, useTheme, useMediaQuery } from '@mui/material';
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

export const TransactionTable: React.FC<TransactionTableProps> = (props) => {
  return (
    <TransactionTableProvider value={props as TransactionTableContextProps}>
      <TransactionTableContent />
    </TransactionTableProvider>
  );
};

export const TransactionTableContent: React.FC = () => {
  const context = useTransactionTableContext();
  const { user } = useAuth();
  const [sortOption, setSortOption] = useState<SortOption>('date');
  
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
    getCategoryBackgroundColor,
    getCardBackgroundColor,
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
  const handleSortChange = async (newSortOption: SortOption) => {
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
      switch (sortOption) {
        case 'amount':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'description':
          return a.description.localeCompare(b.description);
        default:
          return 0;
      }
    });
  };

  // Group transactions by month - use filteredTransactions to respect selectedMonths
  const groupedTransactions = useMemo(() => {
    const grouped = groupTransactionsByMonth(filteredTransactions);
    
    // Sort transactions in each month
    Object.keys(grouped).forEach(month => {
      grouped[month] = sortTransactions(grouped[month]);
    });
    
    return grouped;
  }, [filteredTransactions, sortOption]);
  
  // Ensure all months are displayed, even if they have no transactions
  const ensureAllMonths = () => {
    const allMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // If selectedMonths is defined, only show those months
    if (selectedMonths && selectedMonths.length > 0) {
      // Create empty arrays for any selected month that doesn't have transactions
      selectedMonths.forEach(month => {
        if (!groupedTransactions[month]) {
          groupedTransactions[month] = [];
        }
      });
      
      // Get months in order, but only the selected ones
      return Object.keys(groupedTransactions)
        .filter(month => selectedMonths.includes(month))
        .sort((a, b) => getMonthOrder(a) - getMonthOrder(b));
    } else {
      // If no months are selected, show all months
      // First, ensure all months have at least an empty array
      allMonths.forEach(month => {
        if (!groupedTransactions[month]) {
          groupedTransactions[month] = [];
        }
      });
      
      // Return all months in order
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
      console.log("Over Copy Zone: Setting copy mode");
    } else if (isOverMoveZone) {
      setIsCopyMode(false);
      e.dataTransfer.dropEffect = 'move';
      console.log("Over Move Zone: Setting move mode");
    } else {
      // For regular areas, default to move mode
      setIsCopyMode(false);
      e.dataTransfer.dropEffect = 'move';
      console.log("Over Regular Area: Setting move mode");
    }

    // Update drag over state
    setDragOverMonth(targetMonth);
    setDragOverIndex(targetIndex);
    setIsIntraMonthDrag(dragSourceMonth === targetMonth);

    console.log("Drag State Updated:", {
      targetMonth,
      targetIndex,
      isOverCopyZone,
      isOverMoveZone,
      isCopyMode: isOverCopyZone,
      dropEffect: e.dataTransfer.dropEffect
    });
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

    console.log("Month Drag Over:", {
      targetMonth,
      dragOverIndex,
      isCopyMode,
      dropEffect: e.dataTransfer.dropEffect
    });
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
    
    console.log("Transaction Drop", {
      targetMonth,
      targetIndex,
      draggedTransaction,
      draggedIndex,
      dragSourceMonth,
      isCopyMode,
      state: {
        dragOverMonth,
        dragOverIndex,
        isIntraMonthDrag
      }
    });
    
    // Only process if we have a dragged transaction
    if (!draggedTransaction || draggedIndex === null || !dragSourceMonth) {
      console.log("Drop aborted: Missing required drag state");
      resetDragState();
      return;
    }

    try {
      // Check if we're dropping on the copy zone (-888) or move zone (-999)
      const isDropOnCopyZone = targetIndex === -888;
      const isDropOnMoveZone = targetIndex === -999;
      
      console.log("Drop Zone Check:", {
        isDropOnCopyZone,
        isDropOnMoveZone,
        targetIndex,
        isCopyMode
      });

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
        console.log("Duplicate transaction found - drop prevented");
        showNotification('Cannot create duplicate transaction in the same month', 'error');
        resetDragState();
        return;
      }
      
      // Handle copy operations - either explicit copy zone or copy mode
      if (isDropOnCopyZone || (isCopyMode && !isDropOnMoveZone)) {
        console.log("Copying transaction (Copy Zone Drop)");
        
        // Generate a new ID for the copied transaction
        const transactionCopy = { 
          ...draggedTransaction, 
          id: uuidv4(),
          // Keep the original category and ensure date is properly set
          category: draggedTransaction.category,
          date: new Date(draggedTransaction.date)
        };
        
        // Update the date to the target month while preserving the year and day
        const currentDate = new Date(transactionCopy.date);
        const targetMonthIndex = new Date(`${targetMonth} 1`).getMonth();
        transactionCopy.date = new Date(
          currentDate.getFullYear(),
          targetMonthIndex,
          currentDate.getDate()
        );
        
        console.log("Adding copied transaction:", {
          original: draggedTransaction,
          copy: transactionCopy,
          targetMonth,
          targetMonthIndex
        });
        
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
        console.log("Moving transaction (Move Zone Drop)");
        // Update the date to the target month
        const date = new Date(draggedTransaction.date);
        const targetMonthIndex = new Date(`${targetMonth} 1`).getMonth();
        const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
        const transactionToMove = { ...draggedTransaction, date: newDate };
        
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
      console.log("Month Drop - Ignoring due to copy zone");
      return;
    }
    
    console.log("Month Drop", {
      targetMonth,
      draggedTransaction,
      draggedIndex,
      dragSourceMonth,
      isCopyMode,
      dragOverIndex
    });
    
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
        console.log("Duplicate transaction found - drop prevented");
        showNotification('Cannot create duplicate transaction in the same month', 'error');
        resetDragState();
        return;
      }
      
      // Clone the transaction to avoid modifying the original
      const transactionToMove = { ...draggedTransaction };
      
      // Determine if this is a copy operation based on copy mode
      if (isCopyMode) {
        console.log('Copy operation via month drop');
        // This is a copy operation
        // Generate a new ID for the copied transaction
        const transactionCopy = { ...draggedTransaction, id: uuidv4() };
        
        // Update the date to the target month
        const date = new Date(transactionCopy.date);
        const targetMonthIndex = new Date(`${targetMonth} 1`).getMonth();
        const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
        transactionCopy.date = newDate;
        
        // Add the transaction to the target month
        props.onAddTransaction(transactionCopy);
        
        // Show a notification
        showNotification(`Copied transaction to ${targetMonth}`, 'success');
      } else {
        // This is a move operation
        
        // Update the date to the target month
        const date = new Date(transactionToMove.date);
        const targetMonthIndex = new Date(`${targetMonth} 1`).getMonth();
        const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
        transactionToMove.date = newDate;
        
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
    console.log("Drag End, resetting copy mode");
    // Reset drag state completely
    resetDragState();
  };
  
  // Get the background styles for the table
  const backgroundStyles = getBackgroundStyles();
  
  // Determine if we have custom colors
  const hasCustomColor = getCategoryBackgroundColor() !== (isDark ? '#424242' : '#f5f5f5');
  const hasCustomDarkColor = hasCustomColor && isColorDark(getCategoryBackgroundColor() || '');

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
          isDark={isDark}
          hasCustomColor={hasCustomColor}
          hasCustomDarkColor={hasCustomDarkColor}
          tableColors={{}}
          sortOption={sortOption}
          onSortChange={handleSortChange}
        />
        
        {/* Instructions for dragging - show even if no transactions */}
        <Typography 
          variant="caption"
          sx={{ 
            display: 'block',
            textAlign: 'center',
            mb: 1,
            mt: -3,
            color: props.category === 'Income' ? 'rgba(0, 0, 0, 0.6)' : (isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'),
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
              backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.3)' : (props.category === 'Income' ? 'rgba(0,0,0,0.2)' : 'rgba(25, 118, 210, 0.3)'),
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.5)' : (props.category === 'Income' ? 'rgba(0,0,0,0.3)' : 'rgba(25, 118, 210, 0.5)'),
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
              getCardBackgroundColor={getCardBackgroundColor}
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
              getNextMonth={getNextMonth}
              getMonthOrder={getMonthOrder}
            />
          ))}
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
