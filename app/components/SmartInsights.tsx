import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Card, CardContent, LinearProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Stack, Alert, Grid, Tooltip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import type { Transaction } from '../services/fileParser';
import type { FinancialGoal } from '../services/goalService';
import { loadGoals, addGoal, updateGoal, deleteGoal, updateGoalsProgress } from '../services/goalService';
import type { User } from '../types/User';
import type { Budget } from '../types/Budget';
import { useAuth } from '../contexts/AuthContext';
import { useSavings } from '../contexts/SavingsContext';

const INSIGHT_TYPES = ['warning', 'success', 'info'] as const;
type InsightType = typeof INSIGHT_TYPES[number];

interface Insight {
  type: InsightType;
  message: string;
  action?: string;
}

type GroupedInsights = Record<InsightType, Insight[]>;

interface GoalDialogData {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'Savings' | 'Debt' | 'Investment' | 'Custom';
}

interface SmartInsightsProps {
  transactions: Transaction[];
  selectedMonths: string[];
  totalIncome: number;
  onGoalUpdate: React.Dispatch<React.SetStateAction<FinancialGoal[]>>;
  openSavingsDialog: boolean;
  onCloseSavingsDialog: () => void;
}

interface FinancialGoalWithLastUpdated extends FinancialGoal {
  lastUpdated?: string;
}

type ValidCategory = 'Essentials' | 'Wants' | 'Savings' | 'Income';

// Utility function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Add type guard for transaction category
const isValidCategory = (category: string | undefined): category is ValidCategory => {
  return category === 'Essentials' || category === 'Wants' || category === 'Savings' || category === 'Income';
};

// Add type guard for transaction date
const getMonthFromDate = (date: string): string => {
  return new Date(date).toISOString().slice(0, 7);
};

// Update the component logic
const processTransactions = (transactions: Transaction[]): (Transaction & { category: ValidCategory })[] => {
  return transactions.map(t => ({
    ...t,
    category: isValidCategory(t.category) ? t.category : 'Essentials'
  }));
};

