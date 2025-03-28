import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import BudgetApp from './components/BudgetApp';
import { AccountSettings } from './components/AccountSettings';
import { PrivacyAndSecurity } from './components/PrivacyAndSecurity';
import { HelpAndSupport } from './components/HelpAndSupport';
import { ProtectedRoute } from './components/ProtectedRoute';
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: "/",
    element: <BudgetApp />,
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <AccountSettings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/privacy-security",
    element: (
      <ProtectedRoute>
        <PrivacyAndSecurity />
      </ProtectedRoute>
    ),
  },
  {
    path: "/help-support",
    element: (
      <ProtectedRoute>
        <HelpAndSupport />
      </ProtectedRoute>
    ),
  }
]);

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </AuthProvider>
  );
} 