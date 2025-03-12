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
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Transaction } from './fileParser';

// Collection references
const TRANSACTIONS_COLLECTION = 'transactions';

// Add a transaction to Firestore
export const addTransaction = async (userId: string, transaction: Transaction): Promise<string> => {
  try {
    console.log(`[Firebase] Adding transaction for user ID: "${userId}"`, transaction);
    
    if (!userId) {
      console.error('[Firebase] Error: addTransaction called with empty userId');
      throw new Error('User ID is required');
    }
    
    const transactionData = {
      ...transaction,
      // If date is a number (day of month), store it directly
      // Otherwise, convert Date object to Timestamp
      date: typeof transaction.date === 'number' 
        ? transaction.date 
        : Timestamp.fromDate(new Date(transaction.date)),
      userId,
      createdAt: Timestamp.now()
    };
    
    console.log('[Firebase] Prepared transaction data for saving:', transactionData);
    
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);
    console.log(`[Firebase] Transaction saved successfully with ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('[Firebase] Error adding transaction:', error);
    throw new Error('Failed to add transaction');
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
    
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    console.log(`[Firebase] Collection reference created for: ${TRANSACTIONS_COLLECTION}`);
    
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    console.log(`[Firebase] Executing Firestore query with where clause: userId == ${userId}`);
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
export const updateTransaction = async (
  transactionId: string, 
  updates: Partial<Transaction>
): Promise<void> => {
  try {
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    
    // Convert date to Firestore timestamp if it exists in updates and is not a number
    const firestoreUpdates = { ...updates };
    if (updates.date !== undefined) {
      if (typeof updates.date === 'number') {
        // If it's a number (day of month), store it directly
        firestoreUpdates.date = updates.date;
      } else {
        // Otherwise, convert to Timestamp
        firestoreUpdates.date = Timestamp.fromDate(new Date(updates.date));
      }
    }
    
    await updateDoc(transactionRef, firestoreUpdates);
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw new Error('Failed to update transaction');
  }
};

// Delete a transaction
export const deleteTransaction = async (transactionId: string): Promise<void> => {
  try {
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    await deleteDoc(transactionRef);
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw new Error('Failed to delete transaction');
  }
};

// Move a transaction to a different category
export const moveTransactionToCategory = async (
  transactionId: string, 
  newCategory: string
): Promise<void> => {
  return updateTransaction(transactionId, { category: newCategory });
}; 