import React from 'react';
import { Box, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import type { SortOption } from './types';
import { isColorDark } from '../../utils/colorUtils';
import { useCategories } from '../../contexts/CategoryContext';
import { useTableColors } from '../../hooks/useTableColors';

interface TransactionSortProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  hasCustomDarkColor: boolean;
  isDark: boolean;
  category: string;
}

export const TransactionSort: React.FC<TransactionSortProps> = ({
  sortOption,
  onSortChange,
  hasCustomDarkColor,
  isDark,
  category
}) => {
  const { categories } = useCategories();
  const [tableColors] = useTableColors();

  // Get the background color
  const getCategoryColor = () => {
    // First check if it's in tableColors
    if (tableColors && tableColors[category]) {
      return tableColors[category];
    }
    
    // Then check category data
    const categoryData = categories.find(c => c.name === category);
    if (categoryData) {
      return categoryData.color;
    }
    
    // Fallback
    return isDark ? '#424242' : '#f5f5f5';
  };
  
  const backgroundColor = getCategoryColor();
  const bgIsDark = isColorDark(backgroundColor);
  
  // Text colors
  const textColor = bgIsDark ? '#ffffff' : '#000000';
  const textColorWithOpacity = `${textColor}B3`; // ~70% opacity
  const borderColorLight = `${textColor}3D`; // ~24% opacity
  const borderColorDark = `${textColor}80`; // ~50% opacity

  return (
    <FormControl 
      size="small" 
      sx={{ 
        minWidth: 120,
        '& .MuiOutlinedInput-root': {
          color: textColorWithOpacity,
          '& fieldset': {
            borderColor: borderColorLight
          },
          '&:hover fieldset': {
            borderColor: borderColorDark
          }
        }
      }}
    >
      <InputLabel 
        id="sort-select-label"
        sx={{
          color: textColorWithOpacity
        }}
      >
        Sort By
      </InputLabel>
      <Select
        labelId="sort-select-label"
        value={sortOption}
        label="Sort By"
        onChange={(e) => onSortChange(e.target.value as SortOption)}
      >
        <MenuItem value="amount">Amount</MenuItem>
        <MenuItem value="date">Date</MenuItem>
        <MenuItem value="description">Description</MenuItem>
      </Select>
    </FormControl>
  );
}; 