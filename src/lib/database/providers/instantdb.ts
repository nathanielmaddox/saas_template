import { init, tx, id, lookup } from '@instantdb/react';
import type {
  DatabaseClient,
  DatabaseConfig,
  User,
  Subscription,
  ApiResponse,
  QueryOptions,
  DatabaseError
} from '../types';
import { createDatabaseError } from '../types';

// InstantDB schema types
interface InstantDBSchema {
  users: User;
  subscriptions: Subscription;
  projects: {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    status: 'active' | 'archived' | 'deleted';
    settings?: Record<string, any>;
    created_at: string;
    updated_at: string;
  };
  [key: string]: any;
}

/**
 * InstantDB client implementation
 * Provides real-time database with instant sync and offline support
 */
export class InstantDBClient implements DatabaseClient {
  private db: any; // InstantDB client
  private connected: boolean = false;
  private appId: string;

  constructor(private config: DatabaseConfig) {
    if (!config.apiKey) {
      throw createDatabaseError('InstantDB app ID is required', 'CONFIG_ERROR', 400);
    }

    this.appId = config.apiKey;
  }

  async connect(): Promise<void> {
    try {
      // Initialize InstantDB
      this.db = init<InstantDBSchema>({
        appId: this.appId,
        apiURI: this.config.apiUrl || 'https://api.instantdb.com',
        ...this.config.options
      });

      this.connected = true;
    } catch (error) {
      throw createDatabaseError(
        `Failed to connect to InstantDB: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_ERROR',
        500
      );
    }
  }

  async disconnect(): Promise<void> {
    // InstantDB handles connection cleanup automatically
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Generic CRUD operations
  async findMany<T>(table: string, options: QueryOptions = {}): Promise<ApiResponse<T[]>> {
    try {
      if (!this.db) {
        throw createDatabaseError('Database not connected', 'CONNECTION_ERROR', 500);
      }

      // Build query
      let query = this.db.useQuery({ [table]: {} });

      // Apply filters (InstantDB uses a different query format)
      if (options.filter) {
        const whereClause = Object.entries(options.filter).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>);

        query = this.db.useQuery({
          [table]: {
            $: {
              where: whereClause
            }
          }
        });
      }

      // Note: InstantDB handles real-time updates, this is a simplified sync version
      const result = await new Promise((resolve, reject) => {
        const unsubscribe = query((data: any, error: any) => {
          unsubscribe();
          if (error) reject(error);
          else resolve(data);
        });
      });

      let data = (result as any)[table] || [];

      // Apply sorting (client-side for now)
      if (options.sort) {
        const sortEntries = Object.entries(options.sort);
        data.sort((a: any, b: any) => {
          for (const [key, order] of sortEntries) {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      // Apply pagination
      const total = data.length;
      if (options.offset || options.limit) {
        const start = options.offset || 0;
        const end = options.limit ? start + options.limit : undefined;
        data = data.slice(start, end);
      }

      return {
        data: data as T[],
        pagination: options.limit ? {
          page: Math.floor((options.offset || 0) / options.limit) + 1,
          limit: options.limit,
          total,
          hasMore: total > (options.offset || 0) + options.limit
        } : undefined
      };
    } catch (error) {
      throw createDatabaseError(
        `Failed to fetch from ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUERY_ERROR',
        500
      );
    }
  }

