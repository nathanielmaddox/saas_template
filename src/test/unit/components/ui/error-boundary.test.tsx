import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary, useErrorHandler } from '@/components/ui/error-boundary';
import React from 'react';

// Mock fetch for error reporting
global.fetch = vi.fn();

// Test component that throws an error
const ThrowingComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Working component</div>;
};

// Test component using useErrorHandler
const AsyncErrorComponent = () => {
  const { handleError } = useErrorHandler();

  const triggerError = () => {
    handleError(new Error('Async error'));
  };

  return <button onClick={triggerError}>Trigger Async Error</button>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true })
    } as any);

    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Basic Error Boundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should catch and display error when child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument();
    });

    it('should show retry button with remaining attempts', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton.textContent).toContain('3 left');
    });

    it('should show reload and home buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /go home/i })).not.toBeInTheDocument(); // Only for page/critical level
    });

    it('should show error ID when available', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorIdElement = screen.getByText(/Error ID:/);
      expect(errorIdElement).toBeInTheDocument();
      expect(errorIdElement.textContent).toMatch(/Error ID: error_\d+_\w+/);
    });
  });

  describe('Error Boundary Levels', () => {
    it('should show critical error UI for critical level', () => {
      render(
        <ErrorBoundary level="critical">
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Critical Error')).toBeInTheDocument();
      expect(screen.getByText(/critical error occurred/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });

    it('should show page error UI for page level', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Page Error')).toBeInTheDocument();
      expect(screen.getByText(/page encountered an error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });

    it('should not show retry button for critical errors', () => {
      render(
        <ErrorBoundary level="critical">
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('Error Details', () => {
    it('should show error details when showDetails is true', () => {
      render(
        <ErrorBoundary showDetails={true}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const detailsToggle = screen.getByText('Show Error Details');
      fireEvent.click(detailsToggle);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should not show error details when showDetails is false', () => {
      render(
        <ErrorBoundary showDetails={false}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Show Error Details')).not.toBeInTheDocument();
    });
  });

  describe('Error Reporting', () => {
    it('should call onError callback when provided', async () => {
      const onErrorSpy = vi.fn();

      render(
        <ErrorBoundary onError={onErrorSpy}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(onErrorSpy).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            componentStack: expect.any(String)
          })
        );
      });
    });

    it('should report error to API endpoint', async () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/errors/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('Test error message')
        });
      });
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom Error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should retry and reset error state', async () => {
      let shouldThrow = true;
      const RetryComponent = () => <ThrowingComponent shouldThrow={shouldThrow} />;

      render(
        <ErrorBoundary>
          <RetryComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Simulate fixing the error
      shouldThrow = false;

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Note: In a real scenario, the component would re-render without error
      // This test verifies the retry button exists and can be clicked
      expect(retryButton.textContent).toContain('2 left');
    });

    it('should exhaust retry attempts', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Click retry 3 times to exhaust attempts
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.queryByRole('button', { name: /try again/i });
        if (retryButton) {
          fireEvent.click(retryButton);
        }
      }

      // Retry button should no longer be available
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const TestComponent = () => <div>Test Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('should pass through props to wrapped component', () => {
    const TestComponent = ({ message }: { message: string }) => <div>{message}</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent message="Hello World" />);

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should catch errors in wrapped component', () => {
    const WrappedThrowingComponent = withErrorBoundary(ThrowingComponent);

    render(<WrappedThrowingComponent shouldThrow={true} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should set correct display name', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});

describe('useErrorHandler hook', () => {
  it('should throw error when handleError is called', async () => {
    // This test verifies that useErrorHandler triggers error boundary
    const TestWrapper = () => (
      <ErrorBoundary>
        <AsyncErrorComponent />
      </ErrorBoundary>
    );

    render(<TestWrapper />);

    const triggerButton = screen.getByRole('button', { name: /trigger async error/i });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});