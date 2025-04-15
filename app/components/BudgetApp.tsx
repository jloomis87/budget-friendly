import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  CircularProgress, 
  Stepper, 
  Step, 
  StepLabel, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText,
  DialogActions, 
  TextField,
  useTheme as useMuiTheme,
  useMediaQuery,
  IconButton,
  GlobalStyles,
  Tooltip,
  Tabs,
  Tab,
  Alert,
  Collapse,
  Fade,
  Link as MuiLink,
  Menu,
  MenuItem,
  Popover,
  InputAdornment,
  FormHelperText,
  Chip,
  Avatar,
  Checkbox,
  ListItemText,
  ListItemIcon,
  FormControlLabel,
  Badge,
  Snackbar,
  AppBar,
  Toolbar,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  ToggleButtonGroup,
  ToggleButton,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  DragIndicator as DragIndicatorIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ColorLens as ColorLensIcon,
  HelpOutline as HelpOutlineIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  EditOutlined as EditOutlinedIcon,
  Delete as DeleteIcon,
  Palette as PaletteIcon,
  AddCircle as AddCircleIcon,
  Login as LoginIcon,
  AccountCircle as AccountCircleIcon,
  Save as SaveIcon,
  FileUpload as FileUploadIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { TransactionTable } from './transactions/TransactionTable';