  async findById<T>(table: string, id: string, options: QueryOptions = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.findMany<T>(table, {
        ...options,
        filter: { id, ...options.filter },
        limit: 1
      });

      if (!response.data || response.data.length === 0) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return { data: response.data[0] };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to find record in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUERY_ERROR',
        500
      );
    }
  }

  async findOne<T>(table: string, filter: Record<string, any>, options: QueryOptions = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.findMany<T>(table, {
        ...options,
        filter: { ...filter, ...options.filter },
        limit: 1
      });

      if (!response.data || response.data.length === 0) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return { data: response.data[0] };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to find record in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUERY_ERROR',
        500
      );
    }
  }

  async create<T>(table: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      if (!this.db) {
        throw createDatabaseError('Database not connected', 'CONNECTION_ERROR', 500);
      }

      const recordId = (data as any).id || id();
      const timestamp = new Date().toISOString();
      const recordData = {
        ...data,
        id: recordId,
        created_at: timestamp,
        updated_at: timestamp
      };

      // Use InstantDB transaction
      await this.db.transact(tx[table][recordId].update(recordData));

      return { data: recordData as T };
    } catch (error) {
      throw createDatabaseError(
        `Failed to create record in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INSERT_ERROR',
        500
      );
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      if (!this.db) {
        throw createDatabaseError('Database not connected', 'CONNECTION_ERROR', 500);
      }

      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      // Use InstantDB transaction
      await this.db.transact(tx[table][id].update(updateData));

      // Fetch the updated record
      const updated = await this.findById<T>(table, id);
      return updated;
    } catch (error) {
      throw createDatabaseError(
        `Failed to update record in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_ERROR',
        500
      );
    }
  }

  async delete(table: string, id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      if (!this.db) {
        throw createDatabaseError('Database not connected', 'CONNECTION_ERROR', 500);
      }

      // Use InstantDB transaction to delete
      await this.db.transact(tx[table][id].delete());

      return { data: { success: true } };
    } catch (error) {
      throw createDatabaseError(
        `Failed to delete record in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR',
        500
      );
    }
  }

  // Batch operations
  async createMany<T>(table: string, data: Partial<T>[]): Promise<ApiResponse<T[]>> {
    try {
      if (!this.db) {
        throw createDatabaseError('Database not connected', 'CONNECTION_ERROR', 500);
      }

      const timestamp = new Date().toISOString();
      const records = data.map(item => ({
        ...item,
        id: (item as any).id || id(),
        created_at: timestamp,
        updated_at: timestamp
      }));

      // Create batch transaction
      const transactions = records.map(record =>
        tx[table][(record as any).id].update(record)
      );

      await this.db.transact(transactions);

      return { data: records as T[] };
    } catch (error) {
      throw createDatabaseError(
        `Failed to create multiple records in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_INSERT_ERROR',
        500
      );
    }
  }

  async updateMany<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<ApiResponse<{ count: number }>> {
    try {
      // First find all matching records
      const existing = await this.findMany<any>(table, { filter });

      if (!existing.data || existing.data.length === 0) {
        return { data: { count: 0 } };
      }

      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      // Create batch update transaction
      const transactions = existing.data.map(record =>
        tx[table][record.id].update(updateData)
      );

      await this.db.transact(transactions);

      return { data: { count: existing.data.length } };
    } catch (error) {
      throw createDatabaseError(
        `Failed to update multiple records in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_UPDATE_ERROR',
        500
      );
    }
  }

  async deleteMany(table: string, filter: Record<string, any>): Promise<ApiResponse<{ count: number }>> {
    try {
      // First find all matching records
      const existing = await this.findMany<any>(table, { filter });

      if (!existing.data || existing.data.length === 0) {
        return { data: { count: 0 } };
      }

      // Create batch delete transaction
      const transactions = existing.data.map(record =>
        tx[table][record.id].delete()
      );

      await this.db.transact(transactions);

      return { data: { count: existing.data.length } };
    } catch (error) {
      throw createDatabaseError(
        `Failed to delete multiple records in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_DELETE_ERROR',
        500
      );
    }
  }

  // Authentication operations (simplified - InstantDB doesn't handle auth directly)
  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<ApiResponse<User>> {
    try {
      const userId = id();
      const userData: User = {
        id: userId,
        email,
        name: metadata?.name || email.split('@')[0],
        avatar: metadata?.avatar,
        role: metadata?.role || 'user',
        status: 'pending', // Email verification needed
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store user in InstantDB
      const result = await this.create<User>('users', userData);

      // Note: Password handling should be done by a separate auth service
      // This is just storing user profile data

      return result;
    } catch (error) {
      throw createDatabaseError(
        `Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIGNUP_ERROR',
        500
      );
    }
  }

  async signIn(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      // Find user by email
      const userResponse = await this.findOne<User>('users', { email });

      if (!userResponse.data) {
        throw createDatabaseError('Invalid credentials', 'SIGNIN_ERROR', 401);
      }

      // Note: Password verification should be handled by separate auth service
      // This is simplified for demo purposes
      const token = this.generateToken(userResponse.data.id);

      return {
        data: {
          user: userResponse.data,
          token
        }
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Signin failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIGNIN_ERROR',
        500
      );
    }
  }

  async signOut(): Promise<ApiResponse<{ success: boolean }>> {
    // InstantDB doesn't handle sessions, this would be handled by auth service
    return { data: { success: true } };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    throw createDatabaseError(
      'getCurrentUser requires session management - use separate auth service',
      'NOT_IMPLEMENTED',
      501
    );
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    if (!data.id) {
      throw createDatabaseError('User ID required for profile update', 'INVALID_INPUT', 400);
    }

    return this.update<User>('users', data.id, data);
  }

  // Subscription operations
  async getSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    return this.findOne<Subscription>('subscriptions', { user_id: userId });
  }

  async updateSubscription(userId: string, data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    try {
      // Try to find existing subscription
      const existing = await this.findOne<Subscription>('subscriptions', { user_id: userId });

      if (existing.data) {
        return this.update<Subscription>('subscriptions', existing.data.id, data);
      } else {
        // Create new subscription
        const subscriptionData: Partial<Subscription> = {
          ...data,
          id: id(),
          user_id: userId
        };
        return this.create<Subscription>('subscriptions', subscriptionData);
      }
    } catch (error) {
      throw createDatabaseError(
        `Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_SUBSCRIPTION_ERROR',
        500
      );
    }
  }

  async cancelSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    return this.updateSubscription(userId, {
      status: 'cancelled',
      cancel_at_period_end: true
    });
  }

  // Real-time subscriptions (InstantDB's strength!)
  async subscribe<T>(table: string, filter?: Record<string, any>, callback?: (data: T) => void): Promise<() => void> {
    if (!this.db) {
      throw createDatabaseError('Database not connected', 'CONNECTION_ERROR', 500);
    }

    let query = { [table]: {} };

    if (filter) {
      query = {
        [table]: {
          $: {
            where: filter
          }
        }
      };
    }

    const q = this.db.useQuery(query);

    // Subscribe to real-time updates
    const unsubscribe = q((data: any, error: any) => {
      if (error) {
        console.error(`Subscription error for ${table}:`, error);
        return;
      }

      if (callback && data[table]) {
        // InstantDB returns arrays, call callback for each item
        if (Array.isArray(data[table])) {
          data[table].forEach((item: T) => callback(item));
        } else {
          callback(data[table] as T);
        }
      }
    });

    return unsubscribe;
  }

  // Helper methods
  private generateToken(userId: string): string {
    // This is a simplified token generation
    // In production, use proper JWT with secure signing
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
}