import React, { useState, useEffect, useRef } from 'react';
import { Container, Box, Typography, Stepper, Step, StepLabel, Paper, Button, CircularProgress, Alert, List, ListItem, ListItemText, ListItemIcon, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Popover, Tooltip } from '@mui/material';
// Import custom icon components to avoid the directory import issue
import { EditOutlinedIcon, SaveIcon, CloseIcon, DragIndicatorIcon, PaletteIcon, DeleteIcon } from '../utils/materialIcons';
import { HexColorPicker } from 'react-colorful';
import { TransactionTable } from './TransactionTable';
import { BudgetSummary } from './BudgetSummary';
import { SpeechRecognition } from './SpeechRecognition';
import type { Transaction } from '../services/fileParser';
import {
  calculateBudgetSummary,
  create503020Plan,
  getBudgetSuggestions,
  type BudgetSummary as BudgetSummaryType,
  type BudgetPlan
} from '../services/budgetCalculator';
import { ManualTransactionEntry } from './ManualTransactionEntry';
import { IncomeTable } from './IncomeTable';
import { EnhancedTransactionTable } from './EnhancedTransactionTable';
import { BudgetActions } from './BudgetActions';
import { useTransactions } from '../hooks/useTransactions';

// Add this interface for alert messages
interface AlertMessage {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
}

// Utility function to determine if a color is dark
const isColorDark = (hexColor: string): boolean => {
  // Remove the # if it exists
  const hex = hexColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance using the formula for relative luminance in the sRGB color space
  // See: https://www.w3.org/TR/WCAG20/#relativeluminancedef
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if the color is dark (luminance < 0.5)
  return luminance < 0.5;
};

// Add these constants at the top of the file, after the imports
// Constants for localStorage keys
const STORAGE_KEYS = {
  TRANSACTIONS: 'friendlyBudgets_transactions',
  SUMMARY: 'friendlyBudgets_summary',
  PLAN: 'friendlyBudgets_plan',
  SUGGESTIONS: 'friendlyBudgets_suggestions',
  TABLE_COLORS: 'friendlyBudgets_tableColors'
};

// Legacy keys for backward compatibility
const LEGACY_STORAGE_KEYS = {
  TRANSACTIONS: 'budgetFriendly_transactions',
  SUMMARY: 'budgetFriendly_summary',
  PLAN: 'budgetFriendly_plan',
  SUGGESTIONS: 'budgetFriendly_suggestions',
  TABLE_COLORS: 'budgetFriendly_tableColors'
};

// Helper function to get item from localStorage with legacy fallback
const getStorageItem = (key: string, legacyKey: string) => {
  const value = localStorage.getItem(key);
  if (value) return value;
  
  // Try legacy key
  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue) {
    // Migrate data to new key
    localStorage.setItem(key, legacyValue);
    return legacyValue;
  }
  
  return null;
};

