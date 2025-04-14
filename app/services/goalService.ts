import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  createdAt: string;
  lastUpdated?: string;
  notes?: string;
  interestRate?: number;
  compoundingFrequency?: 'monthly' | 'quarterly' | 'annually';
  loanTerm?: number; // Number of months for the loan term
}

/**
 * Load all financial goals for a user
 */
export const loadGoals = async (userId: string): Promise<FinancialGoal[]> => {
  try {
    const goalsRef = collection(db, 'users', userId, 'goals');
    const snapshot = await getDocs(goalsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FinancialGoal));
  } catch (error) {
    console.error('Error loading goals:', error);
    throw error;
  }
};

/**
 * Add a new financial goal for a user
 */
export const addGoal = async (
  userId: string, 
  goal: Omit<FinancialGoal, 'id'>
): Promise<string> => {
  try {
    const goalsRef = collection(db, 'users', userId, 'goals');
    const docRef = await addDoc(goalsRef, goal);
    return docRef.id;
  } catch (error) {
    console.error('Error adding goal:', error);
    throw error;
  }
};

/**
 * Update an existing financial goal
 */
export const updateGoal = async (
  userId: string,
  goalId: string,
  goal: Partial<FinancialGoal>
): Promise<void> => {
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    await updateDoc(goalRef, goal);
  } catch (error) {
    console.error('Error updating goal:', error);
    throw error;
  }
};

/**
 * Delete a financial goal
 */
export const deleteGoal = async (userId: string, goalId: string): Promise<void> => {
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    await deleteDoc(goalRef);
  } catch (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
};

/**
 * Update the progress of all goals for a specific month
 */
export const updateGoalsProgress = async (
  userId: string,
  month: string,
  amounts: Record<string, number>
): Promise<void> => {
  try {
    // Create a transaction record for this progress update
    const progressRef = collection(db, 'users', userId, 'goalProgress');
    await addDoc(progressRef, {
      month,
      amounts,
      updatedAt: new Date().toISOString()
    });
    
    // Update the current amount for each goal
    const batch = db.batch();
    
    for (const [goalId, amount] of Object.entries(amounts)) {
      const goalRef = doc(db, 'users', userId, 'goals', goalId);
      const goalDoc = await getDoc(goalRef);
      
      if (goalDoc.exists()) {
        batch.update(goalRef, { 
          currentAmount: amount,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error updating goals progress:', error);
    throw error;
  }
}; 