import { MonthSelector } from './MonthSelector';
import { BudgetSummary } from './BudgetSummary';
import { BudgetActions } from './BudgetActions';
import type { BudgetPreferences } from './BudgetActions';
import { SmartInsights } from './SmartInsights';
import { CategoryColorPicker } from './CategoryColorPicker';
import { AddCategoryButton } from './AddCategoryButton';
import type { Transaction } from '../services/fileParser';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SavingsProvider } from '../contexts/SavingsContext';
import { CategoryProvider, useCategories } from '../contexts/CategoryContext';
import { useTransactions } from '../hooks/useTransactions';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from '../hooks/useLocalStorage';
import { HexColorPicker } from 'react-colorful';
import { collection, doc, getDoc, getDocs, updateDoc, addDoc, query, orderBy, limit, writeBatch, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Theme } from '@mui/material/styles';
import UserMenu from './auth/UserMenu';
import { create503020Plan } from '../services/budgetCalculator';

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
  const { categories } = useCategories(); // Add this line to fix the missing categories reference
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
  
  // Get the categories context to update the current budget ID
  const { setCurrentBudgetId: setCategoriesBudgetId } = useCategories();
  
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
            // Get user preferences for last selected budget
            const userDocRef = doc(db, 'users', user.id);
            const userDoc = await getDoc(userDocRef);
            const lastSelectedBudget = userDoc.exists() ? userDoc.data()?.preferences?.lastSelectedBudget : null;
            
            // Use last selected budget if available, otherwise use first budget
            let budgetId;
            if (lastSelectedBudget && budgetsSnapshot.docs.some(doc => doc.id === lastSelectedBudget)) {
              budgetId = lastSelectedBudget;
            } else {
              budgetId = budgetsSnapshot.docs[0].id;
            }
            
            console.log('[BudgetAppContent] Setting initial budget ID to:', budgetId);
            setInitialBudgetId(budgetId);
            
            // Initialize category context with budget ID right away
            setCategoriesBudgetId(budgetId);
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
            
            // Initialize category context with budget ID right away
            setCategoriesBudgetId(docRef.id);
          }
        } catch (error) {
          console.error('[BudgetAppContent] Error loading initial budget:', error);
        }
      }
    };
    
    loadInitialBudget();
  }, [user, setCategoriesBudgetId]);
  
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const preferences = userDoc.data()?.preferences || {};
          setSelectedMonths(preferences.selectedMonths || [currentMonth]);
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
            updatedAt: new Date().toISOString()
          }
        });
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
  
  // Sync the current budget ID between transactions and categories
  useEffect(() => {
    if (currentBudgetId) {
      // Update the CategoryContext with the current budget ID
      setCategoriesBudgetId(currentBudgetId);
    }
  }, [currentBudgetId, setCategoriesBudgetId]);
  
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
  const { isAuthenticated, isLoading: authLoading, user: authUser, logout, signIn, signUp, error } = useAuth();
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
    setIsLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      setLoginEmail('');
      setLoginPassword('');
      setActiveAuthTab(0);
    } catch (error) {
      console.error('Login error:', error);
      setAlertMessage({ type: 'error', message: 'Failed to log in. Please check your credentials.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle signup form submission
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Submit form
      await signUp(signupEmail, signupPassword, signupName);
      setSignupEmail('');
      setSignupPassword('');
      setSignupName('');
      setActiveAuthTab(0);
    } catch (error) {
      console.error('Signup error:', error);
      setAlertMessage({ type: 'error', message: 'Failed to create account. Please try again.' });
    } finally {
      setIsLoading(false);
    }
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
    setDraggedTransaction({ transaction, index });
    document.body.classList.add('dragging-active');
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
    document.body.classList.remove('dragging-active');
    
    if (!draggedTransaction) return;
    
    if (draggedTransaction.transaction.category === targetCategory) {
      setDraggedTransaction(null);
      return;
    }
    
    moveTransaction(draggedTransaction.index, targetCategory);
    setRecentlyDropped(targetCategory);
    setTimeout(() => {
      setRecentlyDropped(null);
    }, 1500);
    
    setDraggedTransaction(null);
  }, [draggedTransaction, moveTransaction]);

  // Handle reordering within a category
  const handleReorder = useCallback((category: string, sourceIndex: number, targetIndex: number) => {
    const categoryTransactions = transactions.filter(t => t.category === category);
    
    if (sourceIndex < 0 || sourceIndex >= transactions.length || 
        targetIndex < 0 || targetIndex >= transactions.length) {
      return;
    }
    
    const sourceTransaction = transactions[sourceIndex];
    const targetTransaction = transactions[targetIndex];
    
    if (!sourceTransaction || !targetTransaction) {
      return;
    }
    
    if (sourceTransaction.category !== category || targetTransaction.category !== category) {
      return;
    }
    
    const reordered = [...categoryTransactions];
    const localSourceIndex = reordered.findIndex(t => t === sourceTransaction);
    const localTargetIndex = reordered.findIndex(t => t === targetTransaction);
    
    if (localSourceIndex === -1 || localTargetIndex === -1) {
      return;
    }
    
    const [movedItem] = reordered.splice(localSourceIndex, 1);
    reordered.splice(localTargetIndex, 0, movedItem);
    
    const orderedIds = reordered.map(t => t.id).filter(id => id !== undefined) as string[];
    reorderTransactions(category, orderedIds);
  }, [transactions, reorderTransactions]);
  
  // Clear any drag/drop/animation states when mouse leaves a draggable area
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCategory(null);
  }, []);
  
  // Handle drag end
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCategory(null);
    setDraggedTransaction(null);
    document.body.classList.remove('dragging-active');
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
    if (!transactions) return null;
    
    // Get all income transactions
    const incomeTransactions = transactions.filter(t => t.category === 'Income');
    
    // Group expense transactions by category
    const expenseCategories = getTransactionsByCategory();
    
    // Create a transaction table for Income
    const tables = [
      <TransactionTable
        key="Income"
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
        isDark={isColorDark(tableColors['Income'] || '#e3f2fd')}
        onTransactionsChange={newTransactions => {
          // Find and update changed transactions
          newTransactions.forEach(transaction => {
            const index = transactions.findIndex(t => t.id === transaction.id);
            if (index !== -1) {
              updateTransaction(index, transaction);
            }
          });
        }}
      />
    ];
    
    // Create transaction tables for all expense categories from the CategoryContext
    categories
      .filter(category => category.name !== 'Income' && !category.isIncome)
      .forEach(category => {
        // Get transactions for this category
        const categoryTransactions = expenseCategories[category.name] || [];
        
        tables.push(
          <TransactionTable
            key={category.id}
            category={category.name}
            transactions={categoryTransactions}
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
            isDark={isColorDark(category.color || '#f5f5f5')}
            onTransactionsChange={newTransactions => {
              // Find and update changed transactions
              newTransactions.forEach(transaction => {
                const index = transactions.findIndex(t => t.id === transaction.id);
                if (index !== -1) {
                  updateTransaction(index, transaction);
                }
              });
            }}
          />
        );
      });
    
    return tables;
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
    currentBudgetId,
    categories
  ]);

  // Sync budget preferences with the budget plan
  useEffect(() => {
    // Only run this effect if we have the necessary data
    if (budgetSummary && budgetPlan && preferences?.ratios) {
      // Check if the current budget plan reflects the current preferences
      const expectedEssentials = budgetSummary.totalIncome * (preferences.ratios.essentials / 100);
      const expectedWants = budgetSummary.totalIncome * (preferences.ratios.wants / 100);
      const expectedSavings = budgetSummary.totalIncome * (preferences.ratios.savings / 100);
      
      // Check if the current plan is significantly different from what it should be based on preferences
      const needsUpdate = 
        Math.abs(budgetPlan.recommended.essentials - expectedEssentials) > 0.01 ||
        Math.abs(budgetPlan.recommended.wants - expectedWants) > 0.01 ||
        Math.abs(budgetPlan.recommended.savings - expectedSavings) > 0.01;
      
      if (needsUpdate) {
        console.log('[BudgetApp] Budget plan does not match preferences, triggering update');
        // Dispatch event to trigger a recalculation
        const event = new CustomEvent('budgetPreferencesChanged', { 
          detail: { preferences } 
        });
        window.dispatchEvent(event);
      }
    }
  }, [budgetSummary, budgetPlan, preferences]);

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
          mx: { xs: 2, sm: 3 },
          overflow: 'hidden',
          position: 'relative',
        }}>
          <Paper 
            elevation={1}
            sx={{ 
              p: 2, 
              pb: 3,
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <BudgetActions onPreferencesChange={setPreferences} />
            <BudgetSummary 
              summary={budgetSummary} 
              plan={budgetPlan} 
              suggestions={suggestions}
              preferences={preferences}
              transactions={transactions}
              selectedMonths={selectedMonths}
              showActualAmounts={preferences.displayPreferences.showActualAmounts}
              showPercentages={preferences.displayPreferences.showPercentages}
              showDifferences={preferences.displayPreferences.showDifferences}
              showProgressBars={preferences.chartPreferences.showProgressBars}
            />
          </Paper>
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
        {/* Background */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1,
            overflow: 'hidden',
            // Light background with subtle gradient
            background: 'linear-gradient(135deg, #ffffff, #f8fafc, #f1f5f9)',
            backgroundSize: '400% 400%',
            animation: 'gradientAnimation 15s ease infinite',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at center, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 100%)',
              zIndex: 2,
            },
            // Update pattern color to be very subtle
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              // Finance-themed pattern with dollar signs, coins, and charts
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M12 8c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4zm8 13c3.3 0 6-2.7 6-6s-2.7-6-6-6-6 2.7-6 6 2.7 6 6 6zm-8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2 2 2-.9 2-2 2zm52 6c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4zM28 32c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4z'/%3E%3Cpath d='M60 60c4.4 0 8-3.6 8-8s-3.6-8-8-8-8 3.6-8 8 3.6 8 8 8zm-8 4c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4zm-16-8c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4 4 4 4-1.8 4-4 4zM85 45h-10v2h10zM85 35h-10v2h10zM85 25h-10v2h10zM85 15h-10v2h10zM75 85h10v-2h-10zM65 85h-10v-2h10zM55 85h-10v-2h10zM75 95h-10v-2h10zM35 95h10v-2h-10zM25 95h-10v-2h10z'/%3E%3C/g%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M35 25h2v10h-2zM35 45h10v2h-10zM35 35h10v2h-10zM35 15h10v2h-10zM85 45h-10v2h10zM85 35h-10v2h10zM85 25h-10v2h10zM85 15h-10v2h10zM75 85h10v-2h-10zM65 85h-10v-2h10zM55 85h-10v-2h10zM75 95h-10v-2h10zM35 95h10v-2h-10zM25 95h-10v-2h10z'/%3E%3Cpath d='M50 20c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V22c0-1.1-.9-2-2-2H50zm0 2h20v16H50V22z'/%3E%3Cpath d='M53 33h2v-8h-2v8zm4 0h2v-8h-2v3h-1v2h1v3zm4 0h2v-8h-2v3h-1v2h1v3zm4 0h2v-8h-2v8z'/%3E%3Cpath d='M60 75c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15zm0 2c7.2 0 13 5.8 13 13s-5.8 13-13 13-13-5.8-13-13 5.8-13 13-13z'/%3E%3Cpath d='M57 86v-2h7v-2h-4c-1.1 0-2-.9-2-2v-2c0-1.1.9-2 2-2h3v-1h2v1h4v2h-7v2h4c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-3v1h-2v-1h-4z'/%3E%3C/g%3E%3C/svg%3E")`,
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
            'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus': {
              WebkitBoxShadow: '0 0 0 1000px white inset !important',
              WebkitTextFillColor: '#000000 !important',
              transition: 'background-color 5000s ease-in-out 0s'
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
            mb: 0,
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
              mb: 0
            }}
          >
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: '1200px'
              }}
            >
              <img 
                src="/logo/friendlybudgetslogo.svg" 
                alt="Friendly Budgets Logo" 
                style={{
                  width: '150%',
                  height: 'auto',
                  maxWidth: '2000px',  // Increased from 900px by 30%
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  marginBottom: '1rem'
                }}
              />
            </Box>
          </Box>
       

        </Box>
        
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 3,
            width: '100%',
            maxWidth: 450,
            background: '#ffffff',
            color: 'black',
            border: '1px solid',
            borderColor: 'divider',
            mb: 4,
            zIndex: 2,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            '& .MuiTextField-root': {
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                '& input': {
                  backgroundColor: 'white',
                  '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus': {
                    WebkitBoxShadow: '0 0 0 30px white inset !important',
                    WebkitTextFillColor: 'inherit !important',
                    'transition': 'background-color 5000s ease-in-out 0s'
                  }
                },
                '&:hover, &.Mui-focused': {
                  backgroundColor: 'white'
                }
              }
            }
          }}
        >
          <Box sx={{ width: '100%' }}>
            <Tabs 
              value={activeAuthTab} 
              onChange={(e, newValue) => setActiveAuthTab(newValue)} 
              variant="fullWidth"
              sx={{
                mb: 4,
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  textTransform: 'none',
                  minHeight: '48px',
                  color: '#4a5568',
                  transition: 'color 0.2s ease',
                  '&:hover': {
                    color: '#2563eb',  // Blue color on hover
                  },
                  '&.Mui-selected': {
                    color: '#22c55e',  // Green color for active tab
                  }
                },
                '& .MuiTabs-indicator': {
                  height: '3px',
                  borderRadius: '3px 3px 0 0',
                  backgroundColor: '#22c55e',  // Green color for indicator
                }
              }}
            >
              <Tab label="Log In" />
              <Tab label="Sign Up" />
            </Tabs>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    fontWeight: 500
                  }
                }}
              >
                {error}
              </Alert>
            )}

            {activeAuthTab === 0 ? (
              // Login Form
              <Box 
                component="form" 
                onSubmit={handleLoginSubmit} 
                noValidate
                sx={{
                  '& .MuiTextField-root': {
                    mb: 2.5
                  }
                }}
              >
                <TextField
                  label="Email Address"
                  fullWidth
                  variant="standard"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  error={!!formErrors.loginEmail}
                  helperText={formErrors.loginEmail}
                  disabled={authLoading}
                  required
                  sx={{
                    '& .MuiInputBase-input': {
                      color: '#1a1a1a',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#666666',
                      '&.Mui-focused': {
                        color: '#22c55e'
                      }
                    },
                    '& .MuiInput-underline:before': {
                      borderBottom: 'none',
                      transition: 'border-bottom-width 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:hover:before': {
                      borderBottom: '2px solid #bbf7d0',
                      transform: 'scaleX(1)',
                      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:after': {
                      borderBottomColor: '#22c55e'
                    }
                  }}
                />
                <TextField
                  label="Password"
                  fullWidth
                  variant="standard"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  error={!!formErrors.loginPassword}
                  helperText={formErrors.loginPassword}
                  disabled={authLoading}
                  required
                  sx={{
                    '& .MuiInputBase-input': {
                      color: '#1a1a1a',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#666666',
                      '&.Mui-focused': {
                        color: '#22c55e'
                      }
                    },
                    '& .MuiInput-underline:before': {
                      borderBottom: 'none',
                      transition: 'border-bottom-width 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:hover:before': {
                      borderBottom: '2px solid #bbf7d0',
                      transform: 'scaleX(1)',
                      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:after': {
                      borderBottomColor: '#22c55e'
                    }
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ 
                    mt: 2, 
                    mb: 3, 
                    py: 1.5, 
                    fontWeight: 600, 
                    borderRadius: 2,
                    fontSize: '1rem',
                    textTransform: 'none',
                    background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    '&:hover': {
                      background: 'linear-gradient(90deg, #1d4ed8, #2563eb)',
                      boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)',
                    }
                  }}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    'Log In'
                  )}
                </Button>
                <Typography 
                  variant="body2" 
                  align="center" 
                  sx={{
                    color: '#4a5568',  // Darker gray color
                    '& .MuiButton-root': {
                      fontWeight: 600,
                      color: 'primary.main',
                      p: 0,
                      minWidth: 'auto',
                      textTransform: 'none',
                      fontSize: 'inherit',
                      ml: 0.5,
                      '&:hover': {
                        background: 'none',
                        color: 'primary.dark',
                      }
                    }
                  }}
                >
                  Don't have an account?
                  <Button onClick={() => setActiveAuthTab(1)}>
                    Sign up now
                  </Button>
                </Typography>
              </Box>
            ) : (
              // Signup Form
              <Box 
                component="form" 
                onSubmit={handleSignupSubmit} 
                noValidate
                sx={{
                  '& .MuiTextField-root': {
                    mb: 2.5
                  }
                }}
              >
                <TextField
                  label="Full Name"
                  fullWidth
                  variant="standard"
                  autoComplete="name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  error={!!formErrors.signupName}
                  helperText={formErrors.signupName}
                  disabled={authLoading}
                  required
                  sx={{
                    '& .MuiInputBase-input': {
                      color: '#1a1a1a',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#666666',
                      '&.Mui-focused': {
                        color: '#22c55e'
                      }
                    },
                    '& .MuiInput-underline:before': {
                      borderBottom: 'none',
                      transition: 'border-bottom-width 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:hover:before': {
                      borderBottom: '2px solid #bbf7d0',
                      transform: 'scaleX(1)',
                      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:after': {
                      borderBottomColor: '#22c55e'
                    }
                  }}
                />
                <TextField
                  label="Email Address"
                  fullWidth
                  variant="standard"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  error={!!formErrors.signupEmail}
                  helperText={formErrors.signupEmail}
                  disabled={authLoading}
                  required
                  sx={{
                    '& .MuiInputBase-input': {
                      color: '#1a1a1a',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#666666',
                      '&.Mui-focused': {
                        color: '#22c55e'
                      }
                    },
                    '& .MuiInput-underline:before': {
                      borderBottom: 'none',
                      transition: 'border-bottom-width 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:hover:before': {
                      borderBottom: '2px solid #bbf7d0',
                      transform: 'scaleX(1)',
                      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:after': {
                      borderBottomColor: '#22c55e'
                    }
                  }}
                />
                <TextField
                  label="Password"
                  fullWidth
                  variant="standard"
                  type="password"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  error={!!formErrors.signupPassword}
                  helperText={formErrors.signupPassword}
                  disabled={authLoading}
                  required
                  sx={{
                    '& .MuiInputBase-input': {
                      color: '#1a1a1a',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#666666',
                      '&.Mui-focused': {
                        color: '#22c55e'
                      }
                    },
                    '& .MuiInput-underline:before': {
                      borderBottom: 'none',
                      transition: 'border-bottom-width 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:hover:before': {
                      borderBottom: '2px solid #bbf7d0',
                      transform: 'scaleX(1)',
                      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:after': {
                      borderBottomColor: '#22c55e'
                    }
                  }}
                />
                <TextField
                  label="Confirm Password"
                  fullWidth
                  variant="standard"
                  type="password"
                  autoComplete="new-password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  error={!!formErrors.signupConfirmPassword}
                  helperText={formErrors.signupConfirmPassword}
                  disabled={authLoading}
                  required
                  sx={{
                    '& .MuiInputBase-input': {
                      color: '#1a1a1a',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#666666',
                      '&.Mui-focused': {
                        color: '#22c55e'
                      }
                    },
                    '& .MuiInput-underline:before': {
                      borderBottom: 'none',
                      transition: 'border-bottom-width 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:hover:before': {
                      borderBottom: '2px solid #bbf7d0',
                      transform: 'scaleX(1)',
                      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    '& .MuiInput-underline:after': {
                      borderBottomColor: '#22c55e'
                    }
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ 
                    mt: 2, 
                    mb: 3, 
                    py: 1.5, 
                    fontWeight: 600, 
                    borderRadius: 2,
                    fontSize: '1rem',
                    textTransform: 'none',
                    background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    '&:hover': {
                      background: 'linear-gradient(90deg, #1d4ed8, #2563eb)',
                      boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)',
                    }
                  }}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    'Create Account'
                  )}
                </Button>
                <Typography 
                  variant="body2" 
                  align="center"
                  sx={{
                    color: '#4a5568',  // Darker gray color
                    '& .MuiButton-root': {
                      fontWeight: 600,
                      color: 'primary.main',
                      p: 0,
                      minWidth: 'auto',
                      textTransform: 'none',
                      fontSize: 'inherit',
                      ml: 0.5,
                      '&:hover': {
                        background: 'none',
                        color: 'primary.dark',
                      }
                    }
                  }}
                >
                  Already have an account?
                  <Button onClick={() => setActiveAuthTab(0)}>
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
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                border: '1px solid',
                borderColor: 'rgba(0, 0, 0, 0.06)',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
                }
              }}
            >
              <Box 
                sx={{ 
                  color: 'primary.main', 
                  backgroundColor: 'primary.light',
                  p: 1.5,
                  borderRadius: '50%',
                  mb: 2,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  }
                }}
              >
                {feature.icon}
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#334155' }}>
                {feature.title}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
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
          p: { xs: 2, sm: 3 },
          py: { md: 2 },
          background: '#ffffff',
          borderRadius: { xs: 0, sm: '0 0 1.5rem 1.5rem' },
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          mb: 0
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 24,
            zIndex: 3,
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
              color="primary"
              onClick={handleOpenAuthModal}
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'rgba(0,0,0,0.04)',
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
            justifyContent: 'center',
            width: '100%',
            maxWidth: '700px',
            mx: 'auto',
            px: { xs: 2, md: 0 },
            position: 'relative',
            my: 1,
            zIndex: 2
          }}
        >
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src="/logo/friendlybudgetslogo.svg" 
              alt="Friendly Budgets Logo" 
              style={{
                marginTop: '-90px',
                //crop the top and bottom 50px
                clipPath: 'inset(50px 0)',
                width: 800,
                height: 400,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                objectFit: 'contain',
                marginBottom: '1rem'
              }}
            />
          </Box>
        </Box>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mt: -10,
            mb: 2,
            opacity: 0.9, 
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: '600px',
            fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: '1rem',
            letterSpacing: '0.01em',
            color: '#424242',
            zIndex: 2
          }}
        >
          Simplify your finances, track your spending, and achieve your money goals
        </Typography>
      </Box>

      {/* Tabs moved outside the header box */}
      <Box sx={{ 
        width: '100%', 
        maxWidth: 500, 
        mx: 'auto',
        mt: 2,
        mb: 3
      }}>
        <Tabs 
          value={activeStep} 
          onChange={(e, newValue) => setActiveStep(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                color: 'success.main',
                fontWeight: 700,
              },
              '&:not(.Mui-selected):hover': {
                color: 'primary.main',
                backgroundColor: (theme) => 
                  theme.palette.mode === 'dark' 
                    ? 'rgba(25, 118, 210, 0.08)' 
                    : 'rgba(25, 118, 210, 0.04)',
              },
              whiteSpace: 'nowrap',
              minWidth: 160,
              minHeight: '48px',
              py: 1,
              borderRadius: 1
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'success.main',
              height: '3px',
              borderRadius: '3px 3px 0 0',
              transition: 'all 0.2s ease'
            },
          }}
        >
          <Tab 
            label="Budgets" 
            sx={{ 
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
            }} 
          />
          <Tab 
            label="Insights and Planning" 
            sx={{ 
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
            }} 
          />
        </Tabs>
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
      <Box sx={{ px: 0 }}>
        {/* Budget Selector - Always shown */}
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          <BudgetSelector 
            setCurrentBudgetId={setCurrentBudgetId} 
            setAlertMessage={setAlertMessage}
          />

          {/* Month Selector - Shown in both Transaction and Budget Plan pages */}
          <Box sx={{ mb: '10px' }}>
            <MonthSelector 
              selectedMonths={selectedMonths}
              onChange={setSelectedMonths}
            />
          </Box>

          {/* Display transactions */}
          {activeStep === 0 && transactionTables}

          {/* Add Category Button */}
          {activeStep === 0 && <AddCategoryButton />}
        </Box>

        {activeStep === 1 && (
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
                  Please add income transactions in order to see the insights and planning for this budget.
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
      </Box>

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
          <CategoryProvider>
            <BudgetAppContent />
          </CategoryProvider>
        </SavingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
} 