// Update the component
export function SmartInsights({ transactions, selectedMonths, totalIncome, onGoalUpdate, openSavingsDialog, onCloseSavingsDialog }: SmartInsightsProps) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [openGoalDialog, setOpenGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [goalData, setGoalData] = useState<GoalDialogData>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: '',
    category: 'Savings'
  });

  // Get the authenticated user from Firebase Auth
  const { user } = useAuth();

  // Add new state for actual savings dialog
  const [actualSavingsAmount, setActualSavingsAmount] = useState(0);

  // Process transactions to ensure they have valid categories
  const processedTransactions = processTransactions(transactions);
  
  // Update the transaction filtering logic
  const filteredTransactions = processedTransactions.filter(t => {
    const dateStr = t.date instanceof Date ? t.date.toISOString() : String(t.date);
    const month = getMonthFromDate(dateStr);
    return selectedMonths.includes(month);
  });

  // Update category calculations with type-safe categories
  const categoryTotals = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'expense' && isValidCategory(t.category)) {
      acc[t.category] = (acc[t.category] ?? 0) + Math.abs(t.amount);
    }
    return acc;
  }, {
    Essentials: 0,
    Wants: 0,
    Savings: 0,
    Income: 0
  } as Record<ValidCategory, number>);

  // Update savingsGoal reference with all required fields
  const defaultSavingsGoal: FinancialGoal = {
    id: 'savings',
    name: 'Savings Goal',
    targetAmount: 0,
    currentAmount: 0,
    deadline: new Date().toISOString(),
    category: 'Savings',
    createdAt: new Date().toISOString()
  };

  const savingsGoal = goals.find(g => g.category === 'Savings') ?? defaultSavingsGoal;

  // Add new function for generating smart goal suggestions
  const generateSmartGoalSuggestions = (transactions: Transaction[], income: number): Insight[] => {
    const suggestions: Insight[] = [];
    
    // Calculate annual expenses by category
    const annualExpenses = transactions.reduce((acc, t) => {
      if (isValidCategory(t.category)) {
        acc[t.category] = (acc[t.category] ?? 0) + Math.abs(t.amount);
      }
      return acc;
    }, {} as Record<ValidCategory, number>);

    // Emergency Fund Goal - calculate based on monthly expenses
    const monthlyExpenses = (annualExpenses.Essentials + annualExpenses.Wants + annualExpenses.Savings) / 12;
    const emergencyFundTarget = monthlyExpenses * 6; // 6 months of expenses
    if (!goals.some(g => g.name.toLowerCase().includes('emergency'))) {
      suggestions.push({
        type: 'info',
        message: `Consider setting up an Emergency Fund goal of ${formatCurrency(emergencyFundTarget)}. This would cover 6 months of your essential expenses, wants, and planned savings.`,
        action: 'suggest_goal'
      });
    }

    // Retirement Savings Goal
    const yearlyIncome = income;
    const retirementYearlyTarget = yearlyIncome * 0.15; // 15% of income for retirement
    if (!goals.some(g => g.name.toLowerCase().includes('retirement'))) {
      suggestions.push({
        type: 'info',
        message: `Start a Retirement Savings goal with a yearly target of ${formatCurrency(retirementYearlyTarget)} (15% of your income).`,
        action: 'suggest_goal'
      });
    }

    // Debt Reduction Goal
    const debtPayments = transactions
      .filter(t => isValidCategory(t.category) && 
        (t.category.toLowerCase().includes('debt') || t.category.toLowerCase().includes('loan')))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    if (debtPayments > 0 && !goals.some(g => g.category === 'Debt')) {
      suggestions.push({
        type: 'info',
        message: `Based on your debt payments, consider setting a Debt Reduction goal to become debt-free.`,
        action: 'suggest_goal'
      });
    }

    // Major Purchase Goal based on savings pattern
    const currentSavingsRate = transactions
      .filter(t => t.category === 'Savings')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) / income;
    if (currentSavingsRate > 0.1 && goals.length < 3) {
      suggestions.push({
        type: 'info',
        message: `You're saving well! Consider setting a goal for a major purchase (e.g., home down payment, car, or education).`,
        action: 'suggest_goal'
      });
    }

    return suggestions;
  };

  // Generate insights based on goals and transactions
  const insights = useMemo(() => {
    const result: Insight[] = [];
    
    // Add AI-generated goal suggestions
    const smartGoalSuggestions = generateSmartGoalSuggestions(transactions, totalIncome);
    result.push(...smartGoalSuggestions);

    // Goal progress insights
    goals.forEach(goal => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const daysUntilDeadline = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const monthlyRequired = (goal.targetAmount - goal.currentAmount) / (daysUntilDeadline / 30);
      
      if (daysUntilDeadline < 0) {
        result.push({
          type: 'warning',
          message: `The deadline for your goal "${goal.name}" has passed. Consider updating the deadline or reviewing your progress.`
        });
      } else if (daysUntilDeadline <= 30) {
        result.push({
          type: progress >= 90 ? 'success' : 'warning',
          message: `Your goal "${goal.name}" deadline is approaching in ${daysUntilDeadline} days. You're ${progress.toFixed(1)}% there!`
        });
      }

      // Monthly required amount insight - skip for Savings goals
      if (daysUntilDeadline > 0 && monthlyRequired > 0 && goal.category !== 'Savings') {
        result.push({
          type: 'info',
          message: `To reach your "${goal.name}" goal by the deadline, you need to save ${formatCurrency(monthlyRequired)} per month.`
        });
      }

      // Progress milestones with detailed recommendations
      if (progress < 25) {
        // Skip automatic transfer suggestion for Savings goals
        if (goal.category !== 'Savings') {
          result.push({
            type: 'info',
            message: `For your "${goal.name}" goal, consider setting up automatic transfers of ${formatCurrency(monthlyRequired)} monthly to stay on track.`
          });
        }
      } else if (progress >= 25 && progress < 50) {
        result.push({
          type: 'info',
          message: `You've reached 25% of your "${goal.name}" goal! Keep the momentum by maintaining your ${formatCurrency(monthlyRequired)} monthly contribution.`
        });
      } else if (progress >= 50 && progress < 75) {
        result.push({
          type: 'info',
          message: `You're halfway to your "${goal.name}" goal! At your current rate, you're ${progress > (daysUntilDeadline / goal.deadline.length) * 100 ? 'ahead of' : 'behind'} schedule.`
        });
      } else if (progress >= 75 && progress < 100) {
        result.push({
          type: 'success',
          message: `You're in the final stretch of your "${goal.name}" goal! Only ${formatCurrency(goal.targetAmount - goal.currentAmount)} to go!`
        });
      } else if (progress >= 100) {
        result.push({
          type: 'success',
          message: `Congratulations! You've achieved your "${goal.name}" goal! Consider setting a new goal or increasing your target.`
        });
      }
    });

    // Savings rate insights with detailed analysis
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11
    const monthsElapsed = currentMonth + 1;

    // Get all transactions from the start of the year until current month
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentMonth + 1, 0);
    
    // Calculate cumulative savings (current month + previous months)
    const cumulativeSavings = transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.category === 'Savings' && 
               transactionDate >= startOfYear && 
               transactionDate <= endOfCurrentMonth;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate current month's savings separately
    const currentMonthStart = new Date(currentDate.getFullYear(), currentMonth, 1);
    const currentMonthSavings = transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.category === 'Savings' && 
               transactionDate >= currentMonthStart && 
               transactionDate <= endOfCurrentMonth;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Find savings goals to track actual savings
    const savingsGoals = goals.filter(g => g.category === 'Savings');
    const actualSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    
    // Calculate planned vs actual savings
    const yearlyIncomeTarget = totalIncome;
    const recommendedYearlySavings = yearlyIncomeTarget * 0.2; // 20% savings target
    const expectedMonthlySavings = recommendedYearlySavings / 12;
    const expectedSavingsByNow = expectedMonthlySavings * monthsElapsed;

    // Add savings tracking insights
    if (totalIncome > 0) {
      const monthlyTarget = recommendedYearlySavings / 12;
      
      // Compare planned savings with actual savings
      if (savingsGoals.length > 0) {
        const difference = actualSavings - expectedSavingsByNow;
        const averageActualMonthlySavings = actualSavings / monthsElapsed;
        
        result.push({
          type: 'info',
          message: `Your savings goal target is ${formatCurrency(monthlyTarget)}/month. You've planned to save ${formatCurrency(currentMonthSavings)} this month, with a total of ${formatCurrency(cumulativeSavings)} saved this year.`
        });

        if (difference >= 0) {
          result.push({
            type: 'success',
            message: `You've actually saved ${formatCurrency(actualSavings)} (${formatCurrency(averageActualMonthlySavings)}/month) through ${new Date(currentDate.getFullYear(), currentMonth).toLocaleString('default', { month: 'long' })}. You're ahead of your target by ${formatCurrency(difference)}!`
          });
        } else {
          result.push({
            type: 'warning',
            message: `You've actually saved ${formatCurrency(actualSavings)} (${formatCurrency(averageActualMonthlySavings)}/month) through ${new Date(currentDate.getFullYear(), currentMonth).toLocaleString('default', { month: 'long' })}. To stay on track, try to save ${formatCurrency(monthlyTarget)} each month. You're ${formatCurrency(Math.abs(difference))} behind target.`
          });
        }
      } else {
        result.push({
          type: 'info',
          message: `You've planned to save ${formatCurrency(currentMonthSavings)} this month, with a total of ${formatCurrency(cumulativeSavings)} saved this year. Consider creating a savings goal to track your actual savings progress.`
        });
      }
    }
    
    // Enhanced savings insights
    if (totalIncome > 0) {
      // Calculate year-to-date income (from January to current month)
     
      
      // Debug: Log all transactions
    
      
      // Debug: Log filtered income transactions
      const incomeTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        // Check both type and category for income, and ensure amount is positive
        const isIncome = (t.type === 'income' || t.category === 'Income') && t.amount > 0;
        const isInDateRange = transactionDate >= startOfYear && transactionDate <= endOfCurrentMonth;
       
        return isIncome && isInDateRange;
      });
      
     
      
      const yearToDateIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // If no income transactions found, use the totalIncome prop divided by months elapsed
      const effectiveIncome = yearToDateIncome > 0 ? yearToDateIncome : (totalIncome * monthsElapsed / 12);

      // Calculate actual savings rate based on year-to-date figures
      const actualSavingsRate = effectiveIncome > 0 ? (actualSavings / effectiveIncome) * 100 : 0;
     
      
      if (savingsGoals.length === 0) {
        result.push({
          type: 'warning',
          message: 'You haven\'t set up any savings goals yet. Consider creating one to track your actual savings progress.'
        });
      } else if (actualSavingsRate < 10) {
        result.push({
          type: 'warning',
          message: `Your current savings rate is ${actualSavingsRate.toFixed(1)}% (${formatCurrency(actualSavings)} saved out of ${formatCurrency(effectiveIncome)} income this year). Financial experts recommend saving at least 20% of your income. Try reducing non-essential expenses to increase savings.`
        });
      } else if (actualSavingsRate >= 10 && actualSavingsRate < 20) {
        result.push({
          type: 'info',
          message: `You're saving ${actualSavingsRate.toFixed(1)}% (${formatCurrency(actualSavings)} out of ${formatCurrency(effectiveIncome)} income this year). Good start! Try to increase it to 20% for better financial security.`
        });
      } else if (actualSavingsRate >= 20) {
        result.push({
          type: 'success',
          message: `Excellent! You're saving ${actualSavingsRate.toFixed(1)}% (${formatCurrency(actualSavings)} out of ${formatCurrency(effectiveIncome)} income this year), which is above the recommended 20%. Your future self will thank you!`
        });
      }
    }

    // Spending pattern insights
    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a);

    // Top spending categories
    if (sortedCategories.length > 0) {
      const [topCategory, topAmount] = sortedCategories[0];
      result.push({
        type: 'info',
        message: `Your highest spending category is ${topCategory} at ${formatCurrency(topAmount)}. ${
          topAmount > totalIncome * 0.3 ? 'This is over 30% of your income - consider reducing these expenses.' : ''
        }`
      });
    }

    // Unusual spending patterns
    const averageTransactionAmount = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length;

    const largeTransactions = transactions
      .filter(t => t.type === 'expense' && Math.abs(t.amount) > averageTransactionAmount * 2)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    if (largeTransactions.length > 0) {
      result.push({
        type: 'info',
        message: `You have ${largeTransactions.length} unusually large expense${largeTransactions.length > 1 ? 's' : ''} this month, including ${formatCurrency(Math.abs(largeTransactions[0].amount))} for ${largeTransactions[0].category}.`
      });
    }

    // Month-over-month comparison
    if (selectedMonths.length >= 2) {
      const currentMonth = transactions.filter(t => 
        new Date(t.date).toLocaleString('default', { month: 'long' }) === selectedMonths[0]
      );
      const previousMonth = transactions.filter(t => 
        new Date(t.date).toLocaleString('default', { month: 'long' }) === selectedMonths[1]
      );

      const currentSpending = currentMonth
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const previousSpending = previousMonth
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      if (previousSpending > 0) {
        const spendingChange = ((currentSpending - previousSpending) / previousSpending) * 100;
        if (Math.abs(spendingChange) >= 10) {
          result.push({
            type: spendingChange > 0 ? 'warning' : 'success',
            message: `Your spending is ${Math.abs(spendingChange).toFixed(1)}% ${spendingChange > 0 ? 'higher' : 'lower'} than last month. ${
              spendingChange > 0 ? 'Consider reviewing your expenses.' : 'Great job on reducing expenses!'
            }`
          });
        }
      }
    }

    return result;
  }, [goals, transactions, selectedMonths, totalIncome]);

  // Load goals on component mount
  useEffect(() => {
    const fetchGoals = async () => {
      if (!user?.id) {
      
        return;
      }

      try {
        const loadedGoals = await loadGoals(user.id);
        setGoals(loadedGoals);
        onGoalUpdate(loadedGoals);
      } catch (error) {
        console.error('Error loading goals:', error);
      }
    };

    fetchGoals();
  }, [user, onGoalUpdate]);

  // Update goals progress based on transactions
  useEffect(() => {
    const updateProgress = async () => {
      if (!user?.id || goals.length === 0) return;

      const updatedGoals = goals.map(goal => {
        // Skip updating savings goals since they are manually tracked
        if (goal.category === 'Savings') {
          return goal;
        }
        
        // Update other goal types based on transactions
        const relevantTransactions = transactions.filter(t => 
          t.category === goal.category && 
          new Date(t.date) <= new Date(goal.deadline)
        );
        const totalAmount = relevantTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return { ...goal, currentAmount: totalAmount };
      });

      if (JSON.stringify(updatedGoals) !== JSON.stringify(goals)) {
        setGoals(updatedGoals);
        onGoalUpdate(updatedGoals);
        try {
          await updateGoalsProgress(user.id, updatedGoals);
        } catch (error) {
          console.error('Error updating goals progress:', error);
        }
      }
    };

    updateProgress();
  }, [transactions, goals, user, onGoalUpdate]);

  const handleOpenGoalDialog = (goal?: FinancialGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalData({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline,
        category: goal.category
      });
    } else {
      setEditingGoal(null);
      setGoalData({
        name: '',
        targetAmount: 0,
        currentAmount: 0,
        deadline: '',
        category: 'Savings'
      });
    }
    setOpenGoalDialog(true);
  };

  const handleCloseGoalDialog = () => {
    setOpenGoalDialog(false);
    setEditingGoal(null);
  };

  const handleSaveGoal = async () => {
    if (!user?.id) {
   
      return;
    }

    try {
      if (editingGoal) {
        await updateGoal(user.id, editingGoal.id, {
          ...goalData,
          currentAmount: editingGoal.currentAmount // Preserve the current amount
        });
        const updatedGoals = goals.map(g => 
          g.id === editingGoal.id ? { ...g, ...goalData } : g
        );
        setGoals(updatedGoals);
        onGoalUpdate(updatedGoals);
      } else {
        const newGoal: Omit<FinancialGoal, 'id'> = {
          ...goalData,
          createdAt: new Date().toISOString()
        };
        const goalId = await addGoal(user.id, newGoal);
        const updatedGoals = [...goals, { ...newGoal, id: goalId }];
        setGoals(updatedGoals);
        onGoalUpdate(updatedGoals);
      }
      handleCloseGoalDialog();
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user?.id) {
    
      return;
    }

    try {
      await deleteGoal(user.id, goalId);
      const updatedGoals = goals.filter(g => g.id !== goalId);
      setGoals(updatedGoals);
      onGoalUpdate(updatedGoals);
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  // Update handleOpenSavingsDialog to just set the amount
  const handleOpenSavingsDialog = () => {
    const savingsGoal = goals.find(g => g.category === 'Savings');
    if (savingsGoal) {
      setActualSavingsAmount(savingsGoal.currentAmount);
    }
  };

  // Update handleCloseSavingsDialog to use the prop
  const handleCloseSavingsDialog = () => {
    onCloseSavingsDialog();
  };

  const handleUpdateActualSavings = async () => {
    if (!user?.id) return;

    try {
      let savingsGoal = goals.find(g => g.category === 'Savings');
      
      // Calculate total planned yearly savings
      const yearlyPlannedSavings = transactions
        .filter(t => t.category === 'Savings')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const now = new Date().toISOString();

      // If no savings goal exists, create one
      if (!savingsGoal) {
        const newGoal: Omit<FinancialGoal, 'id'> = {
          name: 'Savings',
          category: 'Savings',
          targetAmount: yearlyPlannedSavings > 0 ? yearlyPlannedSavings : actualSavingsAmount * 1.2,
          currentAmount: actualSavingsAmount,
          deadline: new Date(new Date().getFullYear(), 11, 31).toISOString(),
          createdAt: now,
          lastUpdated: now
        };
        const goalId = await addGoal(user.id, newGoal);
        savingsGoal = { ...newGoal, id: goalId };
        const updatedGoals = [...goals, savingsGoal];
        setGoals(updatedGoals);
        onGoalUpdate(updatedGoals);
      } else {
        // Update existing savings goal
        const updatedGoal = { 
          ...savingsGoal, 
          currentAmount: actualSavingsAmount,
          targetAmount: yearlyPlannedSavings > 0 ? yearlyPlannedSavings : savingsGoal.targetAmount,
          lastUpdated: now
        };
        await updateGoal(user.id, savingsGoal.id, updatedGoal);
        // Immediately update the goals state to reflect the change
        const updatedGoals = goals.map(g => 
          savingsGoal && g.id === savingsGoal.id ? updatedGoal : g
        );
        setGoals(updatedGoals);
        onGoalUpdate(updatedGoals);
      }
      // Update the savings context
      setSavingsUpdated();
      handleCloseSavingsDialog();
    } catch (error) {
      console.error('Error updating actual savings:', error);
    }
  };

  // Remove the savingsNeedsUpdate check and use the context instead
  const { setSavingsUpdated } = useSavings();

  const groupedInsights = useMemo(() => {
    return INSIGHT_TYPES.reduce<GroupedInsights>((groups, type) => {
      groups[type] = insights.filter(insight => insight.type === type);
      return groups;
    }, {
      warning: [],
      success: [],
      info: []
    });
  }, [insights]);

  // Update savingsGoal handling
  const handleSavingsGoalUpdate = (goal: FinancialGoalWithLastUpdated | undefined) => {
    if (goal) {
      onGoalUpdate((prevGoals: FinancialGoal[]) => 
        prevGoals.map(g => g.id === goal.id ? goal : g)
      );
    }
  };

  return (
    <Box id="smart-insights" sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Smart Insights
      </Typography>
      
      {insights.length > 0 ? (
        <Box>
          {/* Action Required Section */}
          {groupedInsights.warning.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'warning.main', fontWeight: 'bold' }}>
                🚨 Action Required
              </Typography>
              <Stack spacing={1}>
                {groupedInsights.warning.map((insight, index) => (
                  <Alert key={`warning-${index}`} severity="warning" variant="outlined">
                    {insight.message}
                  </Alert>
                ))}
              </Stack>
            </Box>
          )}

          {/* Achievements Section */}
          {groupedInsights.success.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'success.main', fontWeight: 'bold' }}>
                🎉 Recent Achievements
              </Typography>
              <Stack spacing={1}>
                {groupedInsights.success.map((insight, index) => (
                  <Alert key={`success-${index}`} severity="success" variant="outlined">
                    {insight.message}
                  </Alert>
                ))}
              </Stack>
            </Box>
          )}

          {/* Recommendations Section */}
          {groupedInsights.info.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'info.main', fontWeight: 'bold' }}>
                💡 Smart Recommendations
              </Typography>
              <Stack spacing={1}>
                {groupedInsights.info.map((insight, index) => (
                  <Alert key={`info-${index}`} severity="info" variant="outlined">
                    {insight.message}
                  </Alert>
                ))}
              </Stack>
            </Box>
          )}

          {/* Financial Summary Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
              📊 Financial Summary
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Yearly Income
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(totalIncome)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Tooltip title="This is the amount that you currently have saved" arrow placement="top">
                        <Typography variant="subtitle2" color="text.secondary">
                          Current Savings
                        </Typography>
                      </Tooltip>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box>
                          <Typography variant="h6" sx={{ mb: 0 }}>
                            {formatCurrency(savingsGoal.currentAmount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {savingsGoal.lastUpdated 
                              ? `Last updated: ${new Date(savingsGoal.lastUpdated).toLocaleDateString()}`
                              : 'Not updated yet'}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleOpenSavingsDialog}
                        >
                          Update
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Active Goals
                    </Typography>
                    <Typography variant="h6">
                      {goals.length}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Box>
      ) : (
        <Alert severity="info">
          No insights available at the moment. Add more transactions or goals to get personalized insights.
        </Alert>
      )}

      {/* Financial Goals Section with Enhanced UI */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Financial Goals
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => handleOpenGoalDialog()}
            startIcon={<AddIcon />}
          >
            Add Goal
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          {goals.map(goal => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const daysUntilDeadline = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const isOnTrack = progress >= (daysUntilDeadline / goal.deadline.length) * 100;

            return (
              <Grid item xs={12} sm={6} md={4} key={goal.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {goal.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {goal.category}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => handleOpenGoalDialog(goal)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteGoal(goal.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mt: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">Progress</Typography>
                        <Typography variant="body2" color={isOnTrack ? 'success.main' : 'warning.main'}>
                          {progress.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(progress, 100)}
                        color={isOnTrack ? 'success' : 'warning'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Current:</span>
                        <span>{formatCurrency(goal.currentAmount)}</span>
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Target:</span>
                        <span>{formatCurrency(goal.targetAmount)}</span>
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <span>Deadline:</span>
                        <span style={{ color: daysUntilDeadline <= 30 ? '#f44336' : 'inherit' }}>
                          {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Goal Dialog */}
      <Dialog open={openGoalDialog} onClose={handleCloseGoalDialog}>
        <DialogTitle>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Goal Name"
              fullWidth
              value={goalData.name}
              onChange={(e) => setGoalData({ ...goalData, name: e.target.value })}
            />
            <TextField
              select
              label="Category"
              fullWidth
              value={goalData.category}
              onChange={(e) => setGoalData({ 
                ...goalData, 
                category: e.target.value as 'Savings' | 'Debt' | 'Investment' | 'Custom'
              })}
            >
              <MenuItem value="Savings">Savings</MenuItem>
              <MenuItem value="Debt">Debt</MenuItem>
              <MenuItem value="Investment">Investment</MenuItem>
              <MenuItem value="Custom">Custom</MenuItem>
            </TextField>
            <TextField
              label="Target Amount"
              type="number"
              fullWidth
              value={goalData.targetAmount}
              onChange={(e) => setGoalData({ ...goalData, targetAmount: Number(e.target.value) })}
              InputProps={{
                startAdornment: <span>$</span>
              }}
            />
            {!editingGoal && (
              <TextField
                label="Initial Amount"
                type="number"
                fullWidth
                value={goalData.currentAmount}
                onChange={(e) => setGoalData({ ...goalData, currentAmount: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <span>$</span>
                }}
              />
            )}
            <TextField
              label="Target Date"
              type="date"
              fullWidth
              value={goalData.deadline ? goalData.deadline.split('T')[0] : ''}
              onChange={(e) => setGoalData({ ...goalData, deadline: new Date(e.target.value).toISOString() })}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGoalDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveGoal} 
            variant="contained" 
            color="primary"
            disabled={!goalData.name || !goalData.targetAmount || !goalData.deadline}
          >
            {editingGoal ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update savings dialog to use the openSavingsDialog prop */}
      <Dialog open={openSavingsDialog} onClose={handleCloseSavingsDialog}>
        <DialogTitle>Update Current Savings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the total amount you currently have saved across all your accounts.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Current Savings Amount"
            type="number"
            fullWidth
            value={actualSavingsAmount}
            onChange={(e) => setActualSavingsAmount(Number(e.target.value))}
            InputProps={{
              startAdornment: <span>$</span>
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSavingsDialog}>Cancel</Button>
          <Button onClick={handleUpdateActualSavings} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 