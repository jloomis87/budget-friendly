import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  useTheme, 
  useMediaQuery, 
  Divider,
  CircularProgress
} from '@mui/material';
import { useTransactions } from '../hooks/useTransactions';
import { DashboardCard } from './DashboardCard';
import { useCategories } from '../contexts/CategoryContext';
import { useTableColors } from '../hooks/useTableColors';
import { isColorDark } from '../utils/colorUtils';
import { Transaction } from '../services/fileParser';

// Add global TypeScript definition for our custom window methods
declare global {
  interface Window {
    updateAllTransactionsWithIcon?: (category: string, icon: string) => Promise<void>;
  }
}

export function Dashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Get transactions from the hook
  const { 
    transactions, 
    budgetSummary, 
    budgetPlan, 
    isLoading,
    updateTransactionByDescription,
    updateAllTransactionsWithSameName
  } = useTransactions();
  
  // Get categories from the context
  const { categories } = useCategories();
  
  // Get table colors - fix the way we access the hook
  const tableColors = useTableColors();
  const getTableColor = (category: string) => {
    // Simple implementation - ideally we would use what's provided by the hook
    return category === 'Income' ? '#4CAF50' : 
           category === 'Housing' ? '#2196F3' : 
           category === 'Food' ? '#FF9800' : 
           category === 'Transportation' ? '#F44336' : 
           category === 'Entertainment' ? '#9C27B0' : 
           category === 'Healthcare' ? '#00BCD4' : 
           category === 'Personal' ? '#795548' : 
           category === 'Education' ? '#607D8B' : 
           category === 'Savings' ? '#FFC107' : 
           category === 'Misc' ? '#9E9E9E' : 
           '#9E9E9E'; // Default color
  };
  
  // Group transactions by category
  const transactionsByCategory = React.useMemo(() => {
    if (!transactions?.length) {
      return {};
    }
    
    return transactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
      const category = transaction.category || 'Uncategorized';
      
      if (!acc[category]) {
        acc[category] = [];
      }
      
      acc[category].push(transaction);
      return acc;
    }, {});
  }, [transactions]);
  
  // Handle card click - we could show a detailed view or edit screen
  const handleCardClick = (transaction: Transaction) => {
   
    // Implement click handler as needed
  };
  
  // Register global handler for updating all transactions with the same icon
  useEffect(() => {
    // Global function to update all transactions with the same name
    window.updateAllTransactionsWithIcon = async (category: string, icon: string) => {
      // Since we can't include the description in the type definition to match existing code,
      // we'll handle it here and expect the description to be passed as part of the icon string
      // in format "icon|description"
      let actualIcon = icon;
      let description = '';
      
     
      
      // If the icon contains a pipe character, split it to get the description
      if (icon.includes('|')) {
        const parts = icon.split('|');
        actualIcon = parts[0];
        description = parts[1];
      
      }
      
      if (!description) {
      
        return;
      }
      
    
      
      // This is the improved approach - use the hook's built-in function to update all transactions
      // with the same name at once, rather than doing individual updates
      try {
        // Use the dedicated hook function that's designed to update all matching transactions at once
        if (updateAllTransactionsWithSameName) {
        
          
          const count = await updateAllTransactionsWithSameName(description, actualIcon);
       
          return;
        } else {
          console.error("[DEBUG] updateAllTransactionsWithSameName function not available");
        }
      } catch (error) {
        console.error("[DEBUG] Error updating all transactions with same name:", error);
      }
    };
    
    return () => {
      delete window.updateAllTransactionsWithIcon;
    };
  }, [updateAllTransactionsWithSameName, transactions]);

  // Display loading state
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%', 
        minHeight: '400px'
      }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  // Display empty state
  if (!transactions?.length) {
    return (
      <Box sx={{ 
        padding: 4, 
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
        mt: 4
      }}>
        <Typography variant="h5" gutterBottom>
          Welcome to your Budget Dashboard
        </Typography>
        <Typography variant="body1">
          Start by adding your income and expenses in the Transactions tab.
          Once you have added some transactions, your dashboard will display a summary
          of your budget and spending patterns.
        </Typography>
      </Box>
    );
  }

  // Calculate net income since it might not be directly available in the budgetSummary
  const netIncome = budgetSummary ? 
    (budgetSummary.totalIncome || 0) - (budgetSummary.totalExpenses || 0) : 0;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Budget Summary */}
      <Paper sx={{ 
        p: 3, 
        mb: 4,
        bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Budget Summary</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              p: 2, 
              bgcolor: isDark ? 'rgba(0, 128, 0, 0.2)' : 'rgba(0, 128, 0, 0.1)',
              borderRadius: 1,
              textAlign: 'center'
            }}>
              <Typography variant="subtitle1">Total Income</Typography>
              <Typography variant="h4" sx={{ color: '#4CAF50' }}>
                ${budgetSummary?.totalIncome.toFixed(2) || '0.00'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              p: 2, 
              bgcolor: isDark ? 'rgba(211, 47, 47, 0.2)' : 'rgba(211, 47, 47, 0.1)',
              borderRadius: 1,
              textAlign: 'center'
            }}>
              <Typography variant="subtitle1">Total Expenses</Typography>
              <Typography variant="h4" sx={{ color: '#FF5252' }}>
                ${budgetSummary?.totalExpenses.toFixed(2) || '0.00'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              p: 2, 
              bgcolor: isDark 
                ? netIncome >= 0 ? 'rgba(0, 128, 0, 0.2)' : 'rgba(211, 47, 47, 0.2)'
                : netIncome >= 0 ? 'rgba(0, 128, 0, 0.1)' : 'rgba(211, 47, 47, 0.1)',
              borderRadius: 1,
              textAlign: 'center'
            }}>
              <Typography variant="subtitle1">Net Income</Typography>
              <Typography variant="h4" sx={{ 
                color: netIncome >= 0 ? '#4CAF50' : '#FF5252'
              }}>
                ${netIncome.toFixed(2)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Recent Transactions */}
      <Typography variant="h5" sx={{ mb: 2, mt: 4 }}>Recent Transactions</Typography>
      <Grid container spacing={3}>
        {Object.entries(transactionsByCategory).map(([category, categoryTransactions]) => {
          // Get the category color
          const categoryObject = categories.find(c => c.name === category);
          const categoryColor = categoryObject?.color || getTableColor(category);
          
          return (
            <Grid item xs={12} md={6} lg={4} key={category}>
              <Paper sx={{ 
                p: 2, 
                height: '100%',
                bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                borderRadius: 2
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2, 
                    pb: 1, 
                    borderBottom: '1px solid',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    color: categoryColor,
                    fontWeight: 600
                  }}
                >
                  {category}
                </Typography>
                
                <Box sx={{ maxHeight: isMobile ? '300px' : '400px', overflowY: 'auto', pr: 1 }}>
                  {categoryTransactions.slice(0, 5).map((transaction, index) => (
                    <DashboardCard
                      key={transaction.id || index}
                      transaction={transaction}
                      isDark={isDark}
                      backgroundColor={isDark ? 'rgba(50, 50, 50, 0.8)' : 'rgba(255, 255, 255, 0.7)'}
                      onClick={() => handleCardClick(transaction)}
                    />
                  ))}
                  
                  {categoryTransactions.length > 5 && (
                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 1, opacity: 0.7 }}>
                      +{categoryTransactions.length - 5} more transactions
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
} 