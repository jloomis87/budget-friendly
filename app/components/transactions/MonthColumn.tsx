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
        maxWidth: 'none',
        flexGrow: 1,
        flexShrink: {
          xs: 0,
          sm: 0,
          md: 0,
          lg: 0,
          xl: 1,
        },
        flexBasis: 'auto',
        px: 0.5,
        display: 'flex',
        flexDirection: 'column',
        // Add styles for when this month is the drop target
        ...(dragOverMonth === month ? {
          backgroundColor: isCopyMode 
            ? 'rgba(76, 175, 80, 0.15)' // Green for copy
            : 'rgba(33, 150, 243, 0.15)', // Blue for move
          borderRadius: 1,
          transition: 'all 0.3s ease',
          transform: 'scale(1.02)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: `2px dashed ${isCopyMode ? '#4caf50' : '#2196f3'}`,
        } : {})
      }}
      // Add drag and drop event handlers for the month column
      onDragOver={(e) => handleMonthDragOver(e, month)}
      onDragLeave={handleMonthDragLeave}
      onDrop={(e) => handleMonthDrop(e, month)}
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
          maxHeight: '500px',
          overflowY: 'auto',
          pr: 0.5,
          pt: 0.5,
          pb: 0.5,
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
          // Handle drag over the stack itself (for dropping at the end of the list)
          e.preventDefault();
          e.stopPropagation();
          
          // Only update if we're not already over a specific card
          if (dragOverIndex === null || dragOverIndex >= (monthTransactions as Transaction[]).length) {
            handleTransactionDragOver(e, month, (monthTransactions as Transaction[]).length);
          }
        }}
        onDrop={(e) => {
          // Handle drop on the stack itself (for dropping at the end of the list)
          e.preventDefault();
          e.stopPropagation();
          
          // Drop at the end of the list
          handleTransactionDrop(e, month, (monthTransactions as Transaction[]).length);
        }}
      >
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
        
        {/* Empty drop zone at the end of the list - enhance the visual indicator */}
        {dragOverMonth === month && dragOverIndex === (monthTransactions as Transaction[]).length && (
          <Box
            sx={{
              height: '30px', // Increased height for better visibility
              borderRadius: 1,
              border: `3px dashed ${isCopyMode ? '#4caf50' : '#2196f3'}`, // Thicker border
              backgroundColor: isCopyMode 
                ? 'rgba(76, 175, 80, 0.15)' 
                : 'rgba(33, 150, 243, 0.15)',
              mb: 1,
              transition: 'all 0.3s ease',
              boxShadow: isCopyMode 
                ? '0 0 12px rgba(76, 175, 80, 0.4)' 
                : '0 0 12px rgba(33, 150, 243, 0.4)', // More pronounced shadow
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Add a text indicator */}
            <Typography 
              variant="caption" 
              sx={{ 
                color: isCopyMode ? '#4caf50' : '#2196f3',
                fontWeight: 'bold',
                fontSize: '0.7rem',
              }}
            >
              {isCopyMode ? 'Copy Here' : 'Move Here'}
            </Typography>
          </Box>
        )}
        
        {/* "Move Here" drop zone - only visible when dragging */}
        {isDragging && (
          <Box
            className="drop-zone"
            sx={{
              height: '50px',
              borderRadius: 1,
              border: `3px dashed #2196f3`,
              backgroundColor: (dragOverMonth === month && dragOverIndex === -999) 
                ? 'rgba(33, 150, 243, 0.2)'
                : 'rgba(33, 150, 243, 0.05)',
              mb: 1,
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              boxShadow: (dragOverMonth === month && dragOverIndex === -999)
                ? '0 0 15px rgba(33, 150, 243, 0.5)'
                : 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              transform: (dragOverMonth === month && dragOverIndex === -999) ? 'scale(1.03)' : 'scale(1)',
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isDragging && draggedTransaction) {
                // Use a special index (-999) to indicate bottom of the list
                handleTransactionDragOver(e, month, -999);
                
                // Force move mode (not copy)
                // This would be handled in the parent component
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Move zone drop event", month, -999);
              if (isDragging && draggedTransaction) {
                // Handle drop at the bottom of the month with move mode
                console.log("Calling handleTransactionDrop for move zone");
                handleTransactionDrop(e, month, -999); // Use -999 to indicate move zone
              }
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(33, 150, 243, 1)',
                fontWeight: (dragOverMonth === month && dragOverIndex === -999 && !isCopyMode) ? 'bold' : 'normal',
                fontSize: '0.85rem',
              }}
            >
              Move Here
            </Typography>
          </Box>
        )}

         {/* "Copy Here" drop zone - only visible when dragging */}
         {isDragging &&  (
          <Box
            className="drop-zone"
            sx={{
              height: '50px',
              borderRadius: 1,
              border: `3px dashed rgb(53, 249, 46)`,
              backgroundColor: (dragOverMonth === month && dragOverIndex === -888) 
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
              mb: 1,
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              boxShadow: (dragOverMonth === month && dragOverIndex === -888)
                ? '0 0 15px rgba(33, 243, 65, 0.5)'
                : 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              transform: (dragOverMonth === month && dragOverIndex === -888) ? 'scale(1.03)' : 'scale(1)',
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isDragging && draggedTransaction) {
                // Use a special index (-999) to indicate bottom of the list
              
                handleTransactionDragOver(e, month, -999);
                
                // Force move mode (not copy)
                isCopyMode = true;
                // This would be handled in the parent component
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Move zone drop event", month, -999);
              if (isDragging && draggedTransaction) {
                // Handle drop at the bottom of the month with copy mode
                console.log("Calling handleTransactionDrop for copy zone");
                isCopyMode = true;
                handleTransactionDrop(e, month, -888); // Use -888 to indicate copy zone
              }
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgb(33, 243, 93)',
                fontWeight: (dragOverMonth === month && dragOverIndex === -999 && isCopyMode) ? 'bold' : 'normal',
                fontSize: '0.85rem',
              }}
            >
              Copy Here
            </Typography>
          </Box>
        )}

        {/* "Copy Here" drop zone - only visible when dragging
        {isDragging && (
          <Box
            className="drop-zone"
            sx={{
              height: '50px',
              borderRadius: 1,
              border: `3px dashed rgb(61, 222, 109)`,
              backgroundColor: (dragOverMonth === month && dragOverIndex === -999) 
                ? 'rgba(68, 248, 89, 0.2)'
                : 'rgba(33, 243, 107, 0.05)',
              mb: 1,
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              boxShadow: (dragOverMonth === month && dragOverIndex === -999)
                ? '0 0 15px rgba(90, 212, 133, 0.5)'
                : 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              transform: (dragOverMonth === month && dragOverIndex === -999) ? 'scale(1.03)' : 'scale(1)',
              pointerEvents: 'all', // Ensure pointer events are enabled
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Copy zone drag over", month);
              if (isDragging && draggedTransaction) {
                // Use a special index (-888) to indicate copy zone
                handleTransactionDragOver(e, month, -888);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Copy zone drop event", month, -999);
              if (isDragging && draggedTransaction) {
                // Handle drop at the bottom of the month with copy mode
                console.log("Calling handleTransactionDrop for copy zone");
                handleTransactionDrop(e, month, -999); // Use -888 to indicate copy zone
              }
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgb(61, 222, 109)',
                fontWeight: (dragOverMonth === month && dragOverIndex === -999) ? 'bold' : 'normal',
                fontSize: '0.85rem',
                pointerEvents: 'none', // Prevent text from interfering with drag events
              }}
            >
              Copy Here
            </Typography>
          </Box>
        )} */}
        
        {/* Add button as the last card in the list */}
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
            mb: 3,
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
      </Stack>
    </Box>
  );
}; 