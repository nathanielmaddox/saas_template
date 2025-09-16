import { NextRequest, NextResponse } from 'next/server';
import { ratelimit } from '@/lib/ratelimit';
import { parseDomain, extractTenantIdentifier, DomainInfo } from '@/lib/domain';

/**
 * Handle domain-based routing for multi-tenant architecture
 */
async function handleDomainRouting(
  request: NextRequest,
  domainInfo: DomainInfo,
  tenantIdentifier: string | null
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Skip domain routing for API routes and auth routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
    return null;
  }

  // Handle root domain (non-tenant) requests
  if (!tenantIdentifier) {
    // Redirect to main marketing site or dashboard
    if (pathname === '/') {
      return null; // Allow normal processing
    }
    return null;
  }

  // Handle tenant-specific routing
  if (domainInfo.isSubdomain || domainInfo.isCustomDomain) {
    // Check if tenant exists (you'll need to implement this)
    const tenantExists = await checkTenantExists(tenantIdentifier);

    if (!tenantExists) {
      // Redirect to tenant not found page
      return NextResponse.redirect(new URL('/tenant-not-found', request.url));
    }

    // Rewrite to tenant-specific routes
    if (pathname === '/') {
      // Rewrite root to tenant dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/tenant/dashboard';
      return NextResponse.rewrite(url);
    }

    // Rewrite other tenant routes
    if (!pathname.startsWith('/tenant/')) {
      const url = request.nextUrl.clone();
      url.pathname = `/tenant${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return null;
}

/**
 * Check if tenant exists (placeholder - implement with your database)
 */
async function checkTenantExists(identifier: string): Promise<boolean> {
  // TODO: Implement actual tenant lookup
  // For now, return true to allow development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  try {
    // This would query your database to check if tenant exists
    // const tenant = await db.getTenantBySlug(identifier) || await db.getTenantByDomain(identifier);
    // return !!tenant;
    return true; // Temporary
  } catch (error) {
    console.error('Error checking tenant existence:', error);
    return false;
  }
}

/**
 * Enterprise-grade middleware for security, rate limiting, and monitoring
 * Runs on all requests before they reach the application
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startTime = Date.now();

  // Skip middleware for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // Parse domain information
  const host = request.headers.get('host');
  if (!host) {
    return new NextResponse('Invalid host', { status: 400 });
  }

  const domainInfo = parseDomain(host);
  const tenantIdentifier = extractTenantIdentifier(domainInfo);

  // Handle domain-based routing
  const domainResponse = await handleDomainRouting(request, domainInfo, tenantIdentifier);
  if (domainResponse) {
    return domainResponse;
  }

  const response = NextResponse.next();

  // Add tenant context to headers
  if (tenantIdentifier) {
    response.headers.set('X-Tenant-Identifier', tenantIdentifier);
    response.headers.set('X-Domain-Type', domainInfo.isSubdomain ? 'subdomain' : 'custom');
  }

  try {
    // Security Headers (additional layer on top of next.config.js)
    addSecurityHeaders(response, request);

    // Rate Limiting
    await applyRateLimit(request, response);

    // Authentication Check for protected routes
    await handleAuthenticationCheck(request, response);

    // Request Logging and Monitoring
    await logRequest(request, startTime);

    // CORS handling for API routes
    if (pathname.startsWith('/api/')) {
      handleCORS(request, response);
    }

    // Geo-blocking (optional enterprise feature)
    if (process.env.ENABLE_GEO_BLOCKING === 'true') {
      await handleGeoBlocking(request, response);
    }

    // Bot Detection and Protection
    if (process.env.ENABLE_BOT_PROTECTION === 'true') {
      await handleBotProtection(request, response);
    }

  } catch (error) {
    console.error('Middleware error:', error);

    // Log error for monitoring
    await logMiddlewareError(error, request);

    // Continue with request even if middleware fails (fail-safe)
    return response;
  }

  return response;
}

/**
 * Add additional security headers
 */
function addSecurityHeaders(response: NextResponse, request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Request ID for tracing
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  response.headers.set('X-Request-ID', requestId);

  // Timing headers
  response.headers.set('X-Response-Time-Start', Date.now().toString());

  // Security headers (additional to next.config.js)
  if (isProduction) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  }

  // Feature Policy (enhanced)
  response.headers.set('Feature-Policy', [
    'accelerometer "none"',
    'camera "none"',
    'geolocation "self"',
    'gyroscope "none"',
    'magnetometer "none"',
    'microphone "none"',
    'payment "self"',
    'usb "none"'
  ].join(', '));
}

/**
 * Apply rate limiting based on request type and user
 */
async function applyRateLimit(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl;
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  // Skip rate limiting for health checks
  if (pathname === '/api/health') {
    return;
  }

  try {
    // Different rate limits for different endpoints
    let rateLimitConfig;

    if (pathname.startsWith('/api/auth/')) {
      // Strict rate limiting for auth endpoints
      rateLimitConfig = {
        requests: 5,
        window: '1m',
        key: `auth:${clientIP}`
      };
    } else if (pathname.startsWith('/api/')) {
      // General API rate limiting
      rateLimitConfig = {
        requests: 100,
        window: '1m',
        key: `api:${clientIP}`
      };
    } else {
      // Page requests
      rateLimitConfig = {
        requests: 200,
        window: '1m',
        key: `page:${clientIP}`
      };
    }

    const { success, limit, remaining, reset } = await ratelimit(
      rateLimitConfig.requests,
      rateLimitConfig.window,
      rateLimitConfig.key
    );

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    if (!success) {
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Continue if rate limiting fails
  }
}

/**
 * Handle authentication checks for protected routes
 */
async function handleAuthenticationCheck(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl;

  // Define protected routes
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/settings',
    '/billing',
    '/api/user',
    '/api/dashboard'
  ];

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return;
  }

  // Check for authentication token
  const authToken =
    request.cookies.get('auth_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.headers.get('x-auth-token');

  if (!authToken) {
    // Redirect to login for page requests, return 401 for API requests
    if (pathname.startsWith('/api/')) {
      return new NextResponse('Unauthorized', { status: 401 });
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Add user context to headers (simplified - in production, validate JWT)
  response.headers.set('X-User-Authenticated', 'true');
}

/**
 * Log request for monitoring and analytics
 */
async function logRequest(request: NextRequest, startTime: number) {
  const processingTime = Date.now() - startTime;
  const { pathname, search } = request.nextUrl;

  const logData = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: pathname + search,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    ip: request.ip || request.headers.get('x-forwarded-for'),
    processingTime,
    requestId: request.headers.get('x-request-id')
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('Request:', logData);
  }

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production' && process.env.MONITORING_ENDPOINT) {
    try {
      await fetch(process.env.MONITORING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`
        },
        body: JSON.stringify(logData)
      });
    } catch (error) {
      console.error('Failed to send monitoring data:', error);
    }
  }
}

