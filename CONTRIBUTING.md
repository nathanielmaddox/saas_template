# Contributing to SaaS Template

Thank you for your interest in contributing to our SaaS Template! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A code editor (VS Code recommended)
- Basic knowledge of TypeScript, React, and Next.js

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork via GitHub UI, then clone your fork
   git clone https://github.com/YOUR_USERNAME/saas-template.git
   cd saas-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   # Edit .env.local with your development values
   # The template includes all necessary environment variables
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Verify setup**
   - Visit http://localhost:3000
   - Run tests: `npm test`
   - Run linter: `npm run lint`

## Making Changes

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

Examples:
```bash
git checkout -b feature/user-dashboard
git checkout -b fix/authentication-bug
git checkout -b docs/api-documentation
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

Examples:
```bash
git commit -m "feat(auth): add social login with Google"
git commit -m "fix(stripe): resolve webhook signature validation"
git commit -m "docs(readme): update installation instructions"
```

## Pull Request Process

### Before Submitting

1. **Ensure your code follows our standards**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

2. **Update documentation**
   - Update README.md if needed
   - Add/update JSDoc comments
   - Update relevant .yml files in `/yaml/`

3. **Test your changes**
   - Write tests for new functionality
   - Ensure all existing tests pass
   - Test manually in development environment

### Submitting the PR

1. **Create the pull request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Provide detailed description of changes
   - Include screenshots for UI changes

2. **PR Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   ```

3. **Review process**
   - Wait for automated checks to pass
   - Address review feedback promptly
   - Keep the PR updated with main branch

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type when possible
- Use strict mode settings

```typescript
// Good
interface User {
  id: number;
  name: string;
  email: string;
}

// Avoid
const user: any = { ... };
```

### React Components

- Use functional components with hooks
- Prefer named exports
- Use proper TypeScript types for props
- Include JSDoc comments for complex components

```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

/**
 * Reusable button component with multiple variants
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick
}) => {
  // Implementation
};
```

### Styling

- Use Tailwind CSS utility classes
- Create custom utilities in `globals.css` if needed
- Follow mobile-first responsive design
- Use CSS variables for theme values

```typescript
// Good
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-sm">

// Avoid inline styles unless necessary
<div style={{ padding: '24px' }}>
```

### API Integration

- Use the Xano client from `src/lib/xano.ts`
- Implement proper error handling
- Use React Query for data fetching
- Type API responses properly

```typescript
// Good
const { data: user, error, isLoading } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => xano.getResource<User>('users', userId),
});

if (error) {
  return <ErrorMessage error={error} />;
}
```

## Testing

### Unit Tests

- Write tests for utility functions
- Test component logic and behavior
- Use React Testing Library for component tests
- Mock external dependencies

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Integration Tests

- Test complete user flows
- Test API integration points
- Use proper test data and mocking

### Running Tests

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

## Documentation

### Code Documentation

- Use JSDoc comments for functions and classes
- Document complex business logic
- Include usage examples for utilities

```typescript
/**
 * Formats currency amount with proper locale and currency symbol
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 * @example
 * formatCurrency(1999, 'USD') // '$19.99'
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  // Implementation
}
```

### API Documentation

- Update `yaml/api-endpoints.yml` for new endpoints
- Document request/response structures
- Include example payloads

### README Updates

- Update installation instructions if changed
- Document new environment variables
- Add new features to feature list
- Update deployment instructions if needed

## Development Workflow

### Local Development

1. **Start services**
   ```bash
   # Start development server
   npm run dev

   # Or use Docker for full stack
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Code quality checks**
   ```bash
   npm run lint:fix    # Fix linting issues
   npm run prettier    # Format code
   npm run type-check  # Check TypeScript
   ```

3. **Testing workflow**
   ```bash
   npm run test:watch  # Run tests in watch mode
   ```

### Working with External APIs

- Use environment variables for API keys
- Implement proper error handling
- Add rate limiting considerations
- Document API limitations and requirements

### Database Changes (Xano)

- Update `yaml/xano-schema.yml` for schema changes
- Update `yaml/api-endpoints.yml` for new endpoints
- Test changes in Xano workspace before committing
- Document migration steps if needed

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- `MAJOR` - Breaking changes
- `MINOR` - New features (backward compatible)
- `PATCH` - Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Environment variables documented
- [ ] Migration guide (if needed)

## Getting Help

### Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Xano Documentation](https://docs.xano.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

### Community

- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - Questions and community discussion
- Project maintainers - Direct questions about contributing

### Common Issues

**Environment Setup**
- Ensure all required environment variables are set
- Check Node.js and npm versions
- Clear `node_modules` and reinstall if issues persist

**API Integration**
- Verify Xano workspace is properly configured
- Check API keys and permissions
- Review network requests in browser dev tools

**Build Issues**
- Run `npm run type-check` to identify TypeScript errors
- Check for missing dependencies
- Ensure all imports are correct

## Recognition

Contributors will be recognized in:
- GitHub contributor list
- Release notes for significant contributions
- Special recognition for major features or improvements

Thank you for contributing to make this SaaS template better for everyone! 🚀