import React from 'react';
import { Card, CardContent, Grid, Typography, Box, Tooltip } from '@mui/material';
import { DragIndicatorIcon } from '../../utils/materialIcons';
import type { MobileTransactionCardProps } from './types';

export function MobileTransactionCard({
  transaction,
  isDark,
  handleOpenMobileEdit,
  index,
  formatDateForDisplay,
  onDragStart,
  globalIndex
}: MobileTransactionCardProps) {
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

  return (
    <Card 
      sx={{ 
        mb: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
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
        {/* Remove drag indicator */}
        
        <Grid container spacing={1}>
          <Grid item xs={8}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: isDark ? '#fff' : 'text.primary' }}>
              {transaction.description}
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
              {formatDateForDisplay(transaction.date)}
            </Typography>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle1" sx={{ 
              color: isDark ? '#fff' : 'text.primary' 
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
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            fontSize: '0.7rem',
            width: 'auto',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          (click to edit or hold and drag)
        </Typography>
      </CardContent>
    </Card>
  );
} 