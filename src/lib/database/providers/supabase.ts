import { createClient, SupabaseClient as SupabaseJSClient, User as SupabaseUser } from '@supabase/supabase-js';
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

/**
 * Supabase database client implementation
 * Provides full-featured integration with Supabase backend
 */
export class SupabaseClient implements DatabaseClient {
  private client: SupabaseJSClient;
  private connected: boolean = false;

  constructor(private config: DatabaseConfig) {
    if (!config.apiUrl || !config.apiKey) {
      throw createDatabaseError('Supabase URL and anon key are required', 'CONFIG_ERROR', 400);
    }

    this.client = createClient(config.apiUrl, config.apiKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'saas-template'
        }
      },
      ...config.options
    });
  }

  async connect(): Promise<void> {
    try {
      // Test connection
      const { error } = await this.client.from('profiles').select('count').limit(1);
      if (error && !error.message.includes('relation "profiles" does not exist')) {
        throw error;
      }
      this.connected = true;
    } catch (error) {
      throw createDatabaseError(
        `Failed to connect to Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_ERROR',
        500
      );
    }
  }

  async disconnect(): Promise<void> {
    // Supabase client doesn't require explicit disconnection
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Generic CRUD operations
  async findMany<T>(table: string, options: QueryOptions = {}): Promise<ApiResponse<T[]>> {
    try {
      let query = this.client.from(table).select(options.select?.join(',') || '*');

      // Apply filters
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      // Apply sorting
      if (options.sort) {
        Object.entries(options.sort).forEach(([key, order]) => {
          query = query.order(key, { ascending: order === 'asc' });
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw createDatabaseError(error.message, 'QUERY_ERROR', 400, error);
      }

      return {
        data: data as T[],
        pagination: options.limit ? {
          page: Math.floor((options.offset || 0) / options.limit) + 1,
          limit: options.limit,
          total: count || 0,
          hasMore: (count || 0) > (options.offset || 0) + options.limit
        } : undefined
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to fetch from ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUERY_ERROR',
        500
      );
    }
  }

  async findById<T>(table: string, id: string, options: QueryOptions = {}): Promise<ApiResponse<T>> {
    try {
      const query = this.client
        .from(table)
        .select(options.select?.join(',') || '*')
        .eq('id', id)
        .single();

      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST116') {
          throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
        }
        throw createDatabaseError(error.message, 'QUERY_ERROR', 400, error);
      }

      return { data: data as T };
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
      let query = this.client
        .from(table)
        .select(options.select?.join(',') || '*');

      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
        }
        throw createDatabaseError(error.message, 'QUERY_ERROR', 400, error);
      }

      return { data: data as T };
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
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw createDatabaseError(error.message, 'INSERT_ERROR', 400, error);
      }

      return { data: result as T };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to create record in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INSERT_ERROR',
        500
      );
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw createDatabaseError(error.message, 'UPDATE_ERROR', 400, error);
      }

      return { data: result as T };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to update record in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_ERROR',
        500
      );
    }
  }

  async delete(table: string, id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        throw createDatabaseError(error.message, 'DELETE_ERROR', 400, error);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
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
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select();

      if (error) {
        throw createDatabaseError(error.message, 'BATCH_INSERT_ERROR', 400, error);
      }

      return { data: result as T[] };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to create multiple records in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_INSERT_ERROR',
        500
      );
    }
  }

  async updateMany<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<ApiResponse<{ count: number }>> {
    try {
      let query = this.client.from(table).update(data);

      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { count, error } = await query.select('id', { count: 'exact', head: true });

      if (error) {
        throw createDatabaseError(error.message, 'BATCH_UPDATE_ERROR', 400, error);
      }

      return { data: { count: count || 0 } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to update multiple records in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_UPDATE_ERROR',
        500
      );
    }
  }

  async deleteMany(table: string, filter: Record<string, any>): Promise<ApiResponse<{ count: number }>> {
    try {
      let query = this.client.from(table).delete();

      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { count, error } = await query.select('id', { count: 'exact', head: true });

      if (error) {
        throw createDatabaseError(error.message, 'BATCH_DELETE_ERROR', 400, error);
      }

      return { data: { count: count || 0 } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to delete multiple records in ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_DELETE_ERROR',
        500
      );
    }
  }

  // Authentication operations
  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        throw createDatabaseError(error.message, 'SIGNUP_ERROR', 400, { ...error });
      }

      if (!data.user) {
        throw createDatabaseError('User creation failed', 'SIGNUP_ERROR', 400);
      }

      const user: User = this.mapSupabaseUser(data.user);
      return { data: user };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIGNUP_ERROR',
        500
      );
    }
  }

  async signIn(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw createDatabaseError(error.message, 'SIGNIN_ERROR', 401, { ...error });
      }

      if (!data.user || !data.session) {
        throw createDatabaseError('Authentication failed', 'SIGNIN_ERROR', 401);
      }

      const user: User = this.mapSupabaseUser(data.user);
      return {
        data: {
          user,
          token: data.session.access_token
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
    try {
      const { error } = await this.client.auth.signOut();

      if (error) {
        throw createDatabaseError(error.message, 'SIGNOUT_ERROR', 400, { ...error });
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Signout failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIGNOUT_ERROR',
        500
      );
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();

      if (error) {
        throw createDatabaseError(error.message, 'GET_USER_ERROR', 401, { ...error });
      }

      if (!user) {
        throw createDatabaseError('No authenticated user', 'NO_USER', 401);
      }

      const mappedUser: User = this.mapSupabaseUser(user);
      return { data: mappedUser };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to get current user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_USER_ERROR',
        500
      );
    }
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    try {
      // Update auth user metadata
      const { data: authData, error: authError } = await this.client.auth.updateUser({
        email: data.email,
        data: {
          name: data.name,
          avatar: data.avatar,
          ...data.metadata
        }
      });

      if (authError) {
        throw createDatabaseError(authError.message, 'UPDATE_PROFILE_ERROR', 400, { ...authError });
      }

      // Update profiles table if it exists
      if (authData.user) {
        try {
          await this.client
            .from('profiles')
            .upsert({
              id: authData.user.id,
              email: data.email || authData.user.email,
              name: data.name,
              avatar: data.avatar,
              role: data.role,
              status: data.status,
              updated_at: new Date().toISOString()
            });
        } catch (profileError) {
          // Profiles table might not exist, that's ok
          console.warn('Could not update profiles table:', profileError);
        }
      }

      const user: User = this.mapSupabaseUser(authData.user!);
      return { data: user };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createDatabaseError(
        `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_PROFILE_ERROR',
        500
      );
    }
  }

  // Subscription operations
  async getSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    return this.findOne<Subscription>('subscriptions', { user_id: userId });
  }

  async updateSubscription(userId: string, data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    try {
      const { data: result, error } = await this.client
        .from('subscriptions')
        .update(data)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw createDatabaseError(error.message, 'UPDATE_SUBSCRIPTION_ERROR', 400, error);
      }

      return { data: result as Subscription };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
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

  // Real-time subscriptions
  async subscribe<T>(table: string, filter?: Record<string, any>, callback?: (data: T) => void): Promise<() => void> {
    let channel = this.client
      .channel(`realtime:${table}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: filter ? Object.entries(filter).map(([key, value]) => `${key}=eq.${value}`).join(',') : undefined
      }, (payload) => {
        if (callback) {
          callback(payload.new as T);
        }
      })
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }

  // Helper methods
  private mapSupabaseUser(supabaseUser: SupabaseUser): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: supabaseUser.user_metadata?.name || supabaseUser.email!,
      avatar: supabaseUser.user_metadata?.avatar || supabaseUser.user_metadata?.avatar_url,
      role: supabaseUser.user_metadata?.role || 'user',
      status: supabaseUser.email_confirmed_at ? 'active' : 'pending',
      metadata: supabaseUser.user_metadata,
      created_at: supabaseUser.created_at,
      updated_at: supabaseUser.updated_at || supabaseUser.created_at
    };
  }
}