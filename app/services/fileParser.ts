import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';

// Add this line to declare the variable
let pdfWorkerInitialized = false;

// Define the transaction interface
export interface Transaction {
  id?: string; // Document ID from Firestore
  date: Date | number; // Updated to allow day of month as number
  description: string;
  amount: number;
  category?: string; // Changed from enum to string to allow for custom categories
  type: 'income' | 'expense'; // Add required type field
  order?: number; // Order within the category for sorting
  icon?: string; // Optional icon (emoji) for the transaction
}

// Initialize PDF.js worker - using a more compatible approach
// This will be initialized when the module is first imported
const initPdfWorker = () => {
  if (pdfWorkerInitialized) return;
  
  try {
    
    // Set the worker source to a CDN URL for the same version
    const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    
    pdfWorkerInitialized = true;
  } catch (error) {
    console.error('Error initializing PDF.js worker:', error);
    throw new Error(`Setting up PDF.js worker failed: "${error}"`);
  }
};

// Call the initialization function
initPdfWorker();

// Function to parse CSV files
export const parseCSV = (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
         
          
          if (!results.data || results.data.length === 0) {
            throw new Error('No data found in CSV file');
          }
          
          if (!results.meta.fields || results.meta.fields.length === 0) {
            throw new Error('No headers found in CSV file');
          }
          
          // Sample the first row to check structure
          const sampleRow = results.data[0];
      
          
          const transactions: Transaction[] = results.data.map((row: any, index: number) => {
            try {
              // Try to find date, description and amount fields
              const dateField = findField(row, ['date', 'transaction date', 'posted date']);
              const descriptionField = findField(row, ['description', 'transaction', 'details', 'merchant', 'name', 'memo']);
              const amountField = findField(row, ['amount', 'transaction amount', 'debit', 'credit', 'value']);
              
              if (!dateField) {
                console.warn(`Row ${index}: Could not identify date field`);
                throw new Error('Could not identify date field');
              }
              
              if (!descriptionField) {
                console.warn(`Row ${index}: Could not identify description field`);
                throw new Error('Could not identify description field');
              }
              
              if (!amountField) {
                console.warn(`Row ${index}: Could not identify amount field`);
                throw new Error('Could not identify amount field');
              }
              
              // Parse the date - handle different formats
              const dateValue = row[dateField];
              const date = parseDate(dateValue);
              
              // Parse the amount - handle different formats
              const amountValue = row[amountField];
              const amount = parseAmount(amountValue);
              
              // Get description
              const description = row[descriptionField]?.toString().trim() || 'Unknown';
              
              return {
                date,
                description,
                amount,
                category: categorizeTransaction(description, amount)
              };
            } catch (rowError) {
              console.warn(`Error processing row ${index}:`, rowError);
              // Return null for invalid rows
              return null;
            }
          }).filter(Boolean) as Transaction[]; // Filter out null values
          
          if (transactions.length === 0) {
            throw new Error('Could not extract any valid transactions from CSV');
          }

          resolve(transactions);
        } catch (error) {
          console.error('Error processing CSV data:', error);
          reject(error);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        reject(error);
      }
    });
  });
};

