import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Menu, 
  MenuItem, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  Slider, 
  Stack,
  FormControlLabel,
  Switch,
  Tooltip,
  Alert,
  Divider,
  Paper
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../contexts/CategoryContext';

export interface BudgetPreferences {
  ratios: {
    essentials: number;
    wants: number;
    savings: number;
    [key: string]: number; // Allow for dynamic categories
  };
  categoryCustomization: {
    essentials: {
      name: string;
      color: string;
      icon: string;
    };
    wants: {
      name: string;
      color: string;
      icon: string;
    };
    savings: {
      name: string;
      color: string;
      icon: string;
    };
    [key: string]: {
      name: string;
      color: string;
      icon: string;
    }; // Allow for dynamic categories
  };
  chartPreferences: {
    showPieChart: boolean;
    showBarChart: boolean;
    showProgressBars: boolean;
    showSuggestions: boolean;
  };
  displayPreferences: {
    showActualAmounts: boolean;
    showPercentages: boolean;
    showDifferences: boolean;
  };
  budgetId?: string; // Store which budget these preferences belong to
}

interface BudgetActionsProps {
  title?: string;
  onPreferencesChange?: (preferences: BudgetPreferences) => void;
}

const defaultPreferences: BudgetPreferences = {
  ratios: {
    essentials: 50,
    wants: 30,
    savings: 20
  },
  chartPreferences: {
    showPieChart: true,
    showBarChart: true,
    showProgressBars: true,
    showSuggestions: true
  },
  displayPreferences: {
    showPercentages: true,
    showActualAmounts: true,
    showDifferences: true
  },
  categoryCustomization: {
    essentials: { name: 'Essentials', icon: '🏠', color: '#2196f3' },
    wants: { name: 'Wants', icon: '🛍️', color: '#ff9800' },
    savings: { name: 'Savings', icon: '💰', color: '#4caf50' }
  }
};

