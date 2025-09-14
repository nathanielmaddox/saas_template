import { Pool, Client, PoolClient, QueryResult } from 'pg';
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
 * PostgreSQL direct database client implementation
 * Provides native PostgreSQL integration with connection pooling and enterprise features
 */
export class PostgreSQLClient implements DatabaseClient {
  private pool: Pool;
  private connected: boolean = false;
  private connectionString: string;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(private config: DatabaseConfig) {
    if (!config.apiUrl) {
      throw createDatabaseError('PostgreSQL connection string is required', 'CONFIG_ERROR', 400);
    }

    this.connectionString = config.apiUrl;
    this.retryAttempts = config.options?.retries || 3;
    this.retryDelay = config.options?.retryDelay || 1000;

    // Configure connection pool
    this.pool = new Pool({
      connectionString: this.connectionString,
      max: config.options?.maxConnections || 20,
      idleTimeoutMillis: config.options?.idleTimeout || 30000,
      connectionTimeoutMillis: config.options?.connectionTimeout || 10000,
      ssl: config.options?.ssl || (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
      application_name: 'saas-template',
      // Enterprise connection settings
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    this.setupPoolListeners();
  }

  private setupPoolListeners(): void {
    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });

    this.pool.on('connect', () => {
      console.log('New PostgreSQL client connected');
    });

    this.pool.on('acquire', () => {
      console.log('PostgreSQL client acquired from pool');
    });

    this.pool.on('remove', () => {
      console.log('PostgreSQL client removed from pool');
    });
  }

  async connect(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.connected = true;
    } catch (error) {
      throw createDatabaseError(
        `Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_ERROR',
        500
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.connected = false;
    } catch (error) {
      console.error('Error disconnecting from PostgreSQL:', error);
    }
  }

  isConnected(): boolean {
    return this.connected && !this.pool.ended;
  }

  // Generic CRUD operations
  async findMany<T>(table: string, options: QueryOptions = {}): Promise<ApiResponse<T[]>> {
    const client = await this.pool.connect();

    try {
      const { query, values } = this.buildSelectQuery(table, options);
      const result = await client.query(query, values);

      // Get total count for pagination
      let total = result.rowCount || 0;
      if (options.limit || options.offset) {
        const countQuery = `SELECT COUNT(*) FROM ${this.sanitizeIdentifier(table)}${this.buildWhereClause(options.filter).clause}`;
        const countResult = await client.query(countQuery, this.buildWhereClause(options.filter).values);
        total = parseInt(countResult.rows[0].count);
      }

      return {
        data: result.rows as T[],
        pagination: options.limit ? {
          page: Math.floor((options.offset || 0) / options.limit) + 1,
          limit: options.limit,
          total,
          hasMore: total > (options.offset || 0) + options.limit
        } : undefined
      };
    } catch (error) {
      throw this.handleDatabaseError(error, 'QUERY_ERROR');
    } finally {
      client.release();
    }
  }

  async findById<T>(table: string, id: string, options: QueryOptions = {}): Promise<ApiResponse<T>> {
    const client = await this.pool.connect();

    try {
      const selectFields = options.select ? options.select.join(', ') : '*';
      const query = `SELECT ${selectFields} FROM ${this.sanitizeIdentifier(table)} WHERE id = $1`;
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return { data: result.rows[0] as T };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'QUERY_ERROR');
    } finally {
      client.release();
    }
  }

  async findOne<T>(table: string, filter: Record<string, any>, options: QueryOptions = {}): Promise<ApiResponse<T>> {
    const client = await this.pool.connect();

    try {
      const selectFields = options.select ? options.select.join(', ') : '*';
      const { clause, values } = this.buildWhereClause(filter);
      const query = `SELECT ${selectFields} FROM ${this.sanitizeIdentifier(table)} ${clause} LIMIT 1`;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return { data: result.rows[0] as T };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'QUERY_ERROR');
    } finally {
      client.release();
    }
  }

  async create<T>(table: string, data: Partial<T>): Promise<ApiResponse<T>> {
    const client = await this.pool.connect();

    try {
      const timestamp = new Date().toISOString();
      const recordData = {
        ...data,
        id: (data as any).id || this.generateId(),
        created_at: timestamp,
        updated_at: timestamp
      };

      const fields = Object.keys(recordData);
      const values = Object.values(recordData);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const query = `
        INSERT INTO ${this.sanitizeIdentifier(table)} (${fields.map(f => this.sanitizeIdentifier(f)).join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await client.query(query, values);
      return { data: result.rows[0] as T };
    } catch (error) {
      throw this.handleDatabaseError(error, 'INSERT_ERROR');
    } finally {
      client.release();
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    const client = await this.pool.connect();

    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields
        .map((field, index) => `${this.sanitizeIdentifier(field)} = $${index + 1}`)
        .join(', ');

      const query = `
        UPDATE ${this.sanitizeIdentifier(table)}
        SET ${setClause}
        WHERE id = $${values.length + 1}
        RETURNING *
      `;

      const result = await client.query(query, [...values, id]);

      if (result.rows.length === 0) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return { data: result.rows[0] as T };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'UPDATE_ERROR');
    } finally {
      client.release();
    }
  }

  async delete(table: string, id: string): Promise<ApiResponse<{ success: boolean }>> {
    const client = await this.pool.connect();

    try {
      const query = `DELETE FROM ${this.sanitizeIdentifier(table)} WHERE id = $1`;
      const result = await client.query(query, [id]);

      if (result.rowCount === 0) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'DELETE_ERROR');
    } finally {
      client.release();
    }
  }

  // Batch operations
  async createMany<T>(table: string, data: Partial<T>[]): Promise<ApiResponse<T[]>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const timestamp = new Date().toISOString();
      const records = data.map(item => ({
        ...item,
        id: (item as any).id || this.generateId(),
        created_at: timestamp,
        updated_at: timestamp
      }));

      const fields = Object.keys(records[0]);
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

      const insertQuery = `
        INSERT INTO ${this.sanitizeIdentifier(table)} (${fields.map(f => this.sanitizeIdentifier(f)).join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const results = [];
      for (const record of records) {
        const values = Object.values(record);
        const result = await client.query(insertQuery, values);
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return { data: results as T[] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.handleDatabaseError(error, 'BATCH_INSERT_ERROR');
    } finally {
      client.release();
    }
  }

  async updateMany<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<ApiResponse<{ count: number }>> {
    const client = await this.pool.connect();

    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const updateFields = Object.keys(updateData);
      const updateValues = Object.values(updateData);
      const setClause = updateFields
        .map((field, index) => `${this.sanitizeIdentifier(field)} = $${index + 1}`)
        .join(', ');

      const { clause: whereClause, values: whereValues } = this.buildWhereClause(filter);
      const allValues = [...updateValues, ...whereValues];

      const query = `
        UPDATE ${this.sanitizeIdentifier(table)}
        SET ${setClause}
        ${whereClause.replace(/\$(\d+)/g, (match, num) => `$${parseInt(num) + updateValues.length}`)}
      `;

      const result = await client.query(query, allValues);
      return { data: { count: result.rowCount || 0 } };
    } catch (error) {
      throw this.handleDatabaseError(error, 'BATCH_UPDATE_ERROR');
    } finally {
      client.release();
    }
  }

  async deleteMany(table: string, filter: Record<string, any>): Promise<ApiResponse<{ count: number }>> {
    const client = await this.pool.connect();

    try {
      const { clause, values } = this.buildWhereClause(filter);
      const query = `DELETE FROM ${this.sanitizeIdentifier(table)} ${clause}`;

      const result = await client.query(query, values);
      return { data: { count: result.rowCount || 0 } };
    } catch (error) {
      throw this.handleDatabaseError(error, 'BATCH_DELETE_ERROR');
    } finally {
      client.release();
    }
  }

  // Authentication operations (using users table)
  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<ApiResponse<User>> {
    const userData: Partial<User> = {
      email,
      name: metadata?.name || email.split('@')[0],
      avatar: metadata?.avatar,
      role: metadata?.role || 'user',
      status: 'pending', // Email verification needed
      metadata,
      emailVerified: false,
      phoneVerified: false
    };

    // Note: Password should be hashed before storing
    // This is a simplified implementation
    const hashedPassword = await this.hashPassword(password);
    const userWithPassword = { ...userData, password_hash: hashedPassword };

    const result = await this.create<User>('users', userWithPassword);

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = result.data as any;
    return { data: userWithoutPassword as User };
  }

  async signIn(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const client = await this.pool.connect();

      try {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await client.query(query, [email]);

        if (result.rows.length === 0) {
          throw createDatabaseError('Invalid credentials', 'SIGNIN_ERROR', 401);
        }

        const userRecord = result.rows[0];

        // Verify password (simplified - use proper bcrypt in production)
        const isValidPassword = await this.verifyPassword(password, userRecord.password_hash);
        if (!isValidPassword) {
          throw createDatabaseError('Invalid credentials', 'SIGNIN_ERROR', 401);
        }

        // Generate JWT token (simplified)
        const token = this.generateToken(userRecord.id);

        const { password_hash, ...user } = userRecord;
        return {
          data: {
            user: user as User,
            token
          }
        };
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.handleDatabaseError(error, 'SIGNIN_ERROR');
    }
  }

  async signOut(): Promise<ApiResponse<{ success: boolean }>> {
    // In a real implementation, you'd invalidate the token
    return { data: { success: true } };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    throw createDatabaseError(
      'getCurrentUser requires session management - implement with JWT middleware',
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
      const existing = await this.findOne<Subscription>('subscriptions', { user_id: userId });
      return this.update<Subscription>('subscriptions', existing.data.id, data);
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as DatabaseError).code === 'NOT_FOUND') {
        const subscriptionData: Partial<Subscription> = {
          ...data,
          id: this.generateId(),
          user_id: userId
        };
        return this.create<Subscription>('subscriptions', subscriptionData);
      }
      throw error;
    }
  }

  async cancelSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    return this.updateSubscription(userId, {
      status: 'cancelled',
      cancel_at_period_end: true
    });
  }

  // Helper methods
  private buildSelectQuery(table: string, options: QueryOptions): { query: string; values: any[] } {
    const selectFields = options.select ? options.select.join(', ') : '*';
    let query = `SELECT ${selectFields} FROM ${this.sanitizeIdentifier(table)}`;
    let values: any[] = [];

    // WHERE clause
    if (options.filter) {
      const { clause, values: filterValues } = this.buildWhereClause(options.filter);
      query += ` ${clause}`;
      values = filterValues;
    }

    // ORDER BY clause
    if (options.sort) {
      const orderClauses = Object.entries(options.sort)
        .map(([field, direction]) => `${this.sanitizeIdentifier(field)} ${direction.toUpperCase()}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // LIMIT and OFFSET
    if (options.limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET $${values.length + 1}`;
      values.push(options.offset);
    }

    return { query, values };
  }

  private buildWhereClause(filter?: Record<string, any>): { clause: string; values: any[] } {
    if (!filter || Object.keys(filter).length === 0) {
      return { clause: '', values: [] };
    }

    const conditions: string[] = [];
    const values: any[] = [];

    Object.entries(filter).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const placeholders = value.map((_, index) => `$${values.length + index + 1}`).join(', ');
        conditions.push(`${this.sanitizeIdentifier(key)} IN (${placeholders})`);
        values.push(...value);
      } else {
        conditions.push(`${this.sanitizeIdentifier(key)} = $${values.length + 1}`);
        values.push(value);
      }
    });

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      values
    };
  }

  private sanitizeIdentifier(identifier: string): string {
    // Basic SQL injection protection for identifiers
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private generateId(): string {
    return `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async hashPassword(password: string): Promise<string> {
    // Simplified - use bcrypt in production
    return Buffer.from(password).toString('base64');
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Simplified - use bcrypt in production
    return Buffer.from(password).toString('base64') === hash;
  }

  private generateToken(userId: string): string {
    // Simplified JWT generation - use proper JWT library in production
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private handleDatabaseError(error: any, defaultCode: string = 'UNKNOWN_ERROR'): DatabaseError {
    let message = 'Unknown database error';
    let code = defaultCode;
    let statusCode = 500;

    if (error instanceof Error) {
      message = error.message;

      // PostgreSQL specific error codes
      const pgError = error as any;
      if (pgError.code) {
        switch (pgError.code) {
          case '23505': // unique_violation
            code = 'DUPLICATE_ERROR';
            statusCode = 409;
            break;
          case '23503': // foreign_key_violation
            code = 'FOREIGN_KEY_ERROR';
            statusCode = 400;
            break;
          case '23502': // not_null_violation
            code = 'NOT_NULL_ERROR';
            statusCode = 400;
            break;
          case '42703': // undefined_column
            code = 'UNDEFINED_COLUMN';
            statusCode = 400;
            break;
          case '42P01': // undefined_table
            code = 'UNDEFINED_TABLE';
            statusCode = 400;
            break;
          default:
            code = `PG_${pgError.code}`;
        }
      }
    }

    return createDatabaseError(message, code, statusCode, {
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
}