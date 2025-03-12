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
  Divider,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { DeleteIcon, SaveIcon, CloseIcon, AddIcon, EditOutlinedIcon, CheckCircleOutlineIcon, CancelOutlinedIcon, DragIndicatorIcon } from '../utils/materialIcons';
import type { Transaction } from '../services/fileParser';
import { useTableColors } from '../hooks/useTableColors';
import { isColorDark } from '../utils/colorUtils';
import { CategoryColorPicker } from './CategoryColorPicker';

interface IncomeTableProps {
  transactions: Transaction[];
  onUpdateTransaction: (index: number, updatedTransaction: Partial<Transaction>) => void;
  onDeleteTransaction: (index: number) => void;
  onAddTransaction: (transaction: Transaction) => void;
  onDragStart?: (e: React.DragEvent, transaction: Transaction, globalIndex: number) => void;
  onDragOver?: (e: React.DragEvent, category: string) => void;
  onDrop?: (e: React.DragEvent, targetCategory: string) => void;
  dragOverCategory?: string | null;
  recentlyDropped?: string | null;
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
  onAddTransaction,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverCategory,
  recentlyDropped
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

  // Background styling based on drag state and custom color
  const getBackgroundStyles = () => {
    if (dragOverCategory === 'Income') {
      return {
        backgroundColor: 'rgba(25, 118, 210, 0.08)', // Light blue when being dragged over
        transition: 'background-color 0.3s ease',
        transform: 'scale(1.01)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      };
    }
    if (recentlyDropped === 'Income') {
      return {
        backgroundColor: 'rgba(76, 175, 80, 0.08)', // Light green when recently received an item
        transition: 'background-color 0.8s ease'
      };
    }
    return tableColors['Income'] && tableColors['Income'] !== '#f5f5f5' 
      ? { backgroundColor: tableColors['Income'] } 
      : {};
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
      const day = parseInt(editingRow.date, 10);
      
      const updatedTransaction: Partial<Transaction> = {
        description: editingRow.description,
        date: day, // Store as day number
        amount: parseFloat(editingRow.amount) // Income is always positive
      };
      
      // Find the global index in the full transactions array
      const globalIndex = findGlobalIndex(mobileEditTransaction.transaction);
      
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

  // Helper function to generate day options (1st, 2nd, 3rd, etc.)
  const generateDayOptions = () => {
    const options = [];
    for (let i = 1; i <= 31; i++) {
      options.push({
        value: i.toString(),
        label: `${i}${getOrdinalSuffix(i)}`
      });
    }
    return options;
  };

  // Helper function to get ordinal suffix (st, nd, rd, th)
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // For Dialog content
  const getTransactionDetails = (transaction: Transaction | null) => {
    if (!transaction) return null;
    
    return (
      <Box sx={{ mt: 2, bgcolor: 'rgba(0,0,0,0.05)', p: 2, borderRadius: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {transaction.description}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          ${Math.abs(transaction.amount).toFixed(2)}
        </Typography>
      </Box>
    );
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
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Button
                onClick={() => {
                  // Use the direct implementation to ensure it works
                  console.log("Add Income button clicked in Getting Started");
                  setNewDescription('');
                  setNewAmount('');
                  setNewDate(new Date().toISOString().split('T')[0]);
                  setFormErrors({});
                  setMobileAddDialogOpen(true);
                }}
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
              </Button>
            </Box>
          )}
        </Paper>
        
        {/* Include Mobile Add Dialog directly in this render path */}
        <Dialog
          open={mobileAddDialogOpen}
          onClose={handleCloseMobileAdd}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
              color: isDark ? '#fff' : 'inherit',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: tableColors['Income'],
            color: isColorDark(tableColors['Income']) ? '#fff' : 'rgba(0, 0, 0, 0.87)',
            fontWeight: 'bold',
            pb: 3
          }}>
            Add Income Source
          </DialogTitle>
          <DialogContent sx={{ pt: 6, mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Description"
                fullWidth
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                error={!!formErrors.description}
                helperText={formErrors.description}
                InputLabelProps={{
                  sx: {
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                  }
                }}
                InputProps={{
                  sx: {
                    color: isDark ? '#fff' : undefined,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : undefined,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                    }
                  }
                }}
              />
              <TextField
                label="Amount"
                fullWidth
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                error={!!formErrors.amount}
                helperText={formErrors.amount}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  sx: {
                    color: isDark ? '#fff' : undefined,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : undefined,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                    }
                  }
                }}
                InputLabelProps={{
                  sx: {
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                  }
                }}
              />
              <TextField
                label="Date"
                type="date"
                fullWidth
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                  }
                }}
                InputProps={{
                  sx: {
                    color: isDark ? '#fff' : undefined,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : undefined,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                    }
                  }
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ 
            p: 3, 
            bgcolor: isDark ? 'rgba(20, 20, 20, 0.9)' : '#f5f5f5',
            borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          }}>
            <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleCloseMobileAdd}
                sx={{ 
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : undefined,
                  '&:hover': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : undefined,
                  }
                }}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddIncomeMobile}
                variant="contained" 
                sx={{ px: 3 }}
                color="primary"
              >
                Add
              </Button>
            </Box>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Paper 
        elevation={1} 
        sx={{ 
          mb: 3, 
          borderRadius: 2,
          overflow: 'hidden',
          ...getBackgroundStyles(),
          transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.3s'
        }}
        className={`drag-target ${dragOverCategory === 'Income' ? 'drag-target-hover' : ''}`}
        onDragOver={(e) => onDragOver && onDragOver(e, 'Income')}
        onDrop={(e) => onDrop && onDrop(e, 'Income')}
        onDragLeave={() => {}}
      >
        <Box sx={{ 
          p: 2, 
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
        </Box>
        
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
            {[...incomeTransactions]
              .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
              .map((transaction, index) => {
              const transactionId = getTransactionId(transaction);
              const dateString = formatDateForDisplay(transaction.date);
              const globalIndex = findGlobalIndex(transaction);
              
              // Create a custom drag handler for the income item
              const handleDragStart = (e: React.DragEvent) => {
                // Create a custom drag image that looks like the card
                const dragPreview = document.createElement('div');
                dragPreview.style.backgroundColor = isDark ? '#333' : '#f5f5f5';
                dragPreview.style.border = '1px solid #ccc';
                dragPreview.style.borderRadius = '4px';
                dragPreview.style.padding = '8px 12px';
                dragPreview.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                dragPreview.style.width = '250px';
                dragPreview.style.display = 'flex';
                dragPreview.style.alignItems = 'center';
                dragPreview.style.color = isDark ? '#fff' : '#333';
                
                // Add an icon
                const icon = document.createElement('span');
                icon.innerHTML = '↕️';
                icon.style.marginRight = '8px';
                dragPreview.appendChild(icon);
                
                // Add description
                const text = document.createElement('div');
                text.textContent = transaction.description;
                text.style.fontWeight = '500';
                text.style.flex = '1';
                dragPreview.appendChild(text);
                
                // Add amount
                const amount = document.createElement('div');
                amount.textContent = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(transaction.amount);
                amount.style.marginLeft = '8px';
                dragPreview.appendChild(amount);
                
                // Add to DOM temporarily
                document.body.appendChild(dragPreview);
                
                // Set the drag image
                e.dataTransfer.setDragImage(dragPreview, 125, 20);
                
                // Set other drag properties
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', transaction.description);
                
                // Call the parent handler
                if (onDragStart) {
                  onDragStart(e, transaction, globalIndex);
                }
                
                // Remove the element after a short delay
                setTimeout(() => {
                  document.body.removeChild(dragPreview);
                }, 0);
              };
              
              return (
                <Box 
                  key={transactionId}
                  onClick={() => handleOpenMobileEdit(transaction, index)}
                  draggable={true}
                  onDragStart={handleDragStart}
                  sx={{
                    mx: '5px',
                    mb: '5px',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    cursor: 'pointer',
                    borderRadius: 2,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                      boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  {/* Remove the drag indicator */}
                  
                  {/* Description and Amount on top line */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography
                      component="div"
                      sx={{
                        fontWeight: 500,
                        fontSize: '1rem',
                        color: isDark ? '#fff' : 'text.primary',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        maxWidth: '70%'
                      }}
                    >
                      {transaction.description}
                    </Typography>
                    <Typography
                      component="div"
                      sx={{
                        fontSize: '1.1rem',
                        color: isDark ? '#fff' : 'text.primary',
                        ml: 1
                      }}
                    >
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </Typography>
                  </Box>
                  
                  {/* Date on bottom line */}
                  <Typography
                    component="div"
                    sx={{
                      fontSize: '0.85rem',
                      color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'text.secondary',
                    }}
                  >
                    {dateString}
                  </Typography>

                  {/* Centered "click to edit" text */}
                  <Typography
                    sx={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                      fontSize: '0.7rem',
                      pointerEvents: 'none'
                    }}
                  >
                    (click to edit or hold and drag)
                  </Typography>
                </Box>
              );
            })}
          </>
        )}

        {/* Add Button */}
        {!isAdding && (
          <Box sx={{ 
            p: 2, 
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}>
            <Button
              variant="contained"
              onClick={handleOpenMobileAdd}
              sx={{
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                borderRadius: 8,
                py: 1,
                px: 3,
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                }
              }}
            >
              <AddIcon sx={{ mr: 1 }} /> ADD INCOME SOURCE
            </Button>
          </Box>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={cancelDelete}
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
            color: isDark ? '#fff' : 'inherit',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 'bold' }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography>
            Are you sure you want to delete this income source?
          </Typography>
          {transactionToDelete && getTransactionDetails(transactionToDelete.transaction)}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={cancelDelete} 
            color="primary" 
            sx={{ 
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            sx={{ 
              bgcolor: 'error.main', 
              color: '#fff',
              '&:hover': {
                bgcolor: 'error.dark',
              } 
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mobile Edit Dialog */}
      <Dialog
        open={mobileEditDialogOpen}
        onClose={handleCloseMobileEdit}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
            color: isDark ? '#fff' : 'inherit',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: tableColors['Income'],
          color: isColorDark(tableColors['Income']) ? '#fff' : 'rgba(0, 0, 0, 0.87)',
          fontWeight: 'bold',
          pb: 3
        }}>
          Edit Income Source
        </DialogTitle>
        <DialogContent sx={{ pt: 6, mt: 2 }}>
          {editingRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Income Source"
                value={editingRow.description}
                onChange={(e) => handleEditingChange('description', e.target.value)}
                fullWidth
                variant="outlined"
                InputLabelProps={{
                  sx: {
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                  }
                }}
                InputProps={{
                  sx: {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : undefined,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
                    }
                  }
                }}
              />
              
              <TextField
                label="Amount"
                value={editingRow.amount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d.]/g, '');
                  handleEditingChange('amount', value);
                }}
                fullWidth
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  sx: {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : undefined,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
                    }
                  }
                }}
                InputLabelProps={{
                  sx: {
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                  }
                }}
              />
              
              <FormControl fullWidth variant="outlined">
                <InputLabel id="date-label" sx={{ 
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                }}>Day of Month</InputLabel>
                <Select
                  labelId="date-label"
                  value={editingRow.date}
                  onChange={(e) => handleEditingChange('date', e.target.value)}
                  label="Day of Month"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'background.paper',
                        color: isDark ? '#fff' : 'inherit',
                        '& .MuiMenuItem-root': {
                          color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
                        },
                        '& .MuiMenuItem-root:hover': {
                          bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                        }
                      }
                    }
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#fff',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : undefined,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
                    }
                  }}
                >
                  {generateDayOptions().map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            onClick={() => {
              if (mobileEditTransaction) {
                setTransactionToDelete(mobileEditTransaction);
                setDeleteConfirmOpen(true);
                handleCloseMobileEdit();
              }
            }} 
            color="error"
            sx={{ 
              bgcolor: 'rgba(211, 47, 47, 0.1)',
              color: 'error.main',
              '&:hover': {
                bgcolor: 'rgba(211, 47, 47, 0.2)',
              }
            }}
          >
            <DeleteIcon sx={{ mr: 0.5 }} fontSize="small" /> Delete
          </Button>
          <Box>
            <Button 
              onClick={handleCloseMobileEdit} 
              sx={{ 
                mr: 1,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveMobileEdit} 
              variant="contained"
              sx={{ 
                bgcolor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark',
                }
              }}
            >
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Mobile Add Dialog */}
      <Dialog
        open={mobileAddDialogOpen}
        onClose={handleCloseMobileAdd}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
            color: isDark ? '#fff' : 'inherit',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: tableColors['Income'],
          color: isColorDark(tableColors['Income']) ? '#fff' : 'rgba(0, 0, 0, 0.87)',
          fontWeight: 'bold',
          pb: 3
        }}>
          Add Income Source
        </DialogTitle>
        <DialogContent sx={{ pt: 6, mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Description"
              fullWidth
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              error={!!formErrors.description}
              helperText={formErrors.description}
              InputLabelProps={{
                sx: {
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                }
              }}
              InputProps={{
                sx: {
                  color: isDark ? '#fff' : undefined,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                  }
                }
              }}
            />
            <TextField
              label="Amount"
              fullWidth
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              error={!!formErrors.amount}
              helperText={formErrors.amount}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                sx: {
                  color: isDark ? '#fff' : undefined,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                  }
                }
              }}
              InputLabelProps={{
                sx: {
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                }
              }}
            />
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
                sx: {
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                }
              }}
              InputProps={{
                sx: {
                  color: isDark ? '#fff' : undefined,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                  }
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          bgcolor: isDark ? 'rgba(20, 20, 20, 0.9)' : '#f5f5f5',
          borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}>
          <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              onClick={handleCloseMobileAdd}
              sx={{ 
                color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : undefined,
                '&:hover': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : undefined,
                }
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddIncomeMobile}
              variant="contained" 
              sx={{ px: 3 }}
              color="primary"
            >
              Add
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 