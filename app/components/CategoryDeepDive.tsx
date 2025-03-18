import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import type { Transaction } from '../services/fileParser';

interface CategoryDeepDiveProps {
  transactions: Transaction[];
  selectedMonths: string[];
}

interface MerchantAnalysis {
  name: string;
  totalSpent: number;
  transactionCount: number;
  averageAmount: number;
  lastTransaction: string;
}

interface CategoryAnalysis {
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  merchantCount: number;
  topMerchants: MerchantAnalysis[];
  spendingFrequency: { [key: string]: number };
  monthlyTrend: { [key: string]: number };
}

export const CategoryDeepDive: React.FC<CategoryDeepDiveProps> = ({
  transactions,
  selectedMonths,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | false>(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate category analysis
  const categoryAnalysis = useMemo(() => {
    const analysis: { [category: string]: CategoryAnalysis } = {};
    const categories = ['Essentials', 'Wants', 'Savings'];

    // Initialize analysis object
    categories.forEach(category => {
      analysis[category] = {
        totalSpent: 0,
        transactionCount: 0,
        averageTransaction: 0,
        merchantCount: 0,
        topMerchants: [],
        spendingFrequency: {},
        monthlyTrend: {},
      };
    });

    // Group transactions by category
    transactions.forEach(transaction => {
      if (!categories.includes(transaction.category)) return;

      const category = transaction.category;
      const month = new Date(transaction.date).toLocaleString('default', { month: 'long' });
      const amount = Math.abs(transaction.amount);
      const merchant = transaction.description;

      // Update basic metrics
      analysis[category].totalSpent += amount;
      analysis[category].transactionCount += 1;

      // Update monthly trends
      if (!analysis[category].monthlyTrend[month]) {
        analysis[category].monthlyTrend[month] = 0;
      }
      analysis[category].monthlyTrend[month] += amount;

      // Update merchant analysis
      const merchantIndex = analysis[category].topMerchants.findIndex(m => m.name === merchant);
      if (merchantIndex === -1) {
        analysis[category].topMerchants.push({
          name: merchant,
          totalSpent: amount,
          transactionCount: 1,
          averageAmount: amount,
          lastTransaction: transaction.date,
        });
      } else {
        const merchantData = analysis[category].topMerchants[merchantIndex];
        merchantData.totalSpent += amount;
        merchantData.transactionCount += 1;
        merchantData.averageAmount = merchantData.totalSpent / merchantData.transactionCount;
        if (new Date(transaction.date) > new Date(merchantData.lastTransaction)) {
          merchantData.lastTransaction = transaction.date;
        }
      }

      // Update spending frequency (day of week)
      const dayOfWeek = new Date(transaction.date).toLocaleString('default', { weekday: 'long' });
      analysis[category].spendingFrequency[dayOfWeek] = (analysis[category].spendingFrequency[dayOfWeek] || 0) + 1;
    });

    // Calculate averages and sort merchants
    categories.forEach(category => {
      analysis[category].averageTransaction = analysis[category].totalSpent / analysis[category].transactionCount || 0;
      analysis[category].merchantCount = analysis[category].topMerchants.length;

      // Sort merchants by total spent
      analysis[category].topMerchants.sort((a, b) => b.totalSpent - a.totalSpent);
      // Keep only top 5 merchants
      analysis[category].topMerchants = analysis[category].topMerchants.slice(0, 5);
    });

    return analysis;
  }, [transactions]);

  // Calculate month-over-month change
  const calculateMoMChange = (category: string) => {
    const monthlyData = categoryAnalysis[category].monthlyTrend;
    const months = Object.keys(monthlyData);
    if (months.length < 2) return null;

    const currentMonth = months[months.length - 1];
    const previousMonth = months[months.length - 2];
    const currentAmount = monthlyData[currentMonth];
    const previousAmount = monthlyData[previousMonth];

    return ((currentAmount - previousAmount) / previousAmount) * 100;
  };

  // Get spending pattern description
  const getSpendingPattern = (frequency: { [key: string]: number }) => {
    const days = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
    if (days.length === 0) return "No pattern detected";
    return `Most transactions occur on ${days[0][0]}s`;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Category Deep Dive
      </Typography>

      {Object.entries(categoryAnalysis).map(([category, analysis]) => (
        <Accordion
          key={category}
          expanded={expandedCategory === category}
          onChange={() => setExpandedCategory(expandedCategory === category ? false : category)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                {category}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(analysis.totalSpent)}
                </Typography>
                {calculateMoMChange(category) !== null && (
                  <Chip
                    icon={calculateMoMChange(category)! >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    label={`${Math.abs(calculateMoMChange(category)!).toFixed(1)}% MoM`}
                    color={calculateMoMChange(category)! >= 0 ? "success" : "error"}
                    size="small"
                  />
                )}
              </Box>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Key Metrics */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Total Transactions
                      </Typography>
                      <Typography variant="h6">
                        {analysis.transactionCount}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Average Transaction
                      </Typography>
                      <Typography variant="h6">
                        {formatCurrency(analysis.averageTransaction)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Unique Merchants
                      </Typography>
                      <Typography variant="h6">
                        {analysis.merchantCount}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Spending Pattern
                      </Typography>
                      <Typography variant="h6">
                        {getSpendingPattern(analysis.spendingFrequency)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Top Merchants */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Top Merchants
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Merchant</TableCell>
                        <TableCell align="right">Total Spent</TableCell>
                        <TableCell align="right">Transactions</TableCell>
                        <TableCell align="right">Average</TableCell>
                        <TableCell align="right">Last Transaction</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analysis.topMerchants.map((merchant) => (
                        <TableRow key={merchant.name}>
                          <TableCell>{merchant.name}</TableCell>
                          <TableCell align="right">{formatCurrency(merchant.totalSpent)}</TableCell>
                          <TableCell align="right">{merchant.transactionCount}</TableCell>
                          <TableCell align="right">{formatCurrency(merchant.averageAmount)}</TableCell>
                          <TableCell align="right">
                            {new Date(merchant.lastTransaction).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Monthly Trend */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Monthly Spending Trend
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {Object.entries(analysis.monthlyTrend).map(([month, amount]) => (
                    <Box key={month} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{month}</Typography>
                        <Typography variant="body2">{formatCurrency(amount)}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(amount / Math.max(...Object.values(analysis.monthlyTrend))) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}; 