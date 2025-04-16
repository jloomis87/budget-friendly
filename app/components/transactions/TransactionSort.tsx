import React from 'react';
import { Box, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { isColorDark } from '../../utils/colorUtils';
import { useCategories } from '../../contexts/CategoryContext';
import { useTableColors } from '../../hooks/useTableColors';

// Define SortOption as an object type to match TransactionTableHeader
interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

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
  
  // Always use white text and border colors, regardless of background
  const textColorWithOpacity = '#ffffffB3'; // White with ~70% opacity
  const borderColorLight = '#ffffff3D'; // White with ~24% opacity
  const borderColorDark = '#ffffff80'; // White with ~50% opacity

  // Handle the sort change properly for object-type SortOption
  const handleSortChange = (value: string) => {
    // Default direction is 'desc' for most fields
    let direction: 'asc' | 'desc' = 'desc';
    
    // For description, default to 'asc'
    if (value === 'description') {
      direction = 'asc';
    }
    
    // Create the new sort option object
    const newSortOption: SortOption = {
      field: value,
      direction
    };
    
    onSortChange(newSortOption);
  };

  return (
    <FormControl 
      size="small" 
      sx={{ 
        minWidth: 120,
        '& .MuiOutlinedInput-root': {
          color: '#ffffff', // Always white text
          '& fieldset': {
            borderColor: borderColorLight
          },
          '&:hover fieldset': {
            borderColor: borderColorDark
          },
          '& .MuiSvgIcon-root': {
            color: '#ffffff', // Always white icon
          }
        },
        '& .MuiSelect-select': {
          color: '#ffffff', // Always white text for selected item
        }
      }}
    >
      <InputLabel 
        id="sort-select-label"
        sx={{
          color: '#ffffff' // Always white label
        }}
      >
        Sort By
      </InputLabel>
      <Select
        labelId="sort-select-label"
        value={sortOption.field}
        label="Sort By"
        onChange={(e) => handleSortChange(e.target.value)}
        sx={{
          '& .MuiSelect-icon': {
            color: '#ffffff', // Force white dropdown icon
          }
        }}
      >
        <MenuItem value="amount">Amount</MenuItem>
        <MenuItem value="date">Date</MenuItem>
        <MenuItem value="description">Description</MenuItem>
      </Select>
    </FormControl>
  );
}; 