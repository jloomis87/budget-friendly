import React from 'react';
import { Card, Typography, Box } from '@mui/material';
import type { TransactionCardProps } from './types';
import { isColorDark } from '../../utils/colorUtils';

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  index,
  month,
  isDark,
  hasCustomColor,
  hasCustomDarkColor,
  category,
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
  handleTransactionDragStart,
  handleTransactionDragOver,
  handleTransactionDrop,
  handleDragEnd,
  handleOpenMobileEdit
}) => {
  // Get the background color of this card
  const cardBgColor = getCardBackgroundColor();
  
  // Determine if the background is dark or light to set text color
  const cardIsDark = isColorDark(cardBgColor);
  
  // Use black text on light backgrounds, white text on dark backgrounds
  const textColor = cardIsDark ? '#ffffff' : '#000000';
  const textColorWithOpacity = cardIsDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

  return (
    <Card
      key={transaction.id}
      data-draggable="true"
      draggable={true}
      onDragStart={(e) => handleTransactionDragStart(e, transaction, index, month)}
      onDragOver={(e) => handleTransactionDragOver(e, month, index)}
      onDrop={(e) => handleTransactionDrop(e, month, index)}
      onDragEnd={handleDragEnd}
      onClick={() => handleOpenMobileEdit(transaction, index)}
      sx={{
        mb: 1,
        p: 0.75,
        height: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        bgcolor: cardBgColor,
        color: textColor,
        border: 'none',
        borderRadius: 1,
        transition: 'all 0.2s ease-in-out',
        transform: draggedTransaction?.id === transaction.id ? 'scale(1.02)' : 'none',
        cursor: 'pointer !important', // Force pointer cursor with !important
        boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
        opacity: draggedTransaction?.id === transaction.id ? 0.5 : 1,
        // Add styles for when this card is the drop target for intra-month sorting
        ...(isIntraMonthDrag && dragOverIndex === index && dragSourceMonth === month ? {
          borderTop: draggedIndex !== null && draggedIndex > index 
            ? `2px solid ${isCopyMode ? '#4caf50' : '#2196f3'}`
            : 'none',
          borderBottom: draggedIndex !== null && draggedIndex < index
            ? `2px solid ${isCopyMode ? '#4caf50' : '#2196f3'}`
            : 'none',
          marginTop: draggedIndex !== null && draggedIndex > index ? 1 : 0,
          marginBottom: draggedIndex !== null && draggedIndex < index ? 1 : 0,
          position: 'relative',
          '&::before': draggedIndex !== null && draggedIndex > index ? {
            content: '""',
            position: 'absolute',
            top: -10,
            left: 0,
            right: 0,
            height: 10,
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '4px 4px 0 0',
            zIndex: 1
          } : {},
          '&::after': draggedIndex !== null && draggedIndex < index ? {
            content: '""',
            position: 'absolute',
            bottom: -10,
            left: 0,
            right: 0,
            height: 10,
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '0 0 4px 4px',
            zIndex: 1
          } : {}
        } : {}),
        // Add styles for when this card is the drop target for inter-month drag
        ...(!isIntraMonthDrag && dragOverIndex === index && dragOverMonth === month && dragSourceMonth !== month ? {
          boxShadow: `0 0 0 3px ${isCopyMode ? '#4caf50' : '#2196f3'}, 0 4px 10px rgba(0,0,0,0.2)`,
          transform: 'scale(1.02)',
          zIndex: 10,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -4,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: isCopyMode 
              ? 'rgba(76, 175, 80, 0.8)'  // More visible green
              : 'rgba(33, 150, 243, 0.8)', // More visible blue
            borderRadius: 1,
            zIndex: 2,
            boxShadow: isCopyMode 
              ? '0 0 8px rgba(76, 175, 80, 0.5)' 
              : '0 0 8px rgba(33, 150, 243, 0.5)',
          }
        } : {}),
        '&:hover': {
          boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
          transform: 'translateY(-2px)',
          bgcolor: category === 'Income' ? (hasCustomDarkColor ? 'rgba(255, 255, 255, 0.3)' : '#ffffff') : getCardBackgroundColor(true)
        }
      }}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5
      }}>
        {transaction.icon && (
          <Box sx={{ 
            fontSize: {
              xs: '0.7rem',
              sm: '0.7rem',
              md: '0.7rem',
              lg: '0.7rem',
              xl: '0.9rem',
            },
            lineHeight: 1
          }}>
            {transaction.icon}
          </Box>
        )}
        <Typography 
          variant="subtitle1"
          sx={{ 
            color: textColor,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            fontSize: {
              xs: '0.64rem', // 75% of 0.85rem
              sm: '0.64rem',
              md: '0.64rem',
              lg: '0.64rem',
              xl: '0.85rem', // Original size at 1500px and above
            },
            lineHeight: 1.2
          }}
        >
          {transaction.description}
        </Typography>
      </Box>
      
      {/* Bottom row with date and amount */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        width: '100%',
        mt: 0.5
      }}>
        <Typography 
          variant="body2"
          sx={{ 
            color: textColorWithOpacity,
            fontSize: {
              xs: '0.56rem', // 75% of 0.75rem
              sm: '0.56rem',
              md: '0.56rem',
              lg: '0.56rem',
              xl: '0.75rem', // Original size at 1500px and above
            }
          }}
        >
          {new Date(transaction.date).toLocaleDateString('en-US', { 
            month: 'short',
            day: 'numeric'
          })}
        </Typography>
        
        {/* Amount to the right of date */}
        <Typography 
          variant="body2"
          sx={{ 
            color: textColor,
            fontSize: {
              xs: '0.56rem', // 75% of 0.75rem
              sm: '0.56rem',
              md: '0.56rem',
              lg: '0.56rem',
              xl: '0.75rem', // Original size at 1500px and above
            }
          }}
        >
          ${Math.abs(transaction.amount).toFixed(2)}
        </Typography>
      </Box>
    </Card>
  );
}; 