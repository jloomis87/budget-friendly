import React, { useState, useEffect } from 'react';
import { Box, Paper, useMediaQuery, useTheme, Typography } from '@mui/material';
import { isColorDark } from '../../utils/colorUtils';
import { useTableColors } from '../../hooks/useTableColors';
import { useTransactionUtils } from './useTransactionUtils';
import { TableHeader } from './TableHeader';
import { DesktopTransactionTable } from './DesktopTransactionTable';
import { MobileTransactionList } from './MobileTransactionList';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { MobileEditDialog } from './MobileEditDialog';
import { MobileAddDialog } from './MobileAddDialog';
import type { Transaction } from '../../services/fileParser';
import type { EnhancedTransactionTableProps, EditingRow } from './types';
import { CategoryColorPicker } from '../CategoryColorPicker';

export function EnhancedTransactionTable({
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
  onReorder
}: EnhancedTransactionTableProps) {
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ transaction: Transaction, index: number } | null>(null);
  
  // State for new transaction form
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState('1');
  const [isAdding, setIsAdding] = useState(false);
  
  // Mobile edit dialog state
  const [mobileEditDialogOpen, setMobileEditDialogOpen] = useState(false);
  const [mobileEditTransaction, setMobileEditTransaction] = useState<{
    transaction: Transaction;
    index: number;
    identifier: string;
  } | null>(null);
  
  // Mobile add dialog state
  const [mobileAddDialogOpen, setMobileAddDialogOpen] = useState(false);

  const [tableColors] = useTableColors();
  const utils = useTransactionUtils();

  // Check if the table has a custom color and if it's dark
  const hasCustomColor = tableColors[category] !== '#f5f5f5';
  const isDark = Boolean(tableColors[category] && isColorDark(tableColors[category]));

  // Handle editing row changes
  const handleEditingChange = (field: keyof EditingRow, value: string) => {
    if (editingRow) {
      console.log(`Editing field "${field}" changed to:`, value);
      setEditingRow({
        ...editingRow,
        [field]: value
      });
    }
  };

  // Handle saving a row edit
  const handleSaveEdit = (transaction: Transaction) => {
    if (editingRow) {
      const updates: Partial<Transaction> = {};
      
      // Update amount if valid
      const cleanValue = editingRow.amount.replace(/[^0-9.]/g, '');
      const parsedAmount = parseFloat(cleanValue);
      if (!isNaN(parsedAmount)) {
        // Keep the sign consistent with the category
        const signedAmount = transaction.category === 'Income' 
          ? Math.abs(parsedAmount) 
          : -Math.abs(parsedAmount);
        updates.amount = signedAmount;
      }
      
      // Update date if changed - now storing day of month as a number
      if (editingRow.date) {
        try {
          // Convert the day string to a number
          const day = parseInt(editingRow.date, 10);
          if (!isNaN(day) && day >= 1 && day <= 31) {
            updates.date = day;
            console.log('Updating date to day number:', day);
          }
        } catch (e) {
          // Invalid date, ignore
          console.error('Error parsing date:', e);
        }
      }
      
      // Update description if changed
      if (editingRow.description.trim() !== transaction.description) {
        updates.description = editingRow.description.trim();
      }
      
      // Find the true global index in the full transactions array
      const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
      
      console.log('Transaction update info:', {
        editingRowValues: editingRow,
        updates,
        globalIndex,
        originalTransaction: transaction
      });
      
      if (globalIndex !== -1) {
        // Apply all updates
        onUpdateTransaction(globalIndex, updates);
      } else {
        console.error('Could not find transaction in all transactions array:', transaction);
      }
      
      setEditingRow(null);
    }
  };

  // Handle adding a new transaction
  const handleAddTransaction = () => {
    // Validate inputs
    if (!newDescription.trim()) {
      return; // Description is required
    }
    
    const parsedAmount = parseFloat(newAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return; // Valid amount is required
    }
    
    // Create transaction object
    const newTransaction: Transaction = {
      description: newDescription.trim(),
      amount: -parsedAmount, // Expense is always negative
      date: parseInt(newDate, 10), // Store as day number
      category: category as "Essentials" | "Wants" | "Savings" | "Income"
    };
    
    // Add transaction
    onAddTransaction(newTransaction);
    
    // Reset form
    setNewDescription('');
    setNewAmount('');
    setNewDate('1'); // Default to day 1
    setIsAdding(false);
  };

  // Background styling based on drag state and custom color
  const getBackgroundStyles = () => {
    if (dragOverCategory === category) {
      return {
        backgroundColor: 'rgba(25, 118, 210, 0.08)', // Light blue when being dragged over
        transition: 'background-color 0.3s ease',
        transform: 'scale(1.01)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      };
    }
    if (recentlyDropped === category) {
      return {
        backgroundColor: 'rgba(76, 175, 80, 0.08)', // Light green when recently received an item
        transition: 'background-color 0.8s ease'
      };
    }
    return hasCustomColor ? { backgroundColor: tableColors[category] } : {};
  };

  // Handle delete transaction click
  const handleDeleteClick = (e: React.MouseEvent, transaction: Transaction, index: number) => {
    e.stopPropagation(); // Prevent row click event
    
    console.log('Delete button clicked for transaction:', {
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      localIndex: index
    });
    
    if (allTransactions) {
      // Use findGlobalIndex to get the correct global index
      const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
      console.log(`Found global index: ${globalIndex}`);
      
      if (globalIndex === -1) {
        console.error('Could not find transaction to delete in global array');
        alert('Error: Could not find the transaction to delete. Please try again.');
        return;
      }
      
      setTransactionToDelete({ transaction, index: globalIndex });
      setDeleteConfirmOpen(true);
    }
  };

  // Confirm and execute delete
  const confirmDelete = () => {
    if (transactionToDelete) {
      onDeleteTransaction(transactionToDelete.index);
    }
    setDeleteConfirmOpen(false);
    setTransactionToDelete(null);
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setTransactionToDelete(null);
  };

  // Check if any row is currently being edited - used to determine if we need the Actions column
  const isAnyRowEditing = editingRow !== null;

  // Calculate total amount for this category
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Handle row click to start editing
  const handleRowClick = (transaction: Transaction, transactionId: string, index: number) => {
    // Only start editing if not already editing another row
    if (!editingRow) {
      // Get date string
      const dayValue = typeof transaction.date === 'number' 
        ? transaction.date.toString() 
        : (transaction.date instanceof Date 
            ? transaction.date.getDate().toString() 
            : (typeof transaction.date === 'string' && /^\d{1,2}$/.test(transaction.date)
                ? transaction.date
                : new Date(transaction.date as string).getDate().toString()));

      setEditingRow({
        index: utils.findGlobalIndex(transaction, allTransactions),
        identifier: transactionId,
        amount: Math.abs(transaction.amount).toString(),
        date: dayValue,
        description: transaction.description
      });
    }
  };

  // Handle opening mobile edit dialog
  const handleOpenMobileEdit = (transaction: Transaction, index: number) => {
    const transactionId = utils.getTransactionId(transaction);
    const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
    
    console.log('Opening mobile edit dialog:', {
      transaction,
      localIndex: index,
      globalIndex,
      category: transaction.category,
      transactionId
    });
    
    setMobileEditTransaction({
      transaction,
      index,
      identifier: transactionId
    });
    
    // Set the editing row state with the same values
    const dayValue = typeof transaction.date === 'number' 
      ? transaction.date.toString() 
      : (transaction.date instanceof Date 
        ? transaction.date.getDate().toString() 
        : (typeof transaction.date === 'string' && /^\d{1,2}$/.test(transaction.date)
          ? transaction.date
          : new Date(transaction.date as string).getDate().toString()));
    
    setEditingRow({
      index: globalIndex,
      identifier: transactionId,
      amount: Math.abs(transaction.amount).toString(),
      date: dayValue,
      description: transaction.description
    });
    
    setMobileEditDialogOpen(true);
  };
  
  // Handle closing mobile edit dialog
  const handleCloseMobileEdit = () => {
    setMobileEditDialogOpen(false);
    setMobileEditTransaction(null);
    setEditingRow(null);
  };
  
  // Handle saving mobile edit
  const handleSaveMobileEdit = () => {
    if (mobileEditTransaction && editingRow) {
      const day = parseInt(editingRow.date, 10);
      
      const updatedTransaction: Partial<Transaction> = {
        description: editingRow.description,
        date: day, // Store as day number
        amount: parseFloat(editingRow.amount) * (category === 'Income' ? 1 : -1)
      };
      
      // Find the global index in the full transactions array
      const globalIndex = utils.findGlobalIndex(mobileEditTransaction.transaction, allTransactions);
      
      console.log('Mobile Edit - Updating transaction:', {
        originalTransaction: mobileEditTransaction.transaction,
        updatedFields: updatedTransaction,
        localIndex: mobileEditTransaction.index,
        globalIndex: globalIndex
      });
      
      // Use the global index instead of the local category index
      onUpdateTransaction(globalIndex, updatedTransaction);
      handleCloseMobileEdit();
    }
  };

  // Handle opening mobile add dialog
  const handleOpenMobileAdd = () => {
    setNewDescription('');
    setNewAmount('');
    setNewDate('1');
    setMobileAddDialogOpen(true);
  };
  
  // Handle closing mobile add dialog
  const handleCloseMobileAdd = () => {
    setMobileAddDialogOpen(false);
    setNewDescription('');
    setNewAmount('');
    setNewDate('1');
  };
  
  // Handle adding transaction from mobile dialog
  const handleAddTransactionMobile = () => {
    // Validate inputs
    if (!newDescription.trim()) {
      // Show error or alert
      return;
    }
    
    const amountValue = parseFloat(newAmount);
    if (isNaN(amountValue) || amountValue <= 0) {
      // Show error or alert
      return;
    }
    
    // Create new transaction
    const newTransaction: Transaction = {
      description: newDescription.trim(),
      amount: -Math.abs(amountValue), // Negative for expenses
      date: parseInt(newDate, 10), // Store as day number
      category: category as "Essentials" | "Wants" | "Savings" | "Income"
    };
    
    // Add transaction
    onAddTransaction(newTransaction);
    
    // Close dialog and reset form
    handleCloseMobileAdd();
  };

  return (
    <>
      <Box 
        sx={{ mt: 3, mb: 3 }}
      >
        <Paper 
          elevation={1} 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            overflow: 'hidden',
            ...getBackgroundStyles(),
            transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.3s'
          }}
          className={`drag-target ${dragOverCategory === category ? 'drag-target-hover' : ''}`}
          onDragOver={(e) => onDragOver(e, category)}
          onDrop={(e) => onDrop(e, category)}
          onDragLeave={() => {}}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            pb: 2,
            mb: 1
          }}>
            <Typography variant="h6" sx={{
              fontWeight: 'bold',
              color: isDark ? '#fff' : 'inherit',
              fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              letterSpacing: '0.01em'
            }}>
              {category}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                component="span" 
                variant="subtitle1"
                sx={{ 
                  fontWeight: 500, 
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                  fontSize: '0.9rem'
                }}
              >
                (Total: ${totalAmount.toFixed(2)})
              </Typography>
              <CategoryColorPicker category={category} />
            </Box>
          </Box>
          
          {/* Always use the mobile view regardless of screen size */}
          <MobileTransactionList
            category={category}
            transactions={[...transactions].sort((a, b) => (a.order || 0) - (b.order || 0))}
            isDark={isDark}
            isAdding={isAdding}
            handleOpenMobileEdit={handleOpenMobileEdit}
            handleOpenMobileAdd={handleOpenMobileAdd}
            setIsAdding={setIsAdding}
            formatDateForDisplay={utils.formatDateForDisplay}
            onDragStart={onDragStart}
            allTransactions={allTransactions}
            findGlobalIndex={(transaction, allTrans) => utils.findGlobalIndex(transaction, allTrans)}
            onReorder={onReorder}
          />
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        transactionToDelete={transactionToDelete}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />

      {/* Mobile editing dialog */}
      <MobileEditDialog
        open={mobileEditDialogOpen}
        category={category}
        editingRow={editingRow}
        onClose={handleCloseMobileEdit}
        onSave={handleSaveMobileEdit}
        onDelete={() => {
          if (mobileEditTransaction && allTransactions) {
            console.log('Delete button clicked for transaction:', {
              description: mobileEditTransaction.transaction.description,
              amount: mobileEditTransaction.transaction.amount,
              category: mobileEditTransaction.transaction.category,
              localIndex: mobileEditTransaction.index
            });
            
            // Use findGlobalIndex to get the correct global index
            const globalIndex = utils.findGlobalIndex(mobileEditTransaction.transaction, allTransactions);
            console.log(`Found global index: ${globalIndex}`);
            
            if (globalIndex === -1) {
              console.error('Could not find transaction to delete in global array');
              alert('Error: Could not find the transaction to delete. Please try again.');
              handleCloseMobileEdit();
              return;
            }
            
            setTransactionToDelete({
              transaction: mobileEditTransaction.transaction,
              index: globalIndex
            });
            setDeleteConfirmOpen(true);
            handleCloseMobileEdit();
          }
        }}
        handleEditingChange={handleEditingChange}
        generateDayOptions={utils.generateDayOptions}
        getOrdinalSuffix={utils.getOrdinalSuffix}
        tableColor={tableColors[category]}
        isDark={isDark}
      />

      {/* Mobile add dialog */}
      <MobileAddDialog
        open={mobileAddDialogOpen}
        category={category}
        newDescription={newDescription}
        newAmount={newAmount}
        newDate={newDate}
        setNewDescription={setNewDescription}
        setNewAmount={setNewAmount}
        setNewDate={setNewDate}
        onClose={handleCloseMobileAdd}
        onAdd={handleAddTransactionMobile}
        generateDayOptions={utils.generateDayOptions}
        getOrdinalSuffix={utils.getOrdinalSuffix}
        tableColor={tableColors[category]}
        isDark={isDark}
      />
    </>
  );
} 