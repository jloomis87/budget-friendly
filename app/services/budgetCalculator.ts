import type { Transaction } from './fileParser';

export interface BudgetSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  categories: {
    essentials: number;
    wants: number;
    savings: number;
  };
  percentages: {
    essentials: number;
    wants: number;
    savings: number;
  };
}

export interface BudgetPlan {
  income: number;
  recommended: {
    essentials: number;  // 50%
    wants: number;       // 30%
    savings: number;     // 20%
  };
  actual: {
    essentials: number;
    wants: number;
    savings: number;
  };
  differences: {
    essentials: number;
    wants: number;
    savings: number;
  };
}

// Calculate budget summary from transactions
export const calculateBudgetSummary = (transactions: Transaction[]): BudgetSummary => {
  // Initialize summary
  const summary: BudgetSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    netCashflow: 0,
    categories: {
      essentials: 0,
      wants: 0,
      savings: 0
    },
    percentages: {
      essentials: 0,
      wants: 0,
      savings: 0
    }
  };

  // Process each transaction
  transactions.forEach(transaction => {
    const { amount, category } = transaction;
    
    // Calculate income and expenses
    if (amount > 0) {
      summary.totalIncome += amount;
    } else {
      // Convert to positive for easier calculations
      const expenseAmount = Math.abs(amount);
      summary.totalExpenses += expenseAmount;
      
      // Categorize expenses
      switch (category) {
        case 'Essentials':
          summary.categories.essentials += expenseAmount;
          break;
        case 'Wants':
          summary.categories.wants += expenseAmount;
          break;
        case 'Savings':
          summary.categories.savings += expenseAmount;
          break;
      }
    }
  });
  
  // Calculate net cashflow
  summary.netCashflow = summary.totalIncome - summary.totalExpenses;
  
  // Calculate percentages if there are expenses
  if (summary.totalExpenses > 0) {
    summary.percentages.essentials = (summary.categories.essentials / summary.totalExpenses) * 100;
    summary.percentages.wants = (summary.categories.wants / summary.totalExpenses) * 100;
    summary.percentages.savings = (summary.categories.savings / summary.totalExpenses) * 100;
  }
  
  return summary;
};

// Create a 50/30/20 budget plan
export const create503020Plan = (summary: BudgetSummary): BudgetPlan => {
  const income = summary.totalIncome;
  
  // Calculate recommended amounts based on 50/30/20 rule
  const recommended = {
    essentials: income * 0.5,  // 50% for essentials
    wants: income * 0.3,       // 30% for wants
    savings: income * 0.2      // 20% for savings
  };
  
  // Get actual spending
  const actual = {
    essentials: summary.categories.essentials,
    wants: summary.categories.wants,
    savings: summary.categories.savings,
  };
  
  // Calculate differences (recommended - actual)
  const differences = {
    essentials: recommended.essentials - actual.essentials,
    wants: recommended.wants - actual.wants,
    savings: recommended.savings - actual.savings
  };
  
  return {
    income,
    recommended,
    actual,
    differences
  };
};

// Get suggestions based on the budget plan
export const getBudgetSuggestions = (plan: BudgetPlan): string[] => {
  const suggestions: string[] = [];
  
  // Check if income is sufficient
  if (plan.income === 0) {
    suggestions.push('No income detected. Please make sure your bank statement includes income transactions.');
    return suggestions;
  }
  
  // Add suggestions based on differences
  if (plan.differences.essentials < 0) {
    const overspending = Math.abs(plan.differences.essentials).toFixed(2);
    suggestions.push(`You're spending $${overspending} more than recommended on essentials. Consider reviewing your essential expenses to find areas to cut back.`);
  } else if (plan.differences.essentials > 0) {
    const underspending = plan.differences.essentials.toFixed(2);
    suggestions.push(`You're spending $${underspending} less than the recommended amount on essentials, which is great!`);
  }
  
  if (plan.differences.wants < 0) {
    const overspending = Math.abs(plan.differences.wants).toFixed(2);
    suggestions.push(`You're spending $${overspending} more than recommended on wants. Try to reduce discretionary spending on non-essential items.`);
  } else if (plan.differences.wants > 0) {
    const underspending = plan.differences.wants.toFixed(2);
    suggestions.push(`You're spending $${underspending} less than the recommended amount on wants, which gives you more to save or pay down debt.`);
  }
  
  if (plan.differences.savings < 0) {
    const undersaving = Math.abs(plan.differences.savings).toFixed(2);
    suggestions.push(`You're saving $${undersaving} less than recommended. Try to increase your savings rate to reach the 20% goal.`);
  } else if (plan.differences.savings > 0) {
    const oversaving = plan.differences.savings.toFixed(2);
    suggestions.push(`You're saving $${oversaving} more than the recommended amount, which is excellent for your financial future!`);
  }
  
  // Add suggestion for unknown category if significant
  if (plan.actual.unknown > 0.1 * plan.income) {
    suggestions.push(`You have a significant amount ($${plan.actual.unknown.toFixed(2)}) in uncategorized expenses. Review these transactions to better understand your spending patterns.`);
  }
  
  return suggestions;
}; 