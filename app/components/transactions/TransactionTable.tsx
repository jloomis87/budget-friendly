import React from 'react';
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
import type { TransactionTableContextProps } from './types';
import { v4 as uuidv4 } from 'uuid';

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

const TransactionTableContent: React.FC = () => {
  const context = useTransactionTableContext();
  
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
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Group transactions by month - use filteredTransactions to respect selectedMonths
  const groupedTransactions = groupTransactionsByMonth(filteredTransactions);
  
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
    
    // Check if the user is holding the Ctrl/Cmd key for copy mode
    setIsCopyMode(e.ctrlKey || e.metaKey);
    
    // Call the parent drag start handler if provided
    if (props.onDragStart) {
      const globalIndex = utils.findGlobalIndex(transaction, props.allTransactions);
      props.onDragStart(e, transaction, globalIndex);
    }
  };
  
  const handleTransactionDragOver = (e: React.DragEvent, targetMonth: string, targetIndex: number) => {
    e.preventDefault();
    
    // Log the drag over event
    console.log("Transaction Drag Over", targetMonth, targetIndex);
    
    // Update copy mode based on current key state or if over the copy zone
    // Special index -888 is used for the "Copy Here" zone
    const newCopyMode = e.ctrlKey || e.metaKey || targetIndex === -888;
    console.log("Setting copy mode to", newCopyMode, "because targetIndex is", targetIndex);
    
    // Always set copy mode to true when over the copy zone
    if (targetIndex === -888) {
      setIsCopyMode(true);
    } else if (isCopyMode !== newCopyMode) {
      setIsCopyMode(newCopyMode);
    }
    
    e.dataTransfer.dropEffect = (targetIndex === -888 || newCopyMode) ? 'copy' : 'move';
    
    // Update drag over state
    setDragOverMonth(targetMonth);
    setDragOverIndex(targetIndex);
    
    // Determine if this is an intra-month drag (within the same month)
    setIsIntraMonthDrag(dragSourceMonth === targetMonth);
    
    // Clear any existing drag leave timeout
    if (dragLeaveTimeout) {
      window.clearTimeout(dragLeaveTimeout);
      setDragLeaveTimeout(null);
    }
  };
  
  const handleMonthDragOver = (e: React.DragEvent, targetMonth: string) => {
    e.preventDefault();
    
    // Update copy mode based on current key state
    // For general month drag, we still respect the key press
    const newCopyMode = e.ctrlKey || e.metaKey;
    if (isCopyMode !== newCopyMode) {
      setIsCopyMode(newCopyMode);
    }
    
    e.dataTransfer.dropEffect = newCopyMode ? 'copy' : 'move';
    
    // Update drag over state
    setDragOverMonth(targetMonth);
    
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
    
    console.log("Transaction Drop", {
      targetMonth,
      targetIndex,
      draggedTransaction,
      draggedIndex,
      dragSourceMonth,
      isCopyMode
    });
    
    // Only process if we have a dragged transaction
    if (draggedTransaction && draggedIndex !== null && dragSourceMonth) {
      // Get the source and target transactions
      const sourceTransactions = groupedTransactions[dragSourceMonth] || [];
      const targetTransactions = groupedTransactions[targetMonth] || [];
      
      // Clone the transaction to avoid modifying the original
      const transactionToMove = { ...draggedTransaction };
      
      console.log("Copy Mode", isCopyMode, "Target Index", targetIndex);
      
      // Force copy mode when dropping on the copy zone
      if (targetIndex === -888) {
        console.log("Forcing copy mode because dropping on copy zone");
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
      } 
      // Handle normal copy mode (Ctrl/Cmd key)
      else if (isCopyMode) {
        console.log('Copy operation via Ctrl/Cmd key');
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
        
        // If moving within the same month, we need to handle reordering
        if (dragSourceMonth === targetMonth) {
          // Get all transactions for this month and category
          const monthTransactions = [...sourceTransactions];
          
          // Remove the transaction from its original position
          const [removedTransaction] = monthTransactions.splice(draggedIndex, 1);
          
          // Insert it at the new position
          monthTransactions.splice(targetIndex > draggedIndex ? targetIndex - 1 : targetIndex, 0, removedTransaction);
          
          // Update all transactions
          const updatedTransactions = [...props.transactions];
          
          // Remove all transactions for this month and category
          const remainingTransactions = updatedTransactions.filter(t => {
            const tDate = new Date(t.date);
            const tMonth = tDate.toLocaleString('default', { month: 'long' });
            return !(tMonth === dragSourceMonth && t.category === props.category);
          });
          
          // Add the reordered transactions
          const finalTransactions = [...remainingTransactions, ...monthTransactions];
          
          // Update the parent component
          props.onTransactionsChange(finalTransactions);
          
          // Show a notification
          showNotification(`Reordered transaction in ${targetMonth}`, 'success');
        } else {
          // Moving between different months
          
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
    }
    
    // Reset drag state
    resetDragState();
  };
  
  const handleMonthDrop = (e: React.DragEvent, targetMonth: string) => {
    e.preventDefault();
    
    console.log("Month Drop", {
      targetMonth,
      draggedTransaction,
      draggedIndex,
      dragSourceMonth,
      isCopyMode
    });
    
    // Only process if we have a dragged transaction
    if (draggedTransaction && draggedIndex !== null && dragSourceMonth) {
      // Skip if dropping on the same month it came from (when not copying)
      if (!isCopyMode && dragSourceMonth === targetMonth) {
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
    // Always reset drag state completely, including copy mode
    resetDragState(false); // Explicitly pass false to ensure copy mode is reset
  };
  
  // Get the background styles for the table
  const backgroundStyles = getBackgroundStyles();
  
  // Determine if we have custom colors
  const hasCustomColor = getCategoryBackgroundColor() !== (isDark ? '#424242' : '#f5f5f5');
  const hasCustomDarkColor = hasCustomColor && isColorDark(getCategoryBackgroundColor() || '');

  return (
    <Box sx={{ position: 'relative', mb: 4 }}>
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
          category={category}
          totalAmount={filteredTransactions.reduce((sum, t) => sum + t.amount, 0)}
          isDark={isDark}
          hasCustomColor={hasCustomColor}
          hasCustomDarkColor={hasCustomDarkColor}
          tableColors={{}}
        />
        
        {/* Instructions for dragging - show even if no transactions */}
        <Typography 
          variant="caption"
          sx={{ 
            display: 'block',
            textAlign: 'center',
            mb: 1,
            mt: -1,
            color: category === 'Income' ? 'rgba(0, 0, 0, 0.6)' : (isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'),
          }}
        >
          {filteredTransactions.length > 0 
            ? 'Drag to move or copy transactions between months' 
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
              backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.3)' : (category === 'Income' ? 'rgba(0,0,0,0.2)' : 'rgba(25, 118, 210, 0.3)'),
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.5)' : (category === 'Income' ? 'rgba(0,0,0,0.3)' : 'rgba(25, 118, 210, 0.5)'),
              }
            }
          }}
        >
          {months.map((month) => (
            <MonthColumn
              key={month}
              month={month}
              monthTransactions={groupedTransactions[month] || []}
              category={category}
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
        category={category}
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
        category={category}
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
        category={category}
        transactionCount={dialogState.copyTransactions.length}
      />
    </Box>
  );
};

export default TransactionTable;
