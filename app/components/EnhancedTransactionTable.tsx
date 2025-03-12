import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Table, TableHead, 
  TableBody, TableRow, TableCell, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Tooltip,
  useMediaQuery, useTheme, Card, CardContent, Grid, Stack, Divider
} from '@mui/material';
import { EditOutlinedIcon, SaveIcon, CloseIcon, DragIndicatorIcon, DeleteIcon, AddIcon, CheckCircleOutlineIcon, CancelOutlinedIcon } from '../utils/materialIcons';
import { CategoryColorPicker } from './CategoryColorPicker';
import type { Transaction } from '../services/fileParser';
import { isColorDark } from '../utils/colorUtils';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from '../hooks/useLocalStorage';

interface EnhancedTransactionTableProps {
  category: string;
  transactions: Transaction[];
  allTransactions: Transaction[];
  onUpdateTransaction: (index: number, updatedTransaction: Partial<Transaction>) => void;
  onDeleteTransaction: (index: number) => void;
  onAddTransaction: (transaction: Transaction) => void;
  onDragStart: (e: React.DragEvent, transaction: Transaction, globalIndex: number) => void;
  onDragOver: (e: React.DragEvent, category: string) => void;
  onDrop: (e: React.DragEvent, targetCategory: string) => void;
  dragOverCategory: string | null;
  recentlyDropped: string | null;
}

