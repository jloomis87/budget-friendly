import React from 'react';
import { Box, Typography, Stack, IconButton, Tooltip, Card } from '@mui/material';
import { Add as AddIcon, ArrowForward as ArrowForwardIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { TransactionCard } from './TransactionCard';
import type { MonthColumnProps } from './types';
import type { Transaction } from '../../services/fileParser';
import { isColorDark } from '../../utils/colorUtils';
import { useCurrency } from '../../contexts/CurrencyContext';

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
  handleCopyToAllMonths,
  getNextMonth,
  getMonthOrder,
  tableColors = {},
  handleDeleteTransaction
}) => {
  const [isCopyModeState, setIsCopyMode] = React.useState(isCopyMode);
  
  const { formatCurrency } = useCurrency();
  
  // Get the background color for this category
  const bgColor = (() => {
    if (tableColors && tableColors[category]) {
      return tableColors[category];
    }
    return getCardBackgroundColor();
  })();
  
  // Determine if the background is dark or light to set text color
  const bgIsDark = isColorDark(bgColor);
  
  // Text colors based on background darkness
  const textColor = bgIsDark ? '#ffffff' : '#000000';
  const textColorWithOpacity = bgIsDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';

  const getUpdatedCardBackgroundColor = (isHover?: boolean) => {
    if (tableColors && tableColors[category]) {
      if (isHover) {
        const baseColor = tableColors[category];
        return `${baseColor}CC`;
      }
      return tableColors[category];
    }
    
    return getCardBackgroundColor(isHover);
  };

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
        ...(dragOverMonth === month ? {
          backgroundColor: 'rgba(33, 150, 243, 0.15)',
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

        if (!draggedTransaction) {
          return;
        }

        const isDuplicate = (monthTransactions as Transaction[]).some(
          transaction => 
            transaction.description === draggedTransaction.description && 
            Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount)
        );

        if (isDuplicate) {
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

        if (!draggedTransaction) {
          return;
        }

        const isDuplicate = (monthTransactions as Transaction[]).some(
          transaction => 
            transaction.description === draggedTransaction.description && 
            Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount)
        );

        if (isDuplicate) {
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
            color: textColor,
          }}
        >
          {month}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* Copy to all months button */}
          {handleCopyToAllMonths && monthTransactions.length > 0 && (
            <Tooltip title={`Copy ${month} ${category} to all months`}>
              <IconButton
                size="small"
                onClick={() => {
                  // Copy each transaction to all other months
                  (monthTransactions as Transaction[]).forEach(transaction => {
                    if (handleCopyToAllMonths) {
                      handleCopyToAllMonths(transaction);
                    }
                  });
                }}
                sx={{
                  color: textColorWithOpacity,
                  '&:hover': {
                    color: textColor,
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Copy to next month button */}
          <Tooltip title={`Copy ${month} ${category} to ${getNextMonth(month)}`}>
            <IconButton
              size="small"
              onClick={() => handleCopyMonthClick(month, monthTransactions as Transaction[])}
              sx={{
                color: textColorWithOpacity,
                '&:hover': {
                  color: textColor,
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontSize: {
            xs: '0.65rem',
            sm: '0.75rem',
            md: '0.85rem'
          },
          color: textColor,
          mb: 1
        }}
      >
        {formatCurrency(Math.abs((monthTransactions as Transaction[]).reduce((sum, t) => sum + t.amount, 0)))}
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
            backgroundColor: bgIsDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: bgIsDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)',
            }
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (!draggedTransaction) {
            return;
          }

          const isDuplicate = (monthTransactions as Transaction[]).some(
            transaction => 
              transaction.description === draggedTransaction.description && 
              Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount)
          );

          if (isDuplicate) {
            e.dataTransfer.dropEffect = 'none';
            handleMonthDragLeave(e);
            return;
          }

          e.dataTransfer.dropEffect = 'move';
          
          if (dragOverIndex === null || dragOverIndex >= (monthTransactions as Transaction[]).length) {
            handleTransactionDragOver(e, month, (monthTransactions as Transaction[]).length);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (!draggedTransaction) {
            return;
          }

          const isDuplicate = (monthTransactions as Transaction[]).some(
            transaction => 
              transaction.description === draggedTransaction.description && 
              Math.abs(transaction.amount) === Math.abs(draggedTransaction.amount)
          );

          if (isDuplicate) {
            handleMonthDragLeave(e);
            return;
          }
          
          handleTransactionDrop(e, month, (monthTransactions as Transaction[]).length);
        }}
      >
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
              bgcolor: getUpdatedCardBackgroundColor(),
              border: 'none',
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: '0 3px 6px rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.15)',
              '&:hover': {
                boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
                transform: 'translateY(-2px)',
                bgcolor: category === 'Income' ? (hasCustomDarkColor ? 'rgba(255, 255, 255, 0.3)' : '#ffffff') : getUpdatedCardBackgroundColor(true)
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
                color: isColorDark(getUpdatedCardBackgroundColor()) ? '#ffffff' : '#000000',
                '&:hover': {
                  color: isColorDark(getUpdatedCardBackgroundColor(true)) ? '#ffffff' : '#000000'
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
            getCardBackgroundColor={getUpdatedCardBackgroundColor}
            getTextColor={getTextColor}
            handleTransactionDragStart={handleTransactionDragStart}
            handleTransactionDragOver={handleTransactionDragOver}
            handleTransactionDrop={handleTransactionDrop}
            handleDragEnd={handleDragEnd}
            handleOpenMobileEdit={handleOpenMobileEdit}
            handleCopyToAllMonths={handleCopyToAllMonths}
            handleDeleteTransaction={handleDeleteTransaction}
          />
        ))}

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
              bgcolor: getUpdatedCardBackgroundColor(),
              color: isColorDark(getUpdatedCardBackgroundColor()) ? '#ffffff' : '#000000',
              border: 'none',
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: '0 3px 6px rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.15)',
              '&:hover': {
                boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
                transform: 'translateY(-2px)',
                bgcolor: getUpdatedCardBackgroundColor(true),
                color: isColorDark(getUpdatedCardBackgroundColor(true)) ? '#ffffff' : '#000000',
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
                color: 'inherit',
              }} 
            />
          </Card>
        )}
      </Stack>
    </Box>
  );
}; 