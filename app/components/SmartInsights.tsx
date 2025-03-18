import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  List,
  ListItem,
  ListItemText,

  Chip,
  Tooltip,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Transaction } from '../services/fileParser';

interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'Savings' | 'Debt' | 'Investment' | 'Custom';
  createdAt: string;
}

interface SmartInsightsProps {
  transactions: Transaction[];
  selectedMonths: string[];
  totalIncome: number;
  onGoalUpdate: (goals: FinancialGoal[]) => void;
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({
  transactions,
  selectedMonths,
  totalIncome,
  onGoalUpdate,
}) => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<FinancialGoal>>({
    category: 'Savings',
  });

  // Generate AI-powered insights based on transaction patterns
  const generateInsights = () => {
    const newInsights: string[] = [];

    // Group transactions by category and month
    const categoryMonthlyTotals: { [key: string]: { [key: string]: number } } = {};
    const allMonths = new Set<string>();

    transactions.forEach(transaction => {
      if (!transaction.category) return; // Skip transactions without category
      const month = new Date(transaction.date).toLocaleString('default', { month: 'long' });
      allMonths.add(month);

      if (!categoryMonthlyTotals[transaction.category]) {
        categoryMonthlyTotals[transaction.category] = {};
      }
      if (!categoryMonthlyTotals[transaction.category][month]) {
        categoryMonthlyTotals[transaction.category][month] = 0;
      }
      categoryMonthlyTotals[transaction.category][month] += Math.abs(transaction.amount);
    });

    const sortedMonths = Array.from(allMonths).sort((a, b) => {
      const monthOrder = ["January", "February", "March", "April", "May", "June",
                         "July", "August", "September", "October", "November", "December"];
      return monthOrder.indexOf(a) - monthOrder.indexOf(b);
    });

    // Analyze spending patterns
    Object.entries(categoryMonthlyTotals).forEach(([category, monthlyData]) => {
      const categoryMonths = Object.keys(monthlyData);
      if (categoryMonths.length >= 2) {
        const currentMonth = categoryMonths[categoryMonths.length - 1];
        const previousMonth = categoryMonths[categoryMonths.length - 2];
        const currentSpending = monthlyData[currentMonth];
        const previousSpending = monthlyData[previousMonth];
        const percentageChange = ((currentSpending - previousSpending) / previousSpending) * 100;

        if (Math.abs(percentageChange) > 20) {
          newInsights.push(
            `Your ${category} spending ${percentageChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentageChange).toFixed(1)}% compared to last month.`
          );
        }
      }
    });

    // Identify unusual expenses
    const categoryAverages: { [key: string]: number } = {};
    Object.entries(categoryMonthlyTotals).forEach(([category, monthlyData]) => {
      const total = Object.values(monthlyData).reduce((sum, amount) => sum + amount, 0);
      categoryAverages[category] = total / Object.keys(monthlyData).length;
    });

    transactions.forEach(transaction => {
      if (!transaction.category) return; // Skip transactions without category
      const amount = Math.abs(transaction.amount);
      if (amount > (categoryAverages[transaction.category] || 0) * 2) {
        newInsights.push(
          `Unusual expense detected: ${transaction.description} (${formatCurrency(amount)}) is significantly higher than your average ${transaction.category} spending.`
        );
      }
    });

    // Add savings-related insights
    const currentMonth = sortedMonths[sortedMonths.length - 1];
    const savingsRate = (categoryMonthlyTotals['Savings']?.[currentMonth] || 0) / totalIncome * 100;
    if (savingsRate < 20) {
      newInsights.push(
        `Your current savings rate is ${savingsRate.toFixed(1)}%. Consider setting up automatic savings transfers to reach the recommended 20%.`
      );
    }

    setInsights(newInsights);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate estimated completion date for a goal
  const calculateEstimatedCompletion = (goal: FinancialGoal) => {
    const monthlyContribution = transactions
      .filter(t => t.category === goal.category)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) / selectedMonths.length;

    const remainingAmount = goal.targetAmount - goal.currentAmount;
    const monthsToComplete = Math.ceil(remainingAmount / monthlyContribution);
    
    const estimatedDate = new Date();
    estimatedDate.setMonth(estimatedDate.getMonth() + monthsToComplete);
    return estimatedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Handle adding a new goal
  const handleAddGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) return;

