import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import { BudgetApp } from '../components/BudgetApp';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';

// Enhanced landing page with modern auth UX
function HomePage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState<'login' | 'signup'>('login');
  const { isAuthenticated, user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Check if user is coming from a redirect with action parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'login' || action === 'signup') {
      setAuthModalOpen(true);
      setActiveAuthTab(action as 'login' | 'signup');
    }
  }, []);

  const handleOpenAuthModal = (tab: 'login' | 'signup' = 'login') => {
    setActiveAuthTab(tab);
    setAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      {!isAuthenticated && (
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
            mb: 2
          }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Friendly Budgets
          </Typography>
          
          <Box>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => handleOpenAuthModal('login')}
              sx={{ 
                mr: 1,
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Log In
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => handleOpenAuthModal('signup')}
              sx={{ 
                fontWeight: 600,
                borderRadius: 2,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                }
              }}
            >
              Sign Up
            </Button>
          </Box>
        </Box>
      )}

      {isAuthenticated ? (
        // Show the main budget app when authenticated
        <BudgetApp />
      ) : (
        // Show enhanced landing page when not authenticated
        <Box>
          {/* Hero Section */}
          <Box 
            sx={{ 
              py: { xs: 6, md: 10 },
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              mb: 8,
              background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(59,130,246,0.1) 100%)',
              borderRadius: 4,
            }}
          >
            <Box 
              sx={{
                position: 'absolute',
                top: -100,
                right: -100,
                width: 300,
                height: 300,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(37,99,235,0) 70%)',
                zIndex: 0,
              }}
            />
            
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography 
                variant="h2" 
                component="h2" 
                sx={{ 
                  fontWeight: 800, 
                  fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                  mb: 2,
                }}
              >
                Your Personal Budget, 
                <Box component="span" sx={{ display: 'block', color: 'primary.main' }}>
                  Personalized
                </Box>
              </Typography>
              
              <Typography 
                variant="h5" 
                component="div" 
                sx={{ 
                  mb: 6, 
                  maxWidth: 700, 
                  mx: 'auto', 
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                Simple budget tracking that helps you save more and spend wisely
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  size="large" 
                  onClick={() => handleOpenAuthModal('login')}
                  sx={{ 
                    py: 1.8, 
                    px: 4, 
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '1rem',
                    boxShadow: '0 4px 14px 0 rgba(37,99,235,0.4)',
                  }}
                >
                  Log In To Your Budget
                </Button>
                
                <Button 
                  variant="outlined" 
                  size="large" 
                  onClick={() => handleOpenAuthModal('signup')}
                  sx={{ 
                    py: 1.8, 
                    px: 4, 
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                    }
                  }}
                >
                  Create New Account
                </Button>
              </Box>
            </Box>
            
            <Box 
              sx={{
                position: 'absolute',
                bottom: -80,
                left: -60,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0) 70%)',
                zIndex: 0,
              }}
            />
          </Box>
          
          {/* Features Section */}
          <Box sx={{ mb: 10 }}>
            <Typography 
              variant="h4" 
              component="h3" 
              align="center" 
              sx={{ mb: 6, fontWeight: 700 }}
            >
              Why You'll Love Friendly Budgets
            </Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        mb: 3,
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                    </Box>
                    <Typography variant="h5" component="h4" gutterBottom fontWeight={600}>
                      Easy Expense Tracking
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Quickly log your income and expenses with our intuitive interface. Categorize spending to identify your habits.
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 4, pb: 3 }}>
                    <Button 
                      onClick={() => handleOpenAuthModal('signup')}
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    >
                      Try It Now
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        mb: 3,
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                    </Box>
                    <Typography variant="h5" component="h4" gutterBottom fontWeight={600}>
                      Budget Reminders
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Set up personalized budget goals and get recommendations to help you save more each month.
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 4, pb: 3 }}>
                    <Button 
                      onClick={() => handleOpenAuthModal('signup')}
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    >
                      Try It Now
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        mb: 3,
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                      </svg>
                    </Box>
                    <Typography variant="h5" component="h4" gutterBottom fontWeight={600}>
                      Insights & Analysis
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Visualize your spending patterns and get personalized insights to improve your financial habits.
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 4, pb: 3 }}>
                    <Button 
                      onClick={() => handleOpenAuthModal('signup')}
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    >
                      Try It Now
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </Box>
          
          {/* Call to Action */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 6, 
              textAlign: 'center',
              borderRadius: 4,
              mb: 6,
              bgcolor: 'primary.main',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h3" component="h2" gutterBottom fontWeight={700}>
                Ready to Take Control?
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, maxWidth: 700, mx: 'auto' }}>
                Create your free account today and start managing your finances like never before
              </Typography>
              <Button 
                variant="contained" 
                color="secondary" 
                size="large"
                onClick={() => handleOpenAuthModal('signup')}
                sx={{ 
                  py: 1.5, 
                  px: 4, 
                  borderRadius: 2,
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)',
                  }
                }}
              >
                Create Free Account
              </Button>
              <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
                Already have an account? <Button color="inherit" onClick={() => handleOpenAuthModal('login')} sx={{ fontWeight: 'bold', textDecoration: 'underline' }}>Log In</Button>
              </Typography>
            </Box>
            
            {/* Background decorative elements */}
            <Box 
              sx={{
                position: 'absolute',
                top: -100,
                right: -100,
                width: 300,
                height: 300,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
                zIndex: 0,
              }}
            />
            <Box 
              sx={{
                position: 'absolute',
                bottom: -80,
                left: -60,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
                zIndex: 0,
              }}
            />
          </Paper>
        </Box>
      )}

      {/* Auth Modal with initialTab prop */}
      <AuthModal 
        open={authModalOpen} 
        onClose={handleCloseAuthModal} 
        initialTab={activeAuthTab}
      />
    </Container>
  );
}

// Wrapped with AuthProvider
export default function WrappedHomePage() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  );
} 