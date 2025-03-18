import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Box, Typography, Stepper, Step, StepLabel, Paper, Button, CircularProgress, Alert, List, ListItem, ListItemText, ListItemIcon, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Popover, Tooltip, Tabs, Tab, Chip, Menu, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
// Import Global styles component from MUI
import { GlobalStyles } from '@mui/material';
// Import custom icon components to avoid the directory import issue
import { EditOutlinedIcon, SaveIcon, CloseIcon, DragIndicatorIcon, PaletteIcon, DeleteIcon } from '../utils/materialIcons';
import { HexColorPicker } from 'react-colorful';
import { BudgetSummary } from './BudgetSummary';
import type { Transaction } from '../services/fileParser';
import type { User } from '../contexts/AuthContext';
import {
  calculateBudgetSummary,
  create503020Plan,
  getBudgetSuggestions,
  type BudgetSummary as BudgetSummaryType,
  type BudgetPlan
} from '../services/budgetCalculator';
import { TransactionTable } from './transactions/TransactionTable';
import { BudgetActions } from './BudgetActions';
import { useTransactions } from '../hooks/useTransactions';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import UserMenu from './auth/UserMenu';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from '../hooks/useLocalStorage';
import { ThemeProvider } from '../contexts/ThemeContext';
import { MonthSelector } from './MonthSelector';
import { saveUserPreferences, getUserPreferences } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { BudgetPreferences } from './BudgetActions';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { SavingsProvider } from '../contexts/SavingsContext';
import { SmartInsights } from './SmartInsights';

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

