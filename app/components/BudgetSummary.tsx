import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  AlertTitle,
  useTheme as useMuiTheme,
  LinearProgress,
  Chip,
  Stack,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Tooltip,
  Icon,
  Tab,
  Tabs,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress
} from '@mui/material';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import type { BudgetSummary as BudgetSummaryType, BudgetPlan } from '../services/budgetCalculator';
import type { BudgetPreferences } from './BudgetActions';
import { FinancialGoals } from './FinancialGoals';
import type { Transaction } from '../services/fileParser';
import type { FinancialGoal } from '../services/goalService';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import InfoIcon from '@mui/icons-material/Info';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Lazy load Chart.js components to avoid SSR issues
const LazyCharts = React.lazy(() => import('./LazyCharts'));

// Define interface for investment settings to ensure type safety
interface InvestmentSettings {
  initialInvestment: number;
  monthlyContribution: number;
  investmentYears: number;
  investmentType: 'sp500' | 'rothIra' | '401k' | 'bonds' | 'targetDate';
  estimatedReturnRate: number;
  inflationRate: number;
  showInflationAdjusted: boolean;
  taxBracket: number;
  showTaxImpact: boolean;
  feeRate: number;
  compareFees: boolean;
  highFeeRate: number;
  showDCA: boolean;
  lumpSumAmount: number;
  showRetirementCalc: boolean;
  retirementAge: number;
  currentAge: number;
  desiredRetirementIncome: number;
  retirementDrawdownRate: number;
  showHistoricalPerformance: boolean;
  selectedHistoricalPeriod: '2008crisis' | '2020covid' | '2010s' | 'dotcom';
  showPortfolioDiversification: boolean;
  portfolioAllocation: {
    stocks: number;
    bonds: number;
    cash: number;
    international: number;
  };
}

interface BudgetSummaryProps {
  summary: BudgetSummaryType;
  plan: BudgetPlan;
  suggestions: string[];
  preferences: BudgetPreferences;
  transactions: Transaction[];
  selectedMonths: string[];
  showActualAmounts: boolean;
  showPercentages: boolean;
  showDifferences: boolean;
  showProgressBars: boolean;
}

