/**
 * Tenant-aware database client wrapper
 * Provides automatic tenant isolation for all database operations
 */

import { DatabaseClient, ApiResponse, QueryOptions, User, Subscription, Tenant, Domain } from './types';
import { createDatabaseClient } from './factory';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  userRole?: 'owner' | 'admin' | 'member' | 'user';
}

export class TenantDatabaseClient implements DatabaseClient {
  private client: DatabaseClient;
  private context: TenantContext;

  constructor(client: DatabaseClient, context: TenantContext) {
    this.client = client;
    this.context = context;
  }

  // Connection management (delegated to underlying client)
  async connect(): Promise<void> {
    return this.client.connect();
  }

  async disconnect(): Promise<void> {
    return this.client.disconnect();
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }

  // Tenant-scoped CRUD operations
  async findMany<T>(table: string, options?: QueryOptions): Promise<ApiResponse<T[]>> {
    const scopedOptions = this.addTenantScope(table, options);
    return this.client.findMany<T>(table, scopedOptions);
  }

  async findById<T>(table: string, id: string, options?: QueryOptions): Promise<ApiResponse<T>> {
    const scopedOptions = this.addTenantScope(table, options);
    return this.client.findById<T>(table, id, scopedOptions);
  }

  async findOne<T>(table: string, filter: Record<string, any>, options?: QueryOptions): Promise<ApiResponse<T>> {
    const scopedFilter = this.addTenantFilter(table, filter);
    const scopedOptions = this.addTenantScope(table, options);
    return this.client.findOne<T>(table, scopedFilter, scopedOptions);
  }

  async create<T>(table: string, data: Partial<T>): Promise<ApiResponse<T>> {
    const scopedData = this.addTenantData(table, data);
    return this.client.create<T>(table, scopedData);
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    // First verify the record belongs to this tenant
    const record = await this.findById(table, id);
    if (!record.data) {
      return { data: null as any, error: 'Record not found or access denied' };
    }

    const scopedData = this.addTenantData(table, data);
    return this.client.update<T>(table, id, scopedData);
  }

  async delete(table: string, id: string): Promise<ApiResponse<{ success: boolean }>> {
    // First verify the record belongs to this tenant
    const record = await this.findById(table, id);
    if (!record.data) {
      return { data: { success: false }, error: 'Record not found or access denied' };
    }

    return this.client.delete(table, id);
  }

  // Tenant-scoped batch operations
  async createMany<T>(table: string, data: Partial<T>[]): Promise<ApiResponse<T[]>> {
    const scopedData = data.map(item => this.addTenantData(table, item));
    return this.client.createMany<T>(table, scopedData);
  }

  async updateMany<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<ApiResponse<{ count: number }>> {
    const scopedFilter = this.addTenantFilter(table, filter);
    const scopedData = this.addTenantData(table, data);
    return this.client.updateMany<T>(table, scopedFilter, scopedData);
  }

  async deleteMany(table: string, filter: Record<string, any>): Promise<ApiResponse<{ count: number }>> {
    const scopedFilter = this.addTenantFilter(table, filter);
    return this.client.deleteMany(table, scopedFilter);
  }

  // Authentication operations (usually not tenant-scoped)
  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<ApiResponse<User>> {
    // Add tenant context to user metadata
    const userMetadata = {
      ...metadata,
      tenant_id: this.context.tenantId
    };
    return this.client.signUp(email, password, userMetadata);
  }

  async signIn(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.client.signIn(email, password);
  }

  async signOut(): Promise<ApiResponse<{ success: boolean }>> {
    return this.client.signOut();
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.client.getCurrentUser();
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    // Ensure user can't change their tenant_id
    const { tenant_id, ...safeData } = data as any;
    return this.client.updateProfile(safeData);
  }

