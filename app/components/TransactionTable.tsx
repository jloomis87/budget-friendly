import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box
} from '@mui/material';
import type { Transaction } from '../services/fileParser';

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', my: 2 }}>
        No transactions to display
      </Typography>
    );
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Format amount for display
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get color for category chip
  const getCategoryColor = (category: string | undefined) => {
    switch (category) {
      case 'Essentials':
        return 'primary';
      case 'Wants':
        return 'secondary';
      case 'Savings':
        return 'success';
      case 'Income':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Transactions
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center">Category</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction, index) => (
              <TableRow key={index} hover>
                <TableCell>{formatDate(transaction.date)}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell align="right" sx={{ 
                  color: transaction.amount >= 0 ? 'success.main' : 'error.main',
                  fontWeight: 'medium'
                }}>
                  {formatAmount(transaction.amount)}
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={transaction.category || 'Unknown'} 
                    size="small"
                    color={getCategoryColor(transaction.category) as any}
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 