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
  useTheme
} from '@mui/material';
import type { BudgetSummary as BudgetSummaryType, BudgetPlan } from '../services/budgetCalculator';

// Lazy load Chart.js components to avoid SSR issues
const LazyCharts = React.lazy(() => import('./LazyCharts'));

interface BudgetSummaryProps {
  summary: BudgetSummaryType;
  plan: BudgetPlan;
  suggestions: string[];
}

export function BudgetSummary({ summary, plan, suggestions }: BudgetSummaryProps) {
  const theme = useTheme();
  const [isBrowser, setIsBrowser] = useState(false);

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

  // Prepare data for pie chart
  const pieChartData = {
    labels: ['Essentials', 'Wants', 'Savings'],
    datasets: [
      {
        data: [
          summary.categories.essentials,
          summary.categories.wants,
          summary.categories.savings
        ],
        backgroundColor: [
          theme.palette.primary.main,
          theme.palette.secondary.main,
          theme.palette.success.main
        ],
        borderColor: [
          theme.palette.primary.dark,
          theme.palette.secondary.dark,
          theme.palette.success.dark
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for comparison bar chart
  const barChartData = {
    labels: ['Essentials', 'Wants', 'Savings'],
    datasets: [
      {
        label: 'Recommended (50/30/20)',
        data: [
          plan.recommended.essentials,
          plan.recommended.wants,
          plan.recommended.savings
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
          plan.actual.essentials,
          plan.actual.wants,
          plan.actual.savings
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
        text: '50/30/20 Budget Comparison',
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
          pointStyle: 'circle'
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

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Budget Summary
      </Typography>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Income & Expenses
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Total Income" 
                  secondary={formatCurrency(summary.totalIncome)} 
                  secondaryTypographyProps={{ color: 'success.main', fontWeight: 'bold' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Total Expenses" 
                  secondary={formatCurrency(summary.totalExpenses)} 
                  secondaryTypographyProps={{ color: 'error.main', fontWeight: 'bold' }}
                />
              </ListItem>
              <Divider sx={{ my: 1 }} />
              <ListItem>
                <ListItemText 
                  primary="Net Cashflow" 
                  secondary={formatCurrency(summary.netCashflow)} 
                  secondaryTypographyProps={{ 
                    color: summary.netCashflow >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 'bold'
                  }}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Expense Categories */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Expense Categories
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Essentials" 
                  secondary={`${formatCurrency(summary.categories.essentials)} (${formatPercentage(summary.percentages.essentials)})`} 
                  secondaryTypographyProps={{ color: 'primary.main' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Wants" 
                  secondary={`${formatCurrency(summary.categories.wants)} (${formatPercentage(summary.percentages.wants)})`} 
                  secondaryTypographyProps={{ color: 'secondary.main' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Savings" 
                  secondary={`${formatCurrency(summary.categories.savings)} (${formatPercentage(summary.percentages.savings)})`} 
                  secondaryTypographyProps={{ color: 'success.main' }}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Spending Distribution
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 250, mt: 2 }}>
              {isBrowser && (
                <React.Suspense fallback={<Typography>Loading chart...</Typography>}>
                  <LazyCharts 
                    pieData={pieChartData} 
                    barData={barChartData} 
                    barOptions={barChartOptions} 
                    showPie={true}
                    showBar={false}
                    key={`pie-chart-instance-${Date.now()}`}
                  />
                </React.Suspense>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* 50/30/20 Plan */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              50/30/20 Budget Plan
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Box sx={{ 
                  height: 400, 
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: { xs: 3, md: 0 }
                }}>
                  {isBrowser && (
                    <React.Suspense fallback={<Typography>Loading chart...</Typography>}>
                      <LazyCharts 
                        pieData={pieChartData} 
                        barData={barChartData} 
                        barOptions={barChartOptions} 
                        showPie={false}
                        showBar={true}
                        key={`bar-chart-instance-${Date.now()}`}
                      />
                    </React.Suspense>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={5}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'background.paper', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                    Recommended vs. Actual
                  </Typography>
                  <List dense>
                    <ListItem sx={{ py: 1 }}>
                      <ListItemText 
                        primary={<Typography variant="body1" sx={{ fontWeight: 'medium' }}>Essentials (50%)</Typography>}
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Box component="span" sx={{ mr: 1 }}>Recommended:</Box>
                              <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{formatCurrency(plan.recommended.essentials)}</Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box component="span" sx={{ mr: 1 }}>Actual:</Box>
                              <Box component="span" sx={{ fontWeight: 'bold', color: 'warning.main' }}>{formatCurrency(plan.actual.essentials)}</Box>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ py: 1 }}>
                      <ListItemText 
                        primary={<Typography variant="body1" sx={{ fontWeight: 'medium' }}>Wants (30%)</Typography>}
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Box component="span" sx={{ mr: 1 }}>Recommended:</Box>
                              <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{formatCurrency(plan.recommended.wants)}</Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box component="span" sx={{ mr: 1 }}>Actual:</Box>
                              <Box component="span" sx={{ fontWeight: 'bold', color: 'warning.main' }}>{formatCurrency(plan.actual.wants)}</Box>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ py: 1 }}>
                      <ListItemText 
                        primary={<Typography variant="body1" sx={{ fontWeight: 'medium' }}>Savings (20%)</Typography>}
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Box component="span" sx={{ mr: 1 }}>Recommended:</Box>
                              <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{formatCurrency(plan.recommended.savings)}</Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box component="span" sx={{ mr: 1 }}>Actual:</Box>
                              <Box component="span" sx={{ fontWeight: 'bold', color: 'warning.main' }}>{formatCurrency(plan.actual.savings)}</Box>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  </List>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Budget Suggestions */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'info.dark' }}>
              Budget Suggestions
            </Typography>
            <List dense>
              {suggestions.map((suggestion, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemText primary={suggestion} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 