import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  LinearProgress,
  Card,
  CardContent,
  Tooltip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
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
import { InfoOutlined } from '@mui/icons-material';
import type { Transaction } from '../services/fileParser';
import type { BudgetSummary, BudgetPlan } from '../services/budgetCalculator';
import type { BudgetPreferences } from './BudgetActions';

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

interface BudgetAnalyticsProps {
  transactions: Transaction[];
  summary: BudgetSummary;
  plan: BudgetPlan;
  preferences: BudgetPreferences;
  selectedMonths: string[];
}

interface MonthlyTrend {
  month: string;
  essentials: number;
  wants: number;
  savings: number;
  income: number;
}

interface BudgetHealthMetrics {
  adherenceScore: number;
  savingsScore: number;
  debtScore: number;
  emergencyFundScore: number;
  totalScore: number;
  recommendations: string[];
}

export const BudgetAnalytics: React.FC<BudgetAnalyticsProps> = ({
  transactions,
  summary,
  plan,
  preferences,
  selectedMonths,
}) => {
  // Calculate monthly trends
  const calculateMonthlyTrends = (): MonthlyTrend[] => {
    const monthlyData: { [key: string]: MonthlyTrend } = {};

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
    transactions.forEach(transaction => {
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

  // Calculate budget health metrics
  const calculateBudgetHealth = (): BudgetHealthMetrics => {
    const metrics = {
      adherenceScore: 0,
      savingsScore: 0,
      debtScore: 0,
      emergencyFundScore: 0,
      totalScore: 0,
      recommendations: [],
    };

    // Calculate adherence score (how well spending matches the planned ratios)
    const actualRatios = {
      essentials: (summary.categories.essentials / summary.totalIncome) * 100,
      wants: (summary.categories.wants / summary.totalIncome) * 100,
      savings: (summary.categories.savings / summary.totalIncome) * 100,
    };

    const ratioDeviation = {
      essentials: Math.abs(actualRatios.essentials - preferences.ratios.essentials),
      wants: Math.abs(actualRatios.wants - preferences.ratios.wants),
      savings: Math.abs(actualRatios.savings - preferences.ratios.savings),
    };

    // Score based on how close to target ratios (max 40 points)
    metrics.adherenceScore = Math.max(0, 40 - (
      ratioDeviation.essentials + ratioDeviation.wants + ratioDeviation.savings
    ));

    // Calculate savings score (max 30 points)
    const savingsRate = (summary.categories.savings / summary.totalIncome) * 100;
    metrics.savingsScore = Math.min(30, (savingsRate / preferences.ratios.savings) * 30);

    // Simplified debt and emergency fund scores for now (placeholder logic)
    metrics.debtScore = 15; // Placeholder
    metrics.emergencyFundScore = 15; // Placeholder

    // Calculate total score
    metrics.totalScore = Math.round(
      metrics.adherenceScore +
      metrics.savingsScore +
      metrics.debtScore +
      metrics.emergencyFundScore
    );

    // Generate recommendations
    if (metrics.adherenceScore < 30) {
      metrics.recommendations.push(
        "Your spending ratios deviate significantly from your targets. Consider reviewing your essential expenses."
      );
    }
    if (metrics.savingsScore < 20) {
      metrics.recommendations.push(
        "Your savings rate is below target. Try to identify areas where you can reduce discretionary spending."
      );
    }

    return metrics;
  };

  const monthlyTrends = calculateMonthlyTrends();
  const healthMetrics = calculateBudgetHealth();

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
        display: true,
        text: 'Monthly Spending Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          },
        },
      },
    },
  };

  return (
    <Grid container spacing={3}>
      {/* Historical Trends Chart */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, height: '400px' }}>
          <Line data={trendChartData} options={chartOptions} />
        </Paper>
      </Grid>

      {/* Budget Health Score */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="div">
                Budget Health Score
              </Typography>
              <Tooltip title="Score based on budget adherence, savings rate, debt management, and emergency fund status">
                <IconButton size="small">
                  <InfoOutlined />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ position: 'relative', mb: 4 }}>
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <Typography variant="h3" color="primary">
                  {healthMetrics.totalScore}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  out of 100
                </Typography>
              </Box>
              <Box sx={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
                <CircularProgressWithLabel value={healthMetrics.totalScore} />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Score Breakdown */}
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Budget Adherence" 
                  secondary={`${Math.round(healthMetrics.adherenceScore)}/40`} 
                />
                <LinearProgress 
                  variant="determinate" 
                  value={(healthMetrics.adherenceScore / 40) * 100} 
                  sx={{ width: '100px', ml: 2 }} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Savings Rate" 
                  secondary={`${Math.round(healthMetrics.savingsScore)}/30`} 
                />
                <LinearProgress 
                  variant="determinate" 
                  value={(healthMetrics.savingsScore / 30) * 100} 
                  sx={{ width: '100px', ml: 2 }} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Debt Management" 
                  secondary={`${Math.round(healthMetrics.debtScore)}/15`} 
                />
                <LinearProgress 
                  variant="determinate" 
                  value={(healthMetrics.debtScore / 15) * 100} 
                  sx={{ width: '100px', ml: 2 }} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Emergency Fund" 
                  secondary={`${Math.round(healthMetrics.emergencyFundScore)}/15`} 
                />
                <LinearProgress 
                  variant="determinate" 
                  value={(healthMetrics.emergencyFundScore / 15) * 100} 
                  sx={{ width: '100px', ml: 2 }} 
                />
              </ListItem>
            </List>

            {/* Recommendations */}
            {healthMetrics.recommendations.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Recommendations
                </Typography>
                <List dense>
                  {healthMetrics.recommendations.map((recommendation, index) => (
                    <ListItem key={index}>
                      <ListItemText 
                        primary={recommendation}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Helper component for circular progress
const CircularProgressWithLabel: React.FC<{ value: number }> = ({ value }) => {
  const circleSize = 200;
  const strokeWidth = 8;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <svg width={circleSize} height={circleSize}>
      {/* Background circle */}
      <circle
        cx={circleSize / 2}
        cy={circleSize / 2}
        r={radius}
        fill="none"
        stroke="#e0e0e0"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={circleSize / 2}
        cy={circleSize / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
          transition: 'stroke-dashoffset 0.5s ease',
        }}
      />
    </svg>
  );
}; 