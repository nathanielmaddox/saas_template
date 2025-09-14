import '@testing-library/jest-dom';
import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock environment variables
beforeAll(() => {
  // Core app config
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('NEXT_PUBLIC_APP_NAME', 'Test SaaS App');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

  // Database providers (mock values for testing)
  vi.stubEnv('XANO_API_URL', 'https://test.xano.io/api/test');
  vi.stubEnv('XANO_API_KEY', 'test_xano_key');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test_supabase_key');
  vi.stubEnv('INSTANTDB_APP_ID', 'test_instantdb_id');
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');

  // Auth providers
  vi.stubEnv('NEXTAUTH_SECRET', 'test_nextauth_secret_at_least_32_chars');
  vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_clerk_key');
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_clerk_secret');

  // Rate limiting
  vi.stubEnv('REDIS_URL', 'redis://localhost:6379');

  // Mock external APIs
  vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test_stripe');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_stripe');

  // Mock NextAuth
  vi.mock('next-auth/next', () => ({
    default: vi.fn(),
  }));

  // Mock Clerk
  vi.mock('@clerk/nextjs', () => ({
    auth: vi.fn(() => ({
      userId: 'test-user-id',
      sessionId: 'test-session-id'
    })),
    currentUser: vi.fn(() => ({
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }]
    })),
    ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
    SignIn: () => <div>SignIn Component</div>,
    SignUp: () => <div>SignUp Component</div>,
    UserButton: () => <div>UserButton Component</div>
  }));

  // Mock Redis
  vi.mock('@upstash/redis', () => ({
    Redis: vi.fn(() => ({
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      pipeline: vi.fn(() => ({
        zremrangebyscore: vi.fn(),
        zcard: vi.fn(),
        zadd: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn().mockResolvedValue([[null, 0], [null, 1]])
      }))
    }))
  }));

  // Mock fetch globally
  global.fetch = vi.fn();
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn()
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((name: string) => {
      const mockHeaders: Record<string, string> = {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
        'authorization': 'Bearer test-token'
      };
      return mockHeaders[name];
    })
  }))
}));

// Mock window location and navigator
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    reload: vi.fn()
  },
  writable: true
});

Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test-agent',
    onLine: true
  },
  writable: true
});

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock(),
});

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock(),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Increase timeout for async operations
vi.setConfig({ testTimeout: 10000 });