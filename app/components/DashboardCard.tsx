import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import { Transaction } from '../services/fileParser';
import { isColorDark } from '../utils/colorUtils';

interface DashboardCardProps {
  transaction: Transaction;
  isDark: boolean;
  backgroundColor?: string;
  onClick?: () => void;
}

export function DashboardCard({ 
  transaction, 
  isDark, 
  backgroundColor = '#f5f5f5', 
  onClick 
}: DashboardCardProps) {
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
        setCurrentIcon(event.detail.icon);
      } else if (transaction.icon !== currentIcon) {
        // Otherwise fallback to transaction data
        setCurrentIcon(transaction.icon);
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

  // Determine if the background is dark or light to set text color
  const isDarkBackground = isColorDark(backgroundColor);
  
  // Use black text on light backgrounds, white text on dark backgrounds
  const textColor = isDarkBackground ? '#ffffff' : '#000000';
  const textColorWithOpacity = isDarkBackground ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';
  
  // Format amount for display
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(transaction.amount));
  
  // Format date for display
  const formatDate = (date: string | number | Date) => {
    if (typeof date === 'number') {
      const now = new Date();
      const fullDate = new Date(now.getFullYear(), now.getMonth(), date);
      return fullDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
    
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
    
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card 
      ref={cardRef}
      data-transaction-description={transaction.description?.trim().toLowerCase()}
      sx={{ 
        mb: 1,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        bgcolor: backgroundColor,
        borderRadius: 2,
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
          transform: 'translateY(-2px)'
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {currentIcon && (
              <Box 
                className="transaction-icon"
                data-icon={currentIcon}
                sx={{ 
                  fontSize: '1.1rem',
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
          <Typography variant="subtitle1" sx={{ 
            color: transaction.amount < 0 ? '#FF5252' : '#4CAF50',
            fontWeight: 600
          }}>
            {formattedAmount}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: textColorWithOpacity, mt: 0.5 }}>
          {formatDate(transaction.date)}
        </Typography>
      </CardContent>
    </Card>
  );
} 