import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, CircularProgress, Tooltip } from '@mui/material';
import { MicIcon } from '../utils/materialIcons';
import type { Transaction } from '../services/fileParser';

interface SpeechRecognitionProps {
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (description: string, newAmount: number) => boolean;
  transactions: Transaction[];
}

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

// Speech recognition status
enum RecognitionStatus {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error'
}

export function SpeechRecognition({ 
  onAddTransaction, 
  onUpdateTransaction, 
  transactions 
}: SpeechRecognitionProps) {
  const [status, setStatus] = useState<RecognitionStatus>(RecognitionStatus.IDLE);
  const [feedback, setFeedback] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  
  // Check if browser supports Web Speech API
  const isSpeechRecognitionSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Handle recognition results
  const handleRecognitionResult = (event: SpeechRecognitionEvent) => {
    const results = event.results;
    
    // Process the speech transcript
    if (results.length > 0) {
      const result = results[results.length - 1];
      const transcript = result[0].transcript.trim();
      
      // Show feedback during recognition
      setFeedback(`Heard: "${transcript}"`);
      
      // Only process final results
      if (result.isFinal) {
        setStatus(RecognitionStatus.PROCESSING);
        
        // Process the transcript
        setTimeout(() => {
          processTranscript(transcript);
        }, 500);
      }
    }
  };

  // Handle recognition errors
  const handleRecognitionError = (event: SpeechRecognitionErrorEvent) => {
    console.error('Speech recognition error:', event.error, event.message);
    setFeedback(`Error: ${event.error}. Please try again.`);
    setStatus(RecognitionStatus.ERROR);
  };

  // Handle recognition end
  const handleRecognitionEnd = () => {
    // Only reset if still in listening state (not already in success/error)
    if (status === RecognitionStatus.LISTENING) {
      setStatus(RecognitionStatus.IDLE);
    }
    
    // Automatically reset success/error states after a delay
    if (status === RecognitionStatus.SUCCESS || status === RecognitionStatus.ERROR) {
              setTimeout(() => {
        setStatus(RecognitionStatus.IDLE);
        setFeedback('');
      }, 5000);
    }
  };

  // Setup speech recognition
  useEffect(() => {
    if (isSpeechRecognitionSupported) {
      // Use the appropriate constructor
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      // Setup event handlers
      recognitionRef.current.onresult = handleRecognitionResult;
      recognitionRef.current.onerror = handleRecognitionError;
      recognitionRef.current.onend = handleRecognitionEnd;
    }
    
    // Cleanup
    return () => {
      if (recognitionRef.current) {
          recognitionRef.current.abort();
      }
    };
  }, [isSpeechRecognitionSupported]);

  // Process the recognized speech
  const processTranscript = (transcript: string) => {
    // Convert transcript to lowercase for easier matching
    const text = transcript.toLowerCase();
    
    // Check for transaction update commands
    const updatePattern = /update (.*?) to \$([\d.]+)/i;
    const updateMatch = text.match(updatePattern);
    
    if (updateMatch && updateMatch.length >= 3) {
      const description = updateMatch[1].trim();
      const amount = parseFloat(updateMatch[2]);
      
      if (!isNaN(amount)) {
        // Try to update the transaction
        const success = onUpdateTransaction(description, amount);
        
        if (success) {
          setFeedback(`Updated transaction "${description}" to $${amount}`);
          setStatus(RecognitionStatus.SUCCESS);
          return;
        } else {
          setFeedback(`Couldn't find a transaction named "${description}"`);
          setStatus(RecognitionStatus.ERROR);
          return;
        }
      }
    }
    
    // Check for new transaction commands
    // Pattern: "add a new [category] for $amount for description"
    // Example: "add a new expense for $50 for groceries"
    // Or: "add $50 for groceries as wants"
    const addPattern1 = /add (?:a )?(?:new )?(?:transaction |entry |expense |payment |income )?(?:for |of )?\$([\d.]+) (?:for |on |to |)(.*?)(?:(?:as|in|to|for|in the) (essentials|wants|savings|income))?$/i;
    const addPattern2 = /add (?:a )?(?:new )?(essentials|wants|savings|income)(?: transaction| expense| payment)? (?:for |of )?\$([\d.]+) (?:for |on |to |)(.+)/i;
    
    const addMatch1 = text.match(addPattern1);
    const addMatch2 = text.match(addPattern2);
    
    if (addMatch1 && addMatch1.length >= 3) {
      const amount = parseFloat(addMatch1[1]);
      const description = addMatch1[2].trim();
      let category: Transaction['category'] = 'Essentials'; // Default
      
      // Check if a category was specified
      if (addMatch1[3]) {
        const categoryText = addMatch1[3].toLowerCase();
        if (categoryText === 'income') category = 'Income';
        else if (categoryText === 'wants') category = 'Wants';
        else if (categoryText === 'savings') category = 'Savings';
      }
      
      if (!isNaN(amount) && description) {
        // Create and add the new transaction
        const signedAmount = category === 'Income' ? Math.abs(amount) : -Math.abs(amount);
        
        const transaction: Transaction = {
          description,
          amount: signedAmount,
            date: new Date(),
          category
        };
        
        onAddTransaction(transaction);
        setFeedback(`Added ${category} transaction: "${description}" for ${signedAmount < 0 ? '-' : ''}$${Math.abs(signedAmount)}`);
        setStatus(RecognitionStatus.SUCCESS);
        return;
      }
    } else if (addMatch2 && addMatch2.length >= 4) {
      // Alternative pattern match
      const categoryText = addMatch2[1].toLowerCase();
      const amount = parseFloat(addMatch2[2]);
      const description = addMatch2[3].trim();
      
      let category: Transaction['category'] = 'Essentials'; // Default
      if (categoryText === 'income') category = 'Income';
      else if (categoryText === 'wants') category = 'Wants';
      else if (categoryText === 'savings') category = 'Savings';
      
      if (!isNaN(amount) && description) {
        // Create and add the new transaction
        const signedAmount = category === 'Income' ? Math.abs(amount) : -Math.abs(amount);
        
        const transaction: Transaction = {
          description,
          amount: signedAmount,
          date: new Date(),
          category
        };
        
        onAddTransaction(transaction);
        setFeedback(`Added ${category} transaction: "${description}" for ${signedAmount < 0 ? '-' : ''}$${Math.abs(signedAmount)}`);
        setStatus(RecognitionStatus.SUCCESS);
        return;
      }
    }
    
    // If we get here, we couldn't understand the command
    setFeedback(`I didn't understand that command. Try "add $50 for groceries as essentials" or "update groceries to $75".`);
    setStatus(RecognitionStatus.ERROR);
  };

  // Start listening
  const startListening = () => {
    if (recognitionRef.current) {
      try {
        setStatus(RecognitionStatus.LISTENING);
        setFeedback('Listening...');
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setFeedback('Error starting speech recognition');
        setStatus(RecognitionStatus.ERROR);
      }
    }
  };

  // Stop listening
  const stopListening = () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
  };

  // Get button color based on status
  const getButtonColor = () => {
    switch (status) {
      case RecognitionStatus.LISTENING:
      case RecognitionStatus.PROCESSING:
        return 'primary';
      case RecognitionStatus.SUCCESS:
        return 'success';
      case RecognitionStatus.ERROR:
        return 'error';
      default:
        return 'secondary';
    }
  };

  // Render component
  return (
    <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textAlign: 'center' }}>
        Add transactions with your voice
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Tooltip title={
          isSpeechRecognitionSupported 
            ? "Try commands like 'add $50 for groceries as essentials' or 'update groceries to $75'"
            : "Speech recognition is not supported in your browser"
        }>
          <Button
            variant="contained"
            color={getButtonColor()}
            startIcon={status === RecognitionStatus.LISTENING || status === RecognitionStatus.PROCESSING ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <MicIcon />
            )}
            onClick={status === RecognitionStatus.LISTENING ? stopListening : startListening}
            disabled={!isSpeechRecognitionSupported || status === RecognitionStatus.PROCESSING}
            sx={{ borderRadius: 4 }}
          >
            {status === RecognitionStatus.LISTENING ? 'Listening...' : 'Voice Input'}
          </Button>
        </Tooltip>
      </Box>
      
      {feedback && (
        <Typography 
          variant="body2" 
          sx={{ 
            mt: 1, 
            color: status === RecognitionStatus.ERROR 
              ? 'error.main' 
              : status === RecognitionStatus.SUCCESS 
                ? 'success.main' 
                : 'text.secondary',
            fontSize: '0.875rem',
            textAlign: 'center',
            maxWidth: '500px',
            mx: 'auto'
          }}
        >
          {feedback}
        </Typography>
      )}
    </Box>
  );
} 