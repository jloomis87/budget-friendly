import React, { useState, useEffect } from 'react';
import { Box, Paper, useMediaQuery, useTheme, Typography, Grid, Stack, Card, CardContent, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
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
import { v4 as uuidv4 } from 'uuid';
import { CopyMonthConfirmationDialog } from './CopyMonthConfirmationDialog';

// Helper function to format date for display
const formatDate = (date: string | number | Date) => {
  // If it's just a day number, use current month/year
  if (typeof date === 'number') {
    const now = new Date();
    const fullDate = new Date(now.getFullYear(), now.getMonth(), date);
    return fullDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  // If it's a Date object
  if (date instanceof Date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  // If it's a string in YYYY-MM-DD format
  if (typeof date === 'string' && date.includes('-')) {
    const [year, month, day] = date.split('-').map(Number);
    const fullDate = new Date(year, month - 1, day);  // month is 0-based in Date constructor
    return fullDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  // For any other string format
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
    
    // If transaction.date is a number (day of month), use current month
    if (typeof transaction.date === 'number') {
      date = new Date();
      date.setDate(transaction.date);
    } else if (typeof transaction.date === 'string' && transaction.date.includes('-')) {
      // If it's a YYYY-MM-DD format string
      const [year, month, day] = transaction.date.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      // If it's any other format
      date = new Date(transaction.date);
    }
    
    const month = date.toLocaleString('default', { month: 'long' });
    
    if (!grouped[month]) {
      grouped[month] = [];
    }
    grouped[month].push(transaction);
  });
  
  // Sort transactions within each month by date
  Object.values(grouped).forEach(monthTransactions => {
    monthTransactions.sort((a, b) => {
      const getDate = (d: string | number) => {
        if (typeof d === 'number') return d;
        if (typeof d === 'string' && d.includes('-')) {
          const [, , day] = d.split('-').map(Number);
          return day;
        }
        return new Date(d).getDate();
      };
      
      return getDate(a.date) - getDate(b.date);
    });
  });
  
  return grouped;
};

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
  onReorder,
  selectedMonths
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

  // Add new state for copy month dialog
  const [copyMonthDialogOpen, setCopyMonthDialogOpen] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState('');
  const [copyTargetMonth, setCopyTargetMonth] = useState('');
  const [copyTransactions, setCopyTransactions] = useState<Transaction[]>([]);

  const [tableColors] = useTableColors();
  const utils = useTransactionUtils();

  // Get months that have no transactions
  const monthsWithoutTransactions = React.useMemo(() => {
    const allMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // If no months are selected, show all months
    if (!selectedMonths?.length) {
      return allMonths.filter(month => {
        return !transactions.some(transaction => {
          const transactionDate = new Date(transaction.date);
          const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
          return transactionMonth === month;
        });
      });
    }
    
    // Otherwise, show all selected months that don't have transactions
    return allMonths.filter(month => {
      const hasNoTransactions = !transactions.some(transaction => {
        const transactionDate = new Date(transaction.date);
        const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
        return transactionMonth === month;
      });
      return selectedMonths.includes(month) && hasNoTransactions;
    });
  }, [transactions, selectedMonths]);

  // Filter transactions by selected months
  const filteredTransactions = React.useMemo(() => {
    const allMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    if (!selectedMonths?.length) {
      // If no months selected, show all transactions
      return transactions;
    }
    
    // Filter transactions for selected months
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
      return selectedMonths.includes(transactionMonth);
    });
  }, [transactions, selectedMonths]);

  // Helper function to get month order for sorting
  const getMonthOrder = (month: string): number => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
  };

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
      
      // Update date if changed - now storing full date string
      if (editingRow.date) {
        try {
          // Store the full date string
          updates.date = editingRow.date;
          console.log('Updating date to:', editingRow.date);
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
    if (!newDescription.trim() || !newAmount.trim()) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];  // Get YYYY-MM-DD format

    const transaction: Transaction = {
      description: newDescription.trim(),
      amount: -parseFloat(newAmount.replace(/[^0-9.]/g, '')),
      date: dateStr,
      category: category as "Essentials" | "Wants" | "Savings" | "Income",
      id: uuidv4(),
    };

    onAddTransaction(transaction);
    setNewDescription('');
    setNewAmount('');
    setNewDate('1');
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
      const updatedTransaction: Partial<Transaction> = {
        description: editingRow.description,
        date: editingRow.date, // Store full date string
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
  const handleOpenMobileAdd = (month: string) => {
    // Get the current month from the clicked column
    const currentYear = new Date().getFullYear();
    const monthIndex = new Date(`${month} 1`).getMonth(); // Get month index (0-11)
    const firstOfMonth = new Date(currentYear, monthIndex, 1);
    const newDateValue = firstOfMonth.toISOString().split('T')[0];

    setNewDescription('');
    setNewAmount('');
    setNewDate(newDateValue);
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
    if (!newDescription.trim() || !newAmount.trim()) return;

    const transaction: Transaction = {
      description: newDescription.trim(),
      amount: -parseFloat(newAmount.replace(/[^0-9.]/g, '')),
      date: newDate, // Use the full date string from the date picker
      category: category as "Essentials" | "Wants" | "Savings" | "Income",
      id: uuidv4(),
    };

    onAddTransaction(transaction);
    setNewDescription('');
    setNewAmount('');
    setNewDate('');
    setMobileAddDialogOpen(false);
  };

  // Helper function to get the next month
  const getNextMonth = (currentMonth: string): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentIndex = months.indexOf(currentMonth);
    return months[(currentIndex + 1) % 12];
  };

  // Handle opening copy month dialog
  const handleCopyMonthClick = (month: string, transactions: Transaction[]) => {
    const nextMonth = getNextMonth(month);
    setCopySourceMonth(month);
    setCopyTargetMonth(nextMonth);
    setCopyTransactions(transactions);
    setCopyMonthDialogOpen(true);
  };

  // Handle confirming copy month
  const handleCopyMonthConfirm = () => {
    // Get the month numbers for source and target
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const targetMonthIndex = months.indexOf(copyTargetMonth);

    // Copy each transaction with updated date
    copyTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      // Create new date with same day but target month
      const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
      
      const newTransaction: Transaction = {
        ...transaction,
        id: uuidv4(), // Generate new ID for the copy
        date: newDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        // Preserve the sign based on category
        amount: category === 'Income' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount)
      };

      onAddTransaction(newTransaction);
    });

    setCopyMonthDialogOpen(false);
  };

  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      <Paper 
        elevation={1} 
        sx={{ 
          mb: 1,
          borderRadius: 2,
          overflow: 'hidden',
          ...getBackgroundStyles(),
          transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.3s'
        }}
        className={`drag-target ${dragOverCategory === category ? 'drag-target-hover' : ''}`}
        onDragOver={(e) => onDragOver && onDragOver(e, category)}
        onDrop={(e) => onDrop && onDrop(e, category)}
        onDragLeave={() => {}}
      >
        <Box sx={{ 
          p: 1,
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
          pb: 1,
          mb: 0.5
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 'bold',
              color: tableColors[category] && isColorDark(tableColors[category]) 
                ? 'rgba(255, 255, 255, 0.9)' 
                : 'rgba(0, 0, 0, 0.9)',
              fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              letterSpacing: '0.01em',
            }}>
              {category}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                component="span" 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 500, 
                  color: tableColors[category] && isColorDark(tableColors[category])
                    ? 'rgba(255, 255, 255, 0.7)'
                    : 'rgba(0, 0, 0, 0.7)',
                  fontSize: '0.9rem'
                }}
              >
                (Total: ${Math.abs(totalAmount).toFixed(2)})
              </Typography>
              <CategoryColorPicker category={category} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 1 }}>
          <Grid 
            container 
            spacing={1} 
            sx={{ 
              flexWrap: 'nowrap', 
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(0,0,0,0.1)' },
              '&::-webkit-scrollbar-thumb': { 
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 3,
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.3)'
                }
              }
            }}
          >
            {/* Group transactions by month */}
            {(() => {
              const groupedTransactions = groupTransactionsByMonth(filteredTransactions);
              const allMonths = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              
              // If no months are selected, show all months
              const monthsToShow = !selectedMonths?.length ? allMonths : selectedMonths;
              
              // Create array of months with their transactions (empty array if no transactions)
              return monthsToShow
                .map(month => [month, groupedTransactions[month] || [] as Transaction[]])
                .sort(([monthA], [monthB]) => getMonthOrder(monthA as string) - getMonthOrder(monthB as string))
                .map(([month, monthTransactions]) => (
                  <Grid 
                    item 
                    key={month} 
                    sx={{ 
                      width: `${100 / monthsToShow.length}%`,
                      minWidth: '200px',
                      p: 1
                    }}
                  >
                    {/* Month Header with Copy Button */}
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 0.5,
                      borderBottom: 1,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider',
                      pb: 0.5,
                      width: '100%',
                      minHeight: '32px' // Ensure minimum height for the header
                    }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 500,
                          color: tableColors[category] && isColorDark(tableColors[category]) 
                            ? 'rgba(255, 255, 255, 0.9)' 
                            : 'rgba(0, 0, 0, 0.9)',
                          flex: '1 1 auto' // Allow text to shrink if needed
                        }}
                      >
                        {month}
                      </Typography>
                      <Tooltip title={`Copy ${month} ${category} to ${getNextMonth(month as string)}`}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyMonthClick(month as string, monthTransactions as Transaction[])}
                          sx={{
                            color: tableColors[category] && isColorDark(tableColors[category])
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'rgba(0, 0, 0, 0.54)',
                            '&:hover': {
                              color: tableColors[category] && isColorDark(tableColors[category])
                                ? 'rgba(255, 255, 255, 0.9)'
                                : 'rgba(0, 0, 0, 0.87)',
                              backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            },
                            ml: 1,
                            display: 'flex !important',
                            visibility: 'visible !important',
                            position: 'relative',
                            zIndex: 10,
                            padding: '4px',
                            minWidth: '32px',
                            minHeight: '32px',
                            borderRadius: '4px',
                            '&:active': {
                              backgroundColor: 'rgba(0, 0, 0, 0.08)'
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
                        color: tableColors[category] && isColorDark(tableColors[category])
                          ? 'rgba(255, 255, 255, 0.6)'
                          : 'rgba(0, 0, 0, 0.6)',
                        mb: 1,
                        textAlign: 'left'
                      }}
                    >
                      ${Math.abs((monthTransactions as Transaction[]).reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                    </Typography>
                    <Stack spacing={1}>
                      {(monthTransactions as Transaction[]).map((transaction) => {
                        const transactionId = utils.getTransactionId(transaction);
                        const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
                        const isEditing = editingRow?.identifier === transactionId;

                        return (
                          <Card
                            key={transactionId}
                            sx={{
                              bgcolor: isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                              borderRadius: 2,
                              border: '1px dashed',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                              height: '63px',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                borderColor: 'primary.main',
                                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 118, 210, 0.05)'
                              }
                            }}
                            onClick={() => !isEditing && handleOpenMobileEdit(transaction, globalIndex)}
                            draggable={!isEditing}
                            onDragStart={(e) => onDragStart && onDragStart(e, transaction, globalIndex)}
                          >
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 500,
                                      color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
                                      fontSize: '0.875rem'
                                    }}
                                  >
                                    {transaction.description}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {formatDate(transaction.date)}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.87)',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  ${Math.abs(transaction.amount).toFixed(2)}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {/* Add Transaction Card */}
                      <Card
                        sx={{
                          position: 'relative',
                          bgcolor: isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                          borderRadius: 2,
                          border: '1px dashed',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          height: '63px',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            borderColor: 'primary.main',
                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 118, 210, 0.05)'
                          }
                        }}
                        onClick={() => handleOpenMobileAdd(month as string)}
                      >
                        <CardContent sx={{ 
                          p: 1, 
                          '&:last-child': { pb: 1 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%'
                        }}>
                          <AddIcon sx={{ 
                            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                            fontSize: '1.5rem'
                          }} />
                        </CardContent>
                      </Card>
                    </Stack>
                  </Grid>
                ))
            })()}
          </Grid>
        </Box>
      </Paper>

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
          if (mobileEditTransaction) {
            handleDeleteClick(new MouseEvent('click'), mobileEditTransaction.transaction, mobileEditTransaction.index);
          }
          handleCloseMobileEdit();
        }}
        handleEditingChange={(field, value) => {
          if (editingRow) {
            handleEditingChange(field, value);
          }
        }}
        generateDayOptions={utils.generateDayOptions}
        getOrdinalSuffix={utils.getOrdinalSuffix}
        tableColor={tableColors[category]}
        isDark={isDark}
      />

      {/* Mobile add dialog */}
      <MobileAddDialog
        open={mobileAddDialogOpen}
        onClose={handleCloseMobileAdd}
        onAdd={handleAddTransactionMobile}
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

      {/* Add CopyMonthConfirmationDialog */}
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