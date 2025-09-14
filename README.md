# 🚀 SaaS Template

A complete, production-ready SaaS application template built with **Next.js 15**, **Xano** backend, and modern web technologies. This template includes authentication, subscription management, third-party integrations, and enterprise-grade features.

## ✨ Features

### 🔐 **Authentication & User Management**
- JWT-based authentication with refresh tokens
- Social login (Google, GitHub, Facebook, Twitter)
- Email verification and password reset
- User profiles and preferences
- Role-based access control

### 💳 **Subscription & Billing**
- Stripe integration for payments
- Multiple subscription plans (Free, Pro, Enterprise)
- Usage tracking and limits
- Invoice management
- Webhook handling for subscription events

### 🗺️ **Maps & Location Services**
- Google Maps integration
- Mapbox integration
- Geocoding and reverse geocoding
- Location-based features
- Distance calculations

### 📊 **Analytics & Monitoring**
- PostHog for product analytics
- Sentry for error tracking
- Custom event tracking
- Usage metrics and dashboards
- Performance monitoring

### 🎨 **Modern UI/UX**
- Tailwind CSS for styling
- Dark/light mode support
- Responsive design
- Accessible components
- Beautiful animations with Framer Motion

### 🛠️ **Developer Experience**
- TypeScript for type safety
- ESLint and Prettier for code quality
- Husky for git hooks
- Jest for testing
- Storybook for component development

### 🚀 **Deployment & DevOps**
- Docker containerization
- CI/CD with GitHub Actions
- Vercel deployment configuration
- AWS S3 and CloudFront integration
- Environment-based configurations

## 📁 Project Structure

```
saas-template/
├── .claude/                    # Claude AI agent structure
│   ├── agentic_structure/
│   │   ├── documentation/
│   │   ├── templates/
│   │   └── tools/
│   ├── AGENT_ORGANIZATION.md
│   └── README.md
├── .github/                    # GitHub workflows and configs
├── src/
│   ├── app/                   # Next.js 15 App Router
│   ├── components/            # Reusable UI components
│   ├── lib/                   # Utilities and configurations
│   └── styles/               # Global styles
├── yaml/                      # Xano schemas and API configs
├── docker-compose.yml         # Production Docker setup
├── docker-compose.dev.yml     # Development Docker setup
├── vercel.json               # Vercel deployment config
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Xano account and workspace
- Stripe account (for payments)
- Third-party API keys (Mapbox, Google Maps, etc.)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd saas-template
npm install
```

### 2. Environment Setup
```bash
# Edit .env and .env.local with your API keys
# All environment variables are already set up in the template
```

### 3. Configure Xano Backend
1. Import the schema from `yaml/xano-schema.yml` to your Xano workspace
2. Set up API endpoints based on `yaml/api-endpoints.yml`
3. Update `NEXT_PUBLIC_XANO_API_URL` in your environment file

### 4. Set Up Third-Party Services

#### Stripe
```bash
# Install Stripe CLI for webhook testing
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

#### Required API Keys
- **Xano**: API URL and API Key
- **Stripe**: Publishable and Secret keys
- **Google Maps**: API key with Maps JavaScript API enabled
- **Mapbox**: Access token
- **SendGrid**: API key for emails
- **PostHog**: Project key for analytics
- **Sentry**: DSN for error tracking

### 5. Run Development Server
```bash
# Start the development server
npm run dev

# Or use Docker for development
docker-compose -f docker-compose.dev.yml up
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run prettier         # Format code
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Docker
npm run docker:dev       # Start development with Docker
npm run docker:prod      # Start production with Docker
```

### Environment Variables

See `.env` for all required environment variables. Key categories:

- **Core**: App name, URL, Node environment
- **Xano**: API URL and authentication
- **Stripe**: Payment processing keys
- **Maps**: Google Maps and Mapbox tokens
- **Email**: SendGrid, Resend, or Mailgun
- **Analytics**: PostHog, Sentry, Google Analytics
- **Storage**: AWS S3, Cloudinary
- **Auth**: NextAuth and JWT secrets

## 🏗️ Architecture

### Frontend (Next.js 15)
- **App Router** for file-based routing
- **Server Components** for better performance
- **Client Components** for interactivity
- **API Routes** for backend integration
- **Middleware** for authentication and routing

### Backend (Xano)
- **Database**: PostgreSQL with Xano's visual interface
- **API**: Automatically generated REST endpoints
- **Authentication**: JWT-based with Xano's auth system
- **File Storage**: Xano's built-in file handling
- **Webhooks**: For real-time integrations

### Key Integrations
- **Stripe**: Subscription billing and payments
- **Google Maps/Mapbox**: Location services
- **SendGrid**: Transactional emails
- **PostHog**: Product analytics
- **Sentry**: Error monitoring

## 🔧 Customization

### Adding New Features
1. **Database**: Add tables to `yaml/xano-schema.yml`
2. **API**: Define endpoints in `yaml/api-endpoints.yml`
3. **Frontend**: Create components in `src/components/`
4. **Styles**: Use Tailwind classes or extend `globals.css`

### Subscription Plans
Edit plans in `src/lib/stripe.ts`:

```typescript
export const SUBSCRIPTION_PLANS = {
  // Add or modify plans here
}
```

### Authentication Providers
Configure in `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
// Add new OAuth providers
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Docker
```bash
# Build and run production container
docker-compose up --build
```

