import type { Transaction } from './fileParser';

export interface BudgetSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  categories: {
    essentials: number;
    wants: number;
    savings: number;
    [key: string]: number; // Allow for dynamic categories
  };
  percentages: {
    essentials: number;
    wants: number;
    savings: number;
    [key: string]: number; // Allow for dynamic categories
  };
}

export interface BudgetPlan {
  income: number;
  recommended: {
    essentials: number;
    wants: number;
    savings: number;
    [key: string]: number; // Allow for dynamic categories
  };
  actual: {
    essentials: number;
    wants: number;
    savings: number;
    [key: string]: number; // Allow for dynamic categories
  };
  differences: {
    essentials: number;
    wants: number;
    savings: number;
    [key: string]: number; // Allow for dynamic categories
  };
}

// Calculate budget summary from transactions
export const calculateBudgetSummary = (transactions: Transaction[]): BudgetSummary => {
  // Initialize summary with default categories
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

  // First collect all unique category names from transactions
  const categoriesSet = new Set<string>();
  transactions.forEach(transaction => {
    if (transaction.category && transaction.category !== 'Income') {
      // Convert to lowercase to standardize category names
      const category = transaction.category.toLowerCase();
      categoriesSet.add(category);
    }
  });

  // Add any missing categories to the summary objects
  categoriesSet.forEach(category => {
    if (!(category in summary.categories)) {
      summary.categories[category] = 0;
      summary.percentages[category] = 0;
    }
  });

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
      
      // Categorize expenses - handle dynamically based on category
      if (category && category !== 'Income') {
        const lowerCategory = category.toLowerCase();
        
        // Check if this category exists in our summary
        if (lowerCategory in summary.categories) {
          summary.categories[lowerCategory] += expenseAmount;
        } else {
          // First check if there's a case mismatch
          const matchingCategory = Object.keys(summary.categories).find(
            cat => cat.toLowerCase() === lowerCategory
          );
          
          if (matchingCategory) {
            // Use the existing category with correct case
            summary.categories[matchingCategory] += expenseAmount;
          } else {
            // Add this new category
            summary.categories[lowerCategory] = expenseAmount;
            summary.percentages[lowerCategory] = 0; // Initialize percentage
          }
        }
      }
    }
  });
  
  // Calculate net cashflow
  summary.netCashflow = summary.totalIncome - summary.totalExpenses;
  
  // Calculate percentages if there are expenses
  if (summary.totalExpenses > 0) {
    // Calculate percentages for all categories
    Object.keys(summary.categories).forEach(category => {
      summary.percentages[category] = (summary.categories[category] / summary.totalExpenses) * 100;
    });
  }
  
  return summary;
};

// Create a budget plan based on custom ratios
export const create503020Plan = (summary: BudgetSummary, preferences?: { ratios?: { [key: string]: number } }): BudgetPlan => {
  const income = summary.totalIncome;
  
  // Use custom ratios from preferences if provided, otherwise use 50/30/20 rule
  const ratios = preferences?.ratios || {
    essentials: 50,
    wants: 30,
    savings: 20
  };
  
  // Initialize the recommended, actual, and differences objects
  const recommended: { [key: string]: number } = {};
  const actual: { [key: string]: number } = {
    essentials: summary.categories.essentials || 0,
    wants: summary.categories.wants || 0,
    savings: summary.categories.savings || 0,
  };
  const differences: { [key: string]: number } = {};
  
  // First, include all categories from the summary in the actual object
  Object.keys(summary.categories).forEach(category => {
    // Skip if it's already one of our standard categories
    if (!['essentials', 'wants', 'savings'].includes(category)) {
      actual[category] = summary.categories[category];
    }
  });
  
  // Calculate recommended amounts for each category based on ratios
  Object.keys(ratios).forEach(category => {
    // Convert percentage to decimal (e.g., 50% -> 0.5)
    const ratio = ratios[category] / 100;
    // Calculate recommended amount
    recommended[category] = income * ratio;
    
    // Ensure the actual object has this category
    if (typeof actual[category] === 'undefined') {
      actual[category] = 0;
    }
    
    // Calculate difference
    differences[category] = recommended[category] - actual[category];
  });
  
  // Calculate differences for categories not in ratios
  Object.keys(actual).forEach(category => {
    if (!(category in recommended)) {
      // For categories without specified ratios, set recommended to 0
      recommended[category] = 0;
      differences[category] = -actual[category]; // Spending without allocation is considered overspending
    }
  });
  
  return {
    income,
    recommended: recommended as BudgetPlan['recommended'],
    actual: actual as BudgetPlan['actual'],
    differences: differences as BudgetPlan['differences']
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
  
  // Add suggestions based on differences for all categories
  Object.keys(plan.differences).forEach(category => {
    const difference = plan.differences[category];
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1); // Capitalize first letter
    
    if (difference < 0) {
      const overspending = Math.abs(difference).toFixed(2);
      suggestions.push(`You're spending $${overspending} more than recommended on ${categoryName.toLowerCase()}. Consider reviewing your ${categoryName.toLowerCase()} expenses to find areas to cut back.`);
    } else if (difference > 0) {
      const underspending = difference.toFixed(2);
      
      if (category === 'savings') {
        suggestions.push(`You're saving $${underspending} more than the recommended amount, which is excellent for your financial future!`);
      } else {
        suggestions.push(`You're spending $${underspending} less than the recommended amount on ${categoryName.toLowerCase()}, which is great!`);
      }
    }
  });
  
  // Add suggestion for unknown category if significant
  if ('unknown' in plan.actual && plan.actual.unknown > 0.1 * plan.income) {
    suggestions.push(`You have a significant amount ($${plan.actual.unknown.toFixed(2)}) in uncategorized expenses. Review these transactions to better understand your spending patterns.`);
  }
  
  return suggestions;
}; 