// BudgetSelector component for switching between different budgets
const BudgetSelector: React.FC<{ 
  setCurrentBudgetId: (budgetId: string) => void;
  setAlertMessage: (message: { type: 'success' | 'error' | 'warning' | 'info'; message: string } | null) => void;
}> = ({ setCurrentBudgetId, setAlertMessage }) => {
  const [budgets, setBudgets] = useState<Array<{ id: string; name: string; createdAt: string; color?: string }>>([]);
  const [currentBudget, setCurrentBudget] = useState<string>('');
  const [newBudgetName, setNewBudgetName] = useState('');
  const [showNewBudgetField, setShowNewBudgetField] = useState(false);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Add state for menu and color picker
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [budgetColorPickerAnchor, setBudgetColorPickerAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Add state for temporary color while picking
  const [tempBudgetColor, setTempBudgetColor] = useState<string>('#f5f5f5');
  
  const { user } = useAuth();

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, budgetId: string) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedBudget(budgetId);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedBudget(null);
  };

  // Handle rename action
  const handleRenameClick = () => {
    if (selectedBudget) {
      const budget = budgets.find(b => b.id === selectedBudget);
      if (budget) {
        setEditingBudget(selectedBudget);
        setEditName(budget.name);
      }
    }
    handleMenuClose();
  };

  // Handle color picker open
  const handleColorPickerOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (selectedBudget) {
      const currentColor = budgets.find(b => b.id === selectedBudget)?.color || '#f5f5f5';
      setTempBudgetColor(currentColor);
      setBudgetColorPickerAnchor(event.currentTarget);
    }
  };

  // Handle real-time color updates
  const handleColorChange = (color: string) => {
    setTempBudgetColor(color);
    // Update local state immediately for visual feedback
    if (selectedBudget) {
      const updatedBudgets = budgets.map((budget) =>
        budget.id === selectedBudget ? { ...budget, color } : budget
      );
      setBudgets(updatedBudgets);
    }
  };

  // Handle final color selection
  const handleColorSelect = async () => {
    if (!selectedBudget || !user) return;
    
    try {
      // Update the budget document with the new color
      const budgetRef = doc(db, 'users', user.id, 'budgets', selectedBudget);
      await updateDoc(budgetRef, {
        color: tempBudgetColor
      });
      
      // Update user preferences to store the color
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      const existingPreferences = userDoc.exists() ? userDoc.data()?.preferences || {} : {};
      const existingBudgetColors = existingPreferences.budgetColors || {};
      
      await updateDoc(userDocRef, {
        preferences: {
          ...existingPreferences,
          budgetColors: {
            ...existingBudgetColors,
            [selectedBudget]: tempBudgetColor
          }
        }
      });

      // Update local state
      const updatedBudgets = budgets.map((budget) =>
        budget.id === selectedBudget ? { ...budget, color: tempBudgetColor } : budget
      );
      setBudgets(updatedBudgets);
      
      setAlertMessage({
        type: 'success',
        message: 'Budget color updated successfully'
      });
    } catch (error) {
      console.error('[BudgetSelector] Error updating budget color:', error);
      setAlertMessage({
        type: 'error',
        message: 'Failed to update budget color. Please try again.'
      });
      
      // Revert local state on error
      const updatedBudgets = budgets.map(b =>
        b.id === selectedBudget ? { ...b, color: budgets.find(orig => orig.id === selectedBudget)?.color || '#f5f5f5' } : b
      );
      setBudgets(updatedBudgets);
    }
    
    // Close both the color picker and the menu
    setBudgetColorPickerAnchor(null);
    setSelectedBudget(null);
    setTempBudgetColor('#f5f5f5');
    handleMenuClose(); // Add this line to close the menu
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedBudget || !user) return;
    
    try {
      // Don't allow deleting the last budget
      if (budgets.length <= 1) {
        setAlertMessage({
          type: 'error',
          message: 'Cannot delete the last budget. Create a new budget first.'
        });
        return;
      }

      console.log('[BudgetSelector] Deleting budget:', selectedBudget);
      
      // Delete all transactions for this budget
      const transactionsRef = collection(db, 'users', user.id, 'budgets', selectedBudget, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      // Use a batch to delete all transactions and the budget
      const batch = writeBatch(db);
      
      // Add transaction deletes to batch
      transactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Add budget delete to batch
      batch.delete(doc(db, 'users', user.id, 'budgets', selectedBudget));
      
      // Commit the batch
      await batch.commit();
      
      // Update local state
      const updatedBudgets = budgets.filter(b => b.id !== selectedBudget);
      setBudgets(updatedBudgets);
      
      // If we're deleting the current budget, switch to another one
      if (currentBudget === selectedBudget) {
        const newCurrentBudget = updatedBudgets[0];
        setCurrentBudget(newCurrentBudget.id);
        setCurrentBudgetId(newCurrentBudget.id);
        
        // Update user preferences
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          'preferences.lastSelectedBudget': newCurrentBudget.id
        });
      }
      
      setAlertMessage({
        type: 'success',
        message: 'Budget and its transactions deleted successfully'
      });
    } catch (error) {
      console.error('[BudgetSelector] Error deleting budget:', error);
      setAlertMessage({
        type: 'error',
        message: 'Failed to delete budget. Please try again.'
      });
    }
    
    setDeleteDialogOpen(false);
    handleMenuClose();
  };

  // Load budgets from Firebase when component mounts
  useEffect(() => {
    const loadBudgets = async () => {
      if (user) {
        try {
          console.log('[BudgetSelector] Loading budgets for user:', user.id);
          const budgetsCollectionRef = collection(db, 'users', user.id, 'budgets');
          const budgetsSnapshot = await getDocs(budgetsCollectionRef);
          
          // Get the user's preferences to check for lastSelectedBudget
          const userDocRef = doc(db, 'users', user.id);
          const userDoc = await getDoc(userDocRef);
          const lastSelectedBudget = userDoc.exists() ? userDoc.data()?.preferences?.lastSelectedBudget : null;
          
          if (!budgetsSnapshot.empty) {
            const loadedBudgets = budgetsSnapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data().name,
              createdAt: doc.data().createdAt || new Date().toISOString(),
              color: doc.data().color
            }));
            
            // Sort budgets by creation date (oldest first)
            const sortedBudgets = loadedBudgets.sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            
            console.log('[BudgetSelector] Loaded budgets:', sortedBudgets);
            setBudgets(sortedBudgets);
            
            // Set current budget to the last selected budget if it exists, otherwise use the first one
            const budgetToSelect = lastSelectedBudget && sortedBudgets.find(b => b.id === lastSelectedBudget)
              ? lastSelectedBudget
              : sortedBudgets[0].id;
              
            console.log('[BudgetSelector] Setting current budget to:', budgetToSelect);
            setCurrentBudget(budgetToSelect);
            setCurrentBudgetId(budgetToSelect);
          } else {
            // If no budgets exist, create a default one
            console.log('[BudgetSelector] No budgets found, creating default budget');
            const defaultBudget = { 
              name: 'Main Budget',
              createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(
              collection(db, 'users', user.id, 'budgets'), 
              defaultBudget
            );
            console.log('[BudgetSelector] Created default budget with ID:', docRef.id);
            setBudgets([{ id: docRef.id, name: defaultBudget.name, createdAt: defaultBudget.createdAt }]);
            setCurrentBudget(docRef.id);
            setCurrentBudgetId(docRef.id);
            
            // Save this as the last selected budget
            await updateDoc(userDocRef, {
              'preferences.lastSelectedBudget': docRef.id
            });
          }
        } catch (error) {
          console.error('[BudgetSelector] Error loading budgets:', error);
          // Keep default budgets in case of error
        }
      }
    };
    
    loadBudgets();
  }, [user, setCurrentBudgetId]);

  const handleAddBudget = async () => {
    if (newBudgetName.trim() && user) {
      try {
        console.log('[BudgetSelector] Creating new budget:', newBudgetName);
        const createdAt = new Date().toISOString();
        // Create a new budget document in Firebase
        const newBudgetRef = await addDoc(
          collection(db, 'users', user.id, 'budgets'),
          { 
            name: newBudgetName.trim(),
            createdAt,
            transactionCount: 0
          }
        );
        
        // Initialize an empty transactions collection for the new budget
        const transactionsCollectionRef = collection(db, 'users', user.id, 'budgets', newBudgetRef.id, 'transactions');
        // We don't need to add any documents, just ensuring the collection path exists
        
        console.log('[BudgetSelector] Created new budget with empty transactions collection:', newBudgetRef.id);
        
        const newBudget = {
          id: newBudgetRef.id,
          name: newBudgetName.trim(),
          createdAt
        };
        
        // Add the new budget and sort the list (oldest first)
        const updatedBudgets = [...budgets, newBudget].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        console.log('[BudgetSelector] Created new budget:', newBudget);
        setBudgets(updatedBudgets);
        setCurrentBudget(newBudget.id);
        setCurrentBudgetId(newBudget.id);
        setNewBudgetName('');
        setShowNewBudgetField(false);
        
        // Save this as the last selected budget
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          'preferences.lastSelectedBudget': newBudget.id
        });
      } catch (error) {
        console.error('[BudgetSelector] Error creating new budget:', error);
      }
    }
  };

  const handleBudgetChange = async (budgetId: string) => {
    console.log('[BudgetSelector] Switching to budget:', budgetId);
    setCurrentBudget(budgetId);
    setCurrentBudgetId(budgetId);
    
    // Save the selected budget in user preferences
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          'preferences.lastSelectedBudget': budgetId
        });
      } catch (error) {
        console.error('[BudgetSelector] Error saving budget preference:', error);
      }
    }
  };

  // Add edit budget name function
  const handleEditBudget = async (budgetId: string) => {
    if (!user || !editName.trim()) return;
    
    try {
      console.log('[BudgetSelector] Updating budget name:', {
        budgetId,
        newName: editName
      });
      
      // Update the budget document
      await updateDoc(doc(db, 'users', user.id, 'budgets', budgetId), {
        name: editName.trim()
      });
      
      // Update local state
      const updatedBudgets = budgets.map(b => 
        b.id === budgetId ? { ...b, name: editName.trim() } : b
      );
      setBudgets(updatedBudgets);
      
      // Clear editing state
      setEditingBudget(null);
      setEditName('');
      
      setAlertMessage({
        type: 'success',
        message: 'Budget name updated successfully'
      });
    } catch (error) {
      console.error('[BudgetSelector] Error updating budget name:', error);
      setAlertMessage({
        type: 'error',
        message: 'Failed to update budget name. Please try again.'
      });
    }
  };

  // Handle color picker close
  const handleColorPickerClose = () => {
    // Revert to original color if cancelled
    if (selectedBudget) {
      const originalColor = budgets.find((budget) => budget.id === selectedBudget)?.color || '#f5f5f5';
      const updatedBudgets = budgets.map((budget) =>
        budget.id === selectedBudget ? { ...budget, color: originalColor } : budget
      );
      setBudgets(updatedBudgets);
    }
    setBudgetColorPickerAnchor(null);
    setSelectedBudget(null);
    setTempBudgetColor('#f5f5f5');
  };

  return (
    <Paper 
      elevation={1}
      sx={{
        mb: 2,
        p: 1,
        borderRadius: 2,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1
      }}
    >
      <Typography variant="subtitle2" sx={{ mr: 1, color: 'text.secondary' }}>
        Budget:
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flexGrow: 1 }}>
        {budgets.map(budget => (
          <Box key={budget.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {editingBudget === budget.id ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  size="small"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEditBudget(budget.id)}
                  autoFocus
                  sx={{ 
                    maxWidth: '150px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    }
                  }}
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={() => handleEditBudget(budget.id)}
                  >
                    <SaveIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setEditingBudget(null);
                      setEditName('');
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Box>
            ) : (
              <Chip
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{budget.name}</span>
                    <Box 
                      component="span" 
                      onClick={(e) => handleMenuOpen(e, budget.id)}
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        ml: 'auto',
                        mr: -0.5,
                        '&:hover': {
                          '& .editIcon': {
                            opacity: 1
                          }
                        }
                      }}
                    >
                      <EditOutlinedIcon 
                        className="editIcon"
                        fontSize="small" 
                        sx={{ 
                          opacity: 0.3,
                          transition: 'opacity 0.2s',
                          width: '16px',
                          height: '16px'
                        }} 
                      />
                    </Box>
                  </Box>
                }
                onClick={() => handleBudgetChange(budget.id)}
                color={currentBudget === budget.id ? "primary" : "default"}
                variant={currentBudget === budget.id ? "filled" : "outlined"}
                sx={{ 
                  height: 36,
                  borderRadius: 1.5,
                  pl: 1.5,
                  pr: 1.5,
                  fontWeight: currentBudget === budget.id ? 600 : 400,
                  opacity: currentBudget === budget.id ? 1 : 0.2,
                  transition: 'all 0.2s ease',
                  ...(budget.color ? {
                    bgcolor: budget.color,
                    color: isColorDark(budget.color) ? 'white' : 'black',
                    borderColor: 'transparent',
                    '&:hover': {
                      bgcolor: `${budget.color} !important`,
                      opacity: currentBudget === budget.id ? 1 : 0.6
                    }
                  } : {
                    '&:hover': {
                      bgcolor: 'transparent !important',
                      opacity: currentBudget === budget.id ? 1 : 0.6
                    }
                  })
                }}
              />
            )}
          </Box>
        ))}
      </Box>
      
      {showNewBudgetField ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Budget name"
            value={newBudgetName}
            onChange={(e) => setNewBudgetName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddBudget()}
            autoFocus
            variant="outlined"
            sx={{ maxWidth: '200px' }}
          />
          <IconButton size="small" color="primary" onClick={handleAddBudget}>
            <SaveIcon />
          </IconButton>
          <IconButton size="small" onClick={() => setShowNewBudgetField(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      ) : (
        <Tooltip title="Add New Budget" arrow>
          <Button
            size="small"
            onClick={() => setShowNewBudgetField(true)}
            variant="outlined"
            disabled={!user}
            sx={{ 
              minWidth: 'unset',
              width: '36px',
              height: '36px',
              p: 0,
              borderRadius: 1.5
            }}
          >
            +
          </Button>
        </Tooltip>
      )}

      {/* Budget Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleRenameClick}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setDeleteDialogOpen(true)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete Budget</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleColorPickerOpen}>
          <ListItemIcon>
            <PaletteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Update Color</ListItemText>
        </MenuItem>
      </Menu>

      {/* Color Picker Popover for Budgets */}
      <Popover
        open={Boolean(budgetColorPickerAnchor)}
        anchorEl={budgetColorPickerAnchor}
        onClose={handleColorPickerClose}
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
            Select budget color
          </Typography>
          <HexColorPicker 
            color={tempBudgetColor}
            onChange={handleColorChange}
            style={{ width: '100%', height: 200 }}
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '50%', 
                bgcolor: tempBudgetColor,
                border: '1px solid #ccc'
              }} 
            />
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {tempBudgetColor}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                onClick={handleColorPickerClose}
              >
                Cancel
              </Button>
              <Button 
                size="small" 
                variant="contained" 
                onClick={handleColorSelect}
              >
                Done
              </Button>
            </Box>
          </Box>
        </Box>
      </Popover>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Budget</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this budget? This action cannot be undone and will delete all transactions associated with this budget.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// Add storage keys for preferences
