import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo
    });
  }

  handleRetry = (): void => {
    // Reset the error state and retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Force a page reload as a last resort
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isQueueError = this.state.error?.message?.includes('queue');
      
      // Return custom fallback UI
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            minHeight: '100vh',
            bgcolor: 'background.default',
            p: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
              bgcolor: 'background.paper'
            }}
          >
            <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            
            <Typography variant="h5" color="error" gutterBottom>
              {isQueueError 
                ? "Application Error" 
                : "Unexpected Error"}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              {isQueueError 
                ? "We encountered an issue while processing your data. This is likely a temporary problem." 
                : "Something went wrong. Your budget data is safe, but we encountered an error while displaying it."}
            </Typography>
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleRetry}
              sx={{ mt: 2 }}
            >
              Reload App
            </Button>
            
            {/* Show technical details in development only */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 4, textAlign: 'left' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Error details (development only):
                </Typography>
                <Typography 
                  variant="caption" 
                  component="pre" 
                  sx={{ 
                    mt: 1, 
                    p: 2, 
                    bgcolor: 'rgba(0,0,0,0.05)', 
                    borderRadius: 1,
                    overflowX: 'auto' 
                  }}
                >
                  {this.state.error?.toString() || 'Unknown error'}
                  {this.state.errorInfo?.componentStack || ''}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 