import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
  Avatar,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import CurrencySelector from './CurrencySelector';

export function AccountSettings() {
  const { user, updateUserPreferences, logout } = useAuth();
  const { mode, toggleColorMode } = useTheme();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  
  const [editMode, setEditMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    notifications: {
      email: user?.preferences?.notifications ?? true,
      push: true,
      budgetAlerts: true,
      goalReminders: true,
    },
    preferences: {
      darkMode: mode === 'dark',
      language: 'en',
    }
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        displayName: user.displayName || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationToggle = (key: string) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key as keyof typeof prev.notifications]
      }
    }));
  };

  const handleSaveChanges = async () => {
    try {
      await updateUserPreferences({
        notifications: formData.notifications.email,
        theme: formData.preferences.darkMode ? 'dark' : 'light'
      });
      setNotification({ type: 'success', message: 'Profile updated successfully!' });
      setEditMode(false);
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to update profile. Please try again.' });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to delete account. Please try again.' });
    }
    setShowDeleteDialog(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {notification && (
        <Alert 
          severity={notification.type} 
          sx={{ mb: 3 }}
          onClose={() => setNotification(null)}
        >
          {notification.message}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
          <Avatar
            sx={{ width: 80, height: 80, mr: 2 }}
          >
            {user?.displayName?.[0] || user?.email?.[0] || '?'}
          </Avatar>
          <Box>
            <Typography variant="h5" gutterBottom>
              Account Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your profile, preferences, and account settings
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Profile Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Profile Information
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Display Name"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    disabled={!editMode}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    value={formData.email}
                    disabled
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!editMode ? (
                      <Button
                        startIcon={<EditIcon />}
                        onClick={() => setEditMode(true)}
                        variant="outlined"
                      >
                        Edit Profile
                      </Button>
                    ) : (
                      <>
                        <Button
                          startIcon={<SaveIcon />}
                          onClick={handleSaveChanges}
                          variant="contained"
                        >
                          Save Changes
                        </Button>
                        <Button
                          onClick={() => setEditMode(false)}
                          variant="outlined"
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Preferences Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PaletteIcon />
                  Preferences
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Dark Mode"
                      secondary="Toggle dark/light theme"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={formData.preferences.darkMode}
                        onChange={() => {
                          toggleColorMode();
                          handleInputChange('preferences', {
                            ...formData.preferences,
                            darkMode: !formData.preferences.darkMode
                          });
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Currency"
                      secondary="Set your preferred currency display"
                    />
                    <ListItemSecondaryAction>
                      <CurrencySelector 
                        showLabel={false}
                        size="small"
                        variant="standard"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Notifications Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsIcon />
                  Notifications
                </Typography>
                <List>
                  {Object.entries(formData.notifications).map(([key, value]) => (
                    <ListItem key={key}>
                      <ListItemText 
                        primary={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        secondary={`Receive ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} notifications`}
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          edge="end"
                          checked={value}
                          onChange={() => handleNotificationToggle(key)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Danger Zone */}
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'error.main', color: 'error.contrastText' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon />
                  Danger Zone
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Once you delete your account, there is no going back. Please be certain.
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => setShowDeleteDialog(true)}
                  startIcon={<DeleteIcon />}
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete your account? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained">
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 