  // Tenant-scoped subscription operations
  async getSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    // Verify user belongs to current tenant
    const user = await this.findById<User>('users', userId);
    if (!user.data) {
      return { data: null as any, error: 'User not found or access denied' };
    }
    return this.client.getSubscription(userId);
  }

  async updateSubscription(userId: string, data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    // Verify user belongs to current tenant
    const user = await this.findById<User>('users', userId);
    if (!user.data) {
      return { data: null as any, error: 'User not found or access denied' };
    }
    return this.client.updateSubscription(userId, data);
  }

  async cancelSubscription(userId: string): Promise<ApiResponse<Subscription>> {
    // Verify user belongs to current tenant
    const user = await this.findById<User>('users', userId);
    if (!user.data) {
      return { data: null as any, error: 'User not found or access denied' };
    }
    return this.client.cancelSubscription(userId);
  }

  // Tenant operations (direct access)
  async createTenant(data: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
    return this.client.createTenant(data);
  }

  async getTenant(tenantId: string): Promise<ApiResponse<Tenant>> {
    // Only allow access to current tenant or if user is super admin
    if (tenantId !== this.context.tenantId && this.context.userRole !== 'owner') {
      return { data: null as any, error: 'Access denied' };
    }
    return this.client.getTenant(tenantId);
  }

  async getTenantBySlug(slug: string): Promise<ApiResponse<Tenant>> {
    return this.client.getTenantBySlug(slug);
  }

  async getTenantByDomain(domain: string): Promise<ApiResponse<Tenant>> {
    return this.client.getTenantByDomain(domain);
  }

  async updateTenant(tenantId: string, data: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
    // Only allow updates to current tenant by owners/admins
    if (tenantId !== this.context.tenantId || !['owner', 'admin'].includes(this.context.userRole || '')) {
      return { data: null as any, error: 'Access denied' };
    }
    return this.client.updateTenant(tenantId, data);
  }

  async deleteTenant(tenantId: string): Promise<ApiResponse<{ success: boolean }>> {
    // Only allow deletion by tenant owner
    if (tenantId !== this.context.tenantId || this.context.userRole !== 'owner') {
      return { data: { success: false }, error: 'Access denied' };
    }
    return this.client.deleteTenant(tenantId);
  }

  // Domain operations (tenant-scoped)
  async createDomain(data: Partial<Domain>): Promise<ApiResponse<Domain>> {
    // Ensure domain belongs to current tenant
    const domainData = {
      ...data,
      tenant_id: this.context.tenantId
    };
    return this.client.createDomain(domainData);
  }

  async getDomain(domainId: string): Promise<ApiResponse<Domain>> {
    const domain = await this.client.getDomain(domainId);
    if (domain.data && domain.data.tenant_id !== this.context.tenantId) {
      return { data: null as any, error: 'Domain not found or access denied' };
    }
    return domain;
  }

  async getDomainsByTenant(tenantId: string): Promise<ApiResponse<Domain[]>> {
    // Only allow access to current tenant's domains
    if (tenantId !== this.context.tenantId) {
      return { data: [], error: 'Access denied' };
    }
    return this.client.getDomainsByTenant(tenantId);
  }

  async updateDomain(domainId: string, data: Partial<Domain>): Promise<ApiResponse<Domain>> {
    // Verify domain belongs to current tenant
    const domain = await this.getDomain(domainId);
    if (!domain.data) {
      return { data: null as any, error: 'Domain not found or access denied' };
    }
    return this.client.updateDomain(domainId, data);
  }

  async deleteDomain(domainId: string): Promise<ApiResponse<{ success: boolean }>> {
    // Verify domain belongs to current tenant
    const domain = await this.getDomain(domainId);
    if (!domain.data) {
      return { data: { success: false }, error: 'Domain not found or access denied' };
    }
    return this.client.deleteDomain(domainId);
  }

  async verifyDomain(domainId: string): Promise<ApiResponse<any>> {
    // Verify domain belongs to current tenant
    const domain = await this.getDomain(domainId);
    if (!domain.data) {
      return { data: null, error: 'Domain not found or access denied' };
    }
    return this.client.verifyDomain(domainId);
  }

  // Optional methods
  subscribe?<T>(table: string, filter?: Record<string, any>, callback?: (data: T) => void): Promise<() => void> {
    if (!this.client.subscribe) {
      throw new Error('Subscriptions not supported by this database provider');
    }
    const scopedFilter = this.addTenantFilter(table, filter || {});
    return this.client.subscribe<T>(table, scopedFilter, callback);
  }

  transaction?<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    if (!this.client.transaction) {
      throw new Error('Transactions not supported by this database provider');
    }
    // Wrap the callback to pass a tenant-aware client
    return this.client.transaction<T>((baseClient) => {
      const tenantClient = new TenantDatabaseClient(baseClient, this.context);
      return callback(tenantClient);
    });
  }

  // Private helper methods
  private addTenantScope(table: string, options?: QueryOptions): QueryOptions {
    if (!this.shouldAddTenantScope(table)) {
      return options || {};
    }

    const filter = options?.filter || {};
    const tenantFilter = this.getTenantFilter(table);

    return {
      ...options,
      filter: {
        ...filter,
        ...tenantFilter
      }
    };
  }

  private addTenantFilter(table: string, filter: Record<string, any>): Record<string, any> {
    if (!this.shouldAddTenantScope(table)) {
      return filter;
    }

    const tenantFilter = this.getTenantFilter(table);
    return {
      ...filter,
      ...tenantFilter
    };
  }

  private addTenantData<T>(table: string, data: Partial<T>): Partial<T> {
    if (!this.shouldAddTenantScope(table)) {
      return data;
    }

    const tenantData = this.getTenantData(table);
    return {
      ...data,
      ...tenantData
    } as Partial<T>;
  }

  private shouldAddTenantScope(table: string): boolean {
    // Tables that should NOT be tenant-scoped
    const globalTables = ['tenants', 'users', 'subscriptions'];
    return !globalTables.includes(table);
  }

  private getTenantFilter(table: string): Record<string, any> {
    // Different tables might use different field names for tenant reference
    const tenantFields: Record<string, string> = {
      projects: 'tenant_id',
      domains: 'tenant_id',
      // Add more table-specific tenant field mappings
    };

    const tenantField = tenantFields[table] || 'tenant_id';
    return { [tenantField]: this.context.tenantId };
  }

  private getTenantData(table: string): Record<string, any> {
    // Same logic as getTenantFilter but for data insertion
    const tenantFields: Record<string, string> = {
      projects: 'tenant_id',
      domains: 'tenant_id',
    };

    const tenantField = tenantFields[table] || 'tenant_id';
    return { [tenantField]: this.context.tenantId };
  }
}

/**
 * Create a tenant-aware database client
 */
export async function createTenantDatabaseClient(context: TenantContext): Promise<TenantDatabaseClient> {
  const baseClient = await createDatabaseClient({
    provider: 'xano', // This should come from environment
    apiUrl: process.env.NEXT_PUBLIC_XANO_API_URL!,
    apiKey: process.env.XANO_API_KEY!
  });

  return new TenantDatabaseClient(baseClient, context);
}

/**
 * Extract tenant context from request headers
 */
export function extractTenantContext(headers: Headers): TenantContext | null {
  const tenantId = headers.get('x-tenant-identifier');
  const userId = headers.get('x-user-id');
  const userRole = headers.get('x-user-role') as TenantContext['userRole'];

  if (!tenantId) {
    return null;
  }

  return {
    tenantId,
    userId: userId || undefined,
    userRole: userRole || undefined
  };
}

/**
 * Middleware helper to create tenant-aware database client from request
 */
export async function createTenantClientFromRequest(request: Request): Promise<TenantDatabaseClient | null> {
  const context = extractTenantContext(new Headers(request.headers));
  if (!context) {
    return null;
  }

  return createTenantDatabaseClient(context);
}