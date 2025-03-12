import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Box, Typography, Stepper, Step, StepLabel, Paper, Button, CircularProgress, Alert, List, ListItem, ListItemText, ListItemIcon, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Popover, Tooltip, Tabs, Tab } from '@mui/material';
// Import Global styles component from MUI
import { GlobalStyles } from '@mui/material';
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
import { IncomeTable } from './IncomeTable';
import { EnhancedTransactionTable } from './EnhancedTransactionTable';
import { BudgetActions } from './BudgetActions';
import { useTransactions } from '../hooks/useTransactions';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { UserMenu } from './auth/UserMenu';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from '../hooks/useLocalStorage';

// Simple fallback component in case the import fails
// You can replace this with the actual implementation when needed
const SimplifiedManualTransactionEntry = React.memo(({ 
  onAddTransaction 
}: { 
  onAddTransaction: (transaction: Transaction) => void 
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'Income' | 'Essentials' | 'Wants' | 'Savings'>('Income');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (!isNaN(parsedAmount) && description) {
      const signedAmount = category === 'Income' ? Math.abs(parsedAmount) : -Math.abs(parsedAmount);
      
      onAddTransaction({
        date: new Date(date),
        description,
        amount: signedAmount,
        category
      });
      
      // Reset form
      setDescription('');
      setAmount('');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={2}>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <TextField
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            required
            type="number"
            InputProps={{
              startAdornment: <span style={{ marginRight: 8 }}>$</span>,
            }}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            >
              <MenuItem value="Income">Income</MenuItem>
              <MenuItem value="Essentials">Essentials</MenuItem>
              <MenuItem value="Wants">Wants</MenuItem>
              <MenuItem value="Savings">Savings</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            Add
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
});

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

// Main App Component
function BudgetAppContent() {
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
  
  // Color picker state - use useLocalStorage hook directly for this
  const [tableColors, setTableColors] = useLocalStorage<Record<string, string>>(
    STORAGE_KEYS.TABLE_COLORS,
    LEGACY_STORAGE_KEYS.TABLE_COLORS,
    {
      'Essentials': '#f5f5f5', // Default light gray
      'Wants': '#f5f5f5',
      'Savings': '#f5f5f5',
      'Income': '#f5f5f5'
    }
  );
  
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

  // Auth state
  const { isAuthenticated, isLoading: authLoading, user, logout, login, signup, error } = useAuth();
  const [activeAuthTab, setActiveAuthTab] = useState(0);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    loginEmail?: string;
    loginPassword?: string;
    signupName?: string;
    signupEmail?: string;
    signupPassword?: string;
    signupConfirmPassword?: string;
  }>({});
  
  // Handle login form submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous errors
    setFormErrors({});
    
    // Validate form
    let isValid = true;
    const errors: typeof formErrors = {};
    
    if (!loginEmail) {
      errors.loginEmail = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(loginEmail)) {
      errors.loginEmail = 'Email is invalid';
      isValid = false;
    }
    
    if (!loginPassword) {
      errors.loginPassword = 'Password is required';
      isValid = false;
    }
    
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    
    // Submit form
    await login(loginEmail, loginPassword);
  };
  
  // Handle signup form submission
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous errors
    setFormErrors({});
    
    // Validate form
    let isValid = true;
    const errors: typeof formErrors = {};
    
    if (!signupName) {
      errors.signupName = 'Name is required';
      isValid = false;
    }
    
    if (!signupEmail) {
      errors.signupEmail = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(signupEmail)) {
      errors.signupEmail = 'Email is invalid';
      isValid = false;
    }
    
    if (!signupPassword) {
      errors.signupPassword = 'Password is required';
      isValid = false;
    } else if (signupPassword.length < 6) {
      errors.signupPassword = 'Password must be at least 6 characters';
      isValid = false;
    }
    
    if (!signupConfirmPassword) {
      errors.signupConfirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (signupPassword !== signupConfirmPassword) {
      errors.signupConfirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    
    // Submit form
    await signup(signupEmail, signupPassword, signupName);
  };
  
  const [tableHover, setTableHover] = useState<number | null>(null);

  const steps = ['Enter Transactions', 'Review Transactions', 'View Budget Plan'];

  // Memoize handlers to prevent recreation on every render
  const handleNext = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setActiveStep((prevStep) => prevStep + 1);
      setIsLoading(false);
    }, 500); // Simulate loading for a smoother transition
  }, []);

  const handleBack = useCallback(() => {
    setActiveStep((prevStep) => prevStep - 1);
  }, []);

  const handleReset = useCallback(() => {
    // Clear all data using the hook function
    resetTransactions();
    setActiveStep(0);
    
    setAlertMessage({
      type: 'success',
      message: 'All data has been reset. Start fresh with a new budget!'
    });
  }, [resetTransactions, setAlertMessage]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, transaction: Transaction, index: number) => {
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
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategory !== category) {
      setDragOverCategory(category);
    }
  }, [dragOverCategory]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetCategory: string) => {
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
  }, [draggedTransaction, moveTransaction]);
  
  // Clear any drag/drop/animation states when mouse leaves a draggable area
  const handleDragLeave = useCallback(() => {
    setDragOverCategory(null);
  }, []);

  // Handle opening the color picker
  const handleOpenColorPicker = useCallback((event: React.MouseEvent<HTMLElement>, category: string) => {
    setColorPickerAnchor(event.currentTarget);
    setCurrentCategory(category);
  }, []);
  
  // Handle closing the color picker
  const handleCloseColorPicker = useCallback(() => {
    setColorPickerAnchor(null);
    setCurrentCategory(null);
  }, []);
  
  // Handle color selection
  const handleColorSelect = useCallback((color: string) => {
    if (!currentCategory) return;
    
    const updatedColors = {
      ...tableColors,
      [currentCategory]: color
    };
    
    setTableColors(updatedColors);
    setColorPickerAnchor(null);
    setCurrentCategory(null);
  }, [currentCategory, tableColors, setTableColors]);

  // Handle opening auth modal
  const handleOpenAuthModal = useCallback(() => {
    // Instead of opening the modal, we'll set the active tab to Login
    setActiveAuthTab(0);
  }, []);
  
  // Handle closing auth modal
  const handleCloseAuthModal = useCallback(() => {
    // Instead of closing the modal, we'll do nothing as the modal is no longer used
  }, []);
  
  // Handler for user not logged in
  const handleNotLoggedIn = useCallback(() => {
    // Instead of opening the modal, we'll set the active tab to Login
    setActiveAuthTab(0);
  }, [setActiveAuthTab]);

  // Memoize the transaction tables to prevent unnecessary re-renders
  const transactionTables = useMemo(() => {
    if (transactions.length === 0) return null;
    
    return (
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
    );
  }, [
    transactions, 
    updateTransaction, 
    deleteTransaction, 
    getTransactionsByCategory, 
    handleDragStart, 
    handleDragOver, 
    handleDrop, 
    dragOverCategory, 
    recentlyDropped
  ]);

  // Memoize the budget summary component to prevent unnecessary re-renders
  const budgetSummaryComponent = useMemo(() => {
    if (!transactions.length || !budgetSummary || !budgetPlan) return null;
    
    return (
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 2, backgroundColor: 'background.paper' }}>
          <BudgetActions onReset={handleReset} />
          <BudgetSummary 
            summary={budgetSummary} 
            plan={budgetPlan} 
            suggestions={suggestions}
          />
        </Paper>
      </Box>
    );
  }, [transactions.length, budgetSummary, budgetPlan, suggestions, handleReset]);
  
  // If user is not authenticated, show an elegant login screen
  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        width: '100%', 
        backgroundColor: 'background.default',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 4 },
        position: 'relative',
        overflow: 'hidden',
        zIndex: 0,
      }}>
        {/* Background Video */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1,
            overflow: 'hidden',
            // Animated background gradient with more blue tones
            background: 'linear-gradient(135deg, #0A1931, #185ADB, #1E3A8A)',
            backgroundSize: '400% 400%',
            animation: 'gradientAnimation 15s ease infinite',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)',
              zIndex: 2,
            },
            // Add floating financial elements for visual interest
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              // Finance-themed pattern with dollar signs, coins, and charts
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M12 8c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4zm8 13c3.3 0 6-2.7 6-6s-2.7-6-6-6-6 2.7-6 6 2.7 6 6 6zm-8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm52 6c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4zM28 32c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4z'/%3E%3Cpath d='M60 60c4.4 0 8-3.6 8-8s-3.6-8-8-8-8 3.6-8 8 3.6 8 8 8zm-8 4c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4zm-16-8c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm64 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z'/%3E%3C/g%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M35 25h2v10h-2zM35 45h10v2h-10zM35 35h10v2h-10zM35 15h10v2h-10zM85 45h-10v2h10zM85 35h-10v2h10zM85 25h-10v2h10zM85 15h-10v2h10zM75 85h10v-2h-10zM65 85h-10v-2h10zM55 85h-10v-2h10zM75 95h-10v-2h10zM35 95h10v-2h-10zM25 95h-10v-2h10z'/%3E%3Cpath d='M50 20c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V22c0-1.1-.9-2-2-2H50zm0 2h20v16H50V22z'/%3E%3Cpath d='M53 33h2v-8h-2v8zm4 0h2v-8h-2v3h-1v2h1v3zm4 0h2v-8h-2v3h-1v2h1v3zm4 0h2v-8h-2v8z'/%3E%3Cpath d='M60 75c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15zm0 2c7.2 0 13 5.8 13 13s-5.8 13-13 13-13-5.8-13-13 5.8-13 13-13z'/%3E%3Cpath d='M57 86v-2h7v-2h-4c-1.1 0-2-.9-2-2v-2c0-1.1.9-2 2-2h3v-1h2v1h4v2h-7v2h4c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-3v1h-2v-1h-4z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '600px 600px',
              animation: 'floatingParticles 120s linear infinite',
              zIndex: 1,
              opacity: 0.7,
            },
          }}
        />

        {/* Add CSS animations to the global style */}
        <GlobalStyles
          styles={{
            '@keyframes gradientAnimation': {
              '0%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' },
              '100%': { backgroundPosition: '0% 50%' }
            },
            '@keyframes floatingParticles': {
              '0%': { backgroundPosition: '0px 0px' },
              '100%': { backgroundPosition: '1000px 1000px' }
            }
          }}
        />

        <Box 
          sx={{ 
            width: '100%',
            maxWidth: 500, 
            textAlign: 'center',
            mb: 4,
            zIndex: 2,
            color: 'white',
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              mb: 3
            }}
          >
            <Box 
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white', 
                p: 1, 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </Box>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'white',
                fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              }}
            >
              Friendly Budgets
            </Typography>
          </Box>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 2, 
              fontWeight: 600,
              color: 'white',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
          >
            Take control of your finances
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 4, 
              color: 'rgba(255,255,255,0.9)',
              fontSize: '1.1rem',
              maxWidth: 450,
              mx: 'auto',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            Sign in to access your personalized budget dashboard. Track spending, set goals, and make smarter financial decisions.
          </Typography>
        </Box>
        
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 3,
            width: '100%',
            maxWidth: 450,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid',
            borderColor: 'divider',
            mb: 4,
            zIndex: 2,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Auth forms directly integrated into the login page */}
          <Box sx={{ width: '100%' }}>
            <Tabs 
              value={activeAuthTab} 
              onChange={(e, newValue) => setActiveAuthTab(newValue)} 
              variant="fullWidth"
              sx={{
                mb: 3,
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '1rem',
                }
              }}
            >
              <Tab label="Log In" />
              <Tab label="Sign Up" />
            </Tabs>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {activeAuthTab === 0 ? (
              // Login Form
              <Box component="form" onSubmit={handleLoginSubmit} noValidate>
                <TextField
                  label="Email Address"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  error={!!formErrors.loginEmail}
                  helperText={formErrors.loginEmail}
                  disabled={authLoading}
                  required
                />
                <TextField
                  label="Password"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  error={!!formErrors.loginPassword}
                  helperText={formErrors.loginPassword}
                  disabled={authLoading}
                  required
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ 
                    mt: 3, 
                    mb: 2, 
                    py: 1.5, 
                    fontWeight: 600, 
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(59,130,246,1) 100%)',
                    '&:hover': {
                      background: 'linear-gradient(90deg, rgba(29,78,216,1) 0%, rgba(37,99,235,1) 100%)',
                    }
                  }}
                  disabled={authLoading}
                >
                  {authLoading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
                </Button>
                <Typography variant="body2" align="center" color="textSecondary">
                  Don't have an account?{' '}
                  <Button 
                    color="primary" 
                    size="small" 
                    onClick={() => setActiveAuthTab(1)}
                    sx={{ fontWeight: 600, p: 0, minWidth: 'auto' }}
                  >
                    Sign up now
                  </Button>
                </Typography>
              </Box>
            ) : (
              // Signup Form
              <Box component="form" onSubmit={handleSignupSubmit} noValidate>
                <TextField
                  label="Full Name"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  autoComplete="name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  error={!!formErrors.signupName}
                  helperText={formErrors.signupName}
                  disabled={authLoading}
                  required
                />
                <TextField
                  label="Email Address"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  error={!!formErrors.signupEmail}
                  helperText={formErrors.signupEmail}
                  disabled={authLoading}
                  required
                />
                <TextField
                  label="Password"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  type="password"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  error={!!formErrors.signupPassword}
                  helperText={formErrors.signupPassword}
                  disabled={authLoading}
                  required
                />
                <TextField
                  label="Confirm Password"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  type="password"
                  autoComplete="new-password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  error={!!formErrors.signupConfirmPassword}
                  helperText={formErrors.signupConfirmPassword}
                  disabled={authLoading}
                  required
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ 
                    mt: 3, 
                    mb: 2, 
                    py: 1.5, 
                    fontWeight: 600, 
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(59,130,246,1) 100%)',
                    '&:hover': {
                      background: 'linear-gradient(90deg, rgba(29,78,216,1) 0%, rgba(37,99,235,1) 100%)',
                    }
                  }}
                  disabled={authLoading}
                >
                  {authLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                </Button>
                <Typography variant="body2" align="center" color="textSecondary">
                  Already have an account?{' '}
                  <Button 
                    color="primary" 
                    size="small" 
                    onClick={() => setActiveAuthTab(0)}
                    sx={{ fontWeight: 600, p: 0, minWidth: 'auto' }}
                  >
                    Log in
                  </Button>
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
        
        {/* Feature highlights */}
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 3,
            width: '100%',
            maxWidth: 900,
            zIndex: 2,
          }}
        >
          {[
            {
              title: 'Track Expenses',
              description: 'Easily record and categorize your spending to see where your money goes',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              )
            },
            {
              title: 'Set Budgets',
              description: 'Create personalized budget plans based on your income and spending habits',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              )
            },
            {
              title: 'Achieve Goals',
              description: 'Get insights and recommendations to help you reach your financial goals',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              )
            }
          ].map((feature, index) => (
            <Paper
              key={index}
              sx={{
                p: 3,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                border: '1px solid',
                borderColor: 'divider',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Box 
                sx={{ 
                  color: 'primary.main', 
                  backgroundColor: 'primary.light',
                  p: 1.5,
                  borderRadius: '50%',
                  mb: 2
                }}
              >
                {feature.icon}
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {feature.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {feature.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      backgroundColor: 'background.default',
      mx: 'auto', // Center the content
    }}>
      <Box 
        sx={{ 
          p: 2,
          mb: 3,
          background: 'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(59,130,246,1) 100%)',
          borderRadius: { xs: 0, sm: '0 0 1rem 1rem' },
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        {/* Add auth actions menu/button to the top right */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 24,
            zIndex: 2,
          }}
        >
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleOpenAuthModal}
              sx={{
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Login / Sign Up
            </Button>
          )}
        </Box>
      
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 2,
            transition: 'transform 0.3s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Box 
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.main', 
              p: 1, 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 4px rgba(255,255,255,0.2)'
            }}
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 800,
              textShadow: '0px 2px 4px rgba(0,0,0,0.2)',
              letterSpacing: '0.02em',
              fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            Friendly Budgets
          </Typography>
        </Box>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mt: 1, 
            opacity: 0.9, 
            fontWeight: 400,
            textAlign: 'center',
            maxWidth: '600px',
            fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          Simplify your finances, track your spending, and achieve your money goals
        </Typography>
      </Box>
      
      {/* Auth Modal */}
      {/* AuthModal
        open={authModalOpen}
        onClose={handleCloseAuthModal}
      /> */}
      
      {/* Alert Messages */}
      {alertMessage && (
        <Alert 
          severity={alertMessage.type} 
          sx={{ mb: 3, mx: 3 }}
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage.message}
        </Alert>
      )}
      
      {/* Main Content */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3, backgroundColor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Manual Transaction Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter your transactions below to create your budget plan.
          </Typography>
          
          <SimplifiedManualTransactionEntry onAddTransaction={addTransaction} />
          
          {/* Add Speech Recognition */}
          <SpeechRecognition 
            onAddTransaction={addTransaction} 
            onUpdateTransaction={updateTransactionByDescription}
            transactions={transactions}
          />
        </Paper>

        {/* Display transactions */}
        {transactionTables}
      
        {/* Always show budget summary if we have transactions */}
        {budgetSummaryComponent}

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

// Wrap the BudgetApp with the AuthProvider
export function BudgetApp() {
  return (
    <AuthProvider>
      <BudgetAppContent />
    </AuthProvider>
  );
} 