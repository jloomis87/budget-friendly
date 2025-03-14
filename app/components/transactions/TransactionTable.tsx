import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Stack, Card, CardContent, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { isColorDark } from '../../utils/colorUtils';
import { useTableColors } from '../../hooks/useTableColors';
import { useTransactionUtils } from './useTransactionUtils';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { MobileEditDialog } from './MobileEditDialog';
import { MobileAddDialog } from './MobileAddDialog';
import type { Transaction } from '../../services/fileParser';
import type { EditingRow } from './types';
import { CategoryColorPicker } from '../CategoryColorPicker';
import { v4 as uuidv4 } from 'uuid';
import { CopyMonthConfirmationDialog } from './CopyMonthConfirmationDialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  DeleteIcon,
  EditIcon
} from '../../utils/materialIcons';

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

// Helper function to format date for display
const formatDate = (date: string | number | Date) => {
  if (typeof date === 'number') {
    const now = new Date();
    const fullDate = new Date(now.getFullYear(), now.getMonth(), date);
    return fullDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  if (date instanceof Date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  if (typeof date === 'string' && date.includes('-')) {
    const [year, month, day] = date.split('-').map(Number);
    const fullDate = new Date(year, month - 1, day);
    return fullDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
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
    
    if (typeof transaction.date === 'number') {
      date = new Date();
      date.setDate(transaction.date);
    } else if (typeof transaction.date === 'string' && transaction.date.includes('-')) {
      const [year, month, day] = transaction.date.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(transaction.date);
    }
    
    const month = date.toLocaleString('default', { month: 'long' });
    
    if (!grouped[month]) {
      grouped[month] = [];
    }
    grouped[month].push(transaction);
  });
  
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

export function TransactionTable({
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
  selectedMonths,
  month,
  isDark,
  onTransactionsChange
}: TransactionTableProps) {
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ transaction: Transaction, index: number } | null>(null);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [mobileEditDialogOpen, setMobileEditDialogOpen] = useState(false);
  const [mobileEditTransaction, setMobileEditTransaction] = useState<{
    transaction: Transaction;
    index: number;
    identifier: string;
  } | null>(null);
  const [mobileAddDialogOpen, setMobileAddDialogOpen] = useState(false);
  const [copyMonthDialogOpen, setCopyMonthDialogOpen] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState('');
  const [copyTargetMonth, setCopyTargetMonth] = useState('');
  const [copyTransactions, setCopyTransactions] = useState<Transaction[]>([]);

  const [tableColors] = useTableColors();
  const utils = useTransactionUtils();
  const isIncome = category === 'Income';

  const hasCustomColor = tableColors[category] !== '#f5f5f5';

  // Filter transactions by selected months
  const filteredTransactions = React.useMemo(() => {
    if (!selectedMonths?.length) {
      return transactions;
    }
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
      return selectedMonths.includes(transactionMonth);
    });
  }, [transactions, selectedMonths]);

  // Calculate total amount
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const handleEditingChange = (field: keyof EditingRow, value: string) => {
    if (editingRow) {
      setEditingRow({
        ...editingRow,
        [field]: value
      });
    }
  };

  const handleSaveEdit = () => {
    if (mobileEditTransaction && editingRow) {
      const [year, month, day] = editingRow.date.split('-').map(Number);
      
      const updatedTransaction: Partial<Transaction> = {
        description: editingRow.description,
        date: new Date(year, month - 1, day),
        amount: parseFloat(editingRow.amount) * (isIncome ? 1 : -1)
      };
      
      const globalIndex = utils.findGlobalIndex(mobileEditTransaction.transaction, allTransactions);
      onUpdateTransaction(globalIndex, updatedTransaction);
      handleCloseMobileEdit();
    }
  };

  const handleAddTransaction = () => {
    if (!newDescription.trim() || !newAmount.trim()) return;

    const [year, month, day] = newDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    const transaction: Transaction = {
      description: newDescription.trim(),
      amount: parseFloat(newAmount) * (isIncome ? 1 : -1),
      date: date,
      category: category,
      id: uuidv4(),
    };

    onAddTransaction(transaction);
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setMobileAddDialogOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, transaction: Transaction) => {
    e.stopPropagation();
    const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
    
    if (globalIndex !== -1) {
      setTransactionToDelete({ transaction, index: globalIndex });
      setDeleteConfirmOpen(true);
    }
  };

  const handleOpenMobileEdit = (transaction: Transaction, index: number) => {
    const transactionId = utils.getTransactionId(transaction);
    const globalIndex = utils.findGlobalIndex(transaction, allTransactions);
    
    setMobileEditTransaction({
      transaction,
      index,
      identifier: transactionId
    });
    
    const dateString = transaction.date instanceof Date 
      ? transaction.date.toISOString().split('T')[0]
      : (typeof transaction.date === 'string' 
        ? new Date(transaction.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]);
    
    setEditingRow({
      index: globalIndex,
      identifier: transactionId,
      amount: Math.abs(transaction.amount).toString(),
      date: dateString,
      description: transaction.description
    });
    
    setMobileEditDialogOpen(true);
  };

  const handleCloseMobileEdit = () => {
    setMobileEditDialogOpen(false);
    setMobileEditTransaction(null);
    setEditingRow(null);
  };

  const handleOpenMobileAdd = (month: string) => {
    const currentYear = new Date().getFullYear();
    const monthIndex = new Date(`${month} 1`).getMonth();
    const firstOfMonth = new Date(currentYear, monthIndex, 1);
    const newDateValue = firstOfMonth.toISOString().split('T')[0];

    setNewDescription('');
    setNewAmount('');
    setNewDate(newDateValue);
    setMobileAddDialogOpen(true);
  };

  const handleCloseMobileAdd = () => {
    setMobileAddDialogOpen(false);
    setNewDescription('');
    setNewAmount('');
    setNewDate(new Date().toISOString().split('T')[0]);
  };

  const getNextMonth = (currentMonth: string): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentIndex = months.indexOf(currentMonth);
    return months[(currentIndex + 1) % 12];
  };

  const handleCopyMonthClick = (month: string, transactions: Transaction[]) => {
    const nextMonth = getNextMonth(month);
    setCopySourceMonth(month);
    setCopyTargetMonth(nextMonth);
    setCopyTransactions(transactions);
    setCopyMonthDialogOpen(true);
  };

  const handleCopyMonthConfirm = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const targetMonthIndex = months.indexOf(copyTargetMonth);

    const targetMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      const month = date.toLocaleString('default', { month: 'long' });
      return month === copyTargetMonth && t.category === category;
    });

    copyTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
      
      const existingTransaction = targetMonthTransactions.find(t => 
        t.description === transaction.description && 
        t.category === transaction.category
      );

      if (existingTransaction) {
        if (Math.abs(existingTransaction.amount) !== Math.abs(transaction.amount)) {
          const globalIndex = utils.findGlobalIndex(existingTransaction, allTransactions);
          if (globalIndex !== -1) {
            onUpdateTransaction(globalIndex, {
              amount: isIncome ? Math.abs(transaction.amount) : -Math.abs(transaction.amount)
            });
          }
        }
        return;
      }

      const newTransaction: Transaction = {
        ...transaction,
        id: uuidv4(),
        date: newDate,
        amount: isIncome ? Math.abs(transaction.amount) : -Math.abs(transaction.amount)
      };

      onAddTransaction(newTransaction);
    });

    setCopyMonthDialogOpen(false);
  };

  const getBackgroundStyles = () => {
    if (dragOverCategory === category) {
      return {
        backgroundColor: 'rgba(25, 118, 210, 0.08)',
        transition: 'background-color 0.3s ease',
        transform: 'scale(1.01)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      };
    }
    if (recentlyDropped === category) {
      return {
        backgroundColor: 'rgba(76, 175, 80, 0.08)',
        transition: 'background-color 0.8s ease'
      };
    }
    return hasCustomColor ? { backgroundColor: tableColors[category] } : {};
  };

  const getMonthOrder = (month: string): number => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    const updatedTransactions = Array.from(transactions);
    const [removed] = updatedTransactions.splice(sourceIndex, 1);
    updatedTransactions.splice(destinationIndex, 0, removed);
    
    onUpdateTransaction(destinationIndex, updatedTransactions[destinationIndex]);
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
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider'
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
            {category}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography 
              component="span" 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 500, 
                color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                fontSize: '0.9rem'
              }}
            >
              (Total: ${Math.abs(totalAmount).toFixed(2)})
            </Typography>
            <CategoryColorPicker category={category} />
          </Box>
        </Box>

        <Box sx={{ p: 1 }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="transactions">
              {(provided) => (
                <Stack 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  spacing={1}
                >
                  {(() => {
                    const groupedTransactions = groupTransactionsByMonth(filteredTransactions);
                    const allMonths = [
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ];
                    
                    const monthsToShow = !selectedMonths?.length ? allMonths : selectedMonths;
                    
                    return monthsToShow
                      .map(month => [month, groupedTransactions[month] || [] as Transaction[]])
                      .sort(([monthA], [monthB]) => getMonthOrder(monthA as string) - getMonthOrder(monthB as string))
                      .map(([month, monthTransactions]) => (
                        <Box key={month}>
                          <Box sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 0.5,
                            borderBottom: 1,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider',
                            pb: 0.5
                          }}>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 500,
                                color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                              }}
                            >
                              {month}
                            </Typography>
                            <Tooltip title={`Copy ${month} ${category} to ${getNextMonth(month as string)}`}>
                              <IconButton
                                size="small"
                                onClick={() => handleCopyMonthClick(month as string, monthTransactions as Transaction[])}
                                sx={{
                                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)',
                                  '&:hover': {
                                    color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
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
                              color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.87)',
                              mb: 1
                            }}
                          >
                            ${Math.abs((monthTransactions as Transaction[]).reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                          </Typography>
                          <Droppable droppableId={month}>
                            {(provided) => (
                              <Stack 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                spacing={1}
                              >
                                {(monthTransactions as Transaction[]).map((transaction, index) => (
                                  <Draggable 
                                    key={transaction.id} 
                                    draggableId={transaction.id} 
                                    index={index}
                                  >
                                    {(provided, snapshot) => (
                                      <Card
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        sx={{
                                          mb: 1,
                                          p: 2,
                                          bgcolor: isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                                          border: '1px dashed',
                                          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                          transition: 'all 0.2s ease-in-out',
                                          transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                                          '&:hover': {
                                            borderColor: 'primary.main',
                                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 118, 210, 0.05)'
                                          }
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <Box>
                                            <Typography 
                                              variant="subtitle1"
                                              sx={{ 
                                                color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.87)',
                                                fontWeight: 500
                                              }}
                                            >
                                              {transaction.description}
                                            </Typography>
                                            <Typography 
                                              variant="body2"
                                              sx={{ 
                                                color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                                                mt: 0.5
                                              }}
                                            >
                                              {new Date(transaction.date).toLocaleDateString('en-US', { 
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                              })}
                                            </Typography>
                                          </Box>
                                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography 
                                              variant="subtitle1"
                                              sx={{ 
                                                fontWeight: 500,
                                                color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.87)',
                                                mr: 2
                                              }}
                                            >
                                              ${parseFloat(transaction.amount).toFixed(2)}
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                              <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenMobileEdit(transaction, index);
                                                }}
                                                sx={{
                                                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)',
                                                  '&:hover': {
                                                    color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
                                                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                                  }
                                                }}
                                              >
                                                <EditIcon fontSize="small" />
                                              </IconButton>
                                              <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteClick(e, transaction);
                                                }}
                                                sx={{
                                                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)',
                                                  '&:hover': {
                                                    color: 'error.main',
                                                    bgcolor: 'error.light'
                                                  }
                                                }}
                                              >
                                                <DeleteIcon fontSize="small" />
                                              </IconButton>
                                            </Stack>
                                          </Box>
                                        </Box>
                                      </Card>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </Stack>
                            )}
                          </Droppable>
                          <Card
                            onClick={() => handleOpenMobileAdd(month as string)}
                            sx={{
                              mb: 2,
                              p: 2,
                              bgcolor: isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                              border: '1px dashed',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-in-out',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 118, 210, 0.05)'
                              }
                            }}
                          >
                            <AddIcon sx={{ 
                              mr: 1,
                              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)'
                            }} />
                            <Typography
                              variant="body1"
                              sx={{
                                color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)'
                              }}
                            >
                              Add {category}
                            </Typography>
                          </Card>
                        </Box>
                      ));
                  })()}
                  {provided.placeholder}
                </Stack>
              )}
            </Droppable>
          </DragDropContext>
        </Box>
      </Paper>

      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        transactionToDelete={transactionToDelete}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (transactionToDelete) {
            onDeleteTransaction(transactionToDelete.index);
            setDeleteConfirmOpen(false);
            setTransactionToDelete(null);
          }
        }}
      />

      <MobileEditDialog
        open={mobileEditDialogOpen}
        category={category}
        editingRow={editingRow}
        onClose={handleCloseMobileEdit}
        onSave={handleSaveEdit}
        onDelete={() => {
          if (mobileEditTransaction) {
            handleDeleteClick(new MouseEvent('click'), mobileEditTransaction.transaction);
          }
          handleCloseMobileEdit();
        }}
        handleEditingChange={handleEditingChange}
        generateDayOptions={utils.generateDayOptions}
        getOrdinalSuffix={utils.getOrdinalSuffix}
        tableColor={tableColors[category]}
        isDark={isDark}
      />

      <MobileAddDialog
        open={mobileAddDialogOpen}
        onClose={handleCloseMobileAdd}
        onAdd={handleAddTransaction}
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