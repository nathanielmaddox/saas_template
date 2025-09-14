import type { DatabaseClient, DatabaseConfig, DatabaseProvider } from './types';
import { validateDatabaseConfig } from './types';
import { XanoClient } from './providers/xano';
import { SupabaseClient } from './providers/supabase';
import { InstantDBClient } from './providers/instantdb';
import { PostgreSQLClient } from './providers/postgresql';
import { PrismaClient } from './providers/prisma';

/**
 * Database Factory for creating database clients based on configuration
 * Supports multiple database providers for vendor-agnostic implementations
 */
export class DatabaseFactory {
  private static instances = new Map<string, DatabaseClient>();

  /**
   * Create or get existing database client instance
   */
  static async createClient(config: DatabaseConfig, instanceId = 'default'): Promise<DatabaseClient> {
    const cacheKey = `${config.provider}-${instanceId}`;

    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    validateDatabaseConfig(config);

    const client = await this.instantiateClient(config);
    await client.connect();

    this.instances.set(cacheKey, client);
    return client;
  }

  /**
   * Create client instance based on provider type
   */
  private static async instantiateClient(config: DatabaseConfig): Promise<DatabaseClient> {
    switch (config.provider) {
      case 'xano':
        return new XanoClient(config);

      case 'supabase':
        return new SupabaseClient(config);

      case 'instantdb':
        return new InstantDBClient(config);

      case 'postgresql':
        return new PostgreSQLClient(config);

      case 'prisma':
        return new PrismaClient(config);

      default:
        throw new Error(`Unsupported database provider: ${config.provider}`);
    }
  }

  /**
   * Get existing client instance
   */
  static getClient(provider: DatabaseProvider, instanceId = 'default'): DatabaseClient | null {
    const cacheKey = `${provider}-${instanceId}`;
    return this.instances.get(cacheKey) || null;
  }

  /**
   * Disconnect and remove client instance
   */
  static async disconnectClient(provider: DatabaseProvider, instanceId = 'default'): Promise<void> {
    const cacheKey = `${provider}-${instanceId}`;
    const client = this.instances.get(cacheKey);

    if (client) {
      await client.disconnect();
      this.instances.delete(cacheKey);
    }
  }

  /**
   * Disconnect all client instances
   */
  static async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.instances.values()).map(client => client.disconnect());
    await Promise.all(disconnectPromises);
    this.instances.clear();
  }

  /**
   * Get list of available database providers
   */
  static getAvailableProviders(): DatabaseProvider[] {
    return ['xano', 'supabase', 'instantdb', 'postgresql', 'prisma'];
  }

  /**
   * Create client from environment variables
   */
  static async createFromEnvironment(): Promise<DatabaseClient> {
    const provider = (process.env.DATABASE_PROVIDER as DatabaseProvider) || 'xano';

    const config: DatabaseConfig = {
      provider,
      apiUrl: process.env.DATABASE_API_URL || process.env.NEXT_PUBLIC_XANO_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      apiKey: process.env.DATABASE_API_KEY || process.env.XANO_API_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.INSTANTDB_APP_ID,
      connectionString: process.env.DATABASE_URL,
      options: {
        // Provider-specific options
        timeout: parseInt(process.env.DATABASE_TIMEOUT || '10000'),
        retries: parseInt(process.env.DATABASE_RETRIES || '3'),
        poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
        ssl: process.env.DATABASE_SSL === 'true',
      }
    };

    return this.createClient(config);
  }

  /**
   * Create multiple clients for different providers (useful for migration scenarios)
   */
  static async createMultiProvider(configs: Array<{ provider: DatabaseProvider; config: DatabaseConfig; instanceId?: string }>): Promise<Map<string, DatabaseClient>> {
    const clients = new Map<string, DatabaseClient>();

    const createPromises = configs.map(async ({ provider, config, instanceId = 'default' }) => {
      const client = await this.createClient(config, instanceId);
      clients.set(provider, client);
    });

    await Promise.all(createPromises);
    return clients;
  }
}

/**
 * Configuration builder for easy database setup
 */
export class DatabaseConfigBuilder {
  private config: Partial<DatabaseConfig> = {};

  static create(): DatabaseConfigBuilder {
    return new DatabaseConfigBuilder();
  }

  provider(provider: DatabaseProvider): this {
    this.config.provider = provider;
    return this;
  }

  apiUrl(url: string): this {
    this.config.apiUrl = url;
    return this;
  }

  apiKey(key: string): this {
    this.config.apiKey = key;
    return this;
  }

  connectionString(connectionString: string): this {
    this.config.connectionString = connectionString;
    return this;
  }

  options(options: Record<string, any>): this {
    this.config.options = { ...this.config.options, ...options };
    return this;
  }

  build(): DatabaseConfig {
    if (!this.config.provider) {
      throw new Error('Database provider is required');
    }
    return this.config as DatabaseConfig;
  }

  // Provider-specific builders
  static xano(apiUrl: string, apiKey: string, options?: Record<string, any>): DatabaseConfig {
    return this.create()
      .provider('xano')
      .apiUrl(apiUrl)
      .apiKey(apiKey)
      .options(options || {})
      .build();
  }

  static supabase(apiUrl: string, apiKey: string, options?: Record<string, any>): DatabaseConfig {
    return this.create()
      .provider('supabase')
      .apiUrl(apiUrl)
      .apiKey(apiKey)
      .options(options || {})
      .build();
  }

  static instantdb(appId: string, options?: Record<string, any>): DatabaseConfig {
    return this.create()
      .provider('instantdb')
      .apiKey(appId)
      .options(options || {})
      .build();
  }

  static postgresql(connectionString: string, options?: Record<string, any>): DatabaseConfig {
    return this.create()
      .provider('postgresql')
      .connectionString(connectionString)
      .options(options || {})
      .build();
  }

  static prisma(connectionString: string, options?: Record<string, any>): DatabaseConfig {
    return this.create()
      .provider('prisma')
      .connectionString(connectionString)
      .options(options || {})
      .build();
  }
}

// Export convenience function
export async function createDatabaseClient(config: DatabaseConfig): Promise<DatabaseClient> {
  return DatabaseFactory.createClient(config);
}

export { DatabaseFactory as default };