import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  useTheme,
  Portal
} from '@mui/material';
import { ArrowBack, ArrowForward, Close } from '@mui/icons-material';

export interface TutorialStep {
  title: string;
  description: string;
  elementId: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  padding?: number;
  scrollIntoView?: boolean;
  scrollOffset?: number;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete: () => void;
  isOpen: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ 
  steps, 
  onComplete,
  isOpen
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedRect, setHighlightedRect] = useState<DOMRect | null>(null);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0 });
  const theme = useTheme();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check if an element is fully visible in the viewport
  const isElementInViewport = (rect: DOMRect) => {
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  };

  // Scroll to make element visible if needed
  const scrollToElement = (element: HTMLElement, rect: DOMRect, scrollIntoView?: boolean, scrollOffset?: number) => {
    if (scrollIntoView || !isElementInViewport(rect)) {
      // Calculate the center position of the element
      const elementCenterY = rect.top + rect.height / 2;
      const viewportCenterY = window.innerHeight / 2;
      
      // Apply additional scroll offset if provided
      const offset = scrollOffset || 0;
      
      // Scroll so the element is centered in the viewport with offset
      window.scrollTo({
        top: window.scrollY + elementCenterY - viewportCenterY + offset,
        behavior: 'smooth'
      });
    }
  };

  // Update the highlighted element's position whenever the current step changes
  useEffect(() => {
    if (!isOpen) return;
    
    const updateHighlightPosition = () => {
      const currentStepData = steps[currentStep];
      if (!currentStepData) return;

      const element = document.getElementById(currentStepData.elementId);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      
      // Scroll to make the element visible with any provided offset
      scrollToElement(
        element, 
        rect, 
        currentStepData.scrollIntoView, 
        currentStepData.scrollOffset
      );
      
      const padding = currentStepData.padding || 10;
      
      // Create a slightly larger rectangle for highlighting
      const paddedRect = {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + (padding * 2),
        height: rect.height + (padding * 2),
        bottom: rect.bottom + padding,
        right: rect.right + padding,
        x: rect.x - padding,
        y: rect.y - padding,
        toJSON: rect.toJSON
      };
      
      setHighlightedRect(paddedRect as DOMRect);
      
      // Position the info box based on the position preference or space available
      const position = currentStepData.position || 'bottom';
      const boxMargin = 20; // margin between highlight and info box
      
      let top = 0;
      let left = 0;
      
      switch (position) {
        case 'top':
          top = Math.max(20, paddedRect.top - 160 - boxMargin);
          left = paddedRect.left + (paddedRect.width / 2) - 150;
          break;
        case 'bottom':
          top = paddedRect.bottom + boxMargin;
          left = paddedRect.left + (paddedRect.width / 2) - 150;
          break;
        case 'left':
          top = paddedRect.top + (paddedRect.height / 2) - 80;
          left = Math.max(20, paddedRect.left - 300 - boxMargin);
          break;
        case 'right':
          top = paddedRect.top + (paddedRect.height / 2) - 80;
          left = paddedRect.right + boxMargin;
          break;
        default:
          top = paddedRect.bottom + boxMargin;
          left = paddedRect.left + (paddedRect.width / 2) - 150;
      }
      
      // Make sure the box stays within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (left < 20) left = 20;
      if (left > viewportWidth - 320) left = viewportWidth - 320;
      if (top < 20) top = 20;
      if (top > viewportHeight - 200) top = viewportHeight - 200;
      
      setBoxPosition({ top, left });
    };

    // Call immediately and set up resize listener
    updateHighlightPosition();
    window.addEventListener('resize', updateHighlightPosition);
    window.addEventListener('scroll', updateHighlightPosition);
    
    // Also recalculate position after a short delay to account for any animations
    const timerId = setTimeout(updateHighlightPosition, 100);
    
    return () => {
      window.removeEventListener('resize', updateHighlightPosition);
      window.removeEventListener('scroll', updateHighlightPosition);
      clearTimeout(timerId);
    };
  }, [currentStep, steps, isOpen]);

  // Create a clipping path for the highlighted element
  const getClipPath = () => {
    if (!highlightedRect) return 'none';
    
    return `
      polygon(
        0% 0%, 
        100% 0%, 
        100% 100%, 
        0% 100%,
        0% 0%,
        ${highlightedRect.left}px ${highlightedRect.top}px,
        ${highlightedRect.left}px ${highlightedRect.bottom}px,
        ${highlightedRect.right}px ${highlightedRect.bottom}px,
        ${highlightedRect.right}px ${highlightedRect.top}px,
        ${highlightedRect.left}px ${highlightedRect.top}px,
        0% 0%
      )
    `;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <Box
        ref={overlayRef}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          backgroundColor: 'transparent',
          pointerEvents: 'none'
        }}
      >
        {/* Dark overlay with hole for highlighted element */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            clipPath: getClipPath(),
            backdropFilter: 'blur(1px)',
            transition: 'all 0.3s ease-in-out'
          }}
        />
        
        {/* Tutorial step info box */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: boxPosition.top,
            left: boxPosition.left,
            padding: 3,
            width: 300,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            pointerEvents: 'auto',
            transition: 'all 0.3s ease-in-out',
            zIndex: 10000
          }}
        >
          <Typography variant="h6" gutterBottom>
            {steps[currentStep]?.title}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 3 }}>
            {steps[currentStep]?.description}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Button 
                startIcon={<ArrowBack />}
                onClick={handlePrevious}
                disabled={currentStep === 0}
                size="small"
              >
                Back
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="text" 
                color="inherit"
                onClick={handleSkip}
                size="small"
                endIcon={<Close />}
              >
                Skip
              </Button>
              
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleNext}
                endIcon={currentStep < steps.length - 1 ? <ArrowForward /> : undefined}
                size="small"
              >
                {currentStep < steps.length - 1 ? 'Continue' : 'Finish'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Portal>
  );
}; 