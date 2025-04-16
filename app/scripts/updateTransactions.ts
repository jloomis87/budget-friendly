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
    process.exit(1);
  }
  
  const userId = args[0];
  const budgetId = args[1];
  
  try {
    // Get categories for this budget
    const categories = await getBudgetCategories(userId, budgetId);
    
    if (!categories || categories.length === 0) {
      process.exit(1);
    }
    
    // Update transactions with categoryId
    const updatedCount = await updateTransactionsWithCategoryId(userId, budgetId, categories);
    
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Run the main function
main(); 