import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { AddIcon } from '../../utils/materialIcons';
import { MobileTransactionCard } from './MobileTransactionCard';
import type { Transaction } from '../../services/fileParser';

interface MobileTransactionListProps {
  category: string;
  transactions: Transaction[];
  isDark: boolean;
  isAdding: boolean;
  handleOpenMobileEdit: (transaction: Transaction, index: number) => void;
  handleOpenMobileAdd: () => void;
  setIsAdding: (value: boolean) => void;
  formatDateForDisplay: (date: Date | string | number) => string;
}

export function MobileTransactionList({
  category,
  transactions,
  isDark,
  isAdding,
  handleOpenMobileEdit,
  handleOpenMobileAdd,
  setIsAdding,
  formatDateForDisplay
}: MobileTransactionListProps) {
  return (
    <Box>
      {/* Empty state - when no transactions and not adding */}
      {transactions.length === 0 && !isAdding && (
        <Typography variant="body2" sx={{ 
          textAlign: 'center', 
          p: 3, 
          color: isDark ? '#fff' : 'text.secondary' 
        }}>
          No {category.toLowerCase()} expenses yet. Add one or drag a transaction here.
        </Typography>
      )}

      {/* Existing transactions as cards */}
      {transactions.length > 0 && !isAdding && (
        <>
          {transactions.map((transaction, index) => (
            <MobileTransactionCard
              key={`${transaction.description}-${transaction.amount}-${transaction.date}`}
              transaction={transaction}
              isDark={isDark}
              handleOpenMobileEdit={handleOpenMobileEdit}
              index={index}
              formatDateForDisplay={formatDateForDisplay}
            />
          ))}
        </>
      )}
      
      {/* Mobile Add Button - Only show when not adding */}
      {!isAdding && (
        <Box sx={{ 
          p: 2, 
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.05)' 
        }}>
          <Button
            variant="contained"
            onClick={handleOpenMobileAdd}
            sx={{ 
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
              borderRadius: 8,
              py: 1,
              px: 3,
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
              }
            }}
          >
            <AddIcon sx={{ mr: 1 }} /> ADD EXPENSE
          </Button>
        </Box>
      )}
    </Box>
  );
} 