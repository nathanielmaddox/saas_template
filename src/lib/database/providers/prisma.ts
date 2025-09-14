import { PrismaClient, Prisma } from '@prisma/client';
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
 * Prisma ORM database client implementation
 * Provides type-safe database operations with advanced querying capabilities
 */
export class PrismaORMClient implements DatabaseClient {
  private prisma: PrismaClient;
  private connected: boolean = false;

  constructor(private config: DatabaseConfig) {
    // Configure Prisma client with enterprise options
    this.prisma = new PrismaClient({
      log: config.options?.log || (
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error']
      ),
      errorFormat: config.options?.errorFormat || 'pretty',
      datasources: {
        db: {
          url: config.apiUrl || process.env.DATABASE_URL
        }
      }
    });

    // Set up middleware for monitoring and transformation
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    // Query timing middleware
    this.prisma.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();

      console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);

      return result;
    });

    // Soft delete middleware
    this.prisma.$use(async (params, next) => {
      // Check for soft delete operations
      if (params.model && ['User', 'Project', 'Organization'].includes(params.model)) {
        if (params.action === 'delete') {
          // Change to update with soft delete
          params.action = 'update';
          params.args['data'] = { deletedAt: new Date() };
        }

        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          if (params.args.data !== undefined) {
            params.args.data['deletedAt'] = new Date();
          } else {
            params.args['data'] = { deletedAt: new Date() };
          }
        }

        // Exclude soft deleted records from queries
        if (params.action === 'findFirst' || params.action === 'findMany') {
          if (!params.args) {
            params.args = {};
          }
          if (!params.args.where) {
            params.args.where = {};
          }
          params.args.where.deletedAt = null;
        }
      }

      return next(params);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.connected = true;
    } catch (error) {
      throw createDatabaseError(
        `Failed to connect to Prisma: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_ERROR',
        500
      );
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Generic CRUD operations with dynamic model access
  async findMany<T>(table: string, options: QueryOptions = {}): Promise<ApiResponse<T[]>> {
    try {
      const model = this.getModel(table);

      const queryArgs: any = {};

      // Build where clause
      if (options.filter) {
        queryArgs.where = this.buildWhereClause(options.filter);
      }

      // Select specific fields
      if (options.select) {
        queryArgs.select = options.select.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as Record<string, boolean>);
      }

      // Sorting
      if (options.sort) {
        queryArgs.orderBy = Object.entries(options.sort).map(([field, direction]) => ({
          [field]: direction
        }));
      }

      // Pagination
      if (options.limit) {
        queryArgs.take = options.limit;
      }
      if (options.offset) {
        queryArgs.skip = options.offset;
      }

      // Execute query with count for pagination
      const [data, total] = await this.prisma.$transaction([
        model.findMany(queryArgs),
        model.count({ where: queryArgs.where })
      ]);

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
      throw this.handlePrismaError(error, 'QUERY_ERROR');
    }
  }

  async findById<T>(table: string, id: string, options: QueryOptions = {}): Promise<ApiResponse<T>> {
    try {
      const model = this.getModel(table);

      const queryArgs: any = {
        where: { id }
      };

      if (options.select) {
        queryArgs.select = options.select.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as Record<string, boolean>);
      }

      const data = await model.findUnique(queryArgs);

      if (!data) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return { data: data as T };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.handlePrismaError(error, 'QUERY_ERROR');
    }
  }

  async findOne<T>(table: string, filter: Record<string, any>, options: QueryOptions = {}): Promise<ApiResponse<T>> {
    try {
      const model = this.getModel(table);

      const queryArgs: any = {
        where: this.buildWhereClause(filter)
      };

      if (options.select) {
        queryArgs.select = options.select.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as Record<string, boolean>);
      }

      const data = await model.findFirst(queryArgs);

      if (!data) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return { data: data as T };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.handlePrismaError(error, 'QUERY_ERROR');
    }
  }

  async create<T>(table: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const model = this.getModel(table);

      const result = await model.create({
        data: data as any
      });

      return { data: result as T };
    } catch (error) {
      throw this.handlePrismaError(error, 'INSERT_ERROR');
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const model = this.getModel(table);

      const result = await model.update({
        where: { id },
        data: data as any
      });

      return { data: result as T };
    } catch (error) {
      throw this.handlePrismaError(error, 'UPDATE_ERROR');
    }
  }

  async delete(table: string, id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const model = this.getModel(table);

      await model.delete({
        where: { id }
      });

      return { data: { success: true } };
    } catch (error) {
      throw this.handlePrismaError(error, 'DELETE_ERROR');
    }
  }

  // Batch operations with transactions
  async createMany<T>(table: string, data: Partial<T>[]): Promise<ApiResponse<T[]>> {
    try {
      const model = this.getModel(table);

      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        const created = [];
        for (const item of data) {
          const record = await (tx as any)[this.getPrismaModelName(table)].create({
            data: item as any
          });
          created.push(record);
        }
        return created;
      });

      return { data: result as T[] };
    } catch (error) {
      throw this.handlePrismaError(error, 'BATCH_INSERT_ERROR');
    }
  }

  async updateMany<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<ApiResponse<{ count: number }>> {
    try {
      const model = this.getModel(table);

      const result = await model.updateMany({
        where: this.buildWhereClause(filter),
        data: data as any
      });

      return { data: { count: result.count } };
    } catch (error) {
      throw this.handlePrismaError(error, 'BATCH_UPDATE_ERROR');
    }
  }

  async deleteMany(table: string, filter: Record<string, any>): Promise<ApiResponse<{ count: number }>> {
    try {
      const model = this.getModel(table);

      const result = await model.deleteMany({
        where: this.buildWhereClause(filter)
      });

      return { data: { count: result.count } };
    } catch (error) {
      throw this.handlePrismaError(error, 'BATCH_DELETE_ERROR');
    }
  }

  // Authentication operations using Prisma models
  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<ApiResponse<User>> {
    try {
      // Hash password (use bcrypt in production)
      const passwordHash = await this.hashPassword(password);

      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: metadata?.name || email.split('@')[0],
          avatar: metadata?.avatar,
          role: metadata?.role || 'USER',
          status: 'PENDING',
          emailVerified: false,
          phoneVerified: false,
          metadata: metadata ? Prisma.JsonNull : undefined
        }
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        data: {
          ...userWithoutPassword,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString()
        } as User
      };
    } catch (error) {
      throw this.handlePrismaError(error, 'SIGNUP_ERROR');
    }
  }

  async signIn(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw createDatabaseError('Invalid credentials', 'SIGNIN_ERROR', 401);
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash || '');
      if (!isValidPassword) {
        throw createDatabaseError('Invalid credentials', 'SIGNIN_ERROR', 401);
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: 'unknown' // Would get from request context
        }
      });

      // Generate JWT token (simplified)
      const token = this.generateToken(user.id);

      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        data: {
          user: {
            ...userWithoutPassword,
            created_at: user.createdAt.toISOString(),
            updated_at: user.updatedAt.toISOString()
          } as User,
          token
        }
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.handlePrismaError(error, 'SIGNIN_ERROR');
    }
  }

  async signOut(): Promise<ApiResponse<{ success: boolean }>> {
    // In a real implementation, invalidate the session
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

    try {
      const user = await this.prisma.user.update({
        where: { id: data.id },
        data: {
          name: data.name,
          avatar: data.avatar,
          metadata: data.metadata as any
        }
      });

      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        data: {
          ...userWithoutPassword,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString()
        } as User
      };
    } catch (error) {
      throw this.handlePrismaError(error, 'UPDATE_PROFILE_ERROR');
    }
  }

  // Subscription operations using Prisma models
  async getSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { userId }
      });

      if (!subscription) {
        throw createDatabaseError('Subscription not found', 'NOT_FOUND', 404);
      }

      return {
        data: this.mapPrismaSubscriptionToType(subscription)
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.handlePrismaError(error, 'QUERY_ERROR');
    }
  }

  async updateSubscription(userId: string, data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    try {
      const existing = await this.prisma.subscription.findFirst({
        where: { userId }
      });

      let subscription;
      if (existing) {
        subscription = await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan: data.plan,
            status: data.status as any,
            currentPeriodStart: data.current_period_start ? new Date(data.current_period_start) : undefined,
            currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : undefined,
            cancelAtPeriodEnd: data.cancel_at_period_end
          }
        });
      } else {
        subscription = await this.prisma.subscription.create({
          data: {
            userId,
            plan: data.plan || 'free',
            status: (data.status as any) || 'TRIALING',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false
          }
        });
      }

      return {
        data: this.mapPrismaSubscriptionToType(subscription)
      };
    } catch (error) {
      throw this.handlePrismaError(error, 'UPDATE_SUBSCRIPTION_ERROR');
    }
  }

  async cancelSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    return this.updateSubscription(userId, {
      status: 'cancelled',
      cancel_at_period_end: true
    });
  }

  // Advanced Prisma features
  async executeRawQuery<T>(query: string, params?: any[]): Promise<T> {
    try {
      const result = await this.prisma.$queryRawUnsafe<T>(query, ...(params || []));
      return result;
    } catch (error) {
      throw this.handlePrismaError(error, 'RAW_QUERY_ERROR');
    }
  }

  async executeTransaction<T>(operations: ((tx: PrismaClient) => Promise<any>)[]): Promise<T[]> {
    try {
      const results = await this.prisma.$transaction(
        operations.map(op => op(this.prisma))
      );
      return results as T[];
    } catch (error) {
      throw this.handlePrismaError(error, 'TRANSACTION_ERROR');
    }
  }

  // Helper methods
  private getModel(table: string): any {
    const modelName = this.getPrismaModelName(table);
    const model = (this.prisma as any)[modelName];

    if (!model) {
      throw createDatabaseError(`Model ${modelName} not found`, 'MODEL_NOT_FOUND', 400);
    }

    return model;
  }

  private getPrismaModelName(table: string): string {
    // Convert table name to Prisma model name (singular, camelCase)
    const singular = table.endsWith('s') ? table.slice(0, -1) : table;
    return singular.charAt(0).toLowerCase() + singular.slice(1);
  }

  private buildWhereClause(filter: Record<string, any>): any {
    const where: any = {};

    Object.entries(filter).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        where[key] = { in: value };
      } else if (value === null) {
        where[key] = null;
      } else if (typeof value === 'string' && value.includes('%')) {
        // Support for LIKE queries
        where[key] = { contains: value.replace(/%/g, '') };
      } else {
        where[key] = value;
      }
    });

    return where;
  }

  private mapPrismaSubscriptionToType(subscription: any): Subscription {
    return {
      id: subscription.id,
      user_id: subscription.userId,
      stripe_customer_id: subscription.stripeCustomerId,
      stripe_subscription_id: subscription.stripeSubscriptionId,
      stripe_price_id: subscription.stripePriceId,
      plan: subscription.plan,
      status: subscription.status.toLowerCase(),
      quantity: subscription.quantity,
      trial_start: subscription.trialStart?.toISOString(),
      trial_end: subscription.trialEnd?.toISOString(),
      current_period_start: subscription.currentPeriodStart.toISOString(),
      current_period_end: subscription.currentPeriodEnd.toISOString(),
      cancel_at_period_end: subscription.cancelAtPeriodEnd,
      canceled_at: subscription.canceledAt?.toISOString(),
      ended_at: subscription.endedAt?.toISOString(),
      metadata: subscription.metadata,
      created_at: subscription.createdAt.toISOString(),
      updated_at: subscription.updatedAt.toISOString()
    };
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

  private handlePrismaError(error: any, defaultCode: string = 'UNKNOWN_ERROR'): DatabaseError {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      let message = error.message;
      let code = defaultCode;
      let statusCode = 500;

      switch (error.code) {
        case 'P2002': // Unique constraint violation
          code = 'DUPLICATE_ERROR';
          statusCode = 409;
          message = `Duplicate value for unique field`;
          break;
        case 'P2025': // Record not found
          code = 'NOT_FOUND';
          statusCode = 404;
          message = 'Record not found';
          break;
        case 'P2003': // Foreign key constraint violation
          code = 'FOREIGN_KEY_ERROR';
          statusCode = 400;
          message = 'Foreign key constraint failed';
          break;
        case 'P2011': // Null constraint violation
          code = 'NOT_NULL_ERROR';
          statusCode = 400;
          message = 'Required field is missing';
          break;
        default:
          code = `PRISMA_${error.code}`;
      }

      return createDatabaseError(message, code, statusCode, {
        prismaCode: error.code,
        meta: error.meta
      });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return createDatabaseError(
        'Validation error',
        'VALIDATION_ERROR',
        400,
        { message: error.message }
      );
    }

    if (error instanceof Error) {
      return createDatabaseError(error.message, defaultCode, 500);
    }

    return createDatabaseError('Unknown database error', defaultCode, 500);
  }
}