// Function to parse PDF files
export const parsePDF = async (file: File): Promise<Transaction[]> => {

  
  try {
    // Initialize the PDF.js worker
    try {
      initPdfWorker();
    } catch (workerError: unknown) {
      console.error('PDF worker initialization failed:', workerError);
      throw new Error(`PDF worker initialization failed: ${workerError instanceof Error ? workerError.message : String(workerError)}`);
    }
    
    // Load the PDF document
    let pdfDocument;
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Configure PDF.js to use less memory for large files
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableAutoFetch: true,
        disableStream: false,
        disableRange: false,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
        cMapPacked: true,
      });
      
      // Add progress monitoring
      loadingTask.onProgress = (progressData: { loaded: number, total: number }) => {
        const progress = (progressData.loaded / progressData.total * 100).toFixed(2);
      };
      
      pdfDocument = await loadingTask.promise;
    } catch (loadError: unknown) {
      console.error('Failed to load PDF document:', loadError);
      throw new Error(`Failed to load PDF document: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
    }
    
    const transactions: Transaction[] = [];
    let allText = '';
    
    // Skip the first page for Chase statements as it's usually just a summary
    // Start from page 2 where the transaction details are
    const startPage = pdfDocument.numPages > 1 ? 2 : 1;
    
    // First, extract all text from the PDF
    for (let i = startPage; i <= pdfDocument.numPages; i++) {
      try {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        allText += pageText + ' ';
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
      }
    }
    
    
    if (allText.length === 0) {
      throw new Error('Could not extract any text from the PDF');
    }
    
    // Check if this is a Chase bank statement
    const isChaseStatement = allText.includes('CHASE') || 
                            allText.includes('JPMorgan Chase Bank') || 
                            file.name.toLowerCase().includes('chase');
    
    if (isChaseStatement) {
      return parseChaseStatement(allText);
    }
    
    // Continue with the existing patterns for other bank statements
    // Define patterns for different transaction formats
    const patterns = [
      {
        // Pattern 1: Date Description Amount
        regex: /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Za-z0-9\s.,&'\-#]+?)\s+(\$?\-?\d+\.\d{2})/g,
        dateIndex: 1,
        descIndex: 2,
        amountIndex: 3
      },
      {
        // Pattern 2: Date Amount Description
        regex: /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\$?\-?\d+\.\d{2})\s+([A-Za-z0-9\s.,&'\-#]+)/g,
        dateIndex: 1,
        descIndex: 3,
        amountIndex: 2
      },
      {
        // Pattern 3: MM/DD Description Amount
        regex: /(\d{1,2}\/\d{1,2})\s+([A-Za-z0-9\s.,&'\-#]+?)\s+(\$?\-?\d+\.\d{2})/g,
        dateIndex: 1,
        descIndex: 2,
        amountIndex: 3
      },
      {
        // Pattern 4: Date Description Amount with dollar sign
        regex: /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Za-z0-9\s.,&'\-#]+?)\s+\$\s*(\-?\d+\.\d{2})/g,
        dateIndex: 1,
        descIndex: 2,
        amountIndex: 3
      },
      {
        // Pattern 5: YYYY-MM-DD Description Amount
        regex: /(\d{4}\-\d{1,2}\-\d{1,2})\s+([A-Za-z0-9\s.,&'\-#]+?)\s+(\-?\$?\d+\.\d{2})/g,
        dateIndex: 1,
        descIndex: 2,
        amountIndex: 3
      }
    ];
    
    let matchFound = false;
    
    // Try each pattern on the entire text
    for (const pattern of patterns) {
      let match;
      let matchCount = 0;
      
      // Reset the pattern's lastIndex
      pattern.regex.lastIndex = 0;
      
      while ((match = pattern.regex.exec(allText)) !== null) {
        matchCount++;
        
        try {
          const dateStr = match[pattern.dateIndex];
          const description = match[pattern.descIndex].trim();
          const amountStr = match[pattern.amountIndex];
          
          const date = parseDate(dateStr);
          const amount = parseAmount(amountStr);
          
          transactions.push({
            date,
            description,
            amount,
            category: categorizeTransaction(description, amount)
          });
        } catch (matchError) {
          console.warn('Error processing PDF match:', matchError);
        }
      }
      
      if (matchCount > 0) {
        matchFound = true;
      }
    }
    
    // If no matches found with standard patterns, try a more aggressive approach
    if (!matchFound) {
      console.warn('No transactions found with standard patterns, trying alternative methods...');
      
      // Look for dates and amounts separately
      const datePatterns = [
        /\d{1,2}\/\d{1,2}\/\d{2,4}/g,  // MM/DD/YYYY
        /\d{1,2}\/\d{1,2}/g,           // MM/DD
        /\d{4}\-\d{1,2}\-\d{1,2}/g     // YYYY-MM-DD
      ];
      
      const amountPatterns = [
        /\$?\-?\d+\.\d{2}/g,           // Standard amount format
        /\$\s*\d+\.\d{2}/g,            // Amount with space after dollar sign
        /\(\$?\d+\.\d{2}\)/g           // Amount in parentheses (negative)
      ];
      
      let dates: string[] = [];
      let amounts: string[] = [];
      
      // Extract all dates
      for (const pattern of datePatterns) {
        const matches = allText.match(pattern) || [];
        dates = [...dates, ...matches];
      }
      
      // Extract all amounts
      for (const pattern of amountPatterns) {
        const matches = allText.match(pattern) || [];
        amounts = [...amounts, ...matches];
      }
      
      
      // If we have both dates and amounts, try to pair them
      if (dates.length > 0 && amounts.length > 0) {
        // Use the smaller count to avoid index errors
        const count = Math.min(dates.length, amounts.length);
        
        for (let j = 0; j < count; j++) {
          try {
            const date = parseDate(dates[j]);
            const amount = parseAmount(amounts[j]);
            const description = `Transaction on ${dates[j]}`;
            
            transactions.push({
              date,
              description,
              amount,
              category: categorizeTransaction(description, amount)
            });
          } catch (genericError) {
            console.warn('Error processing generic PDF match:', genericError);
          }
        }
        
      }
      
      // If still no transactions, try to extract table-like structures
      if (transactions.length === 0) {
        
        // Split text into lines and look for lines with both dates and amounts
        const lines = allText.split(/\r?\n|\r|\s{4,}/);
        
        for (const line of lines) {
          // Check if line contains a date
          const dateMatch = line.match(/\d{1,2}\/\d{1,2}(\/\d{2,4})?|\d{4}\-\d{1,2}\-\d{1,2}/);
          // Check if line contains an amount
          const amountMatch = line.match(/\$?\-?\d+\.\d{2}|\(\$?\d+\.\d{2}\)/);
          
          if (dateMatch && amountMatch) {
            try {
              const date = parseDate(dateMatch[0]);
              const amount = parseAmount(amountMatch[0]);
              
              // Extract description by removing date and amount from line
              let description = line
                .replace(dateMatch[0], '')
                .replace(amountMatch[0], '')
                .trim();
              
              // If description is empty, use a placeholder
              if (!description) {
                description = `Transaction on ${dateMatch[0]}`;
              }
              
              transactions.push({
                date,
                description,
                amount,
                category: categorizeTransaction(description, amount)
              });
            } catch (lineError) {
              console.warn('Error processing line:', lineError);
            }
          }
        }
        
      }
    }
    
    if (transactions.length === 0) {
      throw new Error('Could not extract any transactions from PDF. The file may not contain recognizable transaction data or may be in an unsupported format.');
    }
    
    return transactions;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Error parsing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to find a field in a CSV row based on possible field names
const findField = (row: any, possibleNames: string[]): string | null => {
  const keys = Object.keys(row);
  
  // First try exact matches (case-insensitive)
  for (const name of possibleNames) {
    const field = keys.find(key => key.toLowerCase() === name.toLowerCase());
    if (field) return field;
  }
  
  // Then try partial matches
  for (const name of possibleNames) {
    const field = keys.find(key => key.toLowerCase().includes(name.toLowerCase()));
    if (field) return field;
  }
  
  return null;
};

// Helper function to parse dates in various formats
const parseDate = (dateStr: string): Date => {
  if (!dateStr) {
    console.warn('Empty date string');
    return new Date(); // Default to today
  }
  
  // Clean the date string
  const cleanDateStr = dateStr.trim().replace(/[^\d\/\-\.]/g, '');
  
  // Try different date formats
  const date = new Date(cleanDateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try MM/DD/YYYY format
  const mmddyyyy = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
  const mmddyyyyMatch = cleanDateStr.match(mmddyyyy);
  if (mmddyyyyMatch) {
    const month = parseInt(mmddyyyyMatch[1]) - 1;
    const day = parseInt(mmddyyyyMatch[2]);
    let year = parseInt(mmddyyyyMatch[3]);
    if (year < 100) year += 2000; // Assume 20xx for 2-digit years
    return new Date(year, month, day);
  }
  
  // Try MM/DD format (assume current year)
  const mmdd = /(\d{1,2})\/(\d{1,2})/;
  const mmddMatch = cleanDateStr.match(mmdd);
  if (mmddMatch) {
    const month = parseInt(mmddMatch[1]) - 1;
    const day = parseInt(mmddMatch[2]);
    const year = new Date().getFullYear();
    return new Date(year, month, day);
  }
  
  // If all else fails, return today's date
  console.warn(`Could not parse date: ${dateStr}`);
  return new Date();
};

// Helper function to parse amounts in various formats
const parseAmount = (amountStr: string): number => {
  if (!amountStr) {
    console.warn('Empty amount string');
    return 0;
  }
  
  // Clean the amount string
  let cleanedStr = amountStr.toString().trim();
  
  // Check if it's a debit (negative) amount
  const isDebit = /debit|payment|withdrawal|sent/i.test(cleanedStr) || 
                 cleanedStr.includes('(') || 
                 cleanedStr.includes('-');
  
  // Remove currency symbols, commas, and parentheses
  cleanedStr = cleanedStr.replace(/[$,()]/g, '');
  
  // Convert to number
  let amount = parseFloat(cleanedStr);
  
  // If it's a valid number, return it
  if (!isNaN(amount)) {
    // Make it negative if it's a debit and not already negative
    if (isDebit && amount > 0) {
      amount = -amount;
    }
    return amount;
  }
  
  // If all else fails, return 0
  console.warn(`Could not parse amount: ${amountStr}`);
  return 0;
};

// Simple categorization logic based on keywords and amount
export const categorizeTransaction = (description: string, amount: number): string => {
  // Income is positive
  if (amount > 0) {
    return 'Income';
  }
  
  // Convert description to lowercase for case-insensitive matching
  const desc = description.toLowerCase();
  
  // Essentials: rent, mortgage, utilities, groceries, healthcare
  if (
    desc.includes('rent') || 
    desc.includes('mortgage') || 
    desc.includes('electric') || 
    desc.includes('water') || 
    desc.includes('gas') || 
    desc.includes('grocery') || 
    desc.includes('groceries') || 
    desc.includes('food') || 
    desc.includes('pharmacy') || 
    desc.includes('doctor') || 
    desc.includes('medical') || 
    desc.includes('insurance') ||
    desc.includes('bill') ||
    desc.includes('utility')
  ) {
    return 'Essentials';
  }
  
  // Wants: dining, entertainment, shopping, travel
  if (
    desc.includes('restaurant') || 
    desc.includes('cafe') || 
    desc.includes('coffee') || 
    desc.includes('cinema') || 
    desc.includes('movie') || 
    desc.includes('theater') || 
    desc.includes('amazon') || 
    desc.includes('shopping') || 
    desc.includes('travel') || 
    desc.includes('hotel') || 
    desc.includes('flight') ||
    desc.includes('subscription') ||
    desc.includes('entertainment')
  ) {
    return 'Wants';
  }
  
  // Savings: investments, retirement, savings accounts
  if (
    desc.includes('investment') || 
    desc.includes('401k') || 
    desc.includes('ira') || 
    desc.includes('saving') || 
    desc.includes('deposit') ||
    desc.includes('transfer to') ||
    desc.includes('vanguard') ||
    desc.includes('fidelity')
  ) {
    return 'Savings';
  }
  
  // Default to Essentials if no match is found
  return 'Essentials';
};

// Main function to parse any supported file
export const parseFile = async (file: File): Promise<Transaction[]> => {
  
  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    // For PDF files
    if (fileExtension === 'pdf') {
      
      // Check if it's a Chase statement based on filename
      const isChaseStatement = file.name.toLowerCase().includes('chase');
      if (isChaseStatement) {
      }
      
      // Parse the PDF
      try {
        const transactions = await parsePDF(file);
        return transactions;
      } catch (pdfError) {
        console.error('Error parsing PDF:', pdfError);
        throw new Error(`Error parsing PDF: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`);
      }
    } 
    // For CSV files
    else if (fileExtension === 'csv') {
      try {
        const transactions = await parseCSV(file);
        return transactions;
      } catch (csvError) {
        console.error('Error parsing CSV:', csvError);
        throw new Error(`Error parsing CSV: ${csvError instanceof Error ? csvError.message : String(csvError)}`);
      }
    } 
    // For Excel files
    else if (['xlsx', 'xls'].includes(fileExtension || '')) {
      // For now, we'll just throw an error for Excel files
      throw new Error(`Excel files (${fileExtension}) are not yet supported.`);
    } 
    // For unsupported file types
    else {
      console.error(`Unsupported file type: ${fileExtension}`);
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error(`Error in parseFile for ${file.name}:`, error);
    throw error; // Re-throw to be handled by the caller
  }
};

// Add a specialized function for parsing Chase statements
const parseChaseStatement = (text: string): Transaction[] => {
  
  const transactions: Transaction[] = [];
  
  // Chase-specific patterns
  // Pattern for the transaction detail section with date, description, amount, and balance
  const chaseTransactionPattern = /(\d{2}\/\d{2})\s+([^\d]+?)\s+(-?\d+\.\d{2})\s+(\d+,?\d*\.\d{2})/g;
  
  // Pattern for payroll/income entries (usually bold in the PDF)
  const chaseIncomePattern = /(\d{2}\/\d{2})\s+(Sunstate Equip C Payroll|Zelle Payment From|.*Payroll|.*Direct Deposit|.*ACH Credit).*?(\d+,?\d*\.\d{2})/g;
  
  let match;
  let incomeMatchCount = 0;
  let transactionMatchCount = 0;
  
  // First, extract income transactions (positive amounts)
  while ((match = chaseIncomePattern.exec(text)) !== null) {
    try {
      const dateStr = match[1];
      const description = match[2].trim();
      const amountStr = match[3].replace(',', '');
      
      incomeMatchCount++;
      
      const date = parseDate(dateStr);
      const amount = Math.abs(parseFloat(amountStr)); // Make sure income is positive
      
      transactions.push({
        date,
        description,
        amount,
        category: 'Income'
      });
    } catch (error) {
      console.warn('Error processing Chase income match:', error);
    }
  }
  
  
  // Then extract regular transactions
  while ((match = chaseTransactionPattern.exec(text)) !== null) {
    try {
      const dateStr = match[1];
      const description = match[2].trim();
      const amountStr = match[3];
      
      // Skip if this is a balance line or if the description contains "Beginning Balance" or "Ending Balance"
      if (description.includes('Beginning Balance') || description.includes('Ending Balance')) {
        continue;
      }
      
      transactionMatchCount++;
      
      const date = parseDate(dateStr);
      const amount = parseAmount(amountStr);
      
      // Skip if we already have an income transaction with the same date and description
      const isDuplicate = transactions.some(t => {
        // Compare dates by converting both to strings in a consistent way
        const dateMatch = typeof t.date === 'number' && typeof date === 'number'
          ? t.date === date
          : (typeof t.date === 'object' && typeof date === 'object'
            ? t.date.toDateString() === date.toDateString()
            : String(t.date) === String(date));
        
        return dateMatch && 
          t.description === description && 
          t.amount > 0 && 
          amount < 0;
      });
      
      if (!isDuplicate) {
        transactions.push({
          date,
          description,
          amount,
          category: categorizeTransaction(description, amount)
        });
      }
    } catch (error) {
      console.warn('Error processing Chase transaction match:', error);
    }
  }
  
  
  // If we didn't find any transactions with the specific patterns, fall back to more generic patterns
  if (transactions.length === 0) {
    
    // Try a simpler pattern for Chase statements
    const simplePattern = /(\d{2}\/\d{2})\s+(.+?)\s+(-?\d+\.\d{2})/g;
    let simpleMatch;
    let simpleMatchCount = 0;
    
    while ((simpleMatch = simplePattern.exec(text)) !== null) {
      try {
        const dateStr = simpleMatch[1];
        const description = simpleMatch[2].trim();
        const amountStr = simpleMatch[3];
        
        // Skip if this is a balance line
        if (description.includes('Balance')) {
          continue;
        }
        simpleMatchCount++;
        
        const date = parseDate(dateStr);
        const amount = parseAmount(amountStr);
        
        transactions.push({
          date,
          description,
          amount,
          category: categorizeTransaction(description, amount)
        });
      } catch (error) {
        console.warn('Error processing simple pattern match:', error);
      }
    }
    
    
    // If still no transactions, try even more generic approach
    if (transactions.length === 0) {
      // Look for date-amount pairs
      const datePattern = /(\d{2}\/\d{2})/g;
      const amountPattern = /(-?\d+\.\d{2})/g;
      
      const dates: string[] = [];
      const amounts: string[] = [];
      
      // Extract all dates
      let dateMatch;
      while ((dateMatch = datePattern.exec(text)) !== null) {
        dates.push(dateMatch[1]);
      }
      
      // Extract all amounts
      let amountMatch;
      while ((amountMatch = amountPattern.exec(text)) !== null) {
        amounts.push(amountMatch[1]);
      }
      
      
      // Try to pair dates with descriptions and amounts
      if (dates.length > 0 && amounts.length > 0) {
        // Split text into lines to find descriptions
        const lines = text.split(/\r?\n|\r|\s{4,}/);
        
        for (const line of lines) {
          const dateMatch = line.match(/(\d{2}\/\d{2})/);
          const amountMatch = line.match(/(-?\d+\.\d{2})/);
          
          if (dateMatch && amountMatch) {
            try {
              const date = parseDate(dateMatch[1]);
              const amount = parseAmount(amountMatch[1]);
              
              // Extract description by removing date and amount from line
              let description = line
                .replace(dateMatch[0], '')
                .replace(amountMatch[0], '')
                .trim();
              
              // If description is empty or just whitespace/punctuation, use a placeholder
              if (!description || /^[\s\.,;:]+$/.test(description)) {
                description = `Transaction on ${dateMatch[0]}`;
              }
              
              transactions.push({
                date,
                description,
                amount,
                category: categorizeTransaction(description, amount)
              });
            } catch (error) {
              console.warn('Error processing line:', error);
            }
          }
        }
      }
    }
  }
  return transactions;
};

// Add a simple test function to help debug PDF parsing
export const testPdfParsing = async (file: File): Promise<string> => {
  try {
    
    // Initialize the PDF.js worker
    try {
      initPdfWorker();
    } catch (workerError) {
      console.error('Worker initialization error:', workerError);
      return `PDF worker initialization failed: ${workerError}`;
    }
    
    // Load the PDF document
    let pdfDocument;
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableAutoFetch: true,
        disableStream: false,
        disableRange: false,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
        cMapPacked: true,
      });
      
      // Add progress monitoring
      loadingTask.onProgress = (progressData: { loaded: number, total: number }) => {
        const progress = (progressData.loaded / progressData.total * 100).toFixed(2);
      };
      
      pdfDocument = await loadingTask.promise;
    } catch (loadError) {
      console.error('PDF loading error in test:', loadError);
      return `Failed to load PDF document: ${loadError}`;
    }
    
    // Extract text from the first page
    try {
      const page = await pdfDocument.getPage(1);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      // Return a sample of the text
      return `PDF parsed successfully! Sample text: ${pageText.substring(0, 500)}...`;
    } catch (extractError) {
      console.error('Text extraction error in test:', extractError);
      return `Failed to extract text from PDF: ${extractError}`;
    }
  } catch (error) {
    console.error('General error in PDF test:', error);
    return `General error testing PDF parsing: ${error}`;
  }
}; 