export function BudgetSummary({ summary, plan, suggestions, preferences, transactions, selectedMonths, showActualAmounts, showPercentages, showDifferences, showProgressBars }: BudgetSummaryProps) {
  const theme = useMuiTheme();
  const { mode } = useAppTheme();
  const { user } = useAuth();
  const [isBrowser, setIsBrowser] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const isDarkMode = mode === 'dark';
  const [monthlyTransactions, setMonthlyTransactions] = useState<Transaction[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Add new state variables for investment simulator
  const [initialInvestment, setInitialInvestment] = useState<number>(1000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(200);
  const [investmentYears, setInvestmentYears] = useState<number>(20);
  const [investmentType, setInvestmentType] = useState<'sp500' | 'rothIra' | '401k' | 'bonds' | 'targetDate'>('sp500');
  const [estimatedReturnRate, setEstimatedReturnRate] = useState<number>(investmentType === 'sp500' ? 10 : 8);
  const [inflationRate, setInflationRate] = useState<number>(2.5);
  const [showInflationAdjusted, setShowInflationAdjusted] = useState<boolean>(true);
  const [taxBracket, setTaxBracket] = useState<number>(22);
  const [showTaxImpact, setShowTaxImpact] = useState<boolean>(true);
  
  // Add fee comparison state variables
  const [feeRate, setFeeRate] = useState<number>(0.15); // 0.15% is a typical low-cost index fund fee
  const [compareFees, setCompareFees] = useState<boolean>(false);
  const [highFeeRate, setHighFeeRate] = useState<number>(1.0); // 1% is a typical actively managed fund fee
  
  // Add dollar cost averaging state variables
  const [showDCA, setShowDCA] = useState<boolean>(false);
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(monthlyContribution * 12);

  // Add retirement calculator state variables
  const [showRetirementCalc, setShowRetirementCalc] = useState<boolean>(false);
  const [retirementAge, setRetirementAge] = useState<number>(65);
  const [currentAge, setCurrentAge] = useState<number>(30);
  const [desiredRetirementIncome, setDesiredRetirementIncome] = useState<number>(60000);
  const [retirementDrawdownRate, setRetirementDrawdownRate] = useState<number>(4); // 4% rule
  
  // Add historical performance state variables
  const [showHistoricalPerformance, setShowHistoricalPerformance] = useState<boolean>(false);
  const [selectedHistoricalPeriod, setSelectedHistoricalPeriod] = useState<'2008crisis' | '2020covid' | '2010s' | 'dotcom'>('2010s');

  // Add portfolio diversification state variables
  const [showPortfolioDiversification, setShowPortfolioDiversification] = useState<boolean>(false);
  const [portfolioAllocation, setPortfolioAllocation] = useState<{
    stocks: number;
    bonds: number;
    cash: number;
    international: number;
  }>({
    stocks: 60,
    bonds: 30,
    cash: 5,
    international: 5
  });

  // Load saved investment settings when component mounts
  useEffect(() => {
    const loadInvestmentSettings = async () => {
      if (!user) return;
      
      try {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (userData?.investmentSettings) {
            const settings = userData.investmentSettings as InvestmentSettings;
            
            // Update all state variables with saved settings
            setInitialInvestment(settings.initialInvestment);
            setMonthlyContribution(settings.monthlyContribution);
            setInvestmentYears(settings.investmentYears);
            setInvestmentType(settings.investmentType);
            setEstimatedReturnRate(settings.estimatedReturnRate);
            setInflationRate(settings.inflationRate);
            setShowInflationAdjusted(settings.showInflationAdjusted);
            setTaxBracket(settings.taxBracket);
            setShowTaxImpact(settings.showTaxImpact);
            setFeeRate(settings.feeRate);
            setCompareFees(settings.compareFees);
            setHighFeeRate(settings.highFeeRate);
            setShowDCA(settings.showDCA);
            setLumpSumAmount(settings.lumpSumAmount);
            setShowRetirementCalc(settings.showRetirementCalc);
            setRetirementAge(settings.retirementAge);
            setCurrentAge(settings.currentAge);
            setDesiredRetirementIncome(settings.desiredRetirementIncome);
            setRetirementDrawdownRate(settings.retirementDrawdownRate);
            setShowHistoricalPerformance(settings.showHistoricalPerformance);
            setSelectedHistoricalPeriod(settings.selectedHistoricalPeriod);
            setShowPortfolioDiversification(settings.showPortfolioDiversification);
            setPortfolioAllocation(settings.portfolioAllocation);
            
            console.log('[BudgetSummary] Loaded investment settings from Firebase');
          }
        }
      } catch (error) {
        console.error('[BudgetSummary] Error loading investment settings:', error);
      }
    };
    
    loadInvestmentSettings();
  }, [user]);

  // Save investment settings to Firebase when they change
  const saveInvestmentSettings = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      const userDocRef = doc(db, 'users', user.id);
      
      // Collect all settings into a single object
      const investmentSettings: InvestmentSettings = {
        initialInvestment,
        monthlyContribution,
        investmentYears,
        investmentType,
        estimatedReturnRate,
        inflationRate,
        showInflationAdjusted,
        taxBracket,
        showTaxImpact,
        feeRate,
        compareFees,
        highFeeRate,
        showDCA,
        lumpSumAmount,
        showRetirementCalc,
        retirementAge,
        currentAge,
        desiredRetirementIncome,
        retirementDrawdownRate,
        showHistoricalPerformance,
        selectedHistoricalPeriod,
        showPortfolioDiversification,
        portfolioAllocation
      };
      
      // Update the user document
      await updateDoc(userDocRef, {
        investmentSettings,
        'preferences.lastInvestmentUpdate': new Date().toISOString()
      });
      
      setLastSaved(new Date());
      console.log('[BudgetSummary] Saved investment settings to Firebase');
    } catch (error) {
      console.error('[BudgetSummary] Error saving investment settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced save function to avoid too many Firebase writes
  useEffect(() => {
    if (!user) return;
    
    const saveTimer = setTimeout(() => {
      saveInvestmentSettings();
    }, 2000); // Save 2 seconds after changes stop
    
    return () => clearTimeout(saveTimer);
  }, [
    initialInvestment,
    monthlyContribution,
    investmentYears,
    investmentType,
    estimatedReturnRate,
    inflationRate,
    showInflationAdjusted,
    taxBracket,
    showTaxImpact,
    feeRate,
    compareFees,
    highFeeRate,
    showDCA,
    lumpSumAmount,
    showRetirementCalc,
    retirementAge,
    currentAge,
    desiredRetirementIncome,
    retirementDrawdownRate,
    showHistoricalPerformance,
    selectedHistoricalPeriod,
    showPortfolioDiversification,
    portfolioAllocation,
    user
  ]);

  // Filter transactions for selected months
  const filteredTransactions = useMemo(() => {
    if (!transactions || !selectedMonths || selectedMonths.length === 0) {
      console.log('No transactions or selected months');
      return [];
    }
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionMonth = transactionDate.toLocaleString('default', { month: 'long' });
      const isIncluded = selectedMonths.includes(transactionMonth);
      console.log('Transaction:', {
        date: transactionDate,
        month: transactionMonth,
        amount: transaction.amount,
        category: transaction.category,
        isIncluded
      });
      return isIncluded;
    });
  }, [transactions, selectedMonths]);

  // Calculate category totals from filtered transactions
  const categoryTotals = useMemo(() => {
    console.log('Calculating category totals from filtered transactions:', filteredTransactions);
    
    const totals = {
      essentials: 0,
      wants: 0,
      savings: 0,
      income: 0
    };

    filteredTransactions.forEach(transaction => {
      // Handle income
      if (transaction.amount >= 0) {
        console.log('Adding income:', transaction.amount);
        totals.income += transaction.amount;
        return;
      }

      // Handle expenses (negative amounts)
      const amount = Math.abs(transaction.amount);
      let category = (transaction.category || 'essentials').toLowerCase();
      console.log('Processing expense:', { amount, category });
      
      // Normalize category names
      if (category.includes('essential')) category = 'essentials';
      else if (category.includes('want')) category = 'wants';
      else if (category.includes('saving')) category = 'savings';
      else category = 'essentials'; // Default to essentials if no match

      console.log('Normalized category:', category);

      if (category in totals) {
        totals[category as keyof typeof totals] += amount;
        console.log(`Updated ${category} total:`, totals[category as keyof typeof totals]);
      }
    });

    console.log('Final category totals:', totals);
    return totals;
  }, [filteredTransactions]);

  // Keep track of monthly transactions
  useEffect(() => {
    setMonthlyTransactions(filteredTransactions);
  }, [filteredTransactions]);

  // Only render charts on the client side
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Listen for tab switch events
  useEffect(() => {
    const handleSwitchToInsights = (event: CustomEvent) => {
      setActiveTab(event.detail.tabIndex);
    };

    window.addEventListener('switchToInsights', handleSwitchToInsights as EventListener);
    return () => {
      window.removeEventListener('switchToInsights', handleSwitchToInsights as EventListener);
    };
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  // Calculate progress and status
  const calculateProgress = (actual: number, target: number) => {
    const progress = (actual / target) * 100;
    let status: 'success' | 'warning' | 'error' = 'success';
    
    if (progress > 100) {
      status = 'error';
    } else if (progress > 90) {
      status = 'warning';
    }

    return { progress, status };
  };

  // Calculate monthly trends for the chart
  const calculateMonthlyTrends = () => {
    const monthlyData: { [key: string]: { month: string; essentials: number; wants: number; savings: number; income: number } } = {};

    // Initialize monthly data for selected months
    selectedMonths.forEach(month => {
      monthlyData[month] = {
        month,
        essentials: 0,
        wants: 0,
        savings: 0,
        income: 0,
      };
    });

    // Aggregate transactions by month and category
    monthlyTransactions.forEach(transaction => {
      const month = new Date(transaction.date).toLocaleString('default', { month: 'long' });
      if (monthlyData[month]) {
        if (transaction.amount > 0) {
          monthlyData[month].income += transaction.amount;
        } else {
          const amount = Math.abs(transaction.amount);
          switch (transaction.category) {
            case 'Essentials':
              monthlyData[month].essentials += amount;
              break;
            case 'Wants':
              monthlyData[month].wants += amount;
              break;
            case 'Savings':
              monthlyData[month].savings += amount;
              break;
          }
        }
      }
    });

    return Object.values(monthlyData);
  };

  // Prepare chart data
  const monthlyTrends = calculateMonthlyTrends();
  
  // Prepare data for the trends chart
  const trendChartData = {
    labels: monthlyTrends.map(data => data.month),
    datasets: [
      {
        label: preferences?.categoryCustomization?.essentials?.name || 'Essentials',
        data: monthlyTrends.map(data => data.essentials),
        borderColor: preferences?.categoryCustomization?.essentials?.color || '#2196f3',
        backgroundColor: `${preferences?.categoryCustomization?.essentials?.color || '#2196f3'}33`,
        fill: true,
        tension: 0.4,
      },
      {
        label: preferences?.categoryCustomization?.wants?.name || 'Wants',
        data: monthlyTrends.map(data => data.wants),
        borderColor: preferences?.categoryCustomization?.wants?.color || '#ff9800',
        backgroundColor: `${preferences?.categoryCustomization?.wants?.color || '#ff9800'}33`,
        fill: true,
        tension: 0.4,
      },
      {
        label: preferences?.categoryCustomization?.savings?.name || 'Savings',
        data: monthlyTrends.map(data => data.savings),
        borderColor: preferences?.categoryCustomization?.savings?.color || '#4caf50',
        backgroundColor: `${preferences?.categoryCustomization?.savings?.color || '#4caf50'}33`,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(tickValue: number | string) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(Number(tickValue));
          },
        },
      },
    },
  };

  // Update return rate when investment type changes
  useEffect(() => {
    switch(investmentType) {
      case 'sp500':
        setEstimatedReturnRate(10); // Historical average for S&P 500 is around 10%
        break;
      case 'rothIra':
        setEstimatedReturnRate(8); // Typical conservative estimate for mixed portfolio in Roth IRA
        break;
      case '401k':
        setEstimatedReturnRate(7); // Typical 401k with a mix of stocks and bonds
        break;
      case 'bonds':
        setEstimatedReturnRate(4); // Conservative bond returns
        break;
      case 'targetDate':
        setEstimatedReturnRate(6); // Target date funds typically have moderate returns
        break;
      default:
        setEstimatedReturnRate(8);
    }
  }, [investmentType]);
  
  // Calculate investment growth
  const calculateInvestmentGrowth = () => {
    const monthlyRate = estimatedReturnRate / 100 / 12;
    const monthlyInflationRate = inflationRate / 100 / 12;
    const totalMonths = investmentYears * 12;
    
    let growth = [];
    let currentValue = initialInvestment;
    let inflationAdjustedValue = initialInvestment;
    let inflationFactor = 1;
    
    for (let month = 0; month <= totalMonths; month++) {
      // Calculate inflation factor for this month
      if (month > 0) {
        inflationFactor *= (1 + monthlyInflationRate);
      }
      
      if (month === 0) {
        growth.push({
          month,
          year: 0,
          nominal: currentValue,
          adjusted: currentValue
        });
      } else {
        // Add interest for the month
        currentValue = currentValue * (1 + monthlyRate) + monthlyContribution;
        
        // Calculate inflation-adjusted value
        inflationAdjustedValue = currentValue / inflationFactor;
        
        // Store data every 12 months (annually)
        if (month % 12 === 0) {
          growth.push({
            month,
            year: month / 12,
            nominal: currentValue,
            adjusted: inflationAdjustedValue
          });
        }
      }
    }
    
    return growth;
  };
  
  // Generate investment growth data
  const investmentGrowth = useMemo(() => calculateInvestmentGrowth(), [
    initialInvestment, 
    monthlyContribution, 
    investmentYears, 
    estimatedReturnRate, 
    inflationRate
  ]);
  
  // Format investment chart data
  const investmentChartData = {
    labels: investmentGrowth.map(data => `Year ${data.year}`),
    datasets: [
      {
        label: 'Nominal Value',
        data: investmentGrowth.map(data => data.nominal),
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}33`,
        fill: false,
        tension: 0.1,
      },
      ...(showInflationAdjusted ? [{
        label: 'Inflation-Adjusted Value',
        data: investmentGrowth.map(data => data.adjusted),
        borderColor: theme.palette.secondary.main,
        backgroundColor: `${theme.palette.secondary.main}33`,
        fill: false,
        tension: 0.1,
      }] : []),
    ],
  };
  
  // Chart options
  const investmentChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };
  
  // Calculate total contributions and growth
  const totalContributions = initialInvestment + (monthlyContribution * investmentYears * 12);
  const finalValue = investmentGrowth[investmentGrowth.length - 1].nominal;
  const interestEarned = finalValue - totalContributions;

  // Calculate tax savings for tax-advantaged accounts
  const calculateTaxSavings = () => {
    // For 401k, calculate immediate tax savings on contributions
    if (investmentType === '401k') {
      const annualContribution = monthlyContribution * 12;
      const annualTaxSavings = annualContribution * (taxBracket / 100);
      return annualTaxSavings * investmentYears;
    }
    
    // For Roth IRA, calculate tax savings on growth (withdrawals are tax-free)
    if (investmentType === 'rothIra') {
      const taxOnGrowth = interestEarned * (taxBracket / 100);
      return taxOnGrowth;
    }
    
    // For other accounts, no specific tax advantages in this simple model
    return 0;
  };

  // Calculate after-tax value for taxable accounts
  const calculateAfterTaxValue = () => {
    switch(investmentType) {
      case 'rothIra':
        // Roth IRA withdrawals are tax-free
        return finalValue;
      case '401k':
        // 401k withdrawals are taxed as income
        return finalValue - (finalValue - totalContributions) * (taxBracket / 100);
      default:
        // For taxable accounts, apply capital gains tax to earnings
        // This is simplified - in reality, it would depend on holding period and tax laws
        const capitalGainsTaxRate = taxBracket > 24 ? 20 : (taxBracket > 12 ? 15 : 10);
        return totalContributions + (interestEarned * (1 - (capitalGainsTaxRate / 100)));
    }
  };

  const taxSavings = calculateTaxSavings();
  const afterTaxValue = calculateAfterTaxValue();

  // Add risk assessment variables
  const getInvestmentRisk = (): { risk: 'low' | 'moderate' | 'high', volatility: number } => {
    switch(investmentType) {
      case 'sp500':
        return { risk: 'high', volatility: 15 }; // Higher historical volatility
      case 'rothIra':
      case '401k':
      case 'targetDate':
        return { risk: 'moderate', volatility: 10 }; // Moderate with mixed allocation
      case 'bonds':
        return { risk: 'low', volatility: 5 }; // Lower volatility
      default:
        return { risk: 'moderate', volatility: 10 };
    }
  };

  // Calculate the impact of fees on final value
  const calculateFeeImpact = (principal: number, annualReturn: number, years: number, feePercentage: number) => {
    const monthlyRate = (annualReturn - feePercentage) / 100 / 12;
    const totalMonths = years * 12;
    
    let currentValue = principal;
    
    for (let month = 1; month <= totalMonths; month++) {
      // Add interest for the month (after fees)
      currentValue = currentValue * (1 + monthlyRate) + monthlyContribution;
    }
    
    return currentValue;
  };

  // Calculate values with different fee structures
  const lowFeeValue = calculateFeeImpact(initialInvestment, estimatedReturnRate, investmentYears, feeRate);
  const highFeeValue = calculateFeeImpact(initialInvestment, estimatedReturnRate, investmentYears, highFeeRate);
  const feeSavings = lowFeeValue - highFeeValue;

  // Calculate risk scenarios
  const { risk, volatility } = getInvestmentRisk();
  const bestCaseReturn = estimatedReturnRate + volatility / 2;
  const worstCaseReturn = Math.max(1, estimatedReturnRate - volatility); // Ensure return is at least 1%

  const bestCaseValue = calculateFeeImpact(initialInvestment, bestCaseReturn, investmentYears, feeRate);
  const worstCaseValue = calculateFeeImpact(initialInvestment, worstCaseReturn, investmentYears, feeRate);

  // Calculate lump sum vs DCA investment outcomes
  const calculateLumpSumVsDCA = () => {
    // For simplicity, we'll simulate a 12-month period
    const monthlyRate = estimatedReturnRate / 100 / 12;
    const months = 12;
    
    // Lump sum: Invest all at once
    let lumpSumValue = lumpSumAmount;
    for (let i = 0; i < months; i++) {
      lumpSumValue *= (1 + monthlyRate);
    }
    
    // DCA: Invest monthly
    let dcaValue = 0;
    const monthlyInvestment = lumpSumAmount / months;
    for (let i = 0; i < months; i++) {
      dcaValue += monthlyInvestment;
      dcaValue *= (1 + monthlyRate);
    }
    
    return {
      lumpSumValue,
      dcaValue,
      difference: lumpSumValue - dcaValue,
      percentDifference: ((lumpSumValue - dcaValue) / dcaValue) * 100
    };
  };

  // Calculate retirement readiness
  const calculateRetirementReadiness = () => {
    const yearsToRetirement = retirementAge - currentAge;
    
    // If already at retirement age
    if (yearsToRetirement <= 0) {
      return {
        isReady: finalValue >= (desiredRetirementIncome / (retirementDrawdownRate / 100)),
        requiredAmount: desiredRetirementIncome / (retirementDrawdownRate / 100),
        fundingPercentage: Math.min(100, (finalValue / (desiredRetirementIncome / (retirementDrawdownRate / 100))) * 100),
        projectedMonthlyIncome: finalValue * (retirementDrawdownRate / 100) / 12,
        yearsToRetirement: 0
      };
    }
    
    // Calculate future value at retirement age
    const retirementFV = calculateFeeImpact(initialInvestment, estimatedReturnRate, yearsToRetirement, feeRate);
    const requiredAmount = desiredRetirementIncome / (retirementDrawdownRate / 100);
    
    return {
      isReady: retirementFV >= requiredAmount,
      requiredAmount,
      fundingPercentage: Math.min(100, (retirementFV / requiredAmount) * 100),
      projectedMonthlyIncome: retirementFV * (retirementDrawdownRate / 100) / 12,
      yearsToRetirement
    };
  };

  // Get DCA and retirement calculation results
  const dcaComparison = useMemo(() => calculateLumpSumVsDCA(), [lumpSumAmount, estimatedReturnRate]);
  const retirementStatus = useMemo(() => calculateRetirementReadiness(), [
    retirementAge, 
    currentAge, 
    desiredRetirementIncome, 
    retirementDrawdownRate,
    initialInvestment,
    estimatedReturnRate,
    investmentYears,
    feeRate,
    finalValue
  ]);

  // Define historical performance data for different periods
  const historicalPerformanceData = {
    '2008crisis': {
      name: '2008 Financial Crisis (2007-2009)',
      sp500: -38.5, // 2008 crash
      bonds: 5.2,
      cash: 1.8,
      international: -43.1,
      description: 'During the 2008 financial crisis, stock markets worldwide experienced severe downturns. Diversified portfolios with bonds fared better than all-equity investments.'
    },
    '2020covid': {
      name: 'COVID-19 Pandemic (2020)',
      sp500: 18.4, // Surprising annual return due to recovery
      bonds: 7.5,
      cash: 0.5,
      international: 11.2,
      description: 'Despite the initial sharp decline in March 2020, markets recovered significantly by year-end, demonstrating the importance of staying invested during market turbulence.'
    },
    '2010s': {
      name: 'Bull Market (2010-2019)',
      sp500: 13.6, // Average annual return
      bonds: 3.7,
      cash: 0.6,
      international: 5.5,
      description: 'The decade following the financial crisis saw one of the longest bull markets in history, with U.S. stocks significantly outperforming international markets.'
    },
    'dotcom': {
      name: 'Dot-com Bubble Burst (2000-2002)',
      sp500: -14.6, // Average annual return
      bonds: 8.3,
      cash: 3.2,
      international: -16.1,
      description: 'The collapse of the dot-com bubble led to significant losses in technology stocks. Bonds provided important diversification benefits during this period.'
    }
  };

  // Calculate portfolio performance based on allocation
  const calculatePortfolioPerformance = () => {
    // Normalize allocations to ensure they sum to 100%
    const total = Object.values(portfolioAllocation).reduce((sum, value) => sum + value, 0);
    const normalizedAllocation = {
      stocks: (portfolioAllocation.stocks / total) * 100,
      bonds: (portfolioAllocation.bonds / total) * 100,
      cash: (portfolioAllocation.cash / total) * 100,
      international: (portfolioAllocation.international / total) * 100
    };
    
    // Calculate expected return based on historical averages
    const expectedReturn = (
      (normalizedAllocation.stocks * 10) + // Long-term S&P 500 return ~10%
      (normalizedAllocation.bonds * 4) +   // Long-term bond return ~4%
      (normalizedAllocation.cash * 1.5) +  // Cash/money market ~1.5%
      (normalizedAllocation.international * 8)  // International stocks ~8%
    ) / 100;
    
    // Calculate risk/volatility (simplified)
    const volatility = (
      (normalizedAllocation.stocks * 15) +      // S&P 500 volatility ~15%
      (normalizedAllocation.bonds * 5) +        // Bond volatility ~5%
      (normalizedAllocation.cash * 0.5) +       // Cash volatility ~0.5%
      (normalizedAllocation.international * 18) // International volatility ~18%
    ) / 100;
    
    // Calculate historical performance for selected period
    const selectedPeriod = historicalPerformanceData[selectedHistoricalPeriod];
    const historicalReturn = (
      (normalizedAllocation.stocks * selectedPeriod.sp500) +
      (normalizedAllocation.bonds * selectedPeriod.bonds) +
      (normalizedAllocation.cash * selectedPeriod.cash) +
      (normalizedAllocation.international * selectedPeriod.international)
    ) / 100;
    
    return {
      expectedReturn,
      volatility,
      historicalReturn,
      normalizedAllocation
    };
  };

  // Calculate portfolio performance
  const portfolioPerformance = useMemo(() => calculatePortfolioPerformance(), [
    portfolioAllocation,
    selectedHistoricalPeriod
  ]);

  // Function to update a specific asset allocation while maintaining others proportionally
  const updateAssetAllocation = (asset: keyof typeof portfolioAllocation, newValue: number) => {
    const currentTotal = Object.values(portfolioAllocation).reduce((sum, value) => sum + value, 0);
    const difference = newValue - portfolioAllocation[asset];
    
    // Calculate remaining assets and their proportions
    const remainingAssets = Object.keys(portfolioAllocation).filter(key => key !== asset) as Array<keyof typeof portfolioAllocation>;
    const remainingTotal = remainingAssets.reduce((sum, key) => sum + portfolioAllocation[key], 0);
    
    // Create new allocation object
    const newAllocation = { ...portfolioAllocation, [asset]: newValue };
    
    // Adjust other allocations proportionally
    if (remainingTotal > 0) {
      remainingAssets.forEach(key => {
        const proportion = portfolioAllocation[key] / remainingTotal;
        newAllocation[key] = Math.max(0, portfolioAllocation[key] - (difference * proportion));
      });
    }
    
    // Ensure total is 100%
    const newTotal = Object.values(newAllocation).reduce((sum, value) => sum + value, 0);
    const scaleFactor = 100 / newTotal;
    
    Object.keys(newAllocation).forEach(key => {
      newAllocation[key as keyof typeof portfolioAllocation] = parseFloat((newAllocation[key as keyof typeof portfolioAllocation] * scaleFactor).toFixed(1));
    });
    
    setPortfolioAllocation(newAllocation);
  };

  // Calculate investment growth with custom return rate
  const calculateCustomGrowth = (returnRate: number) => {
    const monthlyRate = returnRate / 100 / 12;
    const totalMonths = investmentYears * 12;
    
    let currentValue = initialInvestment;
    
    for (let month = 1; month <= totalMonths; month++) {
      currentValue = currentValue * (1 + monthlyRate) + monthlyContribution;
    }
    
    return currentValue;
  };

  const portfolioProjectedValue = calculateCustomGrowth(portfolioPerformance.expectedReturn);

  return (
    <Box sx={{ mb: 4 }}>
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label="budget summary tabs"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
            }
          }}
        >
          <Tab label="Overview" />
          <Tab label="Goals" />
          <Tab label="Investment Simulation" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Income Summary */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Income
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  {formatCurrency(categoryTotals.income)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedMonths.length > 1 
                    ? `Average across ${selectedMonths.length} months` 
                    : selectedMonths.length === 1 
                      ? `Income for ${selectedMonths[0]}` 
                      : 'No months selected'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Category Cards */}
          {['essentials', 'wants', 'savings'].map((category) => {
            const defaultCategory = {
              name: category.charAt(0).toUpperCase() + category.slice(1),
              color: category === 'essentials' ? '#2196f3' : category === 'wants' ? '#ff9800' : '#4caf50',
              icon: category === 'essentials' ? '🏠' : category === 'wants' ? '🛍️' : '💰'
            };
            const customCategory = preferences && preferences.categoryCustomization ? 
              preferences.categoryCustomization[category as keyof typeof preferences.categoryCustomization] || defaultCategory : 
              defaultCategory;
            const actual = categoryTotals ? categoryTotals[category as keyof typeof categoryTotals] || 0 : 0;
            const target = plan && plan.recommended ? plan.recommended[category as keyof typeof plan.recommended] || 0 : 0;
            const difference = target - actual;
            const { progress, status } = calculateProgress(actual, target);

            return (
              <Grid item xs={12} md={4} key={category}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: customCategory?.color,
                            mr: 1,
                            width: 32,
                            height: 32,
                            fontSize: '0.875rem'
                          }}
                        >
                          {customCategory?.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="h6">
                          {customCategory?.name}
                        </Typography>
                      </Box>
                      <Chip 
                        label={formatPercentage((plan?.recommended?.[category as keyof typeof plan.recommended] || 0) / (plan?.income || 1) * 100)} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                      <Typography variant="h5" component="div">
                        {formatCurrency(actual)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        {showActualAmounts && `of ${formatCurrency(target)}`}
                      </Typography>
                    </Box>

                    {showProgressBars && (
                      <Box sx={{ mb: 2 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(target > 0 ? (actual / target) * 100 : 0, 100)} 
                          color={status}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {target > 0 
                              ? formatPercentage((actual / target) * 100)
                              : '0.0%'}
                          </Typography>
                          {showDifferences && (
                            <Typography 
                              variant="body2" 
                              color={difference > 0 ? 'success.main' : difference < 0 ? 'error.main' : 'text.secondary'}
                            >
                              {difference > 0 
                                ? `${formatCurrency(difference)} under` 
                                : difference < 0 
                                  ? `${formatCurrency(Math.abs(difference))} over` 
                                  : 'On target'}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Smart tip based on spending pattern */}
                    {filteredTransactions.length > 0 && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {category === 'essentials' && difference > 100 ? (
                            "Tip: You're staying under your essentials budget. Consider increasing your savings or fun spending with the extra funds."
                          ) : category === 'essentials' && difference < -100 ? (
                            "Tip: Your essential expenses are over budget. Look for ways to reduce recurring bills or necessary expenses."
                          ) : category === 'wants' && difference > 100 ? (
                            "Tip: You're spending less than budgeted on wants. This is great if you're saving for a goal, or you could treat yourself a bit more."
                          ) : category === 'wants' && difference < -100 ? (
                            "Tip: Consider reducing your discretionary spending to stay within your budget. Try setting spending limits for entertainment and shopping."
                          ) : category === 'savings' && difference > 100 ? (
                            "Tip: Great job saving extra! If desired, you could allocate some of this excess towards your 'wants' category as a reward for good financial habits."
                          ) : category === 'savings' && difference >= -100 ? (
                            "Tip: You're doing well with your savings. Maintain this habit to build financial security over time."
                          ) : category === 'savings' && difference < -100 ? (
                            "Tip: Consider setting up automatic transfers to your savings account when you receive income to make saving easier."
                          ) : progress > 100 ? (
                            category === 'essentials'
                              ? "Tip: Review recurring bills and look for potential savings on utilities, groceries, or insurance."
                              : "Tip: Consider delaying non-essential purchases until next month or finding less expensive alternatives."
                          ) : progress > 90 ? (
                            category === 'essentials'
                              ? "Tip: Be careful with any additional essential expenses this month to avoid going over budget."
                              : category === 'wants'
                                ? "Tip: Be mindful of any additional discretionary spending this month."
                                : "Tip: Monitor your savings rate closely for the rest of the month."
                          ) : (
                            category === 'essentials'
                              ? "Tip: Keep tracking essential expenses and look for long-term savings through better rates or eliminating unused subscriptions."
                              : category === 'wants'
                                ? "Tip: Plan purchases in advance and set spending limits for entertainment and discretionary items."
                                : "Tip: Consider increasing automatic transfers to savings if you consistently meet your budget goals."
                          )}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}

          {/* Monthly Spending Trends Chart */}
          <Grid item xs={12} sx={{ mt: 3 }}>
            <Card>
              <CardContent sx={{ height: '400px', p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Monthly Spending Trends
                </Typography>
                <Box sx={{ height: 'calc(100% - 30px)' }}>
                  <Line data={trendChartData} options={chartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Goals Tab */}
      {activeTab === 1 && (
        <FinancialGoals
          transactions={monthlyTransactions}
          selectedMonths={selectedMonths}
          totalIncome={categoryTotals.income}
        />
      )}

      {/* Investment Simulator Tab */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Investment Growth Simulator
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
              See how your money could grow over time through investments in the S&P 500 or a Roth IRA. Adjust the parameters below to customize your simulation.
            </Typography>
            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {isSaving ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Saving...
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={saveInvestmentSettings}
                      sx={{ mr: 2, fontSize: '0.75rem', py: 0.5 }}
                    >
                      Save Settings
                    </Button>
                    <Tooltip title="Your settings are automatically saved as you make changes. Use this button to manually save at any time.">
                      <InfoIcon fontSize="small" sx={{ mr: 1, opacity: 0.7, cursor: 'help' }} />
                    </Tooltip>
                    {lastSaved && (
                      <Typography variant="caption" color="success.main">
                        Last saved at {lastSaved.toLocaleTimeString()}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
          
          <Grid container spacing={3}>
            {/* Controls */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                    Investment Parameters
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Investment Vehicle
                    </Typography>
                    <ToggleButtonGroup
                      value={investmentType}
                      exclusive
                      onChange={(e, newValue) => {
                        if (newValue) setInvestmentType(newValue);
                      }}
                      aria-label="investment type"
                      size="small"
                      sx={{ mb: 2, flexWrap: 'wrap' }}
                    >
                      <ToggleButton value="sp500">
                        S&P 500
                      </ToggleButton>
                      <ToggleButton value="rothIra">
                        Roth IRA
                      </ToggleButton>
                      <ToggleButton value="401k">
                        401(k)
                      </ToggleButton>
                      <ToggleButton value="bonds">
                        Bonds
                      </ToggleButton>
                      <ToggleButton value="targetDate">
                        Target Date
                      </ToggleButton>
                    </ToggleButtonGroup>
                    
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {investmentType === 'sp500' ? 
                          'The S&P 500 index tracks 500 large US companies. Historical returns ~10% annually before inflation.' : 
                        investmentType === 'rothIra' ? 
                          'A Roth IRA offers tax-free growth and withdrawals in retirement. Contributions are made after-tax.' :
                        investmentType === '401k' ? 
                          'A 401(k) offers tax-deferred growth with pre-tax contributions, reducing your current taxable income.' :
                        investmentType === 'bonds' ? 
                          'Bonds typically offer lower returns than stocks but with reduced volatility and risk.' :
                          'Target date funds automatically adjust the asset allocation to become more conservative as you approach retirement.'}
                      </Typography>
                    </Box>

                    {/* Tax Bracket Selection - only show for tax-advantaged accounts */}
                    {(investmentType === 'rothIra' || investmentType === '401k') && (
                      <Box sx={{ mb: 2 }}>
                        <Typography id="tax-bracket-slider" gutterBottom display="flex" alignItems="center">
                          Tax Bracket: {taxBracket}%
                          <Tooltip title="Your current income tax bracket affects tax advantages of retirement accounts">
                            <InfoIcon fontSize="small" sx={{ ml: 1, opacity: 0.7 }} />
                          </Tooltip>
                        </Typography>
                        <Slider
                          value={taxBracket}
                          onChange={(e, newValue) => setTaxBracket(newValue as number)}
                          min={10}
                          max={37}
                          step={1}
                          marks={[
                            { value: 10, label: '10%' },
                            { value: 22, label: '22%' },
                            { value: 37, label: '37%' },
                          ]}
                          aria-labelledby="tax-bracket-slider"
                        />
                      </Box>
                    )}
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      label="Initial Investment"
                      type="number"
                      value={initialInvestment}
                      onChange={(e) => setInitialInvestment(Number(e.target.value))}
                      fullWidth
                      InputProps={{
                        startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                      }}
                      sx={{ mb: 2 }}
                    />
                    
                    <TextField
                      label="Monthly Contribution"
                      type="number"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      fullWidth
                      InputProps={{
                        startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                      }}
                      sx={{ mb: 2 }}
                    />
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography id="investment-years-slider" gutterBottom>
                        Investment Period: {investmentYears} years
                      </Typography>
                      <Slider
                        value={investmentYears}
                        onChange={(e, newValue) => setInvestmentYears(newValue as number)}
                        min={1}
                        max={40}
                        marks={[
                          { value: 1, label: '1y' },
                          { value: 10, label: '10y' },
                          { value: 20, label: '20y' },
                          { value: 30, label: '30y' },
                          { value: 40, label: '40y' },
                        ]}
                        aria-labelledby="investment-years-slider"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography id="return-rate-slider" gutterBottom>
                        Estimated Annual Return: {estimatedReturnRate}%
                      </Typography>
                      <Slider
                        value={estimatedReturnRate}
                        onChange={(e, newValue) => setEstimatedReturnRate(newValue as number)}
                        min={1}
                        max={15}
                        step={0.5}
                        marks={[
                          { value: 1, label: '1%' },
                          { value: 8, label: '8%' },
                          { value: 15, label: '15%' },
                        ]}
                        aria-labelledby="return-rate-slider"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography id="inflation-rate-slider" gutterBottom>
                        Inflation Rate: {inflationRate}%
                      </Typography>
                      <Slider
                        value={inflationRate}
                        onChange={(e, newValue) => setInflationRate(newValue as number)}
                        min={0}
                        max={8}
                        step={0.5}
                        marks={[
                          { value: 0, label: '0%' },
                          { value: 4, label: '4%' },
                          { value: 8, label: '8%' },
                        ]}
                        aria-labelledby="inflation-rate-slider"
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        Show inflation-adjusted value:
                      </Typography>
                      <ToggleButtonGroup
                        value={showInflationAdjusted ? 'show' : 'hide'}
                        exclusive
                        onChange={(e, newValue) => {
                          setShowInflationAdjusted(newValue === 'show');
                        }}
                        size="small"
                      >
                        <ToggleButton value="show">
                          Yes
                        </ToggleButton>
                        <ToggleButton value="hide">
                          No
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" gutterBottom>
                        Investment Fees
                      </Typography>
                      <ToggleButtonGroup
                        value={compareFees ? 'show' : 'hide'}
                        exclusive
                        onChange={(e, newValue) => {
                          setCompareFees(newValue === 'show');
                        }}
                        size="small"
                      >
                        <ToggleButton value="show">
                          Compare Fees
                        </ToggleButton>
                        <ToggleButton value="hide">
                          Hide
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Low-cost fund fee rate: {feeRate.toFixed(2)}%
                    </Typography>
                    <Slider
                      value={feeRate}
                      onChange={(e, newValue) => setFeeRate(newValue as number)}
                      min={0.03}
                      max={0.5}
                      step={0.01}
                      aria-labelledby="fee-rate-slider"
                      sx={{ mb: 2 }}
                    />

                    {compareFees && (
                      <>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          High-cost fund fee rate: {highFeeRate.toFixed(2)}%
                        </Typography>
                        <Slider
                          value={highFeeRate}
                          onChange={(e, newValue) => setHighFeeRate(newValue as number)}
                          min={0.5}
                          max={2.5}
                          step={0.1}
                          aria-labelledby="high-fee-rate-slider"
                        />
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Growth Visualization */}
            <Grid item xs={12} md={8}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                    Projected Growth - {investmentType === 'sp500' ? 'S&P 500 Index Fund' : investmentType === 'rothIra' ? 'Roth IRA' : investmentType === '401k' ? '401(k)' : investmentType === 'bonds' ? 'Bonds' : 'Target Date'}
                  </Typography>
                  
                  <Box sx={{ height: 350, mb: 3 }}>
                    <Line data={investmentChartData} options={investmentChartOptions} />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Total Contributions
                        </Typography>
                        <Typography variant="h6" fontWeight="medium">
                          {formatCurrency(totalContributions)}
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}>
                        <Typography variant="body2" color="primary.contrastText">
                          Final Value
                        </Typography>
                        <Typography variant="h6" fontWeight="medium" color="primary.contrastText">
                          {formatCurrency(finalValue)}
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Investment Growth
                        </Typography>
                        <Typography variant="h6" fontWeight="medium" color="success.main">
                          {formatCurrency(interestEarned)}
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  {/* Add a fourth card for Tax Impact */}
                  {showTaxImpact && (investmentType === 'rothIra' || investmentType === '401k') && (
                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Tax Impact
                        </Typography>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, height: '100%' }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Estimated Tax Savings
                              </Typography>
                              <Typography variant="h6" color="success.main">
                                {formatCurrency(taxSavings)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {investmentType === '401k' 
                                  ? 'Savings from income tax reduction on contributions'
                                  : 'Savings from tax-free growth and withdrawals'}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, height: '100%' }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                After-Tax Value
                              </Typography>
                              <Typography variant="h6">
                                {formatCurrency(afterTaxValue)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Estimated final value after applicable taxes
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          {investmentType === 'rothIra'
                            ? 'With a Roth IRA, you pay taxes on contributions now, but all qualified withdrawals in retirement are tax-free.'
                            : investmentType === '401k'
                              ? 'With a 401(k), you save on taxes now, but withdrawals in retirement are taxed as regular income.'
                              : 'Taxable investments are subject to capital gains taxes when you sell.'}
                        </Typography>
                      </Card>
                    </Grid>
                  )}

                  {/* Add risk assessment visualization after the chart */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Risk Assessment
                    </Typography>
                    
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Risk Level
                            </Typography>
                            <Box sx={{ 
                              display: 'inline-block', 
                              px: 2, 
                              py: 0.5, 
                              borderRadius: 1,
                              bgcolor: risk === 'low' ? 'success.light' : risk === 'moderate' ? 'warning.light' : 'error.light',
                              color: risk === 'low' ? 'success.dark' : risk === 'moderate' ? 'warning.dark' : 'error.dark',
                              fontWeight: 'medium'
                            }}>
                              {risk === 'low' ? 'Low' : risk === 'moderate' ? 'Moderate' : 'High'}
                            </Box>
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Volatility: ±{volatility}% annually
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={8}>
                          <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Potential Outcomes After {investmentYears} Years
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Typography variant="body2" sx={{ width: 90 }}>
                                Worst Case:
                              </Typography>
                              <Box sx={{ flex: 1, mx: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={100}
                                  sx={{ 
                                    height: 8, 
                                    borderRadius: 4,
                                    bgcolor: 'error.light',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: 'error.main',
                                    }
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(worstCaseValue)}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Typography variant="body2" sx={{ width: 90 }}>
                                Expected:
                              </Typography>
                              <Box sx={{ flex: 1, mx: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={100}
                                  sx={{ 
                                    height: 8, 
                                    borderRadius: 4,
                                    bgcolor: 'warning.light',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: 'warning.main',
                                    }
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(finalValue)}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ width: 90 }}>
                                Best Case:
                              </Typography>
                              <Box sx={{ flex: 1, mx: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={100}
                                  sx={{ 
                                    height: 8, 
                                    borderRadius: 4,
                                    bgcolor: 'success.light',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: 'success.main',
                                    }
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(bestCaseValue)}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Card>
                  </Box>

                  {/* Add fee comparison visualization if enabled */}
                  {compareFees && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Fee Comparison
                      </Typography>
                      
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Low-Cost Fund ({feeRate.toFixed(2)}% fee)
                              </Typography>
                              <Typography variant="h6" color="primary.main">
                                {formatCurrency(lowFeeValue)}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                High-Cost Fund ({highFeeRate.toFixed(2)}% fee)
                              </Typography>
                              <Typography variant="h6" color="text.secondary">
                                {formatCurrency(highFeeValue)}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12}>
                            <Box sx={{ 
                              textAlign: 'center', 
                              p: 2, 
                              mt: 1, 
                              bgcolor: 'success.light', 
                              color: 'success.dark',
                              borderRadius: 1 
                            }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Potential Savings with Low-Cost Fund
                              </Typography>
                              <Typography variant="h5" fontWeight="medium">
                                {formatCurrency(feeSavings)}
                              </Typography>
                              <Typography variant="caption">
                                That's {((feeSavings / highFeeValue) * 100).toFixed(1)}% more money in your account!
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>
                    </Box>
                  )}

                  {/* Add dollar cost averaging comparison: */}
                  <Box sx={{ mt: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1">
                        Dollar Cost Averaging vs. Lump Sum
                      </Typography>
                      <ToggleButtonGroup
                        value={showDCA ? 'show' : 'hide'}
                        exclusive
                        onChange={(e, newValue) => {
                          setShowDCA(newValue === 'show');
                        }}
                        size="small"
                      >
                        <ToggleButton value="show">
                          Show
                        </ToggleButton>
                        <ToggleButton value="hide">
                          Hide
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    
                    {showDCA && (
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Dollar Cost Averaging (DCA) is an investment strategy where you invest a fixed amount regularly over time, 
                          rather than investing all money as a lump sum. This can reduce the impact of market volatility.
                        </Typography>
                        
                        <Box sx={{ mb: 3 }}>
                          <TextField
                            label="Available Investment Amount"
                            type="number"
                            value={lumpSumAmount}
                            onChange={(e) => setLumpSumAmount(Number(e.target.value))}
                            fullWidth
                            InputProps={{
                              startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                            }}
                            sx={{ mb: 2 }}
                          />
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, height: '100%' }}>
                              <Typography variant="subtitle2" gutterBottom align="center">
                                Lump Sum (All at once)
                              </Typography>
                              <Typography variant="h6" align="center" color="primary.main">
                                {formatCurrency(dcaComparison.lumpSumValue)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" align="center">
                                Invest ${formatCurrency(lumpSumAmount)} all at once
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, height: '100%' }}>
                              <Typography variant="subtitle2" gutterBottom align="center">
                                Dollar Cost Averaging
                              </Typography>
                              <Typography variant="h6" align="center" color="primary.main">
                                {formatCurrency(dcaComparison.dcaValue)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" align="center">
                                Invest ${formatCurrency(lumpSumAmount / 12)} monthly for 12 months
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                              <Typography variant="body2" fontWeight="medium" color="primary.contrastText">
                                In this scenario, {dcaComparison.difference > 0 ? 'lump sum investing outperforms' : 'dollar cost averaging outperforms'} by {formatCurrency(Math.abs(dcaComparison.difference))} ({Math.abs(dcaComparison.percentDifference).toFixed(2)}%).
                                {dcaComparison.difference > 0 
                                  ? ' This reflects a rising market where earlier investment captures more growth.'
                                  : ' This reflects the benefit of buying at various price points, potentially reducing risk.'}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>
                    )}
                  </Box>

                  {/* Add retirement calculator integration: */}
                  <Box sx={{ mt: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1">
                        Retirement Calculator
                      </Typography>
                      <ToggleButtonGroup
                        value={showRetirementCalc ? 'show' : 'hide'}
                        exclusive
                        onChange={(e, newValue) => {
                          setShowRetirementCalc(newValue === 'show');
                        }}
                        size="small"
                      >
                        <ToggleButton value="show">
                          Show
                        </ToggleButton>
                        <ToggleButton value="hide">
                          Hide
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    
                    {showRetirementCalc && (
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          See if your investment strategy will support your retirement goals using the 4% rule 
                          (withdrawing 4% of your portfolio annually is considered sustainable for a 30-year retirement).
                        </Typography>
                        
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={5}>
                            <Box sx={{ mb: 2 }}>
                              <TextField
                                label="Current Age"
                                type="number"
                                value={currentAge}
                                onChange={(e) => setCurrentAge(Number(e.target.value))}
                                fullWidth
                                sx={{ mb: 2 }}
                              />
                              
                              <TextField
                                label="Retirement Age"
                                type="number"
                                value={retirementAge}
                                onChange={(e) => setRetirementAge(Number(e.target.value))}
                                fullWidth
                                sx={{ mb: 2 }}
                              />
                              
                              <TextField
                                label="Desired Annual Retirement Income"
                                type="number"
                                value={desiredRetirementIncome}
                                onChange={(e) => setDesiredRetirementIncome(Number(e.target.value))}
                                fullWidth
                                InputProps={{
                                  startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                                }}
                                sx={{ mb: 2 }}
                              />
                              
                              <Box sx={{ mb: 2 }}>
                                <Typography id="withdrawal-rate-slider" gutterBottom>
                                  Withdrawal Rate: {retirementDrawdownRate}%
                                </Typography>
                                <Slider
                                  value={retirementDrawdownRate}
                                  onChange={(e, newValue) => setRetirementDrawdownRate(newValue as number)}
                                  min={2}
                                  max={6}
                                  step={0.1}
                                  marks={[
                                    { value: 2, label: '2%' },
                                    { value: 4, label: '4%' },
                                    { value: 6, label: '6%' },
                                  ]}
                                  aria-labelledby="withdrawal-rate-slider"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  The 4% rule is a common guideline, but you can adjust based on your risk tolerance.
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={7}>
                            <Card variant="outlined" sx={{ mb: 3 }}>
                              <CardContent>
                                <Typography variant="subtitle2" gutterBottom>
                                  Retirement Readiness
                                </Typography>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="body2" gutterBottom>
                                    You need approximately {formatCurrency(retirementStatus.requiredAmount)} to generate {formatCurrency(desiredRetirementIncome)} annually in retirement.
                                  </Typography>
                                  
                                  <Box sx={{ mt: 2, mb: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                      <Typography variant="body2">
                                        Funding Progress
                                      </Typography>
                                      <Typography variant="body2" fontWeight="medium">
                                        {retirementStatus.fundingPercentage.toFixed(1)}%
                                      </Typography>
                                    </Box>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={retirementStatus.fundingPercentage}
                                      color={retirementStatus.fundingPercentage >= 100 ? "success" : retirementStatus.fundingPercentage >= 75 ? "info" : "warning"}
                                      sx={{ height: 10, borderRadius: 5 }}
                                    />
                                  </Box>
                                </Box>
                                
                                <Box sx={{ 
                                  p: 2, 
                                  borderRadius: 1, 
                                  bgcolor: retirementStatus.isReady ? 'success.light' : 'warning.light',
                                  color: retirementStatus.isReady ? 'success.dark' : 'warning.dark'
                                }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    {retirementStatus.isReady 
                                      ? "You're on track for retirement!" 
                                      : "You may need to adjust your strategy"}
                                  </Typography>
                                  <Typography variant="body2">
                                    {retirementStatus.isReady 
                                      ? `Your projected investments could provide approximately ${formatCurrency(retirementStatus.projectedMonthlyIncome)} monthly income in retirement.`
                                      : `To reach your goal, consider increasing your monthly contribution or adjusting your retirement age.`}
                                  </Typography>
                                </Box>
                                
                                {retirementStatus.yearsToRetirement > 0 && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                    You have {retirementStatus.yearsToRetirement} years until retirement. Stay consistent with your investment strategy to reach your goals.
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      </Card>
                    )}
                  </Box>

                  {/* Add historical performance comparison section to the UI */}
                  <Box sx={{ mt: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1">
                        Historical Performance
                      </Typography>
                      <ToggleButtonGroup
                        value={showHistoricalPerformance ? 'show' : 'hide'}
                        exclusive
                        onChange={(e, newValue) => {
                          setShowHistoricalPerformance(newValue === 'show');
                        }}
                        size="small"
                      >
                        <ToggleButton value="show">
                          Show
                        </ToggleButton>
                        <ToggleButton value="hide">
                          Hide
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    
                    {showHistoricalPerformance && (
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          See how your investment strategy would have performed during different historical market periods.
                        </Typography>
                        
                        <FormControl fullWidth sx={{ mb: 3 }}>
                          <InputLabel id="historical-period-label">Historical Period</InputLabel>
                          <Select
                            labelId="historical-period-label"
                            value={selectedHistoricalPeriod}
                            label="Historical Period"
                            onChange={(e) => setSelectedHistoricalPeriod(e.target.value as any)}
                          >
                            <MenuItem value="2010s">{historicalPerformanceData['2010s'].name}</MenuItem>
                            <MenuItem value="2008crisis">{historicalPerformanceData['2008crisis'].name}</MenuItem>
                            <MenuItem value="2020covid">{historicalPerformanceData['2020covid'].name}</MenuItem>
                            <MenuItem value="dotcom">{historicalPerformanceData['dotcom'].name}</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Market Performance during this Period
                              </Typography>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2">S&P 500:</Typography>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="medium"
                                  color={historicalPerformanceData[selectedHistoricalPeriod].sp500 >= 0 ? 'success.main' : 'error.main'}
                                >
                                  {historicalPerformanceData[selectedHistoricalPeriod].sp500}%
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2">Bonds:</Typography>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="medium"
                                  color={historicalPerformanceData[selectedHistoricalPeriod].bonds >= 0 ? 'success.main' : 'error.main'}
                                >
                                  {historicalPerformanceData[selectedHistoricalPeriod].bonds}%
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2">International:</Typography>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="medium"
                                  color={historicalPerformanceData[selectedHistoricalPeriod].international >= 0 ? 'success.main' : 'error.main'}
                                >
                                  {historicalPerformanceData[selectedHistoricalPeriod].international}%
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2">Cash:</Typography>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="medium"
                                  color={historicalPerformanceData[selectedHistoricalPeriod].cash >= 0 ? 'success.main' : 'error.main'}
                                >
                                  {historicalPerformanceData[selectedHistoricalPeriod].cash}%
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <Box sx={{ 
                                p: 2, 
                                bgcolor: portfolioPerformance.historicalReturn >= 0 ? 'success.light' : 'error.light', 
                                color: portfolioPerformance.historicalReturn >= 0 ? 'success.dark' : 'error.dark',
                                borderRadius: 1,
                                mb: 2,
                                flexGrow: 1
                              }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Your {investmentType === 'sp500' ? 'S&P 500' : investmentType === 'bonds' ? 'Bond' : investmentType} Investment
                                </Typography>
                                <Typography variant="h6">
                                  {portfolioPerformance.historicalReturn.toFixed(1)}%
                                </Typography>
                                <Typography variant="body2">
                                  Hypothetical annual return during this period
                                </Typography>
                              </Box>
                              
                              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {historicalPerformanceData[selectedHistoricalPeriod].description}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>
                    )}
                  </Box>

                  {/* Add portfolio diversification section to the UI */}
                  <Box sx={{ mt: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1">
                        Portfolio Diversification
                      </Typography>
                      <ToggleButtonGroup
                        value={showPortfolioDiversification ? 'show' : 'hide'}
                        exclusive
                        onChange={(e, newValue) => {
                          setShowPortfolioDiversification(newValue === 'show');
                        }}
                        size="small"
                      >
                        <ToggleButton value="show">
                          Show
                        </ToggleButton>
                        <ToggleButton value="hide">
                          Hide
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    
                    {showPortfolioDiversification && (
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Create a custom asset allocation to see how diversification affects your risk and potential returns.
                        </Typography>
                        
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                              Asset Allocation
                            </Typography>
                            
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2">U.S. Stocks: {portfolioAllocation.stocks}%</Typography>
                                <Typography variant="caption" color="text.secondary">Higher risk, higher potential return</Typography>
                              </Box>
                              <Slider
                                value={portfolioAllocation.stocks}
                                onChange={(e, newValue) => updateAssetAllocation('stocks', newValue as number)}
                                min={0}
                                max={100}
                                step={5}
                                aria-labelledby="stocks-allocation-slider"
                                sx={{ 
                                  '& .MuiSlider-track': { bgcolor: 'primary.main' },
                                  '& .MuiSlider-thumb': { bgcolor: 'primary.main' },
                                }}
                              />
                            </Box>
                            
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2">Bonds: {portfolioAllocation.bonds}%</Typography>
                                <Typography variant="caption" color="text.secondary">Medium risk, stable returns</Typography>
                              </Box>
                              <Slider
                                value={portfolioAllocation.bonds}
                                onChange={(e, newValue) => updateAssetAllocation('bonds', newValue as number)}
                                min={0}
                                max={100}
                                step={5}
                                aria-labelledby="bonds-allocation-slider"
                                sx={{ 
                                  '& .MuiSlider-track': { bgcolor: 'success.main' },
                                  '& .MuiSlider-thumb': { bgcolor: 'success.main' },
                                }}
                              />
                            </Box>
                            
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2">Cash: {portfolioAllocation.cash}%</Typography>
                                <Typography variant="caption" color="text.secondary">Low risk, low return</Typography>
                              </Box>
                              <Slider
                                value={portfolioAllocation.cash}
                                onChange={(e, newValue) => updateAssetAllocation('cash', newValue as number)}
                                min={0}
                                max={100}
                                step={5}
                                aria-labelledby="cash-allocation-slider"
                                sx={{ 
                                  '& .MuiSlider-track': { bgcolor: 'info.main' },
                                  '& .MuiSlider-thumb': { bgcolor: 'info.main' },
                                }}
                              />
                            </Box>
                            
                            <Box sx={{ mb: 3 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2">International: {portfolioAllocation.international}%</Typography>
                                <Typography variant="caption" color="text.secondary">Higher risk, diversification</Typography>
                              </Box>
                              <Slider
                                value={portfolioAllocation.international}
                                onChange={(e, newValue) => updateAssetAllocation('international', newValue as number)}
                                min={0}
                                max={100}
                                step={5}
                                aria-labelledby="international-allocation-slider"
                                sx={{ 
                                  '& .MuiSlider-track': { bgcolor: 'warning.main' },
                                  '& .MuiSlider-thumb': { bgcolor: 'warning.main' },
                                }}
                              />
                            </Box>
                            
                            <Box sx={{ 
                              display: 'flex', 
                              p: 2, 
                              bgcolor: 'background.default', 
                              borderRadius: 1,
                              mb: 2
                            }}>
                              <Box sx={{ 
                                height: 60, 
                                display: 'flex', 
                                flexGrow: 1, 
                                overflow: 'hidden', 
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                              }}>
                                <Box sx={{ width: `${portfolioAllocation.stocks}%`, bgcolor: 'primary.main', height: '100%' }} />
                                <Box sx={{ width: `${portfolioAllocation.bonds}%`, bgcolor: 'success.main', height: '100%' }} />
                                <Box sx={{ width: `${portfolioAllocation.cash}%`, bgcolor: 'info.main', height: '100%' }} />
                                <Box sx={{ width: `${portfolioAllocation.international}%`, bgcolor: 'warning.main', height: '100%' }} />
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                              <CardContent>
                                <Typography variant="subtitle2" gutterBottom>
                                  Custom Portfolio Performance
                                </Typography>
                                
                                <Box sx={{ mb: 3 }}>
                                  <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, height: '100%' }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                          Expected Annual Return
                                        </Typography>
                                        <Typography variant="h6" color="primary.main">
                                          {portfolioPerformance.expectedReturn.toFixed(2)}%
                                        </Typography>
                                      </Box>
                                    </Grid>
                                    
                                    <Grid item xs={6}>
                                      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, height: '100%' }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                          Risk Level (Volatility)
                                        </Typography>
                                        <Typography variant="h6" color={
                                          portfolioPerformance.volatility < 8 ? 'success.main' : 
                                          portfolioPerformance.volatility < 12 ? 'warning.main' : 'error.main'
                                        }>
                                          {portfolioPerformance.volatility.toFixed(1)}%
                                        </Typography>
                                      </Box>
                                    </Grid>
                                  </Grid>
                                </Box>
                                
                                <Box sx={{ mb: 3 }}>
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Projected Value After {investmentYears} Years
                                  </Typography>
                                  <Typography variant="h5" color="primary.main">
                                    {formatCurrency(portfolioProjectedValue)}
                                  </Typography>
                                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                      Compared to default {investmentType === 'sp500' ? 'S&P 500' : investmentType} investment:
                                    </Typography>
                                    <Typography 
                                      variant="body2"
                                      fontWeight="medium"
                                      color={portfolioProjectedValue > finalValue ? 'success.main' : 'error.main'}
                                    >
                                      {portfolioProjectedValue > finalValue ? '+' : ''}{formatCurrency(portfolioProjectedValue - finalValue)}
                                      ({((portfolioProjectedValue / finalValue - 1) * 100).toFixed(1)}%)
                                    </Typography>
                                  </Box>
                                </Box>
                                
                                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Portfolio Characteristics
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" paragraph>
                                    {portfolioAllocation.stocks > 70 
                                      ? "This allocation is heavily weighted toward stocks, offering high growth potential but significant volatility."
                                      : portfolioAllocation.bonds > 70
                                        ? "This conservative allocation emphasizes bonds, providing stability but potentially lower long-term returns."
                                        : portfolioAllocation.cash > 30
                                          ? "This very conservative allocation has significant cash holdings, which may not keep pace with inflation over time."
                                          : portfolioAllocation.international > 40
                                            ? "This allocation has significant international exposure, providing diversification but potentially higher volatility."
                                            : "This balanced allocation provides a mix of growth potential and stability through diversification."}
                                  </Typography>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      </Card>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
} 