export function BudgetApp() {
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [recentlyDropped, setRecentlyDropped] = useState<string | null>(null);
  const [draggedTransaction, setDraggedTransaction] = useState<{
    transaction: Transaction;
    index: number;
  } | null>(null);
  
  // Use the transactions hook to handle data and operations
  const {
    transactions,
    budgetSummary,
    budgetPlan, 
    suggestions,
    alertMessage,
    setAlertMessage,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateTransactionByDescription,
    getTransactionsByCategory,
    getTotalIncome,
    resetTransactions,
    moveTransaction
  } = useTransactions();

  // Color picker state
  const [tableColors, setTableColors] = useState<Record<string, string>>({
    'Essentials': '#f5f5f5', // Default light gray
    'Wants': '#f5f5f5',
    'Savings': '#f5f5f5',
    'Income': '#f5f5f5'
  });
  const [colorPickerAnchor, setColorPickerAnchor] = useState<null | HTMLElement>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  
  // State for speech recognition
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  
  // Ref for speech recognition
  const recognitionRef = useRef<any>(null);
  
  // TypeScript declarations for Web Speech API
  type SpeechRecognitionEvent = {
    results: {
      item(index: number): {
        item(index: number): {
          transcript: string;
          isFinal: boolean;
        };
      };
      length: number;
    };
  };
  
  type SpeechRecognitionErrorEvent = {
    error: string;
    message: string;
  };
  
  // Load data from local storage on component mount
  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        // Load transactions
        const savedTransactions = getStorageItem(STORAGE_KEYS.TRANSACTIONS, LEGACY_STORAGE_KEYS.TRANSACTIONS);
        if (savedTransactions) {
          const parsedTransactions = JSON.parse(savedTransactions);
          // Convert string dates back to Date objects
          const transactions = parsedTransactions.map((t: any) => ({
            ...t,
            date: new Date(t.date)
          }));
          // Update state
          setTransactions(transactions);
        }
        
        // Load budget summary
        const savedSummary = getStorageItem(STORAGE_KEYS.SUMMARY, LEGACY_STORAGE_KEYS.SUMMARY);
        if (savedSummary) {
          setBudgetSummary(JSON.parse(savedSummary));
        }
        
        // Load budget plan
        const savedPlan = getStorageItem(STORAGE_KEYS.PLAN, LEGACY_STORAGE_KEYS.PLAN);
        if (savedPlan) {
          setBudgetPlan(JSON.parse(savedPlan));
        }
        
        // Load suggestions
        const savedSuggestions = getStorageItem(STORAGE_KEYS.SUGGESTIONS, LEGACY_STORAGE_KEYS.SUGGESTIONS);
        if (savedSuggestions) {
          setSuggestions(JSON.parse(savedSuggestions));
        }
        
        // Load table colors
        const savedTableColors = getStorageItem(STORAGE_KEYS.TABLE_COLORS, LEGACY_STORAGE_KEYS.TABLE_COLORS);
        if (savedTableColors) {
          setTableColors(JSON.parse(savedTableColors));
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    };
    
    loadFromLocalStorage();
  }, []);

  // Save data to local storage whenever it changes
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('budgetFriendly_transactions', JSON.stringify(transactions));
    }
    
    if (budgetSummary) {
      localStorage.setItem('budgetFriendly_summary', JSON.stringify(budgetSummary));
    }
    
    if (budgetPlan) {
      localStorage.setItem('budgetFriendly_plan', JSON.stringify(budgetPlan));
    }
    
    if (suggestions.length > 0) {
      localStorage.setItem('budgetFriendly_suggestions', JSON.stringify(suggestions));
    }
  }, [transactions, budgetSummary, budgetPlan, suggestions]);

  const steps = ['Enter Transactions', 'Review Transactions', 'View Budget Plan'];

  const handleNext = () => {
    setIsLoading(true);
    setTimeout(() => {
      setActiveStep((prevStep) => prevStep + 1);
      setIsLoading(false);
    }, 500); // Simulate loading for a smoother transition
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    // Clear all data
    setTransactions([]);
    setBudgetSummary(null);
    setBudgetPlan(null);
    setSuggestions([]);
    setActiveStep(0);
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.SUMMARY);
    localStorage.removeItem(STORAGE_KEYS.PLAN);
    localStorage.removeItem(STORAGE_KEYS.SUGGESTIONS);
    
    // Also clear legacy keys
    localStorage.removeItem(LEGACY_STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.SUMMARY);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.PLAN);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.SUGGESTIONS);
    
    setAlertMessage({
      type: 'success',
      message: 'All data has been reset. Start fresh with a new budget!'
    });
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, transaction: Transaction, index: number) => {
    // Set the drag data
    setDraggedTransaction({ transaction, index });
    
    // Add some visual feedback
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', transaction.description);
    
    // Customize drag image if needed
    const dragPreview = document.createElement('div');
    dragPreview.textContent = transaction.description;
    dragPreview.style.backgroundColor = 'rgba(25, 118, 210, 0.1)';
    dragPreview.style.padding = '4px 8px';
    dragPreview.style.borderRadius = '4px';
    dragPreview.style.fontSize = '14px';
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 0, 0);
    
    // Remove the temporary element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategory !== category) {
      setDragOverCategory(category);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    setDragOverCategory(null);
    
    // Ensure we have a dragged transaction and it's not already in this category
    if (draggedTransaction && draggedTransaction.transaction.category !== targetCategory) {
      // Move the transaction to the new category
      moveTransaction(draggedTransaction.index, targetCategory);
      
      // Visual feedback for drop
      setRecentlyDropped(targetCategory);
      setTimeout(() => {
        setRecentlyDropped(null);
      }, 1500);
    }
    
    // Reset dragged transaction
    setDraggedTransaction(null);
  };
  
  // Clear any drag/drop/animation states when mouse leaves a draggable area
  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  // Handle opening the color picker
  const handleOpenColorPicker = (event: React.MouseEvent<HTMLElement>, category: string) => {
    setColorPickerAnchor(event.currentTarget);
    setCurrentCategory(category);
  };
  
  // Handle closing the color picker
  const handleCloseColorPicker = () => {
    setColorPickerAnchor(null);
    setCurrentCategory(null);
  };
  
  // Handle color selection
  const handleColorSelect = (color: string) => {
    if (!currentCategory) return;
    
    const updatedColors = {
      ...tableColors,
      [currentCategory]: color
    };
    
    setTableColors(updatedColors);
    setColorPickerAnchor(null);
    setCurrentCategory(null);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.TABLE_COLORS, JSON.stringify(updatedColors));
  };

  return (
    <Box sx={{ 
      width: '100%', 
      p: 3, 
      backgroundColor: 'background.default',
      mx: 'auto', // Center the content
      px: { xs: 2, sm: 3, md: 4 } // Responsive horizontal padding
    }}>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}>
        Friendly Budgets
      </Typography>
      
      {/* Alert Messages */}
      {alertMessage && (
        <Alert 
          severity={alertMessage.type} 
          sx={{ mb: 3 }}
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage.message}
        </Alert>
      )}
      
      {/* Main Content - Always show transaction entry */}
      <Box>
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3, backgroundColor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Manual Transaction Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter your transactions below to create your budget plan.
          </Typography>
          
          <ManualTransactionEntry onAddTransaction={addTransaction} />
          
          {/* Add Speech Recognition */}
          <SpeechRecognition 
            onAddTransaction={addTransaction} 
            onUpdateTransaction={updateTransactionByDescription}
            transactions={transactions}
          />
        </Paper>

        {/* Display transactions */}
        {transactions.length > 0 && (
          <Box sx={{ 
            mt: 3,
            px: { xs: 1, sm: 2, md: 3 }, // Add responsive horizontal padding
            maxWidth: '100%', // Ensure content doesn't overflow
          }}>
            {/* Display Income Table */}
            <IncomeTable 
              transactions={transactions}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
            />
            
            {/* Display transactions grouped by category */}
            {Object.entries(getTransactionsByCategory()).map(([category, categoryTransactions]) => (
              <EnhancedTransactionTable
                key={category}
                category={category}
                transactions={categoryTransactions}
                allTransactions={transactions}
                onUpdateTransaction={updateTransaction}
                onDeleteTransaction={deleteTransaction}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                dragOverCategory={dragOverCategory}
                recentlyDropped={recentlyDropped}
              />
            ))}
          </Box>
        )}
      
        {/* Always show budget summary if we have transactions */}
        {transactions.length > 0 && budgetSummary && budgetPlan && (
          <Box sx={{ mt: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 2, backgroundColor: 'background.paper' }}>
              <BudgetActions onReset={resetTransactions} />
              <BudgetSummary 
                summary={budgetSummary} 
                plan={budgetPlan} 
                suggestions={suggestions}
              />
            </Paper>
          </Box>
        )}

        {/* Color Picker Popover */}
        <Popover
          open={Boolean(colorPickerAnchor)}
          anchorEl={colorPickerAnchor}
          onClose={handleCloseColorPicker}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, width: 250 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Select table color for {currentCategory}
            </Typography>
            <HexColorPicker 
              color={currentCategory ? tableColors[currentCategory] : '#f5f5f5'} 
              onChange={(color) => handleColorSelect(color)}
              style={{ width: '100%', height: 200 }}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  bgcolor: currentCategory ? tableColors[currentCategory] : '#f5f5f5',
                  border: '1px solid #ccc'
                }} 
              />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {currentCategory ? tableColors[currentCategory] : '#f5f5f5'}
              </Typography>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={handleCloseColorPicker}
              >
                Done
              </Button>
            </Box>
          </Box>
        </Popover>
      </Box>
    </Box>
  );
} 