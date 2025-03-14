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

// Add a transaction to Firestore
export const addTransaction = async (userId: string, transactionData: Omit<Transaction, 'id'>): Promise<string> => {
  if (!userId) {
    throw new Error('User ID is required to add a transaction');
  }

  try {
    const transactionsRef = getUserTransactionsRef(userId);
    
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

    const docRef = await addDoc(transactionsRef, {
      ...transactionData,
      category, // Use the category with fallback
      userId,
      order: nextOrder, // Set the order field
      createdAt: new Date().toISOString()
    });

    return docRef.id;
  } catch (error) {
    console.error('[transactionService] Error adding transaction:', error);
    throw error;
  }
};

// Get all transactions for a user
export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    if (!userId) {
      console.error('[Firebase] Error: getUserTransactions called with empty userId');
      return [];
    }
    
    const transactionsRef = getUserTransactionsRef(userId);
    
    // Use a simpler query without composite ordering
    const q = query(transactionsRef);
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.size === 0) {
      // No transactions found
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
        
        transactions.push({
          id: doc.id,
          date: processedDate,
          description: data.description || 'Unnamed Transaction',
          amount: typeof data.amount === 'number' ? data.amount : 0,
          category: data.category || 'Uncategorized',
          order: data.order || 0  // Make sure to include the order field
        });
      } catch (docError) {
        console.error(`[Firebase] Error processing transaction document ${doc.id}:`, docError);
        // Continue processing other documents
      }
    });
    
    // Sort the transactions in memory instead of in the query
    transactions.sort((a, b) => {
      // First sort by category
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      // Then sort by order within each category
      return (a.order || 0) - (b.order || 0);
    });
    
    return transactions;
  } catch (error) {
    console.error('[Firebase] Error in getUserTransactions:', error);
    
    // Return empty array instead of throwing error
    return [];
  }
};

// Update a transaction
export const updateTransaction = async (transactionId: string, updates: Partial<Transaction>, userId: string) => {
  if (!userId || !transactionId) {
    throw new Error('User ID and transaction ID are required to update a transaction');
  }

  try {
   
    const transactionRef = doc(getUserTransactionsRef(userId), transactionId);
    await updateDoc(transactionRef, { ...updates, updatedAt: new Date().toISOString() });
   
  } catch (error) {
    console.error('[transactionService] Error updating transaction:', error);
    throw error;
  }
};

// Delete a transaction
export const deleteTransaction = async (transactionId: string, userId: string) => {
  if (!userId || !transactionId) {
    throw new Error('User ID and transaction ID are required to delete a transaction');
  }

  try {
   
    const transactionRef = doc(getUserTransactionsRef(userId), transactionId);
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
  userId: string
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required to move a transaction');
  }
  
  try {
    const transactionsRef = getUserTransactionsRef(userId);
    
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
    return updateTransaction(transactionId, { 
      category: newCategory,
      order: nextOrder // Place at the end of the target category
    }, userId);
  } catch (error) {
    console.error('[transactionService] Error moving transaction:', error);
    throw error;
  }
};

// Reorder transactions within a category
export const reorderTransactions = async (
  userId: string,
  category: string,
  orderedTransactionIds: string[]
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required to reorder transactions');
  }
  
  try {
    const transactionsRef = getUserTransactionsRef(userId);
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
    console.log(`[transactionService] Successfully reordered ${orderedTransactionIds.length} transactions`);
  } catch (error) {
    console.error('[transactionService] Error reordering transactions:', error);
    throw error;
  }
}; 