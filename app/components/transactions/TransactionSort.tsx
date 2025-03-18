import React from 'react';
import { Box, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import type { SortOption } from './types';

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
  return (
    <FormControl 
      size="small" 
      sx={{ 
        minWidth: 120,
        '& .MuiOutlinedInput-root': {
          color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.7)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)')),
          '& fieldset': {
            borderColor: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.23)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.23)' : (isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)'))
          },
          '&:hover fieldset': {
            borderColor: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.5)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.5)' : (isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'))
          }
        }
      }}
    >
      <InputLabel 
        id="sort-select-label"
        sx={{
          color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.7)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'))
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