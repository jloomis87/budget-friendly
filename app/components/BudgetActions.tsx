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
  Alert
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

export interface BudgetPreferences {
  ratios: {
    essentials: number;
    wants: number;
    savings: number;
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

export function BudgetActions({ title = "Your Budget Plan", onPreferencesChange }: BudgetActionsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<BudgetPreferences>(defaultPreferences);
  const [tempPreferences, setTempPreferences] = useState<BudgetPreferences>(defaultPreferences);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load preferences from Firestore when component mounts
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data()?.budgetPreferences) {
          const savedPreferences = userDoc.data().budgetPreferences;
          setPreferences(savedPreferences);
          setTempPreferences(savedPreferences);
        }
      } catch (error) {
        console.error('Error loading budget preferences:', error);
        setError('Failed to load preferences');
      }
    };

    loadPreferences();
  }, [user]);

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
    if (!user) return;

    try {
      // Validate that ratios sum to 100
      const { essentials, wants, savings } = tempPreferences.ratios;
      if (Math.round(essentials + wants + savings) !== 100) {
        setError('Budget ratios must sum to 100%');
        return;
      }

      // Save to Firestore
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        budgetPreferences: tempPreferences
      });

      // Update local state
      setPreferences(tempPreferences);
      if (onPreferencesChange) {
        onPreferencesChange(tempPreferences);
      }

      setSettingsOpen(false);
      setError(null);
    } catch (error) {
      console.error('Error saving budget preferences:', error);
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

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Tooltip title="Budget Settings">
          <IconButton onClick={handleSettingsClick}>
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
        <DialogTitle>Budget Plan Settings</DialogTitle>
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
            <Box>
              <Typography gutterBottom>Essentials: {tempPreferences.ratios.essentials}%</Typography>
              <Slider
                value={tempPreferences.ratios.essentials}
                onChange={handleRatioChange('essentials')}
                min={0}
                max={100}
                valueLabelDisplay="auto"
              />
            </Box>
            <Box>
              <Typography gutterBottom>Wants: {tempPreferences.ratios.wants}%</Typography>
              <Slider
                value={tempPreferences.ratios.wants}
                onChange={handleRatioChange('wants')}
                min={0}
                max={100}
                valueLabelDisplay="auto"
              />
            </Box>
            <Box>
              <Typography gutterBottom>Savings: {tempPreferences.ratios.savings}%</Typography>
              <Slider
                value={tempPreferences.ratios.savings}
                onChange={handleRatioChange('savings')}
                min={0}
                max={100}
                valueLabelDisplay="auto"
              />
            </Box>
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
          {Object.entries(tempPreferences.categoryCustomization).map(([category, settings]) => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Name"
                  value={settings.name}
                  onChange={(e) => setTempPreferences(prev => ({
                    ...prev,
                    categoryCustomization: {
                      ...prev.categoryCustomization,
                      [category]: {
                        ...prev.categoryCustomization[category as keyof typeof prev.categoryCustomization],
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
                      [category]: {
                        ...prev.categoryCustomization[category as keyof typeof prev.categoryCustomization],
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
                      [category]: {
                        ...prev.categoryCustomization[category as keyof typeof prev.categoryCustomization],
                        color: e.target.value
                      }
                    }
                  }))}
                  size="small"
                  type="color"
                />
              </Stack>
            </Box>
          ))}
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