import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // If not logged in, redirect to login page with the current location
  if (!user) {
    // Pass the current location in state so we can return here after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in, render children
  return <>{children}</>;
}; 