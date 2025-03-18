import React from 'react';
import { Box, Typography, Stack, IconButton, Tooltip, Card } from '@mui/material';
import { Add as AddIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { TransactionCard } from './TransactionCard';
import type { MonthColumnProps } from './types';
import type { Transaction } from '../../services/fileParser';

export const MonthColumn: React.FC<MonthColumnProps> = ({
  month,
  monthTransactions,
  category,
  isDark,
  hasCustomColor,
  hasCustomDarkColor,
  isDragging,
  draggedTransaction,
  draggedIndex,
  dragSourceMonth,
  dragOverMonth,
  dragOverIndex,
  isIntraMonthDrag,
  isCopyMode,
  getCardBackgroundColor,
  getTextColor,
  handleMonthDragOver,
  handleMonthDragLeave,
  handleMonthDrop,
  handleTransactionDragStart,
  handleTransactionDragOver,
  handleTransactionDrop,
  handleDragEnd,
  handleOpenMobileEdit,
  handleOpenMobileAdd,
  handleCopyMonthClick,
  getNextMonth,
  getMonthOrder
}) => {
  const [isCopyModeState, setIsCopyMode] = React.useState(isCopyMode);

  return (
    <Box 
      sx={{ 
        width: '100%',
        minWidth: {
          xs: '113px',
          sm: '113px',
          md: '113px',
          lg: '113px',
          xl: 'unset',
        },
        maxWidth:{
          xs: '113px',
          sm: '113px',
          md: 'unset',
          lg: 'unset',
          xl: 'unset',
        },
        flexGrow: 1,
        flexShrink: {
          xs: 0,
          sm: 0,
          md: 1,
          lg: 1,
          xl: 1,
        },
        flexBasis: 'auto',
        px: 0.5,
        display: 'flex',
        flexDirection: 'column',
        // Add styles for when this month is the drop target
        ...(dragOverMonth === month ? {
          backgroundColor: 'rgba(33, 150, 243, 0.15)', // Blue for move
          borderRadius: 1,
          transition: 'all 0.3s ease',
          transform: 'scale(1.02)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '2px dashed #2196f3',
        } : {})
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if we have a dragged transaction
        if (!draggedTransaction) {
          return;
        }

        // Check for duplicates in the target month
        const isDuplicate = (monthTransactions as Transaction[]).some(
          transaction => 
            transaction.description === draggedTransaction.description && 
            Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount)
        );

        if (isDuplicate) {
          // If it's a duplicate, don't allow the drag over
          e.dataTransfer.dropEffect = 'none';
          handleMonthDragLeave(e);
          return;
        }

        e.dataTransfer.dropEffect = 'move';
        handleMonthDragOver(e, month);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMonthDragLeave(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if we have a dragged transaction
        if (!draggedTransaction) {
          return;
        }

        // Check for duplicates in the target month
        const isDuplicate = (monthTransactions as Transaction[]).some(
          transaction => 
            transaction.description === draggedTransaction.description && 
            Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount)
        );

        if (isDuplicate) {
          // If it's a duplicate, don't allow the drop
          console.log('Duplicate transaction found in month - drop prevented');
          handleMonthDragLeave(e);
          return;
        }

        handleMonthDrop(e, month);
      }}
    >
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 0.5,
        borderBottom: 1,
        borderColor: category === 'Income' ? 'rgba(0, 0, 0, 0.1)' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider'),
        pb: 0.5
      }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 500,
            color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.9)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.9)' : (isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)')),
          }}
        >
          {month}
        </Typography>
        <Tooltip title={`Copy ${month} ${category} to ${getNextMonth(month)}`}>
          <IconButton
            size="small"
            onClick={() => handleCopyMonthClick(month, monthTransactions as Transaction[])}
            sx={{
              color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.54)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)')),
              '&:hover': {
                color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.9)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)')),
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography
        sx={{
          fontSize: {
            xs: '0.65rem',
            sm: '0.75rem',
            md: '0.85rem'
          },
          color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.85)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.87)')),
          mb: 1
        }}
      >
        ${Math.abs((monthTransactions as Transaction[]).reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
      </Typography>
      
      <Stack 
        spacing={1}
        sx={{ 
          flexGrow: 1,
          minHeight: '100px',
          height: 'auto',
          overflowY: 'auto',
          pr: 0.5,
          pt: 0.5,
          pb: 0.5,
          position: 'relative',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0,0,0,0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.3)' : (category === 'Income' ? 'rgba(0,0,0,0.2)' : 'rgba(25, 118, 210, 0.3)'),
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: hasCustomDarkColor ? 'rgba(255,255,255,0.5)' : (category === 'Income' ? 'rgba(0,0,0,0.3)' : 'rgba(25, 118, 210, 0.5)'),
            }
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Check if we have a dragged transaction
          if (!draggedTransaction) {
            return;
          }

          // Check for duplicates in the target month
          const isDuplicate = (monthTransactions as Transaction[]).some(
            transaction => 
              transaction.description === draggedTransaction.description && 
              Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount)
          );

          if (isDuplicate) {
            // If it's a duplicate, don't allow the drag over
            e.dataTransfer.dropEffect = 'none';
            handleMonthDragLeave(e);
            return;
          }

          e.dataTransfer.dropEffect = 'move';
          
          // Only update if we're not already over a specific card
          if (dragOverIndex === null || dragOverIndex >= (monthTransactions as Transaction[]).length) {
            handleTransactionDragOver(e, month, (monthTransactions as Transaction[]).length);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Check if we have a dragged transaction
          if (!draggedTransaction) {
            return;
          }

          // Check for duplicates in the target month
          const isDuplicate = (monthTransactions as Transaction[]).some(
            transaction => 
              transaction.description === draggedTransaction.description && 
              Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount)
          );

          if (isDuplicate) {
            // If it's a duplicate, don't allow the drop
            console.log('Duplicate transaction found in stack - drop prevented');
            handleMonthDragLeave(e);
            return;
          }
          
          // Drop at the end of the list
          handleTransactionDrop(e, month, (monthTransactions as Transaction[]).length);
        }}
      >
        {/* Add button if there are no transactions */}
        {(monthTransactions as Transaction[]).length === 0 && (
          <Card
            onClick={() => handleOpenMobileAdd(month)}
            sx={{
              p: 0.75,
              height: '60px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: getCardBackgroundColor(),
              border: 'none',
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: '0 3px 6px rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.15)',
              '&:hover': {
                boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
                transform: 'translateY(-2px)',
                bgcolor: category === 'Income' ? (hasCustomDarkColor ? 'rgba(255, 255, 255, 0.3)' : '#ffffff') : getCardBackgroundColor(true)
              }
            }}
          >
            <AddIcon 
              sx={{ 
                fontSize: {
                  xs: '1.125rem',
                  sm: '1.125rem',
                  md: '1.125rem',
                  lg: '1.125rem',
                  xl: '1.5rem',
                },
                color: getTextColor(),
                '&:hover': {
                  color: getTextColor(true)
                }
              }} 
            />
          </Card>
        )}

        {(monthTransactions as Transaction[]).map((transaction, index) => (
          <TransactionCard
            key={transaction.id || `${transaction.description}-${index}`}
            transaction={transaction}
            index={index}
            month={month}
            isDark={isDark}
            hasCustomColor={hasCustomColor}
            hasCustomDarkColor={hasCustomDarkColor}
            category={category}
            isDragging={isDragging}
            draggedTransaction={draggedTransaction}
            draggedIndex={draggedIndex}
            dragSourceMonth={dragSourceMonth}
            dragOverMonth={dragOverMonth}
            dragOverIndex={dragOverIndex}
            isIntraMonthDrag={isIntraMonthDrag}
            isCopyMode={isCopyMode}
            getCardBackgroundColor={getCardBackgroundColor}
            getTextColor={getTextColor}
            handleTransactionDragStart={handleTransactionDragStart}
            handleTransactionDragOver={handleTransactionDragOver}
            handleTransactionDrop={handleTransactionDrop}
            handleDragEnd={handleDragEnd}
            handleOpenMobileEdit={handleOpenMobileEdit}
          />
        ))}

        {/* Add button after transactions if there are any */}
        {(monthTransactions as Transaction[]).length > 0 && (
          <Card
            onClick={() => handleOpenMobileAdd(month)}
            sx={{
              p: 0.75,
              height: '60px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: getCardBackgroundColor(),
              border: 'none',
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: '0 3px 6px rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.15)',
              '&:hover': {
                boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
                transform: 'translateY(-2px)',
                bgcolor: category === 'Income' ? (hasCustomDarkColor ? 'rgba(255, 255, 255, 0.3)' : '#ffffff') : getCardBackgroundColor(true)
              }
            }}
          >
            <AddIcon 
              sx={{ 
                fontSize: {
                  xs: '1.125rem',
                  sm: '1.125rem',
                  md: '1.125rem',
                  lg: '1.125rem',
                  xl: '1.5rem',
                },
                color: getTextColor(),
                '&:hover': {
                  color: getTextColor(true)
                }
              }} 
            />
          </Card>
        )}
      </Stack>
    </Box>
  );
}; 