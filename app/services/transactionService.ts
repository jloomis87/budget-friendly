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
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Transaction } from '../types/Transaction';

// Get the transactions subcollection for a user
const getUserTransactionsRef = (userId: string) => {
  if (!userId || typeof userId !== 'string') {
    console.error('[Firebase] getUserTransactionsRef called with invalid userId:', userId);
    throw new Error('Valid user ID string is required');
  }
  console.log('[Firebase] Creating collection reference for user:', userId);
  return collection(db, 'users', userId, 'transactions');
};

// Add a transaction to Firestore
export const addTransaction = async (userId: string, transactionData: Omit<Transaction, 'id'>): Promise<string> => {
  if (!userId) {
    throw new Error('User ID is required to add a transaction');
  }

  try {
    console.log('[transactionService] Adding transaction for user:', userId);
    console.log('[transactionService] Transaction data:', transactionData);

    const transactionsRef = getUserTransactionsRef(userId);
    console.log('[transactionService] Collection path:', transactionsRef.path);

    const docRef = await addDoc(transactionsRef, {
      ...transactionData,
      userId,
      createdAt: new Date().toISOString()
    });

    console.log('[transactionService] Transaction added successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[transactionService] Error adding transaction:', error);
    throw error;
  }
};

// Get all transactions for a user
export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    console.log(`[Firebase] Getting transactions for user ID: "${userId}"`);
    
    if (!userId) {
      console.error('[Firebase] Error: getUserTransactions called with empty userId');
      return [];
    }
    
    const transactionsRef = getUserTransactionsRef(userId);
    console.log(`[Firebase] Collection reference created for user: ${userId}`);
    
    const q = query(
      transactionsRef,
      orderBy('date', 'desc')
    );
    
    console.log(`[Firebase] Executing Firestore query for user: ${userId}`);
    const querySnapshot = await getDocs(q);
    console.log(`[Firebase] Query returned ${querySnapshot.size} documents`);
    
    if (querySnapshot.size === 0) {
      console.log(`[Firebase] No transactions found for user: ${userId}`);
    }
    
    const transactions: Transaction[] = [];
    
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        console.log(`[Firebase] Processing document: ${doc.id}`, data);
        
        if (!data.date) {
          console.warn(`[Firebase] Transaction ${doc.id} missing date field`);
          return; // Skip this document
        }
        
        // Check if date is a number or a timestamp object
        let processedDate;
        if (typeof data.date === 'number') {
          // If it's already a number, use it directly
          processedDate = data.date;
          console.log(`[Firebase] Document ${doc.id} has numeric date: ${processedDate}`);
        } else if (data.date && typeof data.date.toDate === 'function') {
          // If it's a Firestore timestamp, convert to Date
          processedDate = data.date.toDate();
          console.log(`[Firebase] Document ${doc.id} has timestamp date, converted to: ${processedDate}`);
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
          category: data.category || 'Uncategorized'
        });
      } catch (docError) {
        console.error(`[Firebase] Error processing transaction document ${doc.id}:`, docError);
        // Continue processing other documents
      }
    });
    
    console.log(`[Firebase] Successfully processed ${transactions.length} transactions`);
    return transactions;
  } catch (error) {
    console.error('[Firebase] Error in getUserTransactions:', error);
    
    // Return empty array instead of throwing error
    console.log('[Firebase] Returning empty transactions array due to error');
    return [];
  }
};

// Update a transaction
export const updateTransaction = async (transactionId: string, updates: Partial<Transaction>, userId: string) => {
  if (!userId || !transactionId) {
    throw new Error('User ID and transaction ID are required to update a transaction');
  }

  try {
    console.log('[transactionService] Updating transaction:', transactionId, 'for user:', userId);
    const transactionRef = doc(getUserTransactionsRef(userId), transactionId);
    await updateDoc(transactionRef, { ...updates, updatedAt: new Date().toISOString() });
    console.log('[transactionService] Transaction updated successfully');
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
    console.log('[transactionService] Deleting transaction:', transactionId, 'for user:', userId);
    const transactionRef = doc(getUserTransactionsRef(userId), transactionId);
    await deleteDoc(transactionRef);
    console.log('[transactionService] Transaction deleted successfully');
  } catch (error) {
    console.error('[transactionService] Error deleting transaction:', error);
    throw error;
  }
};

// Move a transaction to a different category
export const moveTransactionToCategory = async (
  transactionId: string, 
  newCategory: string,
  userId: string
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required to move a transaction');
  }
  return updateTransaction(transactionId, { category: newCategory }, userId);
}; 