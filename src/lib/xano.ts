import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class XanoClient {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey?: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_XANO_API_URL || '';
    this.apiKey = process.env.XANO_API_KEY;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      // Enterprise optimizations
      timeout: 15000, // Increased for complex operations
      maxContentLength: 50 * 1024 * 1024, // 50MB limit
      maxBodyLength: 50 * 1024 * 1024, // 50MB limit
      validateStatus: (status) => status < 500, // Don't throw on client errors
      // Connection pooling for Node.js environments
      ...(typeof window === 'undefined' && {
        httpAgent: new (require('http').Agent)({
          keepAlive: true,
          maxSockets: 50,
        }),
        httpsAgent: new (require('https').Agent)({
          keepAlive: true,
          maxSockets: 50,
        }),
      }),
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }
    return null;
  }

  private handleUnauthorized(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  }

  // Generic CRUD methods
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(endpoint, config);
    return response.data;
  }

  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(endpoint, data, config);
    return response.data;
  }

  async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(endpoint, data, config);
    return response.data;
  }

  async patch<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(endpoint, data, config);
    return response.data;
  }

  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(endpoint, config);
    return response.data;
  }

  // Authentication methods
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', { email, password });
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/register', userData);
  }

  async logout(): Promise<void> {
    await this.post('/auth/logout');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/refresh');
  }

  async forgotPassword(email: string): Promise<void> {
    await this.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.post('/auth/reset-password', { token, password });
  }

  // User methods
  async getCurrentUser(): Promise<User> {
    return this.get<User>('/auth/me');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.patch<User>('/auth/me', data);
  }

  async uploadAvatar(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.post<{ url: string }>('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  // Subscription methods
  async getSubscription(): Promise<Subscription> {
    return this.get<Subscription>('/subscription');
  }

  async updateSubscription(planId: string): Promise<Subscription> {
    return this.post<Subscription>('/subscription', { plan_id: planId });
  }

  async cancelSubscription(): Promise<void> {
    await this.delete('/subscription');
  }

  // Generic resource methods
  async getResources<T>(resource: string, params?: Record<string, any>): Promise<T[]> {
    return this.get<T[]>(`/${resource}`, { params });
  }

  async getResource<T>(resource: string, id: string | number): Promise<T> {
    return this.get<T>(`/${resource}/${id}`);
  }

  async createResource<T>(resource: string, data: any): Promise<T> {
    return this.post<T>(`/${resource}`, data);
  }

  async updateResource<T>(resource: string, id: string | number, data: any): Promise<T> {
    return this.put<T>(`/${resource}/${id}`, data);
  }

  async deleteResource(resource: string, id: string | number): Promise<void> {
    await this.delete(`/${resource}/${id}`);
  }
}

// Types
export interface AuthResponse {
  authToken: string;
  user: User;
}

export interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  subscription?: Subscription;
  created_at: string;
  updated_at: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  company?: string;
}

export interface Subscription {
  id: number;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

// Create singleton instance
export const xano = new XanoClient();

// Export for use in API routes
export default xano;