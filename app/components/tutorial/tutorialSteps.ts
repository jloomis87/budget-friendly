import { TutorialStep } from './TutorialOverlay';

export const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Friendly Budgets!",
    description: "Now that you've added your income, let's explore the app's features. We'll show you how to make the most of your budget. Click Continue to proceed.",
    elementId: "friendly-budgets-logo",
    position: "bottom",
    padding: 10
  },
  {
    title: "Budget Selector",
    description: "This is your budget selector. You can create multiple budgets for different purposes and switch between them easily.",
    elementId: "budget-selector",
    position: "bottom",
    padding: 5
  },
  {
    title: "Month Selector",
    description: "The month selector allows you to view and manage your transactions across different months. You can select multiple months to see data over time.",
    elementId: "month-selector",
    position: "bottom",
    padding: 5
  },
  {
    title: "Essentials Category",
    description: "The Essentials category is for your necessary expenses like rent, utilities, and groceries. These are typically your highest priority expenses.",
    elementId: "category-essentials",
    position: "right",
    padding: 5
  },
  {
    title: "Wants Category",
    description: "The Wants category is for discretionary spending like entertainment, dining out, and hobbies. These are nice to have but not essential.",
    elementId: "category-wants",
    position: "right",
    padding: 5
  },
  {
    title: "Savings Category",
    description: "The Savings category helps you track money set aside for future goals. Building your savings is essential for financial security.",
    elementId: "category-savings",
    position: "right",
    padding: 5
  },
  {
    title: "Add New Category",
    description: "You can create custom categories to better organize your expenses. Click this button to add a new category tailored to your needs.",
    elementId: "add-category-button",
    position: "top",
    padding: 80
  },
  {
    title: 'Edit Category Names',
    description: 'You can change the name of a category by clicking the edit icon. Try updating the Essentials category name.',
    elementId: 'essentials-edit-button',
    position: 'right',
    padding: 10,
    scrollIntoView: true,
    scrollOffset: 100
  },
  {
    title: "Target Allocation",
    description: "Set your target budget allocation percentage for each category. This helps you plan how much of your income should go toward each expense type.",
    elementId: "essentials-target-allocation",
    position: "bottom",
    padding: 5,
    scrollIntoView: true,
    scrollOffset: -80
  },
  {
    title: "Current Allocation",
    description: "This shows how much of your total budget you're actually spending in this category. If it differs significantly from your target, you may want to adjust your spending or your allocation.",
    elementId: "essentials-current-allocation",
    position: "bottom",
    padding: 5,
    scrollIntoView: true,
    scrollOffset: -80
  },
  {
    title: "Transaction Total",
    description: "The total amount of all transactions in this category. This helps you track how much you're spending in each area of your budget.",
    elementId: "essentials-transaction-total",
    position: "bottom",
    padding: 5,
    scrollIntoView: true,
    scrollOffset: -80
  },
  {
    title: "Transaction Count",
    description: "This shows the number of transactions in each category, helping you understand your spending frequency across budget categories.",
    elementId: "essentials-transaction-count",
    position: "bottom",
    padding: 5,
    scrollIntoView: true,
    scrollOffset: -80
  },
  {
    title: "Sort Transactions",
    description: "Sort your transactions by date, amount, or description to organize and analyze your spending more effectively.",
    elementId: "essentials-transaction-sort",
    position: "bottom",
    padding: 5,
    scrollIntoView: true,
    scrollOffset: -80
  },
  {
    title: "Category Color",
    description: "Customize the color of each category to personalize your budget view and make it easier to visually distinguish between different expense types.",
    elementId: "essentials-category-color-picker",
    position: "bottom",
    padding: 5,
    scrollIntoView: true,
    scrollOffset: -80
  },
  {
    title: "Insights and Planning",
    description: "Switch to this tab to see visual breakdowns of your spending and get personalized budget recommendations based on your income and expenses.",
    elementId: "insights-tab",
    position: "bottom",
    padding: 5
  },
  {
    title: "You're Ready to Go!",
    description: "That's it! You're now ready to take control of your finances with Friendly Budgets. You can access this tutorial again from the Help menu if needed.",
    elementId: "friendly-budgets-logo",
    position: "bottom",
    padding: 10
  }
]; 