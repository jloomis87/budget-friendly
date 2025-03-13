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
  useTheme,
  LinearProgress,
  Chip,
  Stack,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Tooltip,
  Icon
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

  // Calculate progress percentages for visual indicators
  const getProgressColor = (actual: number, recommended: number) => {
    const ratio = actual / recommended;
    if (ratio <= 1.05) return 'success.main'; // Within 5% of recommendation
    if (ratio <= 1.2) return 'warning.main';  // Within 20% of recommendation
    return 'error.main';                      // More than 20% over recommendation
  };

  // Helper to get category icon
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Essentials':
        return '🏠';
      case 'Wants':
        return '🛍️';
      case 'Savings':
        return '💰';
      default:
        return '📊';
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          fontWeight: 700, 
          color: 'primary.dark',
          mb: 3,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -8,
            left: 0,
            width: 60,
            height: 4,
            borderRadius: 2,
            backgroundColor: 'primary.main'
          }
        }}
      >
        Budget Summary
      </Typography>

      <Grid container spacing={3}>
        {/* Top Summary Cards */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card 
                elevation={2} 
                sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.light', mr: 1.5 }}>💵</Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Total Income
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: 'success.main',
                      mb: 1
                    }}
                  >
                    {formatCurrency(summary.totalIncome)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card 
                elevation={2} 
                sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'error.light', mr: 1.5 }}>💸</Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Total Expenses
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: 'error.main',
                      mb: 1
                    }}
                  >
                    {formatCurrency(summary.totalExpenses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card 
                elevation={2} 
                sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  },
                  bgcolor: summary.netCashflow >= 0 ? 'success.light' : 'error.light',
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: summary.netCashflow >= 0 ? 'success.main' : 'error.main',
                        color: 'white',
                        mr: 1.5 
                      }}
                    >
                      {summary.netCashflow >= 0 ? '✓' : '!'}
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: summary.netCashflow >= 0 ? 'success.dark' : 'error.dark' }}>
                      Net Cashflow
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: summary.netCashflow >= 0 ? 'success.dark' : 'error.dark',
                      mb: 1
                    }}
                  >
                    {formatCurrency(summary.netCashflow)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Expense Categories */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={2} 
            sx={{ 
              height: '100%',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <CardHeader
              title="Expense Categories"
              titleTypographyProps={{ 
                variant: 'h6', 
                fontWeight: 600,
                color: 'text.primary'
              }}
              sx={{ 
                bgcolor: 'background.default',
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1.5
              }}
            />
            <CardContent sx={{ p: 0 }}>
              <List sx={{ width: '100%' }}>
                {[
                  { 
                    name: 'Essentials', 
                    amount: summary.categories.essentials, 
                    percentage: summary.percentages.essentials,
                    color: 'primary.main',
                    icon: '🏠'
                  },
                  { 
                    name: 'Wants', 
                    amount: summary.categories.wants, 
                    percentage: summary.percentages.wants,
                    color: 'secondary.main',
                    icon: '🛍️'
                  },
                  { 
                    name: 'Savings', 
                    amount: summary.categories.savings, 
                    percentage: summary.percentages.savings,
                    color: 'success.main',
                    icon: '💰'
                  }
                ].map((category, index) => (
                  <React.Fragment key={category.name}>
                    <ListItem sx={{ px: 3, py: 2 }}>
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              mr: 1.5, 
                              bgcolor: 'transparent',
                              fontSize: '1.2rem'
                            }}
                          >
                            {category.icon}
                          </Avatar>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {category.name}
                          </Typography>
                          <Box sx={{ flexGrow: 1 }} />
                          <Chip 
                            label={formatPercentage(category.percentage)} 
                            size="small"
                            sx={{ 
                              bgcolor: `${category.color}20`, 
                              color: category.color,
                              fontWeight: 600
                            }} 
                          />
                        </Box>
                        
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700, 
                            color: category.color,
                            mb: 1
                          }}
                        >
                          {formatCurrency(category.amount)}
                        </Typography>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(category.percentage, 100)} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: `${category.color}20`,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: category.color
                            }
                          }} 
                        />
                      </Box>
                    </ListItem>
                    {index < 2 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={2} 
            sx={{ 
              height: '100%',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <CardHeader
              title="Spending Distribution"
              titleTypographyProps={{ 
                variant: 'h6', 
                fontWeight: 600,
                color: 'text.primary'
              }}
              sx={{ 
                bgcolor: 'background.default',
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1.5
              }}
            />
            <CardContent sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              p: 3
            }}>
              <Box sx={{ width: '100%', height: 250, display: 'flex', justifyContent: 'center' }}>
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
            </CardContent>
          </Card>
        </Grid>

        {/* 50/30/20 Plan */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={2} 
            sx={{ 
              height: '100%',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <CardHeader
              title="Budget Health"
              titleTypographyProps={{ 
                variant: 'h6', 
                fontWeight: 600,
                color: 'text.primary'
              }}
              sx={{ 
                bgcolor: 'background.default',
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1.5
              }}
            />
            <CardContent sx={{ p: 0 }}>
              <List sx={{ width: '100%' }}>
                {[
                  { 
                    name: 'Essentials', 
                    target: '50%',
                    recommended: plan.recommended.essentials,
                    actual: plan.actual.essentials,
                    icon: '🏠'
                  },
                  { 
                    name: 'Wants', 
                    target: '30%',
                    recommended: plan.recommended.wants,
                    actual: plan.actual.wants,
                    icon: '🛍️'
                  },
                  { 
                    name: 'Savings', 
                    target: '20%',
                    recommended: plan.recommended.savings,
                    actual: plan.actual.savings,
                    icon: '💰'
                  }
                ].map((category, index) => {
                  const progressColor = getProgressColor(category.actual, category.recommended);
                  const progressPercentage = Math.min((category.actual / category.recommended) * 100, 150);
                  
                  return (
                    <React.Fragment key={category.name}>
                      <ListItem sx={{ px: 3, py: 2 }}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Avatar 
                              sx={{ 
                                width: 32, 
                                height: 32, 
                                mr: 1.5, 
                                bgcolor: 'transparent',
                                fontSize: '1.2rem'
                              }}
                            >
                              {category.icon}
                            </Avatar>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {category.name} <span style={{ fontWeight: 400, fontSize: '0.9rem' }}>({category.target})</span>
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Tooltip title="Recommended amount">
                              <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                Target: {formatCurrency(category.recommended)}
                              </Typography>
                            </Tooltip>
                            <Tooltip title="Your actual spending">
                              <Typography variant="body2" sx={{ color: progressColor, fontWeight: 600 }}>
                                Actual: {formatCurrency(category.actual)}
                              </Typography>
                            </Tooltip>
                          </Box>
                          
                          <Box sx={{ position: 'relative', pt: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={progressPercentage} 
                              sx={{ 
                                height: 10, 
                                borderRadius: 5,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: progressColor
                                }
                              }} 
                            />
                            <Box 
                              sx={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: '100%', 
                                height: '100%', 
                                borderLeft: '2px dashed',
                                borderColor: 'primary.main',
                                zIndex: 2
                              }} 
                            />
                          </Box>
                        </Box>
                      </ListItem>
                      {index < 2 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 50/30/20 Chart */}
        <Grid item xs={12}>
          <Card 
            elevation={2} 
            sx={{ 
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <CardHeader
              title="50/30/20 Budget Comparison"
              titleTypographyProps={{ 
                variant: 'h6', 
                fontWeight: 600,
                color: 'text.primary'
              }}
              sx={{ 
                bgcolor: 'background.default',
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1.5
              }}
            />
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ 
                height: 400, 
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
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
            </CardContent>
          </Card>
        </Grid>

        {/* Budget Suggestions */}
        <Grid item xs={12}>
          <Card 
            elevation={2} 
            sx={{ 
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'info.light',
              border: '1px solid',
              borderColor: 'info.main',
              boxShadow: `0 0 20px ${theme.palette.info.light}`
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'info.main' }}>💡</Avatar>
              }
              title="Budget Suggestions"
              titleTypographyProps={{ 
                variant: 'h6', 
                fontWeight: 600,
                color: 'info.dark'
              }}
              sx={{ 
                borderBottom: '1px solid',
                borderColor: 'info.main',
                pb: 1.5
              }}
            />
            <CardContent sx={{ p: 0 }}>
              <List>
                {suggestions.map((suggestion, index) => (
                  <ListItem key={index} sx={{ 
                    py: 1.5,
                    px: 3,
                    borderBottom: index < suggestions.length - 1 ? '1px solid' : 'none',
                    borderColor: 'info.main',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)'
                    }
                  }}>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box component="span" sx={{ mr: 1, fontSize: '1.2rem' }}>•</Box>
                          <Typography variant="body1" sx={{ color: 'info.dark', fontWeight: 500 }}>
                            {suggestion}
                          </Typography>
                        </Box>
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 