### AWS/Custom Server
1. Build the application: `npm run build`
2. Use the Docker image for deployment
3. Set up environment variables
4. Configure reverse proxy (Nginx recommended)

## 📚 Documentation

### 🏢 **Enterprise Documentation Suite**

This SaaS template now includes comprehensive **Fortune 500-level documentation** covering all aspects of enterprise deployment, security, compliance, and operations.

**📋 [Complete Enterprise Documentation](./docs/README.md)** - Access the full documentation suite:

- **🏗️ [Architecture Documentation](./docs/architecture/README.md)** - Technical architecture, system design, and component documentation
- **🔒 [Security & Compliance](./docs/security/README.md)** - Comprehensive security framework, GDPR, SOC 2, ISO 27001 compliance
- **🔧 [API Documentation](./docs/api/README.md)** - Complete API reference, authentication, and integration guides
- **🚀 [Operations Guide](./docs/operations/README.md)** - Deployment, monitoring, incident response, and maintenance procedures
- **🛡️ [Business Continuity](./docs/business-continuity/README.md)** - Disaster recovery, crisis management, and risk mitigation
- **👥 [Developer Experience](./docs/developer/README.md)** - Onboarding, coding standards, testing guidelines, and workflows

**Enterprise Features:**
- ✅ **Multi-Framework Compliance**: GDPR, SOC 2, ISO 27001, PCI DSS, CCPA, HIPAA ready
- ✅ **99.9% Availability SLA** with comprehensive monitoring and incident response
- ✅ **Security by Design** with multi-layered security controls and threat modeling
- ✅ **Complete API Documentation** with OpenAPI 3.0 specification and SDKs
- ✅ **Disaster Recovery Planning** with RTO/RPO targets and testing procedures
- ✅ **Developer Productivity Suite** with comprehensive onboarding and standards

### Quick Setup Documentation

### Xano Setup
1. Create a new Xano workspace
2. Import the database schema from `yaml/xano-schema.yml`
3. Set up API endpoints based on `yaml/api-endpoints.yml`
4. Configure authentication settings
5. Set up webhooks for Stripe integration

### Stripe Configuration
1. Create webhook endpoint: `/api/webhooks/stripe`
2. Subscribe to events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`
3. Add webhook secret to environment variables

### Maps Setup
- **Google Maps**: Enable Maps JavaScript API, Geocoding API, Places API
- **Mapbox**: Create access token with appropriate scopes

## 🔒 Security

### Best Practices Implemented
- Environment variable validation
- CORS configuration
- Rate limiting (implement with your provider)
- Input validation with Zod
- SQL injection prevention (via Xano)
- XSS protection headers
- HTTPS enforcement in production

### Security Headers
Configured in `next.config.js` and `vercel.json`:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy

## 🧪 Testing

### Test Structure
```
__tests__/
├── components/           # Component tests
├── pages/               # Page tests
├── api/                 # API route tests
└── utils/               # Utility function tests
```

### Running Tests
```bash
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

## 📈 Performance

### Optimization Features
- Next.js Image Optimization
- Code splitting and lazy loading
- Bundle analysis with `npm run analyze`
- CDN integration for static assets
- Database query optimization via Xano

### Monitoring
- Core Web Vitals tracking
- Real User Monitoring with Sentry
- Performance analytics with PostHog
- Custom metrics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow conventional commit messages
- Ensure all checks pass in CI/CD

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the documentation in `/docs`
- Review GitHub Issues
- Check Xano documentation
- Review Next.js documentation

### Common Issues
- **Environment Variables**: Ensure all required variables are set
- **API Connection**: Verify Xano API URL and authentication
- **Stripe Webhooks**: Check webhook endpoint and secret
- **Build Errors**: Verify all dependencies are installed

## 🚀 What's Next?

### Planned Features
- [ ] Multi-tenant architecture
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Advanced notification system
- [ ] Team collaboration features
- [ ] API rate limiting
- [ ] Advanced security features

---

**Built with ❤️ for the developer community. Start building your SaaS today!**