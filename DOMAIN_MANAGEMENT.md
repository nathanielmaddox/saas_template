# 🌐 Multi-Tenant Domain Management

This document describes the multi-tenant domain management system that allows your SaaS to support both subdomains and custom domains for tenant personalization.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Setup](#setup)
- [API Reference](#api-reference)
- [UI Components](#ui-components)
- [Configuration](#configuration)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

The multi-tenant domain management system enables:

- **Subdomain Support**: `tenant.yoursaas.com`
- **Custom Domain Support**: `app.customercompany.com`
- **Domain Verification**: DNS-based ownership verification
- **SSL Management**: Automatic SSL certificate provisioning
- **Tenant Isolation**: Complete data separation per tenant

### How It Works

1. **Domain Registration**: Tenants add subdomains or custom domains
2. **DNS Verification**: System verifies domain ownership via DNS records
3. **Traffic Routing**: Middleware routes requests to tenant-specific content
4. **Data Isolation**: Database queries are scoped to the authenticated tenant

---

## Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Middleware    │    │  Domain Utils   │    │  API Endpoints  │
│                 │    │                 │    │                 │
│ - Parse Domain  │    │ - Validation    │    │ - CRUD Domains  │
│ - Route Tenant  │    │ - Verification  │    │ - Verification  │
│ - Add Headers   │    │ - DNS Checking  │    │ - Tenant Mgmt   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │              Database Layer                     │
         │                                                 │
         │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
         │  │ Tenants │  │ Domains │  │  Users  │         │
         │  │         │  │         │  │         │         │
         │  │ - id    │  │ - id    │  │ - id    │         │
         │  │ - name  │  │ - domain│  │ - tenant│         │
         │  │ - slug  │  │ - status│  │ - role  │         │
         │  └─────────┘  └─────────┘  └─────────┘         │
         └─────────────────────────────────────────────────┘
```

### Request Flow

1. **Request Arrives**: `https://acme.yoursaas.com/dashboard`
2. **Middleware Parsing**: Extract `acme` as tenant identifier
3. **Tenant Lookup**: Fetch tenant by slug from database
4. **Route Rewriting**: Rewrite to `/tenant/dashboard` with tenant context
5. **Tenant Dashboard**: Render tenant-specific content

---

## Features

### ✅ Implemented Features

- **Subdomain Management**
  - Automatic subdomain creation
  - Slug validation and uniqueness checking
  - Reserved subdomain protection

- **Custom Domain Support**
  - Domain format validation
  - DNS verification (TXT, CNAME, A records)
  - SSL certificate status tracking

- **Domain Verification**
  - DNS-based ownership verification
  - Multiple verification methods
  - Automatic re-verification

- **Tenant Isolation**
  - Request-level tenant context
  - Scoped database queries
  - Tenant-specific routing

- **Security Features**
  - Domain hijacking protection
  - Rate limiting per tenant
  - CORS configuration per domain

### 🔄 Roadmap Features

- **SSL Automation**
  - Automatic certificate provisioning
  - Certificate renewal
  - Wildcard certificate support

- **DNS Management**
  - Cloudflare integration
  - Route53 integration
  - Automatic DNS record management

- **Advanced Features**
  - Domain aliases
  - Redirect management
  - Custom error pages per tenant

---

## Setup

### 1. Environment Configuration

Add the following to your `.env` file:

```env
# Domain Configuration
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NEXT_PUBLIC_PROD_DOMAIN=yoursaas.com

# DNS Configuration
NEXT_PUBLIC_CNAME_TARGET=cname.yoursaas.com
NEXT_PUBLIC_A_RECORD=192.168.1.1

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yoursaas.com,https://*.yoursaas.com

# Feature Flags
NEXT_PUBLIC_ENABLE_MULTI_TENANT=true
NEXT_PUBLIC_ENABLE_CUSTOM_DOMAINS=true
```

### 2. Database Setup

Ensure your database includes the required tables. The system supports:

- **Xano**: Use the included schema definitions
- **Supabase**: Run the provided SQL migrations
- **InstantDB**: Schema is automatically managed
- **PostgreSQL**: Use the Prisma schema or raw SQL
- **Prisma**: Schema included in `prisma/schema.prisma`

### 3. DNS Configuration (Production)

For production deployment, configure your DNS:

```
# Root domain
yoursaas.com          A      192.168.1.1

# Wildcard subdomain
*.yoursaas.com        CNAME  cname.yoursaas.com

# CNAME target
cname.yoursaas.com    A      192.168.1.1
```

---

## API Reference

### Domains API

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
```

#### Get Domains
```http
GET /api/domains?tenant_id=tenant_123
```

#### Verify Domain
```http
POST /api/domains/verify
Content-Type: application/json

{
  "domain_id": "domain_123"
}
```

#### Get Verification Instructions
```http
GET /api/domains/verify?domain_id=domain_123
```

### Tenants API

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
```

#### Get Current Tenant
```http
GET /api/tenant/current
```

### Response Format

All APIs return standardized responses:

```typescript
interface ApiResponse<T> {
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
```

---

## UI Components

### Domain Management Dashboard

Located at `/tenant/domains`, provides:

- **Domain List**: View all configured domains
- **Add Domain Modal**: Create new domains with validation
- **Verification Status**: Real-time status updates
- **DNS Instructions**: Copy-paste DNS records

### Tenant Dashboard

Located at `/tenant/dashboard`, provides:

- **Tenant Overview**: Current domain configuration
- **Quick Actions**: Domain management shortcuts
- **Getting Started**: Setup guidance

### Features

- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Live status updates
- **Error Handling**: User-friendly error messages
- **Loading States**: Proper loading indicators

---

## Configuration

### Domain Validation Rules

#### Subdomains
- **Length**: 3-63 characters
- **Characters**: Letters, numbers, hyphens only
- **Reserved**: Common subdomains are blocked (`www`, `api`, `mail`, etc.)
- **Format**: Must match `/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/`

#### Custom Domains
- **Format**: Valid domain format required
- **Length**: Maximum 253 characters
- **TLD**: Must have valid top-level domain
- **Subdomains**: Unlimited depth supported

### Security Configuration

#### CORS Settings
```javascript
// Automatically configured based on tenant domains
{
  origin: [
    process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    'https://*.yoursaas.com',
    'https://customdomain.com'
  ],
  credentials: true
}
```

#### Rate Limiting
```javascript
// Per-tenant rate limits
{
  api: 100, // requests per minute
  auth: 5,  // auth attempts per minute
  pages: 200 // page views per minute
}
```

---

## Development

### Local Development Setup

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test subdomains locally**:
   Add to `/etc/hosts`:
   ```
   127.0.0.1 localhost
   127.0.0.1 acme.localhost
   127.0.0.1 demo.localhost
   ```

3. **Access tenant URLs**:
   - Main site: `http://localhost:3000`
   - Tenant: `http://acme.localhost:3000`

### Testing

#### Unit Tests
```bash
npm test -- domain
```

#### Integration Tests
```bash
npm run test:integration -- tenant
```

#### Manual Testing Checklist

- [ ] Create tenant with subdomain
- [ ] Access tenant via subdomain
- [ ] Add custom domain
- [ ] Verify domain ownership
- [ ] Test SSL status
- [ ] Test domain deletion

---

## Production Deployment

### Infrastructure Requirements

1. **Load Balancer**: Must support SNI for SSL
2. **DNS Provider**: Programmatic DNS management
3. **SSL Provider**: Automatic certificate provisioning
4. **CDN**: Optional but recommended

### Deployment Steps

1. **Configure DNS**:
   ```bash
   # Set up wildcard subdomain
   *.yoursaas.com CNAME cname.yoursaas.com

   # Set up CNAME target
   cname.yoursaas.com A 192.168.1.1
   ```

2. **SSL Configuration**:
   - Wildcard certificate for `*.yoursaas.com`
   - Automatic certificates for custom domains

3. **Environment Variables**:
   ```env
   NEXT_PUBLIC_ROOT_DOMAIN=yoursaas.com
   NEXT_PUBLIC_PROD_DOMAIN=yoursaas.com
   NEXT_PUBLIC_CNAME_TARGET=cname.yoursaas.com
   NEXT_PUBLIC_A_RECORD=192.168.1.1
   ```

### Recommended Providers

#### DNS Management
- **Cloudflare**: Full DNS + SSL automation
- **Route53**: AWS integration
- **Vercel**: Built-in domain management

#### SSL Certificates
- **Let's Encrypt**: Free automated certificates
- **Cloudflare**: Managed SSL
- **AWS Certificate Manager**: AWS integration

---

## Troubleshooting

### Common Issues

#### Domain Not Resolving
```bash
# Check DNS propagation
dig acme.yoursaas.com

# Check CNAME records
dig acme.yoursaas.com CNAME
```

**Solution**: Verify DNS configuration and wait for propagation (up to 48 hours).

#### SSL Certificate Issues
```bash
# Check SSL certificate
openssl s_client -connect acme.yoursaas.com:443
```

**Solution**: Ensure domain points to correct IP and certificate includes domain.

#### Tenant Not Found
**Symptoms**: "Tenant Not Found" page displays
**Solution**:
1. Check tenant exists in database
2. Verify domain status is "verified"
3. Check middleware tenant lookup logic

#### Verification Failing
**Symptoms**: Domain verification returns false
**Solution**:
1. Verify DNS records are correctly set
2. Check DNS propagation status
3. Ensure verification token matches

### Debug Mode

Enable debug logging:
```env
NODE_ENV=development
DEBUG=app:domain*
LOG_LEVEL=debug
```

### Monitoring

Track key metrics:
- Domain verification success rate
- SSL certificate status
- DNS resolution times
- Tenant lookup performance

---

## Advanced Configuration

### Custom Verification Methods

Extend verification beyond DNS:

```typescript
// Custom verification provider
interface VerificationProvider {
  verify(domain: string, token: string): Promise<boolean>;
  generateInstructions(domain: string, token: string): DomainVerification[];
}
```

### Multi-region Support

Deploy across regions:
- Regional DNS routing
- Geo-distributed SSL certificates
- Regional database replicas

### Enterprise Features

- **Custom SSL certificates**: Customer-provided certificates
- **Domain branding**: Custom favicon, colors per domain
- **Custom error pages**: Branded 404/500 pages
- **Analytics per domain**: Domain-specific metrics

---

## Support

For questions or issues:

1. **Documentation**: Check this guide and API documentation
2. **Community**: Join our Discord for community support
3. **Enterprise**: Contact enterprise support for priority assistance

---

## License

This domain management system is part of the SaaS template and follows the same MIT license.