/**
 * Centralized configuration management
 * Provides unified access to all provider configurations
 */

export {
  DATABASE_PROVIDERS,
  AUTH_PROVIDERS,
  getDatabaseConfig,
  getAuthConfig,
  detectDatabaseProvider,
  detectAuthProvider,
  validateDatabaseConfig,
  validateAuthConfig,
  getEnvironmentConfig
} from './providers';

export type {
  DatabaseConfig,
  AuthConfig
} from '@/lib/database/types';

export type {
  AuthProvider
} from '@/lib/auth/types';

// Re-export environment configuration for easy access
export const config = getEnvironmentConfig();