'use client';

import React, { useState } from 'react';
import { 
  updateCategoryNameForAllTransactions, 
  updateTransactionsWithCategoryId 
} from '../services/transactionService';

interface CategoryBatchUpdateProps {
  userId: string;
  budgetId?: string;
  categories?: { id: string; name: string }[];
}

export default function CategoryBatchUpdate({ 
  userId, 
  budgetId,
  categories = []
}: CategoryBatchUpdateProps) {
  // States for the first form
  const [oldCategoryName, setOldCategoryName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // State for the second form - category ID updates
  const [updateIdMessage, setUpdateIdMessage] = useState('');
  const [isLoadingIds, setIsLoadingIds] = useState(false);

  // Handle updating category names
  const handleUpdateCategoryName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!oldCategoryName || !newCategoryName) {
      setError('Please fill in both category names');
      return;
    }

    setIsLoading(true);
    setError('');
    setUpdateMessage('');
    
    try {
      const count = await updateCategoryNameForAllTransactions(
        userId,
        oldCategoryName,
        newCategoryName,
        budgetId
      );
      
      setUpdateMessage(`Successfully updated ${count} transactions from "${oldCategoryName}" to "${newCategoryName}"`);
    } catch (error) {
      console.error('Failed to update category names:', error);
      setError('Failed to update category names. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating category IDs
  const handleUpdateCategoryIds = async () => {
    if (!budgetId) {
      setError('Budget ID is required for updating category IDs');
      return;
    }

    setIsLoadingIds(true);
    setError('');
    setUpdateIdMessage('');
    
    try {
      // Create mapping of category names to IDs
      const categoryMap: Record<string, string> = {};
      categories.forEach(category => {
        categoryMap[category.name] = category.id;
      });
      
      const count = await updateTransactionsWithCategoryId(
        userId,
        budgetId,
        categoryMap
      );
      
      setUpdateIdMessage(`Successfully updated ${count} transactions with category IDs`);
    } catch (error) {
      console.error('Failed to update category IDs:', error);
      setError('Failed to update category IDs. See console for details.');
    } finally {
      setIsLoadingIds(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Batch Update Transactions</h2>
      
      {error && <div className="p-2 mb-4 bg-red-100 text-red-700 rounded">{error}</div>}
      
      {/* Form for updating category names */}
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Update Category Names</h3>
        <form onSubmit={handleUpdateCategoryName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Old Category Name:
              <input
                type="text"
                value={oldCategoryName}
                onChange={(e) => setOldCategoryName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter old category name"
                required
              />
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              New Category Name:
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter new category name"
                required
              />
            </label>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 bg-blue-500 text-white rounded-md ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Updating...' : 'Update Category Names'}
          </button>
        </form>
        
        {updateMessage && (
          <div className="mt-2 p-2 bg-green-100 text-green-700 rounded">
            {updateMessage}
          </div>
        )}
      </div>
      
      {/* Section for updating category IDs */}
      {categories.length > 0 && budgetId && (
        <div>
          <h3 className="font-semibold mb-2">Update Category IDs</h3>
          <p className="text-sm text-gray-600 mb-2">
            This will update all transactions to use the correct category IDs based on 
            their category names.
          </p>
          
          <button
            onClick={handleUpdateCategoryIds}
            disabled={isLoadingIds}
            className={`px-4 py-2 bg-blue-500 text-white rounded-md ${
              isLoadingIds ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isLoadingIds ? 'Updating...' : 'Update Category IDs'}
          </button>
          
          {updateIdMessage && (
            <div className="mt-2 p-2 bg-green-100 text-green-700 rounded">
              {updateIdMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 