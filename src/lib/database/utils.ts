/**
 * Database utilities for tenant-aware operations
 * Provides helpers for API routes and middleware
 */

import { NextRequest } from 'next/server';
import { createDatabaseClient } from './factory';
import { TenantDatabaseClient, createTenantDatabaseClient, extractTenantContext, TenantContext } from './tenant-client';
import { DatabaseClient } from './types';

/**
 * Get database client from API request with optional tenant isolation
 */
export async function getDatabaseClient(request?: NextRequest, options?: {
  requireTenant?: boolean;
  tenantId?: string;
  userId?: string;
  userRole?: TenantContext['userRole'];
}): Promise<DatabaseClient | TenantDatabaseClient> {

  // If tenant context is provided via options
  if (options?.tenantId) {
    const context: TenantContext = {
      tenantId: options.tenantId,
      userId: options.userId,
      userRole: options.userRole
    };
    return createTenantDatabaseClient(context);
  }

  // If request is provided, try to extract tenant context
  if (request) {
    const context = extractTenantContext(request.headers);

    if (context) {
      return createTenantDatabaseClient(context);
    } else if (options?.requireTenant) {
      throw new Error('Tenant context required but not found in request headers');
    }
  }

  // Fall back to regular database client
  return createDatabaseClient();
}

/**
 * Extract tenant information from request URL or headers
 */
export function getTenantFromRequest(request: NextRequest): {
  tenantId?: string;
  domainType?: 'subdomain' | 'custom';
  isMultiTenant: boolean;
} {
  // Check headers first (set by middleware)
  const tenantId = request.headers.get('x-tenant-identifier');
  const domainType = request.headers.get('x-domain-type') as 'subdomain' | 'custom';

  if (tenantId) {
    return {
      tenantId,
      domainType,
      isMultiTenant: true
    };
  }

  // Check URL path (for tenant-specific routes)
  const pathname = request.nextUrl.pathname;
  const tenantMatch = pathname.match(/^\/tenant\/(.+)/);

  if (tenantMatch) {
    return {
      isMultiTenant: true
    };
  }

  return {
    isMultiTenant: false
  };
}

/**
 * Middleware helper to add tenant context to request headers
 */
export function addTenantHeaders(response: Response, context: TenantContext): void {
  response.headers.set('X-Tenant-ID', context.tenantId);
  if (context.userId) {
    response.headers.set('X-User-ID', context.userId);
  }
  if (context.userRole) {
    response.headers.set('X-User-Role', context.userRole);
  }
}

/**
 * Validate tenant access permissions
 */
export function validateTenantAccess(
  requestedTenantId: string,
  userContext: TenantContext,
  requiredRole?: TenantContext['userRole']
): boolean {
  // Check if user belongs to the requested tenant
  if (userContext.tenantId !== requestedTenantId) {
    return false;
  }

  // Check role requirement if specified
  if (requiredRole) {
    const roleHierarchy = {
      user: 0,
      member: 1,
      admin: 2,
      owner: 3
    };

    const userRoleLevel = roleHierarchy[userContext.userRole || 'user'];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    return userRoleLevel >= requiredRoleLevel;
  }

  return true;
}

/**
 * Database transaction wrapper with tenant isolation
 */
export async function withTenantTransaction<T>(
  context: TenantContext,
  callback: (client: TenantDatabaseClient) => Promise<T>
): Promise<T> {
  const client = await createTenantDatabaseClient(context);

  if (client.transaction) {
    return client.transaction(callback);
  } else {
    // Fallback for providers that don't support transactions
    return callback(client);
  }
}

/**
 * Batch operation helper with tenant isolation
 */
export async function withTenantBatch<T>(
  context: TenantContext,
  operations: Array<(client: TenantDatabaseClient) => Promise<T>>
): Promise<T[]> {
  const client = await createTenantDatabaseClient(context);

  // Execute all operations in sequence to maintain consistency
  const results: T[] = [];

  for (const operation of operations) {
    const result = await operation(client);
    results.push(result);
  }

  return results;
}

/**
 * Cache key generator for tenant-specific data
 */
export function generateTenantCacheKey(
  tenantId: string,
  key: string,
  ...params: (string | number)[]
): string {
  const paramString = params.length > 0 ? `:${params.join(':')}` : '';
  return `tenant:${tenantId}:${key}${paramString}`;
}

/**
 * Resource permission checker
 */
export async function checkResourcePermission(
  resourceId: string,
  resourceType: string,
  context: TenantContext,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<boolean> {
  try {
    const client = await createTenantDatabaseClient(context);

    // Try to fetch the resource with tenant isolation
    const resource = await client.findById(resourceType, resourceId);

    if (!resource.data) {
      return false; // Resource doesn't exist or doesn't belong to tenant
    }

    // Additional permission checks based on action and user role
    switch (action) {
      case 'read':
        return true; // If we can access it, we can read it

      case 'write':
        return ['admin', 'owner'].includes(context.userRole || '');

      case 'delete':
        return context.userRole === 'owner';

      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking resource permission:', error);
    return false;
  }
}

/**
 * Multi-tenant query builder
 */
export class TenantQueryBuilder {
  private context: TenantContext;
  private client: TenantDatabaseClient | null = null;

  constructor(context: TenantContext) {
    this.context = context;
  }

  async init(): Promise<this> {
    this.client = await createTenantDatabaseClient(this.context);
    return this;
  }

  async users() {
    if (!this.client) throw new Error('Query builder not initialized');
    return this.client.findMany('users', {
      filter: { tenant_id: this.context.tenantId }
    });
  }

  async projects() {
    if (!this.client) throw new Error('Query builder not initialized');
    return this.client.findMany('projects');
  }

  async domains() {
    if (!this.client) throw new Error('Query builder not initialized');
    return this.client.getDomainsByTenant(this.context.tenantId);
  }

  async usersByRole(role: string) {
    if (!this.client) throw new Error('Query builder not initialized');
    return this.client.findMany('users', {
      filter: {
        tenant_id: this.context.tenantId,
        role: role
      }
    });
  }

  async activeProjects() {
    if (!this.client) throw new Error('Query builder not initialized');
    return this.client.findMany('projects', {
      filter: { status: 'active' }
    });
  }
}

/**
 * Create tenant query builder
 */
export async function createTenantQuery(context: TenantContext): Promise<TenantQueryBuilder> {
  const builder = new TenantQueryBuilder(context);
  return builder.init();
}