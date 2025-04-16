import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { CategoryProvider } from './contexts/CategoryContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import BudgetApp from './components/BudgetApp';
import { AccountSettings } from './components/AccountSettings';
import { PrivacyAndSecurity } from './components/PrivacyAndSecurity';
import { HelpAndSupport } from './components/HelpAndSupport';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <BudgetApp />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
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
        <CurrencyProvider>
          <CategoryProvider>
            <RouterProvider router={router} />
          </CategoryProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </AuthProvider>
  );
} 