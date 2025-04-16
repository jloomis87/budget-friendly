import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper,
  useTheme,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export function LoginPage() {
  const [activeTab, setActiveTab] = useState(0); // 0 for login, 1 for signup
  const { isAuthenticated, signIn, signUp, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Get the return URL from location state or default to home
  const from = location.state?.from?.pathname || '/';
  
  // If user becomes authenticated, redirect to the page they were trying to access
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);
  
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
        await signIn(loginEmail, loginPassword);
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
        await signUp(signupEmail, signupPassword, signupName);
      } catch (error) {
        // Error is handled by auth context
      }
    }
  };

  return (
    <Box 
      sx={{ 
        width: '100%',
        height: '100vh',
        bgcolor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background with subtle pattern */}
      <Box 
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: 'radial-gradient(#3f51b5 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          zIndex: 0
        }}
      />
      
      <Container 
        maxWidth="md" 
        sx={{ 
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box 
          sx={{ 
            mb: 4, 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <img 
            src="/logo/friendlybudgetslogo.svg" 
            alt="Friendly Budgets Logo" 
            style={{
              width: 1000, // 4x larger than before (was 250)
              marginBottom: '1rem',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
            }}
          />
        </Box>
        
        <Paper 
          elevation={4}
          sx={{ 
            py: { xs: 4, md: 5 },
            px: { xs: 3, md: 4 },
            textAlign: 'left',
            borderRadius: 4,
            width: '100%',
            maxWidth: 480,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ 
              mb: 4, 
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#4caf50', // Green text for active tab
                },
                '&:hover:not(.Mui-selected)': {
                  color: 'rgba(63, 81, 181)', // Lighter blue on hover for inactive tab
                  backgroundColor: 'transparent', // Keep background transparent
                  transition: 'all 0.1s ease',
                  borderBottom: '2px solid rgb(35, 68, 255)', // Blue underline on hover
                },
                py: 1.5,
              },
              '& .MuiTabs-indicator': {
                height: '2px',
             
                backgroundColor: '#4caf50', // Green indicator
              }
            }}
          >
            <Tab label="Log In" />
            <Tab label="Sign Up" />
          </Tabs>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
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
                variant="standard"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                error={!!formErrors.loginEmail}
                helperText={formErrors.loginEmail}
                disabled={isLoading}
                required
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root, & .MuiInput-root': {
                    backgroundColor: 'transparent',
                  },
                  '& .MuiInputBase-input': {
                    color: 'black', // Dark blue text
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green', // Blue label
                  },
                  '& .MuiInput-underline:after': {
                    borderBottomColor: '#4caf50', // Green underline when focused
                  },
                  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                    borderBottomColor: 'rgba(139, 195, 74, 0.3)', // Much lighter pale green underline on hover
                  },
                  '& .MuiInput-underline.Mui-focused:after': {
                    borderBottomColor: '1px solid rgba(139, 195, 74, 0.3)', // Ensure green underline when focused
                  },
                  // Override browser autofill styles
                  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
                    WebkitTransition: 'color 9999s ease-out, background-color 9999s ease-out',
                    WebkitTransitionDelay: '9999s',
                    WebkitBoxShadow: '0 0 0px 1000px transparent inset',
                    WebkitTextFillColor: 'black !important'
                  }
                }}
              />
              <TextField
                label="Password"
                fullWidth
                margin="normal"
                variant="standard"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                error={!!formErrors.loginPassword}
                helperText={formErrors.loginPassword}
                disabled={isLoading}
                required
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root, & .MuiInput-root': {
                    backgroundColor: 'transparent',
                  },
                  '& .MuiInputBase-input': {
                    color: 'black', // Dark blue text
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green', // Blue label
                  },
                  '& .MuiInput-underline:after': {
                    borderBottomColor: '#4caf50', // Green underline when focused
                  },
                  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                    borderBottomColor: 'rgba(139, 195, 74, 0.3)', // Much lighter pale green underline on hover
                  },
                  '& .MuiInput-underline.Mui-focused:after': {
                    borderBottomColor: '#4caf50', // Ensure green underline when focused
                  },
                  // Override browser autofill styles
                  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
                    WebkitTransition: 'color 9999s ease-out, background-color 9999s ease-out',
                    WebkitTransitionDelay: '9999s',
                    WebkitBoxShadow: '0 0 0px 1000px transparent inset',
                    WebkitTextFillColor: 'black !important'
                  }
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={isLoading}
                sx={{ 
                  py: 1.5, 
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem',
                  boxShadow: '0 4px 12px rgba(63, 81, 181, 0.2)',
                }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Log In'}
              </Button>
              
              {/* Add "Don't have an account?" link */}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setActiveTab(1)}
                    sx={{ 
                      fontWeight: 600, 
                      color: '#3f51b5',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Sign Up
                  </Link>
                </Typography>
              </Box>
            </Box>
          ) : (
            // Signup Form
            <Box component="form" onSubmit={handleSignupSubmit} noValidate>
              <TextField
                label="Full Name"
                fullWidth
                margin="normal"
                variant="standard"
                autoComplete="name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                error={!!formErrors.signupName}
                helperText={formErrors.signupName}
                disabled={isLoading}
                required
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root, & .MuiInput-root': {
                    backgroundColor: 'transparent',
                  },
                  '& .MuiInputBase-input': {
                    color: 'black', // Dark blue text
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green', // Blue label
                  },
                  '& .MuiInput-underline:after': {
                    borderBottomColor: '#4caf50', // Green underline when focused
                  },
                  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                    borderBottomColor: 'rgba(139, 195, 74, 0.3)', // Much lighter pale green underline on hover
                  },
                  '& .MuiInput-underline.Mui-focused:after': {
                    borderBottomColor: '#4caf50', // Ensure green underline when focused
                  },
                  // Override browser autofill styles
                  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
                    WebkitTransition: 'color 9999s ease-out, background-color 9999s ease-out',
                    WebkitTransitionDelay: '9999s',
                    WebkitBoxShadow: '0 0 0px 1000px transparent inset',
                    WebkitTextFillColor: 'black !important'
                  }
                }}
              />
              <TextField
                label="Email Address"
                fullWidth
                margin="normal"
                variant="standard"
                autoComplete="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                error={!!formErrors.signupEmail}
                helperText={formErrors.signupEmail}
                disabled={isLoading}
                required
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root, & .MuiInput-root': {
                    backgroundColor: 'transparent',
                  },
                  '& .MuiInputBase-input': {
                    color: 'black', // Dark blue text
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green', // Blue label
                  },
                  '& .MuiInput-underline:after': {
                    borderBottomColor: '#4caf50', // Green underline when focused
                  },
                  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                    borderBottomColor: 'rgba(139, 195, 74, 0.3)', // Much lighter pale green underline on hover
                  },
                  '& .MuiInput-underline.Mui-focused:after': {
                    borderBottomColor: '#4caf50', // Ensure green underline when focused
                  },
                  // Override browser autofill styles
                  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
                    WebkitTransition: 'color 9999s ease-out, background-color 9999s ease-out',
                    WebkitTransitionDelay: '9999s',
                    WebkitBoxShadow: '0 0 0px 1000px transparent inset',
                    WebkitTextFillColor: 'black !important'
                  }
                }}
              />
              <TextField
                label="Password"
                fullWidth
                margin="normal"
                variant="standard"
                type="password"
                autoComplete="new-password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                error={!!formErrors.signupPassword}
                helperText={formErrors.signupPassword}
                disabled={isLoading}
                required
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root, & .MuiInput-root': {
                    backgroundColor: 'transparent',
                  },
                  '& .MuiInputBase-input': {
                    color: 'black', // Dark blue text
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green', // Blue label
                  },
                  '& .MuiInput-underline:after': {
                    borderBottomColor: '#4caf50', // Green underline when focused
                  },
                  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                    borderBottomColor: 'rgba(139, 195, 74, 0.3)', // Much lighter pale green underline on hover
                  },
                  '& .MuiInput-underline.Mui-focused:after': {
                    borderBottomColor: '#4caf50', // Ensure green underline when focused
                  },
                  // Override browser autofill styles
                  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
                    WebkitTransition: 'color 9999s ease-out, background-color 9999s ease-out',
                    WebkitTransitionDelay: '9999s',
                    WebkitBoxShadow: '0 0 0px 1000px transparent inset',
                    WebkitTextFillColor: 'black !important'
                  }
                }}
              />
              <TextField
                label="Confirm Password"
                fullWidth
                margin="normal"
                variant="standard"
                type="password"
                autoComplete="new-password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                error={!!formErrors.signupConfirmPassword}
                helperText={formErrors.signupConfirmPassword}
                disabled={isLoading}
                required
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root, & .MuiInput-root': {
                    backgroundColor: 'transparent',
                  },
                  '& .MuiInputBase-input': {
                    color: 'black', // Dark blue text
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green', // Blue label
                  },
                  '& .MuiInput-underline:after': {
                    borderBottomColor: '#4caf50', // Green underline when focused
                  },
                  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                    borderBottomColor: 'rgba(139, 195, 74, 0.3)', // Much lighter pale green underline on hover
                  },
                  '& .MuiInput-underline.Mui-focused:after': {
                    borderBottomColor: '#4caf50', // Ensure green underline when focused
                  },
                  // Override browser autofill styles
                  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
                    WebkitTransition: 'color 9999s ease-out, background-color 9999s ease-out',
                    WebkitTransitionDelay: '9999s',
                    WebkitBoxShadow: '0 0 0px 1000px transparent inset',
                    WebkitTextFillColor: 'black !important'
                  }
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={isLoading}
                sx={{ 
                  py: 1.5, 
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem',
                  boxShadow: '0 4px 12px rgba(63, 81, 181, 0.2)',
                }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Create Account'}
              </Button>
              
              {/* Add "Already have an account?" link */}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setActiveTab(0)}
                    sx={{ 
                      fontWeight: 600, 
                      color: '#3f51b5',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Log In
                  </Link>
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
} 