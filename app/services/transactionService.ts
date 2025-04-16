import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  getDoc,
  limit,
  writeBatch,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Transaction } from '../services/fileParser';

// Get the transactions subcollection for a user
const getUserTransactionsRef = (userId: string) => {
  if (!userId || typeof userId !== 'string') {
    console.error('[Firebase] getUserTransactionsRef called with invalid userId:', userId);
    throw new Error('Valid user ID string is required');
  }
 
  return collection(db, 'users', userId, 'transactions');
};

// Get the transactions subcollection for a specific budget
const getBudgetTransactionsRef = (userId: string, budgetId: string) => {
  if (!userId || typeof userId !== 'string') {
    console.error('[Firebase] getBudgetTransactionsRef called with invalid userId:', userId);
    throw new Error('Valid user ID string is required');
  }

  if (!budgetId || typeof budgetId !== 'string') {
    console.error('[Firebase] getBudgetTransactionsRef called with invalid budgetId:', budgetId);
    throw new Error('Valid budget ID string is required');
  }
 
  return collection(db, 'users', userId, 'budgets', budgetId, 'transactions');
};

// Add a transaction to Firestore
export const addTransaction = async (
  userId: string, 
  transactionData: Omit<Transaction, 'id'>,
  budgetId?: string
): Promise<string> => {
  if (!userId) {
    throw new Error('User ID is required to add a transaction');
  }

  try {
    let transactionsRef;
    
    if (budgetId) {
      // If budgetId is provided, add to the budget's transactions collection
      transactionsRef = getBudgetTransactionsRef(userId, budgetId);
    } else {
      // Otherwise use the legacy path (for backward compatibility)
      transactionsRef = getUserTransactionsRef(userId);
    }
    
    // Default to 'Uncategorized' if category is undefined
    const category = transactionData.category || 'Uncategorized';
    
    // Use a simpler query that doesn't require a composite index
    const categoryQuery = query(
      transactionsRef,
      where('category', '==', category)
    );
    
    const categorySnapshot = await getDocs(categoryQuery);
    let nextOrder = 1; // Default to 1 if no existing transactions
    
    // If there are existing transactions, find the highest order manually
    if (!categorySnapshot.empty) {
      let highestOrder = 0;
      categorySnapshot.forEach(doc => {
        const order = doc.data().order || 0;
        if (order > highestOrder) {
          highestOrder = order;
        }
      });
      nextOrder = highestOrder + 1;
    }

    // Create the document data, ensuring we don't include undefined values
    const docData = {
      ...transactionData,
      category, // Use the category with fallback
      userId,
      order: nextOrder, // Set the order field
      createdAt: new Date().toISOString()
    };

    // Only add budgetId to the document if it exists
    if (budgetId) {
      docData.budgetId = budgetId;
    }

    const docRef = await addDoc(transactionsRef, docData);

    return docRef.id;
  } catch (error) {
    console.error('[transactionService] Error adding transaction:', error);
    throw error;
  }
};

