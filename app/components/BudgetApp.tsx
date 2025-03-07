import React, { useState, useEffect, useRef } from 'react';
import { Container, Box, Typography, Stepper, Step, StepLabel, Paper, Button, CircularProgress, Alert, List, ListItem, ListItemText, ListItemIcon, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Popover, Tooltip, Fab, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
// Import custom icon components to avoid the directory import issue
import { EditOutlinedIcon, SaveIcon, CloseIcon, DragIndicatorIcon, PaletteIcon, MicIcon, HelpOutlineIcon, DeleteIcon } from '../utils/materialIcons';
import { HexColorPicker } from 'react-colorful';
import { TransactionTable } from './TransactionTable';
import { BudgetSummary } from './BudgetSummary';
import type { Transaction } from '../services/fileParser';
import {
  calculateBudgetSummary,
  create503020Plan,
  getBudgetSuggestions,
  type BudgetSummary as BudgetSummaryType,
  type BudgetPlan
} from '../services/budgetCalculator';

// Add TypeScript declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Simplified SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

// Add this interface for alert messages
interface AlertMessage {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
}

// Utility function to determine if a color is dark
const isColorDark = (hexColor: string): boolean => {
  // Remove the # if it exists
  const hex = hexColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance using the formula for relative luminance in the sRGB color space
  // See: https://www.w3.org/TR/WCAG20/#relativeluminancedef
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if the color is dark (luminance < 0.5)
  return luminance < 0.5;
};

// Add these constants at the top of the file, after the imports
// Constants for localStorage keys
const STORAGE_KEYS = {
  TRANSACTIONS: 'friendlyBudgets_transactions',
  SUMMARY: 'friendlyBudgets_summary',
  PLAN: 'friendlyBudgets_plan',
  SUGGESTIONS: 'friendlyBudgets_suggestions',
  TABLE_COLORS: 'friendlyBudgets_tableColors'
};

// Legacy keys for backward compatibility
const LEGACY_STORAGE_KEYS = {
  TRANSACTIONS: 'budgetFriendly_transactions',
  SUMMARY: 'budgetFriendly_summary',
  PLAN: 'budgetFriendly_plan',
  SUGGESTIONS: 'budgetFriendly_suggestions',
  TABLE_COLORS: 'budgetFriendly_tableColors'
};

// Helper function to get item from localStorage with legacy fallback
const getStorageItem = (key: string, legacyKey: string) => {
  const value = localStorage.getItem(key);
  if (value) return value;
  
  // Try legacy key
  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue) {
    // Migrate data to new key
    localStorage.setItem(key, legacyValue);
    return legacyValue;
  }
  
  return null;
};

