import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Table, TableHead, 
  TableBody, TableRow, TableCell, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
} from '@mui/material';
import { EditOutlinedIcon, SaveIcon, CloseIcon, DragIndicatorIcon, DeleteIcon } from '../utils/materialIcons';
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
  onDragStart,
  onDragOver,
  onDrop,
  dragOverCategory,
  recentlyDropped
}: EnhancedTransactionTableProps) {
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ transaction: Transaction, index: number } | null>(null);
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

  return (
    <>
      <Box 
        sx={{ mb: 3 }}
        onDragOver={(e) => onDragOver(e, category)}
        onDrop={(e) => onDrop(e, category)}
      >
        <Paper 
          sx={{ 
            overflow: 'hidden', 
            borderRadius: 2, 
            boxShadow: 2,
            ...getBackgroundStyles()
          }}
        >
          <Box sx={{ 
            p: 2, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            color: isDark ? '#fff' : 'inherit',
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
              {category}
              <Typography 
                variant="body2" 
                component="span" 
                sx={{ 
                  ml: 1,
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
                }}
              >
                ({transactions.length} items)
              </Typography>
            </Typography>
            
            <CategoryColorPicker category={category} />
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
                    fontWeight: 700,
                    padding: '8px 4px 8px 8px',
                  }}></TableCell>
                  <TableCell sx={{ 
                    width: '45%',
                    color: isDark ? '#fff' : 'inherit',
                    fontWeight: 700,
                    fontSize: '1rem',
                    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    letterSpacing: '0.01em',
                  }}>Description</TableCell>
                  <TableCell sx={{ 
                    width: '120px',
                    color: isDark ? '#fff' : 'inherit',
                    fontWeight: 700,
                    fontSize: '1rem',
                    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    letterSpacing: '0.01em',
                    padding: '8px 8px',
                  }}>Date</TableCell>
                  <TableCell sx={{ 
                    width: '120px',
                    color: isDark ? '#fff' : 'inherit',
                    fontWeight: 700,
                    fontSize: '1rem',
                    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    letterSpacing: '0.01em',
                    padding: '8px 8px',
                    textAlign: 'right',
                  }}>Amount</TableCell>
                  {isAnyRowEditing && (
                    <TableCell sx={{ 
                      width: '90px', 
                      color: isDark ? '#fff' : 'inherit',
                      fontWeight: 700,
                      fontSize: '1rem',
                      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      letterSpacing: '0.01em',
                    }}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction, index) => {
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
                        color: isDark ? '#fff' : 'inherit',
                        padding: '8px 4px 8px 8px',
                      }}>
                        <DragIndicatorIcon 
                          fontSize="small" 
                          sx={{ 
                            cursor: 'grab',
                            color: isDark
                              ? 'rgba(255, 255, 255, 0.7)' 
                              : 'action.disabled'
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{
                        color: isDark ? '#fff' : 'inherit',
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
                        width: '120px',
                      }}>
                        {isEditing ? (
                          <TextField
                            type="date"
                            value={editingRow?.date || ''}
                            onChange={(e) => handleEditingChange('date', e.target.value)}
                            variant="standard"
                            size="small"
                            fullWidth
                            InputProps={{
                              sx: {
                                color: isDark ? '#fff' : 'inherit',
                                fontSize: '0.95rem',
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
                        width: '120px',
                      }}>
                        {isEditing ? (
                          <TextField
                            value={editingRow?.amount || ''}
                            onChange={(e) => handleEditingChange('amount', e.target.value)}
                            variant="standard"
                            size="small"
                            fullWidth
                            InputProps={{
                              startAdornment: <span style={{ 
                                marginRight: 4,
                                color: isDark ? '#fff' : 'inherit',
                              }}>$</span>,
                              sx: {
                                color: isDark ? '#fff' : 'inherit',
                                fontSize: '0.95rem',
                              }
                            }}
                          />
                        ) : (
                          <Typography
                            sx={{
                              color: isDark 
                                ? '#fff' 
                                : (transaction.amount < 0 ? 'error.main' : 'success.main'),
                              fontWeight: 600,
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
                        <TableCell>
                          {isEditing ? (
                            <Box sx={{ display: 'flex' }}>
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click event
                                  handleSaveEdit(transaction);
                                }}
                                color="primary"
                              >
                                <SaveIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click event
                                  setEditingRow(null);
                                }}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={(e) => handleDeleteClick(e, transaction, globalIndex)}
                                color="error"
                                sx={{
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
              </TableBody>
            </Table>
          </Box>
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
    </>
  );
} 