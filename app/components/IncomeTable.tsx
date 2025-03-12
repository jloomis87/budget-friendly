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
import { useTableColors } from '../hooks/useTableColors';
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

  const [tableColors] = useTableColors();

  // Initialize form errors state property if it doesn't already exist
  const [formErrors, setFormErrors] = useState<{
    description?: string;
    amount?: string;
  }>({});

  // Filter only income transactions and sort by date (newest first)
  const incomeTransactions = transactions
    .filter(transaction => transaction.category === 'Income')
    .sort((a, b) => {
      // Sort by amount (largest first)
      return b.amount - a.amount;
    });

  // Helper for handling dates that can be either Date objects or numbers
  const formatDateIfNeeded = (date: Date | number | string): string | Date => {
    if (typeof date === 'number') {
      // Convert number to string for display
      return date.toString();
    }
    return date;
  };

  // Helper to format date for display
  const formatDateForDisplay = (date: Date | string | number): string => {
    const formattedDate = formatDateIfNeeded(date);
    if (formattedDate instanceof Date) {
      return formattedDate.toLocaleDateString();
    } else if (typeof formattedDate === 'string') {
      try {
        return new Date(formattedDate).toLocaleDateString();
      } catch (e) {
        return formattedDate;
      }
    }
    return String(formattedDate);
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

  // Find the global index of a transaction in the full transactions array
  const findGlobalIndex = (transaction: Transaction): number => {
    return transactions.findIndex(t => {
      const dateMatch = getDateString(t.date) === getDateString(transaction.date);
      return dateMatch && 
        t.description === transaction.description && 
        t.amount === transaction.amount &&
        t.category === transaction.category;
    });
  };

  // Helper to get date string for comparison 
  const getDateString = (date: Date | string | number): string => {
    const formattedDate = formatDateIfNeeded(date);
    if (formattedDate instanceof Date) {
      return formattedDate.toISOString();
    } else if (typeof formattedDate === 'string') {
      // Try to convert string to date and then to ISO string
      try {
        return new Date(formattedDate).toISOString();
      } catch (e) {
        return formattedDate;
      }
    }
    // Fallback
    return String(formattedDate);
  };

  // Create a unique identifier for a transaction
  const getTransactionId = (transaction: Transaction) => {
    return `${transaction.date instanceof Date ? transaction.date.toISOString() : String(transaction.date)}-${transaction.description}-${transaction.amount}-${transaction.category}`;
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

  // Get theme for responsive design
  const theme = useTheme();
  // Use a direct media query for 1500px breakpoint
  const isDesktop = useMediaQuery('(min-width:1500px)');
  const isMobile = !isDesktop;
  
  // Add debug logging
  useEffect(() => {
    console.log('IncomeTable - Screen size state:', {
      isMobile,
      isDesktop,
      windowWidth: window.innerWidth
    });
  }, [isMobile, isDesktop]);

  // Mobile edit dialog state
  const [mobileEditDialogOpen, setMobileEditDialogOpen] = useState(false);
  const [mobileEditTransaction, setMobileEditTransaction] = useState<{
    transaction: Transaction;
    index: number;
    identifier: string;
  } | null>(null);
  
  // Mobile add dialog state
  const [mobileAddDialogOpen, setMobileAddDialogOpen] = useState(false);

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
        amount: parseFloat(editingRow.amount)
      };
      
      onUpdateTransaction(mobileEditTransaction.index, updatedTransaction);
      handleCloseMobileEdit();
    }
  };

  // Handle opening mobile add dialog
  const handleOpenMobileAdd = () => {
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setFormErrors({});
    setMobileAddDialogOpen(true);
  };
  
  // Handle closing mobile add dialog
  const handleCloseMobileAdd = () => {
    setMobileAddDialogOpen(false);
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setFormErrors({});
  };
  
  // Handle adding income from mobile dialog
  const handleAddIncomeMobile = () => {
    // Reset form errors
    const errors: {
      description?: string;
      amount?: string;
    } = {};
    
    // Validate inputs
    if (!newDescription.trim()) {
      errors.description = 'Description is required';
    }
    
    const amountValue = parseFloat(newAmount);
    if (isNaN(amountValue) || amountValue <= 0) {
      errors.amount = 'Please enter a valid amount';
    }
    
    // If there are errors, update state and return
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Create new transaction
    const newTransaction: Transaction = {
      description: newDescription.trim(),
      amount: Math.abs(amountValue), // Positive for income
      date: new Date(newDate),
      category: 'Income'
    };
    
    // Add transaction
    onAddTransaction(newTransaction);
    
    // Close dialog and reset form
    handleCloseMobileAdd();
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
                          variant="outlined"
                        fullWidth
                          inputProps={{ style: { fontSize: '1.1rem' } }}
                        InputProps={{
                            startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>
                          }}
                          sx={{ 
                            "& .MuiOutlinedInput-root": { 
                              backgroundColor: 'white' 
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: 'rgba(0, 0, 0, 0.23)'
                            },
                            "& .MuiInputLabel-outlined": {
                              color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                              fontWeight: 500,
                              backgroundColor: 'transparent',
                              '&.Mui-focused': {
                                color: isDark ? '#fff' : 'primary.main',
                              }
                            },
                            "& .MuiInputLabel-shrink": {
                              bgcolor: tableColors['Income'],
                              padding: '0 5px',
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
              color: isDark ? '#fff' : 'inherit',
              pb: 2,
              mb: 1 // Added 5px margin below the border
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
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
                            variant="outlined"
                            fullWidth
                            inputProps={{ style: { fontSize: '1.1rem' } }}
                            InputLabelProps={{
                              shrink: true,
                              sx: {
                                position: 'relative',
                                transform: 'none',
                                marginBottom: '8px', 
                                color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                                fontWeight: 500,
                                fontSize: '0.9rem',
                                '&.Mui-focused': {
                                  color: isDark ? '#fff' : 'primary.main',
                                }
                              }
                            }}
                            sx={{ 
                              "& .MuiOutlinedInput-root": { 
                                backgroundColor: 'white',
                                borderRadius: '4px',
                                "&.Mui-focused": {
                                  "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: 'primary.main',
                                    borderWidth: 2,
                                  }
                                }
                              },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: 'rgba(0, 0, 0, 0.23)'
                              },
                              "& .MuiFormLabel-root": {
                                position: 'relative',
                                transform: 'none',
                                marginBottom: '8px',
                              },
                              "& .MuiInputLabel-animated": {
                                transition: 'none',
                              },
                              "& .MuiFormLabel-filled + .MuiInputBase-root": {
                                marginTop: '0',
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
                            variant="outlined"
                            fullWidth
                            InputProps={{
                              notched: false,
                            }}
                            InputLabelProps={{
                              shrink: true,
                              sx: {
                                position: 'relative',
                                transform: 'none',
                                marginBottom: '8px', 
                                color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                                fontWeight: 500,
                                fontSize: '0.9rem',
                                '&.Mui-focused': {
                                  color: isDark ? '#fff' : 'primary.main',
                                }
                              }
                            }}
                            sx={{ 
                              "& .MuiOutlinedInput-root": { 
                                backgroundColor: 'white',
                                borderRadius: '4px',
                                "&.Mui-focused": {
                                  "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: 'primary.main',
                                    borderWidth: 2,
                                  }
                                }
                              },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: 'rgba(0, 0, 0, 0.23)'
                              },
                              "& .MuiFormLabel-root": {
                                position: 'relative',
                                transform: 'none',
                                marginBottom: '8px',
                              },
                              "& .MuiInputLabel-animated": {
                                transition: 'none',
                              },
                              "& .MuiFormLabel-filled + .MuiInputBase-root": {
                                marginTop: '0',
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
                              variant="outlined"
                              fullWidth
                              inputProps={{ style: { fontSize: '1.1rem' } }}
                              InputProps={{
                                startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                                notched: false,
                              }}
                              InputLabelProps={{
                                shrink: true,
                                sx: {
                                  position: 'relative',
                                  transform: 'none',
                                  marginBottom: '8px', 
                                  color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                                  fontWeight: 500,
                                  fontSize: '0.9rem',
                                  '&.Mui-focused': {
                                    color: isDark ? '#fff' : 'primary.main',
                                  }
                                }
                              }}
                              sx={{ 
                                "& .MuiOutlinedInput-root": { 
                                  backgroundColor: 'white',
                                  borderRadius: '4px',
                                  "&.Mui-focused": {
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: 'primary.main',
                                      borderWidth: 2,
                                    }
                                  }
                                },
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: 'rgba(0, 0, 0, 0.23)'
                                },
                                "& .MuiFormLabel-root": {
                                  position: 'relative',
                                  transform: 'none',
                                  marginBottom: '8px',
                                },
                                "& .MuiInputLabel-animated": {
                                  transition: 'none',
                                },
                                "& .MuiFormLabel-filled + .MuiInputBase-root": {
                                  marginTop: '0',
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
                        variant="outlined"
                        fullWidth
                        inputProps={{ style: { fontSize: '1.1rem' } }}
                        InputLabelProps={{
                          shrink: true,
                          sx: {
                            position: 'relative',
                            transform: 'none',
                            marginBottom: '8px', 
                            color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            '&.Mui-focused': {
                              color: isDark ? '#fff' : 'primary.main',
                            }
                          }
                        }}
                        sx={{ 
                          "& .MuiOutlinedInput-root": { 
                            backgroundColor: 'white' 
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: 'rgba(0, 0, 0, 0.23)'
                          },
                          "& .MuiInputLabel-outlined": {
                            color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                            fontWeight: 500,
                            backgroundColor: 'transparent',
                            '&.Mui-focused': {
                              color: isDark ? '#fff' : 'primary.main',
                            }
                          },
                          "& .MuiInputLabel-shrink": {
                            bgcolor: tableColors['Income'],
                            padding: '0 5px',
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
                          variant="outlined"
                          fullWidth
                          InputProps={{
                            notched: false,
                          }}
                          InputLabelProps={{
                            shrink: true,
                            sx: {
                              position: 'relative',
                              transform: 'none',
                              marginBottom: '8px', 
                              color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                              fontWeight: 500,
                              fontSize: '0.9rem',
                              '&.Mui-focused': {
                                color: isDark ? '#fff' : 'primary.main',
                              }
                            }
                          }}
                          sx={{ 
                            "& .MuiOutlinedInput-root": { 
                              backgroundColor: 'white',
                              borderRadius: '4px',
                              "&.Mui-focused": {
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: 'primary.main',
                                  borderWidth: 2,
                                }
                              }
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: 'rgba(0, 0, 0, 0.23)'
                            },
                            "& .MuiFormLabel-root": {
                              position: 'relative',
                              transform: 'none',
                              marginBottom: '8px',
                            },
                            "& .MuiInputLabel-animated": {
                              transition: 'none',
                            },
                            "& .MuiFormLabel-filled + .MuiInputBase-root": {
                              marginTop: '0',
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
                          variant="outlined"
                        fullWidth
                          inputProps={{ style: { fontSize: '1.1rem' } }}
                        InputProps={{
                            startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>
                          }}
                          sx={{ 
                            "& .MuiOutlinedInput-root": { 
                              backgroundColor: 'white' 
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: 'rgba(0, 0, 0, 0.23)'
                            },
                            "& .MuiInputLabel-outlined": {
                              color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                              fontWeight: 500,
                              backgroundColor: 'transparent',
                              '&.Mui-focused': {
                                color: isDark ? '#fff' : 'primary.main',
                              }
                            },
                            "& .MuiInputLabel-shrink": {
                              bgcolor: tableColors['Income'],
                              padding: '0 5px',
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
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
              pb: 2,
              mb: 1 // Added 5px margin below the border
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 'bold',
                  color: isDark ? '#fff' : 'inherit',
                  fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  letterSpacing: '0.01em',
                }}>
                  Income
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
                        },
                        mx: '5px', // 5px margin on left and right sides
                        mb: '5px', // Added 5px margin on bottom for spacing between rows
                        position: 'relative', // Add position relative for absolute positioning of the click text
                        borderRadius: 2, // Add border radius
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Add box shadow
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
                            color: isDark ? '#fff' : 'text.primary' // Change from green to black/white
                          }}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      {/* Click to edit text - absolute positioned to center without adding height */}
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          position: 'absolute',
                          bottom: '4px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                          fontSize: '0.7rem',
                          width: 'auto',
                          textAlign: 'center',
                          pointerEvents: 'none' // Prevents the text from interfering with clicks
                        }}
                      >
                        (click to edit)
                      </Typography>
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
                  onClick={handleOpenMobileAdd}
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
                    inputProps={{ style: { fontSize: '1.1rem' } }}
                    InputProps={{
                      notched: false,
                    }}
                    InputLabelProps={{
                      shrink: true,
                      sx: {
                        position: 'relative',
                        transform: 'none',
                        marginBottom: '8px', 
                        color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        '&.Mui-focused': {
                          color: isDark ? '#fff' : 'primary.main',
                        }
                      }
                    }}
                    sx={{ 
                      "& .MuiOutlinedInput-root": { 
                        backgroundColor: 'white' 
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: 'rgba(0, 0, 0, 0.23)'
                      },
                      "& .MuiFormLabel-root": {
                        position: 'relative',
                        transform: 'none',
                        marginBottom: '8px',
                      },
                      "& .MuiInputLabel-animated": {
                        transition: 'none',
                      },
                      "& .MuiFormLabel-filled + .MuiInputBase-root": {
                        marginTop: '0',
                      },
                      "& .MuiFormHelperText-root": {
                        marginTop: 1,
                        color: formErrors.description ? '#f44336' : 'rgba(0, 0, 0, 0.6)',
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
                    InputProps={{
                      notched: false,
                    }}
                    InputLabelProps={{
                      shrink: true,
                      sx: {
                        position: 'relative',
                        transform: 'none',
                        marginBottom: '8px', 
                        color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        '&.Mui-focused': {
                          color: isDark ? '#fff' : 'primary.main',
                        }
                      }
                    }}
                    sx={{ 
                      "& .MuiOutlinedInput-root": { 
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        "&.Mui-focused": {
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: 'primary.main',
                            borderWidth: 2,
                          }
                        }
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: 'rgba(0, 0, 0, 0.23)'
                      },
                      "& .MuiFormLabel-root": {
                        position: 'relative',
                        transform: 'none',
                        marginBottom: '8px',
                      },
                      "& .MuiInputLabel-animated": {
                        transition: 'none',
                      },
                      "& .MuiFormLabel-filled + .MuiInputBase-root": {
                        marginTop: '0',
                      },
                      "& .MuiFormHelperText-root": {
                        marginTop: 1,
                        color: formErrors.amount ? '#f44336' : 'rgba(0, 0, 0, 0.6)',
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
        PaperProps={{
          style: {
            backgroundColor: tableColors['Income'],
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          color: isDark ? '#fff' : 'inherit'
        }}>
          Edit Income Source
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              value={editingRow?.description || ''}
              onChange={(e) => handleEditingChange('description', e.target.value)}
              error={!!formErrors.description}
              helperText={formErrors.description}
              variant="outlined"
              fullWidth
              inputProps={{ style: { fontSize: '1.1rem' } }}
              InputLabelProps={{
                shrink: true,
                sx: {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px', 
                  color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  '&.Mui-focused': {
                    color: isDark ? '#fff' : 'primary.main',
                  }
                }
              }}
              InputProps={{
                notched: false,
              }}
              sx={{ 
                "& .MuiOutlinedInput-root": { 
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: 'primary.main',
                      borderWidth: 2,
                    }
                  }
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: 'rgba(0, 0, 0, 0.23)'
                },
                "& .MuiFormLabel-root": {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px',
                },
                "& .MuiInputLabel-animated": {
                  transition: 'none',
                },
                "& .MuiFormLabel-filled + .MuiInputBase-root": {
                  marginTop: '0',
                },
                "& .MuiFormHelperText-root": {
                  marginTop: 1,
                  color: 'rgba(0, 0, 0, 0.6)',
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
              inputProps={{ style: { fontSize: '1.1rem' } }}
              InputLabelProps={{
                shrink: true,
                sx: {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px', 
                  color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  '&.Mui-focused': {
                    color: isDark ? '#fff' : 'primary.main',
                  }
                }
              }}
              InputProps={{
                notched: false,
              }}
              sx={{ 
                "& .MuiOutlinedInput-root": { 
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: 'primary.main',
                      borderWidth: 2,
                    }
                  }
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: 'rgba(0, 0, 0, 0.23)'
                },
                "& .MuiFormLabel-root": {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px',
                },
                "& .MuiInputLabel-animated": {
                  transition: 'none',
                },
                "& .MuiFormLabel-filled + .MuiInputBase-root": {
                  marginTop: '0',
                },
                "& .MuiFormHelperText-root": {
                  marginTop: 1,
                  color: 'rgba(0, 0, 0, 0.6)',
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
                startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                notched: false,
              }}
              InputLabelProps={{
                shrink: true,
                sx: {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px', 
                  color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  '&.Mui-focused': {
                    color: isDark ? '#fff' : 'primary.main',
                  }
                }
              }}
              sx={{ 
                "& .MuiOutlinedInput-root": { 
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: 'primary.main',
                      borderWidth: 2,
                    }
                  }
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: 'rgba(0, 0, 0, 0.23)'
                },
                "& .MuiFormLabel-root": {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px',
                },
                "& .MuiInputLabel-animated": {
                  transition: 'none',
                },
                "& .MuiFormLabel-filled + .MuiInputBase-root": {
                  marginTop: '0',
                },
                "& .MuiFormHelperText-root": {
                  marginTop: 1,
                  color: 'rgba(0, 0, 0, 0.6)',
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseMobileEdit} 
            variant="outlined"
            sx={{ 
              borderRadius: 2, 
              px: 3,
              color: isDark ? '#fff' : undefined,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
            }}
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
            sx={{
              backgroundColor: 'white',
            }}
          >
            <DeleteIcon />
          </IconButton>
        </DialogActions>
      </Dialog>
      
      {/* Mobile add dialog */}
      <Dialog 
        open={mobileAddDialogOpen} 
        onClose={handleCloseMobileAdd}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          style: {
            backgroundColor: tableColors['Income'],
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          color: isDark ? '#fff' : 'inherit'
        }}>
          New Income Source
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
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
              inputProps={{ style: { fontSize: '1.1rem' } }}
              InputProps={{
                notched: false,
              }}
              InputLabelProps={{
                shrink: true,
                sx: {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px', 
                  color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  '&.Mui-focused': {
                    color: isDark ? '#fff' : 'primary.main',
                  }
                }
              }}
              sx={{ 
                "& .MuiOutlinedInput-root": { 
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: 'primary.main',
                      borderWidth: 2,
                    }
                  }
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: 'rgba(0, 0, 0, 0.23)'
                },
                "& .MuiFormLabel-root": {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px',
                },
                "& .MuiInputLabel-animated": {
                  transition: 'none',
                },
                "& .MuiFormLabel-filled + .MuiInputBase-root": {
                  marginTop: '0',
                },
                "& .MuiFormHelperText-root": {
                  marginTop: 1,
                  color: formErrors.description ? '#f44336' : 'rgba(0, 0, 0, 0.6)',
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
              InputProps={{
                notched: false,
              }}
              InputLabelProps={{
                shrink: true,
                sx: {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px', 
                  color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  '&.Mui-focused': {
                    color: isDark ? '#fff' : 'primary.main',
                  }
                }
              }}
              sx={{ 
                "& .MuiOutlinedInput-root": { 
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: 'primary.main',
                      borderWidth: 2,
                    }
                  }
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: 'rgba(0, 0, 0, 0.23)'
                },
                "& .MuiFormLabel-root": {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px',
                },
                "& .MuiInputLabel-animated": {
                  transition: 'none',
                },
                "& .MuiFormLabel-filled + .MuiInputBase-root": {
                  marginTop: '0',
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
                if (formErrors.amount && value && !isNaN(parseFloat(value))) {
                  setFormErrors({...formErrors, amount: undefined});
                }
              }}
              error={!!formErrors.amount}
              helperText={formErrors.amount}
              variant="outlined"
              fullWidth
              placeholder="0.00"
              inputProps={{ style: { fontSize: '1.1rem' } }}
              InputProps={{
                startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                notched: false,
              }}
              InputLabelProps={{
                shrink: true,
                sx: {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px', 
                  color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  '&.Mui-focused': {
                    color: isDark ? '#fff' : 'primary.main',
                  }
                }
              }}
              sx={{ 
                "& .MuiOutlinedInput-root": { 
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: 'primary.main',
                      borderWidth: 2,
                    }
                  }
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: 'rgba(0, 0, 0, 0.23)'
                },
                "& .MuiFormLabel-root": {
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px',
                },
                "& .MuiInputLabel-animated": {
                  transition: 'none',
                },
                "& .MuiFormLabel-filled + .MuiInputBase-root": {
                  marginTop: '0',
                },
                "& .MuiFormHelperText-root": {
                  marginTop: 1,
                  color: formErrors.amount ? '#f44336' : 'rgba(0, 0, 0, 0.6)',
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseMobileAdd} 
            variant="outlined"
            sx={{ 
              borderRadius: 2, 
              px: 3,
              color: isDark ? '#fff' : undefined,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddIncomeMobile} 
            variant="contained"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Add
          </Button>
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