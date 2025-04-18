import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Card,
  CardContent,
  Grid,
  Link,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Help as HelpIcon,
  Book as BookIcon,
  Chat as ChatIcon,
  YouTube as YouTubeIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// FAQ data
const faqs = [
  {
    question: "How do I set up my budget?",
    answer: "To set up your budget, start by uploading your transaction data or manually entering your income. Then, customize your budget categories and set spending limits based on the 50/30/20 rule or your preferred allocation."
  },
  {
    question: "How does the 50/30/20 rule work?",
    answer: "The 50/30/20 rule suggests allocating 50% of your income to essential needs, 30% to wants, and 20% to savings and debt repayment. Our app helps you track these categories automatically."
  },
  {
    question: "Can I customize my budget categories?",
    answer: "Yes! You can customize budget categories in the Account Settings. You can modify category names, colors, and allocation percentages to match your financial goals."
  },
  {
    question: "How do I track my savings goals?",
    answer: "Navigate to the Insights & Goals tab in your dashboard. Click 'Add Goal' to create a new savings target. You can track multiple goals and monitor your progress over time."
  },
  {
    question: "How secure is my financial data?",
    answer: "We take security seriously. All data is encrypted, and we use industry-standard security protocols. You can review our security measures in the Privacy & Security section."
  }
];

// Resource links
const resources = [
  {
    title: "Video Tutorials",
    description: "Watch step-by-step guides on using BudgetFriendly",
    icon: <YouTubeIcon />,
    link: "#tutorials"
  },
  {
    title: "Documentation",
    description: "Detailed guides and API documentation",
    icon: <BookIcon />,
    link: "#docs"
  },
  {
    title: "Blog Articles",
    description: "Tips, tricks, and financial advice",
    icon: <ArticleIcon />,
    link: "#blog"
  }
];

// Update the window interface to include our global function
declare global {
  interface Window {
    showTutorial?: () => void;
  }
}

export function HelpAndSupport() {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState<string | false>(false);

  const handleFaqChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedFaq(isExpanded ? panel : false);
  };

  // Function to trigger the tutorial from Help & Support
  const handleViewGuide = () => {
    // Navigate back to the main page first
    navigate('/');
    
    // Use a timeout to ensure navigation completes before showing tutorial
    setTimeout(() => {
      if (window.showTutorial) {
        window.showTutorial();
      }
    }, 300);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
          <Box>
            <Typography variant="h5" gutterBottom>
              Help & Support
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Find answers to common questions and get support
            </Typography>
          </Box>
        </Box>

        {/* Quick Help Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 1 }} color="primary" />
                  <Typography variant="h6">Contact Support</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Need personalized help? Our support team is here for you.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<ChatIcon />}
                  href="mailto:support@budgetfriendly.com"
                  sx={{ mt: 'auto' }}
                >
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <HelpIcon sx={{ mr: 1 }} color="primary" />
                  <Typography variant="h6">Quick Start Guide</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  New to BudgetFriendly? Check out our getting started guide.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<BookIcon />}
                  sx={{ mt: 'auto' }}
                  onClick={handleViewGuide}
                >
                  View Guide
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* FAQ Section */}
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Frequently Asked Questions
        </Typography>
        <Box sx={{ mb: 4 }}>
          {faqs.map((faq, index) => (
            <Accordion
              key={index}
              expanded={expandedFaq === `panel${index}`}
              onChange={handleFaqChange(`panel${index}`)}
              sx={{ '&:before': { display: 'none' }, mb: 1 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  backgroundColor: 'background.default',
                  borderRadius: 1,
                }}
              >
                <Typography fontWeight="medium">{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary">
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        {/* Resources Section */}
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Helpful Resources
        </Typography>
        <List>
          {resources.map((resource, index) => (
            <React.Fragment key={index}>
              <ListItem 
                component={Link} 
                href={resource.link}
                sx={{ 
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: 'background.default',
                    borderRadius: 1,
                  }
                }}
              >
                <ListItemIcon>
                  {resource.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={resource.title}
                  secondary={resource.description}
                />
              </ListItem>
              {index < resources.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Container>
  );
} 