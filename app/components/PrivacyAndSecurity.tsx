import React, { useState } from 'react';
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
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Lock as LockIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  Key as KeyIcon,
  Shield as ShieldIcon,
  PrivacyTip as PrivacyTipIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function PrivacyAndSecurity() {
  const { user, updatePassword } = useAuth();
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [privacySettings, setPrivacySettings] = useState({
    shareUsageData: true,
    allowPersonalization: true,
    showProfilePublicly: false,
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setNotification({
        type: 'error',
        message: 'New passwords do not match',
      });
      return;
    }

    try {
      await updatePassword(passwordData.currentPassword, passwordData.newPassword);
      setNotification({
        type: 'success',
        message: 'Password updated successfully',
      });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to update password. Please check your current password and try again.',
      });
    }
  };

  const handlePrivacyToggle = (setting: keyof typeof privacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }));
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
          <Box>
            <Typography variant="h5" gutterBottom>
              Privacy & Security
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your account security and privacy preferences
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Password Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LockIcon />
                  Password Management
                </Typography>
                <Box component="form" onSubmit={handlePasswordChange} sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    sx={{ mb: 2 }}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    sx={{ mb: 2 }}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  >
                    Update Password
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Two-Factor Authentication Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <KeyIcon />
                  Two-Factor Authentication
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<ShieldIcon />}
                  onClick={() => {
                    setNotification({
                      type: 'info',
                      message: 'Two-factor authentication setup will be available soon.',
                    });
                  }}
                >
                  Set Up 2FA
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Privacy Settings Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PrivacyTipIcon />
                  Privacy Settings
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Usage Data Sharing"
                      secondary="Allow us to collect anonymous usage data to improve our services"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={privacySettings.shareUsageData}
                        onChange={() => handlePrivacyToggle('shareUsageData')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Personalization"
                      secondary="Allow personalized recommendations based on your activity"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={privacySettings.allowPersonalization}
                        onChange={() => handlePrivacyToggle('allowPersonalization')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Profile Visibility"
                      secondary="Make your profile visible to other users"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={privacySettings.showProfilePublicly}
                        onChange={() => handlePrivacyToggle('showProfilePublicly')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
} 