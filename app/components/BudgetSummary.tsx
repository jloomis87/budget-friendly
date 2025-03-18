import React, { useEffect, useState } from 'react';
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

// Lazy load Chart.js components to avoid SSR issues
const LazyCharts = React.lazy(() => import('./LazyCharts'));

interface BudgetSummaryProps {
  summary: BudgetSummaryType;
  plan: BudgetPlan;
  suggestions: string[];
  preferences: BudgetPreferences;
  transactions: Transaction[];
  selectedMonths: string[];
}

export function BudgetSummary({ summary, plan, suggestions, preferences, transactions, selectedMonths }: BudgetSummaryProps) {
  const theme = useMuiTheme();
  const { mode } = useCustomTheme();
  const [isBrowser, setIsBrowser] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const isDarkMode = mode === 'dark';
  const [goals, setGoals] = useState<FinancialGoal[]>([]);

  // Only render charts on the client side
  useEffect(() => {
    setIsBrowser(true);
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

  // Prepare data for pie chart using custom preferences
  const pieChartData = {
    labels: Object.values(preferences.categoryCustomization).map(cat => cat.name),
    datasets: [
      {
        data: [
          summary.categories.essentials,
          summary.categories.wants,
          summary.categories.savings
        ],
        backgroundColor: Object.values(preferences.categoryCustomization).map(cat => cat.color),
        borderColor: Object.values(preferences.categoryCustomization).map(cat => cat.color),
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for comparison bar chart using custom preferences
  const barChartData = {
    labels: Object.values(preferences.categoryCustomization).map(cat => cat.name),
    datasets: [
      {
        label: 'Recommended',
        data: [
          (preferences.ratios.essentials / 100) * summary.totalIncome,
          (preferences.ratios.wants / 100) * summary.totalIncome,
          (preferences.ratios.savings / 100) * summary.totalIncome
        ],
        backgroundColor: theme.palette.primary.main,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.palette.primary.dark,
        barThickness: 40,
        maxBarThickness: 60,
      },
      {
        label: 'Actual Spending',
        data: [
          summary.categories.essentials,
          summary.categories.wants,
          summary.categories.savings
        ],
        backgroundColor: theme.palette.warning.main,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.palette.warning.dark,
        barThickness: 40,
        maxBarThickness: 60,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        right: 25,
        bottom: 20,
        left: 15
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme.palette.divider,
          drawBorder: false,
        },
        ticks: {
          callback: (value: number) => formatCurrency(value),
          font: {
            size: 13
          },
          maxTicksLimit: 8,
          color: theme.palette.text.secondary,
          padding: 10
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          font: {
            size: 14,
            weight: 'bold'
          },
          color: theme.palette.text.primary,
          padding: 10
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Budget Comparison',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
        },
        color: theme.palette.text.primary
      },
      legend: {
        position: 'top',
        align: 'center',
        labels: {
          boxWidth: 15,
          padding: 20,
          font: {
            size: 14
          },
          usePointStyle: true,
          pointStyle: 'circle',
          color: theme.palette.text.primary
        }
      },
      tooltip: {
        titleFont: {
          size: 16
        },
        bodyFont: {
          size: 14
        },
        padding: 12,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
  };

  // Calculate progress percentages for visual indicators
  const getProgressColor = (actual: number, recommended: number) => {
    const ratio = actual / recommended;
    if (ratio <= 1.05) return 'success.main'; // Within 5% of recommendation
    if (ratio <= 1.2) return 'warning.main';  // Within 20% of recommendation
    return 'error.main';                      // More than 20% over recommendation
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
          {/* Summary Cards */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {Object.entries(preferences.categoryCustomization).map(([category, settings], index) => {
                const actualAmount = summary.categories[category as keyof typeof summary.categories];
                const recommendedAmount = (preferences.ratios[category as keyof typeof preferences.ratios] / 100) * summary.totalIncome;
                const difference = actualAmount - recommendedAmount;
                const percentageOfIncome = (actualAmount / summary.totalIncome) * 100;

                return (
                  <Grid item xs={12} md={4} key={category}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        borderLeft: 4,
                        borderColor: settings.color,
                        position: 'relative',
                        overflow: 'visible'
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{settings.icon}</span>
                            {settings.name}
                          </Typography>
                        </Box>

                        {preferences.displayPreferences.showActualAmounts && (
                          <Typography variant="h5" color="text.primary" gutterBottom>
                            {formatCurrency(actualAmount)}
                          </Typography>
                        )}

                        {preferences.displayPreferences.showPercentages && (
                          <Typography variant="body2" color="text.secondary">
                            {formatPercentage(percentageOfIncome)} of income
                          </Typography>
                        )}

                        {preferences.displayPreferences.showDifferences && (
                          <Typography 
                            variant="body2" 
                            color={difference > 0 ? 'error.main' : 'success.main'}
                            sx={{ mt: 1 }}
                          >
                            {difference > 0 ? 'Over by ' : 'Under by '}
                            {formatCurrency(Math.abs(difference))}
                          </Typography>
                        )}

                        {preferences.displayPreferences.showProgressBars && (
                          <Box sx={{ mt: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min((actualAmount / recommendedAmount) * 100, 100)}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: theme.palette.grey[200],
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getProgressColor(actualAmount, recommendedAmount),
                                },
                              }}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          {/* Charts */}
          {isBrowser && (
            <React.Suspense fallback={<Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading charts...</Box>}>
              <Grid item xs={12} container spacing={3}>
                {preferences.chartPreferences.showPieChart && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                      <LazyCharts 
                        pieData={pieChartData}
                        barData={barChartData}
                        barOptions={barChartOptions}
                        showPie={true}
                        showBar={false}
                      />
                    </Paper>
                  </Grid>
                )}

                {preferences.chartPreferences.showBarChart && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                      <LazyCharts 
                        pieData={pieChartData}
                        barData={barChartData}
                        barOptions={barChartOptions}
                        showPie={false}
                        showBar={true}
                      />
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </React.Suspense>
          )}

          {/* Suggestions */}
          {preferences.chartPreferences.showSuggestions && suggestions.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>Suggestions to Optimize Your Budget</AlertTitle>
                <List dense>
                  {suggestions.map((suggestion, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={suggestion} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Analytics Tab */}
      {activeTab === 1 && (
        <BudgetAnalytics
          transactions={transactions}
          summary={summary}
          plan={plan}
          preferences={preferences}
          selectedMonths={selectedMonths}
        />
      )}

      {/* Insights & Goals Tab */}
      {activeTab === 2 && (
        <SmartInsights
          transactions={transactions}
          selectedMonths={selectedMonths}
          totalIncome={summary.totalIncome}
          onGoalUpdate={setGoals}
        />
      )}

      {activeTab === 3 && (
        <CategoryDeepDive 
          transactions={transactions}
          selectedMonths={selectedMonths}
        />
      )}
    </Box>
  );
} 