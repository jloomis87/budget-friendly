import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider
} from '@mui/material';
import { DeleteIcon, SaveIcon, CloseIcon, AddIcon, EditOutlinedIcon, CheckCircleOutlineIcon, CancelOutlinedIcon } from '../utils/materialIcons';
import type { Transaction } from '../services/fileParser';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from '../hooks/useLocalStorage';
import { isColorDark } from '../utils/colorUtils';
import { CategoryColorPicker } from './CategoryColorPicker';

interface IncomeTableProps {
  transactions: Transaction[];
  onUpdateTransaction: (index: number, updatedTransaction: Partial<Transaction>) => void;
  onDeleteTransaction: (index: number) => void;
  onAddTransaction: (transaction: Transaction) => void;
}

interface EditingRow {
  index: number;
  identifier: string;
  amount: string;
  date: string;
  description: string;
}

export function IncomeTable({
  transactions,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddTransaction
}: IncomeTableProps) {
  // State for tracking if we're showing delete buttons (hover effect)
  // const [showDeleteButtons, setShowDeleteButtons] = useState(false);
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<{ transaction: Transaction, index: number } | null>(null);

  // State for new transaction form
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAdding, setIsAdding] = useState(false);

  const [tableColors] = useLocalStorage<Record<string, string>>(
    STORAGE_KEYS.TABLE_COLORS,
    LEGACY_STORAGE_KEYS.TABLE_COLORS,
    {
      'Essentials': '#f5f5f5',
      'Wants': '#f5f5f5',
      'Savings': '#f5f5f5',
      'Income': '#f5f5f5'
    }
  );

  // Initialize form errors state property if it doesn't already exist
  const [formErrors, setFormErrors] = useState<{
    description?: string;
    amount?: string;
  }>({});

  // Filter only income transactions and sort by date (newest first)
  const incomeTransactions = transactions
    .filter(transaction => transaction.category === 'Income')
    .sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

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

  // Create a unique identifier for a transaction
  const getTransactionId = (transaction: Transaction) => {
    return `${transaction.date instanceof Date ? transaction.date.toISOString() : String(transaction.date)}-${transaction.description}-${transaction.amount}-${transaction.category}`;
  };

  // Handle editing row changes
  const handleEditingChange = (field: keyof EditingRow, value: string) => {
    if (editingRow) {
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
        // Income amounts are always positive
        updates.amount = Math.abs(parsedAmount);
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
      
      // Apply all updates
      onUpdateTransaction(editingRow.index, updates);
      setEditingRow(null);
    }
  };

  // Calculate total income
  const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  // Handle delete transaction click
  const handleDeleteClick = (e: React.MouseEvent, transaction: Transaction) => {
    e.stopPropagation();
    
    // Find the global index of the transaction in the entire transactions array
    const index = transactions.findIndex(t => 
      t.description === transaction.description && 
      t.amount === transaction.amount && 
      t.category === transaction.category &&
      (t.date instanceof Date && transaction.date instanceof Date 
        ? t.date.getTime() === transaction.date.getTime()
        : String(t.date) === String(transaction.date))
    );
    
    if (index !== -1) {
      setTransactionToDelete({ transaction, index });
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

  // Handle adding new income transaction
  const handleAddTransaction = () => {
    // Validate inputs
    const errors: {description?: string; amount?: string} = {};
    let isValid = true;
    
    if (!newDescription.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    }
    
    const parsedAmount = parseFloat(newAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Please enter a valid amount';
      isValid = false;
    }
    
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    
    // Clear form errors
    setFormErrors({});
    
    // Create transaction object - Income transactions are positive
    const newIncomeTransaction: Transaction = {
      description: newDescription.trim(),
      amount: parsedAmount, // Income is positive
      date: new Date(newDate),
      category: 'Income'
    };
    
    // Add transaction
    onAddTransaction(newIncomeTransaction);
    console.log('Adding income transaction:', newIncomeTransaction);
    
    // Reset form
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setIsAdding(false);
  };

  // Check if the table has a custom color and if it's dark
  const hasCustomColor = tableColors['Income'] !== '#f5f5f5';
  const isDark = tableColors['Income'] && isColorDark(tableColors['Income']);

  // Get background color styles
  const getBackgroundStyles = () => {
    return hasCustomColor ? { backgroundColor: tableColors['Income'] } : {};
  };

  // Check if any row is currently being edited - used to determine if we need the Actions column
  const isAnyRowEditing = editingRow !== null;

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
      index,
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
        amount: parseFloat(editingRow.amount)
      };
      
      onUpdateTransaction(mobileEditTransaction.index, updatedTransaction);
      handleCloseMobileEdit();
    }
  };
  
  // Handle adding income on mobile
  const handleAddIncomeMobile = () => {
    // Use the main add transaction function for consistency
    handleAddTransaction();
  };

  if (incomeTransactions.length === 0 && !isAdding) {
    return (
      <Box sx={{ mb: 3 }}>
        <Paper sx={{ 
          overflow: 'hidden', 
          borderRadius: 2, 
          boxShadow: 2,
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
              Income Summary
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CategoryColorPicker category="Income" />
            </Box>
          </Box>
          
          {isAdding && (
            <Box>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow sx={{
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.04)',
                  }}>
                    <TableCell sx={{ 
                      width: '28px', 
                      color: isDark ? '#fff' : 'inherit',
                      padding: '8px 4px 8px 8px',
                    }}></TableCell>
                    <TableCell sx={{ 
                      width: '45%',
                      fontWeight: 700,
                      color: isDark ? '#fff' : 'inherit',
                      fontSize: '1rem',
                      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      letterSpacing: '0.01em',
                    }}>Income Source</TableCell>
                    <TableCell sx={{ 
                      width: '120px',
                      fontWeight: 700,
                      color: isDark ? '#fff' : 'inherit',
                      fontSize: '1rem',
                      padding: '8px 8px',
                      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      letterSpacing: '0.01em',
                      textAlign: 'right',
                    }}>Amount</TableCell>
                    <TableCell sx={{ 
                      width: '30px',
                      fontWeight: 700,
                      color: isDark ? '#fff' : 'inherit',
                      fontSize: '1rem',
                      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      letterSpacing: '0.01em',
                      padding: '0px 4px',
                      textAlign: 'center',
                    }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  }}>
                    <TableCell></TableCell>
                    <TableCell>
                      <TextField
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Income Source"
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
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          onClick={handleAddTransaction}
                          sx={{ color: isDark ? '#fff' : 'primary.main' }}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => setIsAdding(false)}
                          sx={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
          
          {!isAdding && (
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
                    paddingLeft: '8px',
                  }}>Income Source</TableCell>
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
                          animation: 'pulse 1.5s infinite',
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
                        Add Income
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" component="h2" sx={{ 
        mb: 2, 
        fontWeight: 600,
        color: isDark ? '#fff' : 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        Income Summary
        <Typography 
          component="span" 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600, 
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
            ml: 'auto'
          }}
        >
          {totalIncome > 0 ? (
            <>Total: ${totalIncome.toFixed(2)}</>
          ) : (
            <>No income</>
          )}
        </Typography>
      </Typography>
      
      {/* Render regular table for desktop or optimized cards for mobile */}
      {!isMobile ? (
        // Original desktop table implementation
        <Paper sx={{ 
          overflow: 'hidden',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'background.paper',
          borderRadius: 2,
          ...getBackgroundStyles()
        }}>
          <Box>
            {/* Add header with title and color picker */}
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
                Income
                <Typography 
                  component="span" 
                  variant="subtitle1" 
                  sx={{ 
                    ml: 1,
                    fontWeight: 500, 
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
                  }}
                >
                  (Total: ${totalIncome.toFixed(2)})
                </Typography>
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryColorPicker category="Income" />
              </Box>
            </Box>
            
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
                    paddingLeft: '8px',
                  }}>Income Source</TableCell>
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
                {incomeTransactions.map((transaction) => {
                  // Get a truly unique identifier for this transaction
                  const transactionId = getTransactionId(transaction);
                  
                  // Check if this row is being edited
                  const isEditing = editingRow && editingRow.identifier === transactionId;
                  
                  // Find the global index for edit operations
                  const globalIndex = transactions.findIndex(t => 
                    t.description === transaction.description && 
                    t.amount === transaction.amount && 
                    t.category === transaction.category &&
                    (t.date instanceof Date && transaction.date instanceof Date 
                      ? t.date.getTime() === transaction.date.getTime()
                      : String(t.date) === String(transaction.date))
                  );
                  
                  // Format date string for display and editing
                  const dateString = transaction.date instanceof Date 
                    ? transaction.date.toISOString().split('T')[0]
                    : (typeof transaction.date === 'string' 
                      ? new Date(transaction.date).toISOString().split('T')[0]
                      : '');
                  
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
                      }}
                    >
                      <TableCell sx={{ 
                        color: isDark ? '#fff' : 'inherit',
                        padding: '8px 4px 8px 8px',
                      }}>
                      </TableCell>
                      <TableCell sx={{ 
                        color: isDark ? '#fff' : 'inherit',
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
                                color: isDark ? '#fff' : 'inherit',
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
                        color: isDark ? '#fff' : 'inherit',
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
                        color: isDark ? '#fff' : 'inherit',
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
                                onClick={() => handleSaveEdit(transaction)}
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
                                onClick={() => setEditingRow(null)}
                                sx={{ 
                                  color: '#f44336',
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
                                  handleDeleteClick(e, transaction);
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
                })}

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
                        placeholder="Income Source"
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
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
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
                                color: '#f44336',
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

                {/* Add Income row (when not in adding mode) */}
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
                            animation: 'pulse 1.5s infinite',
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
                          Add Income
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}

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
                    Total Income
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
                    }).format(totalIncome)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Paper>
      ) : (
        // Mobile card implementation
        <Box>
          {/* Single container for the entire income section */}
          <Card sx={{ 
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            ...getBackgroundStyles()
          }}>
            {/* Header */}
            <CardContent sx={{ 
              p: 2, 
              '&:last-child': { pb: 2 },
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 'bold',
                  color: isDark ? '#fff' : 'text.primary',
                  fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  letterSpacing: '0.01em'
                }}>
                  Income
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 600, 
                    color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'text.primary'
                  }}>
                    (Total: ${totalIncome.toFixed(2)})
                  </Typography>
                  <CategoryColorPicker category="Income" />
                </Box>
              </Box>
            </CardContent>
            
            {/* Empty state - No income and not adding */}
            {incomeTransactions.length === 0 && !isAdding && (
              <Box sx={{ 
                p: 3, 
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}>
                <Typography variant="body1" color={isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'}>
                  No income sources yet. Add your first income source below.
                </Typography>
              </Box>
            )}
            
            {/* Income Transaction Items */}
            {incomeTransactions.length > 0 && !isAdding && (
              <>
                {incomeTransactions.map((transaction, index) => {
                  const transactionId = getTransactionId(transaction);
                  const dateString = formatDateForDisplay(transaction.date);
                  
                  return (
                    <Box 
                      key={transactionId}
                      sx={{ 
                        p: 2, 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                        '&:hover': {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
                        }
                      }}
                      onClick={() => handleOpenMobileEdit(transaction, index)}
                    >
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
                            color: '#4caf50' 
                          }}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  );
                })}
              </>
            )}
            
            {/* Add button at the bottom of card */}
            {!isAdding ? (
              <Box sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}>
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
                  ADD INCOME SOURCE
                </Button>
              </Box>
            ) : (
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  New Income Source
                </Typography>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Description"
                    value={newDescription}
                    onChange={(e) => {
                      setNewDescription(e.target.value);
                      // Clear error when user types
                      if (formErrors.description && e.target.value.trim()) {
                        setFormErrors({...formErrors, description: undefined});
                      }
                    }}
                    error={!!formErrors.description}
                    helperText={formErrors.description}
                    variant="outlined"
                    fullWidth
                    placeholder="e.g., Salary, Freelance work"
                    sx={{ 
                      "& .MuiOutlinedInput-root": { 
                        backgroundColor: 'white' 
                      }
                    }}
                  />
                  
                  <TextField
                    label="Date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    variant="outlined"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ 
                      "& .MuiOutlinedInput-root": { 
                        backgroundColor: 'white' 
                      }
                    }}
                  />
                  
                  <TextField
                    label="Amount"
                    value={newAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setNewAmount(value);
                      // Clear error when user types
                      if (formErrors.amount && value) {
                        setFormErrors({...formErrors, amount: undefined});
                      }
                    }}
                    error={!!formErrors.amount}
                    helperText={formErrors.amount}
                    variant="outlined"
                    fullWidth
                    placeholder="0.00"
                    InputProps={{
                      startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>
                    }}
                    sx={{ 
                      "& .MuiOutlinedInput-root": { 
                        backgroundColor: 'white' 
                      }
                    }}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button 
                      variant="outlined" 
                      onClick={() => {
                        setIsAdding(false);
                        setFormErrors({});
                        setNewDescription('');
                        setNewAmount('');
                        setNewDate(new Date().toISOString().split('T')[0]);
                      }}
                      sx={{ flex: 1, borderRadius: 2 }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleAddIncomeMobile}
                      sx={{ flex: 1, borderRadius: 2 }}
                    >
                      Add
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            )}
          </Card>
        </Box>
      )}
      
      {/* Mobile editing dialog */}
      <Dialog 
        open={mobileEditDialogOpen} 
        onClose={handleCloseMobileEdit}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pb: 1 }}>
          Edit Income Source
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
              sx={{ 
                "& .MuiOutlinedInput-root": { 
                  backgroundColor: 'white' 
                }
              }}
            />
            
            <TextField
              label="Date"
              type="date"
              value={editingRow?.date || ''}
              onChange={(e) => handleEditingChange('date', e.target.value)}
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ 
                "& .MuiOutlinedInput-root": { 
                  backgroundColor: 'white' 
                }
              }}
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
              sx={{ 
                "& .MuiOutlinedInput-root": { 
                  backgroundColor: 'white' 
                }
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
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the income "{transactionToDelete?.transaction.description}"
            for {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(transactionToDelete?.transaction.amount || 0)}?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 