import React, { useState } from 'react';
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
  TextField 
} from '@mui/material';
import { DeleteIcon, SaveIcon, CloseIcon } from '../utils/materialIcons';
import type { Transaction } from '../services/fileParser';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from '../hooks/useLocalStorage';
import { isColorDark } from '../utils/colorUtils';
import { CategoryColorPicker } from './CategoryColorPicker';

interface IncomeTableProps {
  transactions: Transaction[];
  onUpdateTransaction: (index: number, updatedTransaction: Partial<Transaction>) => void;
  onDeleteTransaction: (index: number) => void;
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
  onDeleteTransaction
}: IncomeTableProps) {
  // State for tracking if we're showing delete buttons (hover effect)
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<{ transaction: Transaction, index: number } | null>(null);
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

  // Check if the table has a custom color and if it's dark
  const hasCustomColor = tableColors['Income'] !== '#f5f5f5';
  const isDark = tableColors['Income'] && isColorDark(tableColors['Income']);

  // Get background color styles
  const getBackgroundStyles = () => {
    return hasCustomColor ? { backgroundColor: tableColors['Income'] } : {};
  };

  // Check if any row is currently being edited - used to determine if we need the Actions column
  const isAnyRowEditing = editingRow !== null;

  if (incomeTransactions.length === 0) {
    return null;
  }

  return (
    <>
      <Box sx={{ mb: 3 }}
           onMouseEnter={() => setShowDeleteButtons(true)}
           onMouseLeave={() => setShowDeleteButtons(false)}>
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
                }).format(totalIncome)})
              </Typography>
            </Typography>
            
            <CategoryColorPicker category="Income" />
          </Box>
          
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
                  }}>Date</TableCell>
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
                  {isAnyRowEditing && (
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
                  )}
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
                      }}></TableCell>
                      <TableCell sx={{ 
                        color: isDark ? '#fff' : 'inherit',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {isEditing ? (
                          <TextField
                            value={editingRow?.description || ''}
                            onChange={(e) => handleEditingChange('description', e.target.value)}
                            variant="standard"
                            fullWidth
                            size="small"
                            autoFocus
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
                              sx: {
                                color: isDark ? '#fff' : 'inherit',
                                fontSize: '0.95rem',
                              }
                            }}
                          />
                        ) : (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            '& .edit-hint': {
                              opacity: 0,
                              transition: 'opacity 0.2s ease'
                            },
                            '&:hover .edit-hint': {
                              opacity: 0.5
                            },
                            color: isDark ? '#fff' : 'inherit'
                          }}>
                            <Typography
                              sx={{
                                color: isDark ? '#fff' : 'inherit',
                                fontWeight: 500,
                                fontSize: '0.95rem',
                              }}
                            >{transaction.description}</Typography>
                            <Typography 
                              className="edit-hint" 
                              variant="caption" 
                              color={isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'}
                              sx={{ ml: 1 }}
                            >
                              (Click to edit)
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ 
                        color: isDark ? '#fff' : 'inherit',
                        fontSize: '0.95rem',
                        padding: '8px 8px',
                      }}>
                        {isEditing ? (
                          <TextField
                            type="date"
                            value={editingRow?.date || ''}
                            onChange={(e) => handleEditingChange('date', e.target.value)}
                            variant="standard"
                            size="small"
                            fullWidth
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
                              sx: {
                                color: isDark ? '#fff' : 'inherit',
                                fontSize: '0.95rem',
                                width: '110px',
                              }
                            }}
                          />
                        ) : (
                          <Typography
                            sx={{
                              color: isDark ? '#fff' : 'inherit',
                              fontWeight: 500,
                              fontSize: '0.95rem',
                            }}
                          >
                            {formatDateForDisplay(transaction.date)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ 
                        color: isDark ? '#fff' : 'inherit',
                        fontSize: '0.95rem',
                        padding: '8px 8px',
                        textAlign: 'right',
                      }}>
                        {isEditing ? (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <TextField
                              value={editingRow?.amount || ''}
                              onChange={(e) => handleEditingChange('amount', e.target.value)}
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
                      {isAnyRowEditing && (
                        <TableCell sx={{ padding: '0px 4px' }}>
                          {isEditing ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click event
                                  handleSaveEdit(transaction);
                                }}
                                color="primary"
                                sx={{ padding: '4px' }}
                              >
                                <SaveIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click event
                                  setEditingRow(null);
                                }}
                                sx={{ padding: '4px' }}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={(e) => handleDeleteClick(e, transaction)}
                                color="error"
                                sx={{
                                  padding: '4px',
                                  '&:hover': {
                                    backgroundColor: 'rgba(211, 47, 47, 0.04)',
                                  }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
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
                  {isAnyRowEditing && <TableCell></TableCell>}
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>

      <Dialog
        open={deleteConfirmOpen}
        onClose={cancelDelete}
        aria-labelledby="delete-income-dialog-title"
        aria-describedby="delete-income-dialog-description"
      >
        <DialogTitle id="delete-income-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-income-dialog-description">
            Are you sure you want to delete the income "{transactionToDelete?.transaction.description}"
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
    </>
  );
} 