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

// Extend Transaction interface to include budgetId when storing in Firestore
interface FirestoreTransaction extends Omit<Transaction, 'id'> {
  budgetId?: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

// Get the transactions subcollection for a user
const getUserTransactionsRef = (userId: string) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid user ID string is required');
  }
 
  return collection(db, 'users', userId, 'transactions');
};

// Get the transactions subcollection for a specific budget
const getBudgetTransactionsRef = (userId: string, budgetId: string) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid user ID string is required');
  }

  if (!budgetId || typeof budgetId !== 'string') {
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
    } as any; // Use type assertion to avoid TypeScript error

    // Only add budgetId to the document if it exists
    if (budgetId) {
      docData.budgetId = budgetId;
    }

    const docRef = await addDoc(transactionsRef, docData);

    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// Get all transactions for a user
export const getUserTransactions = async (userId: string, budgetId?: string): Promise<Transaction[]> => {
  try {
    if (!userId) {
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
    
    const transactions: Transaction[] = [];
    
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();

        if (!data.date) {
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
        // Error handling but no console.error
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
    
    // First try to get the category name from the categories collection
    // to ensure we delete transactions both by ID and name
    const categoryName = await getCategoryNameById(userId, categoryId, budgetId);
    
    // Array to hold all matching transactions
    let matchingTransactions: QueryDocumentSnapshot[] = [];
    
    // Find transactions using category name (primary identifier in most transactions)
    if (categoryName) {
      const categoryNameQuery = query(
        transactionsRef,
        where('category', '==', categoryName)
      );
      
      const categoryNameSnapshot = await getDocs(categoryNameQuery);
      matchingTransactions = [...categoryNameSnapshot.docs];
    }
    
    // Find transactions using categoryId
    const categoryIdQuery = query(
      transactionsRef,
      where('categoryId', '==', categoryId)
    );
    
    const categoryIdSnapshot = await getDocs(categoryIdQuery);
    // Use Set to avoid duplicate transactions
    const docIdsSet = new Set(matchingTransactions.map(doc => doc.id));
    for (const doc of categoryIdSnapshot.docs) {
      if (!docIdsSet.has(doc.id)) {
        matchingTransactions.push(doc);
      }
    }
    
    // Try with lowercase id as fallback for older transactions
    const lowercaseIdQuery = query(
      transactionsRef,
      where('categoryId', '==', categoryId.toLowerCase())
    );
    
    const lowercaseIdSnapshot = await getDocs(lowercaseIdQuery);
    for (const doc of lowercaseIdSnapshot.docs) {
      if (!docIdsSet.has(doc.id)) {
        matchingTransactions.push(doc);
      }
    }
    
    // If no results, it's possible there are no transactions for this category
    if (matchingTransactions.length === 0) {
      return;
    }
    
    // Delete all transactions in batches (Firestore has a limit of 500 operations per batch)
    const batchSize = 450; // Keep under the 500 limit for safety
    let batch = writeBatch(db);
    let operationCount = 0;
    
    for (const document of matchingTransactions) {
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
    throw error;
  }
};

// Helper function to get category name from categoryId
const getCategoryNameById = async (
  userId: string,
  categoryId: string,
  budgetId?: string
): Promise<string | null> => {
  try {
    if (!budgetId) return null;
    
    const budgetDocRef = doc(db, 'users', userId, 'budgets', budgetId);
    const budgetDoc = await getDoc(budgetDocRef);
    
    if (!budgetDoc.exists()) return null;
    
    const categories = budgetDoc.data()?.categories || [];
    const category = categories.find((cat: any) => cat.id === categoryId);
    
    return category ? category.name : null;
  } catch (error) {
    return null; // Fail silently and continue with the category ID
  }
};

// Update all transactions with a specific category name to a new category name
export const updateCategoryNameForAllTransactions = async (
  userId: string,
  oldCategoryName: string,
  newCategoryName: string,
  budgetId?: string,
  categoryId?: string
): Promise<number> => {
  if (!userId) {
    throw new Error('User ID is required to update transactions');
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
    
    // Try exact match (case-sensitive)
    
    // Query for transactions with the old category name
    const categoryQuery = query(
      transactionsRef,
      where('category', '==', oldCategoryName)
    );
    
    const querySnapshot = await getDocs(categoryQuery);
    
    if (querySnapshot.empty) {
      return 0;
    }
    
    // Update all transactions in batches
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    querySnapshot.docs.forEach(doc => {
      // Include categoryId in the update if provided
      const updateData: { 
        category: string;
        updatedAt: string;
        categoryId?: string;
      } = { 
        category: newCategoryName,
        updatedAt: new Date().toISOString()
      };
      
      // Add categoryId to update if provided
      if (categoryId) {
        updateData.categoryId = categoryId;
      }
      
      batch.update(doc.ref, updateData);
      updatedCount++;
    });
    
    await batch.commit();
    
    return updatedCount;
  } catch (error) {
    throw error;
  }
};

// Update all transactions with categoryId based on their category name
export const updateTransactionsWithCategoryId = async (
  userId: string,
  budgetId: string,
  categoryMap: Record<string, string> // Map of category names to category IDs
): Promise<number> => {
  if (!userId || !budgetId) {
    throw new Error('User ID and budget ID are required to update transactions');
  }
  
  try {
    // Get the transactions collection for this budget
    const transactionsRef = getBudgetTransactionsRef(userId, budgetId);
    
    // Get all transactions for this budget
    const transactionsSnapshot = await getDocs(transactionsRef);
    
    if (transactionsSnapshot.empty) {
      return 0;
    }
    
    // Use a batch to update all transactions
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    transactionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const category = data.category;
      
      // Find the corresponding categoryId
      if (category && categoryMap[category]) {
        const categoryId = categoryMap[category];
        
        // Only update if categoryId is different or doesn't exist
        if (!data.categoryId || data.categoryId !== categoryId) {
          batch.update(doc.ref, {
            categoryId: categoryId,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        }
      }
    });
    
    if (updatedCount === 0) {
      return 0;
    }
    
    await batch.commit();
    
    return updatedCount;
  } catch (error) {
    throw error;
  }
};

// Add multiple transactions at once using a batch
export const addTransactionBatch = async (
  userId: string,
  transactionsData: Omit<Transaction, 'id'>[],
  budgetId?: string
): Promise<string[]> => {
  if (!userId) {
    throw new Error('User ID is required to add transactions');
  }

  if (!transactionsData || transactionsData.length === 0) {
    return [];
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

    // Get the current timestamp for all transactions
    const now = new Date().toISOString();

    // Create the batch for Firestore
    const batch = writeBatch(db);
    
    // Get existing transactions to determine proper order values
    const categoriesSnapshot = await getDocs(transactionsRef);
    
    // Group existing transactions by category to find highest order
    const categoryOrderMap: Record<string, number> = {};
    categoriesSnapshot.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'Uncategorized';
      const order = data.order || 0;
      
      if (!categoryOrderMap[category] || order > categoryOrderMap[category]) {
        categoryOrderMap[category] = order;
      }
    });
    
    // Store the new document references to return their IDs
    const newDocRefs: string[] = [];
    
    // Process each transaction
    for (const transactionData of transactionsData) {
      // Default to 'Uncategorized' if category is undefined
      const category = transactionData.category || 'Uncategorized';
      
      // Get the next order for this category
      const nextOrder = (categoryOrderMap[category] || 0) + 1;
      categoryOrderMap[category] = nextOrder; // Update for the next transaction
      
      // Create a new document reference
      const newDocRef = doc(transactionsRef);
      newDocRefs.push(newDocRef.id);
      
      // Create the document data, ensuring we don't include undefined values
      const docData = {
        ...transactionData,
        category, // Use the category with fallback
        userId,
        order: nextOrder, // Set the order field
        createdAt: now
      } as any; // Use type assertion to avoid TypeScript error

      // Only add budgetId to the document if it exists
      if (budgetId) {
        docData.budgetId = budgetId;
      }
      
      // Add the document to the batch
      batch.set(newDocRef, docData);
    }
    
    // Commit the batch
    await batch.commit();
    
    return newDocRefs;
  } catch (error) {
    console.error('Error in batch adding transactions:', error);
    throw error;
  }
};