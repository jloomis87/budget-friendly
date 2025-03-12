import React, { useState, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { AddIcon } from '../../utils/materialIcons';
import { MobileTransactionCard } from './MobileTransactionCard';
import type { Transaction } from '../../services/fileParser';
import type { MobileTransactionListProps } from './types';

export function MobileTransactionList({
  category,
  transactions,
  isDark,
  isAdding,
  handleOpenMobileEdit,
  handleOpenMobileAdd,
  setIsAdding,
  formatDateForDisplay,
  onDragStart,
  allTransactions,
  findGlobalIndex,
  onReorder
}: MobileTransactionListProps) {
  // Function to find the global index of a transaction
  const getGlobalIndex = (transaction: Transaction): number => {
    if (findGlobalIndex && allTransactions) {
      return findGlobalIndex(transaction, allTransactions);
    }
    return -1; // Fallback if not provided
  };
  
  // State for drag and drop reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Handle drag start for reordering
  const handleDragStart = (e: React.DragEvent, transaction: Transaction, index: number, globalIndex: number) => {
    setDraggedIndex(index);
    
    // Call the parent drag start handler if provided
    if (onDragStart) {
      onDragStart(e, transaction, globalIndex);
    }
  };
  
  // Handle drag over for reordering
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };
  
  // Handle drop for reordering
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    // If we have a dragged item and a valid drop target
    if (draggedIndex !== null && draggedIndex !== index) {
      // Call the parent reorder handler if provided
      if (onReorder) {
        onReorder(category, draggedIndex, index);
      }
    }
    
    setDraggedIndex(null);
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

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
            <Box
              key={`${transaction.description}-${transaction.amount}-${transaction.date}`}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              sx={{
                position: 'relative',
                transform: dragOverIndex === index ? 'translateY(5px)' : 'none',
                opacity: draggedIndex === index ? 0.5 : 1,
                transition: 'transform 0.2s, opacity 0.2s',
                mb: dragOverIndex === index ? '15px' : '5px',
              }}
            >
              <MobileTransactionCard
                transaction={transaction}
                isDark={isDark}
                handleOpenMobileEdit={handleOpenMobileEdit}
                index={index}
                formatDateForDisplay={formatDateForDisplay}
                onDragStart={(e, t, g) => handleDragStart(e, t, index, g)}
                globalIndex={getGlobalIndex(transaction)}
              />
            </Box>
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