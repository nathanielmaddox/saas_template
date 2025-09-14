'use client';

import React from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

/**
 * Global error page for Next.js App Router
 * Handles unrecoverable errors at the app level
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error to monitoring service
    console.error('Global error occurred:', error);

    // Report to external services
    if (typeof window !== 'undefined') {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: window.navigator.userAgent
      };

      // Send to error reporting endpoint
      fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      }).catch(console.error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <ErrorBoundary
          level="critical"
          showDetails={process.env.NODE_ENV === 'development'}
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Application Error
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  Something went wrong with the application.
                </p>
                <button
                  onClick={reset}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Try again
                </button>
              </div>
            </div>
          }
        >
          {/* This will never render due to the error, but required for TypeScript */}
          <div>Unexpected error occurred</div>
        </ErrorBoundary>
      </body>
    </html>
  );
}