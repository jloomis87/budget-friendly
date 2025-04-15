import { useCallback } from 'react';
import { useCategories } from '../contexts/CategoryContext';

export const useCategorizer = () => {
  const { categories } = useCategories();
  
  // Function to categorize a transaction based on description and amount
  const categorizeTransaction = useCallback((description: string, amount: number): string => {
    // Income is always positive
    if (amount > 0) {
      return 'Income';
    }
    
    // Convert description to lowercase for case-insensitive matching
    const desc = description.toLowerCase();
    
    // Common keywords for each category
    const categoryKeywords: Record<string, string[]> = {
      Essentials: [
        'rent', 'mortgage', 'electric', 'water', 'gas', 'grocery', 'groceries', 
        'food', 'pharmacy', 'doctor', 'medical', 'insurance', 'bill', 'utility',
        'phone', 'internet', 'tax', 'medication', 'health'
      ],
      Wants: [
        'restaurant', 'cafe', 'coffee', 'cinema', 'movie', 'theater', 'amazon', 
        'shopping', 'travel', 'hotel', 'flight', 'subscription', 'entertainment',
        'dining', 'game', 'book', 'clothing', 'gift', 'streaming', 'hobby'
      ],
      Savings: [
        'investment', '401k', 'ira', 'saving', 'deposit', 'transfer to', 
        'vanguard', 'fidelity', 'retirement', 'fund', 'stock', 'bond', 'etf'
      ]
    };
    
    // For custom categories, allow them to define keywords in their name/icon
    const nonDefaultCategories = categories.filter(cat => 
      !cat.isDefault && cat.name !== 'Income' && !cat.isIncome
    );
    
    // Check if the description matches any of the keywords for default categories
    for (const category of categories) {
      // Skip Income category
      if (category.isIncome) continue;
      
      // Get the keywords for this category (default or user-defined)
      let keywords = categoryKeywords[category.name] || [];
      
      // Add the category name itself as a keyword for custom categories
      if (!category.isDefault) {
        keywords = [...keywords, category.name.toLowerCase()];
      }
      
      // Check if any keyword matches
      if (keywords.some(keyword => desc.includes(keyword.toLowerCase()))) {
        return category.name;
      }
    }
    
    // Default to Essentials if no match is found
    return 'Essentials';
  }, [categories]);
  
  return { categorizeTransaction };
}; 