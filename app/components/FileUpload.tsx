import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress,
  Alert,
  SvgIcon,
  Stack,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { testPdfParsing } from '../services/fileParser';

// Custom upload icon instead of using MUI icons
const UploadIcon = (props: any) => (
  <SvgIcon {...props}>
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
  </SvgIcon>
);

// Custom file format icons
const PdfIcon = (props: any) => (
  <SvgIcon {...props}>
    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2c-.28 0-.5-.22-.5-.5v-5c0-.28.22-.5.5-.5h2c.83 0 1.5.67 1.5 1.5v3zm4-3.75c0 .41-.34.75-.75.75H19v1h.75c.41 0 .75.34.75.75s-.34.75-.75.75H19v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1h1.25c.41 0 .75.34.75.75zM9 9.5h1v-1H9v1zM3 6c-.55 0-1 .45-1 1v13c0 1.1.9 2 2 2h13c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1-.45-1-1V7c0-.55-.45-1-1-1zm11 5.5h1v-3h-1v3z" />
  </SvgIcon>
);

const CsvIcon = (props: any) => (
  <SvgIcon {...props}>
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </SvgIcon>
);

interface FileUploadProps {
  onFilesUploaded: (files: File[]) => void;
  acceptedFileTypes?: string;
}

export function FileUpload({ 
  onFilesUploaded, 
  acceptedFileTypes = '.csv,.pdf,.xlsx,.xls' 
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    setIsDragging(false);
    setError(null);
    
    const files = Array.from(e.dataTransfer.files);
    
    // Validate files
    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      // Set selected files in state
      setSelectedFiles(validFiles);
      
      // Show loading state
      setIsLoading(true);
      
      // Process files with a slight delay to allow UI to update
      setTimeout(() => {
        try {
          // Call the callback with valid files
          onFilesUploaded(validFiles);
        } catch (err) {
          console.error('Error in onFilesUploaded:', err);
          setError('Error processing files. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }, 100);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Show loading state immediately
      setIsLoading(true);
      
      // Test PDF parsing if it's a PDF file
      const pdfFile = files.find(f => f.name.toLowerCase().endsWith('.pdf'));
      if (pdfFile) {
        testPdfParsing(pdfFile).then(result => {
        }).catch(err => {
          console.error('PDF test error:', err);
        });
      }
      
      // Validate files
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        // Set selected files in state
        setSelectedFiles(validFiles);
        
        // Add a visible message to the console
        
        // Process files with a slight delay to allow UI to update
        setTimeout(() => {
          try {
            // Call the callback with valid files
            onFilesUploaded(validFiles);
          } catch (err) {
            console.error('Error in onFilesUploaded:', err);
            setError(`Error processing files: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsLoading(false);
          }
        }, 100);
      } else {
        setIsLoading(false);
      }
      
      // Reset the input value so the same file can be selected again if needed
      e.target.value = '';
    } else {
    }
  };

  const handleBrowseClick = () => {
    // Programmatically click the hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error('File input ref is null');
      setError('Could not open file browser. Please try again or drag and drop files directly.');
    }
  };

  // New function to validate files and return only valid ones
  const validateFiles = (files: File[]): File[] => {
    
    // Validate file types
    const invalidFiles = files.filter(file => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      return !acceptedFileTypes.includes(fileExtension);
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}`);
      return files.filter(file => !invalidFiles.includes(file));
    }

    // Check file size
    const largeFiles = files.filter(file => file.size > 10 * 1024 * 1024); // 10MB limit
    if (largeFiles.length > 0) {
      setError(`File(s) too large: ${largeFiles.map(f => f.name).join(', ')}. Maximum file size is 10MB.`);
      return files.filter(file => !largeFiles.includes(file));
    }

    // Return valid files (don't set state here as it's now done in the caller)
    return files;
  };

  // Add a useEffect to log when the component mounts
  React.useEffect(() => {
    
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development' || 
                 window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1';
  }, []);

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mb: 3,
        borderRadius: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        Upload Bank Statements
      </Typography>
      
      {/* Hidden file input - moved outside of the Box to avoid event bubbling issues */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        id="file-upload-input"
        aria-label="Upload files"
        tabIndex={-1} // Remove from tab order since it's visually hidden
      />
      
      {/* Main upload area - using a label to ensure it's clickable and opens file dialog */}
      <label htmlFor="file-upload-input">
        <Box
          component="div"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={(e) => {
            // Fallback click handler in case the label doesn't trigger the file input
            e.preventDefault();
            handleBrowseClick();
          }}
          sx={{
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : 'grey.400',
            borderRadius: 2,
            p: 4, // Increased padding for better clickable area
            textAlign: 'center',
            bgcolor: isDragging ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'rgba(25, 118, 210, 0.04)'
            },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px'
          }}
        >
          {isLoading ? (
            <CircularProgress size={60} thickness={4} />
          ) : (
            <>
              <UploadIcon 
                sx={{ 
                  fontSize: 60, 
                  color: 'primary.main',
                  mb: 2
                }} 
              />
              <Typography variant="h6" component="div" gutterBottom>
                Drag & Drop Files Here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                or click to browse your files
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported formats: {acceptedFileTypes.replace(/\./g, '').toUpperCase()}
              </Typography>
              
              {/* File type icons */}
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Tooltip title="PDF Files">
                  <PdfIcon color="action" />
                </Tooltip>
                <Tooltip title="CSV Files">
                  <CsvIcon color="action" />
                </Tooltip>
              </Stack>
            </>
          )}
        </Box>
      </label>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Selected files list */}
      {selectedFiles.length > 0 && !isLoading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Files:
          </Typography>
          <List dense>
            {selectedFiles.map((file, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {file.name.toLowerCase().endsWith('.pdf') ? (
                    <PdfIcon color="primary" />
                  ) : (
                    <CsvIcon color="primary" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={file.name} 
                  secondary={`${(file.size / 1024).toFixed(1)} KB`} 
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      
      {/* Debug button - only visible in development mode */}
      <Button 
        variant="outlined" 
        color="secondary"
        size="small" 
        sx={{ mt: 2, display: 'block' }}
        onClick={() => {
          // Create a sample file for testing
          const sampleFile = new File(
            ['Sample content for testing'], 
            'sample.txt', 
            { type: 'text/plain' }
          );
          onFilesUploaded([sampleFile]);
        }}
      >
        Debug: Test Manual Entry
      </Button>
    </Paper>
  );
} 