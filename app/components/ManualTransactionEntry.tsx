import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl, 
  Grid, 
  FormHelperText 
} from '@mui/material';
import type { Transaction } from '../services/fileParser';

interface ManualTransactionEntryProps {
  onAddTransaction: (transaction: Transaction) => void;
}

export function ManualTransactionEntry({ onAddTransaction }: ManualTransactionEntryProps) {
  // State for form fields
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Transaction['category']>('Essentials');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  
  // State for form validation
  const [errors, setErrors] = useState({
    description: '',
    amount: '',
    date: ''
  });

  // Handle category change
  const handleCategoryChange = (newCategory: Transaction['category']) => {
    setCategory(newCategory);
    
    // Clear validation errors for date if changing to Income
    if (newCategory === 'Income') {
      setErrors(prev => ({
        ...prev,
        date: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({
      description: '',
      amount: '',
      date: ''
    });
    
    // Validate inputs
    let hasError = false;
    const newErrors = { ...errors };
    
    // Description is required for all categories
    if (!description.trim()) {
      newErrors.description = category === 'Income' 
        ? 'Income Source is required' 
        : 'Description is required';
      hasError = true;
    }
    
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
      hasError = true;
    } else {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        newErrors.amount = 'Please enter a valid number';
        hasError = true;
      }
    }
    
    // Only validate date if not Income category
    if (category !== 'Income' && !date.trim()) {
      newErrors.date = 'Date is required';
      hasError = true;
    }
    
    if (hasError) {
      setErrors(newErrors);
      return;
    }
    
    // Create transaction object
    const parsedAmount = parseFloat(amount);
    const signedAmount = category === 'Income' ? Math.abs(parsedAmount) : -Math.abs(parsedAmount);
    
    const transaction: Transaction = {
      description: description.trim(),
      amount: signedAmount,
      date: new Date(date || new Date().toISOString().split('T')[0]), // Use current date if empty
      category
    };
    
    // Add transaction
    onAddTransaction(transaction);
    
    // Reset form
    setDescription('');
    setAmount('');
    setCategory('Essentials');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label={category === 'Income' ? "Income Source" : "Description"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={!!errors.description}
            helperText={errors.description}
            placeholder={category === 'Income' ? "e.g., Salary, Bonus" : "e.g., Grocery Shopping"}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>
        
        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            error={!!errors.amount}
            helperText={errors.amount}
            placeholder="0.00"
            InputProps={{
              startAdornment: <span style={{ marginRight: 4 }}>$</span>,
            }}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>
        
        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            label={category === 'Income' ? "Date (Optional)" : "Date"}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={!!errors.date}
            helperText={errors.date}
            InputLabelProps={{ shrink: true }}
            required={category !== 'Income'}
          />
        </Grid>
        
        <Grid item xs={12} sm={2}>
          <FormControl fullWidth>
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as Transaction['category'])}
              label="Category"
              required
            >
              <MenuItem value="Income">Income</MenuItem>
              <MenuItem value="Essentials">Essentials</MenuItem>
              <MenuItem value="Wants">Wants</MenuItem>
              <MenuItem value="Savings">Savings</MenuItem>
            </Select>
            <FormHelperText>
              {category === 'Income' ? 'Positive amount' : 'Expense (negative)'}
            </FormHelperText>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={2}>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            fullWidth
            sx={{ height: '56px' }} // Match height with text fields
          >
            Add Transaction
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
} 