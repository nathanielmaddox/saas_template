'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * Enterprise-grade error boundary component
 * Provides comprehensive error handling with reporting and recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;

    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Report error to monitoring service
    this.reportError(error, errorInfo, level);

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo, level: string) => {
    const errorReport = {
      id: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    };

    try {
      // Send to error reporting service
      if (typeof window !== 'undefined') {
        // Client-side error reporting
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorReport)
        });

        // Also send to external monitoring if configured
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
          // Sentry integration would go here
        }
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private getCurrentUserId = (): string | null => {
    // Try to get user ID from various auth providers
    if (typeof window !== 'undefined') {
      // Check session storage
      const session = sessionStorage.getItem('auth_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          return parsed.user?.id || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  };

  private getSessionId = (): string | null => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('session_id') ||
             localStorage.getItem('session_id') ||
             null;
    }
    return null;
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });
    }
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallback, showDetails = false, level = 'component' } = this.props;
      const { error, errorInfo, errorId } = this.state;

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Different UI based on error level
      const isCritical = level === 'critical';
      const isPageLevel = level === 'page';

      return (
        <div className={`flex flex-col items-center justify-center p-6 ${
          isCritical ? 'min-h-screen bg-red-50' : isPageLevel ? 'min-h-96' : 'p-4'
        }`}>
          <div className="text-center max-w-md mx-auto">
            <div className={`mx-auto flex items-center justify-center w-16 h-16 rounded-full ${
              isCritical ? 'bg-red-100' : 'bg-orange-100'
            } mb-4`}>
              <AlertTriangle className={`w-8 h-8 ${
                isCritical ? 'text-red-600' : 'text-orange-600'
              }`} />
            </div>

            <h2 className={`text-2xl font-bold mb-2 ${
              isCritical ? 'text-red-800' : 'text-gray-800'
            }`}>
              {isCritical ? 'Critical Error' : isPageLevel ? 'Page Error' : 'Something went wrong'}
            </h2>

            <p className="text-gray-600 mb-6">
              {isCritical
                ? 'A critical error occurred. Please contact support if this persists.'
                : isPageLevel
                ? 'This page encountered an error. You can try refreshing or go back to the homepage.'
                : 'This component encountered an error. You can try again or refresh the page.'
              }
            </p>

            {errorId && (
              <p className="text-sm text-gray-500 mb-4">
                Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{errorId}</code>
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {this.retryCount < this.maxRetries && !isCritical && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.maxRetries - this.retryCount} left)
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </button>

              {(isCritical || isPageLevel) && (
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </button>
              )}
            </div>

            {showDetails && error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 flex items-center">
                  <Bug className="w-4 h-4 mr-1" />
                  Show Error Details
                </summary>
                <div className="mt-2 p-4 bg-gray-100 rounded-lg text-xs font-mono overflow-auto max-h-40">
                  <div className="mb-2">
                    <strong>Error:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundaryComponent;
}

/**
 * Hook for handling async errors in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, clearError };
}