/**
 * Handle CORS for API routes
 */
function handleCORS(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  if (process.env.NODE_ENV === 'development') {
    // Allow all origins in development
    response.headers.set('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
}

/**
 * Geo-blocking implementation (optional enterprise feature)
 */
async function handleGeoBlocking(request: NextRequest, response: NextResponse) {
  const blockedCountries = process.env.BLOCKED_COUNTRIES?.split(',') || [];

  if (blockedCountries.length === 0) {
    return;
  }

  // Get country from Cloudflare headers or other geo service
  const country = request.headers.get('cf-ipcountry') ||
                 request.headers.get('x-country-code');

  if (country && blockedCountries.includes(country.toUpperCase())) {
    return new NextResponse('Access denied from this location', { status: 403 });
  }
}

/**
 * Bot detection and protection
 */
async function handleBotProtection(request: NextRequest, response: NextResponse) {
  const userAgent = request.headers.get('user-agent') || '';

  // Simple bot detection (enhance as needed)
  const botPatterns = [
    /bot/i,
    /crawl/i,
    /spider/i,
    /scrape/i,
    /curl/i,
    /wget/i
  ];

  const isBot = botPatterns.some(pattern => pattern.test(userAgent));

  if (isBot) {
    // Log bot detection
    console.log('Bot detected:', { userAgent, ip: request.ip });

    // Allow search engine bots but block others
    const allowedBots = ['googlebot', 'bingbot', 'slurp', 'duckduckbot'];
    const isAllowedBot = allowedBots.some(bot => userAgent.toLowerCase().includes(bot));

    if (!isAllowedBot && process.env.BLOCK_BOTS === 'true') {
      return new NextResponse('Bot access not allowed', { status: 403 });
    }
  }

  response.headers.set('X-Bot-Detected', isBot.toString());
}

/**
 * Log middleware errors for monitoring
 */
async function logMiddlewareError(error: any, request: NextRequest) {
  const errorData = {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    url: request.nextUrl.pathname,
    method: request.method,
    ip: request.ip || request.headers.get('x-forwarded-for')
  };

  console.error('Middleware Error:', errorData);

  // Send to error reporting service
  if (process.env.ERROR_REPORTING_ENDPOINT) {
    try {
      await fetch(process.env.ERROR_REPORTING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ERROR_REPORTING_API_KEY}`
        },
        body: JSON.stringify(errorData)
      });
    } catch (reportingError) {
      console.error('Failed to report middleware error:', reportingError);
    }
  }
}

/**
 * Matcher configuration for middleware
 * Defines which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};