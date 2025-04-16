import React, { useState } from 'react';
import { Button, Paper, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../contexts/CategoryContext';
import { collection, getDocs, query, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * A component that updates all transactions to include categoryId based on their category name
 */
const UpdateTransactionCategoryIds: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { categories, currentBudgetId } = useCategories();

  // Function to update transactions with categoryId
  const updateTransactions = async () => {
    if (!isAuthenticated || !user?.id || !currentBudgetId || categories.length === 0) {
      setResult({
        success: false,
        message: 'Missing required data (user, budget, or categories)'
      });
      return;
    }

    setIsUpdating(true);
    setResult(null);

    try {
      // Create a map of category names to category IDs
      const categoryMap: Record<string, string> = {};
      categories.forEach(category => {
        categoryMap[category.name] = category.id;
      });

      // Get the transactions collection
      const transactionsRef = collection(db, 'users', user.id, 'budgets', currentBudgetId, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);

      if (transactionsSnapshot.empty) {
        setResult({
          success: true,
          message: 'No transactions found for this budget'
        });
        setIsUpdating(false);
        return;
      }

      // Use batches for better performance (Firestore batch limit is 500 operations)
      const batchSize = 450;
      let batch = writeBatch(db);
      let operationCount = 0;
      let updatedCount = 0;
      let totalTransactions = transactionsSnapshot.size;

      // Process each transaction
      for (const docSnapshot of transactionsSnapshot.docs) {
        const data = docSnapshot.data();
        const category = data.category;

        // Find the corresponding categoryId
        if (category && categoryMap[category]) {
          const categoryId = categoryMap[category];

          // Only update if categoryId is different or doesn't exist
          if (!data.categoryId || data.categoryId !== categoryId) {
            batch.update(docSnapshot.ref, {
              categoryId: categoryId,
              updatedAt: new Date().toISOString()
            });

            updatedCount++;
            operationCount++;

            // If we've reached the batch limit, commit and start a new batch
            if (operationCount >= batchSize) {
              await batch.commit();
              batch = writeBatch(db);
              operationCount = 0;
            }
          }
        }
      }

      // Commit any remaining updates
      if (operationCount > 0) {
        await batch.commit();
      }

      setResult({
        success: true,
        message: `Successfully updated ${updatedCount} of ${totalTransactions} transactions with categoryId`
      });
    } catch (error) {
      console.error('Error updating transactions:', error);
      setResult({
        success: false,
        message: `Error updating transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null; // Don't show for non-authenticated users
  }

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Typography variant="h6" gutterBottom>
        Update Transaction Category IDs
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        This will update all transactions to include a categoryId field that matches the ID of their category.
        This helps ensure transactions are correctly linked to their categories.
      </Typography>
      
      <Box sx={{ mt: 2, mb: 2 }}>
        <Button
          variant="contained"
          onClick={updateTransactions}
          disabled={isUpdating || !currentBudgetId}
          startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {isUpdating ? 'Updating...' : 'Update Transaction Category IDs'}
        </Button>
      </Box>
      
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>
          {result.message}
        </Alert>
      )}
      
      {!currentBudgetId && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please select a budget first.
        </Alert>
      )}
    </Paper>
  );
};

export default UpdateTransactionCategoryIds; 