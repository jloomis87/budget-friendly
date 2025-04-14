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
import { FinancialGoals } from './FinancialGoals';
import { CategoryDeepDive } from './CategoryDeepDive';
import type { Transaction } from '../services/fileParser';
import type { FinancialGoal } from '../services/goalService';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

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

  // Calculate monthly trends for the chart
  const calculateMonthlyTrends = () => {
    const monthlyData: { [key: string]: { month: string; essentials: number; wants: number; savings: number; income: number } } = {};

    // Initialize monthly data for selected months
    selectedMonths.forEach(month => {
      monthlyData[month] = {
        month,
        essentials: 0,
        wants: 0,
        savings: 0,
        income: 0,
      };
    });

    // Aggregate transactions by month and category
    monthlyTransactions.forEach(transaction => {
      const month = new Date(transaction.date).toLocaleString('default', { month: 'long' });
      if (monthlyData[month]) {
        if (transaction.amount > 0) {
          monthlyData[month].income += transaction.amount;
        } else {
          const amount = Math.abs(transaction.amount);
          switch (transaction.category) {
            case 'Essentials':
              monthlyData[month].essentials += amount;
              break;
            case 'Wants':
              monthlyData[month].wants += amount;
              break;
            case 'Savings':
              monthlyData[month].savings += amount;
              break;
          }
        }
      }
    });

    return Object.values(monthlyData);
  };

  // Prepare chart data
  const monthlyTrends = calculateMonthlyTrends();
  
  // Prepare data for the trends chart
  const trendChartData = {
    labels: monthlyTrends.map(data => data.month),
    datasets: [
      {
        label: preferences.categoryCustomization.essentials.name,
        data: monthlyTrends.map(data => data.essentials),
        borderColor: preferences.categoryCustomization.essentials.color,
        backgroundColor: `${preferences.categoryCustomization.essentials.color}33`,
        fill: true,
        tension: 0.4,
      },
      {
        label: preferences.categoryCustomization.wants.name,
        data: monthlyTrends.map(data => data.wants),
        borderColor: preferences.categoryCustomization.wants.color,
        backgroundColor: `${preferences.categoryCustomization.wants.color}33`,
        fill: true,
        tension: 0.4,
      },
      {
        label: preferences.categoryCustomization.savings.name,
        data: monthlyTrends.map(data => data.savings),
        borderColor: preferences.categoryCustomization.savings.color,
        backgroundColor: `${preferences.categoryCustomization.savings.color}33`,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(tickValue: number | string) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(Number(tickValue));
          },
        },
      },
    },
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
          <Tab label="Goals" />
          <Tab label="Deep Dive" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Income Summary */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Income
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  {formatCurrency(categoryTotals.income)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedMonths.length > 1 
                    ? `Average across ${selectedMonths.length} months` 
                    : selectedMonths.length === 1 
                      ? `Income for ${selectedMonths[0]}` 
                      : 'No months selected'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Category Cards */}
          {['essentials', 'wants', 'savings'].map((category) => {
            const customCategory = preferences.categoryCustomization[category as keyof typeof preferences.categoryCustomization];
            const actual = categoryTotals[category as keyof typeof categoryTotals];
            const target = plan.recommended[category as keyof typeof plan.recommended];
            const difference = target - actual;
            const { progress, status } = calculateProgress(actual, target);

            return (
              <Grid item xs={12} md={4} key={category}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: customCategory.color,
                            mr: 1,
                            width: 32,
                            height: 32,
                            fontSize: '0.875rem'
                          }}
                        >
                          {customCategory.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="h6">
                          {customCategory.name}
                        </Typography>
                      </Box>
                      <Chip 
                        label={formatPercentage((plan.recommended[category as keyof typeof plan.recommended] / plan.income) * 100)} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                      <Typography variant="h5" component="div">
                        {formatCurrency(actual)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        {showActualAmounts && `of ${formatCurrency(target)}`}
                      </Typography>
                    </Box>

                    {showProgressBars && (
                      <Box sx={{ mb: 2 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(target > 0 ? (actual / target) * 100 : 0, 100)} 
                          color={status}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {target > 0 
                              ? formatPercentage((actual / target) * 100)
                              : '0.0%'}
                          </Typography>
                          {showDifferences && (
                            <Typography 
                              variant="body2" 
                              color={difference > 0 ? 'success.main' : difference < 0 ? 'error.main' : 'text.secondary'}
                            >
                              {difference > 0 
                                ? `${formatCurrency(difference)} under` 
                                : difference < 0 
                                  ? `${formatCurrency(Math.abs(difference))} over` 
                                  : 'On target'}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Smart tip based on spending pattern */}
                    {filteredTransactions.length > 0 && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {category === 'essentials' && difference > 100 ? (
                            "Tip: You're staying under your essentials budget. Consider increasing your savings or fun spending with the extra funds."
                          ) : category === 'essentials' && difference < -100 ? (
                            "Tip: Your essential expenses are over budget. Look for ways to reduce recurring bills or necessary expenses."
                          ) : category === 'wants' && difference > 100 ? (
                            "Tip: You're spending less than budgeted on wants. This is great if you're saving for a goal, or you could treat yourself a bit more."
                          ) : category === 'wants' && difference < -100 ? (
                            "Tip: Consider reducing your discretionary spending to stay within your budget. Try setting spending limits for entertainment and shopping."
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

          {/* Monthly Spending Trends Chart */}
          <Grid item xs={12} sx={{ mt: 3 }}>
            <Card>
              <CardContent sx={{ height: '400px', p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Monthly Spending Trends
                </Typography>
                <Box sx={{ height: 'calc(100% - 30px)' }}>
                  <Line data={trendChartData} options={chartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Goals Tab */}
      {activeTab === 1 && (
        <FinancialGoals
          transactions={monthlyTransactions}
          selectedMonths={selectedMonths}
          totalIncome={categoryTotals.income}
        />
      )}

      {/* Deep Dive Tab */}
      {activeTab === 2 && (
        <CategoryDeepDive
          transactions={monthlyTransactions}
          selectedMonths={selectedMonths}
        />
      )}
    </Box>
  );
} 