export function BudgetActions({ title = "Insights and Planning", onPreferencesChange }: BudgetActionsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<BudgetPreferences>({
    ...defaultPreferences,
    ratios: { ...defaultPreferences.ratios },
    categoryCustomization: { ...defaultPreferences.categoryCustomization },
    chartPreferences: { ...defaultPreferences.chartPreferences },
    displayPreferences: { ...defaultPreferences.displayPreferences }
  });
  const [tempPreferences, setTempPreferences] = useState<BudgetPreferences>({
    ...defaultPreferences,
    ratios: { ...defaultPreferences.ratios },
    categoryCustomization: { ...defaultPreferences.categoryCustomization },
    chartPreferences: { ...defaultPreferences.chartPreferences },
    displayPreferences: { ...defaultPreferences.displayPreferences }
  });
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentBudgetId, categories, updateCategory } = useCategories();

  // Load preferences from Firestore when component mounts or budget changes
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user || !currentBudgetId) return;

      try {
        console.log(`[BudgetActions] Loading preferences for budget: ${currentBudgetId}`);
        
        // First check if budget-specific preferences exist
        const budgetPrefsRef = doc(db, 'users', user.id, 'budgets', currentBudgetId);
        const budgetDoc = await getDoc(budgetPrefsRef);
        
        if (budgetDoc.exists() && budgetDoc.data()?.preferences) {
          // Budget has its own preferences
          console.log('[BudgetActions] Found budget-specific preferences');
          const savedPreferences = budgetDoc.data().preferences;
          setPreferences(savedPreferences);
          setTempPreferences(savedPreferences);
          return;
        }
        
        // Check for global preferences as fallback (for backward compatibility)
        console.log('[BudgetActions] No budget-specific preferences, checking global preferences');
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data()?.budgetPreferences) {
          const globalPreferences = userDoc.data().budgetPreferences;
          
          // Add budgetId to identify which budget these belong to
          const prefsWithBudgetId = {
            ...globalPreferences,
            budgetId: currentBudgetId
          };
          
          console.log('[BudgetActions] Found global preferences, migrating to budget-specific');
          setPreferences(prefsWithBudgetId);
          setTempPreferences(prefsWithBudgetId);
          
          // Migrate global preferences to budget-specific storage
          await updateDoc(budgetPrefsRef, {
            preferences: prefsWithBudgetId
          });
          return;
        }

        // If no preferences found anywhere, use default with current budget categories
        console.log('[BudgetActions] No preferences found, using defaults based on current categories');
        
        // Initialize preferences based on current categories
        const categoryPrefs: Record<string, { name: string, color: string, icon: string }> = {};
        const ratios: Record<string, number> = {};
        
        // Calculate total percentage allocated
        let totalPercentage = 0;
        
        // Process each category
        categories.forEach(category => {
          if (category.isIncome) return; // Skip income category
          
          const categoryId = category.id.toLowerCase();
          
          // Add to customization
          categoryPrefs[categoryId] = {
            name: category.name,
            color: category.color,
            icon: category.icon
          };
          
          // Add to ratios
          const percentage = category.percentage || 0;
          ratios[categoryId] = percentage;
          totalPercentage += percentage;
        });
        
        // If total percentage doesn't add up to 100, adjust
        if (totalPercentage !== 100 && totalPercentage > 0) {
          // Scale all percentages to make them sum to 100
          const scaleFactor = 100 / totalPercentage;
          Object.keys(ratios).forEach(categoryId => {
            ratios[categoryId] = Math.round(ratios[categoryId] * scaleFactor);
          });
        } else if (totalPercentage === 0) {
          // Use default 50/30/20 distribution if no percentages are defined
          if ('essentials' in ratios) ratios.essentials = 50;
          if ('wants' in ratios) ratios.wants = 30;
          if ('savings' in ratios) ratios.savings = 20;
        }
        
        const newPrefs = {
          ...defaultPreferences,
          categoryCustomization: {
            ...defaultPreferences.categoryCustomization,
            ...categoryPrefs
          },
          ratios: {
            ...defaultPreferences.ratios,
            ...ratios
          },
          budgetId: currentBudgetId
        };
        
        setPreferences(newPrefs);
        setTempPreferences(newPrefs);
        
        // Save the default preferences for this budget
        await updateDoc(budgetPrefsRef, {
          preferences: newPrefs
        });
        
      } catch (error) {
        console.error('[BudgetActions] Error loading budget preferences:', error);
        setError('Failed to load preferences');
      }
    };

    loadPreferences();
  }, [user, currentBudgetId, categories]);

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setAnchorEl(null);
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
    handleSettingsClose();
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
    setTempPreferences(preferences); // Reset temp preferences
  };

  const handleSavePreferences = async () => {
    if (!user || !currentBudgetId) {
      setError('No active budget selected');
      return;
    }

    try {
      // Validate that ratios sum to 100
      const ratioValues = Object.values(tempPreferences.ratios);
      const totalRatio = ratioValues.reduce((sum, value) => sum + value, 0);
      
      if (Math.round(totalRatio) !== 100) {
        setError('Budget ratios must sum to 100%');
        return;
      }

      // Ensure budgetId is set
      const prefsToSave = {
        ...tempPreferences,
        budgetId: currentBudgetId
      };

      // Save to Firestore in the budget's document
      const budgetDocRef = doc(db, 'users', user.id, 'budgets', currentBudgetId);
      await updateDoc(budgetDocRef, {
        preferences: prefsToSave
      });

      console.log(`[BudgetActions] Saved preferences for budget: ${currentBudgetId}`);

      // Update local state
      setPreferences(prefsToSave);
      if (onPreferencesChange) {
        onPreferencesChange(prefsToSave);
      }

      // Dispatch a custom event to notify that preferences have changed
      const event = new CustomEvent('budgetPreferencesChanged', { 
        detail: { preferences: prefsToSave, budgetId: currentBudgetId } 
      });
      window.dispatchEvent(event);

      // Update category percentages in the CategoryContext
      try {
        // For each category that has a ratio, update its percentage
        const categoryUpdates = categories
          .filter(cat => !cat.isIncome && tempPreferences.ratios[cat.id])
          .map(cat => ({
            id: cat.id,
            percentage: tempPreferences.ratios[cat.id] || 0
          }));
          
        console.log('[BudgetActions] Updating category percentages:', categoryUpdates);
        
        // Use updateCategory from the CategoryContext
        // Don't use direct function calls inside loops to avoid race conditions
        for (const update of categoryUpdates) {
          try {
            await updateCategory(update.id, { percentage: update.percentage });
          } catch (err) {
            console.warn(`[BudgetActions] Failed to update category ${update.id}:`, err);
          }
        }
      } catch (categoryError) {
        console.error('[BudgetActions] Failed to update category percentages:', categoryError);
        // Don't block the preferences save due to category update failures
      }

      setSettingsOpen(false);
      setError(null);
    } catch (error) {
      console.error('[BudgetActions] Error saving budget preferences:', error);
      setError('Failed to save preferences');
    }
  };

  const handleRatioChange = (category: keyof BudgetPreferences['ratios']) => (
    event: Event,
    newValue: number | number[]
  ) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setTempPreferences(prev => ({
      ...prev,
      ratios: {
        ...prev.ratios,
        [category]: value
      }
    }));
  };

  // Add defensive check before mapping through categories in the JSX
  // Safely get category ratio
  const getCategoryRatio = (categoryId: string) => {
    // Ensure ratios exist and has the category, otherwise use 0
    return (tempPreferences.ratios && tempPreferences.ratios[categoryId]) || 0;
  };

  // Safely get category customization
  const getCategoryCustomization = (categoryId: string) => {
    return (tempPreferences.categoryCustomization && 
            tempPreferences.categoryCustomization[categoryId]) || {
      name: categories.find(c => c.id === categoryId)?.name || '',
      color: categories.find(c => c.id === categoryId)?.color || '#cccccc',
      icon: categories.find(c => c.id === categoryId)?.icon || '📊'
    };
  };

  // If no active budget or user, show limited UI
  if (!currentBudgetId || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mx: 0 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            ml: 0,
            pl: 0,
            color: '#43a047',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            letterSpacing: '0.5px',
            padding: '0.2rem 0',
            display: 'inline-block'
          }}
        >
          {title}
        </Typography>
        <Tooltip title="Please select a budget to customize settings">
          <span>
            <IconButton 
              onClick={handleSettingsClick} 
              disabled={!currentBudgetId || !user}
              sx={{ color: 'primary.main', opacity: 0.5 }}
            >
              <SettingsIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mx: 0 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            ml: 0,
            pl: 0,
            color: '#43a047',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            letterSpacing: '0.5px',
            padding: '0.2rem 0',
            display: 'inline-block'
          }}
        >
          {title}
        </Typography>
        <Tooltip title="Customize budget settings">
          <IconButton 
            onClick={handleSettingsClick} 
            sx={{ color: 'primary.main' }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleSettingsClose}
      >
        <MenuItem onClick={handleOpenSettings}>Customize Budget Plan</MenuItem>
      </Menu>

      <Dialog 
        open={settingsOpen} 
        onClose={handleCloseSettings}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Budget Plan Settings
          {currentBudgetId && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
              For budget: {currentBudgetId}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Budget Ratios
          </Typography>
          <Stack spacing={3} sx={{ mb: 4 }}>
            {/* Generate ratio sliders dynamically from categories */}
            {categories
              .filter((cat) => !cat.isIncome)
              .map((category) => {
                const categoryId = category.id.toLowerCase();
                return (
                  <Box key={categoryId}>
                    <Typography gutterBottom>
                      {category.name}: {getCategoryRatio(categoryId)}%
                    </Typography>
                    <Slider
                      value={getCategoryRatio(categoryId)}
                      onChange={handleRatioChange(categoryId)}
                      min={0}
                      max={100}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                );
              })}
          </Stack>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Chart Preferences
          </Typography>
          <Stack spacing={2}>
            {Object.entries(tempPreferences.chartPreferences).map(([key, value]) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={value}
                    onChange={(e) => setTempPreferences(prev => ({
                      ...prev,
                      chartPreferences: {
                        ...prev.chartPreferences,
                        [key]: e.target.checked
                      }
                    }))}
                  />
                }
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              />
            ))}
          </Stack>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Display Preferences
          </Typography>
          <Stack spacing={2}>
            {Object.entries(tempPreferences.displayPreferences).map(([key, value]) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={value}
                    onChange={(e) => setTempPreferences(prev => ({
                      ...prev,
                      displayPreferences: {
                        ...prev.displayPreferences,
                        [key]: e.target.checked
                      }
                    }))}
                  />
                }
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              />
            ))}
          </Stack>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Category Customization
          </Typography>
          {/* Generate category customization UI dynamically from categories */}
          {categories
            .filter((cat) => !cat.isIncome)
            .map((category) => {
              const categoryId = category.id.toLowerCase();
              const settings = getCategoryCustomization(categoryId);
              
              return (
                <Box key={categoryId} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {category.name}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Name"
                      value={settings.name}
                      onChange={(e) => setTempPreferences(prev => ({
                        ...prev,
                        categoryCustomization: {
                          ...prev.categoryCustomization,
                          [categoryId]: {
                            ...prev.categoryCustomization[categoryId] || {},
                            name: e.target.value
                          }
                        }
                      }))}
                      size="small"
                    />
                    <TextField
                      label="Icon"
                      value={settings.icon}
                      onChange={(e) => setTempPreferences(prev => ({
                        ...prev,
                        categoryCustomization: {
                          ...prev.categoryCustomization,
                          [categoryId]: {
                            ...prev.categoryCustomization[categoryId] || {},
                            icon: e.target.value
                          }
                        }
                      }))}
                      size="small"
                    />
                    <TextField
                      label="Color"
                      value={settings.color}
                      onChange={(e) => setTempPreferences(prev => ({
                        ...prev,
                        categoryCustomization: {
                          ...prev.categoryCustomization,
                          [categoryId]: {
                            ...prev.categoryCustomization[categoryId] || {},
                            color: e.target.value
                          }
                        }
                      }))}
                      size="small"
                      type="color"
                    />
                  </Stack>
                </Box>
              );
            })}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings}>Cancel</Button>
          <Button onClick={handleSavePreferences} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 