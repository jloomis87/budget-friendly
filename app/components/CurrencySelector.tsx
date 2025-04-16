import React from 'react';
import { Box, Select, MenuItem, Typography, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import { useCurrency, CurrencyCode, CURRENCIES } from '../contexts/CurrencyContext';

interface CurrencySelectorProps {
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  showLabel?: boolean;
  fullWidth?: boolean;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  variant = 'outlined',
  size = 'small',
  showLabel = true,
  fullWidth = false
}) => {
  const { currency, setCurrency, availableCurrencies } = useCurrency();

  const handleChange = (event: SelectChangeEvent<CurrencyCode>) => {
    setCurrency(event.target.value as CurrencyCode);
  };

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl variant={variant} size={size} fullWidth={fullWidth}>
        {showLabel && <InputLabel id="currency-select-label">Currency</InputLabel>}
        <Select
          labelId="currency-select-label"
          id="currency-select"
          value={currency.code}
          onChange={handleChange}
          label={showLabel ? "Currency" : undefined}
          sx={{ minWidth: 120 }}
        >
          {availableCurrencies.map((currencyOption) => (
            <MenuItem key={currencyOption.code} value={currencyOption.code}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography component="span" sx={{ mr: 1 }}>
                  {currencyOption.symbol}
                </Typography>
                {currencyOption.code}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default CurrencySelector; 