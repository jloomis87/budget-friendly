'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext'; // Adjust this import based on your auth setup
import CategoryBatchUpdate from '../components/CategoryBatchUpdate';

export default function BatchUpdatePage() {
  const { user } = useAuth(); // Get the current user from your auth context
  const [budgetId, setBudgetId] = useState<string | undefined>();
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  
  // Example categories - in a real app, you'd fetch these from your database
  useEffect(() => {
    // Simulating categories that would come from your database
    if (user) {
      setCategories([
        { id: 'cat1', name: 'Groceries' },
        { id: 'cat2', name: 'Rent' },
        { id: 'cat3', name: 'Utilities' },
        { id: 'cat4', name: 'Entertainment' }
      ]);
      
      // Set a default budget ID for demonstration
      setBudgetId('your-budget-id');
    }
  }, [user]);
  
  if (!user) {
    return <div className="p-4">Please sign in to access this page</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Transaction Batch Update</h1>
      
      <div className="mb-4">
        <p className="mb-2">Current User ID: {user.uid}</p>
        <p className="mb-2">Budget ID: {budgetId || 'None selected'}</p>
      </div>
      
      {/* Render the CategoryBatchUpdate component with the required props */}
      <CategoryBatchUpdate 
        userId={user.uid}
        budgetId={budgetId}
        categories={categories}
      />
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Use the top form to update all transactions from one category name to another</li>
          <li>Use the bottom button to update all transactions with the correct category IDs</li>
          <li>Both operations will update transactions in batches for efficiency</li>
        </ul>
      </div>
    </div>
  );
} 