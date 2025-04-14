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
                  Financial Overview
                </Typography>
                <Chip 
                  label={`${selectedMonths.length} month${selectedMonths.length > 1 ? 's' : ''} selected`}
                  color="primary"
                  size="small"
                />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Total Net Income</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {formatCurrency(categoryTotals.income)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Total Expenses</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {formatCurrency(categoryTotals.essentials + categoryTotals.wants + categoryTotals.savings)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Category Cards */}
          {/* First display Essentials, then Wants, then Savings in that order */}
          {['essentials', 'wants', 'savings'].map((categoryKey) => {
            const category = categoryKey as keyof typeof preferences.categoryCustomization;
            const settings = preferences.categoryCustomization[category];
            const actualAmount = categoryTotals[category as keyof typeof categoryTotals];
            const targetAmount = (preferences.ratios[category as keyof typeof preferences.ratios] / 100) * categoryTotals.income;
            const { progress, status } = calculateProgress(actualAmount, targetAmount);
            const difference = actualAmount - targetAmount;
            const percentageOfIncome = categoryTotals.income > 0 ? (actualAmount / categoryTotals.income) * 100 : 0;

            // Category descriptions
            const categoryDescriptions = {
              essentials: "Essential expenses like housing, food, utilities, and other necessities that are required for basic living.",
              wants: "Discretionary spending on non-essential items like entertainment, dining out, hobbies, and other lifestyle choices.",
              savings: "Money set aside for future goals, emergency funds, investments, and other long-term financial planning."
            };

            // Get relevant insights for each category
            const getCategoryInsight = (category: string) => {
              if (categoryTotals.income === 0) return "No income recorded. Add income transactions to see budget insights.";
              
              if (category === 'essentials') {
                if (difference < 0) {
                  return `You're spending ${formatCurrency(Math.abs(difference))} more than recommended on essentials. Consider reviewing your essential expenses.`;
                } else if (difference > 0) {
                  return `Great! You're spending ${formatCurrency(difference)} less than recommended on essentials, giving you more flexibility.`;
                } else {
                  return "Your essential spending is exactly on target with the recommended amount.";
                }
              } else if (category === 'wants') {
                if (difference < 0) {
                  return `You're spending ${formatCurrency(Math.abs(difference))} more than recommended on wants. Consider reducing non-essential purchases.`;
                } else if (difference > 0) {
                  return `Good job! You're spending ${formatCurrency(difference)} less than the recommended amount on discretionary items.`;
                } else {
                  return "Your discretionary spending is perfectly balanced with the recommended amount.";
                }
              } else if (category === 'savings') {
                if (difference > 0) {
                  return `Excellent! You're saving ${formatCurrency(difference)} more than recommended, which boosts your financial security.`;
                } else if (difference < 0) {
                  return `You're saving ${formatCurrency(Math.abs(difference))} less than the 20% recommendation. Try to increase your savings rate.`;
                } else {
                  return "Your savings rate matches the recommended amount perfectly.";
                }
              }
              
              return "";
            };

            // Get tips for improvement based on category and current spending
            const getCategoryTip = (category: string) => {
              if (category === 'essentials' && difference < 0) {
                return "Tip: Review recurring expenses like subscriptions or consider negotiating bills to reduce monthly costs.";
              } else if (category === 'wants' && difference < 0) {
                return "Tip: Try implementing a 24-hour rule before making non-essential purchases to reduce impulse buying.";
              } else if (category === 'savings' && difference < 0) {
                return "Tip: Set up automatic transfers to a savings account on payday to ensure you pay yourself first.";
              }
              
              return "";
            };

            const insight = getCategoryInsight(category);
            const tip = getCategoryTip(category);

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
                      <Typography variant="body2" sx={{ ml: 'auto', color: 'text.secondary', fontWeight: 500 }}>
                        {preferences.ratios[category as keyof typeof preferences.ratios]}% of Income
                      </Typography>
                    </Box>

                    {/* Category Description */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {categoryDescriptions[category as keyof typeof categoryDescriptions]}
                    </Typography>

                    {/* Amount Display */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {formatCurrency(actualAmount)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        <Tooltip 
                          title={`This is the recommended amount (${preferences.ratios[category as keyof typeof preferences.ratios]}% of your income) that you should aim to spend in this category based on your budget plan.`}
                          placement="top"
                          arrow
                        >
                          <span style={{ cursor: 'help' }}>Target ({preferences.ratios[category as keyof typeof preferences.ratios]}%):</span>
                        </Tooltip> {formatCurrency(targetAmount)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          <Tooltip 
                            title={category === 'savings' 
                              ? "The difference between your actual savings and the target amount. A positive number means you're saving more than recommended (good), while a negative means you're saving less than recommended (needs attention)."
                              : category === 'wants'
                                ? "The difference between your actual spending and the target amount for 'wants'. Ideally, you should be within $100 of your target (On-Target). If positive, you're overspending on wants and might consider shifting some to essentials or savings."
                                : "The difference between your actual spending and the target amount. A positive number means you're spending more than your budget (needs attention), while a negative means you're spending less than your budget (good)."
                            }
                            placement="top"
                            arrow
                          >
                            <span style={{ cursor: 'help' }}>Difference:</span>
                          </Tooltip>
                        </Typography>
                        <Chip
                          size="small"
                          label={`${difference >= 0 ? '+' : ''}${formatCurrency(difference)}`}
                          color={category === 'savings' 
                            ? (difference > 100 ? 'success' : (difference >= -100 ? 'success' : 'error')) 
                            : category === 'wants'
                              ? (Math.abs(difference) <= 100 ? 'success' : (difference > 0 ? 'error' : 'warning'))
                              : (difference > 0 ? 'error' : 'success')}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Box>

                    {/* Progress Section */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Budget Usage
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600, 
                            color: category === 'wants' && difference > 1000 
                              ? 'warning.main' 
                              : category === 'savings' 
                                ? (difference > 100 ? 'success' : (difference >= -100 ? 'success' : 'error'))
                                : `${status}.main`
                          }}
                        >
                          {formatPercentage(progress)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(progress, 100)}
                        color={category === 'wants' && difference > 1000 
                          ? 'warning' 
                          : category === 'savings' 
                            ? (difference > 100 ? 'success' : (difference >= -100 ? 'success' : 'error'))
                            : status}
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
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: category === 'wants' && difference > 1000 
                              ? 'warning.main'
                              : category === 'wants' && difference < 0
                                ? 'warning.main'
                              : category === 'wants' && Math.abs(difference) <= 100
                                ? 'success.main'
                              : category === 'savings' && difference > 100
                                ? 'success.main'
                              : category === 'savings' && difference >= -100
                                ? 'success.main'
                              : category === 'savings' && difference < -100
                                ? 'error.main'
                              : `${status}.main`, 
                            fontWeight: 500 
                          }}
                        >
                          {category === 'wants' && Math.abs(difference) <= 100
                            ? '✅ On-Target'
                            : category === 'wants' && difference > 100
                              ? '⚠️ Over-Allocated'
                              : category === 'wants' && difference < -100
                                ? '⚠️ Under-Allocated'
                              : category === 'savings' && difference > 100
                                ? '✅ Exceeding Goal'
                              : category === 'savings' && difference >= -100
                                ? '✅ On-Track'
                              : category === 'savings' && difference < -100
                                ? '⚠️ Need to Save More'
                              : progress > 100 
                                ? '⚠️ Over Budget' 
                                : progress > 90 
                                  ? '⚡ Near Limit' 
                                  : '✅ On Track'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Insights Section */}
                    {categoryTotals.income > 0 && (
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 1, 
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(66, 66, 66, 0.2)' : 'rgba(240, 240, 240, 0.5)',
                        border: '1px dashed',
                        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                      }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: category === 'wants' && difference > 1000 
                              ? 'warning.main'
                              : category === 'wants' && difference < 0
                                ? 'warning.main'
                              : category === 'savings' && difference > 100
                                ? 'success.main'
                              : category === 'savings' && difference >= -100
                                ? 'success.main'
                              : category === 'savings' && difference < -100
                                ? 'error.main'
                              : progress > 100
                                ? 'error.main'
                                : progress > 90
                                  ? 'warning.main'
                                  : 'success.main',
                            fontWeight: 500, 
                            mb: 0.5 
                          }}
                        >
                          {/* Custom messages for each situation */}
                          {category === 'wants' && Math.abs(difference) <= 100 ? (
                            `Your 'wants' spending is on target at ${formatCurrency(actualAmount)}, which is within $100 of your recommended budget.`
                          ) : category === 'wants' && difference > 100 ? (
                            `You're spending ${formatCurrency(Math.abs(difference))} more than recommended on wants. Consider shifting some to essentials or savings.`
                          ) : category === 'wants' && difference < -100 ? (
                            `You're spending ${formatCurrency(Math.abs(difference))} less than recommended on wants. Consider allocating more to enjoy life.`
                          ) : category === 'savings' && difference > 100 ? (
                            `Excellent! You're ${formatCurrency(Math.abs(difference))} above your savings target. This strengthens your financial security.`
                          ) : category === 'savings' && difference >= -100 ? (
                            `You're on track with your savings goal, within $100 of your target amount.`
                          ) : category === 'savings' && difference < -100 ? (
                            `You're saving ${formatCurrency(Math.abs(difference))} less than recommended. Try to increase your savings rate.`
                          ) : progress > 100 ? (
                            `You're ${formatCurrency(Math.abs(difference))} over your ${category} budget. Consider adjusting your spending in this category.`
                          ) : progress > 90 ? (
                            `You're approaching your ${category} budget limit. Monitor your spending closely.`
                          ) : difference < 0 ? (
                            `You're spending more than recommended on ${category}. Consider reviewing your expenses.`
                          ) : (
                            `You're on track with your ${category} budget with ${formatCurrency(difference)} remaining.`
                          )}
                        </Typography>
                        
                        {/* Display tips based on budget status - simplified conditions */}
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                          {category === 'wants' && Math.abs(difference) <= 100 ? (
                            "Tip: You've achieved a good balance with your 'wants' spending. Continue monitoring to maintain this healthy balance."
                          ) : category === 'wants' && difference > 100 ? (
                            "Tip: Consider reducing discretionary spending and redirecting those funds to essentials or boosting your savings."
                          ) : category === 'wants' && difference < -100 ? (
                            "Tip: Consider reducing your essentials or using some of your savings to enjoy life more. Balance is important for long-term financial wellness."
                          ) : category === 'savings' && difference > 100 ? (
                            "Tip: Great job saving extra! If desired, you could allocate some of this excess towards your 'wants' category as a reward for good financial habits."
                          ) : category === 'savings' && difference >= -100 ? (
                            "Tip: You're doing well with your savings. Maintain this habit to build financial security over time."
                          ) : category === 'savings' && difference < -100 ? (
                            "Tip: Consider setting up automatic transfers to your savings account when you receive income to make saving easier."
                          ) : progress > 100 ? (
                            category === 'essentials'
                              ? "Tip: Review recurring bills and look for potential savings on utilities, groceries, or insurance."
                              : "Tip: Consider delaying non-essential purchases until next month or finding less expensive alternatives."
                          ) : progress > 90 ? (
                            category === 'essentials'
                              ? "Tip: Be careful with any additional essential expenses this month to avoid going over budget."
                              : category === 'wants'
                                ? "Tip: Be mindful of any additional discretionary spending this month."
                                : "Tip: Monitor your savings rate closely for the rest of the month."
                          ) : (
                            category === 'essentials'
                              ? "Tip: Keep tracking essential expenses and look for long-term savings through better rates or eliminating unused subscriptions."
                              : category === 'wants'
                                ? "Tip: Plan purchases in advance and set spending limits for entertainment and discretionary items."
                                : "Tip: Consider increasing automatic transfers to savings if you consistently meet your budget goals."
                          )}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
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