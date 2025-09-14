import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Error reporting endpoint for client-side errors
 * Logs errors and forwards to monitoring services
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      message,
      stack,
      componentStack,
      level = 'error',
      timestamp,
      userAgent,
      url,
      userId,
      sessionId,
      digest
    } = body;

    // Validate required fields
    if (!message || !timestamp) {
      return NextResponse.json(
        { error: 'Message and timestamp are required' },
        { status: 400 }
      );
    }

    // Get request headers for additional context
    const headersList = headers();
    const clientIP = headersList.get('x-forwarded-for') ||
                     headersList.get('x-real-ip') ||
                     'unknown';
    const referer = headersList.get('referer');

    // Create comprehensive error report
    const errorReport = {
      id: id || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      stack,
      componentStack,
      digest,
      timestamp,
      context: {
        url,
        referer,
        userAgent,
        clientIP,
        userId,
        sessionId
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        appName: process.env.NEXT_PUBLIC_APP_NAME,
        version: process.env.npm_package_version
      }
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Client Error Report:', JSON.stringify(errorReport, null, 2));
    }

    // Forward to monitoring services
    const monitoringPromises = [];

    // Sentry integration
    if (process.env.SENTRY_DSN) {
      monitoringPromises.push(
        sendToSentry(errorReport).catch(err =>
          console.error('Failed to send to Sentry:', err)
        )
      );
    }

    // Custom logging service
    if (process.env.CUSTOM_LOGGING_ENDPOINT) {
      monitoringPromises.push(
        sendToCustomLogging(errorReport).catch(err =>
          console.error('Failed to send to custom logging:', err)
        )
      );
    }

    // PostHog integration for error tracking
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      monitoringPromises.push(
        sendToPostHog(errorReport).catch(err =>
          console.error('Failed to send to PostHog:', err)
        )
      );
    }

    // Wait for all monitoring services (but don't fail if they fail)
    await Promise.allSettled(monitoringPromises);

    // Store in database for analysis (optional)
    if (shouldStoreError(level)) {
      try {
        await storeErrorInDatabase(errorReport);
      } catch (dbError) {
        console.error('Failed to store error in database:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      errorId: errorReport.id,
      message: 'Error reported successfully'
    });

  } catch (error) {
    console.error('Error reporting endpoint failed:', error);

    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

/**
 * Send error to Sentry
 */
async function sendToSentry(errorReport: any): Promise<void> {
  // In a real implementation, you would use @sentry/nextjs
  // This is a simplified version for demonstration
  const sentryPayload = {
    message: errorReport.message,
    level: errorReport.level,
    timestamp: errorReport.timestamp,
    extra: errorReport.context,
    tags: {
      environment: errorReport.environment.nodeEnv,
      version: errorReport.environment.version
    }
  };

  // Mock Sentry API call
  console.log('Would send to Sentry:', sentryPayload);
}

/**
 * Send error to custom logging service
 */
async function sendToCustomLogging(errorReport: any): Promise<void> {
  const response = await fetch(process.env.CUSTOM_LOGGING_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CUSTOM_LOGGING_API_KEY}`
    },
    body: JSON.stringify(errorReport)
  });

  if (!response.ok) {
    throw new Error(`Custom logging failed: ${response.status}`);
  }
}

/**
 * Send error to PostHog for analytics
 */
async function sendToPostHog(errorReport: any): Promise<void> {
  const posthogPayload = {
    api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    event: 'client_error',
    properties: {
      error_id: errorReport.id,
      error_message: errorReport.message,
      error_level: errorReport.level,
      url: errorReport.context.url,
      user_agent: errorReport.context.userAgent,
      timestamp: errorReport.timestamp
    },
    distinct_id: errorReport.context.userId || errorReport.context.sessionId || 'anonymous'
  };

  const response = await fetch('https://app.posthog.com/capture/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(posthogPayload)
  });

  if (!response.ok) {
    throw new Error(`PostHog failed: ${response.status}`);
  }
}

/**
 * Determine if error should be stored in database
 */
function shouldStoreError(level: string): boolean {
  // Store critical errors and errors in production
  return level === 'critical' || process.env.NODE_ENV === 'production';
}

/**
 * Store error in database for analysis
 */
async function storeErrorInDatabase(errorReport: any): Promise<void> {
  // This would integrate with your chosen database provider
  // Using the database abstraction layer we created

  try {
    // Example using the database factory
    const { DatabaseFactory } = await import('@/lib/database/factory');
    const db = await DatabaseFactory.createFromEnvironment();

    await db.create('error_logs', {
      id: errorReport.id,
      level: errorReport.level,
      message: errorReport.message,
      stack: errorReport.stack,
      context: errorReport.context,
      environment: errorReport.environment,
      created_at: new Date(errorReport.timestamp)
    });
  } catch (error) {
    // Don't throw here to avoid recursive error reporting
    console.error('Database error storage failed:', error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}