// Get all transactions for a user
export const getUserTransactions = async (userId: string, budgetId?: string): Promise<Transaction[]> => {
  try {
    if (!userId) {
      console.error('[Firebase] Error: getUserTransactions called with empty userId');
      return [];
    }
    
    let transactionsRef;
    
    if (budgetId) {
      // If budgetId is provided, get from the budget's transactions collection
      transactionsRef = getBudgetTransactionsRef(userId, budgetId);
    } else {
      // Otherwise use the legacy path (for backward compatibility)
      transactionsRef = getUserTransactionsRef(userId);
    }
    
    // Use a simpler query without composite ordering
    const q = query(transactionsRef);
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.size === 0) {
      // No transactions found
    } else {

    }
    
    const transactions: Transaction[] = [];
    
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();

        if (!data.date) {
          console.warn(`[Firebase] Transaction ${doc.id} missing date field`);
          return; // Skip this document
        }
        
        // Check if date is a number or a timestamp object
        let processedDate;
        if (typeof data.date === 'number') {
          // If it's already a number, use it directly
          processedDate = data.date;
        } else if (data.date && typeof data.date.toDate === 'function') {
          // If it's a Firestore timestamp, convert to Date
          processedDate = data.date.toDate();
        } else if (typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
          // Handle YYYY-MM-DD string format
          processedDate = new Date(data.date);
        } else {
          // Fallback for other date formats
          console.warn(`[Firebase] Document ${doc.id} has unknown date format:`, data.date);
          processedDate = new Date(); // Default to current date as fallback
        }
        
        // Add to transactions array
        transactions.push({
          id: doc.id,
          description: data.description || 'Unknown',
          amount: parseFloat(data.amount) || 0,
          date: processedDate,
          category: data.category,
          order: data.order || 0,
          type: data.type || (parseFloat(data.amount) > 0 ? 'income' : 'expense'),
          icon: data.icon || undefined
        });
      } catch (docError) {
        console.error(`[Firebase] Error processing document ${doc.id}:`, docError);
      }
    });
    
    // Sort by category then by order within each category
    return transactions.sort((a, b) => {
      // First sort by category
      const categoryA = a.category || '';
      const categoryB = b.category || '';
      
      if (categoryA !== categoryB) {
        return categoryA.localeCompare(categoryB);
      }
      
      // Then sort by order within the category
      return (a.order || 0) - (b.order || 0);
    });
  } catch (error) {
    console.error('[transactionService] Error fetching transactions:', error);
    throw error;
  }
};

// Update a transaction
export const updateTransaction = async (
  transactionId: string, 
  updates: Partial<Transaction>, 
  userId: string,
  budgetId?: string
) => {
  if (!userId || !transactionId) {
    throw new Error('User ID and transaction ID are required to update a transaction');
  }

  try {
    let transactionRef;
    
    if (budgetId) {
      // If budgetId is provided, update in the budget's transactions collection
      transactionRef = doc(getBudgetTransactionsRef(userId, budgetId), transactionId);
    } else {
      // Otherwise use the legacy path (for backward compatibility)
      transactionRef = doc(getUserTransactionsRef(userId), transactionId);
    }
    
    // Clean the updates object to prevent sending undefined values to Firestore
    // which would cause an error for fields like 'icon'
    const cleanUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
    
    // Process each field in the updates object
    for (const [key, value] of Object.entries(updates)) {
      // Skip undefined values completely
      if (value === undefined) continue;
      
      // For string fields that could be undefined but should be empty strings
      if ((key === 'icon' || key === 'description') && value === undefined) {
        cleanUpdates[key] = '';
      } else {
        cleanUpdates[key] = value;
      }
    }
    
    await updateDoc(transactionRef, cleanUpdates);
   
  } catch (error) {
    console.error('[transactionService] Error updating transaction:', error);
    throw error;
  }
};

// Delete a transaction
export const deleteTransaction = async (
  transactionId: string, 
  userId: string,
  budgetId?: string
) => {
  if (!userId || !transactionId) {
    throw new Error('User ID and transaction ID are required to delete a transaction');
  }

  try {
    let transactionRef;
    
    if (budgetId) {
      // If budgetId is provided, delete from the budget's transactions collection
      transactionRef = doc(getBudgetTransactionsRef(userId, budgetId), transactionId);
    } else {
      // Otherwise use the legacy path (for backward compatibility)
      transactionRef = doc(getUserTransactionsRef(userId), transactionId);
    }
    
    await deleteDoc(transactionRef);
   
  } catch (error) {
    console.error('[transactionService] Error deleting transaction:', error);
    throw error;
  }
};

