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
    const transactionData = {
      ...transaction,
      date: Timestamp.fromDate(new Date(transaction.date)),
      userId,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw new Error('Failed to add transaction');
  }
};

// Get all transactions for a user
export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    console.log(`Getting transactions for user ${userId}`);
    
    if (!userId) {
      console.warn('getUserTransactions called with empty userId');
      return [];
    }
    
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    console.log('Executing Firestore query...');
    const querySnapshot = await getDocs(q);
    console.log(`Query returned ${querySnapshot.size} documents`);
    
    const transactions: Transaction[] = [];
    
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        if (!data.date) {
          console.warn(`Transaction ${doc.id} missing date field`);
          return; // Skip this document
        }
        
        transactions.push({
          id: doc.id,
          date: data.date.toDate(),
          description: data.description || 'Unnamed Transaction',
          amount: typeof data.amount === 'number' ? data.amount : 0,
          category: data.category || 'Uncategorized'
        });
      } catch (docError) {
        console.error(`Error processing transaction document ${doc.id}:`, docError);
        // Continue processing other documents
      }
    });
    
    console.log(`Successfully processed ${transactions.length} transactions`);
    return transactions;
  } catch (error) {
    console.error('Error in getUserTransactions:', error);
    
    // Return empty array instead of throwing error
    console.log('Returning empty transactions array due to error');
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
    
    // Convert date to Firestore timestamp if it exists in updates
    const firestoreUpdates = { ...updates };
    if (updates.date) {
      firestoreUpdates.date = Timestamp.fromDate(new Date(updates.date));
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