const PREFERENCES_KEY = 'friendlyBudgets_preferences';
const LEGACY_PREFERENCES_KEY = 'budgetFriendly_preferences';

// Main App Component
const BudgetAppContent: React.FC = () => {
  const theme = useMuiTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [recentlyDropped, setRecentlyDropped] = useState<string | null>(null);
  const [draggedTransaction, setDraggedTransaction] = useState<{
    transaction: Transaction;
    index: number;
  } | null>(null);
  
  // Get current month name for default selection
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const [selectedMonths, setSelectedMonths] = useState<string[]>([currentMonth]);
  
  // Initialize preferences with default values
  const [preferences, setPreferences] = useLocalStorage<BudgetPreferences>(
    PREFERENCES_KEY,
    LEGACY_PREFERENCES_KEY,
    {
      ratios: {
        essentials: 50,
        wants: 30,
        savings: 20
      },
      categoryCustomization: {
        essentials: {
          name: 'Essentials',
          color: theme.palette.primary.main,
          icon: '🏠'
        },
        wants: {
          name: 'Wants',
          color: theme.palette.secondary.main,
          icon: '🛍️'
        },
        savings: {
          name: 'Savings',
          color: theme.palette.success.main,
          icon: '💰'
        }
      },
      chartPreferences: {
        showPieChart: true,
        showBarChart: true,
        showProgressBars: true,
        showSuggestions: true
      },
      displayPreferences: {
        showActualAmounts: true,
        showPercentages: true,
        showDifferences: true
      }
    }
  );
  
  // Load user preferences from Firebase when component mounts or user changes
  const { user } = useAuth();
  
  // Add state for tracking if user has seen getting started
  const [hasSeenGettingStarted, setHasSeenGettingStarted] = useState(false);
  
  // State to keep track of the current budget ID
  const [initialBudgetId, setInitialBudgetId] = useState<string | undefined>(undefined);
  
  // Load initial budget ID from Firebase
  useEffect(() => {
    const loadInitialBudget = async () => {
      if (user) {
        try {
          console.log('[BudgetAppContent] Loading initial budget for user:', user.id);
          const budgetsCollectionRef = collection(db, 'users', user.id, 'budgets');
          const budgetsSnapshot = await getDocs(budgetsCollectionRef);
          
          if (!budgetsSnapshot.empty) {
            // Use the ID of the first budget as the initial budget ID
            const firstBudgetId = budgetsSnapshot.docs[0].id;
            console.log('[BudgetAppContent] Setting initial budget ID to:', firstBudgetId);
            setInitialBudgetId(firstBudgetId);
          } else {
            // If no budgets exist, create a default one
            console.log('[BudgetAppContent] No budgets found, creating default budget');
            const defaultBudget = { 
              name: 'Main Budget',
              createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(
              collection(db, 'users', user.id, 'budgets'), 
              defaultBudget
            );
            console.log('[BudgetAppContent] Created default budget with ID:', docRef.id);
            setInitialBudgetId(docRef.id);
          }
        } catch (error) {
          console.error('[BudgetAppContent] Error loading initial budget:', error);
        }
      }
    };
    
    loadInitialBudget();
  }, [user]);
  
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const preferences = userDoc.data()?.preferences || {};
          setSelectedMonths(preferences.selectedMonths || [currentMonth]);
          setHasSeenGettingStarted(preferences.hasSeenGettingStarted || false);
        }
      }
    };
    loadUserPreferences();
  }, [user, currentMonth]);

  // Save selected months to Firebase whenever they change
  useEffect(() => {
    const savePreferences = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        const existingPreferences = userDoc.exists() ? userDoc.data()?.preferences || {} : {};
        
        await updateDoc(userDocRef, {
          preferences: {
            ...existingPreferences,
            selectedMonths,
            hasSeenGettingStarted: true, // Always set to true once they've seen it
            updatedAt: new Date().toISOString()
          }
        });
        setHasSeenGettingStarted(true);
      }
    };
    savePreferences();
  }, [selectedMonths, user]);
  
  // Use the transactions hook with the initial budget ID
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
    moveTransaction,
    reorderTransactions,
    currentBudgetId,
    setCurrentBudgetId
  } = useTransactions(initialBudgetId);
  
  // Color picker state - use useLocalStorage hook directly for this
  const [tableColors, setTableColors] = useState<{ [key: string]: string }>({
    Income: '#e3f2fd',
    Essentials: '#e8f5e9',
    Wants: '#fff3e0',
    Savings: '#f3e5f5'
  });
  const [tableColorPickerAnchor, setTableColorPickerAnchor] = useState<null | HTMLElement>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  
  // Auth state
  const { isAuthenticated, isLoading: authLoading, user: authUser, logout, login, signup, error } = useAuth();
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

  const handleReset = useCallback(async () => {
    try {
      // Clear all data using the hook function
      await resetTransactions();
      setActiveStep(0);
    } catch (error) {
      console.error('Error resetting budget:', error);
      setAlertMessage({
        type: 'error',
        message: 'Failed to reset your budget. Please try again.'
      });
    }
  }, [resetTransactions, setActiveStep, setAlertMessage]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, transaction: Transaction, index: number) => {
    // Set the drag data
    setDraggedTransaction({ transaction, index });
    
    // Add some visual feedback
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', transaction.description);
    
    // Add a class to the body to indicate dragging is in progress
    document.body.classList.add('dragging-active');
    
    // Note: The custom drag image is now created in the TransactionRow component
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
    
    // Remove the dragging class
    document.body.classList.remove('dragging-active');
    
    // Ensure we have a dragged transaction
    if (!draggedTransaction) return;
    
    // If dropping in the same category, this might be a reordering operation
    if (draggedTransaction.transaction.category === targetCategory) {
      // This will be handled by the handleReorder function
      // Reset dragged transaction
      setDraggedTransaction(null);
      return;
    }
    
    // If dropping in a different category, move the transaction
    if (draggedTransaction.transaction.category !== targetCategory) {
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

  // Handle reordering within a category
  const handleReorder = useCallback((category: string, sourceIndex: number, targetIndex: number) => {
    console.log(`Handling reorder for category: ${category}`, {
      sourceIndex,
      targetIndex,
      totalTransactions: transactions.length
    });
    
    // Get transactions for this category
    const categoryTransactions = transactions.filter(t => t.category === category);
    
    console.log(`Found ${categoryTransactions.length} transactions for category ${category}`);
    
    // Ensure indices are valid
    if (sourceIndex < 0 || sourceIndex >= transactions.length || 
        targetIndex < 0 || targetIndex >= transactions.length) {
      console.error('Invalid indices for reordering', { 
        sourceIndex, 
        targetIndex, 
        transactionsLength: transactions.length 
      });
      return;
    }
    
    try {
      // Get the actual transactions from the global indices
      const sourceTransaction = transactions[sourceIndex];
      const targetTransaction = transactions[targetIndex];
      
      if (!sourceTransaction || !targetTransaction) {
        console.error('Source or target transaction not found', {
          sourceFound: !!sourceTransaction,
          targetFound: !!targetTransaction,
          sourceIndex,
          targetIndex
        });
        return;
      }
      
      console.log('Reordering transactions:', {
        source: {
          description: sourceTransaction.description,
          category: sourceTransaction.category,
          index: sourceIndex,
          id: sourceTransaction.id,
          order: sourceTransaction.order
        },
        target: {
          description: targetTransaction.description,
          category: targetTransaction.category,
          index: targetIndex,
          id: targetTransaction.id,
          order: targetTransaction.order
        }
      });
      
      // Verify both transactions are in the same category
      if (sourceTransaction.category !== category || targetTransaction.category !== category) {
        console.error('Category mismatch during reordering', {
          expectedCategory: category,
          sourceCategory: sourceTransaction.category,
          targetCategory: targetTransaction.category
        });
        return;
      }
      
      // Create a new array with the reordered transactions
      const reordered = [...categoryTransactions];
      
      // Find the local indices within the category-filtered array
      const localSourceIndex = reordered.findIndex(t => t === sourceTransaction);
      const localTargetIndex = reordered.findIndex(t => t === targetTransaction);
      
      if (localSourceIndex === -1 || localTargetIndex === -1) {
        console.error('Could not find local indices for reordering', {
          localSourceIndex,
          localTargetIndex,
          category
        });
        return;
      }
      
      // Perform the reordering
      const [movedItem] = reordered.splice(localSourceIndex, 1);
      reordered.splice(localTargetIndex, 0, movedItem);
      
      // Get the IDs in the new order
      const orderedIds = reordered.map(t => t.id).filter(id => id !== undefined) as string[];
      
      if (orderedIds.length !== reordered.length) {
        console.warn(`Some transactions don't have IDs`, {
          totalTransactions: reordered.length,
          idsFound: orderedIds.length
        });
      }
      
      // Log the new order for debugging
      console.log(`New order for ${category}:`, {
        orderedIds,
        transactions: reordered.map(t => ({
          id: t.id,
          description: t.description,
          order: t.order
        }))
      });
      
      // Update the order in the database
      reorderTransactions(category, orderedIds);
    } catch (error) {
      console.error('Error during reordering:', error);
    }
  }, [transactions, reorderTransactions]);
  
  // Clear any drag/drop/animation states when mouse leaves a draggable area
  const handleDragLeave = useCallback(() => {
    setDragOverCategory(null);
  }, []);
  
  // Handle drag end
  const handleDragEnd = useCallback(() => {
    // Remove the dragging class
    document.body.classList.remove('dragging-active');
    
    // Reset drag state
    setDraggedTransaction(null);
    setDragOverCategory(null);
  }, []);

  // Auto-dismiss alert messages after 3 seconds
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 3000);
      
      // Clean up the timer if the component unmounts or alertMessage changes
      return () => clearTimeout(timer);
    }
  }, [alertMessage, setAlertMessage]);

  // Handle opening the color picker for transaction tables
  const handleOpenColorPicker = useCallback((event: React.MouseEvent<HTMLElement>, category: string) => {
    setTableColorPickerAnchor(event.currentTarget);
    setCurrentCategory(category);
  }, []);

  // Handle closing the color picker for transaction tables
  const handleCloseColorPicker = useCallback(() => {
    setTableColorPickerAnchor(null);
    setCurrentCategory(null);
  }, []);

  // Handle color selection for transaction tables
  const handleColorSelect = useCallback((color: string) => {
    if (!currentCategory) return;
    
    const updatedColors = {
      ...tableColors,
      [currentCategory]: color
    };
    
    setTableColors(updatedColors);
    setTableColorPickerAnchor(null);
    setCurrentCategory(null);
  }, [currentCategory, tableColors]);

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
    // Get income transactions separately since they're not included in getTransactionsByCategory
    const incomeTransactions = transactions.filter(t => t.category === 'Income');
    const otherTransactions = transactions.filter(t => t.category !== 'Income');

    console.log('[BudgetAppContent] Rendering transaction tables:', {
      budgetId: currentBudgetId,
      totalTransactions: transactions.length,
      incomeTransactions: incomeTransactions.length,
      otherTransactions: otherTransactions.length,
      transactions: transactions.map(t => ({
        id: t.id,
        category: t.category,
        amount: t.amount,
        description: t.description
      }))
    });

    // Define the expense categories we want to show
    const expenseCategories = ['Essentials', 'Wants', 'Savings'];

    return (
      <Box sx={{ 
        mt: 3,
        px: { xs: 1, sm: 2, md: 3 },
        maxWidth: '100%',
      }}>
        {/* Always show Income Table */}
        <TransactionTable
          key={`Income-${currentBudgetId}-${transactions.length}`}
          category="Income"
          transactions={incomeTransactions}
          allTransactions={transactions}
          onUpdateTransaction={updateTransaction}
          onDeleteTransaction={deleteTransaction}
          onAddTransaction={addTransaction}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          dragOverCategory={dragOverCategory}
          recentlyDropped={recentlyDropped}
          onReorder={handleReorder}
          selectedMonths={selectedMonths}
          month={currentMonth}
          isDark={isColorDark(tableColors['Income'])}
          onTransactionsChange={(newTransactions) => {
            newTransactions.forEach((transaction, index) => {
              const existingTransaction = transactions.find(t => t.id === transaction.id);
              if (existingTransaction) {
                const globalIndex = transactions.findIndex(t => t.id === transaction.id);
                if (globalIndex !== -1) {
                  updateTransaction(globalIndex, transaction);
                }
              }
            });
          }}
        />

        {/* Show category tables if there are income transactions */}
        {incomeTransactions.length > 0 && expenseCategories.map(category => (
          <TransactionTable
            key={`${category}-${currentBudgetId}-${transactions.length}`}
            category={category}
            transactions={transactions.filter(t => t.category === category)}
            allTransactions={transactions}
            onUpdateTransaction={updateTransaction}
            onDeleteTransaction={deleteTransaction}
            onAddTransaction={addTransaction}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverCategory={dragOverCategory}
            recentlyDropped={recentlyDropped}
            onReorder={handleReorder}
            selectedMonths={selectedMonths}
            month={currentMonth}
            isDark={isColorDark(tableColors[category])}
            onTransactionsChange={(newTransactions) => {
              newTransactions.forEach((transaction, index) => {
                const existingTransaction = transactions.find(t => t.id === transaction.id);
                if (existingTransaction) {
                  const globalIndex = transactions.findIndex(t => t.id === transaction.id);
                  if (globalIndex !== -1) {
                    updateTransaction(globalIndex, transaction);
                  }
                }
              });
            }}
          />
        ))}

        {/* Show message when no transactions exist */}
        {transactions.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 3, mb: 3 }}>
            <Typography variant="body1" color="textSecondary">
              No transactions found for this budget. Start by adding some income transactions.
            </Typography>
          </Box>
        )}
      </Box>
    );
  }, [
    transactions, 
    updateTransaction, 
    deleteTransaction,
    addTransaction,
    getTransactionsByCategory, 
    handleDragStart, 
    handleDragOver, 
    handleDrop, 
    dragOverCategory, 
    recentlyDropped,
    handleReorder,
    selectedMonths,
    currentMonth,
    isColorDark,
    tableColors,
    currentBudgetId
  ]);

  // Memoize the budget summary component to prevent unnecessary re-renders
  const budgetSummaryComponent = useMemo(() => {
    if (!transactions.length || !budgetSummary || !budgetPlan) return null;
    
    return (
      <Box sx={{ 
        mt: 4,
        mb: 6,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 20,
          left: 0,
          right: 0,
          height: '100%',
          background: 'linear-gradient(180deg, rgba(37,99,235,0.05) 0%, rgba(59,130,246,0) 100%)',
          borderRadius: 3,
          zIndex: -1,
        }
      }}>
        <Box sx={{ 
          p: { xs: 2, sm: 3 }, 
          borderRadius: 3, 
          backgroundColor: 'background.paper',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 4,
            background: 'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(59,130,246,1) 100%)',
          }
        }}>
          <BudgetActions onPreferencesChange={setPreferences} />
          <BudgetSummary 
            summary={budgetSummary} 
            plan={budgetPlan} 
            suggestions={suggestions}
            preferences={preferences}
            transactions={transactions}
            selectedMonths={selectedMonths}
          />
        </Box>
      </Box>
    );
  }, [transactions.length, budgetSummary, budgetPlan, suggestions, preferences, setPreferences, transactions, selectedMonths]);
  
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
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M12 8c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4zm8 13c3.3 0 6-2.7 6-6s-2.7-6-6-6-6 2.7-6 6 2.7 6 6 6zm-8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2 2 2-.9 2-2 2zm52 6c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4zM28 32c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4z'/%3E%3Cpath d='M60 60c4.4 0 8-3.6 8-8s-3.6-8-8-8-8 3.6-8 8 3.6 8 8 8zm-8 4c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4zm-16-8c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4 4 4 4-1.8 4-4 4zm64 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4 4 4 4-1.8 4-4 4z'/%3E%3C/g%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M35 25h2v10h-2zM35 45h10v2h-10zM35 35h10v2h-10zM35 15h10v2h-10zM85 45h-10v2h10zM85 35h-10v2h10zM85 25h-10v2h10zM85 15h-10v2h10zM75 85h10v-2h-10zM65 85h-10v-2h10zM55 85h-10v-2h10zM75 95h-10v-2h10zM35 95h10v-2h-10zM25 95h-10v-2h10z'/%3E%3Cpath d='M50 20c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V22c0-1.1-.9-2-2-2H50zm0 2h20v16H50V22z'/%3E%3Cpath d='M53 33h2v-8h-2v8zm4 0h2v-8h-2v3h-1v2h1v3zm4 0h2v-8h-2v3h-1v2h1v3zm4 0h2v-8h-2v8z'/%3E%3Cpath d='M60 75c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15zm0 2c7.2 0 13 5.8 13 13s-5.8 13-13 13-13-5.8-13-13 5.8-13 13-13z'/%3E%3Cpath d='M57 86v-2h7v-2h-4c-1.1 0-2-.9-2-2v-2c0-1.1.9-2 2-2h3v-1h2v1h4v2h-7v2h4c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-3v1h-2v-1h-4z'/%3E%3C/g%3E%3C/svg%3E")`,
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
            },
            'html, body': { 
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
      mx: 'auto',
      minHeight: '100vh',
      pb: 4,
    }}>
      <Box 
        sx={{ 
          p: 2,
          mb: 3,
          background: theme => theme.palette.mode === 'dark' 
            ? 'linear-gradient(90deg, rgba(30,58,138,1) 0%, rgba(37,99,235,1) 100%)' 
            : 'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(59,130,246,1) 100%)',
          borderRadius: { xs: 0, sm: '0 0 1rem 1rem' },
          boxShadow: theme => theme.palette.mode === 'dark'
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.24)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
            display: 'flex',
            alignItems: 'center',
            gap: 2,
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

        {/* Add Navigation Tabs */}
        <Box sx={{ mt: 3, width: '100%', maxWidth: 400 }}>
          <Tabs 
            value={activeStep} 
            onChange={(e, newValue) => setActiveStep(newValue)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: 'white',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'white',
              },
            }}
          >
            <Tab 
              label="Transactions" 
              sx={{ 
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
              }} 
            />
            <Tab 
              label="Budget Plan" 
              sx={{ 
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
              }} 
            />
          </Tabs>
        </Box>
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
        {/* Budget Selector - Always shown */}
        <BudgetSelector 
          setCurrentBudgetId={setCurrentBudgetId} 
          setAlertMessage={setAlertMessage}
        />

        {activeStep === 0 ? (
          <>
            {/* Month Selector - Only shown on Transactions page */}
            <Box sx={{ mb: '10px' }}>
              <MonthSelector 
                selectedMonths={selectedMonths}
                onChange={setSelectedMonths}
              />
            </Box>

            {/* Getting Started - Only show for first-time users */}
            {!hasSeenGettingStarted && transactions.length === 0 && (
              <Paper sx={{ p: 3, borderRadius: 2, mb: 3, backgroundColor: 'background.paper' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Getting Started
                </Typography>
                <Typography variant="body1" paragraph>
                  Welcome to BudgetFriendly! Let's set up your finances to create your personalized budget plan.
                </Typography>
                
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  bgcolor: 'primary.light', 
                  color: 'primary.contrastText',
                  mb: 3
                }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                    Step 1: Add your income sources
                  </Typography>
                  <Typography variant="body2">
                    Start by adding your income sources like salary, freelance work, or other earnings.
                    This will help calculate your available funds for budgeting.
                  </Typography>
                </Box>
                
                {/* Include a simplified Income form */}
                <Box sx={{ mb: 3 }}>
                  <TransactionTable 
                    category="Income"
                    transactions={transactions.filter(t => t.category === 'Income')}
                    allTransactions={transactions}
                    onUpdateTransaction={updateTransaction}
                    onDeleteTransaction={deleteTransaction}
                    onAddTransaction={addTransaction}
                    month={currentMonth}
                    isDark={isColorDark(tableColors['Income'])}
                    selectedMonths={selectedMonths}
                    onTransactionsChange={(newTransactions) => {
                      // Handle transaction changes
                      newTransactions.forEach((transaction, index) => {
                        const existingTransaction = transactions.find(t => t.id === transaction.id);
                        if (existingTransaction) {
                          const globalIndex = transactions.findIndex(t => t.id === transaction.id);
                          if (globalIndex !== -1) {
                            updateTransaction(globalIndex, transaction);
                          }
                        }
                      });
                    }}
                  />
                </Box>
                
                <Typography variant="subtitle1" sx={{ fontWeight: 500, mt: 3 }}>
                  What's Next?
                </Typography>
                <Typography variant="body2">
                  After adding your income, you'll be able to:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: '30px' }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: 'primary.main', borderRadius: '50%' }} />
                    </ListItemIcon>
                    <ListItemText primary="Add your expenses in different categories" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: '30px' }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: 'primary.main', borderRadius: '50%' }} />
                    </ListItemIcon>
                    <ListItemText primary="See a breakdown of your spending" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: '30px' }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: 'primary.main', borderRadius: '50%' }} />
                    </ListItemIcon>
                    <ListItemText primary="Get personalized budget recommendations" />
                  </ListItem>
                </List>
              </Paper>
            )}
            
            {/* Display transactions */}
            {transactionTables}
          </>
        ) : (
          <>
            {/* Budget Plan Page */}
            {transactions.some(t => t.category === 'Income') ? (
              budgetSummaryComponent
            ) : (
              <Paper 
                sx={{ 
                  p: 4, 
                  mt: 4, 
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
                  No Income Recorded
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Please add income transactions in order to see the budget plan for this budget.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(0)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Add Income
                </Button>
              </Paper>
            )}
          </>
        )}

        {/* Color Picker Popover for Transaction Tables */}
        <Popover
          open={Boolean(tableColorPickerAnchor)}
          anchorEl={tableColorPickerAnchor}
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
              onChange={handleColorSelect}
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
};

export default function BudgetApp() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <GlobalStyles
          styles={{
            'html, body': {
              minHeight: '100vh'
            },
            '.dragging-active': {
              cursor: 'grabbing !important'
            },
            '.dragging-active *': {
              cursor: 'grabbing !important'
            },
            '.drag-target': {
              transition: 'transform 0.2s, box-shadow 0.2s'
            },
            '.drag-target-hover': {
              transform: 'scale(1.01)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15) !important'
            }
          }}
        />
        <SavingsProvider>
          <BudgetAppContent />
        </SavingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
} 