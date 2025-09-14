import type { DatabaseConfig, AuthConfig } from '@/lib/database/types';
import type { AuthProvider } from '@/lib/auth/types';

/**
 * Provider configuration system for database and authentication
 * Supports environment-based configuration with fallbacks
 */

// Database provider configurations
export const DATABASE_PROVIDERS: Record<string, Omit<DatabaseConfig, 'provider'>> = {
  xano: {
    apiUrl: process.env.XANO_API_URL,
    apiKey: process.env.XANO_API_KEY,
    options: {
      timeout: parseInt(process.env.XANO_TIMEOUT || '15000'),
      retries: parseInt(process.env.XANO_RETRIES || '3'),
      retryDelay: parseInt(process.env.XANO_RETRY_DELAY || '1000'),
      maxBodyLength: 50 * 1024 * 1024, // 50MB
      maxContentLength: 50 * 1024 * 1024
    }
  },
  supabase: {
    apiUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      db: {
        schema: process.env.SUPABASE_DB_SCHEMA || 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'saas-template'
        }
      }
    }
  },
  instantdb: {
    apiKey: process.env.INSTANTDB_APP_ID,
    apiUrl: process.env.INSTANTDB_API_URL || 'https://api.instantdb.com',
    options: {
      websocketURI: process.env.INSTANTDB_WEBSOCKET_URL,
      devMode: process.env.NODE_ENV === 'development'
    }
  },
  postgresql: {
    apiUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    options: {
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000')
    }
  },
  prisma: {
    apiUrl: process.env.DATABASE_URL,
    options: {
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty'
    }
  }
};

// Authentication provider configurations
export const AUTH_PROVIDERS: Record<AuthProvider, Omit<AuthConfig, 'provider'>> = {
  nextauth: {
    options: {
      secret: process.env.NEXTAUTH_SECRET,
      url: process.env.NEXTAUTH_URL || process.env.VERCEL_URL,
      providers: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        },
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET
        },
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET
        }
      },
      pages: {
        signIn: '/login',
        signUp: '/signup',
        error: '/auth/error'
      }
    }
  },
  clerk: {
    options: {
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
      domain: process.env.CLERK_DOMAIN,
      isSatellite: process.env.CLERK_IS_SATELLITE === 'true',
      signInUrl: process.env.CLERK_SIGN_IN_URL || '/sign-in',
      signUpUrl: process.env.CLERK_SIGN_UP_URL || '/sign-up',
      afterSignInUrl: process.env.CLERK_AFTER_SIGN_IN_URL || '/dashboard',
      afterSignUpUrl: process.env.CLERK_AFTER_SIGN_UP_URL || '/onboarding'
    }
  },
  supabase: {
    options: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      redirectTo: process.env.SUPABASE_REDIRECT_URL,
      flowType: process.env.SUPABASE_AUTH_FLOW_TYPE || 'pkce'
    }
  },
  custom: {
    options: {
      apiUrl: process.env.CUSTOM_AUTH_API_URL,
      apiKey: process.env.CUSTOM_AUTH_API_KEY,
      tokenEndpoint: process.env.CUSTOM_AUTH_TOKEN_ENDPOINT,
      userEndpoint: process.env.CUSTOM_AUTH_USER_ENDPOINT
    }
  }
};

/**
 * Get database configuration for a specific provider
 */
export function getDatabaseConfig(provider: keyof typeof DATABASE_PROVIDERS): DatabaseConfig {
  const config = DATABASE_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unsupported database provider: ${provider}`);
  }

  return {
    provider: provider as DatabaseConfig['provider'],
    ...config
  };
}

/**
 * Get authentication configuration for a specific provider
 */
export function getAuthConfig(provider: AuthProvider): AuthConfig {
  const config = AUTH_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unsupported auth provider: ${provider}`);
  }

  return {
    provider,
    ...config
  };
}

/**
 * Auto-detect database provider based on environment variables
 */
export function detectDatabaseProvider(): keyof typeof DATABASE_PROVIDERS {
  // Priority order for detection
  const detectionOrder: Array<{
    provider: keyof typeof DATABASE_PROVIDERS;
    requiredVars: string[];
  }> = [
    {
      provider: 'supabase',
      requiredVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
    },
    {
      provider: 'instantdb',
      requiredVars: ['INSTANTDB_APP_ID']
    },
    {
      provider: 'postgresql',
      requiredVars: ['DATABASE_URL']
    },
    {
      provider: 'xano',
      requiredVars: ['XANO_API_URL', 'XANO_API_KEY']
    },
    {
      provider: 'prisma',
      requiredVars: ['DATABASE_URL']
    }
  ];

  for (const { provider, requiredVars } of detectionOrder) {
    if (requiredVars.every(varName => process.env[varName])) {
      return provider;
    }
  }

  // Default fallback
  return 'xano';
}

/**
 * Auto-detect authentication provider based on environment variables
 */
export function detectAuthProvider(): AuthProvider {
  // Priority order for detection
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    return 'clerk';
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return 'supabase';
  }

  if (process.env.NEXTAUTH_SECRET) {
    return 'nextauth';
  }

  if (process.env.CUSTOM_AUTH_API_URL) {
    return 'custom';
  }

  // Default fallback
  return 'nextauth';
}

/**
 * Validate provider configuration
 */
export function validateDatabaseConfig(provider: keyof typeof DATABASE_PROVIDERS): boolean {
  const config = DATABASE_PROVIDERS[provider];

  switch (provider) {
    case 'xano':
      return !!(config.apiUrl && config.apiKey);
    case 'supabase':
      return !!(config.apiUrl && config.apiKey);
    case 'instantdb':
      return !!config.apiKey;
    case 'postgresql':
    case 'prisma':
      return !!config.apiUrl;
    default:
      return false;
  }
}

/**
 * Validate authentication configuration
 */
export function validateAuthConfig(provider: AuthProvider): boolean {
  const config = AUTH_PROVIDERS[provider];

  switch (provider) {
    case 'clerk':
      return !!(config.options?.publishableKey && config.options?.secretKey);
    case 'supabase':
      return !!(config.options?.url && config.options?.anonKey);
    case 'nextauth':
      return !!config.options?.secret;
    case 'custom':
      return !!(config.options?.apiUrl && config.options?.apiKey);
    default:
      return false;
  }
}

/**
 * Get environment-specific configuration with overrides
 */
export function getEnvironmentConfig() {
  const environment = process.env.NODE_ENV || 'development';
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';
  const isTest = environment === 'test';

  return {
    environment,
    isDevelopment,
    isProduction,
    isTest,

    // Database settings
    database: {
      provider: detectDatabaseProvider(),
      maxConnections: isProduction ? 20 : 5,
      connectionTimeout: isProduction ? 30000 : 10000,
      queryTimeout: isProduction ? 60000 : 30000,
      retries: isProduction ? 3 : 1,
      enableLogging: isDevelopment || isTest
    },

    // Auth settings
    auth: {
      provider: detectAuthProvider(),
      sessionMaxAge: isProduction ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days prod, 1 day dev
      refreshTokenRotation: isProduction,
      secureTokens: isProduction,
      enableMFA: isProduction
    },

    // Security settings
    security: {
      enableCSP: isProduction,
      enableHSTS: isProduction,
      enableCORS: true,
      corsOrigins: isDevelopment ? ['http://localhost:3000'] : process.env.ALLOWED_ORIGINS?.split(',') || [],
      rateLimiting: isProduction,
      encryptionLevel: isProduction ? 'high' : 'medium'
    }
  };
}