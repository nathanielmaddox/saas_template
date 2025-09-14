import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
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
 * Enhanced Xano database client implementation
 * Provides enterprise-grade integration with Xano backend
 */
export class XanoClient implements DatabaseClient {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey?: string;
  private connected: boolean = false;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(private config: DatabaseConfig) {
    if (!config.apiUrl) {
      throw createDatabaseError('Xano API URL is required', 'CONFIG_ERROR', 400);
    }

    this.baseURL = config.apiUrl;
    this.apiKey = config.apiKey;
    this.retryAttempts = config.options?.retries || 3;
    this.retryDelay = config.options?.retryDelay || 1000;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: config.options?.timeout || 15000, // Increased for enterprise
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SaaS-Template-Enterprise/1.0',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      // Enterprise configurations
      maxBodyLength: config.options?.maxBodyLength || 50 * 1024 * 1024, // 50MB
      maxContentLength: config.options?.maxContentLength || 50 * 1024 * 1024,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor with authentication
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add correlation ID for tracing
        config.headers['X-Correlation-ID'] = this.generateCorrelationId();

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;

        // Retry logic for network errors and 5xx responses
        if (this.shouldRetry(error) && !config._retry) {
          config._retry = true;
          config._retryCount = config._retryCount || 0;

          if (config._retryCount < this.retryAttempts) {
            config._retryCount++;

            // Exponential backoff
            const delay = this.retryDelay * Math.pow(2, config._retryCount - 1);
            await this.delay(delay);

            return this.client(config);
          }
        }

        // Handle specific error responses
        if (error.response?.status === 401) {
          this.handleUnauthorized();
        }

        return Promise.reject(this.createDatabaseError(error));
      }
    );
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple health check
      const response = await this.client.get('/health', { timeout: 5000 });
      this.connected = true;
    } catch (error) {
      // If health endpoint doesn't exist, try a different test
      try {
        await this.client.get('/', { timeout: 5000 });
        this.connected = true;
      } catch (secondError) {
        throw createDatabaseError(
          `Failed to connect to Xano: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CONNECTION_ERROR',
          500
        );
      }
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Generic CRUD operations
  async findMany<T>(table: string, options: QueryOptions = {}): Promise<ApiResponse<T[]>> {
    try {
      const params = this.buildQueryParams(options);
      const response = await this.client.get(`/${table}`, { params });

      return this.formatResponse<T[]>(response);
    } catch (error) {
      throw this.createDatabaseError(error, 'QUERY_ERROR');
    }
  }

  async findById<T>(table: string, id: string, options: QueryOptions = {}): Promise<ApiResponse<T>> {
    try {
      const params = this.buildQueryParams(options);
      const response = await this.client.get(`/${table}/${id}`, { params });

      if (!response.data) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return this.formatResponse<T>(response);
    } catch (error) {
      throw this.createDatabaseError(error, 'QUERY_ERROR');
    }
  }

  async findOne<T>(table: string, filter: Record<string, any>, options: QueryOptions = {}): Promise<ApiResponse<T>> {
    try {
      const queryOptions = { ...options, filter, limit: 1 };
      const response = await this.findMany<T>(table, queryOptions);

      if (!response.data || response.data.length === 0) {
        throw createDatabaseError(`Record not found in ${table}`, 'NOT_FOUND', 404);
      }

      return { data: response.data[0] };
    } catch (error) {
      throw this.createDatabaseError(error, 'QUERY_ERROR');
    }
  }

  async create<T>(table: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(`/${table}`, data);
      return this.formatResponse<T>(response);
    } catch (error) {
      throw this.createDatabaseError(error, 'INSERT_ERROR');
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch(`/${table}/${id}`, data);
      return this.formatResponse<T>(response);
    } catch (error) {
      throw this.createDatabaseError(error, 'UPDATE_ERROR');
    }
  }

  async delete(table: string, id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      await this.client.delete(`/${table}/${id}`);
      return { data: { success: true } };
    } catch (error) {
      throw this.createDatabaseError(error, 'DELETE_ERROR');
    }
  }

  // Batch operations
  async createMany<T>(table: string, data: Partial<T>[]): Promise<ApiResponse<T[]>> {
    try {
      const response = await this.client.post(`/${table}/batch`, { records: data });
      return this.formatResponse<T[]>(response);
    } catch (error) {
      throw this.createDatabaseError(error, 'BATCH_INSERT_ERROR');
    }
  }

  async updateMany<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await this.client.patch(`/${table}/batch`, { filter, data });
      return { data: { count: response.data?.count || 0 } };
    } catch (error) {
      throw this.createDatabaseError(error, 'BATCH_UPDATE_ERROR');
    }
  }

  async deleteMany(table: string, filter: Record<string, any>): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await this.client.delete(`/${table}/batch`, { data: { filter } });
      return { data: { count: response.data?.count || 0 } };
    } catch (error) {
      throw this.createDatabaseError(error, 'BATCH_DELETE_ERROR');
    }
  }

  // Authentication operations
  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<ApiResponse<User>> {
    try {
      const response = await this.client.post('/auth/signup', {
        email,
        password,
        ...metadata
      });

      return this.formatResponse<User>(response);
    } catch (error) {
      throw this.createDatabaseError(error, 'SIGNUP_ERROR');
    }
  }

  async signIn(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await this.client.post('/auth/login', { email, password });

      const result = response.data;
      if (result.authToken) {
        this.setAuthToken(result.authToken);
      }

      return {
        data: {
          user: result.user,
          token: result.authToken
        }
      };
    } catch (error) {
      throw this.createDatabaseError(error, 'SIGNIN_ERROR');
    }
  }

  async signOut(): Promise<ApiResponse<{ success: boolean }>> {
    try {
      await this.client.post('/auth/logout');
      this.clearAuthToken();
      return { data: { success: true } };
    } catch (error) {
      throw this.createDatabaseError(error, 'SIGNOUT_ERROR');
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await this.client.get('/auth/me');
      return this.formatResponse<User>(response);
    } catch (error) {
      throw this.createDatabaseError(error, 'GET_USER_ERROR');
    }
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.client.patch('/auth/me', data);
      return this.formatResponse<User>(response);
    } catch (error) {
      throw this.createDatabaseError(error, 'UPDATE_PROFILE_ERROR');
    }
  }

  // Subscription operations
  async getSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    return this.findOne<Subscription>('subscriptions', { user_id: userId });
  }

  async updateSubscription(userId: string, data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    try {
      // Try to find existing subscription first
      const existing = await this.findOne<Subscription>('subscriptions', { user_id: userId });

      if (existing.data) {
        return this.update<Subscription>('subscriptions', existing.data.id, data);
      } else {
        // Create new subscription
        const subscriptionData = { ...data, user_id: userId } as Partial<Subscription>;
        return this.create<Subscription>('subscriptions', subscriptionData);
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as DatabaseError).code === 'NOT_FOUND') {
        // Create new subscription if not found
        const subscriptionData = { ...data, user_id: userId } as Partial<Subscription>;
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
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      // Check for secure cookie first, then fallback to storage
      return this.getCookieToken() ||
             sessionStorage.getItem('auth_token') ||
             localStorage.getItem('auth_token');
    }
    return null;
  }

  private setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      // Store in secure HTTP-only cookie (requires server-side implementation)
      this.setSecureCookie('auth_token', token);

      // Fallback to sessionStorage for client-side access
      sessionStorage.setItem('auth_token', token);
    }
  }

  private clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      this.clearSecureCookie('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('auth_token');
    }
  }

  private getCookieToken(): string | null {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/auth_token=([^;]+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  private setSecureCookie(name: string, value: string): void {
    if (typeof document !== 'undefined') {
      const expires = new Date();
      expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

      document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    }
  }

  private clearSecureCookie(name: string): void {
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=strict`;
    }
  }

  private handleUnauthorized(): void {
    this.clearAuthToken();

    if (typeof window !== 'undefined') {
      // Redirect to login page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup') {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
  }

  private buildQueryParams(options: QueryOptions): Record<string, any> {
    const params: Record<string, any> = {};

    if (options.filter) {
      // Convert filter object to query parameters
      Object.entries(options.filter).forEach(([key, value]) => {
        params[key] = value;
      });
    }

    if (options.sort) {
      // Convert sort object to query parameter
      const sortString = Object.entries(options.sort)
        .map(([key, order]) => `${key}:${order}`)
        .join(',');
      params._sort = sortString;
    }

    if (options.limit) {
      params._limit = options.limit;
    }

    if (options.offset) {
      params._offset = options.offset;
    }

    if (options.select) {
      params._fields = options.select.join(',');
    }

    return params;
  }

  private formatResponse<T>(response: AxiosResponse): ApiResponse<T> {
    return {
      data: response.data,
      message: response.headers['x-message'],
      pagination: response.headers['x-pagination'] ? JSON.parse(response.headers['x-pagination']) : undefined
    };
  }

  private createDatabaseError(error: any, defaultCode: string = 'UNKNOWN_ERROR'): DatabaseError {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      const code = error.response?.data?.code || defaultCode;
      const statusCode = error.response?.status || 500;

      return createDatabaseError(message, code, statusCode, {
        url: error.config?.url,
        method: error.config?.method,
        correlationId: error.config?.headers?.['X-Correlation-ID']
      });
    }

    if (error instanceof Error && 'code' in error) {
      return error as DatabaseError;
    }

    return createDatabaseError(
      error instanceof Error ? error.message : 'Unknown database error',
      defaultCode,
      500
    );
  }

  private shouldRetry(error: any): boolean {
    if (!axios.isAxiosError(error)) return false;

    // Retry on network errors
    if (!error.response) return true;

    // Retry on 5xx server errors
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateCorrelationId(): string {
    return `xano-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}