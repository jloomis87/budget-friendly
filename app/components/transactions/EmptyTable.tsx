import React from 'react';
import { TableRow, TableCell, Typography } from '@mui/material';

interface EmptyTableProps {
  category: string;
  isDark: boolean;
  isAdding: boolean;
}

export function EmptyTable({ category, isDark, isAdding }: EmptyTableProps) {
  if (isAdding) {
    return null;
  }
  
  // Special message for Income category to guide new users
  if (category === 'Income') {
    return (
      <TableRow>
        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
          <Typography variant="body1" color={isDark ? "white" : "textSecondary"}>
            Start by adding your income below by pressing the "+" card.
          </Typography>
        </TableCell>
      </TableRow>
    );
  }
  
  // Default message for other categories
  return (
    <TableRow>
      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
        <Typography variant="body1" color={isDark ? "white" : "textSecondary"}>
          No transactions yet. Add some using the button below.
        </Typography>
      </TableCell>
    </TableRow>
  );
} 