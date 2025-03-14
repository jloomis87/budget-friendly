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
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import type { InputLabelProps } from '@mui/material';
import { DeleteIcon, SaveIcon, CloseIcon, AddIcon, EditOutlinedIcon, CheckCircleOutlineIcon, CancelOutlinedIcon, DragIndicatorIcon } from '../utils/materialIcons';
import type { Transaction } from '../services/fileParser';
import { useTableColors } from '../hooks/useTableColors';
import { isColorDark } from '../utils/colorUtils';
import { CategoryColorPicker } from './CategoryColorPicker';
import { CopyMonthConfirmationDialog } from '../components/transactions/CopyMonthConfirmationDialog';
import { v4 as uuidv4 } from 'uuid';

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
  onReorder?: (category: string, sourceIndex: number, targetIndex: number) => void;
  selectedMonths?: string[];
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
  recentlyDropped,
  onReorder,
  selectedMonths
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

  // State for drag and drop reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [tableColors] = useTableColors();

  // Initialize form errors state property if it doesn't already exist
  const [formErrors, setFormErrors] = useState<{
    description?: string;
    amount?: string;
  }>({});

  // Add these state variables at the top of the component with other state declarations
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const monthHeaderRef = React.useRef<HTMLDivElement>(null);

  // Add these new state variables and handlers after other state declarations
  const [copyMonthDialogOpen, setCopyMonthDialogOpen] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState('');
  const [copyTargetMonth, setCopyTargetMonth] = useState('');
  const [copyTransactions, setCopyTransactions] = useState<Transaction[]>([]);

  // Filter only income transactions and sort by order
  const incomeTransactions = transactions
    .filter(transaction => transaction.category === 'Income')
    .sort((a, b) => {
      // Sort by order (if available) or amount as fallback
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Fallback to amount sorting
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
    console.log('Finding global index for transaction:', {
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date
    });
    
    // First try to find by ID if available
    if (transaction.id) {
      const idIndex = transactions.findIndex(t => t.id === transaction.id);
      if (idIndex !== -1) {
        console.log(`Found transaction by ID at index ${idIndex}`);
        return idIndex;
      }
    }
    
    // Otherwise, try to match by properties - ENSURE CATEGORY MATCH IS REQUIRED
    const index = transactions.findIndex(t => {
      // Category match is REQUIRED - if categories don't match, return false immediately
      if (t.category !== transaction.category) {
        return false;
      }
      
      const dateMatch = getDateString(t.date) === getDateString(transaction.date);
      const descriptionMatch = t.description === transaction.description;
      const amountMatch = t.amount === transaction.amount;
      
      const isMatch = dateMatch && descriptionMatch && amountMatch;
      
      if (isMatch) {
        console.log(`Found matching transaction at index ${transactions.indexOf(t)}`);
      }
      
      return isMatch;
    });
    
    if (index === -1) {
      console.warn('Could not find transaction in global array:', transaction);
      
      // Log all transactions in the same category for debugging
      console.log('All transactions in category', transaction.category, ':');
      transactions
        .filter(t => t.category === transaction.category)
        .forEach((t, i) => {
          console.log(`[${i}]`, {
            id: t.id,
            description: t.description,
            amount: t.amount,
            date: t.date
          });
        });
    }
    
    return index;
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
        updates.date = new Date(editingRow.date);
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
    
    console.log('Delete button clicked for transaction:', {
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category
    });
    
    // Use our improved findGlobalIndex function
    const index = findGlobalIndex(transaction);
    console.log(`Found global index: ${index}`);
    
    if (index !== -1) {
      setTransactionToDelete({ transaction, index });
      setDeleteConfirmOpen(true);
    } else {
      console.error('Could not find transaction to delete in global array');
      alert('Error: Could not find the transaction to delete. Please try again.');
    }
  };

  // Confirm and execute delete
  const confirmDelete = () => {
    if (transactionToDelete) {
      console.log('Deleting transaction:', {
        transaction: transactionToDelete.transaction,
        index: transactionToDelete.index,
        category: transactionToDelete.transaction.category
      });
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
        : new Date().toISOString().split('T')[0]);
    
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
  const handleOpenMobileAdd = (month: string) => {
    // Set the date to the first of the selected month in the current year
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
    
    // Create new transaction with proper date handling
    const [year, month, day] = newDate.split('-').map(Number);
    const newTransaction: Transaction = {
      description: newDescription.trim(),
      amount: Math.abs(amountValue), // Positive for income
      date: new Date(year, month - 1, day), // Adjust month (0-based) and ensure local date
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

  // Handle drag start for reordering
  const handleInternalDragStart = (e: React.DragEvent, transaction: Transaction, index: number, globalIndex: number) => {
    setDraggedIndex(index);
    
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
    
    // Store transaction ID in dataTransfer for reordering
    if (transaction.id) {
      e.dataTransfer.setData('application/json', JSON.stringify({
        id: transaction.id,
        index: index,
        category: 'Income'
      }));
    }
    
    // Call the parent handler
    if (onDragStart) {
      onDragStart(e, transaction, globalIndex);
    }
    
    // Remove the element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  };
  
  // Handle drag over for reordering
  const handleInternalDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };
  
  // Handle drop for reordering
  const handleInternalDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    // If we have a dragged item and a valid drop target
    if (draggedIndex !== null && draggedIndex !== index) {
      // Call the parent reorder handler if provided
      if (onReorder) {
        console.log(`Reordering in Income category: from ${draggedIndex} to ${index}`);
        onReorder('Income', draggedIndex, index);
      }
    }
    
    setDraggedIndex(null);
  };
  
  // Handle drag end
  const handleInternalDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Filter transactions by selected months
  const filteredTransactions = React.useMemo(() => {
    return incomeTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
      return selectedMonths?.includes(transactionMonth);
    });
  }, [incomeTransactions, selectedMonths]);

  // Get months that have no income transactions
  const monthsWithoutIncome = React.useMemo(() => {
    if (!selectedMonths) return [];
    
    return selectedMonths.filter(month => {
      return !incomeTransactions.some(transaction => {
        const transactionDate = new Date(transaction.date);
        const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
        return transactionMonth === month;
      });
    });
  }, [incomeTransactions, selectedMonths]);

  // Handle clicking "Add Month Income" card
  const handleAddMonthIncome = (month: string) => {
    // Set the date to the first of the selected month in the current year
    const currentYear = new Date().getFullYear();
    const monthIndex = new Date(`${month} 1`).getMonth(); // Get month index (0-11)
    const firstOfMonth = new Date(currentYear, monthIndex, 1);
    const newDateValue = firstOfMonth.toISOString().split('T')[0];
    setNewDate(newDateValue);
    setMobileAddDialogOpen(true);
  };

  // Add this helper function before the IncomeTable component
  const getMonthOrder = (month: string): number => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
  };

  // Add these handlers before the return statement
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!monthHeaderRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - monthHeaderRef.current.offsetLeft);
    setScrollLeft(monthHeaderRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !monthHeaderRef.current) return;
    e.preventDefault();
    const x = e.pageX - monthHeaderRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    monthHeaderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Add these helper functions before the return statement
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

    copyTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const newDate = new Date(date.getFullYear(), targetMonthIndex, date.getDate());
      
      const newTransaction: Transaction = {
        ...transaction,
        id: uuidv4(),
        date: newDate,
        amount: Math.abs(transaction.amount) // Income is always positive
      };

      onAddTransaction(newTransaction);
    });

    setCopyMonthDialogOpen(false);
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
                    fontSize: {
                      xs: '0.7rem',   // Smaller screens
                      sm: '0.75rem',  // Small screens
                      md: '0.85rem'   // Medium and up
                    },
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
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
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
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
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
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined
                  }
                }}
                InputProps={{
                  sx: {
                    color: isDark ? '#fff' : undefined,
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
    <Box sx={{ 
      mt: 1,
      mb: 1,
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      <Paper 
        elevation={1} 
        sx={{ 
          mb: 1,
          borderRadius: 2,
          overflow: 'hidden',
          width: '100%',
          ...getBackgroundStyles(),
          transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.3s'
        }}
        className={`drag-target ${dragOverCategory === 'Income' ? 'drag-target-hover' : ''}`}
        onDragOver={(e) => onDragOver && onDragOver(e, 'Income')}
        onDrop={(e) => onDrop && onDrop(e, 'Income')}
        onDragLeave={() => {}}
      >
        {/* Add Header Section */}
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
            Income
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                fontWeight: 500
              }}
            >
              (Total: ${totalIncome.toFixed(2)})
            </Typography>
            <CategoryColorPicker category="Income" />
          </Box>
        </Box>
        <Box sx={{ 
          p: 1,
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden'
        }}>
          <Box 
            ref={monthHeaderRef}
            sx={{ 
              width: '100%',
              maxWidth: '100%',
              overflowX: {
                xs: 'auto',
                '@media (min-width:1500px)': 'hidden'
              },
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              '& .month-header': {
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none'
              }
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <Grid 
              container 
              spacing={1} 
              sx={{ 
                flexWrap: 'nowrap', 
                overflowX: 'auto',
                width: '100%',
                maxWidth: '100%',
                mx: 'auto',
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
              {selectedMonths?.sort((a, b) => getMonthOrder(a) - getMonthOrder(b)).map((month) => {
                // Calculate total income for this month
                const monthlyTotal = filteredTransactions
                  .filter(transaction => {
                    const transactionDate = new Date(transaction.date);
                    const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
                    return transactionMonth === month;
                  })
                  .reduce((sum, transaction) => sum + transaction.amount, 0);

                return (
                  <Grid item key={month} sx={{ 
                    flex: '0 0 auto',
                    width: `${100 / (selectedMonths?.length || 1)}%`,
                    minWidth: '200px',
                    p: {
                      xs: 1,
                      '@media (min-width:1500px)': 0.5
                    },
                    '@media (min-width:1500px)': {
                      '&:first-of-type': { pl: 1 },
                      '&:last-of-type': { pr: 1 }
                    }
                  }}>
                    <Typography
                      className="month-header"
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        color: tableColors['Income'] && isColorDark(tableColors['Income']) 
                          ? 'rgba(255, 255, 255, 0.9)' 
                          : 'rgba(0, 0, 0, 0.9)',
                        borderBottom: 1,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider',
                        pb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        px: 1
                      }}
                    >
                      <span>{month}</span>
                      <Tooltip title={`Copy ${month} Income to ${getNextMonth(month as string)}`}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyMonthClick(
                            month as string,
                            filteredTransactions.filter(transaction => {
                              const transactionDate = new Date(transaction.date);
                              const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
                              return transactionMonth === month;
                            })
                          )}
                          sx={{
                            color: tableColors['Income'] && isColorDark(tableColors['Income'])
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'rgba(0, 0, 0, 0.54)',
                            '&:hover': {
                              color: tableColors['Income'] && isColorDark(tableColors['Income'])
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
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: {
                          xs: '0.65rem',
                          sm: '0.75rem',
                          md: '0.85rem'
                        },
                        color: tableColors['Income'] && isColorDark(tableColors['Income'])
                          ? 'rgba(255, 255, 255, 0.6)'
                          : 'rgba(0, 0, 0, 0.6)',
                        mb: 1,
                        textAlign: 'left'
                      }}
                    >
                      ${monthlyTotal.toFixed(2)}
                    </Typography>
                    <Stack spacing={1} sx={{ pb: 1 }}>
                      {/* Render transactions for this month */}
                      {filteredTransactions
                        .filter(transaction => {
                          const transactionDate = new Date(transaction.date);
                          const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
                          return transactionMonth === month;
                        })
                        .sort((a, b) => new Date(a.date).getDate() - new Date(b.date).getDate())
                        .map((transaction) => {
                          const transactionId = getTransactionId(transaction);
                          const dateString = formatDateForDisplay(transaction.date);
                          const globalIndex = findGlobalIndex(transaction);
                          
                          return (
                            <Card
                              key={transactionId}
                              sx={{
                                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fff',
                                borderRadius: 2,
                                boxShadow: isDark 
                                  ? '0 2px 4px rgba(0,0,0,0.2)' 
                                  : '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                height: '63px',
                                border: '1px solid',
                                borderColor: isDark 
                                  ? 'rgba(255, 255, 255, 0.1)' 
                                  : 'rgba(0, 0, 0, 0.08)',
                                mx: 1,
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: isDark 
                                    ? '0 4px 8px rgba(0,0,0,0.4)' 
                                    : '0 4px 8px rgba(0,0,0,0.1)',
                                  borderColor: 'primary.main',
                                  bgcolor: isDark 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : '#fff'
                                }
                              }}
                              onClick={() => handleOpenMobileEdit(transaction, globalIndex)}
                            >
                              <CardContent sx={{ 
                                p: '8px 16px',
                                '&:last-child': { pb: '8px' },
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 500,
                                      color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
                                      fontSize: '0.875rem',
                                      lineHeight: '1.2'
                                    }}
                                  >
                                    {transaction.description}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                                      fontSize: '0.75rem',
                                      mt: 0.5
                                    }}
                                  >
                                    {dateString}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  ${Math.abs(transaction.amount).toFixed(2)}
                                </Typography>
                              </CardContent>
                            </Card>
                          );
                        })}
                      
                      {/* Add "Add Month Income" card for all months */}
                      <Card
                        sx={{
                          position: 'relative',
                          bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fff',
                          borderRadius: 2,
                          boxShadow: isDark 
                            ? '0 2px 4px rgba(0,0,0,0.2)' 
                            : '0 2px 4px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          height: '63px',
                          border: '1px solid',
                          borderColor: isDark 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'rgba(0, 0, 0, 0.08)',
                          mx: 1,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: isDark 
                              ? '0 4px 8px rgba(0,0,0,0.4)' 
                              : '0 4px 8px rgba(0,0,0,0.1)',
                            borderColor: 'primary.main',
                            bgcolor: isDark 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : '#fff'
                          }
                        }}
                        onClick={() => handleOpenMobileAdd(month)}
                      >
                        <CardContent sx={{ 
                          p: '8px 16px',
                          '&:last-child': { pb: '8px' },
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <AddIcon sx={{ 
                            color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                            fontSize: '1.5rem'
                          }} />
                        </CardContent>
                      </Card>
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Box>
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
              
              <TextField
                label="Date"
                type="date"
                value={editingRow.date}
                onChange={(e) => handleEditingChange('date', e.target.value)}
                fullWidth
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined
                  }
                }}
                InputProps={{
                  sx: {
                    color: isDark ? '#fff' : undefined,
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
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            onClick={() => {
              if (mobileEditTransaction) {
                console.log('Delete button clicked for transaction:', {
                  description: mobileEditTransaction.transaction.description,
                  amount: mobileEditTransaction.transaction.amount,
                  category: mobileEditTransaction.transaction.category,
                  localIndex: mobileEditTransaction.index
                });
                
                // Use findGlobalIndex to get the correct global index
                const globalIndex = findGlobalIndex(mobileEditTransaction.transaction);
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
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
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
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
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
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined
                }
              }}
              InputProps={{
                sx: {
                  color: isDark ? '#fff' : undefined,
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

      {/* Copy Month Confirmation Dialog */}
      <CopyMonthConfirmationDialog
        open={copyMonthDialogOpen}
        onClose={() => setCopyMonthDialogOpen(false)}
        onConfirm={handleCopyMonthConfirm}
        sourceMonth={copySourceMonth}
        targetMonth={copyTargetMonth}
        category="Income"
        transactionCount={copyTransactions.length}
      />
    </Box>
  );
} 