import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './routes';

// Error boundary component
function ErrorBoundary() {
  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>Oops!</h1>
      <p>An unexpected error occurred.</p>
    </main>
  );
}

// Main app component
export default function App() {
  return (
    <React.StrictMode>
      <AuthProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}
