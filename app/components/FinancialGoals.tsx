import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  LinearProgress, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  MenuItem, 
  IconButton,
  Chip,
  Stack,
  Tooltip,
  Alert,
  Badge
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  UpdateOutlined as UpdateIcon
} from '@mui/icons-material';
import type { Transaction } from '../services/fileParser';
import type { FinancialGoal } from '../services/goalService';
import { loadGoals, addGoal, updateGoal, deleteGoal } from '../services/goalService';
import { useAuth } from '../contexts/AuthContext';

// Utility function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface GoalDialogData {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'Savings' | 'Debt' | 'Investment' | 'Custom';
  notes: string;
  interestRate: number;
  compoundingFrequency: 'monthly' | 'quarterly' | 'annually';
  includeInterest: boolean;
  loanTerm: number; // Number of months for loan term
}

interface FinancialGoalsProps {
  transactions: Transaction[];
  selectedMonths: string[];
  totalIncome: number;
  currentBudgetId: string;
}

export function FinancialGoals({ transactions, selectedMonths, totalIncome, currentBudgetId }: FinancialGoalsProps) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [openGoalDialog, setOpenGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [goalData, setGoalData] = useState<GoalDialogData>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: '',
    category: 'Savings',
    notes: '',
    interestRate: 0,
    compoundingFrequency: 'monthly',
    includeInterest: false,
    loanTerm: 36 // Default to 36 months (3 years)
  });
  const [updatedDebts, setUpdatedDebts] = useState<{[goalId: string]: number}>({});
  
  const { user } = useAuth();
  
  // Function to calculate updated debt balance with compound interest
  const calculateUpdatedDebtBalance = (goal: FinancialGoal): number => {
    if (goal.category !== 'Debt' || !goal.interestRate || goal.interestRate <= 0) {
      return goal.currentAmount; // No interest to calculate
    }
    
    const lastUpdated = goal.lastUpdated ? new Date(goal.lastUpdated) : new Date(goal.createdAt);
    const now = new Date();
    
    // Check if it's been less than a day since last update
    const timeDiff = now.getTime() - lastUpdated.getTime();
    if (timeDiff < 24 * 60 * 60 * 1000) {
      return goal.currentAmount; // Less than a day, no need to recalculate
    }
    
    // Calculate months elapsed (considering partial months)
    const daysElapsed = timeDiff / (24 * 60 * 60 * 1000);
    const monthsElapsed = daysElapsed / 30; // Approximate months
    
    // Calculate monthly interest rate
    const monthlyInterestRate = goal.interestRate / 100 / 12;
    
    // Assume no payments were made, so interest compounds on the full balance
    // P * (1 + r)^n where P is principal, r is monthly rate, n is number of months
    const updatedBalance = goal.currentAmount * Math.pow(1 + monthlyInterestRate, monthsElapsed);
    
    // Round to 2 decimal places
    return Math.round(updatedBalance * 100) / 100;
  };
  
  // Automatically update debt balances when goals load or on a regular interval
  useEffect(() => {
    const updateDebtBalances = async () => {
      if (!user?.id || !goals.length) return;
      
      let hasUpdates = false;
      const updatedGoals = [...goals];
      const newlyUpdatedDebts: {[goalId: string]: number} = {};
      
      // Check each debt goal to see if it needs an interest update
      for (let i = 0; i < updatedGoals.length; i++) {
        const goal = updatedGoals[i];
        if (goal.category === 'Debt' && goal.interestRate && goal.interestRate > 0) {
          const newBalance = calculateUpdatedDebtBalance(goal);
          
          // Update if the balance has changed
          if (newBalance !== goal.currentAmount) {
            
            // Calculate the amount of interest added
            const interestAdded = newBalance - goal.currentAmount;
            newlyUpdatedDebts[goal.id] = interestAdded;
            
            // Update the goal in state
            updatedGoals[i] = {
              ...goal,
              currentAmount: newBalance,
              lastUpdated: new Date().toISOString()
            };
            hasUpdates = true;
            
            // Update the goal in Firestore
            try {
              await updateGoal(user.id, goal.id, {
                currentAmount: newBalance,
                lastUpdated: new Date().toISOString()
              });
            } catch (error) {
              console.error('Error updating debt balance:', error);
            }
          }
        }
      }
      
      // Update state only if changes were made
      if (hasUpdates) {
        setGoals(updatedGoals);
        setUpdatedDebts(newlyUpdatedDebts);
        
        // After 30 seconds, clear the updated debts notifications
        setTimeout(() => {
          setUpdatedDebts({});
        }, 30000);
      }
    };
    
    // Run the update when goals first load
    updateDebtBalances();
    
    // Set up a daily interval to check for updates 
    // Only updates will happen when needed (based on time elapsed)
    const intervalId = setInterval(updateDebtBalances, 24 * 60 * 60 * 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [goals, user?.id]);
  
  // Load goals from Firebase when component mounts or budget changes
  useEffect(() => {
    const fetchGoals = async () => {
      if (user?.id) {
        try {
          const loadedGoals = await loadGoals(user.id, currentBudgetId);
          setGoals(loadedGoals);
        } catch (error) {
          console.error('Error loading goals:', error);
        }
      }
    };
    
    fetchGoals();
  }, [user?.id, currentBudgetId]);
  
  // Calculate monthly savings rate based on transactions
  const calculateMonthlySavingsRate = () => {
    if (!transactions.length || !totalIncome) return 0;
    
    const savingsTransactions = transactions.filter(t => 
      t.category === 'Savings' && t.amount < 0
    );
    
    const totalSavings = savingsTransactions.reduce((sum, t) => 
      sum + Math.abs(t.amount), 0
    );
    
    return totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  };
  
  const monthlySavingsRate = calculateMonthlySavingsRate();
  
  // Dialog handlers
  const handleOpenGoalDialog = (goal?: FinancialGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalData({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline.split('T')[0],
        category: goal.category as 'Savings' | 'Debt' | 'Investment' | 'Custom',
        notes: goal.notes || '',
        interestRate: goal.interestRate || 0,
        compoundingFrequency: goal.compoundingFrequency || 'monthly',
        includeInterest: Boolean(goal.interestRate),
        loanTerm: goal.loanTerm || 36
      });
    } else {
      // Set default values for new goal
      setEditingGoal(null);
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      
      setGoalData({
        name: '',
        targetAmount: 0,
        currentAmount: 0,
        deadline: threeMonthsFromNow.toISOString().split('T')[0],
        category: 'Savings',
        notes: '',
        interestRate: 0,
        compoundingFrequency: 'monthly',
        includeInterest: false,
        loanTerm: 36
      });
    }
    setOpenGoalDialog(true);
  };
  
  const handleCloseGoalDialog = () => {
    setOpenGoalDialog(false);
    setEditingGoal(null);
  };
  
  // Calculate monthly payment required for debt payoff with specified term
  const calculateMonthlyPayment = (
    principal: number,
    annualInterestRate: number,
    termMonths: number = 36 // Default to 36 months if not specified
  ): number => {
    if (termMonths <= 0) termMonths = 36; // Ensure we have a valid term
    if (annualInterestRate <= 0 || principal <= 0) return principal / termMonths; // Simple division for no interest
    
    // Use monthly compounding
    const monthlyRate = annualInterestRate / 100 / 12;
    
    // Calculate monthly payment using the loan payment formula
    // PMT = (r * PV) / (1 - (1 + r)^-n)
    const payment = (monthlyRate * principal) / (1 - Math.pow(1 + monthlyRate, -termMonths));
    
    return payment;
  };

  // Calculate months remaining for debt repayment
  const calculateMonthsRemaining = (goal: FinancialGoal): number | null => {
    if (goal.category !== 'Debt' || goal.currentAmount <= 0) return null;
    
    const remainingPrincipal = goal.currentAmount;
    const annualInterestRate = goal.interestRate || 0;
    const loanTerm = goal.loanTerm || 36; // Use the loan term if available
    
    // If already paid off
    if (remainingPrincipal <= 0) {
      return 0;
    }
    
    if (annualInterestRate <= 0) {
      // Simple calculation without interest: principal / monthly payment
      return Math.ceil(remainingPrincipal / (remainingPrincipal / loanTerm));
    }
    
    const monthlyRate = annualInterestRate / 100 / 12;
    
    // Calculate monthly payment using the loan term
    const payment = calculateMonthlyPayment(remainingPrincipal, annualInterestRate, loanTerm);
    
    // Calculate months to payoff using logarithm formula
    // n = -log(1 - (r * P / PMT)) / log(1 + r)
    const monthsToPayoff = -Math.log(1 - (monthlyRate * remainingPrincipal / payment)) / Math.log(1 + monthlyRate);
    
    return Math.ceil(monthsToPayoff);
  };

  // Calculate the exact payment amount needed to pay off debt by the deadline
  const calculateExactPayment = (goal: FinancialGoal): number | null => {
    if (goal.category !== 'Debt' || goal.currentAmount <= 0) return null;
    
    const remainingPrincipal = goal.currentAmount;
    const annualInterestRate = goal.interestRate || 0;
    
    // If a loan term is specified, use it to calculate the payment
    if (goal.loanTerm) {
      return calculateMonthlyPayment(remainingPrincipal, annualInterestRate, goal.loanTerm);
    }
    
    // Otherwise, calculate based on deadline
    const deadline = new Date(goal.deadline);
    const now = new Date();
    
    // Calculate months between now and deadline
    const months = (deadline.getFullYear() - now.getFullYear()) * 12 + 
                  (deadline.getMonth() - now.getMonth());
    
    if (months <= 0) return remainingPrincipal; // Lump sum if past deadline
    
    if (annualInterestRate <= 0) {
      // Simple calculation without interest
      return remainingPrincipal / months;
    }
    
    const monthlyRate = annualInterestRate / 100 / 12;
    
    // Calculate payment needed to pay off by deadline
    const payment = (monthlyRate * remainingPrincipal) / (1 - Math.pow(1 + monthlyRate, -months));
    
    return payment;
  };
  
  // Handle saving a goal
  const handleSaveGoal = async () => {
    if (!user?.id) return;
    
    try {
      const now = new Date().toISOString();
      
      // For debt repayment goals, always use monthly compounding and include interest
      const isDebtGoal = goalData.category === 'Debt';
      
      // If it's a debt goal and no deadline was specified, calculate a reasonable one
      let deadline = goalData.deadline;
      if (isDebtGoal && (!goalData.deadline || goalData.deadline === '')) {
        // Use the loan term to calculate the deadline
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + goalData.loanTerm);
        deadline = futureDate.toISOString();
      }
      
      // Prepare the goal data with interest fields if applicable
      const baseGoalData = {
        name: goalData.name,
        targetAmount: goalData.targetAmount,
        currentAmount: goalData.currentAmount,
        deadline: new Date(deadline).toISOString(),
        category: goalData.category,
        notes: goalData.notes,
        budgetId: currentBudgetId
      };
      
      // Add interest fields only if it's a debt goal
      const interestFields = isDebtGoal
        ? {
            interestRate: goalData.interestRate,
            compoundingFrequency: 'monthly', // Always use monthly for debt goals
            loanTerm: goalData.loanTerm // Add loan term
          } 
        : {};
      
      if (editingGoal) {
        // Update existing goal
        const updatedGoal = {
          ...editingGoal,
          ...baseGoalData,
          ...interestFields,
          lastUpdated: now
        };
        
        await updateGoal(user.id, editingGoal.id, updatedGoal);
        
        // Update local state
        setGoals(goals.map(g => g.id === editingGoal.id ? updatedGoal : g));
      } else {
        // Create new goal
        const newGoal = {
          ...baseGoalData,
          ...interestFields,
          createdAt: now,
          lastUpdated: now
        };
        
        const goalId = await addGoal(user.id, newGoal);
        setGoals([...goals, { ...newGoal, id: goalId }]);
      }
      
      handleCloseGoalDialog();
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };
  
  const handleDeleteGoal = async (goalId: string) => {
    if (!user?.id) return;
    
    try {
      await deleteGoal(user.id, goalId);
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };
  
  // Function to update goal progress
  const handleUpdateProgress = (goal: FinancialGoal, newAmount: number) => {
    if (!user?.id) return;
    
    // Validate the amount
    if (goal.category === 'Debt' && (newAmount < 0 || newAmount > goal.targetAmount)) {
      alert(`Please enter a valid remaining balance between $0 and $${goal.targetAmount.toFixed(2)}.`);
      return;
    }
    
    const updatedGoal = {
      ...goal,
      currentAmount: newAmount,
      lastUpdated: new Date().toISOString()
    };
    
    updateGoal(user.id, goal.id, updatedGoal)
      .then(() => {
        setGoals(goals.map(g => g.id === goal.id ? updatedGoal : g));
      })
      .catch(error => {
        console.error('Error updating goal progress:', error);
      });
  };

  // Function to show debt repayment update dialog
  const handleDebtPaymentUpdate = (goal: FinancialGoal) => {
    // Get the current balance
    const currentBalance = goal.currentAmount;
    
    // Calculate suggested payment amount (use the monthly payment or a reasonable default)
    const suggestedPayment = calculateExactPayment(goal) || (currentBalance * 0.05);
    
    // Round the suggested payment to 2
    const roundedSuggestion = Math.round(suggestedPayment * 100) / 100;
    
    // Prompt the user for the payment amount with the suggestion
    const paymentInput = prompt(
      `Enter payment amount for ${goal.name}:\n\nCurrent balance: ${formatCurrency(currentBalance)}\nSuggested payment: ${formatCurrency(roundedSuggestion)}`, 
      roundedSuggestion.toString()
    );
    
    if (paymentInput === null) return; // User canceled
    
    const paymentAmount = parseFloat(paymentInput);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('Please enter a valid payment amount greater than zero.');
      return;
    }
    
    // Calculate the new balance after payment
    const newBalance = Math.max(0, currentBalance - paymentAmount);
    
    // Update the goal with the new balance
    handleUpdateProgress(goal, newBalance);
  };

  // Get remaining time until deadline
  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = Math.max(0, deadlineDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    }
    
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };
  
  // Check if goal is on track based on time and progress
  const isGoalOnTrack = (goal: FinancialGoal) => {
    const now = new Date();
    const createdDate = new Date(goal.createdAt);
    const deadlineDate = new Date(goal.deadline);
    
    const totalTimespan = deadlineDate.getTime() - createdDate.getTime();
    const timeElapsed = now.getTime() - createdDate.getTime();
    
    // Calculate what percentage of time has elapsed
    const timePercentElapsed = (timeElapsed / totalTimespan) * 100;
    
    // Calculate what percentage of goal has been achieved
    let progressPercentage;
    if (goal.category === 'Debt') {
      // For debt goals, progress is amount paid off divided by total
      progressPercentage = ((goal.targetAmount - goal.currentAmount) / goal.targetAmount) * 100;
    } else {
      // For savings and other goals, progress is amount saved divided by target
      progressPercentage = (goal.currentAmount / goal.targetAmount) * 100;
    }
    
    // Goal is on track if progress percentage is higher than time percentage elapsed
    return progressPercentage >= timePercentElapsed;
  };
  
  // Add this helper function to calculate monthly payment required for a debt with interest
  const calculateRequiredPayment = (
    principal: number,
    annualInterestRate: number,
    compoundingFrequency: 'monthly' | 'quarterly' | 'annually',
    targetDate: Date
  ): string => {
    // Calculate the number of months until the target date
    const now = new Date();
    const months = (targetDate.getFullYear() - now.getFullYear()) * 12 + 
                  (targetDate.getMonth() - now.getMonth());
    
    if (months <= 0) return formatCurrency(principal);
    
    // Convert annual interest rate to decimal
    const r = annualInterestRate / 100;
    
    // Calculate monthly interest rate based on compounding frequency
    let monthlyRate;
    switch (compoundingFrequency) {
      case 'monthly':
        monthlyRate = r / 12;
        break;
      case 'quarterly':
        monthlyRate = Math.pow(1 + r/4, 1/3) - 1;
        break;
      case 'annually':
        monthlyRate = Math.pow(1 + r, 1/12) - 1;
        break;
    }
    
    // Calculate monthly payment using the loan payment formula
    // P = (r * PV) / (1 - (1 + r)^-n)
    // where PV is present value (principal), r is monthly rate, n is number of months
    const payment = (monthlyRate * principal) / (1 - Math.pow(1 + monthlyRate, -months));
    
    return formatCurrency(payment);
  };
  
  return (
    <Box>
      <style>{keyframeStyle}</style>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Financial Goals
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenGoalDialog()}
        >
          New Goal
        </Button>
      </Box>
      
      {/* Goals Dashboard */}
      <Box sx={{ mb: 4 }}>
        <Card>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Active Goals
                </Typography>
                <Typography variant="h4">
                  {goals.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {goals.filter(g => g.category === 'Debt').length} debt,{' '}
                  {goals.filter(g => g.category !== 'Debt').length} savings/other
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Monthly Savings Rate
                </Typography>
                <Typography variant="h4">
                  {monthlySavingsRate.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  of your monthly income
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  {goals.some(g => g.category === 'Debt') ? 'Financial Summary' : 'Total Saved'}
                </Typography>
                {goals.some(g => g.category === 'Debt') ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography component="span" variant="h6" color="success.main">
                        {formatCurrency(goals.filter(g => g.category !== 'Debt').reduce((sum, goal) => sum + goal.currentAmount, 0))}
                      </Typography>
                      <Typography component="span" variant="caption" fontWeight="light">
                        saved
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography component="span" variant="h6" color="error.main">
                        {formatCurrency(goals.filter(g => g.category === 'Debt').reduce((sum, goal) => sum + goal.currentAmount, 0))}
                      </Typography>
                      <Typography component="span" variant="caption" fontWeight="light">
                        debt remaining
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Typography variant="h4">
                    {formatCurrency(goals.reduce((sum, goal) => sum + goal.currentAmount, 0))}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  across all goals
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
      
      {/* Goals List */}
      {goals.length > 0 ? (
        <Grid container spacing={3}>
          {goals.map(goal => {
            const progress = goal.category === 'Debt' 
              ? ((goal.targetAmount - goal.currentAmount) / goal.targetAmount) * 100
              : (goal.currentAmount / goal.targetAmount) * 100;
            const onTrack = isGoalOnTrack(goal);
            const timeRemaining = getTimeRemaining(goal.deadline);
            const pastDeadline = new Date(goal.deadline) < new Date();
            const monthsRemaining = goal.category === 'Debt' ? calculateMonthsRemaining(goal) : null;
            const monthlyPayment = goal.category === 'Debt' ? calculateExactPayment(goal) : null;
            const interestApplied = goal.category === 'Debt' && updatedDebts[goal.id];
            
            return (
              <Grid item xs={12} sm={6} md={4} key={goal.id}>
                <Card sx={{ 
                  height: '100%', 
                  position: 'relative',
                  ...(goal.category === 'Debt' && {
                    background: `linear-gradient(to bottom, rgba(211, 47, 47, 0.05) 0%, rgba(211, 47, 47, 0) 100%)`,
                    borderLeft: '4px solid',
                    borderLeftColor: 'error.main',
                  })
                }}>
                  {/* Status indicators */}
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 12, 
                      right: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    {interestApplied ? (
                      <Tooltip title={`Interest of ${formatCurrency(updatedDebts[goal.id])} was just applied to this debt`}>
                        <Badge color="error" variant="dot" sx={{ '& .MuiBadge-badge': { animation: 'pulse 1.5s infinite' } }}>
                          <UpdateIcon color="warning" />
                        </Badge>
                      </Tooltip>
                    ) : progress >= 100 ? (
                      <Tooltip title="Goal achieved">
                        <CheckCircleIcon color="success" />
                      </Tooltip>
                    ) : pastDeadline ? (
                      <Tooltip title="Past deadline">
                        <ErrorIcon color="error" />
                      </Tooltip>
                    ) : onTrack ? (
                      <Tooltip title="On track">
                        <TrendingUpIcon color="success" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Behind schedule">
                        <TrendingUpIcon color="warning" />
                      </Tooltip>
                    )}
                  </Box>
                  
                  <CardContent>
                    {/* Interest information alert */}
                    {interestApplied && (
                      <Alert 
                        severity="info" 
                        sx={{ 
                          mb: 2, 
                          fontSize: '0.75rem', 
                          '& .MuiAlert-message': { padding: '0px 8px' },
                          animation: 'fadeIn 0.5s'
                        }}
                      >
                        Interest of {formatCurrency(updatedDebts[goal.id])} applied
                      </Alert>
                    )}
                    
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          label={goal.category} 
                          size="small" 
                          sx={{ mr: 1 }}
                          color={
                            goal.category === 'Savings' ? 'primary' :
                            goal.category === 'Debt' ? 'error' :
                            goal.category === 'Investment' ? 'success' : 'default'
                          }
                        />
                        <Typography variant="h6" noWrap>
                          {goal.name}
                        </Typography>
                      </Box>
                      
                      {goal.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }} noWrap>
                          {goal.notes}
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          {goal.category === 'Debt' ? 'Payoff Progress:' : 'Progress:'} {progress.toFixed(1)}%
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color={progress >= 100 ? 'success.main' : pastDeadline ? 'error.main' : onTrack ? 'success.main' : 'warning.main'}
                        >
                          {goal.category === 'Debt' 
                            ? `${formatCurrency(goal.currentAmount)} remaining` 
                            : `${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)}`}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(progress, 100)} 
                        color={progress >= 100 ? 'success' : pastDeadline ? 'error' : onTrack ? 'success' : 'warning'}
                        sx={{ 
                          height: 8, 
                          borderRadius: 4, 
                          mb: 1,
                          ...(goal.category === 'Debt' && {
                            height: 10,
                            '& .MuiLinearProgress-bar': {
                              transition: 'transform 1s ease-in-out'
                            }
                          })
                        }}
                      />
                      
                      {goal.category === 'Debt' && monthsRemaining !== null && (
                        <Box sx={{ 
                          mt: 2, 
                          p: 1.5, 
                          borderRadius: 2, 
                          bgcolor: 'background.paper',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: '1px solid',
                          borderColor: 'divider',
                          fontSize: '0.75rem',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 1.5
                        }}>
                          {/* Left column */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                              Remaining:
                            </Typography>
                            <Typography variant="body2" fontWeight="600" fontSize="0.95rem">
                              {formatCurrency(goal.currentAmount)}
                            </Typography>
                            
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, mb: 0.5 }}>
                              Paid so far:
                            </Typography>
                            <Typography variant="body2" color="success.main" fontWeight="600" fontSize="0.95rem">
                              {formatCurrency(goal.targetAmount - goal.currentAmount)}
                            </Typography>
                          </Box>
                          
                          {/* Right column */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                              Monthly payment:
                            </Typography>
                            <Typography variant="body2" fontWeight="600" fontSize="0.95rem">
                              {monthlyPayment !== null ? formatCurrency(monthlyPayment) : '-'}
                            </Typography>
                            
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, mb: 0.5 }}>
                              Time to payoff:
                            </Typography>
                            <Typography variant="body2" fontWeight="600" fontSize="0.95rem">
                              {monthsRemaining} month{monthsRemaining !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                          
                          {/* Bottom row with interest rate and term */}
                          <Box sx={{ 
                            gridColumn: '1 / -1', 
                            mt: 0.5, 
                            pt: 1,
                            borderTop: '1px dashed',
                            borderColor: 'divider',
                            display: 'flex', 
                            justifyContent: 'space-between' 
                          }}>
                            {goal.interestRate && goal.interestRate > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                {goal.interestRate}% interest rate
                              </Typography>
                            )}
                            {goal.loanTerm && (
                              <Typography variant="caption" color="text.secondary">
                                {Math.floor(goal.loanTerm / 12)} year{Math.floor(goal.loanTerm / 12) !== 1 ? 's' : ''} term
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                      
                      {!pastDeadline && progress < 100 && goal.category !== 'Debt' && (
                        <Typography variant="caption" display="block" textAlign="right" color="text.secondary">
                          {timeRemaining} remaining
                        </Typography>
                      )}
                    </Box>
                    
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button 
                        size="small" 
                        variant={goal.category === 'Debt' ? "contained" : "outlined"}
                        color={goal.category === 'Debt' ? "error" : "primary"}
                        onClick={() => {
                          if (goal.category === 'Debt') {
                            handleDebtPaymentUpdate(goal);
                          } else {
                            const newAmount = prompt(
                              `Update current amount for ${goal.name}:`, 
                              goal.currentAmount.toString()
                            );
                            if (newAmount !== null) {
                              const amount = parseFloat(newAmount);
                              if (!isNaN(amount)) {
                                handleUpdateProgress(goal, amount);
                              }
                            }
                          }
                        }}
                      >
                        {goal.category === 'Debt' ? 'Make Payment' : 'Update Progress'}
                      </Button>
                      <IconButton size="small" onClick={() => handleOpenGoalDialog(goal)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the goal "${goal.name}"?`)) {
                            handleDeleteGoal(goal.id);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            You don't have any financial goals yet. Create your first goal to start tracking your progress!
          </Alert>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenGoalDialog()}
          >
            Create Your First Goal
          </Button>
        </Box>
      )}
      
      {/* Goal Dialog */}
      <Dialog 
        open={openGoalDialog} 
        onClose={handleCloseGoalDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Goal Name"
              fullWidth
              value={goalData.name}
              onChange={(e) => setGoalData({ ...goalData, name: e.target.value })}
              placeholder={goalData.category === 'Debt' ? "e.g. Car Loan, Credit Card, Student Loan" : "e.g. Emergency Fund, Vacation, New Car"}
              autoFocus
            />
            
            <TextField
              select
              label="Category"
              fullWidth
              value={goalData.category}
              onChange={(e) => {
                const newCategory = e.target.value as 'Savings' | 'Debt' | 'Investment' | 'Custom';
                setGoalData({ 
                  ...goalData, 
                  category: newCategory,
                  // Automatically set includeInterest to true for Debt category
                  includeInterest: newCategory === 'Debt',
                  // Automatically set compoundingFrequency to monthly for Debt category
                  compoundingFrequency: newCategory === 'Debt' ? 'monthly' : goalData.compoundingFrequency,
                  // Reset loan term to default if switching to/from debt
                  loanTerm: newCategory === 'Debt' ? 36 : goalData.loanTerm,
                  // Set default interest rate for debt
                  interestRate: newCategory === 'Debt' ? 5.0 : goalData.interestRate
                });
              }}
            >
              <MenuItem value="Savings">Savings</MenuItem>
              <MenuItem value="Debt">Debt Repayment</MenuItem>
              <MenuItem value="Investment">Investment</MenuItem>
              <MenuItem value="Custom">Custom</MenuItem>
            </TextField>
            
            {goalData.category === 'Debt' && (
              <Box sx={{ 
                bgcolor: 'error.light', 
                color: 'error.contrastText', 
                borderRadius: 1, 
                p: 1.5, 
                fontSize: '0.875rem' 
              }}>
                <Typography variant="subtitle2" gutterBottom>Debt Repayment Goal</Typography>
                <Typography variant="body2">
                  Enter the total loan value (initial amount borrowed), 
                  the current remaining balance, the interest rate, and select a loan term. 
                  This will determine your monthly payment.
                </Typography>
              </Box>
            )}
            
            <TextField
              label={goalData.category === 'Debt' ? "Total Loan Value" : "Target Amount"}
              type="number"
              fullWidth
              value={goalData.targetAmount}
              onChange={(e) => setGoalData({ ...goalData, targetAmount: Number(e.target.value) })}
              InputProps={{
                startAdornment: <span>$</span>
              }}
              helperText={goalData.category === 'Debt' ? "Original amount borrowed" : "Amount you want to save or invest"}
            />
            
            <TextField
              label={goalData.category === 'Debt' ? "Remaining Balance" : "Current Amount"}
              type="number"
              fullWidth
              value={goalData.currentAmount}
              onChange={(e) => setGoalData({ ...goalData, currentAmount: Number(e.target.value) })}
              InputProps={{
                startAdornment: <span>$</span>
              }}
              helperText={goalData.category === 'Debt' ? "Current outstanding balance" : "How much you've saved so far"}
            />
            
            {/* Only show target date for non-debt goals */}
            {goalData.category !== 'Debt' && (
              <TextField
                label="Target Date"
                type="date"
                fullWidth
                value={goalData.deadline}
                onChange={(e) => setGoalData({ ...goalData, deadline: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            )}
            
            {/* Show interest rate and loan term fields for Debt category */}
            {goalData.category === 'Debt' && (
              <>
                <TextField
                  label="Interest Rate (% per year)"
                  type="number"
                  fullWidth
                  value={goalData.interestRate}
                  onChange={(e) => setGoalData({ ...goalData, interestRate: Number(e.target.value) })}
                  inputProps={{ min: 0, step: 0.01 }}
                  placeholder="e.g. 5.25"
                  InputProps={{
                    endAdornment: <span>%</span>
                  }}
                  helperText="Annual interest rate (monthly compounding will be used)"
                />
                
                <TextField
                  select
                  label="Loan Term"
                  fullWidth
                  value={goalData.loanTerm}
                  onChange={(e) => setGoalData({ 
                    ...goalData, 
                    loanTerm: Number(e.target.value)
                  })}
                  helperText="Select the loan term to determine monthly payment"
                >
                  <MenuItem value={12}>1 Year (12 months)</MenuItem>
                  <MenuItem value={24}>2 Years (24 months)</MenuItem>
                  <MenuItem value={36}>3 Years (36 months)</MenuItem>
                  <MenuItem value={48}>4 Years (48 months)</MenuItem>
                  <MenuItem value={60}>5 Years (60 months)</MenuItem>
                  <MenuItem value={72}>6 Years (72 months)</MenuItem>
                  <MenuItem value={84}>7 Years (84 months)</MenuItem>
                  <MenuItem value={120}>10 Years (120 months)</MenuItem>
                  <MenuItem value={180}>15 Years (180 months)</MenuItem>
                  <MenuItem value={240}>20 Years (240 months)</MenuItem>
                  <MenuItem value={360}>30 Years (360 months)</MenuItem>
                </TextField>
                
                {goalData.interestRate >= 0 && goalData.targetAmount > 0 && goalData.currentAmount > 0 && (
                  <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Debt Repayment Calculation
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Based on your inputs:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      <Box component="li" sx={{ mb: 0.5 }}>
                        {formatCurrency(goalData.targetAmount)} total loan, {formatCurrency(goalData.currentAmount)} remaining
                      </Box>
                      <Box component="li" sx={{ mb: 0.5 }}>
                        Progress: {((goalData.targetAmount - goalData.currentAmount) / goalData.targetAmount * 100).toFixed(1)}% paid off
                      </Box>
                      <Box component="li" sx={{ mb: 0.5 }}>
                        Loan term: {goalData.loanTerm} months ({Math.floor(goalData.loanTerm / 12)} years{goalData.loanTerm % 12 > 0 ? `, ${goalData.loanTerm % 12} months` : ''})
                      </Box>
                      <Box component="li" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                        Monthly payment: {formatCurrency(calculateMonthlyPayment(goalData.currentAmount, goalData.interestRate, goalData.loanTerm))}
                      </Box>
                      <Box component="li">
                        Total payment: {formatCurrency(calculateMonthlyPayment(goalData.currentAmount, goalData.interestRate, goalData.loanTerm) * goalData.loanTerm)}
                        {goalData.interestRate > 0 && (
                          <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                            (includes {formatCurrency((calculateMonthlyPayment(goalData.currentAmount, goalData.interestRate, goalData.loanTerm) * goalData.loanTerm) - goalData.currentAmount)} in interest)
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
              </>
            )}
            
            {/* Only show notes field for non-debt goals or after the required fields for debt goals */}
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={goalData.notes}
              onChange={(e) => setGoalData({ ...goalData, notes: e.target.value })}
              placeholder="Optional notes about this goal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGoalDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveGoal} 
            variant="contained" 
            color="primary"
            disabled={
              !goalData.name || 
              goalData.targetAmount <= 0 || 
              (goalData.category === 'Debt' && goalData.currentAmount <= 0) ||
              (goalData.category !== 'Debt' && !goalData.deadline)
            }
          >
            {editingGoal ? 'Update Goal' : 'Create Goal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Add keyframe animation CSS at the end of component before closing bracket
const keyframeStyle = `
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7);
    }
    
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 6px rgba(211, 47, 47, 0);
    }
    
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(211, 47, 47, 0);
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`; 