interface EditingRow {
  index: number;
  identifier: string;
  amount: string;
  date: string;
  description: string;
}

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
  recentlyDropped
}: EnhancedTransactionTableProps) {
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ transaction: Transaction, index: number } | null>(null);
  
  // State for new transaction form
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [showSummary, setShowSummary] = useState(true);
  
  // Add theme and media query for responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Mobile edit dialog state
  const [mobileEditDialogOpen, setMobileEditDialogOpen] = useState(false);
  const [mobileEditTransaction, setMobileEditTransaction] = useState<{
    transaction: Transaction;
    index: number;
    identifier: string;
  } | null>(null);

  const [tableColors] = useLocalStorage<Record<string, string>>(
    STORAGE_KEYS.TABLE_COLORS,
    LEGACY_STORAGE_KEYS.TABLE_COLORS,
    {
      'Essentials': '#f5f5f5', // Default light gray
      'Wants': '#f5f5f5',
      'Savings': '#f5f5f5',
      'Income': '#f5f5f5'
    }
  );

  // Check if the table has a custom color and if it's dark
  const hasCustomColor = tableColors[category] !== '#f5f5f5';
  const isDark = tableColors[category] && isColorDark(tableColors[category]);

  // Handle editing row changes
  const handleEditingChange = (field: keyof EditingRow, value: string) => {
    if (editingRow) {
      setEditingRow({
        ...editingRow,
        [field]: value
      });
    }
  };

  // Helper to get date string for comparison 
  const getDateString = (date: Date | string): string => {
    if (date instanceof Date) {
      return date.toISOString();
    } else if (typeof date === 'string') {
      // Try to convert string to date and then to ISO string
      try {
        return new Date(date).toISOString();
      } catch (e) {
        return date;
      }
    }
    // Fallback
    return String(date);
  };

  // Find the global index of a transaction in the full transactions array
  const findGlobalIndex = (transaction: Transaction): number => {
    return allTransactions.findIndex(t => {
      const dateMatch = getDateString(t.date) === getDateString(transaction.date);
      return dateMatch && 
        t.description === transaction.description && 
        t.amount === transaction.amount &&
        t.category === transaction.category;
    });
  };

  // Create a unique identifier for a transaction
  const getTransactionId = (transaction: Transaction) => {
    return `${getDateString(transaction.date)}-${transaction.description}-${transaction.amount}-${transaction.category}`;
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
      
      // Update date if changed
      if (editingRow.date) {
        try {
          // Fix for date offset issue - create date object without timezone conversion
          const [year, month, day] = editingRow.date.split('-').map(Number);
          updates.date = new Date(year, month - 1, day);
        } catch (e) {
          // Invalid date, ignore
        }
      }
      
      // Update description if changed
      if (editingRow.description.trim() !== transaction.description) {
        updates.description = editingRow.description.trim();
      }
      
      // Find the true global index in the full transactions array
      const globalIndex = findGlobalIndex(transaction);
      
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
      date: new Date(newDate),
      category
    };
    
    // Add transaction
    onAddTransaction(newTransaction);
    
    // Reset form
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setIsAdding(false);
  };

  // Background styling based on drag state and custom color
  const getBackgroundStyles = () => {
    if (dragOverCategory === category) {
      return {
        backgroundColor: 'rgba(25, 118, 210, 0.08)', // Light blue when being dragged over
        transition: 'background-color 0.3s ease'
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

  // Helper to format date for display
  const formatDateForDisplay = (date: Date | string): string => {
    if (date instanceof Date) {
      return date.toLocaleDateString();
    } else if (typeof date === 'string') {
      try {
        return new Date(date).toLocaleDateString();
      } catch (e) {
        return date;
      }
    }
    return String(date);
  };

  // Handle delete transaction click
  const handleDeleteClick = (e: React.MouseEvent, transaction: Transaction, index: number) => {
    e.stopPropagation(); // Prevent row click event
    setTransactionToDelete({ transaction, index });
    setDeleteConfirmOpen(true);
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

  // Handle opening mobile edit dialog
  const handleOpenMobileEdit = (transaction: Transaction, index: number) => {
    const transactionId = getTransactionId(transaction);
    setMobileEditTransaction({
      transaction,
      index,
      identifier: transactionId
    });
    
    // Set the editing row state with the same values
    const dateString = transaction.date instanceof Date 
      ? transaction.date.toISOString().split('T')[0]
      : (typeof transaction.date === 'string' 
        ? new Date(transaction.date).toISOString().split('T')[0]
        : '');
    
    setEditingRow({
      index: findGlobalIndex(transaction),
      identifier: transactionId,
      amount: Math.abs(transaction.amount).toString(),
      date: dateString,
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
        date: new Date(editingRow.date),
        amount: parseFloat(editingRow.amount) * (category === 'Income' ? 1 : -1)
      };
      
      onUpdateTransaction(mobileEditTransaction.index, updatedTransaction);
      handleCloseMobileEdit();
    }
  };

  return (
    <>
      <Box 
        sx={{ mt: 3, mb: 3 }}
        onDragOver={(e) => onDragOver(e, category)}
        onDrop={(e) => onDrop(e, category)}
      >
        <Paper sx={{ 
          overflow: 'hidden', 
          boxShadow: 2,
          borderRadius: 2,
          ...getBackgroundStyles()
        }}>
          <Box sx={{ 
            p: 2, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            color: isDark ? '#fff' : 'inherit'
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                fontWeight: 'bold',
                color: isDark ? '#fff' : 'inherit',
                fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                letterSpacing: '0.01em',
              }}
            >
              {category} Expenses
              <Typography 
                variant="body2" 
                component="span" 
                sx={{ 
                  ml: 1,
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
                }}
              >
                (Total: {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(totalAmount)})
              </Typography>
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CategoryColorPicker category={category} />
            </Box>
          </Box>
          
          {/* Render regular table for desktop or optimized cards for mobile */}
          {!isMobile ? (
            // Original desktop table implementation
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow sx={{
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.04)',
                  }}>
                    <TableCell sx={{ 
                      width: '5%', 
                      color: isDark ? '#fff' : 'inherit',
                      padding: '8px 4px 8px 8px',
                    }}></TableCell>
                    <TableCell sx={{ 
                      width: '30%',
                      fontWeight: 700,
                      color: isDark ? '#fff' : 'inherit',
                      fontSize: '1rem',
                      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      letterSpacing: '0.01em',
                      paddingLeft: '8px', // Consistent left padding
                    }}>Description</TableCell>
                    <TableCell align="center" sx={{ 
                      width: '30%',
                      fontWeight: 700,
                      color: isDark ? '#fff' : 'inherit',
                      fontSize: '1rem',
                      padding: '8px 8px',
                      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      letterSpacing: '0.01em',
                      textAlign: 'center',
                    }}>Date</TableCell>
                    <TableCell sx={{ 
                      width: '28%',
                      fontWeight: 700,
                      color: isDark ? '#fff' : 'inherit',
                      fontSize: '1rem',
                      padding: '8px 8px',
                      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      letterSpacing: '0.01em',
                      textAlign: 'right',
                    }}>Amount</TableCell>
                    <TableCell sx={{ 
                      width: '7%',
                      fontWeight: 700,
                      color: editingRow ? (isDark ? '#fff' : 'inherit') : (isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.04)'),
                      fontSize: '1rem',
                      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      letterSpacing: '0.01em',
                      padding: '8px 4px',
                      textAlign: 'center',
                      borderLeft: editingRow ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` : 'none',
                    }}>{editingRow ? 'Actions' : ''}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!isAdding && (!transactions || transactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography variant="body1" color="textSecondary">
                          No transactions yet. Add some using the button below.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {transactions.length === 0 && isAdding ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: isDark ? '#fff' : 'text.secondary' }}>
                        <Typography variant="body2">
                          No {category.toLowerCase()} expenses yet. Add one or drag a transaction here.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction, index) => {
                      // Get a truly unique identifier for this transaction
                      const transactionId = getTransactionId(transaction);
                      
                      // Check if this row is being edited
                      const isEditing = editingRow && editingRow.identifier === transactionId;
                      
                      // Format date string for display
                      const dateString = transaction.date instanceof Date 
                        ? transaction.date.toISOString().split('T')[0]
                        : (typeof transaction.date === 'string' 
                          ? new Date(transaction.date).toISOString().split('T')[0]
                          : '');
                      
                      // Find the global index for drag operations
                      const globalIndex = findGlobalIndex(transaction);
                      
                      return (
                        <TableRow 
                          key={transactionId}
                          onClick={() => {
                            if (!isEditing) {
                              setEditingRow({
                                index: globalIndex,
                                identifier: transactionId,
                                amount: Math.abs(transaction.amount).toString(),
                                date: dateString,
                                description: transaction.description
                              });
                            }
                          }}
                          sx={{
                            cursor: isEditing ? 'default' : 'pointer',
                            backgroundColor: isEditing 
                              ? 'rgba(0, 0, 0, 0.04)' 
                              : (isDark 
                                ? 'rgba(255, 255, 255, 0.08)' 
                                : 'inherit'),
                            '&:hover': {
                              backgroundColor: isEditing 
                                ? 'rgba(0, 0, 0, 0.04)' 
                                : (isDark 
                                  ? 'rgba(255, 255, 255, 0.16)' 
                                  : 'rgba(0, 0, 0, 0.08)'),
                            },
                            color: isDark ? '#fff' : 'inherit',
                          }}
                          draggable={!isEditing}
                          onDragStart={(e) => onDragStart(e, transaction, globalIndex)}
                        >
                          <TableCell sx={{ 
                            padding: '8px 4px 8px 8px',
                          }}>
                            {isEditing ? (
                              null // Empty cell when editing, delete moved to Actions column
                            ) : (
                              <DragIndicatorIcon 
                                fontSize="small" 
                                sx={{ 
                                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'action.disabled',
                                  cursor: 'grab',
                                }} 
                              />
                            )}
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 500,
                            fontSize: '0.95rem',
                          }}>
                            {isEditing ? (
                              <TextField
                                value={editingRow?.description || ''}
                                onChange={(e) => handleEditingChange('description', e.target.value)}
                                variant="standard"
                                size="small"
                                fullWidth
                                sx={{
                                  '& input': {
                                    color: isDark ? '#fff' : 'inherit'
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEdit(transaction);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingRow(null);
                                  }
                                }}
                              />
                            ) : (
                              transaction.description
                            )}
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 500,
                            fontSize: '0.95rem',
                            padding: '8px 8px',
                            textAlign: 'center',
                          }}>
                            {isEditing ? (
                              <TextField
                                type="date"
                                value={editingRow?.date || ''}
                                onChange={(e) => handleEditingChange('date', e.target.value)}
                                variant="standard"
                                size="small"
                                sx={{
                                  width: '140px',
                                  margin: '0 auto',
                                  '& input': {
                                    color: isDark ? '#fff' : 'inherit',
                                    textAlign: 'center',
                                    fontSize: '0.9rem',
                                    padding: '4px 0',
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEdit(transaction);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingRow(null);
                                  }
                                }}
                              />
                            ) : (
                              formatDateForDisplay(transaction.date)
                            )}
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 500,
                            fontSize: '0.95rem',
                            padding: '8px 8px',
                            textAlign: 'right',
                          }}>
                            {isEditing ? (
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <TextField
                                  value={editingRow?.amount || ''}
                                  onChange={(e) => handleEditingChange('amount', e.target.value.replace(/[^0-9.]/g, ''))}
                                  variant="standard"
                                  size="small"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEdit(transaction);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingRow(null);
                                    }
                                  }}
                                  InputProps={{
                                    startAdornment: <span style={{ 
                                      marginRight: 4,
                                      color: isDark ? '#fff' : 'inherit',
                                    }}>$</span>,
                                    sx: {
                                      color: isDark ? '#fff' : 'inherit',
                                      fontSize: '0.95rem',
                                      textAlign: 'right',
                                      '& input': {
                                        textAlign: 'right',
                                        width: `${Math.max(70, (editingRow?.amount?.length || 1) * 8 + 10)}px`,
                                        transition: 'width 0.1s'
                                      }
                                    }
                                  }}
                                />
                              </Box>
                            ) : (
                              <Typography
                                sx={{
                                  color: isDark ? '#fff' : 'inherit',
                                  fontWeight: 500,
                                  fontSize: '0.95rem',
                                  textAlign: 'right',
                                }}
                              >
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                }).format(transaction.amount)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ 
                            padding: '8px 4px',
                            textAlign: 'center',
                            borderLeft: isEditing ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` : 'none',
                          }}>
                            {isEditing && (
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <Tooltip title="Save">
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveEdit(transaction);
                                    }}
                                    sx={{ 
                                      color: '#4caf50',
                                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                      border: '1px solid rgba(0, 0, 0, 0.15)',
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                                      padding: '4px',
                                      '&:hover': {
                                        color: '#2e7d32',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid rgba(76, 175, 80, 0.5)',
                                        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                                      },
                                    }}
                                  >
                                    <SaveIcon 
                                      fontSize="small" 
                                      sx={{ 
                                        fontSize: '1.2rem',
                                        filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
                                      }}
                                    />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel">
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingRow(null);
                                    }}
                                    sx={{ 
                                      color: '#f44336',
                                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                      border: '1px solid rgba(0, 0, 0, 0.15)',
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                                      padding: '4px',
                                      '&:hover': {
                                        color: '#d32f2f',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid rgba(244, 67, 54, 0.5)',
                                        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                                      },
                                    }}
                                  >
                                    <CloseIcon 
                                      fontSize="small" 
                                      sx={{ 
                                        fontSize: '1.2rem',
                                        filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
                                      }}
                                    />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(e, transaction, globalIndex);
                                    }}
                                    sx={{
                                      color: 'rgba(0, 0, 0, 0.6)',
                                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                      border: '1px solid rgba(0, 0, 0, 0.15)',
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                                      padding: '4px',
                                      '&:hover': {
                                        color: '#f44336',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid rgba(244, 67, 54, 0.5)',
                                        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                                      },
                                    }}
                                  >
                                    <DeleteIcon 
                                      fontSize="small" 
                                      sx={{ 
                                        fontSize: '1.2rem',
                                        filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
                                      }}
                                    />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}

                  {/* Add new transaction row */}
                  {isAdding && (
                    <TableRow sx={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    }}>
                      <TableCell></TableCell>
                      <TableCell>
                        <TextField
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder="Description"
                          variant="standard"
                          size="small"
                          fullWidth
                          sx={{
                            '& input': {
                              color: isDark ? '#fff' : 'inherit',
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newDescription && newAmount) {
                              e.preventDefault();
                              handleAddTransaction();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setIsAdding(false);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <TextField
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            variant="standard"
                            size="small"
                            sx={{
                              width: '140px',
                              margin: '0 auto',
                              '& input': {
                                color: isDark ? '#fff' : 'inherit',
                                textAlign: 'center',
                                fontSize: '0.9rem',
                                padding: '4px 0',
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newDescription && newAmount) {
                                e.preventDefault();
                                handleAddTransaction();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setIsAdding(false);
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <TextField
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="0.00"
                            variant="standard"
                            size="small"
                            sx={{
                              '& input': {
                                color: isDark ? '#fff' : 'inherit',
                                textAlign: 'right',
                                width: `${Math.max(70, (newAmount?.length || 1) * 8 + 10)}px`,
                                transition: 'width 0.1s'
                              }
                            }}
                            InputProps={{
                              startAdornment: <span style={{ 
                                marginRight: 4,
                                color: isDark ? '#fff' : 'inherit',
                              }}>$</span>,
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newDescription && newAmount) {
                                e.preventDefault();
                                handleAddTransaction();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setIsAdding(false);
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ 
                        padding: '8px 4px',
                        textAlign: 'center',
                        borderLeft: isAdding ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` : 'none',
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Save">
                            <IconButton 
                              size="small" 
                              onClick={handleAddTransaction}
                              sx={{ 
                                color: '#4caf50',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid rgba(0, 0, 0, 0.15)',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                                padding: '4px',
                                '&:hover': {
                                  color: '#2e7d32',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid rgba(76, 175, 80, 0.5)',
                                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                                },
                              }}
                            >
                              <SaveIcon 
                                fontSize="small" 
                                sx={{ 
                                  fontSize: '1.2rem',
                                  filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
                                }}
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton 
                              size="small" 
                              onClick={() => setIsAdding(false)}
                              sx={{ 
                                color: '#f44336',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid rgba(0, 0, 0, 0.15)',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                                padding: '4px',
                                '&:hover': {
                                  color: '#d32f2f',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid rgba(244, 67, 54, 0.5)',
                                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                                },
                              }}
                            >
                              <CloseIcon 
                                fontSize="small" 
                                sx={{ 
                                  fontSize: '1.2rem',
                                  filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
                                }}
                              />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Add Expense row (when not in adding mode) */}
                  {!isAdding && (
                    <TableRow 
                      sx={{
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'transparent',
                        },
                      }}
                      onClick={() => setIsAdding(true)}
                    >
                      <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDark ? '#fff' : 'primary.main',
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                            borderRadius: '20px',
                            px: 2.5,
                            py: 1,
                            transition: 'all 0.2s ease',
                            border: `1px dashed ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(25, 118, 210, 0.5)'}`,
                            '&:hover': {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(25, 118, 210, 0.15)',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                            },
                          }}
                        >
                          <AddIcon 
                            fontSize="small" 
                            sx={{ 
                              mr: 0.8,
                              animation: transactions.length === 0 ? 'pulse 1.5s infinite' : 'none',
                              '@keyframes pulse': {
                                '0%': { opacity: 0.6 },
                                '50%': { opacity: 1 },
                                '100%': { opacity: 0.6 }
                              }
                            }} 
                          />
                          <Typography 
                            sx={{ 
                              fontWeight: 500,
                              fontSize: '0.9rem',
                              letterSpacing: '0.01em',
                            }}
                          >
                            + Add Expense
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}

                  {transactions.length > 0 && (
                    <TableRow sx={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
                      fontWeight: 'bold',
                    }}>
                      <TableCell></TableCell>
                      <TableCell 
                        sx={{
                          fontWeight: 'bold',
                          color: isDark ? '#fff' : 'inherit',
                          fontSize: '0.95rem',
                          fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        }}
                      >
                        Total {category}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell 
                        sx={{
                          fontWeight: 'bold',
                          color: isDark ? '#fff' : 'inherit',
                          fontSize: '0.95rem',
                          padding: '8px 8px',
                          textAlign: 'right',
                        }}
                      >
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(totalAmount)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          ) : (
            // New mobile-optimized card layout
            <Box sx={{ mt: 2 }}>
              {/* Empty state - when no transactions and not adding */}
              {transactions.length === 0 && !isAdding && (
                <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: isDark ? '#fff' : 'text.secondary' }}>
                  No {category.toLowerCase()} expenses yet. Add one or drag a transaction here.
                </Typography>
              )}

              {/* Existing transactions as cards */}
              {transactions.length > 0 && !isAdding && (
                <>
                  {transactions.map((transaction, index) => {
                    const transactionId = getTransactionId(transaction);
                    const dateString = formatDateForDisplay(transaction.date);
                    const globalIndex = findGlobalIndex(transaction);
                    
                    return (
                      <Card 
                        key={transactionId}
                        sx={{ 
                          mb: 2, 
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'background.paper',
                          borderRadius: 2,
                        }}
                        onClick={() => handleOpenMobileEdit(transaction, index)}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Grid container spacing={1}>
                            <Grid item xs={8}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 500, color: isDark ? '#fff' : 'text.primary' }}>
                                {transaction.description}
                              </Typography>
                              <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                                {dateString}
                              </Typography>
                            </Grid>
                            <Grid item xs={4} sx={{ textAlign: 'right' }}>
                              <Typography variant="subtitle1" sx={{ 
                                fontWeight: 600, 
                                color: isDark ? '#fff' : 'text.primary' 
                              }}>
                                ${Math.abs(transaction.amount).toFixed(2)}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
              
              {/* Mobile Add Form */}
              {isAdding && (
                <Card sx={{ 
                  mb: 2, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'background.paper',
                  borderRadius: 2,
                }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      New {category} Expense
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <TextField
                        label="Description"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        variant="outlined"
                        fullWidth
                        placeholder="e.g., Groceries"
                      />
                      
                      <TextField
                        label="Date"
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        variant="outlined"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                      
                      <TextField
                        label="Amount"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        variant="outlined"
                        fullWidth
                        placeholder="0.00"
                        InputProps={{
                          startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>
                        }}
                      />
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button 
                          variant="outlined" 
                          onClick={() => setIsAdding(false)}
                          sx={{ flex: 1, borderRadius: 2 }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="contained" 
                          onClick={handleAddTransaction}
                          sx={{ flex: 1, borderRadius: 2 }}
                        >
                          Add
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}
              
              {/* Mobile Add Button - Only show when not adding */}
              {!isAdding && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsAdding(true)}
                    sx={{ 
                      borderRadius: 2,
                      py: 1,
                      px: 3,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'primary.main',
                      color: isDark ? '#fff' : 'white',
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'primary.dark',
                      }
                    }}
                  >
                    Add {category} Expense
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={cancelDelete}
        aria-labelledby="delete-transaction-dialog-title"
        aria-describedby="delete-transaction-dialog-description"
      >
        <DialogTitle id="delete-transaction-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-transaction-dialog-description">
            Are you sure you want to delete the transaction "{transactionToDelete?.transaction.description}"
            for {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(transactionToDelete?.transaction.amount || 0)}?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mobile editing dialog */}
      <Dialog 
        open={mobileEditDialogOpen} 
        onClose={handleCloseMobileEdit}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pb: 1 }}>
          Edit {category} Transaction
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              value={editingRow?.description || ''}
              onChange={(e) => handleEditingChange('description', e.target.value)}
              variant="outlined"
              fullWidth
              inputProps={{ style: { fontSize: '1.1rem' } }}
            />
            
            <TextField
              label="Date"
              type="date"
              value={editingRow?.date || ''}
              onChange={(e) => handleEditingChange('date', e.target.value)}
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Amount"
              value={editingRow?.amount || ''}
              onChange={(e) => handleEditingChange('amount', e.target.value.replace(/[^0-9.]/g, ''))}
              variant="outlined"
              fullWidth
              inputProps={{ style: { fontSize: '1.1rem' } }}
              InputProps={{
                startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseMobileEdit} 
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveMobileEdit} 
            variant="contained"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Save
          </Button>
          <Box sx={{ flex: 1 }} />
          <IconButton 
            onClick={() => {
              if (mobileEditTransaction) {
                setTransactionToDelete({
                  transaction: mobileEditTransaction.transaction,
                  index: mobileEditTransaction.index
                });
                setDeleteConfirmOpen(true);
                handleCloseMobileEdit();
              }
            }}
            color="error"
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </DialogActions>
      </Dialog>
    </>
  );
} 