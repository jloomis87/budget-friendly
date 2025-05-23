import React, { useEffect, useState, useRef } from 'react';
import { Card, Typography, Box, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import type { TransactionCardProps } from './types';
import { isColorDark } from '../../utils/colorUtils';
import { useCurrency } from '../../contexts/CurrencyContext';

// Create a global registry to track all transaction cards by description
// This will help us ensure consistent updates across all cards with the same description
type TransactionIconRegistry = {
  [description: string]: {
    icon: string;
    callbacks: ((icon: string) => void)[];
  };
};

// This global registry tracks all transaction cards and their icon update callbacks
const transactionIconRegistry: TransactionIconRegistry = {};

// Helper to register a card and get its current icon
const registerCard = (description: string, initialIcon: string | undefined, callback: (icon: string) => void) => {
  const normalizedDescription = description.trim().toLowerCase();
  
  if (!transactionIconRegistry[normalizedDescription]) {
    transactionIconRegistry[normalizedDescription] = {
      icon: initialIcon || '',
      callbacks: []
    };
  } else if (initialIcon && !transactionIconRegistry[normalizedDescription].icon) {
    // If a card has an icon but the registry doesn't, update registry
    transactionIconRegistry[normalizedDescription].icon = initialIcon;
  }
  
  // Add this card's update callback to the registry
  transactionIconRegistry[normalizedDescription].callbacks.push(callback);
  
  // Return the current icon for this description from the registry
  return transactionIconRegistry[normalizedDescription].icon || initialIcon || '';
};

// Helper to unregister a card's callback from the registry
const unregisterCard = (description: string, callback: (icon: string) => void) => {
  const normalizedDescription = description.trim().toLowerCase();
  
  if (transactionIconRegistry[normalizedDescription]) {
    // Remove the callback from the registry
    const callbackIndex = transactionIconRegistry[normalizedDescription].callbacks.indexOf(callback);
    if (callbackIndex >= 0) {
      transactionIconRegistry[normalizedDescription].callbacks.splice(callbackIndex, 1);
    }
    
    // If no more callbacks are registered, clean up
    if (transactionIconRegistry[normalizedDescription].callbacks.length === 0) {
      delete transactionIconRegistry[normalizedDescription];
    }
  }
};

// Helper to update all cards with the same description
const updateCardsWithDescription = (description: string, newIcon: string) => {
  const normalizedDescription = description.trim().toLowerCase();
  
  // Log the update request
  
  if (transactionIconRegistry[normalizedDescription]) {
    // Always update the stored icon, regardless of current value
    const previousIcon = transactionIconRegistry[normalizedDescription].icon;
    transactionIconRegistry[normalizedDescription].icon = newIcon;
    
    
    // Force update all registered callbacks
    const callbackCount = transactionIconRegistry[normalizedDescription].callbacks.length;
    
    // Call each callback with the new icon
    transactionIconRegistry[normalizedDescription].callbacks.forEach((callback, index) => {
      callback(newIcon);
    });
    
  } else {
  }
};

// Global event listener for transaction icon updates
document.addEventListener('transactionIconsUpdated', ((event: CustomEvent) => {
  const { description, icon, forceUpdate } = event.detail;
  
  if (description && icon !== undefined) {
    // If forceUpdate is present, force all cards to update regardless of current state
    if (forceUpdate) {
      
      // We need to update all transaction cards with this description
      // First check if we already have entries in the registry
      const normalizedDescription = description.trim().toLowerCase();
      
      if (!transactionIconRegistry[normalizedDescription]) {
        // Create a new registry entry if one doesn't exist
        transactionIconRegistry[normalizedDescription] = {
          icon: icon,
          callbacks: []
        };
      }
      
      // Update all cards
      updateCardsWithDescription(description, icon);
    } else {
      // Normal update
      updateCardsWithDescription(description, icon);
    }
  } else {
  }
}) as EventListener);

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
  handleOpenMobileEdit,
  handleCopyToAllMonths,
  handleDeleteTransaction
}) => {
  // Use state to track the current icon to allow for reactive updates
  const [currentIcon, setCurrentIcon] = useState(transaction.icon || '');
  // Reference to the card element
  const cardRef = useRef<HTMLDivElement>(null);
  // Get currency formatter
  const { formatCurrency } = useCurrency();
  
  // Setup event listeners
  useEffect(() => {
    const normalizedDescription = transaction.description.trim().toLowerCase();
    
    // Register this card in the global registry
    const registryIcon = registerCard(
      normalizedDescription,
      transaction.icon || '',  // Make sure we pass the icon
      (newIcon: string) => {   // Add type for newIcon parameter
        setCurrentIcon(newIcon);
        if (cardRef.current) {
          cardRef.current.classList.add('card-updated');
          setTimeout(() => {
            if (cardRef.current) {
              cardRef.current.classList.remove('card-updated');
            }
          }, 600);
        }
      }
    );
    
    // If the registry has an icon that's different from our current state,
    // update our state to match the registry
    if (registryIcon && registryIcon !== currentIcon) {
      setCurrentIcon(registryIcon);
    }
    
    // Force refresh listener
    const handleForceRefresh = () => {
      
      // Check if there's a registry entry for this transaction description
      if (transactionIconRegistry[normalizedDescription]) {
        const registryIcon = transactionIconRegistry[normalizedDescription].icon;
        
        if (registryIcon !== currentIcon) {
          setCurrentIcon(registryIcon);
          
          // Add animation
          if (cardRef.current) {
            cardRef.current.classList.add('card-updated');
            setTimeout(() => {
              if (cardRef.current) {
                cardRef.current.classList.remove('card-updated');
              }
            }, 600);
          }
        }
      } else {
        // Make sure we're showing the icon from the transaction prop
        setCurrentIcon(transaction.icon || '');  // Add fallback empty string
      }
    };

    document.addEventListener('forceTransactionRefresh', handleForceRefresh);
    
    // After a brief delay (to let all cards register), trigger a global refresh
    // This ensures all cards sync with the registry on initial render
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('forceTransactionRefresh'));
    }, 100);

    // Cleanup on unmount
    return () => {
      unregisterCard(normalizedDescription, (newIcon: string) => {}); // Add dummy callback
      document.removeEventListener('forceTransactionRefresh', handleForceRefresh);
    };
  }, [transaction.description, transaction.icon, currentIcon]); // Add dependencies for icon changes
  
  // Get the background color of this card
  const cardBgColor = getCardBackgroundColor();
  
  // Determine if the background is dark or light to set text color
  const cardIsDark = isColorDark(cardBgColor);
  
  // Use black text on light backgrounds, white text on dark backgrounds
  const textColor = cardIsDark ? '#ffffff' : '#000000';
  const textColorWithOpacity = cardIsDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

  // Function to handle card click without triggering when clicking action buttons
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger edit if clicking on the action buttons
    if ((e.target as HTMLElement).closest('.action-button')) {
      return;
    }
    handleOpenMobileEdit(transaction, index);
  };

  return (
    <Card
      ref={cardRef}
      key={transaction.id}
      data-draggable="true"
      data-transaction-description={transaction.description?.trim().toLowerCase()}
      draggable={true}
      onDragStart={(e) => handleTransactionDragStart(e, transaction, index, month)}
      onDragOver={(e) => handleTransactionDragOver(e, month, index)}
      onDrop={(e) => handleTransactionDrop(e, month, index)}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
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
        position: 'relative', // Added to help position the copy button
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
        gap: 0.5, // Add padding top of 3px
      }}>
        {currentIcon && (
          <Box 
            className="transaction-icon"
            data-icon={currentIcon}
            key={`icon-${currentIcon}-${transaction.description}`}
            sx={{ 
              fontSize: {
                xs: '0.7rem',
                sm: '0.7rem',
                md: '0.7rem',
                lg: '0.7rem',
                xl: '0.9rem',
              },
              lineHeight: 1
            }}
          >
            {currentIcon}
          </Box>
        )}
        <Typography 
          variant="subtitle1"
          sx={{ 
            paddingTop: '3px',
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
        
        {/* Action buttons container */}
        <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 0.5 }}>
          {/* Delete transaction button */}
          {handleDeleteTransaction && (
            <Tooltip title="Delete transaction">
              <IconButton
                className="action-button delete-transaction-btn"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTransaction(transaction, index);
                }}
                sx={{
                  padding: '2px',
                  color: 'rgba(211, 47, 47, 0.7)', // Red color for delete
                  '&:hover': {
                    color: 'rgba(211, 47, 47, 0.9)',
                    backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  },
                }}
              >
                <DeleteIcon sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Copy to all months button */}
          {handleCopyToAllMonths && (
            <Tooltip title="Copy to all months">
              <IconButton
                className="action-button copy-to-all-months-btn"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyToAllMonths(transaction);
                }}
                sx={{
                  padding: '2px',
                  color: textColorWithOpacity,
                  '&:hover': {
                    color: textColor,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                <ContentCopyIcon sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
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
        
        {/* Amount - Update to use formatCurrency */}
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
          {formatCurrency(Math.abs(transaction.amount))}
        </Typography>
      </Box>
    </Card>
  );
}; 