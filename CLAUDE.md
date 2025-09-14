# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready SaaS application template built with **Next.js 15** (App Router), **Xano** as the backend service, and modern web technologies. The template includes authentication, subscription management with Stripe, maps integration, analytics, and enterprise-grade features.

## Tech Stack

- **Frontend**: Next.js 15.0.3+ (App Router, Server Components, React 19)
- **Backend**: Xano (PostgreSQL with visual API builder)
- **Database**: PostgreSQL via Xano
- **Styling**: Tailwind CSS 3.4+ with custom design system
- **Authentication**: NextAuth.js with JWT and social providers
- **Payments**: Stripe integration with webhook handling
- **Maps**: Google Maps API and Mapbox GL JS
- **Testing**: Jest with React Testing Library
- **Type Safety**: TypeScript 5.7+
- **Code Quality**: ESLint, Prettier, Husky git hooks

## Key Architecture

### Next.js App Router Structure
- **Server Components**: Used by default for better performance
- **Client Components**: Only when interactivity needed (use `"use client"`)
- **API Routes**: Located in `src/app/api/` for backend integration
- **Middleware**: Authentication and routing logic

### Xano Backend Integration
- **XanoClient**: Centralized API client in `src/lib/xano.ts`
- **Authentication**: JWT-based with automatic token refresh
- **Schema**: Database schema defined in `yaml/xano-schema.yml`
- **API Endpoints**: Documented in `yaml/api-endpoints.yml`
- **Webhooks**: Stripe integration via Xano webhooks

### Subscription Architecture
- **Plans**: Configured in `src/lib/stripe.ts` (Free, Pro, Enterprise)
- **Billing**: Stripe Checkout and Customer Portal integration
- **Usage Tracking**: Plan limitations enforced in application logic
- **Webhooks**: Handle subscription lifecycle at `/api/webhooks/stripe`

### Authentication Flow
- **Social Login**: Google, GitHub, Facebook, Twitter via NextAuth
- **JWT Tokens**: Stored in localStorage/sessionStorage
- **Token Refresh**: Automatic refresh via Axios interceptors
- **Route Protection**: Middleware-based authentication

## Development Commands

```bash
# Development
npm run dev              # Start development server (localhost:3000)
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
npm run type-check       # TypeScript type checking
npm run prettier         # Format code with Prettier

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Single test file
npm run test -- ComponentName.test.tsx
npm run test -- --testNamePattern="specific test name"

# Docker Development
npm run docker:dev       # Start with Docker Compose (dev)
npm run docker:prod      # Start with Docker Compose (prod)

# Stripe Development
npm run stripe:listen    # Listen to Stripe webhooks locally
```

## Environment Configuration

### Required Environment Variables
- **NEXT_PUBLIC_XANO_API_URL**: Xano workspace API endpoint
- **XANO_API_KEY**: Xano API key for server-side requests
- **STRIPE_PUBLISHABLE_KEY** / **STRIPE_SECRET_KEY**: Stripe payment keys
- **STRIPE_WEBHOOK_SECRET**: Stripe webhook signature verification
- **NEXTAUTH_SECRET**: NextAuth encryption secret (32+ chars)
- **JWT_SECRET**: JWT signing secret (32+ chars)

### Map Services (Choose one or both)
- **GOOGLE_MAPS_API_KEY**: Google Maps JavaScript API
- **NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN**: Mapbox GL JS access token

### Email Service (Choose one)
- **SENDGRID_API_KEY**: SendGrid transactional emails
- **POSTMARK_SERVER_TOKEN**: Postmark email service
- **RESEND_API_KEY**: Resend email service

## Component Architecture

### Design System
- **Tailwind Config**: Custom design tokens in `tailwind.config.js`
- **CSS Variables**: Theme colors defined in `src/app/globals.css`
- **Dark Mode**: Class-based dark mode support (`dark:` prefix)
- **Components**: Reusable UI components (when created, place in `src/components/`)

### State Management
- **Server State**: SWR or TanStack Query for API data
- **Client State**: React hooks and context for UI state
- **Authentication**: NextAuth session management
- **Global State**: React Context for theme, user preferences

