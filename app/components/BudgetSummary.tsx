import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  AlertTitle,
  useTheme as useMuiTheme,
  LinearProgress,
  Chip,
  Stack,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Tooltip,
  Icon,
  Tab,
  Tabs
} from '@mui/material';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import type { BudgetSummary as BudgetSummaryType, BudgetPlan } from '../services/budgetCalculator';
import type { BudgetPreferences } from './BudgetActions';
import { BudgetAnalytics } from './BudgetAnalytics';
import { SmartInsights } from './SmartInsights';
import { CategoryDeepDive } from './CategoryDeepDive';
import type { Transaction } from '../services/fileParser';
import type { FinancialGoal } from '../services/goalService';

// Lazy load Chart.js components to avoid SSR issues
const LazyCharts = React.lazy(() => import('./LazyCharts'));

interface BudgetSummaryProps {
  summary: BudgetSummaryType;
  plan: BudgetPlan;
  suggestions: string[];
  preferences: BudgetPreferences;
  transactions: Transaction[];
  selectedMonths: string[];
  showActualAmounts: boolean;
  showPercentages: boolean;
  showDifferences: boolean;
  showProgressBars: boolean;
}

export function BudgetSummary({ summary, plan, suggestions, preferences, transactions, selectedMonths, showActualAmounts, showPercentages, showDifferences, showProgressBars }: BudgetSummaryProps) {
  const theme = useMuiTheme();
  const { mode } = useCustomTheme();
  const [isBrowser, setIsBrowser] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const isDarkMode = mode === 'dark';
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState<Transaction[]>([]);

  // Filter transactions for selected months
  const filteredTransactions = useMemo(() => {
    if (!transactions || !selectedMonths || selectedMonths.length === 0) {
      console.log('No transactions or selected months');
      return [];
    }
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
      const isIncluded = selectedMonths.includes(transactionMonth);
      console.log('Transaction:', {
        date: transactionDate,
        month: transactionMonth,
        amount: transaction.amount,
        category: transaction.category,
        isIncluded
      });
      return isIncluded;
    });
  }, [transactions, selectedMonths]);

  // Calculate category totals from filtered transactions
  const categoryTotals = useMemo(() => {
    console.log('Calculating category totals from filtered transactions:', filteredTransactions);
    
    const totals = {
      essentials: 0,
      wants: 0,
      savings: 0,
      income: 0
    };

    filteredTransactions.forEach(transaction => {
      // Handle income
      if (transaction.amount >= 0) {
        console.log('Adding income:', transaction.amount);
        totals.income += transaction.amount;
        return;
      }

      // Handle expenses (negative amounts)
      const amount = Math.abs(transaction.amount);
      let category = (transaction.category || 'essentials').toLowerCase();
      console.log('Processing expense:', { amount, category });
      
      // Normalize category names
      if (category.includes('essential')) category = 'essentials';
      else if (category.includes('want')) category = 'wants';
      else if (category.includes('saving')) category = 'savings';
      else category = 'essentials'; // Default to essentials if no match

      console.log('Normalized category:', category);

      if (category in totals) {
        totals[category as keyof typeof totals] += amount;
        console.log(`Updated ${category} total:`, totals[category as keyof typeof totals]);
      }
    });

    console.log('Final category totals:', totals);
    return totals;
  }, [filteredTransactions]);

  // Keep track of monthly transactions
  useEffect(() => {
    setMonthlyTransactions(filteredTransactions);
  }, [filteredTransactions]);

  // Only render charts on the client side
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Listen for tab switch events
  useEffect(() => {
    const handleSwitchToInsights = (event: CustomEvent) => {
      setActiveTab(event.detail.tabIndex);
    };

    window.addEventListener('switchToInsights', handleSwitchToInsights as EventListener);
    return () => {
      window.removeEventListener('switchToInsights', handleSwitchToInsights as EventListener);
    };
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  // Calculate progress and status
  const calculateProgress = (actual: number, target: number) => {
    const progress = (actual / target) * 100;
    let status: 'success' | 'warning' | 'error' = 'success';
    
    if (progress > 100) {
      status = 'error';
    } else if (progress > 90) {
      status = 'warning';
    }

    return { progress, status };
  };

  return (
    <Box sx={{ mb: 4 }}>
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label="budget summary tabs"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
            }
          }}
        >
          <Tab label="Overview" />
          <Tab label="Analytics" />
          <Tab label="Insights & Goals" />
          <Tab label="Deep Dive" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Income Summary */}
          <Grid item xs={12}>
            <Card sx={{ mb: 3, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Income Summary
                </Typography>
                <Chip 
                  label={`${selectedMonths.length} month${selectedMonths.length > 1 ? 's' : ''} selected`}
                  color="primary"
                  size="small"
                />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Total Income</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {formatCurrency(categoryTotals.income)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Total Expenses</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {formatCurrency(categoryTotals.essentials + categoryTotals.wants + categoryTotals.savings)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Net Income</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(categoryTotals.income - (categoryTotals.essentials + categoryTotals.wants + categoryTotals.savings))}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Category Cards */}
          {Object.entries(preferences.categoryCustomization).map(([category, settings]) => {
            const actualAmount = categoryTotals[category as keyof typeof categoryTotals];
            const targetAmount = (preferences.ratios[category as keyof typeof preferences.ratios] / 100) * categoryTotals.income;
            const { progress, status } = calculateProgress(actualAmount, targetAmount);
            const difference = actualAmount - targetAmount;
            const percentageOfIncome = categoryTotals.income > 0 ? (actualAmount / categoryTotals.income) * 100 : 0;

            return (
              <Grid item xs={12} md={4} key={category}>
                <Card sx={{ 
                  height: '100%',
                  borderLeft: 4,
                  borderColor: settings.color,
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    transition: 'all 0.2s ease-in-out'
                  }
                }}>
                  <CardContent>
                    {/* Category Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontWeight: 600
                      }}>
                        <span>{settings.icon}</span>
                        {settings.name}
                      </Typography>
                    </Box>

                    {/* Amount Display */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {formatCurrency(actualAmount)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        Target: {formatCurrency(targetAmount)}
                        <Chip
                          size="small"
                          label={`${difference >= 0 ? '+' : ''}${formatCurrency(difference)}`}
                          color={difference > 0 ? 'error' : 'success'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Typography>
                    </Box>

                    {/* Progress Section */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Budget Usage
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: `${status}.main` }}>
                          {formatPercentage(progress)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(progress, 100)}
                        color={status}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: theme.palette.grey[200],
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatPercentage(percentageOfIncome)} of Income
                        </Typography>
                        <Typography variant="caption" sx={{ color: `${status}.main`, fontWeight: 500 }}>
                          {progress > 100 ? '⚠️ Over Budget' : progress > 90 ? '⚡ Near Limit' : '✅ On Track'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}

          {/* Charts Section */}
          {isBrowser && categoryTotals.income > 0 && (
            <React.Suspense fallback={<Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading charts...</Box>}>
              <Grid item xs={12} container spacing={3}>
                {preferences.chartPreferences.showPieChart && (
                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: '450px', p: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>Expense Distribution</Typography>
                      <LazyCharts 
                        pieData={{
                          labels: Object.values(preferences.categoryCustomization).map(cat => cat.name),
                          datasets: [{
                            data: [categoryTotals.essentials, categoryTotals.wants, categoryTotals.savings],
                            backgroundColor: Object.values(preferences.categoryCustomization).map(cat => cat.color),
                            borderColor: Object.values(preferences.categoryCustomization).map(cat => cat.color),
                            borderWidth: 1,
                          }],
                        }}
                        barData={{
                          labels: [],
                          datasets: []
                        }}
                        barOptions={{}}
                        showPie={true}
                        showBar={false}
                      />
                    </Card>
                  </Grid>
                )}

                {preferences.chartPreferences.showBarChart && (
                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: '450px', p: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>Budget vs. Actual</Typography>
                      <LazyCharts 
                        pieData={{
                          labels: [],
                          datasets: []
                        }}
                        barData={{
                          labels: Object.values(preferences.categoryCustomization).map(cat => cat.name),
                          datasets: [
                            {
                              label: 'Target',
                              data: Object.entries(preferences.ratios).map(([_, ratio]) => (ratio / 100) * categoryTotals.income),
                              backgroundColor: theme.palette.primary.main,
                              borderRadius: 6,
                              barThickness: 40,
                            },
                            {
                              label: 'Actual',
                              data: [categoryTotals.essentials, categoryTotals.wants, categoryTotals.savings],
                              backgroundColor: theme.palette.warning.main,
                              borderRadius: 6,
                              barThickness: 40,
                            },
                          ],
                        }}
                        barOptions={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: (value: number) => formatCurrency(value),
                              },
                            },
                          },
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                          },
                        }}
                        showPie={false}
                        showBar={true}
                      />
                    </Card>
                  </Grid>
                )}
              </Grid>
            </React.Suspense>
          )}

          {/* Suggestions Section */}
          {preferences.chartPreferences.showSuggestions && suggestions.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Budget Insights</Typography>
                  <List>
                    {suggestions.map((suggestion, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={suggestion}
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontSize: '0.9rem',
                              color: 'text.secondary',
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Analytics Tab */}
      {activeTab === 1 && (
        <BudgetAnalytics
          transactions={monthlyTransactions}
          summary={{
            categories: {
              essentials: categoryTotals.essentials,
              wants: categoryTotals.wants,
              savings: categoryTotals.savings
            },
            totalIncome: categoryTotals.income,
            totalExpenses: categoryTotals.essentials + categoryTotals.wants + categoryTotals.savings,
            percentages: {
              essentials: (categoryTotals.essentials / categoryTotals.income) * 100,
              wants: (categoryTotals.wants / categoryTotals.income) * 100,
              savings: (categoryTotals.savings / categoryTotals.income) * 100
            },
            netCashflow: categoryTotals.income - (categoryTotals.essentials + categoryTotals.wants + categoryTotals.savings)
          }}
          plan={plan}
          preferences={preferences}
          selectedMonths={selectedMonths}
        />
      )}

      {/* Insights & Goals Tab */}
      {activeTab === 2 && (
        <SmartInsights
          transactions={monthlyTransactions}
          selectedMonths={selectedMonths}
          totalIncome={categoryTotals.income}
          onGoalUpdate={setGoals}
          openSavingsDialog={false}
          onCloseSavingsDialog={() => {}}
        />
      )}

      {/* Deep Dive Tab */}
      {activeTab === 3 && (
        <CategoryDeepDive
          transactions={monthlyTransactions}
          selectedMonths={selectedMonths}
        />
      )}
    </Box>
  );
} 