import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Define available currencies with their symbols and code
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'INR';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
};

interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrency: (currencyCode: CurrencyCode) => void;
  formatCurrency: (amount: number) => string;
  availableCurrencies: CurrencyInfo[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<CurrencyInfo>(CURRENCIES.USD);
  
  // Load saved currency preference from localStorage
  useEffect(() => {
    const loadCurrencyPreference = () => {
      if (user) {
        const savedCurrency = localStorage.getItem(`currency_preference_${user.uid}`);
        if (savedCurrency && CURRENCIES[savedCurrency as CurrencyCode]) {
          setCurrencyState(CURRENCIES[savedCurrency as CurrencyCode]);
        }
      } else {
        const savedCurrency = localStorage.getItem('currency_preference');
        if (savedCurrency && CURRENCIES[savedCurrency as CurrencyCode]) {
          setCurrencyState(CURRENCIES[savedCurrency as CurrencyCode]);
        }
      }
    };
    
    loadCurrencyPreference();
  }, [user]);
  
  // Save currency preference to localStorage when it changes
  const setCurrency = (currencyCode: CurrencyCode) => {
    setCurrencyState(CURRENCIES[currencyCode]);
    if (user) {
      localStorage.setItem(`currency_preference_${user.uid}`, currencyCode);
    } else {
      localStorage.setItem('currency_preference', currencyCode);
    }
  };
  
  // Format currency with the current settings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
    }).format(amount);
  };
  
  // Make all currencies available for selection
  const availableCurrencies = Object.values(CURRENCIES);
  
  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, availableCurrencies }}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Custom hook to use the currency context
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}; 