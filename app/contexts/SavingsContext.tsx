import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { loadGoals } from '../services/goalService';

interface SavingsContextType {
  savingsNeedsUpdate: boolean;
  lastUpdated: string | null;
  checkSavingsStatus: () => Promise<void>;
  setSavingsUpdated: () => void;
}

const SavingsContext = createContext<SavingsContextType | undefined>(undefined);

export function SavingsProvider({ children }: { children: ReactNode }) {
  const [savingsNeedsUpdate, setSavingsNeedsUpdate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { user } = useAuth();

  const checkSavingsStatus = async () => {
    if (!user?.id) return;

    try {
      const goals = await loadGoals(user.id);
      const savingsGoal = goals.find(g => g.category === 'Savings');
      
      if (!savingsGoal?.lastUpdated) {
        setSavingsNeedsUpdate(true);
        setLastUpdated(null);
        return;
      }

      const lastUpdate = new Date(savingsGoal.lastUpdated);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      setSavingsNeedsUpdate(lastUpdate < oneMonthAgo);
      setLastUpdated(savingsGoal.lastUpdated);
    } catch (error) {
      console.error('Error checking savings status:', error);
    }
  };

  const setSavingsUpdated = () => {
    setSavingsNeedsUpdate(false);
    setLastUpdated(new Date().toISOString());
  };

  useEffect(() => {
    checkSavingsStatus();
  }, [user]);

  return (
    <SavingsContext.Provider value={{
      savingsNeedsUpdate,
      lastUpdated,
      checkSavingsStatus,
      setSavingsUpdated
    }}>
      {children}
    </SavingsContext.Provider>
  );
}

export function useSavings() {
  const context = useContext(SavingsContext);
  if (context === undefined) {
    throw new Error('useSavings must be used within a SavingsProvider');
  }
  return context;
} 