export function BudgetApp() {
  const [activeStep, setActiveStep] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummaryType | null>(null);
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<{ 
    index: number;
    identifier: string;
    amount: string;
    date: string;
    description: string;
  } | null>(null);
  
  // Color picker state
  const [tableColors, setTableColors] = useState<Record<string, string>>({
    'Essentials': '#f5f5f5', // Default light gray
    'Wants': '#f5f5f5',
    'Savings': '#f5f5f5',
    'Income': '#f5f5f5'
  });
  const [colorPickerAnchor, setColorPickerAnchor] = useState<null | HTMLElement>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  
  // Animation state for recently dropped transactions
  const [recentlyDropped, setRecentlyDropped] = useState<string | null>(null);
  
  // Track which category is being dragged over
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  
  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    let finalTranscript = '';
    let processingTimeout: NodeJS.Timeout | null = null;
    let isSpeechDetected = false;
    let silenceTimer: NodeJS.Timeout | null = null;
    let resetTextTimer: NodeJS.Timeout | null = null; // Timer to reset the displayed text
    
    try {
      // Check if the browser supports speech recognition
      if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        setSpeechFeedback('Speech recognition is not supported in this browser.');
        return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configure speech recognition settings
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true; // Keep listening even after results
        recognitionRef.current.interimResults = true; // Get interim results
        recognitionRef.current.lang = 'en-US'; // Set language
      }
      
      // Function to completely reset the speech recognition
      const resetSpeechRecognition = () => {
        try {
          console.log('Completely resetting speech recognition');
          
          // Stop the current recognition instance
          if (recognitionRef.current) {
            // Remove event handlers safely
            if (recognitionRef.current.onresult) {
              recognitionRef.current.onresult = () => {};
            }
            if (recognitionRef.current.onerror) {
              recognitionRef.current.onerror = () => {};
            }
            if (recognitionRef.current.onend) {
              recognitionRef.current.onend = () => {};
            }
            recognitionRef.current.abort();
          }
          
          // Create a new instance
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';
          
          // Set up event handlers again
          setupSpeechRecognitionHandlers();
          
          // Start the new instance if we were listening
          if (isListening) {
            recognitionRef.current.start();
          }
          
          setSpeechFeedback('Listening... Speak now.');
        } catch (error) {
          console.error('Error resetting speech recognition:', error);
        }
      };
      
      // Make resetSpeechRecognition available globally
      (window as any).resetSpeechRecognition = resetSpeechRecognition;
      
      // Make timer variables available globally
      (window as any).speechRecognitionTimers = {
        silenceTimer,
        resetTextTimer,
        processingTimeout
      };
      
      // Set up event handlers for speech recognition
      const setupSpeechRecognitionHandlers = () => {
        if (!recognitionRef.current) return;
        
        // Handle results
        recognitionRef.current.onresult = (event) => {
          console.log('Speech recognition result:', event.results);
          
          // Clear any existing processing timeout
          if (processingTimeout) {
            clearTimeout(processingTimeout);
            processingTimeout = null;
          }
          
          // Reset silence timer if it exists
          if (silenceTimer) {
            clearTimeout(silenceTimer);
          }
          
          // Reset the text reset timer if it exists
          if (resetTextTimer) {
            clearTimeout(resetTextTimer);
          }
          
          // Collect interim and final results
          let interimTranscript = '';
          finalTranscript = '';
          
          // Only process the most recent result to prevent accumulation
          // Use type assertion to safely access the length property
          const results = event.results as unknown as { length: number, [index: number]: { [index: number]: { transcript: string; confidence: number; }, isFinal?: boolean } };
          const lastResultIndex = results.length - 1;
          
          if (lastResultIndex >= 0) {
            const result = results[lastResultIndex];
            if (result && result[0]) {
              if (result.isFinal) {
                finalTranscript = result[0].transcript;
                isSpeechDetected = true;
          } else {
                interimTranscript = result[0].transcript;
                isSpeechDetected = true;
              }
            }
          }
          
          // Show interim feedback
          if (interimTranscript) {
            setSpeechFeedback(`Listening: "${interimTranscript}"`);
          }
          
          // Always set a timer to reset the text after 6 seconds of no new speech
          resetTextTimer = setTimeout(() => {
            console.log('Resetting speech text after 6 seconds of silence');
            setSpeechFeedback('Listening... Speak now.');
            
            // Completely reset the speech recognition
            resetSpeechRecognition();
          }, 6000); // Increased from 3 to 6 seconds for resetting text
          
          // If we have a final transcript, set a timer to wait for more speech
          if (finalTranscript) {
            setSpeechFeedback(`Heard: "${finalTranscript}" (waiting for more...)`);
            
            // Set a silence timer - if no more speech is detected for 4 seconds, process the command
            silenceTimer = setTimeout(() => {
              console.log(`Processing after 4 seconds of silence: "${finalTranscript}"`);
              setSpeechFeedback(`Processing: "${finalTranscript}"`);
              processVoiceCommand(finalTranscript);
              
              // Reset for next command
              finalTranscript = '';
              isSpeechDetected = false;
              
              // Set a timer to reset the feedback text after processing
              setTimeout(() => {
                // Only reset the feedback if we're still listening
                if (isListening) {
                  setSpeechFeedback('Listening... Speak now.');
                  
                  // Completely reset the speech recognition
                  resetSpeechRecognition();
                }
              }, 4000); // Increased from 3 to 4 seconds after processing
            }, 4000); // Increased from 2 to 4 seconds
          }
        };
        
        // Handle errors
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          
          let errorMessage = 'Error with speech recognition';
          
          // Provide more specific error messages
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected. Please try again.';
              break;
            case 'aborted':
              errorMessage = 'Speech recognition was aborted.';
              break;
            case 'audio-capture':
              errorMessage = 'Could not capture audio. Please check your microphone.';
              break;
            case 'network':
              errorMessage = 'Network error occurred. Please check your connection.';
              break;
            case 'not-allowed':
              errorMessage = 'Microphone access denied. Please allow microphone access.';
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech recognition service not allowed.';
              break;
            case 'bad-grammar':
              errorMessage = 'Grammar error in speech recognition.';
              break;
            case 'language-not-supported':
              errorMessage = 'Language not supported for speech recognition.';
              break;
            default:
              errorMessage = `Error: ${event.error}`;
          }
          
          setSpeechFeedback(errorMessage);
          
          // Don't automatically turn off listening for no-speech errors
          if (event.error !== 'no-speech') {
            setIsListening(false);
          }
        };
        
        // Handle end of recognition
        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          
          // If speech was detected but not processed yet, process it now
          if (finalTranscript && isSpeechDetected) {
            console.log(`Processing on end: "${finalTranscript}"`);
            setSpeechFeedback(`Processing: "${finalTranscript}"`);
            processVoiceCommand(finalTranscript);
          }
          
          // Don't automatically set isListening to false
          // Instead, try to restart if we're supposed to be listening
          if (isListening && recognitionRef.current) {
            try {
              console.log('Restarting speech recognition after end event');
              recognitionRef.current.start();
            } catch (error) {
              console.error('Error restarting speech recognition:', error);
              setIsListening(false);
            }
          }
        };
      };
      
      // Initial setup of speech recognition handlers
      setupSpeechRecognitionHandlers();
      
      console.log('Speech recognition initialized successfully');
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setSpeechFeedback('Error initializing speech recognition. This feature may not be supported in your browser.');
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.error('Error aborting speech recognition:', error);
        }
      }
    };
  }, []);
  
  // Process voice commands
  const processVoiceCommand = (transcript: string) => {
    console.log('Processing voice command:', transcript.toLowerCase());
    setSpeechFeedback(`Processing: "${transcript}"`);
    
    try {
      // Normalize the transcript
      const normalizedTranscript = transcript.toLowerCase().trim();
      
      // ===== ADD EXPENSE COMMAND PATTERNS =====
      // Check for various "add expense" patterns
      const isAddCommand = 
        // Standard patterns
        normalizedTranscript.includes('add expense') || 
        normalizedTranscript.includes('add transaction') || 
        normalizedTranscript.includes('add an expense') ||
        // More natural variations
        normalizedTranscript.includes('create expense') ||
        normalizedTranscript.includes('create a new expense') ||
        normalizedTranscript.includes('new expense') ||
        normalizedTranscript.includes('record expense') ||
        normalizedTranscript.includes('record a transaction') ||
        normalizedTranscript.includes('log expense') ||
        normalizedTranscript.includes('enter expense') ||
        normalizedTranscript.includes('i spent') ||
        normalizedTranscript.includes('i paid') ||
        normalizedTranscript.includes('i bought') ||
        normalizedTranscript.includes('i purchased') ||
        normalizedTranscript.includes('charge') ||
        normalizedTranscript.includes('payment for');
      
      if (isAddCommand) {
        // ===== CATEGORY MATCHING =====
        // More flexible category matching with multiple patterns
        let categoryMatch = 
          // Standard "to category" pattern
          normalizedTranscript.match(/to (essentials|wants|savings|income)/i) ||
          // "in category" pattern
          normalizedTranscript.match(/in (essentials|wants|savings|income)/i) ||
          // "as category" pattern
          normalizedTranscript.match(/as (essentials|wants|savings|income)/i) ||
          // "under category" pattern
          normalizedTranscript.match(/under (essentials|wants|savings|income)/i) ||
          // "for category" pattern (careful with this one as it can conflict with descriptions)
          normalizedTranscript.match(/^(?:.*?)\bfor\s+(essentials|wants|savings|income)\b/i);
        
        // ===== AMOUNT MATCHING =====
        // More flexible amount matching with multiple patterns
        const amountMatch = 
          // Dollar sign format: $5000
          normalizedTranscript.match(/\$(\d+(?:\.\d+)?)/i) || 
          // Dollars format: 5000 dollars
          normalizedTranscript.match(/(\d+(?:\.\d+)?)( dollars| dollar)/i) || 
          // "for amount" format: for 5000
          normalizedTranscript.match(/for (\d+(?:\.\d+)?)/i) ||
          // "cost amount" format: cost 5000
          normalizedTranscript.match(/cost (\d+(?:\.\d+)?)/i) ||
          // "paid amount" format: paid 5000
          normalizedTranscript.match(/paid (\d+(?:\.\d+)?)/i) ||
          // "spent amount" format: spent 5000
          normalizedTranscript.match(/spent (\d+(?:\.\d+)?)/i) ||
          // "of amount" format: of 5000
          normalizedTranscript.match(/of (\d+(?:\.\d+)?)/i);
        
        console.log('Category match:', categoryMatch);
        console.log('Amount match:', amountMatch);
        console.log('Full transcript:', normalizedTranscript);
        
        // If we have an amount but no category, use "Uncategorized"
        let category = "Uncategorized";
        if (categoryMatch) {
          category = categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1).toLowerCase();
          } else {
          console.log('No category specified, using "Uncategorized"');
        }
        
        if (amountMatch) {
          // Fix for speech recognition often hearing "$5000" as "$5.00"
          let amountText = amountMatch[1];
          console.log('Original amount text:', amountText);
          
          // AGGRESSIVE FIX: Check for specific patterns that indicate larger amounts
          
          // Check if the transcript contains words indicating thousands
          const hasThousandIndicator = 
            normalizedTranscript.includes('thousand') || 
            normalizedTranscript.includes('k') ||
            /five\s+k/i.test(normalizedTranscript) ||
            /\d+\s*k/i.test(normalizedTranscript);
            
          // IMPORTANT: Preserve exact amounts with more than 3 digits
          // This prevents rounding $2142 to $2000
          const isExactAmount = /\d{4,}/.test(amountText);
          console.log('Is exact amount with 4+ digits:', isExactAmount);
          
          // Only apply corrections if this is not an exact amount with 4+ digits
          if (!isExactAmount) {
            // Check for specific amount patterns that are commonly misheard
            if (amountText === '5.00' || amountText === '5.0' || amountText === '5') {
              if (hasThousandIndicator || normalizedTranscript.includes('5000')) {
                amountText = '5000';
                console.log('Fixed $5.00 to $5000 based on context');
              }
            } else if (amountText === '1.00' || amountText === '1.0' || amountText === '1') {
              if (hasThousandIndicator || normalizedTranscript.includes('1000')) {
                amountText = '1000';
                console.log('Fixed $1.00 to $1000 based on context');
              }
            } else if (amountText === '2.00' || amountText === '2.0' || amountText === '2') {
              if (hasThousandIndicator || normalizedTranscript.includes('2000')) {
                amountText = '2000';
                console.log('Fixed $2.00 to $2000 based on context');
              }
            } else if (amountText.includes('.00')) {
              // For other amounts with .00, remove the decimal and add two zeros
              // This converts $X.00 to $X00
              amountText = amountText.replace('.00', '00');
              console.log('Corrected amount text from .00 pattern:', amountText);
            } else if (amountText.includes('.0')) {
              // For amounts with .0, remove the decimal and add a zero
              // This converts $X.0 to $X0
              amountText = amountText.replace('.0', '0');
              console.log('Corrected amount text from .0 pattern:', amountText);
            }
            
            // Handle "five thousand" being transcribed as "5000" or "5,000"
            amountText = amountText.replace(/,/g, '');
            
            // Special case for common amounts with thousand indicators
            if (hasThousandIndicator) {
              const numValue = parseFloat(amountText);
              if (numValue < 10) {  // If we have a single digit like "5" and "thousand"
                amountText = (numValue * 1000).toString();
                console.log('Adjusted for "thousand":', amountText);
              } else if (numValue >= 10 && numValue < 100) {
                // For two-digit numbers like "50" with "thousand", multiply by 100
                // This handles cases like "fifty thousand" -> "50" + "thousand" -> 5000
                amountText = (numValue * 100).toString();
                console.log('Adjusted two-digit number for "thousand":', amountText);
              }
            }
            
            // Final check for unreasonably small amounts in a budget context
            const parsedAmount = parseFloat(amountText);
            if (parsedAmount <= 10 && !normalizedTranscript.includes('coffee') && !normalizedTranscript.includes('small')) {
              // If amount is very small and doesn't seem to be for coffee or explicitly small purchase,
              // it's likely a misheard larger amount
              amountText = (parsedAmount * 1000).toString();
              console.log('Adjusted unreasonably small amount:', amountText);
            }
          } else {
            console.log('Preserving exact amount:', amountText);
          }
          
          // Parse the corrected amount
          const amount = parseFloat(amountText);
          console.log('Final parsed amount:', amount);
          
          // ===== DESCRIPTION EXTRACTION =====
          // Extract description using multiple patterns
          let description = '';
          
          // Try different patterns to extract description
          
          // 1. Try to find "for [description]" pattern
          let forDescriptionMatch = null;
          if (categoryMatch) {
            forDescriptionMatch = normalizedTranscript.match(new RegExp(`(to|in|as|under)\\s+${categoryMatch[1]}\\s+for\\s+([^$\\d]+)`, 'i'));
          }
          
          if (forDescriptionMatch) {
            // Clean up the description by removing "for" and any trailing "for $amount"
            description = forDescriptionMatch[2].replace(/\s+for\s+\$?\d+(\s+dollars)?$/i, '').trim();
          } else {
            // 2. Try to extract from common phrases
            const descriptionPatterns = [
              /i (?:spent|paid|bought|purchased) .+ (?:for|on) (.+?)(?= for | \$| \d+ dollars| cost)/i,
              /(?:expense|transaction|payment) (?:for|on) (.+?)(?= for | \$| \d+ dollars| cost)/i,
              /(?:add|create|record|log|enter) (?:expense|transaction) (?:for|on) (.+?)(?= for | \$| \d+ dollars| cost)/i
            ];
            
            for (const pattern of descriptionPatterns) {
              const match = normalizedTranscript.match(pattern);
              if (match) {
                description = match[1].trim();
                break;
              }
            }
            
            // 3. Fall back to extracting text between category and amount
            if (!description && categoryMatch) {
              const categoryIndex = normalizedTranscript.indexOf(categoryMatch[0]) + categoryMatch[0].length;
              const amountIndex = normalizedTranscript.indexOf(amountMatch[0]);
              
              if (amountIndex > categoryIndex) {
                description = normalizedTranscript.substring(categoryIndex, amountIndex).trim();
                
                // Remove "for" at the beginning if present
                description = description.replace(/^for\s+/, '');
              }
            }
          }
          
          console.log('Extracted description:', description);
          
          // If description is still empty, use a default
          if (!description) {
            description = "Voice added expense";
          }
          
          // Create and add the transaction
          const newTransaction: Transaction = {
            date: new Date(),
            description: description,
            amount: category === 'Income' ? amount : -amount, // Negative for expenses
            category: category as Transaction['category']
          };
          
          console.log('Adding transaction:', newTransaction);
          
          // Get current transactions from localStorage as a backup
          const currentStoredTransactions = localStorage.getItem('budgetFriendly_transactions');
          console.log('Current stored transactions:', currentStoredTransactions);
          
          handleManualTransactionAdd(newTransaction);
          setSpeechFeedback(`Added ${category} transaction: "${description}" for $${amount}`);
        } else {
          // Provide more specific feedback about what's missing
          if (!amountMatch) {
            setSpeechFeedback('Could not understand the amount. Please specify an amount like "$5000" or "5000 dollars".');
          } else {
            setSpeechFeedback('Could not understand the expense details. Please try again with description and amount.');
          }
        }
      }
      // ===== UPDATE EXPENSE COMMAND PATTERNS =====
      // Check for various "update expense" patterns
      else if (
        normalizedTranscript.includes('update expense') || 
        normalizedTranscript.includes('update transaction') ||
        normalizedTranscript.includes('change expense') ||
        normalizedTranscript.includes('modify expense') ||
        normalizedTranscript.includes('edit expense') ||
        normalizedTranscript.includes('fix expense') ||
        normalizedTranscript.includes('correct expense') ||
        normalizedTranscript.includes('adjust expense') ||
        // Add simpler patterns that don't require the word "expense"
        normalizedTranscript.match(/^update\s+\w+/i) ||
        normalizedTranscript.match(/^change\s+\w+/i) ||
        normalizedTranscript.match(/^modify\s+\w+/i) ||
        normalizedTranscript.match(/^edit\s+\w+/i) ||
        normalizedTranscript.match(/^fix\s+\w+/i)
      ) {
        console.log('Update command detected');
        
        // More flexible description matching
        const descriptionMatch = 
          normalizedTranscript.match(/(?:update|change|modify|edit|fix|correct|adjust) (?:expense|transaction) (.*?) to/i) ||
          normalizedTranscript.match(/(?:update|change|modify|edit|fix|correct|adjust) (?:the|my) (.*?) (?:expense|transaction|bill|payment) to/i) ||
          normalizedTranscript.match(/(?:update|change|modify|edit|fix|correct|adjust) (?:the|my) (.*?) to/i) ||
          normalizedTranscript.match(/(?:update|change|modify|edit|fix|correct|adjust) (.*?) (?:expense|transaction) to/i) ||
          // Add simpler pattern that just captures the description directly
          normalizedTranscript.match(/(?:update|change|modify|edit|fix|correct|adjust) (.*?) to/i);
        
        // More flexible amount matching
        const amountMatch = 
          normalizedTranscript.match(/to \$(\d+(?:\.\d+)?)/i) || // to $5000 format
          normalizedTranscript.match(/to (\d+(?:\.\d+)?)( dollars| dollar)/i) || // to 5000 dollars format
          normalizedTranscript.match(/to be \$?(\d+(?:\.\d+)?)/i) || // to be $5000 format
          normalizedTranscript.match(/be \$?(\d+(?:\.\d+)?)/i) || // be $5000 format
          normalizedTranscript.match(/to (\d+(?:\.\d+)?)/i); // to 5000 format (must be last)
        
        console.log('Description match:', descriptionMatch);
        console.log('Amount match:', amountMatch);
        console.log('Full update transcript:', normalizedTranscript);
        
        if (descriptionMatch && amountMatch) {
          const description = descriptionMatch[1].trim();
          console.log('Extracted description for update:', description);
          
          // Fix for speech recognition often hearing "$5000" as "$5.00"
          let amountText = amountMatch[1];
          console.log('Original update amount text:', amountText);
          
          // AGGRESSIVE FIX: Check for specific patterns that indicate larger amounts
          
          // Check if the transcript contains words indicating thousands
          const hasThousandIndicator = 
            normalizedTranscript.includes('thousand') || 
            normalizedTranscript.includes('k') ||
            /five\s+k/i.test(normalizedTranscript) ||
            /\d+\s*k/i.test(normalizedTranscript);
            
          // IMPORTANT: Preserve exact amounts with more than 3 digits
          // This prevents rounding $2142 to $2000
          const isExactAmount = /\d{4,}/.test(amountText);
          console.log('Is exact amount with 4+ digits:', isExactAmount);
          
          // Only apply corrections if this is not an exact amount with 4+ digits
          if (!isExactAmount) {
            // Check for specific amount patterns that are commonly misheard
            if (amountText === '5.00' || amountText === '5.0' || amountText === '5') {
              if (hasThousandIndicator || normalizedTranscript.includes('5000')) {
                amountText = '5000';
                console.log('Fixed update $5.00 to $5000 based on context');
              }
            } else if (amountText === '1.00' || amountText === '1.0' || amountText === '1') {
              if (hasThousandIndicator || normalizedTranscript.includes('1000')) {
                amountText = '1000';
                console.log('Fixed update $1.00 to $1000 based on context');
              }
            } else if (amountText === '2.00' || amountText === '2.0' || amountText === '2') {
              if (hasThousandIndicator || normalizedTranscript.includes('2000')) {
                amountText = '2000';
                console.log('Fixed update $2.00 to $2000 based on context');
              }
            } else if (amountText.includes('.00')) {
              // For other amounts with .00, remove the decimal and add two zeros
              // This converts $X.00 to $X00
              amountText = amountText.replace('.00', '00');
              console.log('Corrected update amount text from .00 pattern:', amountText);
            } else if (amountText.includes('.0')) {
              // For amounts with .0, remove the decimal and add a zero
              // This converts $X.0 to $X0
              amountText = amountText.replace('.0', '0');
              console.log('Corrected update amount text from .0 pattern:', amountText);
            }
            
            // Handle "five thousand" being transcribed as "5000" or "5,000"
            amountText = amountText.replace(/,/g, '');
            
            // Special case for common amounts with thousand indicators
            if (hasThousandIndicator) {
              const numValue = parseFloat(amountText);
              if (numValue < 10) {  // If we have a single digit like "5" and "thousand"
                amountText = (numValue * 1000).toString();
                console.log('Adjusted update for "thousand":', amountText);
              } else if (numValue >= 10 && numValue < 100) {
                // For two-digit numbers like "50" with "thousand", multiply by 100
                // This handles cases like "fifty thousand" -> "50" + "thousand" -> 5000
                amountText = (numValue * 100).toString();
                console.log('Adjusted update two-digit number for "thousand":', amountText);
              }
            }
            
            // Final check for unreasonably small amounts in a budget context
            const parsedAmount = parseFloat(amountText);
            if (parsedAmount <= 10 && !normalizedTranscript.includes('coffee') && !normalizedTranscript.includes('small')) {
              // If amount is very small and doesn't seem to be for coffee or explicitly small purchase,
              // it's likely a misheard larger amount
              amountText = (parsedAmount * 1000).toString();
              console.log('Adjusted unreasonably small update amount:', amountText);
            }
          } else {
            console.log('Preserving exact amount:', amountText);
          }
          
          // Parse the corrected amount
          const newAmount = parseFloat(amountText);
          console.log('Final parsed update amount:', newAmount);
          
          // Clean up the description for better matching
          const cleanDescription = description
            .replace(/^(the|my)\s+/i, '') // Remove "the" or "my" from the beginning
            .replace(/\s+(expense|transaction|bill|payment)$/i, '') // Remove trailing "expense", "transaction", etc.
            .trim();
          
          console.log('Cleaned description for matching:', cleanDescription);
          console.log('All transactions:', transactions.map(t => t.description));
          
          // Try exact match first (case-insensitive)
          let transactionIndex = transactions.findIndex(t => 
            t.description.toLowerCase() === cleanDescription.toLowerCase()
          );
          
          console.log('Exact match result:', transactionIndex);
          
          // If no exact match, try fuzzy matching
          if (transactionIndex === -1) {
            console.log('No exact match found, trying fuzzy matching');
            
            // Try to find a transaction that contains the description as a substring
            transactionIndex = transactions.findIndex(t => 
              t.description.toLowerCase().includes(cleanDescription.toLowerCase())
            );
            
            console.log('Substring match result:', transactionIndex);
            
            // If still no match, try to find a transaction where the description contains any word from the search
            if (transactionIndex === -1) {
              console.log('No substring match found, trying word matching');
              
              const searchWords = cleanDescription.toLowerCase().split(/\s+/).filter(word => word.length > 2);
              console.log('Search words:', searchWords);
              
              if (searchWords.length > 0) {
                for (let i = 0; i < transactions.length; i++) {
                  const transactionDesc = transactions[i].description.toLowerCase();
                  console.log(`Checking transaction ${i}: "${transactionDesc}"`);
                  
                  // Check if any search word is in the transaction description
                  for (const word of searchWords) {
                    if (transactionDesc.includes(word)) {
                      transactionIndex = i;
                      console.log(`Found match with word "${word}" in transaction "${transactionDesc}"`);
                      break;
                    }
                  }
                  
                  if (transactionIndex !== -1) break;
                }
              }
            }
            
            // If still no match, try a more aggressive approach for very short descriptions
            if (transactionIndex === -1) {
              console.log('Trying more aggressive matching for any description');
              
              // For any descriptions, check if any transaction contains this text or vice versa
              for (let i = 0; i < transactions.length; i++) {
                const transactionDesc = transactions[i].description.toLowerCase();
                const cleanDescLower = cleanDescription.toLowerCase();
                
                // Check if the transaction description contains the entire search term
                // or if the search term contains the transaction description
                // or if they share common words
                if (transactionDesc.includes(cleanDescLower) || 
                    cleanDescLower.includes(transactionDesc) ||
                    // Check if they share at least one significant word (3+ characters)
                    transactionDesc.split(/\s+/).some(word => 
                      word.length > 2 && cleanDescLower.includes(word)
                    )) {
                  transactionIndex = i;
                  console.log(`Found aggressive match: "${cleanDescription}" with "${transactionDesc}"`);
                  break;
                }
              }
            }
          }
          
          if (transactionIndex !== -1) {
            const transaction = transactions[transactionIndex];
            const isIncome = transaction.category === 'Income';
            const signedAmount = isIncome ? newAmount : -newAmount;
            
            handleUpdateTransaction(transactionIndex, { amount: signedAmount });
            setSpeechFeedback(`Updated "${transactions[transactionIndex].description}" to $${newAmount}`);
          } else {
            setSpeechFeedback(`Could not find a transaction matching "${description}". Please try with the exact description.`);
          }
        } else {
          // Provide more specific feedback
          if (!descriptionMatch) {
            setSpeechFeedback('Could not understand which transaction to update. Please specify the exact description.');
          } else if (!amountMatch) {
            setSpeechFeedback('Could not understand the new amount. Please specify an amount like "to $5000" or "to 5000 dollars".');
          } else {
            setSpeechFeedback('Could not understand the update details. Please try again with description and new amount.');
          }
        }
      } else {
        setSpeechFeedback('Command not recognized. Try "add expense to [category] for [description] $[amount]" or "update expense [description] to $[amount]"');
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      setSpeechFeedback(`Error processing voice command: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Clear feedback after 5 seconds
    setTimeout(() => {
      setSpeechFeedback(null);
    }, 5000);
  };
  
  // Toggle speech recognition
  const toggleListening = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechFeedback('Speech recognition not supported in this browser.');
      return;
    }
    
    try {
      if (isListening) {
        console.log('Stopping speech recognition');
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsListening(false);
        setSpeechFeedback('Voice recognition stopped.');
        
        // After a short delay, clear the feedback
        setTimeout(() => {
          setSpeechFeedback(null);
        }, 2000);
      } else {
        console.log('Starting speech recognition');
        
        // Request microphone permission explicitly
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            // Clear any previous feedback
            setSpeechFeedback('Listening... Speak clearly and take your time.');
            
            // Create a new instance
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            
            // Configure
            if (recognitionRef.current) {
              recognitionRef.current.continuous = true;
              recognitionRef.current.interimResults = true;
              recognitionRef.current.lang = 'en-US';
              
              // Local variables for timers
              let localProcessingTimeout: NodeJS.Timeout | null = null;
              let localSilenceTimer: NodeJS.Timeout | null = null;
              let localResetTextTimer: NodeJS.Timeout | null = null;
              
              // Set up event handlers
              recognitionRef.current.onresult = (event) => {
                console.log('Speech recognition result received:', event);
                
                // Clear any existing processing timeout
                if (localProcessingTimeout) {
                  clearTimeout(localProcessingTimeout);
                  localProcessingTimeout = null;
                }
                
                // Reset silence timer if it exists
                if (localSilenceTimer) {
                  clearTimeout(localSilenceTimer);
                  localSilenceTimer = null;
                }
                
                // Reset the text reset timer if it exists
                if (localResetTextTimer) {
                  clearTimeout(localResetTextTimer);
                  localResetTextTimer = null;
                }
                
                // Collect interim and final results
                let interimTranscript = '';
                let finalTranscript = '';
                
                // Process all results to ensure we capture everything
                const results = event.results as unknown as { 
                  length: number, 
                  [index: number]: { 
                    [index: number]: { 
                      transcript: string; 
                      confidence: number; 
                    }, 
                    isFinal?: boolean 
                  } 
                };
                
                for (let i = 0; i < results.length; i++) {
                  const result = results[i];
                  if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                  } else {
                    interimTranscript += result[0].transcript;
                  }
                }
                
                // Show interim feedback
                if (interimTranscript) {
                  console.log('Interim transcript:', interimTranscript);
                  setSpeechFeedback(`Listening: "${interimTranscript}"`);
                }
                
                // Process final transcript
                if (finalTranscript) {
                  console.log('Final transcript:', finalTranscript);
                  setSpeechFeedback(`Heard: "${finalTranscript}" (processing...)`);
                  
                  // Process the command
                  processVoiceCommand(finalTranscript);
                }
              };
              
              // Handle errors
              recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                
                let errorMessage = 'Error with speech recognition';
                
                // Provide more specific error messages
                switch (event.error) {
                  case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                  case 'aborted':
                    errorMessage = 'Speech recognition was aborted.';
                    break;
                  case 'audio-capture':
                    errorMessage = 'Could not capture audio. Please check your microphone.';
                    break;
                  case 'network':
                    errorMessage = 'Network error occurred. Please check your connection.';
                    break;
                  case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access.';
                    break;
                  case 'service-not-allowed':
                    errorMessage = 'Speech recognition service not allowed.';
                    break;
                  case 'bad-grammar':
                    errorMessage = 'Grammar error in speech recognition.';
                    break;
                  case 'language-not-supported':
                    errorMessage = 'Language not supported for speech recognition.';
                    break;
                  default:
                    errorMessage = `Error: ${event.error}`;
                }
                
                setSpeechFeedback(errorMessage);
                
                // Don't automatically turn off listening for no-speech errors
                if (event.error !== 'no-speech') {
                  setIsListening(false);
                }
              };
              
              // Handle end
              recognitionRef.current.onend = () => {
                console.log('Speech recognition ended');
                
                // Restart if we're still supposed to be listening
                if (isListening) {
                  try {
                    console.log('Restarting speech recognition');
                    recognitionRef.current?.start();
                  } catch (error) {
                    console.error('Error restarting speech recognition:', error);
                    setIsListening(false);
                    setSpeechFeedback('Speech recognition stopped due to an error.');
                  }
                }
              };
              
              // Start recognition
              recognitionRef.current.start();
              setIsListening(true);
            }
          })
          .catch((error) => {
            console.error('Error getting microphone permission:', error);
            setSpeechFeedback('Microphone access denied. Please allow microphone access.');
            setIsListening(false);
          });
      }
    } catch (error) {
      console.error('Error toggling speech recognition:', error);
      setSpeechFeedback(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Clear the recently dropped state after animation completes
  useEffect(() => {
    if (recentlyDropped) {
      const timer = setTimeout(() => {
        setRecentlyDropped(null);
      }, 800); // Animation duration + a little extra
      
      return () => clearTimeout(timer);
    }
  }, [recentlyDropped]);
  
  // Handle opening the color picker
  const handleOpenColorPicker = (event: React.MouseEvent<HTMLElement>, category: string) => {
    setColorPickerAnchor(event.currentTarget);
    setCurrentCategory(category);
  };
  
  // Handle closing the color picker
  const handleCloseColorPicker = () => {
    setColorPickerAnchor(null);
    setCurrentCategory(null);
  };
  
  // Handle color selection
  const handleColorSelect = (color: string) => {
    if (!currentCategory) return;
    
    const updatedColors = {
      ...tableColors,
      [currentCategory]: color
    };
    
    setTableColors(updatedColors);
    setColorPickerAnchor(null);
    setCurrentCategory(null);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.TABLE_COLORS, JSON.stringify(updatedColors));
  };

  // Load data from local storage on component mount
  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        // Load transactions
        const savedTransactions = getStorageItem(STORAGE_KEYS.TRANSACTIONS, LEGACY_STORAGE_KEYS.TRANSACTIONS);
        if (savedTransactions) {
          const parsedTransactions = JSON.parse(savedTransactions);
          // Convert string dates back to Date objects
          setTransactions(parsedTransactions.map((t: any) => ({
            ...t,
            date: new Date(t.date)
          })));
        }
        
        // Load budget summary
        const savedSummary = getStorageItem(STORAGE_KEYS.SUMMARY, LEGACY_STORAGE_KEYS.SUMMARY);
        if (savedSummary) {
          setBudgetSummary(JSON.parse(savedSummary));
        }
        
        // Load budget plan
        const savedPlan = getStorageItem(STORAGE_KEYS.PLAN, LEGACY_STORAGE_KEYS.PLAN);
        if (savedPlan) {
          setBudgetPlan(JSON.parse(savedPlan));
        }
        
        // Load suggestions
        const savedSuggestions = getStorageItem(STORAGE_KEYS.SUGGESTIONS, LEGACY_STORAGE_KEYS.SUGGESTIONS);
        if (savedSuggestions) {
          setSuggestions(JSON.parse(savedSuggestions));
        }
        
        // Load table colors
        const savedTableColors = getStorageItem(STORAGE_KEYS.TABLE_COLORS, LEGACY_STORAGE_KEYS.TABLE_COLORS);
        if (savedTableColors) {
          setTableColors(JSON.parse(savedTableColors));
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    };
    
    loadFromLocalStorage();
  }, []);

  // Save data to local storage whenever it changes
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('budgetFriendly_transactions', JSON.stringify(transactions));
    }
    
    if (budgetSummary) {
      localStorage.setItem('budgetFriendly_summary', JSON.stringify(budgetSummary));
    }
    
    if (budgetPlan) {
      localStorage.setItem('budgetFriendly_plan', JSON.stringify(budgetPlan));
    }
    
    if (suggestions.length > 0) {
      localStorage.setItem('budgetFriendly_suggestions', JSON.stringify(suggestions));
    }
  }, [transactions, budgetSummary, budgetPlan, suggestions]);

  const steps = ['Enter Transactions', 'Review Transactions', 'View Budget Plan'];

  const handleNext = () => {
    if (activeStep === 0) {
      if (transactions.length === 0) {
        setAlertMessage({
          type: 'warning',
          message: 'Please add at least one transaction before proceeding.'
        });
        return;
      }
      
      // Transactions are already processed automatically when added
      setActiveStep(1);
    } else if (activeStep === 1) {
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    // Clear all data
    setTransactions([]);
    setBudgetSummary(null);
    setBudgetPlan(null);
    setSuggestions([]);
    setActiveStep(0);
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.SUMMARY);
    localStorage.removeItem(STORAGE_KEYS.PLAN);
    localStorage.removeItem(STORAGE_KEYS.SUGGESTIONS);
    
    // Also clear legacy keys
    localStorage.removeItem(LEGACY_STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.SUMMARY);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.PLAN);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.SUGGESTIONS);
    
    setAlertMessage({
      type: 'success',
      message: 'All data has been reset. Start fresh with a new budget!'
    });
  };

  // Handle manual transaction entry
  const handleManualTransactionAdd = (transaction: Transaction) => {
    // Get current transactions from state or localStorage
    let currentTransactions = [...transactions];
    
    try {
      // Double-check localStorage in case there are more transactions there than in state
      // This can happen if transactions were added in another tab
      const currentStoredTransactions = getStorageItem(STORAGE_KEYS.TRANSACTIONS, LEGACY_STORAGE_KEYS.TRANSACTIONS);
      if (currentStoredTransactions) {
        const parsedTransactions = JSON.parse(currentStoredTransactions);
        if (parsedTransactions.length > currentTransactions.length) {
          console.log('Found more transactions in localStorage than in state, using localStorage data');
          // Convert string dates back to Date objects
          currentTransactions = parsedTransactions.map((t: any) => ({
            ...t,
            date: new Date(t.date)
          }));
        }
      }
    } catch (error) {
      console.error('Error checking localStorage for existing transactions:', error);
    }
    
    // Add the transaction to our list
    const updatedTransactions = [...currentTransactions, transaction];
    
    console.log('Current transactions count:', currentTransactions.length);
    console.log('Updated transactions count:', updatedTransactions.length);
    
    setTransactions(updatedTransactions);
    
    // Save directly to localStorage to prevent race conditions
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));
    
    // Show success message
    setAlertMessage({
      type: 'success',
      message: currentTransactions.length === 0 
        ? 'First transaction added! Continue adding transactions to see your budget plan.'
        : 'Transaction added successfully!'
    });
    
    // Automatically process transactions
    try {
      // Calculate budget summary
      const summary = calculateBudgetSummary(updatedTransactions);
      setBudgetSummary(summary);
      
      // Save summary directly to localStorage
      localStorage.setItem(STORAGE_KEYS.SUMMARY, JSON.stringify(summary));
      
      // Create budget plan
      const plan = create503020Plan(summary);
      setBudgetPlan(plan);
      
      // Save plan directly to localStorage
      localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(plan));
      
      // Generate suggestions
      const budgetSuggestions = getBudgetSuggestions(plan);
      setSuggestions(budgetSuggestions);
      
      // Save suggestions directly to localStorage
      localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(budgetSuggestions));
    } catch (error) {
      console.error('Error processing transaction:', error);
      setAlertMessage({
        type: 'error',
        message: 'Error processing transaction. Please try again.'
      });
    }
  };

  // Group transactions by category and sort by amount descending
  const getTransactionsByCategory = () => {
    const grouped: Record<string, Transaction[]> = {
      'Essentials': [],
      'Wants': [],
      'Savings': []
    };
    
    // Group transactions (excluding Income)
    transactions.forEach(transaction => {
      if (transaction.category && transaction.category !== 'Income' && 
          (transaction.category === 'Essentials' || 
           transaction.category === 'Wants' || 
           transaction.category === 'Savings')) {
        grouped[transaction.category].push(transaction);
      }
    });
    
    return grouped;
  };

  // Get total income
  const getTotalIncome = () => {
    return transactions
      .filter(t => t.category === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, transaction: Transaction, globalIndex: number) => {
    // Set the data to be transferred
    e.dataTransfer.setData('text/plain', JSON.stringify({
      globalIndex,
      transactionId: `${transaction.date.toISOString()}-${transaction.description}-${transaction.amount}`
    }));
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a ghost image effect
    const element = e.currentTarget as HTMLElement;
    if (element) {
      // Apply a visual effect to the dragged element
      element.style.opacity = '0.4';
      
      // Reset the style when drag ends
      setTimeout(() => {
        element.style.opacity = '1';
      }, 0);
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(category);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    setDragOverCategory(null);
    
    try {
      // Parse the data that was set in handleDragStart
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { globalIndex, transactionId } = data;
      
      // Update the transaction's category
      if (globalIndex !== -1 && globalIndex < transactions.length) {
        // Ensure targetCategory is a valid category type
        const validCategory = targetCategory as Transaction['category'];
        handleUpdateTransaction(globalIndex, { category: validCategory });
        
        // Set the recently dropped transaction for animation
        setRecentlyDropped(transactionId);
        
        // Clear the recently dropped transaction after animation
        setTimeout(() => {
          setRecentlyDropped('');
        }, 1000);
      }
    } catch (error) {
      console.error('Error processing drop:', error);
    }
  };

  // Process transactions and move to next step
  const handleProcessTransactions = () => {
    if (transactions.length === 0) {
      setAlertMessage({
        type: 'warning',
        message: 'Please add at least one transaction before proceeding.'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Calculate budget summary
      const summary = calculateBudgetSummary(transactions);
      setBudgetSummary(summary);
      
      // Create budget plan
      const plan = create503020Plan(summary);
      setBudgetPlan(plan);
      
      // Get suggestions
      const budgetSuggestions = getBudgetSuggestions(plan);
      setSuggestions(budgetSuggestions);
      
      // Move to next step
      setActiveStep(1);
      
      setAlertMessage({
        type: 'success',
        message: 'Transactions processed successfully!'
      });
    } catch (error) {
      console.error('Error processing transactions:', error);
      setAlertMessage({
        type: 'error',
        message: `Error processing transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to handle transaction updates
  const handleUpdateTransaction = (index: number, updatedTransaction: Partial<Transaction>) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      console.error(`Invalid transaction index: ${index}`);
      setAlertMessage({
        type: 'error',
        message: 'Could not update transaction: Invalid index'
      });
      return;
    }

    const updatedTransactions = [...transactions];
    updatedTransactions[index] = {
      ...updatedTransactions[index],
      ...updatedTransaction
    };
    
    setTransactions(updatedTransactions);
    
    // Save to localStorage
    localStorage.setItem('budgetFriendly_transactions', JSON.stringify(updatedTransactions));
    
    // Automatically recalculate budget
    try {
      // Calculate budget summary
      const summary = calculateBudgetSummary(updatedTransactions);
      setBudgetSummary(summary);
      
      // Create budget plan
      const plan = create503020Plan(summary);
      setBudgetPlan(plan);
      
      // Get suggestions
      const budgetSuggestions = getBudgetSuggestions(plan);
      setSuggestions(budgetSuggestions);
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.SUMMARY, JSON.stringify(summary));
      localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(plan));
      localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(budgetSuggestions));
      
      setAlertMessage({
        type: 'success',
        message: 'Transaction updated successfully!'
      });
    } catch (error) {
      console.error('Error processing transactions:', error);
      setAlertMessage({
        type: 'error',
        message: `Error updating transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Add a function to handle transaction deletion
  const handleDeleteTransaction = (index: number) => {
    // Ensure the index is valid
    if (index < 0 || index >= transactions.length) {
      console.error(`Invalid transaction index: ${index}`);
      setAlertMessage({
        type: 'error',
        message: 'Could not delete transaction: Invalid index'
      });
      return;
    }

    // Create a copy of the transactions array without the deleted transaction
    const updatedTransactions = transactions.filter((_, i) => i !== index);
    
    setTransactions(updatedTransactions);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));
    
    // Automatically recalculate budget
    try {
      // Calculate budget summary
      const summary = calculateBudgetSummary(updatedTransactions);
      setBudgetSummary(summary);
      
      // Create budget plan
      const plan = create503020Plan(summary);
      setBudgetPlan(plan);
      
      // Get suggestions
      const budgetSuggestions = getBudgetSuggestions(plan);
      setSuggestions(budgetSuggestions);
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.SUMMARY, JSON.stringify(summary));
      localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(plan));
      localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(budgetSuggestions));
      
      setAlertMessage({
        type: 'success',
        message: 'Transaction deleted successfully!'
      });
    } catch (error) {
      console.error('Error processing transactions after deletion:', error);
      setAlertMessage({
        type: 'error',
        message: `Error updating budget after deletion: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3, backgroundColor: 'background.default' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}>
        Friendly Budgets
      </Typography>
      
      {/* Alert Messages */}
      {alertMessage && (
        <Alert 
          severity={alertMessage.type} 
          sx={{ mb: 3 }}
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage.message}
        </Alert>
      )}
      
      {/* Main Content - Always show transaction entry */}
      <Box>
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3, backgroundColor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Manual Transaction Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter your transactions below to create your budget plan.
          </Typography>
          
          <ManualTransactionEntry onAddTransaction={handleManualTransactionAdd} />
        </Paper>

        {/* Display transactions */}
        {transactions.length > 0 && (
          <Box sx={{ mt: 3 }}>
            {/* Display Income Summary */}
            {(() => {
              const totalIncome = getTotalIncome();
              
              return totalIncome > 0 ? (
                <Box 
                  sx={{ 
                    mb: 4, 
                    textAlign: 'center',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'success.light',
                    color: 'success.contrastText'
                  }}
                >
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 'bold',
                    }}
                  >
                    INCOME: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(totalIncome)}
                  </Typography>
                </Box>
              ) : null;
            })()}
            
            {/* Display transactions grouped by category */}
            {Object.entries(getTransactionsByCategory()).map(([category, categoryTransactions]) => (
              <Box 
                key={category} 
                sx={{ mb: 3 }}
                onDragOver={(e) => handleDragOver(e, category)}
                onDrop={(e) => handleDrop(e, category)}
                onDragLeave={() => setDragOverCategory(null)}
              >
                <Typography variant="h6" gutterBottom>
                  {category} ({categoryTransactions.length})
                </Typography>
                <Paper 
                  sx={{ 
                    overflow: 'hidden',
                    backgroundColor: tableColors[category] || '#f5f5f5',
                    transition: 'all 0.3s ease',
                    color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit',
                    ...(dragOverCategory === category && {
                      boxShadow: '0 0 15px rgba(25, 118, 210, 0.5)',
                      transform: 'translateY(-4px)',
                      border: '2px dashed #1976d2'
                    })
                  }}
                >
                  <Box sx={{ 
                    width: '100%',
                    overflowX: 'auto',
                    overflowY: 'hidden'
                  }}>
                    <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell 
                            padding="checkbox" 
                            width="50px"
                            sx={{ 
                              color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit',
                              '& .MuiIconButton-root': {
                                color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                              }
                            }}
                          >
                            <Box 
                              sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <IconButton 
                                size="small" 
                                onClick={(e) => handleOpenColorPicker(e, category)}
                                sx={{ 
                                  color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                }}
                              >
                                <PaletteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell
                            sx={{ 
                              color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                            }}
                          >
                            Due Date
                          </TableCell>
                          <TableCell
                            sx={{ 
                              color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                            }}
                          >Description</TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                            }}
                          >Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryTransactions.map((transaction, index) => {
                          // Create a more reliable way to find the transaction in the global array
                          // Using a combination of properties to create a unique identifier
                          const transactionId = `${transaction.date.toISOString()}-${transaction.description}-${transaction.amount}`;
                          
                          // Find the global index more reliably
                          const globalIndex = transactions.findIndex(t => 
                            t.date.toISOString() === transaction.date.toISOString() && 
                            t.description === transaction.description && 
                            t.amount === transaction.amount
                          );
                          
                          const isEditing = editingRow && editingRow.identifier === transactionId;
                          
                          return (
                            <TableRow 
                              key={transactionId}
                              draggable={!isEditing}
                              onDragStart={(e) => handleDragStart(e, transaction, globalIndex)}
                              onClick={(e) => {
                                // Don't trigger edit when clicking on drag handle or save/cancel buttons
                                if (e.target instanceof HTMLElement && 
                                    (e.target.closest('.drag-handle') || 
                                     e.target.closest('.edit-controls'))) {
                                  return;
                                }
                                
                                if (!isEditing) {
                                  setEditingRow({ 
                                    index: globalIndex, 
                                    identifier: transactionId,
                                    amount: String(Math.abs(transaction.amount)),
                                    date: transaction.date.toISOString().split('T')[0], // YYYY-MM-DD format
                                    description: transaction.description
                                  });
                                }
                              }}
                              sx={{ 
                                cursor: isEditing ? 'default' : 'pointer',
                                '&:hover': {
                                  bgcolor: isEditing ? 'transparent' : 'action.hover',
                                },
                                bgcolor: isEditing ? 'action.selected' : 'transparent',
                                transition: 'background-color 0.2s ease',
                                // Animation for recently dropped transactions
                                ...(recentlyDropped === transactionId && {
                                  animation: 'popIn 0.6s ease-out',
                                  position: 'relative',
                                  zIndex: 1,
                                  transformOrigin: 'center',
                                  '@keyframes popIn': {
                                    '0%': {
                                      transform: 'scale(0.95)',
                                      boxShadow: '0 0 0 rgba(0,0,0,0)',
                                      opacity: 0.7
                                    },
                                    '50%': {
                                      transform: 'scale(1.02)', // Reduced from 1.03 to minimize overflow
                                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                      opacity: 1
                                    },
                                    '100%': {
                                      transform: 'scale(1)',
                                      boxShadow: '0 0 0 rgba(0,0,0,0)',
                                      opacity: 1
                                    }
                                  }
                                })
                              }}
                            >
                              <TableCell padding="checkbox">
                                {isEditing ? (
                                  <Box className="edit-controls" sx={{ display: 'flex' }}>
                                    <IconButton 
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent row click event
                                        // Save all changes
                                        if (editingRow) {
                                          const updates: Partial<Transaction> = {};
                                          
                                          // Update amount if valid
                                          const cleanValue = editingRow.amount.replace(/[^0-9.]/g, '');
                                          const parsedAmount = parseFloat(cleanValue);
                                          if (!isNaN(parsedAmount)) {
                                            // Keep the sign consistent with the category
                                            const signedAmount = transaction.category === 'Income' 
                                              ? Math.abs(parsedAmount) 
                                              : -Math.abs(parsedAmount);
                                            updates.amount = signedAmount;
                                          }
                                          
                                          // Update date if changed
                                          if (editingRow.date) {
                                            try {
                                              updates.date = new Date(editingRow.date);
                                            } catch (e) {
                                              // Invalid date, ignore
                                            }
                                          }
                                          
                                          // Update description if changed
                                          if (editingRow.description.trim() !== transaction.description) {
                                            updates.description = editingRow.description.trim();
                                          }
                                          
                                          // Apply all updates
                                          handleUpdateTransaction(globalIndex, updates);
                                        }
                                        setEditingRow(null);
                                      }}
                                      color="primary"
                                    >
                                      <SaveIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton 
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent row click event
                                        setEditingRow(null);
                                      }}
                                      sx={{ ml: 0.5 }}
                                    >
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ) : (
                                  <Box 
                                    className="drag-handle"
                                    sx={{ 
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Tooltip title="Drag to another category">
                                      <DragIndicatorIcon 
                                        fontSize="small" 
                                        color="action" 
                                        sx={{ 
                                          cursor: 'grab',
                                          color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : undefined
                                        }}
                                      />
                                    </Tooltip>
                                    <Tooltip title="Delete transaction">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation(); // Prevent row click event
                                          // Confirm before deleting
                                          if (window.confirm(`Are you sure you want to delete this transaction: ${transaction.description}?`)) {
                                            handleDeleteTransaction(globalIndex);
                                          }
                                        }}
                                        sx={{ 
                                          ml: 1,
                                          color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'error.main'
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell
                                sx={{ 
                                  color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                }}
                              >
                                {isEditing ? (
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={editingRow?.date || ''}
                                    type="date"
                                    onChange={(e) => setEditingRow(prev => prev ? { ...prev, date: e.target.value } : null)}
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{
                                      '& .MuiInputBase-input': {
                                        color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                      },
                                      '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: isColorDark(tableColors[category] || '#f5f5f5') ? 'rgba(255, 255, 255, 0.5)' : undefined
                                      },
                                      '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: isColorDark(tableColors[category] || '#f5f5f5') ? 'rgba(255, 255, 255, 0.7)' : undefined
                                      }
                                    }}
                                  />
                                ) : (
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    '& .edit-hint': {
                                      opacity: 0,
                                      transition: 'opacity 0.2s ease'
                                    },
                                    '&:hover .edit-hint': {
                                      opacity: 0.5
                                    },
                                    color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                  }}>
                                    <Typography
                                      sx={{
                                        color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                      }}
                                    >{transaction.date.toLocaleDateString()}</Typography>
                                    <Typography 
                                      className="edit-hint" 
                                      variant="caption" 
                                      color={isColorDark(tableColors[category] || '#f5f5f5') ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'}
                                      sx={{ ml: 1 }}
                                    >
                                      (Click to edit)
                                    </Typography>
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell
                                sx={{ 
                                  color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                }}
                              >
                                {isEditing ? (
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={editingRow?.description || ''}
                                    onChange={(e) => setEditingRow(prev => prev ? { ...prev, description: e.target.value } : null)}
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{
                                      '& .MuiInputBase-input': {
                                        color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                      },
                                      '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: isColorDark(tableColors[category] || '#f5f5f5') ? 'rgba(255, 255, 255, 0.5)' : undefined
                                      },
                                      '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: isColorDark(tableColors[category] || '#f5f5f5') ? 'rgba(255, 255, 255, 0.7)' : undefined
                                      }
                                    }}
                                  />
                                ) : (
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    '& .edit-hint': {
                                      opacity: 0,
                                      transition: 'opacity 0.2s ease'
                                    },
                                    '&:hover .edit-hint': {
                                      opacity: 0.5
                                    },
                                    color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                  }}>
                                    <Typography
                                      sx={{
                                        color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                      }}
                                    >{transaction.description}</Typography>
                                    <Typography 
                                      className="edit-hint" 
                                      variant="caption" 
                                      color={isColorDark(tableColors[category] || '#f5f5f5') ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'}
                                      sx={{ ml: 1 }}
                                    >
                                      (Click to edit)
                                    </Typography>
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell 
                                align="right"
                                sx={{ 
                                  color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                }}
                              >
                                {isEditing ? (
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={editingRow?.amount || ''}
                                    onChange={(e) => {
                                      // Only allow numbers and decimal point
                                      const value = e.target.value.replace(/[^0-9.]/g, '');
                                      setEditingRow(prev => prev ? { ...prev, amount: value } : null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    InputProps={{
                                      startAdornment: <Typography sx={{ 
                                        mr: 0.5,
                                        color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit'
                                      }}>$</Typography>,
                                    }}
                                    sx={{
                                      '& .MuiInputBase-input': {
                                        color: isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit',
                                        textAlign: 'right'
                                      },
                                      '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: isColorDark(tableColors[category] || '#f5f5f5') ? 'rgba(255, 255, 255, 0.5)' : undefined
                                      },
                                      '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: isColorDark(tableColors[category] || '#f5f5f5') ? 'rgba(255, 255, 255, 0.7)' : undefined
                                      }
                                    }}
                                  />
                                ) : (
                                  <span style={{ 
                                    color: transaction.amount > 0 
                                      ? (isColorDark(tableColors[category] || '#f5f5f5') ? '#8fffb8' : '#2e7d32') 
                                      : (isColorDark(tableColors[category] || '#f5f5f5') ? '#fff' : 'inherit')
                                  }}>
                                    ${Math.abs(transaction.amount).toFixed(2)}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </Box>
            ))}
        </Box>
      )}
      
        {/* Always show budget summary if we have transactions */}
        {transactions.length > 0 && budgetSummary && budgetPlan && (
          <Box sx={{ mt: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 2, backgroundColor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Your Budget Plan
                </Typography>
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small"
                  onClick={handleReset}
                >
                  Reset Budget
                </Button>
              </Box>
              <BudgetSummary 
                summary={budgetSummary} 
                plan={budgetPlan} 
                suggestions={suggestions}
              />
            </Paper>
          </Box>
        )}
      </Box>

      {/* Color Picker Popover */}
      <Popover
        open={Boolean(colorPickerAnchor)}
        anchorEl={colorPickerAnchor}
        onClose={handleCloseColorPicker}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, width: 250 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Select table color for {currentCategory}
          </Typography>
          <HexColorPicker 
            color={currentCategory ? tableColors[currentCategory] : '#f5f5f5'} 
            onChange={(color) => handleColorSelect(color)}
            style={{ width: '100%', height: 200 }}
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '50%', 
                bgcolor: currentCategory ? tableColors[currentCategory] : '#f5f5f5',
                border: '1px solid #ccc'
              }} 
            />
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {currentCategory ? tableColors[currentCategory] : '#f5f5f5'}
            </Typography>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={handleCloseColorPicker}
            >
              Done
            </Button>
        </Box>
        </Box>
      </Popover>

      {/* Speech recognition feedback */}
      {speechFeedback && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 2,
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            minWidth: 300,
            maxWidth: '80%'
          }}
        >
          {speechFeedback}
        </Alert>
      )}
      
      {/* Voice command button */}
      <Tooltip title={isListening ? "Listening... Click to stop" : "Add or update with voice"}>
        <Fab 
          color={isListening ? "secondary" : "primary"}
          aria-label="voice command"
          onClick={toggleListening}
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20,
            zIndex: 1000,
            animation: isListening ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': {
                boxShadow: '0 0 0 0 rgba(156, 39, 176, 0.7)'
              },
              '70%': {
                boxShadow: '0 0 0 10px rgba(156, 39, 176, 0)'
              },
              '100%': {
                boxShadow: '0 0 0 0 rgba(156, 39, 176, 0)'
              }
            }
          }}
        >
          <MicIcon fontSize="small" />
        </Fab>
      </Tooltip>
      
      {/* Help button for voice commands */}
      <Tooltip title="Voice Command Help">
        <Fab 
          color="info"
          aria-label="voice command help"
          onClick={() => setHelpDialogOpen(true)}
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 90,
            zIndex: 1000
          }}
          size="small"
        >
          <HelpOutlineIcon fontSize="small" />
        </Fab>
      </Tooltip>
      
      {/* Voice command help dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        aria-labelledby="voice-command-help-dialog"
        maxWidth="md"
      >
        <DialogTitle id="voice-command-help-dialog">Voice Command Help</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Adding Transactions</Typography>
          <Typography variant="body1" paragraph>
            You can add transactions using natural language. Here are some examples:
              </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
            "Add expense to essentials for groceries $150"
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
            "I spent $75 on dinner with friends"
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
            "Record a payment for rent in essentials 1200 dollars"
          </Typography>
          <Typography variant="body2" paragraph>
            More examples:
          </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            • "Create expense for coffee 5 dollars"
          </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            • "I paid 50 dollars for gas in essentials"
          </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            • "New expense movie tickets under wants 25 dollars"
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, mb: 2 }}>
            • "Log expense savings for emergency fund $500"
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Note:</strong> If you don't specify a category, the expense will be added to "Uncategorized".
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Tips for Accurate Amount Recognition</Typography>
          <Typography variant="body2" paragraph>
            Speech recognition sometimes has trouble with large numbers. For better results:
          </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            • <strong>For $5000:</strong> Say "five thousand dollars" clearly (not "five thousand")
          </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            • <strong>Alternative:</strong> Say "five K" (like "five kay") for $5000
          </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            • <strong>For exact amounts</strong> like $2142, say each digit clearly: "two one four two dollars"
          </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            • <strong>Speak slowly:</strong> Pause before and after saying the amount
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, mb: 2 }}>
            • <strong>If you see $5.00:</strong> Try saying "fifty hundred dollars" instead
          </Typography>
          <Typography variant="body2" paragraph sx={{ bgcolor: 'info.light', p: 1, borderRadius: 1 }}>
            <strong>Important:</strong> The app now has special handling for $5.00 → $5000 and other common misrecognitions, 
            while preserving exact amounts like $2142. If you see incorrect amounts, please check the console logs.
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Updating Transactions</Typography>
              <Typography variant="body1" paragraph>
            To update an existing transaction, you can use phrases like:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
            "Update mortgage to $2000"
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
            "Change rent payment to 1250 dollars"
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
            "Update the internet to be $90"
              </Typography>
              <Typography variant="body2" paragraph>
            More examples:
              </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            • "Edit grocery expense to $175"
              </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            • "Modify my car payment to 350 dollars"
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, mb: 2 }}>
            • "Fix the dinner with friends to $85"
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Note:</strong> The app will try to find the best match for your description. You can use simple descriptions (e.g., "update mortgage") or more detailed ones (e.g., "update the mortgage payment").
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Manual Transaction Entry Component
function ManualTransactionEntry({ onAddTransaction }: { onAddTransaction: (transaction: Transaction) => void }) {
  const [dueDay, setDueDay] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Transaction['category']>('Essentials');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (category === 'Income' && !amount) {
      return;
    } else if (category !== 'Income' && (!description || !amount)) {
      return;
    }
    
    // Create a date object with the selected day
    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    
    // Create transaction object
    const transaction: Transaction = {
      date: dueDate,
      description: category === 'Income' ? 'Monthly Income' : description,
      amount: category === 'Income' ? 
        Math.abs(parseFloat(amount)) : 
        -Math.abs(parseFloat(amount)),
      category
    };
    
    // Call the callback
    onAddTransaction(transaction);
    
    // Reset form
    setDescription('');
    setAmount('');
    setCategory('Essentials');
  };
  
  // Generate options for days 1-31
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
  
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        {/* Category Selection */}
        <Grid item xs={12}>
          <FormControl fullWidth required>
            <InputLabel>Transaction Type</InputLabel>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as Transaction['category'])}
              label="Transaction Type"
            >
              <MenuItem value="Income" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                Income (Monthly)
              </MenuItem>
              <MenuItem value="Essentials">Essentials (Bills, Necessities)</MenuItem>
              <MenuItem value="Wants">Wants (Entertainment, Dining)</MenuItem>
              <MenuItem value="Savings">Savings (Investments, Emergency Fund)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {/* Income Entry - Simplified */}
        {category === 'Income' && (
          <Grid item xs={12}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                bgcolor: 'success.light', 
                color: 'success.contrastText',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom align="center">
                Enter Your Monthly Income
              </Typography>
              <TextField
                label="Monthly Income Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                required
                inputProps={{ step: '0.01', min: '0' }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'success.main',
                    },
                    '&:hover fieldset': {
                      borderColor: 'success.dark',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'success.dark',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'success.dark',
                  },
                  '& .MuiInputBase-input': {
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                  }
                }}
              />
            </Paper>
          </Grid>
        )}
        
        {/* Expense Entry - Only shown for non-Income categories */}
        {category !== 'Income' && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth required>
                <InputLabel>Due Day</InputLabel>
                <Select
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  label="Due Day"
                >
                  {dayOptions.map(day => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                inputProps={{ step: '0.01' }}
                helperText="Enter positive amount (will be converted to expense)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                required
              />
            </Grid>
          </>
        )}
        
        <Grid item xs={12}>
          <Button 
            type="submit" 
            variant="contained" 
            color={category === 'Income' ? 'success' : 'primary'}
            fullWidth
            disabled={category === 'Income' ? !amount : (!description || !amount)}
          >
            {category === 'Income' ? 'Set Monthly Income' : 'Add Transaction'}
              </Button>
        </Grid>
      </Grid>
            </Box>
  );
} 