import React from 'react';
import {
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  useMediaQuery
} from '@mui/material';
import { TransactionTable } from './components/transactions/TransactionTable';
import type { Transaction } from './services/fileParser';

export default function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [isDark, setIsDark] = React.useState(prefersDarkMode);
  const [transactions, setTransactions] = React.useState<Transaction[]>(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [dragOverCategory, setDragOverCategory] = React.useState<string | null>(null);
  const [recentlyDropped, setRecentlyDropped] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsDark(prefersDarkMode);
  }, [prefersDarkMode]);

  React.useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? 'dark' : 'light',
          background: {
            default: isDark ? '#121212' : '#f5f5f5',
            paper: isDark ? '#1e1e1e' : '#ffffff'
          }
        }
      }),
    [isDark]
  );

  const handleTransactionsChange = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
  };

  const handleDragStart = (e: React.DragEvent, transaction: Transaction, globalIndex: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ transaction, index: globalIndex }));
  };

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDragOverCategory(category);
  };

  const handleDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { transaction, index } = data;

    if (transaction.category !== targetCategory) {
      const updatedTransaction = { ...transaction, category: targetCategory };
      const newTransactions = [...transactions];
      newTransactions[index] = updatedTransaction;
      handleTransactionsChange(newTransactions);
      setRecentlyDropped(targetCategory);
      setTimeout(() => setRecentlyDropped(null), 800);
    }
    setDragOverCategory(null);
  };

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();
  const monthString = `${currentMonth} ${currentYear}`;

  // Filter transactions by category
  const incomeTransactions = transactions.filter(t => t.category === 'Income');
  const expenseTransactions = transactions.filter(t => t.category === 'Essentials');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          py: 4
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <TransactionTable
              transactions={incomeTransactions}
              allTransactions={transactions}
              category="Income"
              onUpdateTransaction={(index, updatedTransaction) => {
                const newTransactions = [...transactions];
                newTransactions[index] = { ...newTransactions[index], ...updatedTransaction };
                handleTransactionsChange(newTransactions);
              }}
              onDeleteTransaction={(index) => {
                const newTransactions = transactions.filter((_, i) => i !== index);
                handleTransactionsChange(newTransactions);
              }}
              onAddTransaction={(transaction) => {
                handleTransactionsChange([...transactions, transaction]);
              }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              dragOverCategory={dragOverCategory}
              recentlyDropped={recentlyDropped}
              month={monthString}
              isDark={isDark}
              onTransactionsChange={(newTransactions: Transaction[]) => {
                const updatedTransactions = transactions.filter(t => t.category !== 'Income').concat(newTransactions);
                handleTransactionsChange(updatedTransactions);
              }}
            />
          </Box>
          <Box>
            <TransactionTable
              transactions={expenseTransactions}
              allTransactions={transactions}
              category="Essentials"
              onUpdateTransaction={(index, updatedTransaction) => {
                const newTransactions = [...transactions];
                newTransactions[index] = { ...newTransactions[index], ...updatedTransaction };
                handleTransactionsChange(newTransactions);
              }}
              onDeleteTransaction={(index) => {
                const newTransactions = transactions.filter((_, i) => i !== index);
                handleTransactionsChange(newTransactions);
              }}
              onAddTransaction={(transaction) => {
                handleTransactionsChange([...transactions, transaction]);
              }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              dragOverCategory={dragOverCategory}
              recentlyDropped={recentlyDropped}
              month={monthString}
              isDark={isDark}
              onTransactionsChange={(newTransactions: Transaction[]) => {
                const updatedTransactions = transactions.filter(t => t.category !== 'Essentials').concat(newTransactions);
                handleTransactionsChange(updatedTransactions);
              }}
            />
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
} 