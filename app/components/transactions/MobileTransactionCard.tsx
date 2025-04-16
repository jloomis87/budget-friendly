import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, Grid, Typography, Box, Tooltip } from '@mui/material';
import { DragIndicatorIcon } from '../../utils/materialIcons';
import type { MobileTransactionCardProps } from './types';
import { isColorDark } from '../../utils/colorUtils';

export function MobileTransactionCard({
  transaction,
  isDark,
  handleOpenMobileEdit,
  index,
  formatDateForDisplay,
  onDragStart,
  globalIndex
}: MobileTransactionCardProps) {
  // Use state to track the current icon to allow for reactive updates
  const [currentIcon, setCurrentIcon] = useState(transaction.icon);
  // Reference to the card element
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Listen for icon updates
  useEffect(() => {
    const handleIconUpdate = (event: CustomEvent) => {
      // Only update if this event is for our transaction
      const { description, icon } = event.detail;
      
      if (description && 
          description.trim().toLowerCase() === transaction.description.trim().toLowerCase() &&
          icon !== undefined) {
        console.log(`[MobileCard] Updating icon for "${description}" to "${icon}"`);
        setCurrentIcon(icon);
        
        // Add animation
        if (cardRef.current) {
          cardRef.current.classList.add('card-updated');
          setTimeout(() => {
            if (cardRef.current) {
              cardRef.current.classList.remove('card-updated');
            }
          }, 300);
        }
      }
    };
    
    const handleForceRefresh = (event: CustomEvent) => {
      // Force rerender if our transaction matches criteria
      const normalizedDescription = transaction.description.trim().toLowerCase();
      const eventDescription = event.detail?.description?.trim().toLowerCase();
      
      // If the event has a description and it matches our transaction, update from event
      if (eventDescription && eventDescription === normalizedDescription && event.detail.icon) {
        console.log(`[MobileCard] Force refresh match from event for "${normalizedDescription}": ${event.detail.icon}`);
        setCurrentIcon(event.detail.icon);
      } else {
        // Otherwise fallback to transaction data
        if (transaction.icon !== currentIcon) {
          console.log(`[MobileCard] Force refresh updating from transaction prop: ${transaction.icon}`);
          setCurrentIcon(transaction.icon);
        }
      }
      
      // Small delay to ensure the DOM has time to update
      setTimeout(() => {
        if (cardRef.current) {
          // Apply a small animation to show the update
          cardRef.current.style.transition = 'transform 0.2s ease';
          cardRef.current.style.transform = 'scale(1.02)';
          
          setTimeout(() => {
            if (cardRef.current) {
              cardRef.current.style.transform = 'none';
            }
          }, 200);
        }
      }, 50);
    };
    
    // Add event listeners
    document.addEventListener('transactionIconsUpdated', handleIconUpdate as EventListener);
    document.addEventListener('forceTransactionRefresh', handleForceRefresh as EventListener);
    
    // Update icon from prop changes
    if (transaction.icon !== currentIcon) {
      setCurrentIcon(transaction.icon);
    }
    
    // Cleanup event listeners on unmount
    return () => {
      document.removeEventListener('transactionIconsUpdated', handleIconUpdate as EventListener);
      document.removeEventListener('forceTransactionRefresh', handleForceRefresh as EventListener);
    };
  }, [transaction, transaction.category, transaction.icon, currentIcon]);

  // Create a custom drag handler for the card
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation(); // Prevent card click event
    
    // Create a custom drag image that looks like the card
    const dragPreview = document.createElement('div');
    dragPreview.style.backgroundColor = isDark ? '#333' : '#f5f5f5';
    dragPreview.style.border = '1px solid #ccc';
    dragPreview.style.borderRadius = '4px';
    dragPreview.style.padding = '8px 12px';
    dragPreview.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    dragPreview.style.width = '250px';
    dragPreview.style.display = 'flex';
    dragPreview.style.alignItems = 'center';
    dragPreview.style.color = isDark ? '#fff' : '#333';
    
    // Add an icon
    const icon = document.createElement('span');
    icon.innerHTML = '↕️';
    icon.style.marginRight = '8px';
    dragPreview.appendChild(icon);
    
    // Add description
    const text = document.createElement('div');
    text.textContent = transaction.description;
    text.style.fontWeight = '500';
    text.style.flex = '1';
    dragPreview.appendChild(text);
    
    // Add amount
    const amount = document.createElement('div');
    amount.textContent = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(transaction.amount));
    amount.style.marginLeft = '8px';
    dragPreview.appendChild(amount);
    
    // Add to DOM temporarily
    document.body.appendChild(dragPreview);
    
    // Set the drag image
    e.dataTransfer.setDragImage(dragPreview, 125, 20);
    
    // Set other drag properties
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', transaction.description);
    
    // Store transaction ID in dataTransfer for reordering
    if (transaction.id) {
      e.dataTransfer.setData('application/json', JSON.stringify({
        id: transaction.id,
        index: index,
        category: transaction.category
      }));
    }
    
    // Add a class to the body to indicate dragging is in progress
    document.body.classList.add('dragging-active');
    
    // Call the parent handler if provided
    if (onDragStart) {
      onDragStart(e, transaction, globalIndex);
    }
    
    // Remove the element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    // Remove the dragging class
    document.body.classList.remove('dragging-active');
  };

  // Get the background color of this card
  const cardBgColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)';
  
  // Determine if the background is dark or light to set text color
  const cardIsDark = isColorDark(cardBgColor);
  
  // Use black text on light backgrounds, white text on dark backgrounds
  const textColor = cardIsDark ? '#ffffff' : '#000000';
  const textColorWithOpacity = cardIsDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

  return (
    <Card 
      ref={cardRef}
      key={transaction.id}
      data-transaction-description={transaction.description?.trim().toLowerCase()}
      sx={{ 
        mb: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        bgcolor: cardBgColor,
        borderRadius: 2,
        mx: '5px',
        position: 'relative',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.7)',
          boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
        }
      }}
      onClick={() => handleOpenMobileEdit(transaction, index)}
      draggable={onDragStart ? true : false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Grid container spacing={1}>
          <Grid item xs={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {currentIcon && (
                <Box 
                  className="transaction-icon"
                  data-icon={currentIcon}
                  sx={{ 
                    fontSize: '1rem',
                    lineHeight: 1,
                  }}
                >
                  {currentIcon}
                </Box>
              )}
              <Typography variant="subtitle1" sx={{ fontWeight: 500, color: textColor }}>
                {transaction.description}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: textColorWithOpacity }}>
              {formatDateForDisplay(transaction.date)}
            </Typography>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle1" sx={{ 
              color: transaction.amount < 0 ? '#FF5252' : textColor,
              fontWeight: 600
            }}>
              ${Math.abs(transaction.amount).toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
        
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: textColorWithOpacity,
            fontSize: '0.7rem',
            width: 'auto',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          (click to edit or drag to reorder)
        </Typography>
      </CardContent>
    </Card>
  );
} 