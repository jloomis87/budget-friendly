'use client';

import React from 'react';
import { Box, Typography, Container, Divider, Paper } from '@mui/material';
import UpdateTransactionCategoryIds from '../../components/UpdateTransactionCategoryIds';
import { useAuth } from '../../contexts/AuthContext';

export default function AdvancedSettings() {
  const { isAuthenticated, user } = useAuth();
  
  // Only authorized users should access this page
  if (!isAuthenticated || !user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom>
            Authentication Required
          </Typography>
          <Typography variant="body1">
            You need to be logged in to access advanced settings.
          </Typography>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Advanced Settings
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        These settings are for advanced users and administrators. 
        Use with caution as they can affect your data and application performance.
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Database Maintenance
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Tools for maintaining and fixing your database records.
        </Typography>
        
        <UpdateTransactionCategoryIds />
        
        {/* Add more advanced settings components here */}
      </Box>
    </Container>
  );
} 