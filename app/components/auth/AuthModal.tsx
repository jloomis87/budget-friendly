import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
  InputAdornment,
} from '@mui/material';
import { CloseIcon } from '../../utils/materialIcons';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
}

export function AuthModal({ open, onClose, initialTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab === 'login' ? 0 : 1);
  const { login, signup, isLoading, error } = useAuth();
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab === 'login' ? 0 : 1);
  }, [initialTab, open]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setFormErrors({});
  };
  
  // Validate login form
  const validateLoginForm = () => {
    const errors: Record<string, string> = {};
    
    if (!loginEmail) {
      errors.loginEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(loginEmail)) {
      errors.loginEmail = 'Email is invalid';
    }
    
    if (!loginPassword) {
      errors.loginPassword = 'Password is required';
    } else if (loginPassword.length < 6) {
      errors.loginPassword = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Validate signup form
  const validateSignupForm = () => {
    const errors: Record<string, string> = {};
    
    if (!signupName) {
      errors.signupName = 'Name is required';
    }
    
    if (!signupEmail) {
      errors.signupEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(signupEmail)) {
      errors.signupEmail = 'Email is invalid';
    }
    
    if (!signupPassword) {
      errors.signupPassword = 'Password is required';
    } else if (signupPassword.length < 6) {
      errors.signupPassword = 'Password must be at least 6 characters';
    }
    
    if (!signupConfirmPassword) {
      errors.signupConfirmPassword = 'Please confirm your password';
    } else if (signupPassword !== signupConfirmPassword) {
      errors.signupConfirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateLoginForm()) {
      try {
        await login(loginEmail, loginPassword);
        onClose();
        resetForms();
      } catch (error) {
        // Error is handled by auth context
      }
    }
  };
  
  // Handle signup submit
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateSignupForm()) {
      try {
        await signup(signupEmail, signupPassword, signupName);
        onClose();
        resetForms();
      } catch (error) {
        // Error is handled by auth context
      }
    }
  };
  
  // Reset all form fields
  const resetForms = () => {
    setLoginEmail('');
    setLoginPassword('');
    setSignupName('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setFormErrors({});
  };
  
  // Handle dialog close
  const handleClose = () => {
    if (!isLoading) {
      onClose();
      resetForms();
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
          {activeTab === 0 ? 'Welcome Back' : 'Create an Account'}
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleClose}
          disabled={isLoading}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Login" />
          <Tab label="Sign Up" />
        </Tabs>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {activeTab === 0 ? (
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
              disabled={isLoading}
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
              disabled={isLoading}
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 600, borderRadius: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Log In'}
            </Button>
            <Typography variant="body2" align="center" color="textSecondary">
              Don't have an account? Switch to the Sign Up tab.
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 600, borderRadius: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>
            <Typography variant="body2" align="center" color="textSecondary">
              Already have an account? Switch to the Login tab.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
} 