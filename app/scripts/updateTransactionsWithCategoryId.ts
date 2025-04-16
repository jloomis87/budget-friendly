import { 
  collection, 
  getDocs, 
  updateDoc, 
  writeBatch, 
  doc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Category } from '../contexts/CategoryContext';
import type { Transaction } from '../services/fileParser';

/**
 * Updates all transactions for a specific user and budget with categoryId
 * based on their category name.
 * 
 * @param userId The user ID
 * @param budgetId The budget ID
 * @param categories The array of categories with id and name
 * @returns The number of transactions updated
 */
export const updateTransactionsWithCategoryId = async (
  userId: string,
  budgetId: string,
  categories: Category[]
): Promise<number> => {
  if (!userId || !budgetId) {
    throw new Error('User ID and budget ID are required to update transactions');
  }
  
  if (!categories || categories.length === 0) {
    throw new Error('Categories array is required to match category names to IDs');
  }
  
  try {
    // Create a map of category names to category IDs for quick lookup
    const categoryMap: Record<string, string> = {};
    categories.forEach(category => {
      categoryMap[category.name] = category.id;
    });
    
    // Get the transactions collection for this budget
    const transactionsRef = collection(db, 'users', userId, 'budgets', budgetId, 'transactions');
    
    // Get all transactions for this budget
    const transactionsSnapshot = await getDocs(transactionsRef);
    
    if (transactionsSnapshot.empty) {
      console.log(`No transactions found for budget ${budgetId}`);
      return 0;
    }
    
    console.log(`Found ${transactionsSnapshot.size} transactions to process`);
    
    // Use a batch to update all transactions
    const batchSize = 450; // Firestore batch limit is 500
    let batch = writeBatch(db);
    let operationCount = 0;
    let updatedCount = 0;
    
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
            console.log(`Committing batch with ${operationCount} updates`);
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        }
      }
    }
    
    // Commit any remaining updates
    if (operationCount > 0) {
      console.log(`Committing final batch with ${operationCount} updates`);
      await batch.commit();
    }
    
    console.log(`Successfully updated ${updatedCount} transactions with categoryId`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating transactions with categoryId:', error);
    throw error;
  }
};

/**
 * Updates transaction in a specific category with the correct categoryId
 * 
 * @param userId The user ID
 * @param budgetId The budget ID
 * @param category The category object with id and name
 * @returns The number of transactions updated
 */
export const updateCategoryTransactionsWithCategoryId = async (
  userId: string,
  budgetId: string,
  category: Category
): Promise<number> => {
  if (!userId || !budgetId || !category) {
    throw new Error('User ID, budget ID, and category are required');
  }
  
  try {
    // Get the transactions collection for this budget
    const transactionsRef = collection(db, 'users', userId, 'budgets', budgetId, 'transactions');
    
    // Query for transactions in this category
    const categoryQuery = query(
      transactionsRef,
      where('category', '==', category.name)
    );
    
    const querySnapshot = await getDocs(categoryQuery);
    
    if (querySnapshot.empty) {
      console.log(`No transactions found for category "${category.name}"`);
      return 0;
    }
    
    console.log(`Found ${querySnapshot.size} transactions in category "${category.name}"`);
    
    // Use a batch to update all transactions
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    querySnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      
      // Only update if categoryId is different or doesn't exist
      if (!data.categoryId || data.categoryId !== category.id) {
        batch.update(docSnapshot.ref, {
          categoryId: category.id,
          updatedAt: new Date().toISOString()
        });
        updatedCount++;
      }
    });
    
    if (updatedCount === 0) {
      console.log(`No transactions need categoryId updates for category "${category.name}"`);
      return 0;
    }
    
    console.log(`Committing batch with ${updatedCount} updates for category "${category.name}"`);
    await batch.commit();
    
    return updatedCount;
  } catch (error) {
    console.error(`Error updating transactions for category "${category.name}":`, error);
    throw error;
  }
}; 