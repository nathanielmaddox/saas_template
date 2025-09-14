import { vi } from 'vitest';
import type { DatabaseClient, DatabaseConfig, User } from '@/lib/database/types';

/**
 * Test utilities and helpers for consistent testing across the application
 */

// Mock data generators
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  role: 'user',
  status: 'active',
  metadata: {},
  emailVerified: true,
  phoneVerified: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createMockSubscription = (overrides: any = {}) => ({
  id: 'test-subscription-id',
  user_id: 'test-user-id',
  plan: 'basic',
  status: 'active',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancel_at_period_end: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

// Database client mock factory
export const createMockDatabaseClient = (): DatabaseClient => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(true),

  // CRUD operations
  findMany: vi.fn().mockResolvedValue({
    data: [createMockUser()],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      hasMore: false
    }
  }),
  findById: vi.fn().mockResolvedValue({
    data: createMockUser()
  }),
  findOne: vi.fn().mockResolvedValue({
    data: createMockUser()
  }),
  create: vi.fn().mockResolvedValue({
    data: createMockUser()
  }),
  update: vi.fn().mockResolvedValue({
    data: createMockUser({ name: 'Updated User' })
  }),
  delete: vi.fn().mockResolvedValue({
    data: { success: true }
  }),

  // Batch operations
  createMany: vi.fn().mockResolvedValue({
    data: [createMockUser(), createMockUser({ id: 'test-user-2' })]
  }),
  updateMany: vi.fn().mockResolvedValue({
    data: { count: 2 }
  }),
  deleteMany: vi.fn().mockResolvedValue({
    data: { count: 2 }
  }),

  // Auth operations
  signUp: vi.fn().mockResolvedValue({
    data: createMockUser()
  }),
  signIn: vi.fn().mockResolvedValue({
    data: {
      user: createMockUser(),
      token: 'mock-jwt-token'
    }
  }),
  signOut: vi.fn().mockResolvedValue({
    data: { success: true }
  }),
  getCurrentUser: vi.fn().mockResolvedValue({
    data: createMockUser()
  }),
  updateProfile: vi.fn().mockResolvedValue({
    data: createMockUser({ name: 'Updated Profile' })
  }),

  // Subscription operations
  getSubscription: vi.fn().mockResolvedValue({
    data: createMockSubscription()
  }),
  updateSubscription: vi.fn().mockResolvedValue({
    data: createMockSubscription({ plan: 'premium' })
  }),
  cancelSubscription: vi.fn().mockResolvedValue({
    data: createMockSubscription({ status: 'cancelled' })
  })
});

// Configuration helpers
export const createMockDatabaseConfig = (provider: string = 'xano'): DatabaseConfig => ({
  provider: provider as any,
  apiUrl: `https://test-${provider}.example.com`,
  apiKey: `test-${provider}-key`,
  options: {
    timeout: 5000,
    retries: 1
  }
});

// Error helpers
export const createMockDatabaseError = (message: string = 'Test error', code: string = 'TEST_ERROR') => {
  const error = new Error(message) as any;
  error.code = code;
  error.statusCode = 400;
  return error;
};

// Authentication helpers
export const createMockAuthSession = () => ({
  user: createMockUser(),
  token: 'mock-jwt-token',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  refreshToken: 'mock-refresh-token'
});

export const createMockClerkUser = (overrides: any = {}) => ({
  id: 'clerk-user-id',
  emailAddresses: [{ emailAddress: 'clerk@example.com', verification: { status: 'verified' } }],
  phoneNumbers: [],
  firstName: 'Clerk',
  lastName: 'User',
  imageUrl: 'https://example.com/clerk-avatar.jpg',
  publicMetadata: { role: 'user' },
  privateMetadata: {},
  unsafeMetadata: {},
  twoFactorEnabled: false,
  totpEnabled: false,
  backupCodeEnabled: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides
});

// Network helpers
export const createMockFetchResponse = (data: any, status: number = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  }) as Promise<Response>;
};

export const mockSuccessfulFetch = (data: any) => {
  vi.mocked(global.fetch).mockResolvedValueOnce(
    createMockFetchResponse(data) as any
  );
};

export const mockFailedFetch = (error: string = 'Network error', status: number = 500) => {
  vi.mocked(global.fetch).mockRejectedValueOnce(new Error(error));
};

// Environment helpers
export const mockEnvironmentVariables = (envVars: Record<string, string>) => {
  Object.entries(envVars).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
};

export const resetEnvironmentVariables = () => {
  vi.unstubAllEnvs();
};

// Time helpers
export const mockCurrentTime = (timestamp: number | Date = Date.now()) => {
  const time = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  vi.setSystemTime(new Date(time));
};

export const resetTime = () => {
  vi.useRealTimers();
};

// Local storage helpers
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    length: 0,
    key: vi.fn()
  };
};

// Rate limiting helpers
export const mockRateLimitSuccess = () => ({
  success: true,
  limit: 100,
  remaining: 99,
  reset: Date.now() + 60000
});

export const mockRateLimitExceeded = () => ({
  success: false,
  limit: 100,
  remaining: 0,
  reset: Date.now() + 60000,
  retryAfter: 60
});

// Component testing helpers
export const createMockComponent = (name: string) => {
  const Component = ({ children, ...props }: any) => (
    <div data-testid={`mock-${name.toLowerCase()}`} {...props}>
      {children || `Mock ${name}`}
    </div>
  );
  Component.displayName = `Mock${name}`;
  return Component;
};

// Async testing helpers
export const waitForAsync = (ms: number = 0) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = () =>
  new Promise(resolve => setImmediate(resolve));

// Test cleanup helpers
export const cleanupMocks = () => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  resetEnvironmentVariables();
  resetTime();
};

// Console helpers (to suppress noise in tests)
export const suppressConsoleErrors = () => {
  const originalError = console.error;
  console.error = vi.fn();
  return () => {
    console.error = originalError;
  };
};

export const suppressConsoleWarnings = () => {
  const originalWarn = console.warn;
  console.warn = vi.fn();
  return () => {
    console.warn = originalWarn;
  };
};