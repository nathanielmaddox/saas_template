# API Documentation

Comprehensive API documentation for the SaaS template, providing complete reference for all endpoints, authentication methods, and integration patterns.

## API Overview

The SaaS template provides a comprehensive REST API built on Next.js API routes with Xano backend integration. The API follows RESTful principles and provides enterprise-grade features including authentication, authorization, rate limiting, and comprehensive error handling.

### API Features
- **RESTful Design**: Consistent REST API patterns and conventions
- **OpenAPI 3.0 Specification**: Complete API specification with validation
- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (RBAC) and permissions
- **Rate Limiting**: Configurable rate limiting per user and endpoint
- **Validation**: Request/response validation with detailed error messages
- **Documentation**: Interactive API documentation with Swagger UI
- **Versioning**: API versioning strategy for backward compatibility
- **Monitoring**: Comprehensive API metrics and logging

## API Documentation Structure

### 📋 Core API Reference
- **[API Specification](./api-specification.md)** - Complete OpenAPI 3.0 specification
- **[Authentication API](./authentication-api.md)** - User authentication and authorization
- **[User Management API](./user-management-api.md)** - User profiles and account management
- **[Subscription API](./subscription-api.md)** - Subscription and billing management
- **[Project API](./project-api.md)** - Project and workspace management

### 🔧 Integration Guides
- **[API Client SDKs](./client-sdks.md)** - Official SDK documentation
- **[Webhook Integration](./webhooks.md)** - Event-driven integration patterns
- **[Rate Limiting](./rate-limiting.md)** - API usage limits and best practices
- **[Error Handling](./error-handling.md)** - Standardized error responses
- **[Pagination](./pagination.md)** - List endpoint pagination patterns

### 🚀 Advanced Features
- **[Real-time APIs](./realtime-apis.md)** - WebSocket and Server-Sent Events
- **[File Upload API](./file-upload-api.md)** - File handling and storage
- **[Search API](./search-api.md)** - Full-text search and filtering
- **[Analytics API](./analytics-api.md)** - Event tracking and metrics
- **[Export API](./export-api.md)** - Data export and reporting

### 🔒 Security & Compliance
- **[API Security](./api-security.md)** - Security best practices and implementation
- **[OAuth 2.0 Integration](./oauth-integration.md)** - Third-party OAuth integration
- **[CORS Configuration](./cors-configuration.md)** - Cross-origin resource sharing
- **[Audit Logging](./audit-logging.md)** - API access audit trails

## Quick Start

### Base URL
```
Production:  https://your-domain.com/api
Staging:     https://staging.your-domain.com/api
Development: http://localhost:3000/api
```

### Authentication
All API requests require authentication using Bearer tokens:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Content Type
API accepts and returns JSON:

```http
Content-Type: application/json
Accept: application/json
```

## API Endpoints Overview

### Authentication Endpoints
```
POST   /api/auth/login           # User login
POST   /api/auth/register        # User registration
POST   /api/auth/refresh         # Token refresh
POST   /api/auth/logout          # User logout
POST   /api/auth/forgot-password # Password reset request
POST   /api/auth/reset-password  # Password reset confirmation
GET    /api/auth/me              # Get current user
PATCH  /api/auth/me              # Update current user
```

### User Management Endpoints
```
GET    /api/users                # List users (admin)
GET    /api/users/{id}           # Get user by ID
PATCH  /api/users/{id}           # Update user
DELETE /api/users/{id}           # Delete user (admin)
POST   /api/users/{id}/suspend   # Suspend user (admin)
POST   /api/users/{id}/activate  # Activate user (admin)
```

### Subscription Endpoints
```
GET    /api/subscription         # Get current subscription
POST   /api/subscription         # Create/update subscription
DELETE /api/subscription         # Cancel subscription
GET    /api/subscription/plans   # List available plans
GET    /api/subscription/usage   # Get usage metrics
POST   /api/subscription/portal  # Create billing portal session
```

