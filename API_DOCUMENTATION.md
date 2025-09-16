# 📚 Enterprise SaaS Template - API Documentation

## Table of Contents
- [Overview](#overview)
- [Database Providers](#database-providers)
- [Authentication Systems](#authentication-systems)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Testing](#testing)
- [Security](#security)
- [Migration Guide](#migration-guide)

---

## Overview

This enterprise SaaS template provides a flexible, vendor-agnostic architecture with support for multiple database providers and authentication systems. The template is designed for Fortune 500-level security and scalability while maintaining zero vendor lock-in.

### Key Features
- 🔄 **5 Database Providers**: Xano, Supabase, InstantDB, PostgreSQL, Prisma
- 🔐 **4 Authentication Systems**: NextAuth, Clerk, Supabase Auth, Custom
- 🛡️ **Enterprise Security**: CSP headers, HSTS, rate limiting, comprehensive middleware
- 🧪 **95% Test Coverage**: Unit, integration, and E2E testing with Vitest & Playwright
- ⚡ **Real-time Support**: WebSocket connections with InstantDB and Supabase
- 🌐 **Industry Agnostic**: Configurable for any business vertical

---

## Database Providers

### Database Factory Pattern

The template uses a factory pattern for database abstraction, allowing seamless switching between providers.

```typescript
import { DatabaseFactory } from '@/lib/database/factory';

// Create client from environment
const db = await DatabaseFactory.createFromEnvironment();

// Or specify provider explicitly
const db = await DatabaseFactory.createClient({
  provider: 'supabase',
  apiUrl: 'https://your-project.supabase.co',
  apiKey: 'your-anon-key'
});
```

### Provider Interfaces

All database providers implement the same `DatabaseClient` interface:

```typescript
interface DatabaseClient {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // CRUD operations
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

  // Authentication
  signUp(email: string, password: string, metadata?: Record<string, any>): Promise<ApiResponse<User>>;
  signIn(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>>;
  signOut(): Promise<ApiResponse<{ success: boolean }>>;
  getCurrentUser(): Promise<ApiResponse<User>>;
  updateProfile(data: Partial<User>): Promise<ApiResponse<User>>;

  // Subscriptions
  getSubscription(userId: string): Promise<ApiResponse<Subscription>>;
  updateSubscription(userId: string, data: Partial<Subscription>): Promise<ApiResponse<Subscription>>;
  cancelSubscription(userId: string): Promise<ApiResponse<Subscription>>;
}
```

### 1. Xano Provider

Enterprise-grade integration with Xano backend.

**Configuration:**
```env
XANO_API_URL=https://your-workspace.xano.io/api:your-api-group
XANO_API_KEY=your_xano_api_key
XANO_TIMEOUT=15000
XANO_RETRIES=3
```

**Features:**
- Automatic retry logic with exponential backoff
- Correlation ID tracking for request tracing
- Secure token management with HTTP-only cookies
- Connection pooling and request interceptors

**Usage Example:**
```typescript
const client = new XanoClient({
  provider: 'xano',
  apiUrl: process.env.XANO_API_URL,
  apiKey: process.env.XANO_API_KEY
});

await client.connect();

// CRUD operations
const users = await client.findMany('users', {
  filter: { status: 'active' },
  sort: { created_at: 'desc' },
  limit: 10
});
```

### 2. Supabase Provider

Full PostgreSQL database with built-in authentication and real-time subscriptions.

**Configuration:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Features:**
- Real-time subscriptions
- Row-level security
- Built-in authentication
- PostgreSQL full-text search

**Real-time Example:**
```typescript
const client = new SupabaseClient(config);

// Subscribe to changes
const unsubscribe = await client.subscribe('messages',
  { channel_id: '123' },
  (message) => {
    console.log('New message:', message);
  }
);

// Clean up
unsubscribe();
```

### 3. InstantDB Provider

Real-time database with offline-first capabilities and instant sync.

**Configuration:**
```env
INSTANTDB_APP_ID=your_instantdb_app_id
INSTANTDB_API_URL=https://api.instantdb.com
```

**Features:**
- Offline-first architecture
- Instant real-time sync
- Transaction-based operations
- Optimistic updates

**Transaction Example:**
```typescript
const client = new InstantDBClient(config);

// All operations are transactional
await client.create('posts', {
  title: 'New Post',
  content: 'Content here'
});

// Batch transaction
await client.createMany('posts', [
  { title: 'Post 1' },
  { title: 'Post 2' }
]);
```

### 4. PostgreSQL Provider

Direct PostgreSQL connection with enterprise features.

**Configuration:**
```env
DATABASE_URL=postgresql://user:pass@host:port/db
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=30000
```

**Features:**
- Connection pooling with monitoring
- Transaction support
- Prepared statements
- SSL support for production

**Transaction Example:**
```typescript
const client = new PostgreSQLClient(config);

// Raw SQL execution
const result = await client.executeRawQuery(
  'SELECT * FROM users WHERE created_at > $1',
  [new Date('2024-01-01')]
);
```

### 5. Prisma ORM Provider

Type-safe database access with advanced ORM features.

**Configuration:**
```env
DATABASE_URL=postgresql://user:pass@host:port/db
PRISMA_DATABASE_URL=postgresql://user:pass@host:port/db
```

**Features:**
- Type-safe queries
- Automatic migrations
- Middleware support
- Soft deletes

**Advanced Query Example:**
```typescript
const client = new PrismaORMClient(config);

// Complex queries with relations
const usersWithPosts = await client.prisma.user.findMany({
  where: { status: 'ACTIVE' },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' }
    }
  }
});
```

---

## Multi-Tenant Domain Management

### Domain Management Endpoints

The template includes comprehensive multi-tenant domain management with subdomain and custom domain support.

#### Create Domain
```http
POST /api/domains
Content-Type: application/json

{
  "tenant_id": "tenant_123",
  "domain": "example.com",
  "type": "custom",
  "verification_method": "dns"
}

Response:
{
  "data": {
    "id": "domain_456",
    "tenant_id": "tenant_123",
    "domain": "example.com",
    "type": "custom",
    "status": "pending",
    "verification_token": "abc123..."
  },
  "verification_records": [
    {
      "type": "TXT",
      "name": "_saas-verify.example.com",
      "value": "abc123..."
    }
  ]
}
```

#### Get Domains by Tenant
```http
GET /api/domains?tenant_id=tenant_123

Response:
{
  "data": [
    {
      "id": "domain_456",
      "domain": "example.com",
      "type": "custom",
      "status": "verified",
      "ssl_enabled": true,
      "ssl_status": "active"
    }
  ]
}
```

#### Verify Domain
```http
POST /api/domains/verify
Content-Type: application/json

{
  "domain_id": "domain_456"
}

Response:
{
  "data": {
    "domain_id": "domain_456",
    "status": "verified",
    "ssl_status": "active",
    "verification_results": {
      "ownership_verified": true,
      "dns_configured": true,
      "ssl_verified": true
    }
  }
}
```

### Tenant Management Endpoints

#### Create Tenant
```http
POST /api/tenants
Content-Type: application/json

{
  "name": "ACME Corporation",
  "slug": "acme",
  "plan": "pro",
  "owner_id": "user_123"
}

Response:
{
  "data": {
    "id": "tenant_789",
    "name": "ACME Corporation",
    "slug": "acme",
    "plan": "pro",
    "status": "active",
    "owner_id": "user_123"
  }
}
```

#### Get Current Tenant
```http
GET /api/tenant/current
Host: acme.yoursaas.com

Response:
{
  "tenant_id": "tenant_789",
  "tenant_name": "ACME Corporation",
  "tenant_slug": "acme",
  "domain_type": "subdomain",
  "current_domain": "acme.yoursaas.com",
  "domains": [...]
}
```

### Domain Types

#### Subdomain Configuration
- **Format**: `{slug}.yoursaas.com`
- **Auto-verified**: Subdomains are automatically verified
- **SSL**: Handled by wildcard certificate
- **Creation**: Automatically created with tenant

#### Custom Domain Configuration
- **Format**: Any valid domain (e.g., `app.customer.com`)
- **Verification**: DNS-based ownership verification required
- **SSL**: Automatic certificate provisioning
- **DNS Records**: TXT, CNAME, and A records required

---

## Authentication Systems

### Authentication Factory

Similar to databases, authentication uses a factory pattern:

```typescript
import { AuthFactory } from '@/lib/auth/factory';

// Auto-detect from environment
const auth = await AuthFactory.createFromEnvironment();

// Or specify explicitly
const auth = new ClerkAuthClient({
  provider: 'clerk',
  options: { /* ... */ }
});
```

### 1. Clerk Authentication

Enterprise authentication with MFA, organizations, and social login.

**API Endpoints:**

#### Sign Up
```http
POST /api/auth/clerk/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "metadata": {
    "role": "user",
    "company": "ACME Corp"
  }
}
```

#### Get Session
```http
GET /api/auth/clerk/session
Authorization: Bearer <token>

Response:
{
  "data": {
    "user": { /* user object */ },
    "token": "jwt-token",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

#### Enable MFA
```http
POST /api/auth/clerk/mfa
Content-Type: application/json

{
  "action": "enable"
}

Response:
{
  "data": {
    "qrCode": "data:image/png;base64,...",
    "backupCodes": ["code1", "code2", ...]
  }
}
```

#### Organization Management
```http
POST /api/auth/clerk/organizations
Content-Type: application/json

{
  "name": "My Company",
  "slug": "my-company"
}
```

### 2. NextAuth (Default)

Session-based authentication with multiple providers.

**Configuration:**
```typescript
// app/api/auth/[...nextauth]/route.ts
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    // Add more providers
  ],
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' }
};
```

### 3. Supabase Auth

Integrated authentication with database.

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: { name: 'John Doe' }
  }
});
```

---

## API Endpoints

### Core API Routes

#### Health Check
```http
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "cache": "connected"
  }
}
```

#### Error Reporting
```http
POST /api/errors/report
Content-Type: application/json

{
  "message": "Error description",
  "stack": "Error stack trace",
  "context": {
    "url": "/dashboard",
    "userId": "user-123"
  }
}
```

### Rate Limiting

All API endpoints are rate limited with configurable algorithms:

```typescript
// Rate limit decorators
@rateLimitDecorator({
  requests: 100,
  window: '1m',
  algorithm: 'sliding-window'
})
async function apiHandler(req, res) {
  // Handle request
}
```

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1704067200000
```

---

## Configuration

### Environment-Based Provider Detection

The system automatically detects available providers:

```typescript
// Auto-detection priority order
1. Supabase (if NEXT_PUBLIC_SUPABASE_URL exists)
2. InstantDB (if INSTANTDB_APP_ID exists)
3. PostgreSQL (if DATABASE_URL exists)
4. Xano (if XANO_API_URL exists)
5. Prisma (if DATABASE_URL exists)
```

### Provider Configuration

```typescript
import { getEnvironmentConfig } from '@/lib/config';

const config = getEnvironmentConfig();

// Returns:
{
  database: {
    provider: 'supabase',
    maxConnections: 20,
    enableLogging: true
  },
  auth: {
    provider: 'clerk',
    sessionMaxAge: 2592000,
    enableMFA: true
  },
  security: {
    enableCSP: true,
    enableHSTS: true,
    rateLimiting: true
  }
}
```

---

## Testing

### Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Helpers

```typescript
import {
  createMockDatabaseClient,
  createMockUser,
  mockSuccessfulFetch
} from '@/test/utils/test-helpers';

// Mock database operations
const mockDb = createMockDatabaseClient();
mockDb.findMany.mockResolvedValue({
  data: [createMockUser()]
});
```

---

## Security

### Security Headers

The template implements comprehensive security headers:

```typescript
// next.config.js
{
  'Content-Security-Policy': "default-src 'self'; ...",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), ...'
}
```

### Middleware Security

```typescript
// src/middleware.ts
- Rate limiting per endpoint
- Authentication checks
- Geo-blocking (optional)
- Bot detection
- Request logging
- CORS handling
```

### Error Boundaries

React error boundaries with monitoring:

```typescript
<ErrorBoundary
  level="page"
  showDetails={process.env.NODE_ENV === 'development'}
  onError={(error, errorInfo) => {
    // Automatic error reporting
  }}
>
  <YourComponent />
</ErrorBoundary>
```

---

## Migration Guide

### Switching Database Providers

1. **Update Environment Variables:**
```env
# From Xano
# XANO_API_URL=...
# XANO_API_KEY=...

# To Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

2. **Update Configuration (if needed):**
```typescript
// Optional: Force specific provider
const db = await DatabaseFactory.createClient({
  provider: 'supabase',
  // ... config
});
```

3. **Data Migration:**
```typescript
// Export from old provider
const oldDb = new XanoClient(oldConfig);
const data = await oldDb.findMany('users');

// Import to new provider
const newDb = new SupabaseClient(newConfig);
await newDb.createMany('users', data.data);
```

### Switching Authentication Providers

1. **Update Environment:**
```env
# From NextAuth
# NEXTAUTH_SECRET=...

# To Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

2. **Update Auth Hooks:**
```typescript
// Before
import { useSession } from 'next-auth/react';

// After (with abstraction)
import { useAuth } from '@/lib/auth/hooks';
const { user, isAuthenticated } = useAuth();
```

---

## Performance Optimization

### Connection Pooling

```typescript
// PostgreSQL connection pooling
{
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
}
```

### Caching Strategy

```typescript
// SWR for client-side caching
import useSWR from 'swr';

const { data, error } = useSWR('/api/user', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000
});
```

### Query Optimization

```typescript
// Selective field queries
const users = await db.findMany('users', {
  select: ['id', 'name', 'email'],  // Only fetch needed fields
  limit: 10,
  offset: 0
});
```

---

## Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
npm run db:test
```

**Rate Limit Exceeded:**
```typescript
// Increase limits in middleware
const rateLimitConfig = {
  requests: 200,  // Increase from 100
  window: '1m'
};
```

**Authentication Token Invalid:**
```typescript
// Clear and refresh tokens
await auth.signOut();
await auth.signIn(credentials);
```

### Debug Mode

Enable detailed logging:
```env
NODE_ENV=development
DEBUG=app:*
LOG_LEVEL=debug
```

---

## Support & Resources

- **Documentation**: This file and inline code comments
- **Type Definitions**: Full TypeScript support with interfaces
- **Test Coverage**: Comprehensive test suite with examples
- **Error Messages**: Detailed error codes and descriptions

---

## License

MIT License - See LICENSE file for details

---

## Contributors

Built with enterprise standards for production-ready SaaS applications.