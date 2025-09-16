// Database abstraction types for multi-provider support
export type DatabaseProvider = 'xano' | 'supabase' | 'instantdb' | 'postgresql' | 'prisma';

export interface DatabaseConfig {
  provider: DatabaseProvider;
  connectionString?: string;
  apiKey?: string;
  apiUrl?: string;
  options?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin' | 'member' | 'owner';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  tenant_id?: string;
  subscription?: Subscription;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  metadata?: Record<string, any>;
}

export interface Project {
  id: string;
  user_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string; // subdomain
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'deleted';
  owner_id: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  tenant_id: string;
  domain: string;
  type: 'subdomain' | 'custom';
  status: 'pending' | 'verified' | 'failed' | 'expired';
  verification_token?: string;
  verification_method: 'dns' | 'file' | 'cname';
  ssl_enabled: boolean;
  ssl_status: 'pending' | 'active' | 'failed' | 'expired';
  created_at: string;
  updated_at: string;
  verified_at?: string;
}

export interface DomainVerification {
  domain: string;
  type: 'TXT' | 'CNAME' | 'A';
  name: string;
  value: string;
  priority?: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface QueryOptions {
  filter?: Record<string, any>;
  sort?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
  select?: string[];
  include?: string[];
}

export interface DatabaseClient {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Generic CRUD operations
  findMany<T>(table: string, options?: QueryOptions): Promise<ApiResponse<T[]>>;
  findById<T>(table: string, id: string, options?: QueryOptions): Promise<ApiResponse<T>>;
  findOne<T>(table: string, filter: Record<string, any>, options?: QueryOptions): Promise<ApiResponse<T>>;
  create<T>(table: string, data: Partial<T>): Promise<ApiResponse<T>>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<ApiResponse<T>>;
  delete(table: string, id: string): Promise<ApiResponse<{ success: boolean }>>;

  // Batch operations
  createMany<T>(table: string, data: Partial<T>[]): Promise<ApiResponse<T[]>>;
  updateMany<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<ApiResponse<{ count: number }>>;
  deleteMany(table: string, filter: Record<string, any>): Promise<ApiResponse<{ count: number }>>;

  // Authentication operations
  signUp(email: string, password: string, metadata?: Record<string, any>): Promise<ApiResponse<User>>;
  signIn(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>>;
  signOut(): Promise<ApiResponse<{ success: boolean }>>;
  getCurrentUser(): Promise<ApiResponse<User>>;
  updateProfile(data: Partial<User>): Promise<ApiResponse<User>>;

  // Subscription operations
  getSubscription(userId: string): Promise<ApiResponse<Subscription>>;
  updateSubscription(userId: string, data: Partial<Subscription>): Promise<ApiResponse<Subscription>>;
  cancelSubscription(userId: string): Promise<ApiResponse<Subscription>>;

  // Tenant operations
  createTenant(data: Partial<Tenant>): Promise<ApiResponse<Tenant>>;
  getTenant(tenantId: string): Promise<ApiResponse<Tenant>>;
  getTenantBySlug(slug: string): Promise<ApiResponse<Tenant>>;
  getTenantByDomain(domain: string): Promise<ApiResponse<Tenant>>;
  updateTenant(tenantId: string, data: Partial<Tenant>): Promise<ApiResponse<Tenant>>;
  deleteTenant(tenantId: string): Promise<ApiResponse<{ success: boolean }>>;

  // Domain operations
  createDomain(data: Partial<Domain>): Promise<ApiResponse<Domain>>;
  getDomain(domainId: string): Promise<ApiResponse<Domain>>;
  getDomainsByTenant(tenantId: string): Promise<ApiResponse<Domain[]>>;
  updateDomain(domainId: string, data: Partial<Domain>): Promise<ApiResponse<Domain>>;
  deleteDomain(domainId: string): Promise<ApiResponse<{ success: boolean }>>;
  verifyDomain(domainId: string): Promise<ApiResponse<DomainVerification[]>>;

  // Real-time subscriptions (if supported)
  subscribe?<T>(table: string, filter?: Record<string, any>, callback?: (data: T) => void): Promise<() => void>;

  // Transaction support
  transaction?<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T>;
}

export interface DatabaseError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, any>;
}

// Configuration validation
export function validateDatabaseConfig(config: DatabaseConfig): void {
  if (!config.provider) {
    throw new Error('Database provider is required');
  }

  switch (config.provider) {
    case 'xano':
      if (!config.apiUrl) throw new Error('Xano API URL is required');
      if (!config.apiKey) throw new Error('Xano API key is required');
      break;
    case 'supabase':
      if (!config.apiUrl) throw new Error('Supabase URL is required');
      if (!config.apiKey) throw new Error('Supabase anon key is required');
      break;
    case 'instantdb':
      if (!config.apiKey) throw new Error('InstantDB app ID is required');
      break;
    case 'postgresql':
      if (!config.connectionString) throw new Error('PostgreSQL connection string is required');
      break;
    case 'prisma':
      if (!config.connectionString) throw new Error('Prisma connection string is required');
      break;
    default:
      throw new Error(`Unsupported database provider: ${config.provider}`);
  }
}

// Error handling utilities
export function createDatabaseError(message: string, code: string, statusCode: number, details?: Record<string, any>): DatabaseError {
  const error = new Error(message) as DatabaseError;
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof Error && 'code' in error && 'statusCode' in error;
}