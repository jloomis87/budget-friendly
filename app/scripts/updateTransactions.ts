import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  getFirestore
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { updateTransactionsWithCategoryId } from './updateTransactionsWithCategoryId';
import type { Category } from '../contexts/CategoryContext';

// Initialize Firebase - define these environment variables or replace with your config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Get categories for a specific budget
 */
async function getBudgetCategories(userId: string, budgetId: string): Promise<Category[]> {
  try {
    const budgetDocRef = doc(db, 'users', userId, 'budgets', budgetId);
    const budgetDoc = await getDoc(budgetDocRef);
    
    if (!budgetDoc.exists()) {
      throw new Error(`Budget ${budgetId} not found for user ${userId}`);
    }
    
    const categories = budgetDoc.data()?.categories || [];
    
    return categories;
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    throw error;
  }
}

/**
 * Main function to run the update
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: ts-node updateTransactions.ts <userId> <budgetId>');
    process.exit(1);
  }
  
  const userId = args[0];
  const budgetId = args[1];
  
  console.log(`Updating transactions for user ${userId} and budget ${budgetId}`);
  
  try {
    // Get categories for this budget
    const categories = await getBudgetCategories(userId, budgetId);
    
    if (!categories || categories.length === 0) {
      console.error('No categories found for this budget');
      process.exit(1);
    }
    
    console.log(`Found ${categories.length} categories for budget ${budgetId}`);
    
    // Update transactions with categoryId
    const updatedCount = await updateTransactionsWithCategoryId(userId, budgetId, categories);
    
    console.log(`Successfully updated ${updatedCount} transactions with categoryId`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating transactions:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 