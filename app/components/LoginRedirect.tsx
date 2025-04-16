import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button,
  Paper,
  CircularProgress
} from '@mui/material';
import { AuthModal } from './auth/AuthModal';

/**
 * Component to display when user needs to log in
 * Used as an alternative to redirects which can cause infinite loops
 */
export function LoginRedirect() {
  const [authModalOpen, setAuthModalOpen] = useState(true);
  
  const handleCloseAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 8 }}>
      <Paper 
        elevation={2}
        sx={{ 
          py: { xs: 4, md: 8 },
          px: 4,
          textAlign: 'center',
          position: 'relative',
          borderRadius: 4,
          maxWidth: 800,
          mx: 'auto',
          mt: 4
        }}
      >
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ fontWeight: 700, mb: 2 }}
        >
          Please Log In
        </Typography>
        
        <Typography 
          variant="h6" 
          sx={{ mb: 4, color: 'text.secondary', maxWidth: 600, mx: 'auto' }}
        >
          You need to be logged in to access this page and manage your budget
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          onClick={() => setAuthModalOpen(true)}
          sx={{ 
            py: 1.5, 
            px: 4, 
            borderRadius: 2,
            fontWeight: 600
          }}
        >
          Log In Now
        </Button>
      </Paper>
      
      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onClose={handleCloseAuthModal} 
        initialTab="login"
      />
    </Container>
  );
}
