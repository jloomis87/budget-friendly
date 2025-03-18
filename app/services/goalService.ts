import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'Savings' | 'Debt' | 'Investment' | 'Custom';
  createdAt: string;
  lastUpdated?: string;
}

// Load all goals for a user
export async function loadGoals(userId: string): Promise<FinancialGoal[]> {
  const goalsRef = collection(db, 'users', userId, 'goals');
  const q = query(goalsRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as FinancialGoal));
}

// Add a new goal
export async function addGoal(userId: string, goal: Omit<FinancialGoal, 'id'>): Promise<string> {
  const goalsRef = collection(db, 'users', userId, 'goals');
  const docRef = await addDoc(goalsRef, goal);
  return docRef.id;
}

// Update an existing goal
export async function updateGoal(userId: string, goalId: string, updates: Partial<FinancialGoal>): Promise<void> {
  const goalRef = doc(db, 'users', userId, 'goals', goalId);
  await updateDoc(goalRef, updates);
}

// Delete a goal
export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const goalRef = doc(db, 'users', userId, 'goals', goalId);
  await deleteDoc(goalRef);
}

// Update progress for multiple goals
export async function updateGoalsProgress(userId: string, goals: FinancialGoal[]): Promise<void> {
  const batch = writeBatch(db);
  
  goals.forEach(goal => {
    const goalRef = doc(db, 'users', userId, 'goals', goal.id);
    batch.update(goalRef, { currentAmount: goal.currentAmount });
  });
  
  await batch.commit();
} 