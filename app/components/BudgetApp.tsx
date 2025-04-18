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
import * as transactionService from '../services/transactionService';
import { BudgetSummary as BudgetSummaryType, BudgetPlan as BudgetPlanType } from '../services/budgetCalculator';
import { TutorialOverlay } from './tutorial/TutorialOverlay';
import { tutorialSteps } from './tutorial/tutorialSteps';

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
            
          
            setBudgets(sortedBudgets);
            
            // Set current budget to the last selected budget if it exists, otherwise use the first one
            const budgetToSelect = lastSelectedBudget && sortedBudgets.find(b => b.id === lastSelectedBudget)
              ? lastSelectedBudget
              : sortedBudgets[0].id;
              
           
            setCurrentBudget(budgetToSelect);
            setCurrentBudgetId(budgetToSelect);
          } else {
            // If no budgets exist, create a default one
          
            const defaultBudget = { 
              name: 'Main Budget',
              createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(
              collection(db, 'users', user.id, 'budgets'), 
              defaultBudget
            );
          
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
        
   
        
        const newBudget = {
          id: newBudgetRef.id,
          name: newBudgetName.trim(),
          createdAt
        };
        
        // Add the new budget and sort the list (oldest first)
        const updatedBudgets = [...budgets, newBudget].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
       
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
      id="budget-selector"
      elevation={1}
      sx={{
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditBudget(budget.id);
                    }}
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

// Add TypeScript declaration for window.updateAllTransactionsWithIcon
declare global {
  interface Window {
    updateAllTransactionsWithIcon?: (category: string, icon: string) => Promise<void>;
    updateAllTransactionsWithNewCategory?: (oldCategoryName: string, newCategoryName: string, categoryId: string) => Promise<void>;
    showTutorialOnBudgetAppLoad?: boolean;
    showTutorial?: () => void;
  }
}

// Main exported component at the top level
function BudgetApp() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <GlobalStyles
          styles={{
            '.drag-item': {
              cursor: 'grab'
            },
            '.dragging': {
              opacity: 0.5,
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

export default BudgetApp;

// Move the actual content component after the export
// Main App Content Component
const BudgetAppContent = (): JSX.Element => {
  const theme = useMuiTheme();
  const { categories, setCurrentBudgetId: setCategoriesBudgetId } = useCategories();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [recentlyDropped, setRecentlyDropped] = useState<string | null>(null);
  const [draggedTransaction, setDraggedTransaction] = useState<{
    transaction: Transaction;
    index: number;
  } | null>(null);
  
  // State for tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useLocalStorage<boolean>(
    'friendlyBudgets_hasSeenTutorial',
    'budgetFriendly_hasSeenTutorial',
    false
  );
  const [previousTransactionCount, setPreviousTransactionCount] = useState(0);
  
  // Get current month name for default selection
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  
  // State for selected months
  const [selectedMonths, setSelectedMonths] = useLocalStorage<string[]>(
    'friendlyBudgets_selectedMonths',
    'budgetFriendly_selectedMonths',
    [new Date().toLocaleString('default', { month: 'long' })]
  );
  
  // Refs for month synchronization
  const isLoadingFromFirebase = useRef(false);
  const isFirstLoad = useRef(true);
  const prevBudgetId = useRef<string | null>(null);
  // Add a ref to track if we've already attempted a redirect
  const hasAttemptedRedirect = useRef(false);
  
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
    setCurrentBudgetId,
    updateAllTransactionsWithSameName,
    setShouldReload,
    isLoading: transactionsLoading,
    addTransactionBatch
  } = useTransactions();

  // Load user preferences from Firebase when component mounts or user changes
  const { user, isAuthenticated } = useAuth();

  // Load months from Firebase only when budget changes
  useEffect(() => {
    if (!user || !currentBudgetId) {
      return;
    }
    
    // Skip if it's the same budget we already loaded
    if (prevBudgetId.current === currentBudgetId) {
      return;
    }
    
    
    // Set loading flag
    isLoadingFromFirebase.current = true;
    
    const loadFromFirebase = async () => {
      try {
        const budgetRef = doc(db, 'users', user.id, 'budgets', currentBudgetId);
        const budgetDoc = await getDoc(budgetRef);
        
        if (budgetDoc.exists() && budgetDoc.data().selectedMonths) {
          const firebaseMonths = budgetDoc.data().selectedMonths;
          
          if (Array.isArray(firebaseMonths) && firebaseMonths.length > 0) {
            setSelectedMonths(firebaseMonths);
          } else {
            setSelectedMonths([currentMonth]);
          }
        } else {
          setSelectedMonths([currentMonth]);
        }
        
        // Update the budget ID we've loaded
        prevBudgetId.current = currentBudgetId;
      } catch (error) {
        console.error('[BudgetAppContent] Error loading months from Firebase:', error);
        // Set default month on error
        setSelectedMonths([currentMonth]);
      } finally {
        // Clear loading flag
        setTimeout(() => {
          isLoadingFromFirebase.current = false;
        }, 500);
      }
    };
    
    loadFromFirebase();
  }, [currentBudgetId, user, currentMonth, setSelectedMonths]);
  
  // Save months to Firebase when they change (with conditions to prevent loops)
  useEffect(() => {
    // Skip save operations during the first render or when loading
    if (isFirstLoad.current || !user || !currentBudgetId || isLoadingFromFirebase.current) {
      isFirstLoad.current = false;
      return;
    }
    
    
    const saveToFirebase = async () => {
      try {
        const budgetRef = doc(db, 'users', user.id, 'budgets', currentBudgetId);
        await updateDoc(budgetRef, {
          selectedMonths,
          updatedAt: new Date().toISOString()
        });
        
        // Also backup to localStorage
        const budgetMonthsKey = `friendlyBudgets_selectedMonths_${currentBudgetId}`;
        localStorage.setItem(budgetMonthsKey, JSON.stringify(selectedMonths));
      } catch (error) {
        console.error('[BudgetAppContent] Error saving months to Firebase:', error);
      }
    };
    
    // Use a short debounce to prevent excessive writes
    const timeoutId = setTimeout(() => {
      saveToFirebase();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [selectedMonths, user, currentBudgetId]);

  // Sync the current budget ID between transactions and categories contexts
  useEffect(() => {
    if (currentBudgetId) {
      setCategoriesBudgetId(currentBudgetId);
    }
  }, [currentBudgetId, setCategoriesBudgetId]);

  // Color picker state for tables
  const [tableColors, setTableColors] = useState<{ [key: string]: string }>({
    Income: '#e3f2fd',
    Essentials: '#e8f5e9',
    Wants: '#fff3e0',
    Savings: '#f3e5f5'
  });
  const [tableColorPickerAnchor, setTableColorPickerAnchor] = useState<null | HTMLElement>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);

  // Register the global function for updating transactions with new category names
  useEffect(() => {
    // Create global function to update all transactions with a new category after renaming a category
    window.updateAllTransactionsWithNewCategory = async (oldCategoryName, newCategoryName, categoryId) => {
      if (!user || !user.id || !currentBudgetId) {
        throw new Error('No active budget to update category in');
      }
      
      
      try {
        // Get all transactions for this budget
        const transactionsCollectionRef = collection(db, 'users', user.id, 'budgets', currentBudgetId, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsCollectionRef);
        
        if (transactionsSnapshot.empty) {
          return;
        }
        
        // Find transactions with matching category (case-insensitive)
        const transactionsToUpdate = transactionsSnapshot.docs.filter((doc) => {
          const transaction = doc.data();
          return transaction.category && 
                 transaction.category.toLowerCase() === oldCategoryName.toLowerCase();
        });
        
        
        // Using a batch for better performance and atomicity
        const batch = writeBatch(db);
        
        // Update all matching transactions
        transactionsToUpdate.forEach(doc => {
          const transactionRef = doc.ref;
          
          // Update category name and ID only, not modifying any color information
          batch.update(transactionRef, { 
            category: newCategoryName,
            categoryId: categoryId,
            updatedAt: new Date().toISOString() 
          });
        });
        
        // Commit all updates
        await batch.commit();
        
        // Force a reload of transactions
        setShouldReload(true);
      } catch (error) {
        console.error('[updateAllTransactionsWithNewCategory] Error updating transactions:', error);
        throw error;
      }
    };
    
    // Add a global function to show the tutorial
    window.showTutorial = () => {
      setShowTutorial(true);
    };
    
    // Cleanup when component unmounts
    return () => {
      delete window.updateAllTransactionsWithNewCategory;
      delete window.showTutorial;
    };
  }, [user, currentBudgetId, setShouldReload, setShowTutorial]);

  // Listen for global refresh events
  useEffect(() => {
    const handleForceRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      
      // Check if this is from a copy-to-all-months operation
      const isCopyToAllMonths = customEvent.detail?.description && 
                                customEvent.detail?.count > 1;
                                
      if (isCopyToAllMonths) {
        // Force immediate reload for copy-to-all-months operations
        setShouldReload(true);
        
        // Schedule a second reload with a delay to ensure everything is updated
        setTimeout(() => {
          setShouldReload(true);
        }, 1000);
      } else {
        // Standard reload for other operations
        setShouldReload(true);
      }
    };
    
    // Add more targeted refresh handler
    const handleTargetedRefresh = (event: Event) => {
      // This is a targeted refresh event that only requires minimal updates
      const customEvent = event as CustomEvent<any>;
      
      // We'll make a more surgical update without refreshing the whole screen
      // This only causes our hook to fetch new data when it's actually needed
      if (customEvent.detail?.operation === 'copyToAllMonths') {
        // Just refresh the transactions data without triggering full app reload
        if (setShouldReload) {
          setShouldReload(true);
        }
      }
    };
    
    // Add event listeners
    document.addEventListener('forceParentDataRefresh', handleForceRefresh);
    window.addEventListener('transactionsUpdated', handleForceRefresh);
    document.addEventListener('updateCategoryTransactions', handleTargetedRefresh);
    
    return () => {
      // Clean up listeners on unmount
      document.removeEventListener('forceParentDataRefresh', handleForceRefresh);
      window.removeEventListener('transactionsUpdated', handleForceRefresh);
      document.removeEventListener('updateCategoryTransactions', handleTargetedRefresh);
    };
  }, [setShouldReload]);

  // Check if the user has just added their first transaction
  useEffect(() => {
    // Only show tutorial if we went from 0 to 1+ transactions and they haven't seen it yet
    if (previousTransactionCount === 0 && transactions.length > 0 && !hasSeenTutorial) {
      // Wait a moment for the UI to update before showing the tutorial
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    
    // Update previous count for next comparison
    setPreviousTransactionCount(transactions.length);
  }, [transactions.length, previousTransactionCount, hasSeenTutorial]);

  // Listen for manual requests to show the tutorial (enhanced version)
  useEffect(() => {
    const handleShowTutorial = (event: Event) => {
      // Make sure we haven't shown the tutorial yet in this session
      if (!hasSeenTutorial) {
        // Show the tutorial when the custom event is dispatched
        setShowTutorial(true);
      }
    };
    
    // Add event listener for the showTutorial custom event
    document.addEventListener('showTutorial', handleShowTutorial);
    
    // Cleanup
    return () => {
      document.removeEventListener('showTutorial', handleShowTutorial);
    };
  }, [hasSeenTutorial]);

  // Check for first login and show tutorial if it's a new user with a transaction
  useEffect(() => {
    // Check both authentication and transaction status
    if (isAuthenticated && user?.id && transactions.length > 0 && !hasSeenTutorial) {
      const checkUserStatus = async () => {
        try {
          const userDocRef = doc(db, 'users', user.id);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // If this is their first time or they haven't seen the tutorial
            if (!userData.hasSeenTutorial && transactions.length > 0) {
              // Show the tutorial
              setShowTutorial(true);
              
              // Update the user document to mark tutorial as seen
              await updateDoc(userDocRef, {
                hasSeenTutorial: true
              });
            }
          }
        } catch (error) {
          console.warn('Error checking user tutorial status:', error);
        }
      };
      
      // Run the check
      checkUserStatus();
    }
  }, [isAuthenticated, user?.id, transactions.length, hasSeenTutorial]);

  // Check for tutorial flag in localStorage on mount
  useEffect(() => {
    const tutorialFlag = localStorage.getItem('friendlyBudgets_showTutorial');
    if (tutorialFlag === 'true') {
      // Clear the flag immediately
      localStorage.removeItem('friendlyBudgets_showTutorial');
      
      // Show the tutorial after a short delay to ensure UI is ready
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Check for global window flag set by Help & Support
  useEffect(() => {
    if (window.showTutorialOnBudgetAppLoad === true) {
      // Clear the flag immediately
      window.showTutorialOnBudgetAppLoad = false;
      
      // Show the tutorial after a short delay to ensure UI is ready
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle tutorial completion
  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setHasSeenTutorial(true);
  };

  return (
    <Box sx={{ 
      width: '100%', 
      backgroundColor: 'background.default',
      mx: 'auto',
      minHeight: '100vh',
      pb: 4,
    }}>
      {/* Main app content */}
      <Box 
        sx={{ 
          p: { xs: 2, sm: 3 },
          py: { md: 2 },
          background: '#ffffff',
          borderRadius: { xs: 0, sm: '0 0 1.5rem 1.5rem' },
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          color: '#1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          mb: 0,
          height: '280px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
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
          <UserMenu />
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
            id="friendly-budgets-logo"
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
      </Box>
      
      {/* Main Content */}
      <Box sx={{ px: 0 }}>
        {/* Budget Selector and Month Selector - Only shown when user has transactions */}
        {transactions.length > 0 && (
          <Box 
            sx={{ 
              position: 'sticky',
              top: 0,
              zIndex: 1100,
              bgcolor: 'background.default',
              pt: 1.5,
              pb: 0.5,
              px: { xs: 1, sm: 2, md: 3 },
              boxShadow: (theme) => `0 2px 4px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`,
              borderBottom: '1px solid',
              borderColor: 'divider',
              transition: 'box-shadow 0.3s ease'
            }}
          >
            {/* Tabs */}
            <Box sx={{ 
              width: '100%', 
              maxWidth: 500, 
              mx: 'auto',
              mt: 0,
              mb: 2
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
                  id="insights-tab" 
                  label="Insights and Planning" 
                  sx={{ 
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                  }} 
                />
              </Tabs>
            </Box>
            
            <BudgetSelector 
              setCurrentBudgetId={setCurrentBudgetId} 
              setAlertMessage={setAlertMessage}
            />
            
            {/* Month Selector */}
            <Box id="month-selector" sx={{ mb: '10px', mt: 1 }}>
              <MonthSelector 
                selectedMonths={selectedMonths}
                onChange={setSelectedMonths}
              />
            </Box>
          </Box>
        )}
        
        {/* Content below sticky header, add padding to prevent content from being hidden */}
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pt: 2 }}>
          {/* For new users with no transactions, only show Income table */}
          {transactions.length === 0 ? (
            <Box>
              {transactionsLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 2 }}>Loading...</Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 3, mt: 1, textAlign: 'center' }}>
                    <Typography variant="subtitle1" color="text.secondary">
                      Start by adding your income below by pressing the "+" card.
                    </Typography>
                  </Box>
                  
                  {/* Income transactions table only */}
                  <Box id="category-income">
                    <TransactionTable
                      key="Income"
                      category="Income"
                      transactions={transactions.filter(t => t.category === 'Income')}
                      allTransactions={transactions}
                      onUpdateTransaction={updateTransaction}
                      onDeleteTransaction={deleteTransaction}
                      onAddTransaction={addTransaction}
                      onAddTransactionBatch={addTransactionBatch}
                      onUpdateAllTransactionsWithSameName={updateAllTransactionsWithSameName}
                      selectedMonths={selectedMonths}
                      month={currentMonth}
                      isDark={false}
                      onForceReload={() => setShouldReload(true)}
                      onTransactionsChange={(newTransactions) => {
                        // Find and update changed transactions
                        newTransactions.forEach((transaction) => {
                          const index = transactions.findIndex((t) => t.id === transaction.id);
                          if (index !== -1) {
                            updateTransaction(index, transaction);
                          }
                        });
                      }}
                      onDragStart={() => {}}
                      onDragOver={() => {}}
                      onDrop={() => {}}
                      dragOverCategory={null}
                      recentlyDropped={null}
                      onReorder={() => {}}
                    />
                  </Box>
                </>
              )}
            </Box>
          ) : (
            /* Show full content for existing users with transactions */
            <>
              {/* Conditional content based on active tab */}
              {activeStep === 0 && (
                <>
                  {transactionsLoading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                      <Typography variant="body2" sx={{ mt: 2 }}>Loading transactions...</Typography>
                    </Box>
                  ) : (
                    /* Render the transaction tables */
                    <Box>
                      {/* Income transactions */}
                      <Box id="category-income">
                        <TransactionTable
                          key="Income"
                          category="Income"
                          transactions={transactions.filter(t => t.category === 'Income')}
                          allTransactions={transactions}
                          onUpdateTransaction={updateTransaction}
                          onDeleteTransaction={deleteTransaction}
                          onAddTransaction={addTransaction}
                          onAddTransactionBatch={addTransactionBatch}
                          onUpdateAllTransactionsWithSameName={updateAllTransactionsWithSameName}
                          selectedMonths={selectedMonths}
                          month={currentMonth}
                          isDark={false}
                          onForceReload={() => setShouldReload(true)}
                          onTransactionsChange={(newTransactions) => {
                            // Find and update changed transactions
                            newTransactions.forEach((transaction) => {
                              const index = transactions.findIndex((t) => t.id === transaction.id);
                              if (index !== -1) {
                                updateTransaction(index, transaction);
                              }
                            });
                          }}
                          onDragStart={() => {}}
                          onDragOver={() => {}}
                          onDrop={() => {}}
                          dragOverCategory={null}
                          recentlyDropped={null}
                          onReorder={() => {}}
                        />
                      </Box>
                      
                      {/* Expense categories */}
                      {categories
                        .filter(category => category.name !== 'Income' && !category.isIncome)
                        .map(category => (
                          <Box 
                            key={category.id}
                            id={`category-${category.name.toLowerCase()}`}
                          >
                            <TransactionTable
                              key={category.id}
                              category={category.name}
                              transactions={transactions.filter(t => t.category === category.name)}
                              allTransactions={transactions}
                              onUpdateTransaction={updateTransaction}
                              onDeleteTransaction={deleteTransaction}
                              onAddTransaction={addTransaction}
                              onAddTransactionBatch={addTransactionBatch}
                              onUpdateAllTransactionsWithSameName={updateAllTransactionsWithSameName}
                              selectedMonths={selectedMonths}
                              month={currentMonth}
                              isDark={false}
                              onForceReload={() => setShouldReload(true)}
                              onTransactionsChange={(newTransactions) => {
                                // Find and update changed transactions
                                newTransactions.forEach((transaction) => {
                                  const index = transactions.findIndex((t) => t.id === transaction.id);
                                  if (index !== -1) {
                                    updateTransaction(index, transaction);
                                  }
                                });
                              }}
                              onDragStart={() => {}}
                              onDragOver={() => {}}
                              onDrop={() => {}}
                              dragOverCategory={null}
                              recentlyDropped={null}
                              onReorder={() => {}}
                              tutorialEditId={category.name === 'Essentials' ? 'category-editor-essentials' : undefined}
                            />
                          </Box>
                        ))}
                    </Box>
                  )}
                  
                  {/* Add Category Button */}
                  <Box id="add-category-button">
                    <AddCategoryButton />
                  </Box>
                  
                  {/* Hidden element for edit category button tutorial */}
                  <Box 
                    id="edit-category-button" 
                    sx={{ 
                      position: 'absolute', 
                      right: 70, 
                      top: 200,
                      width: 30,
                      height: 30,
                      opacity: 0,
                      pointerEvents: 'none'
                    }} 
                  />
                </>
              )}
              
              {activeStep === 1 && (
                <>
                  {transactions.some(t => t.category === 'Income') && budgetSummary && budgetPlan ? (
                    <Box sx={{ 
                      position: 'relative'
                    }}>
                      <Box sx={{ 
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
                            summary={budgetSummary as BudgetSummaryType} 
                            plan={budgetPlan as BudgetPlanType} 
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
            </>
          )}
        </Box>
      </Box>
      
      {/* Tutorial Overlay */}
      <TutorialOverlay 
        steps={tutorialSteps}
        onComplete={handleTutorialComplete}
        isOpen={showTutorial}
      />
      
      {/* Button to manually trigger tutorial (helpful for testing and when users want to see it again) */}
      {transactions.length > 0 && hasSeenTutorial && (
        <Box 
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            zIndex: 1000 
          }}
        >
          <Tooltip title="Show tutorial">
            <IconButton
              onClick={() => setShowTutorial(true)}
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};