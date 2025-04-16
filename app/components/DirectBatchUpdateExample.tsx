'use client';

import React, { useState } from 'react';
import { 
  updateCategoryNameForAllTransactions, 
  updateTransactionsWithCategoryId 
} from '../services/transactionService';

// This component shows how to directly call the batch update functions
// without creating a reusable component
export default function DirectBatchUpdateExample() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Example of directly calling updateCategoryNameForAllTransactions
  const handleUpdateGroceriesCategory = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // You would normally get these values from your auth context
      // and your application state
      const userId = 'your-user-id'; // Replace with actual user ID
      const oldCategoryName = 'Groceries';
      const newCategoryName = 'Food & Groceries';
      const budgetId = 'your-budget-id'; // Optional - replace with actual budget ID
      
      const count = await updateCategoryNameForAllTransactions(
        userId,
        oldCategoryName,
        newCategoryName,
        budgetId
      );
      
      setMessage(`Success! Updated ${count} transactions from "Groceries" to "Food & Groceries"`);
    } catch (error) {
      console.error('Error updating transactions:', error);
      setMessage('Failed to update transactions. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Example of directly calling updateTransactionsWithCategoryId
  const handleUpdateCategoryIds = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // You would normally get these values from your auth context
      // and your application state
      const userId = 'your-user-id'; // Replace with actual user ID
      const budgetId = 'your-budget-id'; // Replace with actual budget ID
      
      // This map would normally come from your categories in state/props
      const categoryMap = {
        'Groceries': 'grocery-id-123',
        'Rent': 'rent-id-456',
        'Utilities': 'utilities-id-789',
        'Entertainment': 'entertainment-id-012'
      };
      
      const count = await updateTransactionsWithCategoryId(
        userId,
        budgetId,
        categoryMap
      );
      
      setMessage(`Success! Updated ${count} transactions with category IDs`);
    } catch (error) {
      console.error('Error updating transaction category IDs:', error);
      setMessage('Failed to update transaction category IDs. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-xl font-bold mb-4">Direct Batch Update Examples</h2>
      
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-gray-700">
            Example: Update all "Groceries" transactions to "Food & Groceries"
          </p>
          <button
            onClick={handleUpdateGroceriesCategory}
            disabled={isLoading}
            className={`px-4 py-2 bg-blue-500 text-white rounded-md ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Updating...' : 'Update Groceries Category'}
          </button>
        </div>
        
        <div>
          <p className="mb-2 text-gray-700">
            Example: Update all transactions with their corresponding category IDs
          </p>
          <button
            onClick={handleUpdateCategoryIds}
            disabled={isLoading}
            className={`px-4 py-2 bg-blue-500 text-white rounded-md ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Updating...' : 'Update All Category IDs'}
          </button>
        </div>
        
        {message && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
            {message}
          </div>
        )}
      </div>
      
      <div className="mt-6 text-sm text-gray-500 border-t pt-4">
        <p>Note: Replace the hardcoded IDs with actual values from your authentication context and state.</p>
      </div>
    </div>
  );
} 