## Database & API Patterns

### Xano Integration
```typescript
// Use the centralized XanoClient
import { xano } from '@/lib/xano';

// Generic resource operations
const users = await xano.getResources<User>('users');
const user = await xano.getResource<User>('users', userId);
await xano.createResource('users', userData);
await xano.updateResource('users', userId, updates);
await xano.deleteResource('users', userId);

// Authentication methods
const { authToken, user } = await xano.login(email, password);
await xano.logout();
const currentUser = await xano.getCurrentUser();
```

### API Route Patterns
- **Error Handling**: Consistent error responses with status codes
- **Validation**: Zod schemas for request validation
- **Authentication**: Check JWT tokens in API routes
- **Webhooks**: Signature verification for external services

## Testing Strategy

### Test Structure
- **Unit Tests**: `src/**/__tests__/` or `src/**/*.test.tsx`
- **Component Tests**: React Testing Library with Jest
- **API Tests**: Mock Xano client for API route testing
- **E2E Tests**: Consider Playwright for critical user flows

### Testing Utilities
- **Module Aliases**: Use `@/` prefix for imports (configured in `jest.config.js`)
- **Coverage**: 70% threshold for branches, functions, lines, statements
- **Mocking**: Mock external services (Stripe, Xano, Maps) in tests

## AI Agent Integration

### Claude AI Agents
- **YAML Specifications**: 60+ specialized agents in `.claude/yaml/`
- **Agent Categories**: Mobile, Analytics, Infrastructure, Security, Compliance
- **Dynamic Creation**: Agents created on-demand based on project needs
- **Technology Stack**: Reference `.claude/agentic_structure/documentation/TECHNOLOGY_STACK_VERSIONS.md`

### Agent Workflow
1. Check `.claude/yaml/` for existing agent specifications
2. Reference `.claude/agentic_structure/` for project context
3. Use `TodoWrite` for progress tracking
4. Apply quality gates from documentation

## Security Considerations

### Implemented Security
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options (in `next.config.js`)
- **CORS**: Configured for API routes
- **Input Validation**: Zod schemas for type-safe validation
- **Authentication**: JWT with refresh token rotation
- **Environment**: Sensitive data in environment variables only

### Security Headers
```javascript
// Configured in next.config.js
headers: [
  'X-Content-Type-Options: nosniff',
  'X-Frame-Options: DENY',
  'X-XSS-Protection: 1; mode=block',
  'Referrer-Policy: origin-when-cross-origin'
]
```

## Performance Optimization

### Next.js Features
- **Image Optimization**: Use `next/image` for all images
- **Code Splitting**: Automatic with App Router
- **Server Components**: Default for better performance
- **Bundle Analysis**: `ANALYZE=true npm run build`

### Monitoring
- **Core Web Vitals**: Tracked via Vercel Analytics
- **Error Tracking**: Sentry integration configured
- **Performance**: PostHog for user analytics
- **Custom Metrics**: Track business KPIs

## Deployment

### Vercel (Recommended)
```bash
vercel --prod
# Environment variables configured in Vercel dashboard
```

### Docker
```bash
docker-compose up --build
# Uses docker-compose.yml for production build
```

### Key Deployment Steps
1. Set environment variables in deployment platform
2. Configure Xano webhook endpoints for production domain
3. Update Stripe webhook endpoint URL
4. Set up domain and SSL certificates
5. Configure CDN for static assets (if not using Vercel)

## Development Workflow

### Git Hooks (Husky)
- **Pre-commit**: ESLint + Prettier via lint-staged
- **Commit Message**: Conventional commit format enforced

### Code Style
- **Import Paths**: Use `@/` alias for `src/` directory
- **Component Files**: PascalCase.tsx for components
- **Utility Files**: camelCase.ts for utilities
- **API Routes**: kebab-case for endpoint files

### Adding New Features
1. **Database**: Update `yaml/xano-schema.yml` schema
2. **API**: Document endpoints in `yaml/api-endpoints.yml`
3. **Types**: Define TypeScript interfaces
4. **Components**: Create reusable UI components
5. **Tests**: Write unit tests for new functionality
6. **Documentation**: Update relevant documentation