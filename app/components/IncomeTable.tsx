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
  Button 
} from '@mui/material';
import { DeleteIcon } from '../utils/materialIcons';
import type { Transaction } from '../services/fileParser';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from '../hooks/useLocalStorage';
import { isColorDark } from '../utils/colorUtils';
import { CategoryColorPicker } from './CategoryColorPicker';

interface IncomeTableProps {
  transactions: Transaction[];
  onUpdateTransaction: (index: number, updatedTransaction: Partial<Transaction>) => void;
  onDeleteTransaction: (index: number) => void;
}

export function IncomeTable({
  transactions,
  onUpdateTransaction,
  onDeleteTransaction
}: IncomeTableProps) {
  // State for tracking if we're showing delete buttons (hover effect)
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

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
                  {showDeleteButtons && (
                    <TableCell sx={{ 
                      width: '70px',
                      fontWeight: 700,
                      color: isDark ? '#fff' : 'inherit',
                      fontSize: '1rem',
                      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      letterSpacing: '0.01em',
                    }}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {incomeTransactions.map((transaction) => (
                  <TableRow
                    key={`${transaction.description}-${transaction.amount}-${String(transaction.date)}`}
                    sx={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'inherit',
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
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
                      {transaction.description}
                    </TableCell>
                    <TableCell sx={{ 
                      color: isDark ? '#fff' : 'inherit',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      padding: '8px 8px',
                    }}>
                      {formatDateForDisplay(transaction.date)}
                    </TableCell>
                    <TableCell sx={{ 
                      color: isDark 
                        ? 'rgba(255, 255, 255, 0.9)' 
                        : 'success.main',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      padding: '8px 8px',
                      textAlign: 'right',
                    }}>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(transaction.amount)}
                    </TableCell>
                    {showDeleteButtons && (
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteClick(e, transaction)}
                          sx={{ 
                            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                            '&:hover': {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                              color: 'error.main'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
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
                      color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'success.main',
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
                  {showDeleteButtons && <TableCell></TableCell>}
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