// Move a transaction to a different category
export const moveTransactionToCategory = async (
  transactionId: string, 
  newCategory: 'Income' | 'Essentials' | 'Wants' | 'Savings',
  userId: string,
  budgetId?: string
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required to move a transaction');
  }
  
  try {
    let transactionsRef;
    
    if (budgetId) {
      // If budgetId is provided, use the budget's transactions collection
      transactionsRef = getBudgetTransactionsRef(userId, budgetId);
    } else {
      // Otherwise use the legacy path (for backward compatibility)
      transactionsRef = getUserTransactionsRef(userId);
    }
    
    // Use a simpler query that doesn't require a composite index
    const categoryQuery = query(
      transactionsRef,
      where('category', '==', newCategory)
    );
    
    const categorySnapshot = await getDocs(categoryQuery);
    let nextOrder = 1; // Default to 1 if no existing transactions
    
    // If there are existing transactions, find the highest order manually
    if (!categorySnapshot.empty) {
      let highestOrder = 0;
      categorySnapshot.forEach(doc => {
        const order = doc.data().order || 0;
        if (order > highestOrder) {
          highestOrder = order;
        }
      });
      nextOrder = highestOrder + 1;
    }
    
    // Update the transaction with the new category and order
    return updateTransaction(
      transactionId, 
      { 
        category: newCategory,
        order: nextOrder // Place at the end of the target category
      }, 
      userId,
      budgetId
    );
  } catch (error) {
    console.error('[transactionService] Error moving transaction:', error);
    throw error;
  }
};

// Reorder transactions within a category
export const reorderTransactions = async (
  userId: string,
  category: string,
  orderedTransactionIds: string[],
  budgetId?: string
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required to reorder transactions');
  }
  
  try {
    let transactionsRef;
    
    if (budgetId) {
      // If budgetId is provided, use the budget's transactions collection
      transactionsRef = getBudgetTransactionsRef(userId, budgetId);
    } else {
      // Otherwise use the legacy path (for backward compatibility)
      transactionsRef = getUserTransactionsRef(userId);
    }
    
    const batch = writeBatch(db);
    
    // Update each transaction with its new order in a single batch
    orderedTransactionIds.forEach((id, index) => {
      const transactionRef = doc(transactionsRef, id);
      batch.update(transactionRef, { 
        order: index + 1, // Start from 1 for better readability
        updatedAt: new Date().toISOString()
      });
    });
    
    // Commit the batch
    await batch.commit();
  } catch (error) {
    console.error('[transactionService] Error reordering transactions:', error);
    throw error;
  }
};

// Delete all transactions for a specific category
export const deleteTransactionsByCategory = async (
  userId: string,
  categoryId: string,
  budgetId?: string
): Promise<void> => {
  if (!userId || !categoryId) {
    throw new Error('User ID and category ID are required to delete category transactions');
  }

  try {
    let transactionsRef;
    
    if (budgetId) {
      // If budgetId is provided, use the budget's transactions collection
      transactionsRef = getBudgetTransactionsRef(userId, budgetId);
    } else {
      // Otherwise use the legacy path (for backward compatibility)
      transactionsRef = getUserTransactionsRef(userId);
    }
    
    // Query for all transactions with the given category
    // First try matching by ID (lowercase for case-insensitive matching)
    let categoryQuery = query(
      transactionsRef,
      where('category', '==', categoryId.toLowerCase())
    );
    
    let querySnapshot = await getDocs(categoryQuery);
    
    // If no results, try matching by category name (for backward compatibility)
    if (querySnapshot.empty) {
      // Try with the original case
      categoryQuery = query(
        transactionsRef,
        where('category', '==', categoryId)
      );
      
      querySnapshot = await getDocs(categoryQuery);
    }
    
    if (querySnapshot.empty) {
      return;
    }
    
    
    // Delete all transactions in batches (Firestore has a limit of 500 operations per batch)
    const batchSize = 450; // Keep under the 500 limit for safety
    let batch = writeBatch(db);
    let operationCount = 0;
    
    for (const document of querySnapshot.docs) {
      batch.delete(document.ref);
      operationCount++;
      
      // If we've reached the batch limit, commit and start a new batch
      if (operationCount >= batchSize) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }
    
    // Commit any remaining deletes
    if (operationCount > 0) {
      await batch.commit();
    }
    
  } catch (error) {
    console.error('[transactionService] Error deleting category transactions:', error);
    throw error;
  }
}; 