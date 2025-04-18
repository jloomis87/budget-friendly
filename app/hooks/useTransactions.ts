import { useState, useCallback, useEffect, useRef } from 'react';
import type { Transaction } from '../services/fileParser';
import { 
  calculateBudgetSummary, 
  create503020Plan, 
  getBudgetSuggestions,
  type BudgetSummary,
  type BudgetPlan
} from '../services/budgetCalculator';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from './useLocalStorage';
import { useAuth } from '../contexts/AuthContext';
import * as transactionService from '../services/transactionService';
import { collection, getDocs, writeBatch, type QueryDocumentSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import ReactDOM from 'react-dom';
import { useCategorizer } from './useCategories';
import { useCategories } from '../contexts/CategoryContext';
import { v4 as uuidv4 } from 'uuid';
import type { BudgetPreferences } from '../components/BudgetActions';
import { getCategoryWithId } from '../services/fileParser';

export function useTransactions(initialBudgetId?: string) {
  // Get current user from auth context
  const { user, isAuthenticated } = useAuth();
  
  // Get categories from context
  const { categories: categoryList, getCategoryByName } = useCategories();
  
  // State for transactions and budget data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [budgetPreferences, setBudgetPreferences] = useState<BudgetPreferences | null>(null);
  
  // State for current budget ID
  const [currentBudgetId, setCurrentBudgetId] = useState<string | undefined>(initialBudgetId);
  
  // Get the setCurrentBudgetId function from CategoryContext
  const { setCurrentBudgetId: setCategoriesBudgetId } = useCategories();
  
  // Set categories budget ID on first load if initialBudgetId is provided
  useEffect(() => {
    if (initialBudgetId) {
      setCategoriesBudgetId(initialBudgetId);
    }
  }, [initialBudgetId, setCategoriesBudgetId]);
  
  // Add a reset flag to trigger transaction reload
  const [shouldReload, setShouldReload] = useState(false);

  // Get the categorizing function
  const { categorizeTransaction } = useCategorizer();

  // Cache for storing transactions by budget ID
  const [transactionCache, setTransactionCache] = useState<Record<string, {
    transactions: Transaction[],
    summary: BudgetSummary | null,
    plan: BudgetPlan | null,
    suggestions: string[]
  }>>({});

  // Refs to track component state
  const isFirstLoad = useRef(true);

  // Helper function to show toast notifications
  const showToast = useCallback((message: string, type: 'error' | 'warning' | 'success' | 'info' = 'success') => {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    
    // Set color based on type
    let bgColor;
    switch (type) {
      case 'error':
        bgColor = 'rgba(244, 67, 54, 0.9)';  // Red for errors
        break;
      case 'warning':
        bgColor = 'rgba(255, 152, 0, 0.9)';  // Orange for warnings
        break;
      case 'info':
        bgColor = 'rgba(33, 150, 243, 0.9)'; // Blue for info
        break;
      default:
        bgColor = 'rgba(76, 175, 80, 0.9)'; // Green for success
    }
    
    notification.style.backgroundColor = bgColor;
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.zIndex = '9999';
    notification.style.fontFamily = 'Arial, sans-serif';
    notification.style.fontSize = '14px';
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Create a timeout for automatic removal
    let timeoutId = setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
    
    // Return a function that can be used to manually dismiss the toast
    return () => {
      clearTimeout(timeoutId);
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    };
  }, []);

  // Update currentBudgetId when initialBudgetId changes
  useEffect(() => {
    // Only update if initialBudgetId is defined and different from currentBudgetId
    if (initialBudgetId && initialBudgetId !== currentBudgetId) {
      // Indicate loading state immediately
      setIsLoading(true);
      
      // Check if we have cached data for this budget
      if (transactionCache[initialBudgetId]) {
        // Use cached data for immediate display
        const cachedData = transactionCache[initialBudgetId];
        
        // Update states with cached data for immediate feedback
        ReactDOM.unstable_batchedUpdates(() => {
          setTransactions(cachedData.transactions);
          setBudgetSummary(cachedData.summary);
          setBudgetPlan(cachedData.plan);
          setSuggestions(cachedData.suggestions);
          
          // Set the new budget ID
          setCurrentBudgetId(initialBudgetId);
          
          // We still want to reload fresh data, but user can see cached data immediately
          setShouldReload(true);
          
          // Briefly delay turning off loading to prevent flicker
          setTimeout(() => setIsLoading(false), 100);
        });
      } else {
        // No cached data, clear all data when budget changes
        ReactDOM.unstable_batchedUpdates(() => {
          setTransactions([]);
          setBudgetSummary(null);
          setBudgetPlan(null);
          setSuggestions([]);
          
          // Set the new budget ID
          setCurrentBudgetId(initialBudgetId);
          // Force a reload of transactions
          setShouldReload(true);
        });
      }
    }
  }, [initialBudgetId]); // Only depend on initialBudgetId changes

  // Fallback to localStorage for non-authenticated users or during loading
  const [localTransactions, setLocalTransactions] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.TRANSACTIONS, 
    LEGACY_STORAGE_KEYS.TRANSACTIONS, 
    []
  );
  
  const [localBudgetSummary, setLocalBudgetSummary] = useLocalStorage<BudgetSummary | null>(
    STORAGE_KEYS.SUMMARY, 
    LEGACY_STORAGE_KEYS.SUMMARY, 
    null
  );
  
  const [localBudgetPlan, setLocalBudgetPlan] = useLocalStorage<BudgetPlan | null>(
    STORAGE_KEYS.PLAN, 
    LEGACY_STORAGE_KEYS.PLAN, 
    null
  );
  
  const [localSuggestions, setLocalSuggestions] = useLocalStorage<string[]>(
    STORAGE_KEYS.SUGGESTIONS, 
    LEGACY_STORAGE_KEYS.SUGGESTIONS, 
    []
  );
  
  const [alertMessage, setAlertMessage] = useState<{ 
    type: 'success' | 'error' | 'warning' | 'info'; 
    message: string 
  } | null>(null);

  // Load budget preferences from Firestore
  useEffect(() => {
    const loadBudgetPreferences = async () => {
      if (isAuthenticated && user?.id) {
        try {
          const userDocRef = doc(db, 'users', user.id);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data()?.budgetPreferences) {
            const prefs = userDoc.data().budgetPreferences;
            setBudgetPreferences(prefs);
          }
        } catch (error) {
          // Error loading budget preferences
        }
      }
    };

    loadBudgetPreferences();
  }, [isAuthenticated, user]);

  // Listen for budget preferences changes
  useEffect(() => {
    const handlePreferencesChanged = (event: Event) => {
      // TypeScript type assertion
      const customEvent = event as CustomEvent<{ preferences: BudgetPreferences }>;
      const newPreferences = customEvent.detail.preferences;
      
      // Update the preferences state
      setBudgetPreferences(newPreferences);
      
      // Recalculate the budget plan if we have a summary
      if (budgetSummary) {
        const plan = create503020Plan(budgetSummary, { ratios: newPreferences.ratios });
        setBudgetPlan(plan);
        
        // Also update suggestions based on the new plan
        const budgetSuggestions = getBudgetSuggestions(plan);
        setSuggestions(budgetSuggestions);
      }
    };
    
    // Add event listener
    window.addEventListener('budgetPreferencesChanged', handlePreferencesChanged as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('budgetPreferencesChanged', handlePreferencesChanged as EventListener);
    };
  }, [budgetSummary]); // Only re-run if budgetSummary changes

  // Listen for category updates and reload transactions to ensure consistency
  useEffect(() => {
    const handleCategoryUpdated = (event: Event) => {
      // Cast the event to CustomEvent
      const customEvent = event as CustomEvent<{oldCategory: string, newCategory: string}>;
      
      if (customEvent.detail) {
        const { oldCategory, newCategory } = customEvent.detail;
        
        // Force a reload of transactions to ensure all category changes are reflected
        if (isAuthenticated && user?.id) {
          setShouldReload(true);
        } else {
          // For non-authenticated users, we should manually update the categories in memory
          const updatedTransactions = transactions.map(transaction => {
            if (transaction.category?.toLowerCase() === oldCategory.toLowerCase()) {
              return { ...transaction, category: newCategory };
            }
            return transaction;
          });
          
          // Only update if changes were made
          if (JSON.stringify(updatedTransactions) !== JSON.stringify(transactions)) {
            setTransactions(updatedTransactions);
            
            // Also update localStorage
            setLocalTransactions(updatedTransactions);
          }
        }
      }
    };
    
    // Add event listener
    document.addEventListener('categoriesUpdated', handleCategoryUpdated);
    
    // Clean up when the component unmounts
    return () => {
      document.removeEventListener('categoriesUpdated', handleCategoryUpdated);
    };
  }, [isAuthenticated, user, transactions, setLocalTransactions, setShouldReload]);

  // Listen for direct category rename events to update transactions
  useEffect(() => {
    const handleCategoryRenamed = (event: Event) => {
      // Cast the event to CustomEvent
      const customEvent = event as CustomEvent<{
        oldName: string, 
        newName: string,
        categoryId: string
      }>;
      
      if (customEvent.detail) {
        const { oldName, newName, categoryId } = customEvent.detail;
        
        // Directly update transactions that match the old category name
        const txUpdates = transactions.map((transaction, index) => {
          // Use case-insensitive comparison to be extra safe
          if (transaction.category?.toLowerCase() === oldName.toLowerCase()) {
            // Return a new object with both category and categoryId updated
            return { 
              ...transaction, 
              category: newName,
              categoryId: categoryId // Update the categoryId to match the category
            };
          }
          return transaction;
        });
        
        // Only update if changes were made
        if (JSON.stringify(txUpdates) !== JSON.stringify(transactions)) {
          setTransactions(txUpdates);
          
          // If not authenticated, also update localStorage
          if (!isAuthenticated) {
            setLocalTransactions(txUpdates);
          }
        }
      }
    };
    
    // Add event listener
    document.addEventListener('categoryRenamed', handleCategoryRenamed);
    
    // Clean up when the component unmounts
    return () => {
      document.removeEventListener('categoryRenamed', handleCategoryRenamed);
    };
  }, [transactions, isAuthenticated, setLocalTransactions]);

  // Listen for category deleted events to refresh transactions
  useEffect(() => {
    const handleCategoryDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{
        categoryId: string,
        categoryName: string
      }>;
      
      if (customEvent.detail) {
        const { categoryId, categoryName } = customEvent.detail;
        
        // Force a refresh of transactions from the server if authenticated
        if (isAuthenticated && user?.id && currentBudgetId) {
          // Remove this category's transactions from the cache first
          if (transactionCache[currentBudgetId]) {
            const cachedData = transactionCache[currentBudgetId];
            const filteredTransactions = cachedData.transactions.filter(t => 
              (t.category ?? '') !== categoryName && (t.categoryId ?? '') !== categoryId
            );
            
            // Update the cache with filtered transactions
            setTransactionCache(prevCache => ({
              ...prevCache,
              [currentBudgetId]: {
                ...cachedData,
                transactions: filteredTransactions
              }
            }));
            
            // Update local state immediately for better UX while we reload
            setTransactions(filteredTransactions);
          }
          
          // Then trigger a reload to get fresh data
          setShouldReload(true);
        } else {
          // For non-authenticated users, remove transactions with the deleted category
          const updatedTransactions = transactions.filter(transaction => 
            (transaction.category ?? '') !== categoryName && 
            (transaction.categoryId ?? '') !== categoryId
          );
          
          // Update local state if there were changes
          if (updatedTransactions.length !== transactions.length) {
            setTransactions(updatedTransactions);
            setLocalTransactions(updatedTransactions);
            
            // Recalculate budget summaries
            const summary = calculateBudgetSummary(updatedTransactions);
            setBudgetSummary(summary);
            setLocalBudgetSummary(summary);
            
            const plan = create503020Plan(summary, { ratios: budgetPreferences?.ratios });
            setBudgetPlan(plan);
            setLocalBudgetPlan(plan);
            
            const budgetSuggestions = getBudgetSuggestions(plan);
            setSuggestions(budgetSuggestions);
            setLocalSuggestions(budgetSuggestions);
          }
        }
      }
    };
    
    document.addEventListener('categoryDeleted', handleCategoryDeleted);
    
    return () => {
      document.removeEventListener('categoryDeleted', handleCategoryDeleted);
    };
  }, [
    isAuthenticated, 
    user, 
    currentBudgetId, 
    transactions, 
    setShouldReload,
    transactionCache,
    setTransactions,
    setLocalTransactions,
    setBudgetSummary,
    setLocalBudgetSummary,
    setBudgetPlan,
    setLocalBudgetPlan,
    setSuggestions,
    setLocalSuggestions,
    budgetPreferences
  ]);

  // Add a transaction
  const addTransaction = useCallback(async (newTransaction: Omit<Transaction, 'id'>) => {
    try {
      // If no category is provided, categorize the transaction
      if (!newTransaction.category) {
        const categoryInfo = getCategoryWithId(newTransaction.description, newTransaction.amount);
        newTransaction.category = categoryInfo.category;
        newTransaction.categoryId = categoryInfo.categoryId;
      } else if (!newTransaction.categoryId) {
        // If category is provided but categoryId is not, try to get categoryId from CategoryContext
        const category = getCategoryByName(newTransaction.category);
        if (category) {
          newTransaction.categoryId = category.id;
        } else {
          // Fall back to default categoryId mapping if not found in context
          const defaultCategoryMapping: Record<string, string> = {
            'Income': 'income',
            'Essentials': 'essentials',
            'Wants': 'wants',
            'Savings': 'savings'
          };
          newTransaction.categoryId = defaultCategoryMapping[newTransaction.category] || 'uncategorized';
        }
      }
      
      // Create a complete transaction object with an ID
      const updatedTransaction: Transaction = {
        ...newTransaction,
        id: uuidv4(),
        date: newTransaction.date instanceof Date ? newTransaction.date : new Date(newTransaction.date),
        type: newTransaction.type || (newTransaction.amount > 0 ? 'income' : 'expense')
      };
      
      // --- Optimistic UI Update ---
      // Update local state immediately before potential async operations
      const updatedTransactions = [...transactions, updatedTransaction];
      const summary = calculateBudgetSummary(updatedTransactions);
      const plan = create503020Plan(summary, { ratios: budgetPreferences?.ratios });
      const budgetSuggestions = getBudgetSuggestions(plan);
      
      ReactDOM.unstable_batchedUpdates(() => {
        setTransactions(updatedTransactions);
        setBudgetSummary(summary);
        setBudgetPlan(plan);
        setSuggestions(budgetSuggestions);

        // If not authenticated, update localStorage
        if (!isAuthenticated || !user?.id) {
          setLocalTransactions(updatedTransactions);
          setLocalBudgetSummary(summary);
          setLocalBudgetPlan(plan);
          setLocalSuggestions(budgetSuggestions);
        }

        // Show success message early
        showToast('Transaction added successfully!', 'success');
        setAlertMessage({
          type: 'success',
          message: 'Transaction added successfully!'
        });
      });
      // --- End Optimistic Update ---
      
      // Track transaction ID for return value
      let transactionId = updatedTransaction.id || '';
      
      // If authenticated, save to Firestore in the background
      if (isAuthenticated && user?.id) {
        const newId = await transactionService.addTransaction(user.id, updatedTransaction, currentBudgetId);
        if (newId) {
          transactionId = newId;
          // Note: updatedTransaction in local state already has a UUID
          // If Firestore returns a different ID, we might need reconciliation logic
          // For now, we assume the optimistic UUID is acceptable or Firestore uses the provided one
        }
        
        // setShouldReload(true); // Removed: Optimistic update handles UI
      }
      
      return transactionId;
    } catch (error) {
      // Error handling without console.error
      const errorMessage = `Error adding transaction: ${error instanceof Error ? error.message : 'Unknown error'}`;
      showToast(errorMessage, 'error');
      setAlertMessage({
        type: 'error',
        message: errorMessage
      });
      // Potentially revert optimistic update here if needed
      setIsLoading(false); // Ensure loading is off on error
      return null;
    } finally {
      // Ensure loading is off, although it shouldn't be set by this function anymore
      setIsLoading(false); 
    }
  }, [
    isAuthenticated, 
    user, 
    transactions, 
    setTransactions, 
    setLocalTransactions, 
    setAlertMessage,
    currentBudgetId,
    showToast,
    budgetPreferences,
    getCategoryByName,
    setShouldReload
  ]);

  // Add multiple transactions in a batch
  const addTransactionBatch = useCallback(async (newTransactions: Transaction[]) => {
    if (!newTransactions.length) return [];
    
    try {
      console.log('Adding batch of', newTransactions.length, 'transactions');
      
      // Generate IDs for transactions that don't have them
      const transactionsWithIds = newTransactions.map(transaction => {
        if (transaction.id) return transaction;
        return { ...transaction, id: uuidv4() };
      });
      
      // Create optimistic update first
      const updatedTransactions = [...transactions, ...transactionsWithIds];
      const summary = calculateBudgetSummary(updatedTransactions);
      const plan = create503020Plan(summary, { ratios: budgetPreferences?.ratios });
      const budgetSuggestions = getBudgetSuggestions(plan);
      
      // Update all states in a batch for better UI performance
      ReactDOM.unstable_batchedUpdates(() => {
        // Update transactions array first
        setTransactions(updatedTransactions);
        
        // Then update budget data
        setBudgetSummary(summary);
        setBudgetPlan(plan);
        setSuggestions(budgetSuggestions);
        
        // Also update localStorage for non-authenticated users
        if (!isAuthenticated || !user?.id) {
          setLocalTransactions(updatedTransactions);
          setLocalBudgetSummary(summary);
          setLocalBudgetPlan(plan);
          setLocalSuggestions(budgetSuggestions);
        }
        
        // Explicitly clear any cached data for the current budget ID
        if (currentBudgetId) {
          setTransactionCache(prevCache => {
            const newCache = { ...prevCache };
            delete newCache[currentBudgetId];
            return newCache;
          });
        }
        
        // Flag reload needed to force fresh data fetch next time
        setShouldReload(true);
        
        // Show success message
        showToast('Transactions added successfully!', 'success');
        setAlertMessage({
          type: 'success',
          message: 'Transactions added successfully!'
        });
      });
      
      // Dispatch event for components to know about optimistic updates
      document.dispatchEvent(new CustomEvent('transactionsUpdatedOptimistically', {
        detail: { 
          count: transactionsWithIds.length,
          categories: Array.from(new Set(transactionsWithIds.map(t => t.category || '')))
        }
      }));
      
      // Then update Firebase if user is authenticated
      if (isAuthenticated && user?.id) {
        console.log('User authenticated, updating Firebase');
        const batch = writeBatch(db);
        
        transactionsWithIds.forEach(transaction => {
          console.log('Adding transaction to batch:', transaction);
          
          // Check if we're using the budgets collection structure
          if (currentBudgetId) {
            const transactionRef = doc(collection(db, 'users', user.id, 'budgets', currentBudgetId, 'transactions'));
            batch.set(transactionRef, {
              ...transaction,
              id: transactionRef.id,
            });
          } else {
            // Fallback to the old path
            const transactionRef = doc(collection(db, 'users', user.id, 'transactions'));
            batch.set(transactionRef, {
              ...transaction,
              id: transactionRef.id,
            });
          }
        });
        
        console.log('Committing batch to Firebase');
        await batch.commit();
        
        console.log('Batch committed successfully');
        
        // After successful Firebase update, force a reload after a short delay
        // This ensures we get the latest data including any server-side processing
        setTimeout(() => {
          console.log('Delayed force reload after batch operation');
          setShouldReload(true);
          
          // Also notify any listeners about the update
          window.dispatchEvent(new CustomEvent('transactionsUpdated', {
            detail: { 
              timestamp: Date.now(),
              source: 'addTransactionBatch'
            }
          }));
        }, 500);
      } else {
        console.log('User not authenticated, skipping Firebase update');
      }
      
      console.log('Batch add complete');
      return transactionsWithIds.map(t => t.id);
      
    } catch (error) {
      console.error('Error adding transactions batch:', error);
      
      // Rollback optimistic update on error
      console.log('Error occurred, rolling back optimistic updates');
      
      ReactDOM.unstable_batchedUpdates(() => {
        // Restore original transactions
        setTransactions(transactions);
        
        // Restore original budget data
        setBudgetSummary(budgetSummary);
        setBudgetPlan(budgetPlan);
        setSuggestions(suggestions);
        
        // Also restore localStorage for non-authenticated users
        if (!isAuthenticated || !user?.id) {
          setLocalTransactions(localTransactions);
          setLocalBudgetSummary(localBudgetSummary);
          setLocalBudgetPlan(localBudgetPlan);
          setLocalSuggestions(localSuggestions);
        }
        
        // Show error message
        showToast('Failed to add transactions. Please try again.', 'error');
        setAlertMessage({
          type: 'error',
          message: 'Failed to add transactions. Please try again.'
        });
      });
      
      throw error;
    }
  }, [
    isAuthenticated, 
    user, 
    currentBudgetId, 
    transactions, 
    budgetSummary,
    budgetPlan,
    suggestions,
    localTransactions,
    localBudgetSummary,
    localBudgetPlan,
    localSuggestions,
    setTransactions,
    setLocalTransactions, 
    setLocalBudgetSummary, 
    setLocalBudgetPlan, 
    setLocalSuggestions, 
    setAlertMessage,
    budgetPreferences,
    showToast,
    setBudgetSummary,
    setBudgetPlan,
    setSuggestions,
    calculateBudgetSummary,
    create503020Plan,
    getBudgetSuggestions
  ]);

  // Load transactions from Firestore when authenticated or when budget changes
  useEffect(() => {
    // Set initial loading state
    if ((isAuthenticated && user?.id && currentBudgetId) || shouldReload) {
      console.log(`Loading transactions - authenticated: ${isAuthenticated}, shouldReload: ${shouldReload}`);
      
      // Only show loading indicator for initial loads, not refreshes
      if (!shouldReload || isFirstLoad.current) {
        setIsLoading(true);
      }
      
      // Clean up function will help prevent race conditions
      let isMounted = true;
      
      const loadTransactions = async () => {
        try {
          // If shouldReload is true, clear the transaction cache for this budget to ensure fresh data
          if (shouldReload && currentBudgetId && transactionCache[currentBudgetId]) {
            console.log('Force reload requested, clearing cache for current budget');
            // Create a new cache object without the current budget entry
            const newCache = { ...transactionCache };
            delete newCache[currentBudgetId];
            setTransactionCache(newCache);
          }
          
          // Check if we have cached data for this budget and not forcing reload
          if (currentBudgetId && transactionCache[currentBudgetId] && !shouldReload) {
            // Use cached data for immediate display
            const cachedData = transactionCache[currentBudgetId];
            
            // Only update state if component is still mounted
            if (isMounted) {
              // Update states with cached data for immediate feedback
              ReactDOM.unstable_batchedUpdates(() => {
                setTransactions(cachedData.transactions);
                setBudgetSummary(cachedData.summary);
                setBudgetPlan(cachedData.plan);
                setSuggestions(cachedData.suggestions);
                setIsLoading(false);
              });
              
              console.log(`Loaded ${cachedData.transactions.length} transactions from cache`);
            }
            
            // Still let the load continue in the background for fresh data unless we're coming from a budget change
            if (!shouldReload) {
              return;
            }
          }
          
          // Ensure we have a valid user ID and budget ID
          if (!user?.id || !currentBudgetId) {
            throw new Error('Missing user ID or budget ID');
          }
          
          // No cache or forced reload, fetch from Firebase
          const userTransactions = await transactionService.getUserTransactions(user.id, currentBudgetId);
          
          // Sort transactions by category and order
          const sortedTransactions = [...userTransactions].sort((a, b) => {
            if (a.category !== b.category) {
              return (a.category || '').localeCompare(b.category || '');
            }
            return (a.order || 0) - (b.order || 0);
          });

          // Only proceed if component is still mounted
          if (isMounted) {
            // Calculate all updates at once
            const summary = calculateBudgetSummary(sortedTransactions);
            const plan = create503020Plan(summary, { ratios: budgetPreferences?.ratios });
            const budgetSuggestions = getBudgetSuggestions(plan);
            
            // Store in cache for quick future access
            if (currentBudgetId) {
              setTransactionCache(prevCache => ({
                ...prevCache,
                [currentBudgetId]: {
                  transactions: sortedTransactions,
                  summary,
                  plan,
                  suggestions: budgetSuggestions
                }
              }));
            }
            
            // Update all states in a single batch
            ReactDOM.unstable_batchedUpdates(() => {
              setTransactions(sortedTransactions);
              setBudgetSummary(summary);
              setBudgetPlan(plan);
              setSuggestions(budgetSuggestions);
              
              // Reset shouldReload flag after loading completes
              if (shouldReload) {
                setShouldReload(false);
              }
              
              // Mark that first load is complete
              isFirstLoad.current = false;
              
              // Set loading to false only at the very end
              setIsLoading(false);
            });
          }
        } catch (error) {
          // Only update state if component is still mounted
          if (isMounted) {
            // Error handling without console.error
            ReactDOM.unstable_batchedUpdates(() => {
              // Check if we have data in localStorage as a fallback
              if (localTransactions && localTransactions.length > 0) {
                setTransactions(localTransactions);
                setBudgetSummary(localBudgetSummary || null);
                setBudgetPlan(localBudgetPlan || null);
                setSuggestions(localSuggestions || []);
              } else {
                // No local data either, make sure transaction list is empty
                setTransactions([]);
                setBudgetSummary(null);
                setBudgetPlan(null);
                setSuggestions([]);
                setAlertMessage({
                  type: 'error',
                  message: 'Failed to load transactions. Please try again.'
                });
              }
              
              // Always reset loading and reload flags
              setIsLoading(false);
              setShouldReload(false);
            });
          }
        }
      };

      // Execute the function without delay
      loadTransactions();
      
      // Return cleanup function to prevent state updates after unmount
      return () => {
        isMounted = false;
      };
    } else {
      // If not authenticated or no budget ID, set loading to false
      setIsLoading(false);
    }
  }, [
    currentBudgetId, 
    isAuthenticated, 
    user?.id, 
    shouldReload, 
    transactionCache,
    budgetPreferences,
    localTransactions,
    localBudgetSummary,
    localBudgetPlan,
    localSuggestions
  ]);

  // Update a transaction
  const updateTransaction = useCallback(async (index: number, updatedFields: Partial<Transaction>) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      // Error handling without console.error
      setAlertMessage({
        type: 'error',
        message: 'Could not update transaction: Invalid index'
      });
      return;
    }

    const transaction = transactions[index];
    
    // Fix for FirebaseError: Ensure icon is never undefined by replacing with empty string
    if (updatedFields.icon === undefined && 'icon' in updatedFields) {
      updatedFields.icon = '';
    }
    
    const updatedTransaction = {
      ...transaction,
      ...updatedFields
    };
    
    // If date is being updated, ensure it's in the correct format
    if (updatedFields.date !== undefined) {
      if (typeof updatedFields.date === 'number') {
        // If it's a day number, keep it as-is
        updatedTransaction.date = updatedFields.date;
      } else if (updatedFields.date instanceof Date) {
        // If it's already a Date object, keep it as-is
        updatedTransaction.date = updatedFields.date;
      } else {
        // If it's a string or something else, try to convert to Date
        try {
          updatedTransaction.date = new Date(updatedFields.date);
        } catch (e) {
          // Error handling without console.error
        }
      }
    }
    
    try {
      // If authenticated and transaction has an ID, update in Firestore
      if (isAuthenticated && user?.id && transaction.id) {
        setIsLoading(true);
        // Clean updatedFields to ensure no undefined values are sent to Firestore
        const cleanUpdatedFields = Object.fromEntries(
          Object.entries(updatedFields).map(([key, value]) => {
            // Replace undefined values with empty strings for string fields like icon
            if (value === undefined && (key === 'icon' || key === 'description')) {
              return [key, ''];
            }
            return [key, value];
          })
        );
        
        // Pass the budgetId for updating in the specific budget collection
        await transactionService.updateTransaction(transaction.id, cleanUpdatedFields, user.id, currentBudgetId);
      } 
      
      // Update local state
      const updatedTransactions = [...transactions];
      updatedTransactions[index] = updatedTransaction;
      setTransactions(updatedTransactions);
      
      // If not authenticated, update in localStorage
      if (!isAuthenticated || !user?.id) {
        setLocalTransactions(updatedTransactions);
      }
      
      return updatedTransaction;
    } catch (error) {
      // Error handling without console.error
      setAlertMessage({
        type: 'error',
        message: `Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [transactions, isAuthenticated, user, setLocalTransactions, setAlertMessage, currentBudgetId]);

  // Update transaction by description
  const updateTransactionByDescription = useCallback((description: string, updates: Partial<Transaction>) => {
    // Find the transaction index
    const index = transactions.findIndex(t => t.description === description);
    
    // If the transaction exists, update it
    if (index !== -1) {
      updateTransaction(index, updates);
    }
  }, [transactions, updateTransaction]);

  // Get transactions by category
  const getTransactionsByCategory = useCallback(() => {
    // Create an object to hold transactions by category
    const categories = {} as Record<string, Transaction[]>;
    
    // Create a map of category IDs to category names for quick lookup
    const categoryIdMap: Record<string, string> = {};
    categoryList.forEach(category => {
      categoryIdMap[category.id] = category.name;
    });
    
    // Loop through transactions and group by category
    transactions.forEach(transaction => {
      // Skip income transactions as they are handled separately
      if (transaction.category !== 'Income') {
        let categoryName = transaction.category;
        let mappedCategory = null;
        
        // First priority: If the transaction has a categoryId, use the current name for that ID
        if (transaction.categoryId && categoryIdMap[transaction.categoryId]) {
          mappedCategory = categoryList.find(c => c.id === transaction.categoryId);
          if (mappedCategory) {
            categoryName = mappedCategory.name;
          }
        } 
        // Second priority: if category name exists, use case-insensitive matching
        else if (categoryName) {
          // Try to find a matching category by name (case-insensitive)
          mappedCategory = categoryList.find(
            c => c.name.toLowerCase() === categoryName?.toLowerCase()
          );
          
          if (mappedCategory) {
            categoryName = mappedCategory.name; // Use the current category name (proper case)
          } else {
            // No direct match by name, try to find by known category IDs
            // This handles the case of renamed categories
            // Check list of common category IDs
            const defaultCategoryIds = {
              'wants': ['Wants', 'Desires'],
              'essentials': ['Essentials', 'Necessities', 'Needs'],
              'savings': ['Savings', 'Investments'],
              'income': ['Income', 'Revenue']
            };
            
            for (const [categoryId, possibleNames] of Object.entries(defaultCategoryIds)) {
              if (possibleNames.some(name => name.toLowerCase() === transaction.category?.toLowerCase())) {
                const targetCategory = categoryList.find(c => c.id === categoryId);
                if (targetCategory) {
                  categoryName = targetCategory.name;
                  break;
                }
              }
            }
          }
        }
        
        if (categoryName) {
          // Ensure category exists in the object
          if (!categories[categoryName]) {
            categories[categoryName] = [];
          }
          // Add transaction to appropriate category
          categories[categoryName].push(transaction);
        }
      } else {
        // Handle Income transactions
        if (!categories['Income']) {
          categories['Income'] = [];
        }
        categories['Income'].push(transaction);
      }
    });
    
    return categories;
  }, [transactions, categoryList]);

  // Get total income
  const getTotalIncome = useCallback(() => {
    return transactions
      .filter(t => t.category === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Delete a transaction
  const deleteTransaction = useCallback(async (index: number) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      // Error handling without console.error
      const errorMessage = 'Could not delete transaction: Invalid index';
      showToast(errorMessage, 'error');
      setAlertMessage({
        type: 'error',
        message: errorMessage
      });
      return;
    }

    const transaction = transactions[index];
    
    try {
      // --- Optimistic UI Update ---
      // Update local state immediately
      const updatedTransactions = transactions.filter((_, i) => i !== index);
      setTransactions(updatedTransactions);
      
      // If not authenticated, update in localStorage
      if (!isAuthenticated || !user?.id) {
        setLocalTransactions(updatedTransactions);
      }
      // --- End Optimistic Update ---

      // If authenticated and transaction has an ID, delete from Firestore in the background
      if (isAuthenticated && user?.id && transaction.id) {
        // Pass budgetId to delete from the specific budget collection
        await transactionService.deleteTransaction(transaction.id, user.id, currentBudgetId);
      }
      
      // Recalculate budget (after optimistic update)
      try {
        // If no transactions left, clear everything
        if (updatedTransactions.length === 0) {
          setBudgetSummary(null);
          setBudgetPlan(null);
          setSuggestions([]);
          
          // Update localStorage if needed
          if (!isAuthenticated || !user?.id) {
            setLocalBudgetSummary(null);
            setLocalBudgetPlan(null);
            setLocalSuggestions([]);
          }
        } else {
          // Calculate new budget summary
          const summary = calculateBudgetSummary(updatedTransactions);
          setBudgetSummary(summary);
          
          // Save to localStorage if not authenticated
          if (!isAuthenticated || !user?.id) {
            setLocalBudgetSummary(summary);
          }
          
          // Create new budget plan
          const plan = create503020Plan(summary, { ratios: budgetPreferences?.ratios });
          setBudgetPlan(plan);
          
          // Save to localStorage if not authenticated
          if (!isAuthenticated || !user?.id) {
            setLocalBudgetPlan(plan);
          }
          
          // Generate new suggestions
          const budgetSuggestions = getBudgetSuggestions(plan);
          setSuggestions(budgetSuggestions);
          
          // Save to localStorage if not authenticated
          if (!isAuthenticated || !user?.id) {
            setLocalSuggestions(budgetSuggestions);
          }
        }
        
        // Show success message as toast
        showToast('Transaction deleted successfully!', 'success');
        
        setAlertMessage({
          type: 'success',
          message: 'Transaction deleted successfully!'
        });
      } catch (error) {
        // Error handling without console.error
        const errorMessage = 'Error updating budget calculations. Please try again.';
        showToast(errorMessage, 'error');
        setAlertMessage({
          type: 'error',
          message: errorMessage
        });
      }
    } catch (error) {
      // Error handling without console.error
      const errorMessage = `Error deleting transaction: ${error instanceof Error ? error.message : 'Unknown error'}`;
      showToast(errorMessage, 'error');
      setAlertMessage({
        type: 'error',
        message: errorMessage
      });
    } finally {
      // Ensure loading state is reset if it was set elsewhere, though it shouldn't be by delete now
      if (isAuthenticated && user?.id) {
        setIsLoading(false);
      }
    }
  }, [
    transactions, 
    isAuthenticated, 
    user, 
    setLocalTransactions, 
    setLocalBudgetSummary, 
    setLocalBudgetPlan, 
    setLocalSuggestions,
    currentBudgetId,
    budgetPreferences,
    showToast
  ]);

  // Reset all transactions
  const resetTransactions = useCallback(async () => {
    try {
      // If user is authenticated, delete all Firebase transactions
      if (isAuthenticated && user?.id) {
        setIsLoading(true);
        
        if (currentBudgetId) {
          // Get all transactions for this budget
          const allTransactions = await transactionService.getUserTransactions(user.id, currentBudgetId);
          
          // Delete each transaction
          const deletePromises = allTransactions.map(transaction => {
            if (transaction.id) {
              return transactionService.deleteTransaction(transaction.id, user.id, currentBudgetId);
            }
            return Promise.resolve();
          });
          
          await Promise.all(deletePromises);
        } else {
          // Get all transactions from the legacy path
          const allTransactions = await transactionService.getUserTransactions(user.id);
          
          // Delete each transaction
          const deletePromises = allTransactions.map(transaction => {
            if (transaction.id) {
              return transactionService.deleteTransaction(transaction.id, user.id);
            }
            return Promise.resolve();
          });
          
          await Promise.all(deletePromises);
        }
      }
      
      // Clear local state
      setTransactions([]);
      setBudgetSummary(null);
      setBudgetPlan(null);
      setSuggestions([]);
      
      // Clear localStorage if not authenticated or as a backup
      setLocalTransactions([]);
      setLocalBudgetSummary(null);
      setLocalBudgetPlan(null);
      setLocalSuggestions([]);
      
      setAlertMessage({
        type: 'success',
        message: 'All transactions have been cleared.'
      });
    } catch (error) {
      // Error handling without console.error
      setAlertMessage({
        type: 'error',
        message: `Error resetting budget: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated, 
    user, 
    setLocalTransactions, 
    setLocalBudgetSummary, 
    setLocalBudgetPlan, 
    setLocalSuggestions,
    currentBudgetId  // Add currentBudgetId dependency
  ]);

  // Move a transaction to a new category
  const moveTransaction = useCallback(async (index: number, targetCategory: string) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      // Error handling without console.error
      return;
    }
    
    // Validate the target category
    if (!['Income', 'Essentials', 'Wants', 'Savings'].includes(targetCategory)) {
      // Error handling without console.error
      return;
    }

    // Get the transaction
    const transaction = transactions[index];
    
    try {
      if (isAuthenticated && user?.id && transaction.id) {
        setIsLoading(true);
        await transactionService.moveTransactionToCategory(
          transaction.id, 
          targetCategory as 'Income' | 'Essentials' | 'Wants' | 'Savings',
          user.id,
          currentBudgetId  // Pass currentBudgetId
        );
      }
      
      // Update local state
      await updateTransaction(index, { 
        category: targetCategory as 'Income' | 'Essentials' | 'Wants' | 'Savings' 
      });
    } catch (error) {
      // Error handling without console.error
      setAlertMessage({
        type: 'error',
        message: `Error moving transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [transactions, updateTransaction, isAuthenticated, user, setAlertMessage, currentBudgetId]);

  // Reorder transactions within a category
  const reorderTransactions = useCallback(async (category: string, orderedTransactionIds: string[]) => {
    try {
      // If authenticated, update in Firestore
      if (isAuthenticated && user?.id) {
        setIsLoading(true);
        await transactionService.reorderTransactions(
          user.id, 
          category, 
          orderedTransactionIds,
          currentBudgetId  // Pass currentBudgetId
        );
      }
      
      // Update local state
      const updatedTransactions = [...transactions];
      
      // Create a map of id to new order
      const orderMap = new Map<string, number>();
      orderedTransactionIds.forEach((id, index) => {
        orderMap.set(id, index + 1);
      });
      
      // Update the order of each transaction
      updatedTransactions.forEach(transaction => {
        if (transaction.category === category && transaction.id && orderMap.has(transaction.id)) {
          transaction.order = orderMap.get(transaction.id);
        }
      });
      
      setTransactions(updatedTransactions);
      
      // If not authenticated, update in localStorage
      if (!isAuthenticated || !user?.id) {
        setLocalTransactions(updatedTransactions);
      }
      
      // Show success message as toast
      showToast('Transaction order updated successfully!', 'success');
      
      setAlertMessage({
        type: 'success',
        message: 'Transaction order updated successfully!'
      });
    } catch (error) {
      // Error handling without console.error
      const errorMessage = 'Failed to reorder transactions. Please try again.';
      showToast(errorMessage, 'error');
      setAlertMessage({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    transactions, 
    isAuthenticated, 
    user, 
    setLocalTransactions, 
    setAlertMessage,
    currentBudgetId,
    showToast
  ]);

  // Update all transactions with the same name to have the same icon
  const updateAllTransactionsWithSameName = useCallback(async (description: string, icon: string, excludeId?: string) => {
    if (!description) {
      return;
    }
    
    // Ensure icon is never undefined - always use empty string as fallback
    const safeIcon = icon || '';
    
    const normalizedDescription = description.trim().toLowerCase();
    const transactionsToUpdate: { index: number, transaction: Transaction }[] = [];
    
    // Find all transactions with the same description
    transactions.forEach((transaction, index) => {
      if (excludeId && transaction.id === excludeId) {
        return;
      }
      
      const transactionDescription = transaction.description.trim().toLowerCase();
      
      if (transactionDescription === normalizedDescription) {
        if (transaction.icon !== safeIcon) {
          transactionsToUpdate.push({ index, transaction });
        }
      }
    });
    
    if (transactionsToUpdate.length === 0) {
      return 0;
    }
    
    // Create a deep copy of transactions to ensure state changes properly reflect in UI
    const updatedTransactions = [...transactions];
    
    // First, immediately update all transactions in local state for a quick UI refresh
    transactionsToUpdate.forEach(({ index, transaction }) => {
      updatedTransactions[index] = {
        ...transaction,
        icon: safeIcon
      };
    });
    
    // Force a state update immediately to refresh the UI with the new icons
    setTransactions([...updatedTransactions]);
    
    // For synchronized updates that include Firestore/database updates, process in parallel
    try {
      const updatePromises = transactionsToUpdate.map(async ({ index, transaction }) => {
        // Return a promise for the database update
        if (isAuthenticated && user?.id && transaction.id && currentBudgetId) {
          return transactionService.updateTransaction(
            transaction.id, 
            { icon: safeIcon }, 
            user.id, 
            currentBudgetId
          );
        }
        return Promise.resolve();
      });
      
      // Wait for all database updates to complete
      await Promise.all(updatePromises);
      
      // After database updates, trigger another state refresh for good measure
      setTransactions(prev => [...prev]);
      
      // Dispatch custom events for different components to react to the change
      const categoriesSet = new Set(transactionsToUpdate.map(item => item.transaction.category));
      const affectedCategories = Array.from(categoriesSet);
      
      affectedCategories.forEach(category => {
        // Dispatch events for each affected category
        if (category) {
          try {
            // First event for TransactionTable
            const event1 = new CustomEvent('transactionIconsUpdated', {
              detail: { category, icon: safeIcon, description }
            });
            document.dispatchEvent(event1);
            
            // Second event for general UI refresh
            const event2 = new CustomEvent('forceTransactionRefresh', {
              detail: { category, icon: safeIcon, description, timestamp: Date.now() }
            });
            document.dispatchEvent(event2);
          } catch (error) {
            // Error handling without console.error
          }
        }
      });
      
      return transactionsToUpdate.length;
    } catch (error) {
      // Error handling without console.error
      // Still dispatch events even if there was an error with some updates
      try {
        const refreshEvent = new CustomEvent('transactionIconsUpdated', {
          detail: { category: 'all', icon: safeIcon, description, timestamp: Date.now() }
        });
        document.dispatchEvent(refreshEvent);
      } catch (e) {
        // Error handling without console.error
      }
      return undefined;
    }
  }, [transactions, isAuthenticated, user, currentBudgetId, setTransactions]);

  return {
    transactions,
    budgetSummary,
    budgetPlan, 
    suggestions,
    alertMessage,
    isLoading,
    currentBudgetId,
    setCurrentBudgetId,
    setAlertMessage,
    addTransaction,
    addTransactionBatch,
    updateTransaction,
    deleteTransaction,
    updateTransactionByDescription,
    getTransactionsByCategory,
    getTotalIncome,
    resetTransactions,
    moveTransaction,
    reorderTransactions,
    updateAllTransactionsWithSameName,
    setShouldReload,
    budgetPreferences
  };
} 