### Project Endpoints
```
GET    /api/projects             # List user projects
POST   /api/projects             # Create new project
GET    /api/projects/{id}        # Get project details
PATCH  /api/projects/{id}        # Update project
DELETE /api/projects/{id}        # Delete project
GET    /api/projects/{id}/members # List project members
POST   /api/projects/{id}/members # Add project member
```

### File Upload Endpoints
```
POST   /api/upload/avatar        # Upload user avatar
POST   /api/upload/files         # Upload files
DELETE /api/files/{id}           # Delete file
GET    /api/files/{id}           # Get file metadata
GET    /api/files/{id}/download  # Download file
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "request_id": "req_1234567890"
  }
}
```

## Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PATCH requests |
| 201 | Created | Successful POST requests |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate email) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Rate Limiting

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Rate Limits by Plan

| Plan | Requests/Hour | Burst Limit |
|------|---------------|-------------|
| Free | 1,000 | 100/minute |
| Pro | 10,000 | 500/minute |
| Enterprise | 100,000 | 1,000/minute |

## Pagination

### Request Parameters
```http
GET /api/projects?page=1&limit=20&sort=created_at&order=desc
```

### Response Format
```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering and Sorting

### Query Parameters
```http
# Filtering
GET /api/projects?status=active&category=web

# Sorting
GET /api/projects?sort=created_at&order=desc

# Search
GET /api/projects?search=marketing

# Date range
GET /api/projects?created_after=2024-01-01&created_before=2024-01-31
```

### Supported Operators
- `eq`: Equal (default)
- `ne`: Not equal
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `in`: In array
- `contains`: Contains substring

## Webhook Events

### Supported Events
```
user.created
user.updated
user.deleted
subscription.created
subscription.updated
subscription.cancelled
project.created
project.updated
project.deleted
payment.succeeded
payment.failed
```

### Webhook Payload
```json
{
  "event": "user.created",
  "data": {
    "id": 123,
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "webhook_id": "wh_1234567890"
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { SaaSClient } from '@your-company/saas-sdk';

const client = new SaaSClient({
  apiUrl: 'https://api.your-domain.com',
  apiKey: 'your-api-key'
});

// Get current user
const user = await client.auth.getCurrentUser();

// Create a project
const project = await client.projects.create({
  name: 'My Project',
  description: 'A new project'
});
```

### Python
```python
from saas_sdk import SaaSClient

client = SaaSClient(
    api_url='https://api.your-domain.com',
    api_key='your-api-key'
)

# Get current user
user = client.auth.get_current_user()

# Create a project
project = client.projects.create({
    'name': 'My Project',
    'description': 'A new project'
})
```

### cURL Examples
```bash
# Login
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get projects
curl -X GET https://api.your-domain.com/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create project
curl -X POST https://api.your-domain.com/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","description":"A new project"}'
```

## Testing

### Postman Collection
Import the [Postman collection](./postman-collection.json) for easy API testing.

### API Testing Framework
```bash
# Run API tests
npm run test:api

# Run integration tests
npm run test:integration

# Generate API documentation
npm run docs:generate
```

## API Versioning

### Version Header
```http
API-Version: 2024-01-01
```

### Backward Compatibility
- Minor versions are backward compatible
- Major versions may introduce breaking changes
- Deprecated endpoints are supported for 12 months
- Breaking changes are announced 90 days in advance

## Monitoring and Analytics

### API Metrics
- Request/response times
- Error rates by endpoint
- Rate limit violations
- Authentication failures
- Most used endpoints

### Health Check Endpoint
```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "cache": "healthy",
    "storage": "healthy"
  }
}
```

## Support and Resources

### Documentation Links
- [Interactive API Explorer](https://api-docs.your-domain.com)
- [OpenAPI Specification](./openapi.yaml)
- [SDK Downloads](https://github.com/your-company/saas-sdks)
- [Code Examples](https://github.com/your-company/api-examples)

### Support Channels
- **Developer Support**: [api-support@company.com]
- **Documentation Issues**: [docs@company.com]
- **Feature Requests**: [product@company.com]
- **Security Issues**: [security@company.com]

---

*This API documentation provides comprehensive guidance for integrating with the SaaS template's REST API, including all endpoints, authentication methods, and best practices for enterprise implementation.*