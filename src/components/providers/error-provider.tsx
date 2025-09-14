'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface ErrorContextType {
  reportError: (error: Error, context?: Record<string, any>) => void;
  isOnline: boolean;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
  level?: 'page' | 'component' | 'critical';
  showDetails?: boolean;
}

/**
 * Global error provider that wraps the application
 * Provides error reporting context and handles network status
 */
export function ErrorProvider({
  children,
  level = 'page',
  showDetails = false
}: ErrorProviderProps) {
  const [isOnline, setIsOnline] = React.useState(true);

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global error reporter
  const reportError = React.useCallback(async (error: Error, context?: Record<string, any>) => {
    const errorReport = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: window.navigator.userAgent,
      url: window.location.href,
      context: {
        manual: true,
        ...context
      }
    };

    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }, []);

  const contextValue: ErrorContextType = {
    reportError,
    isOnline
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      <ErrorBoundary
        level={level}
        showDetails={showDetails}
        onError={(error, errorInfo) => {
          // Automatically report all boundary errors
          reportError(error, {
            componentStack: errorInfo.componentStack,
            errorBoundary: true
          });
        }}
      >
        {!isOnline && <OfflineIndicator />}
        {children}
      </ErrorBoundary>
    </ErrorContext.Provider>
  );
}

/**
 * Hook to access error context
 */
export function useErrorReporting() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorReporting must be used within an ErrorProvider');
  }
  return context;
}

/**
 * Hook for handling async operations with error reporting
 */
export function useAsyncErrorHandler() {
  const { reportError } = useErrorReporting();

  const handleAsync = React.useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      context?: Record<string, any>
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        if (error instanceof Error) {
          await reportError(error, {
            async: true,
            ...context
          });
        }
        return null;
      }
    },
    [reportError]
  );

  return { handleAsync };
}

/**
 * Offline indicator component
 */
function OfflineIndicator() {
  return (
    <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 px-4 z-50">
      <span className="text-sm font-medium">
        You're currently offline. Some features may be limited.
      </span>
    </div>
  );
}

/**
 * Higher-order component for wrapping pages with error boundaries
 */
export function withPageErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const WithPageErrorBoundary = (props: P) => {
    return (
      <ErrorProvider level="page" showDetails={process.env.NODE_ENV === 'development'}>
        <WrappedComponent {...props} />
      </ErrorProvider>
    );
  };

  WithPageErrorBoundary.displayName = `withPageErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithPageErrorBoundary;
}