    const goal: FinancialGoal = {
      id: Date.now().toString(),
      name: newGoal.name,
      targetAmount: newGoal.targetAmount,
      currentAmount: 0,
      deadline: newGoal.deadline,
      category: newGoal.category as FinancialGoal['category'],
      createdAt: new Date().toISOString(),
    };

    const updatedGoals = [...goals, goal];
    setGoals(updatedGoals);
    onGoalUpdate(updatedGoals);
    setIsAddGoalDialogOpen(false);
    setNewGoal({ category: 'Savings' });
  };

  // Handle updating goal progress
  const handleUpdateGoalProgress = (goalId: string, amount: number) => {
    const updatedGoals = goals.map(goal =>
      goal.id === goalId
        ? { ...goal, currentAmount: Math.min(amount, goal.targetAmount) }
        : goal
    );
    setGoals(updatedGoals);
    onGoalUpdate(updatedGoals);
  };

  // Handle deleting a goal
  const handleDeleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    setGoals(updatedGoals);
    onGoalUpdate(updatedGoals);
  };

  // Generate insights when transactions change
  useEffect(() => {
    generateInsights();
  }, [transactions, selectedMonths]);

  return (
    <Grid container spacing={3}>
      {/* AI-Powered Insights */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Smart Insights
            </Typography>
            <List>
              {insights.map((insight, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={insight}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.95rem',
                      },
                    }}
                  />
                </ListItem>
              ))}
              {insights.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No insights available yet. Add more transactions to get personalized recommendations."
                    sx={{ color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Financial Goals */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Financial Goals
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setIsAddGoalDialogOpen(true)}
                variant="contained"
                size="small"
              >
                Add Goal
              </Button>
            </Box>

            <Grid container spacing={2}>
              {goals.map(goal => (
                <Grid item xs={12} md={6} lg={4} key={goal.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {goal.name}
                        </Typography>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(goal.currentAmount / goal.targetAmount) * 100}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(goal.currentAmount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(goal.targetAmount)}
                        </Typography>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Chip
                          label={`Due: ${new Date(goal.deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Estimated completion: {calculateEstimatedCompletion(goal)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {goals.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No financial goals set. Add a goal to start tracking your progress!
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Add Goal Dialog */}
      <Dialog
        open={isAddGoalDialogOpen}
        onClose={() => setIsAddGoalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Financial Goal</DialogTitle>
        <DialogContent>
          <TextField
            label="Goal Name"
            fullWidth
            margin="normal"
            value={newGoal.name || ''}
            onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
          />
          <TextField
            label="Target Amount"
            fullWidth
            margin="normal"
            type="number"
            value={newGoal.targetAmount || ''}
            onChange={(e) => setNewGoal({ ...newGoal, targetAmount: parseFloat(e.target.value) })}
          />
          <TextField
            label="Category"
            fullWidth
            margin="normal"
            select
            value={newGoal.category || 'Savings'}
            onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as FinancialGoal['category'] })}
          >
            <MenuItem value="Savings">Savings</MenuItem>
            <MenuItem value="Debt">Debt</MenuItem>
            <MenuItem value="Investment">Investment</MenuItem>
            <MenuItem value="Custom">Custom</MenuItem>
          </TextField>
          <TextField
            label="Target Date"
            fullWidth
            margin="normal"
            type="date"
            value={newGoal.deadline || ''}
            onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddGoalDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddGoal} variant="contained" color="primary">
            Add Goal
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}; 