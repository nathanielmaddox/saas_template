import { beforeAll, afterAll, vi } from 'vitest';

// Integration test setup for database and external service testing
beforeAll(async () => {
  // Set up test database connections (if needed)

  // Mock external services with more realistic responses
  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', name: 'Test User' },
          error: null
        })
      })),
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: '1', email: 'test@example.com' } },
          error: null
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: '1', email: 'test@example.com' },
            session: { access_token: 'test-token' }
          },
          error: null
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '1', email: 'test@example.com' } },
          error: null
        })
      }
    }))
  }));

  vi.mock('@instantdb/react', () => ({
    init: vi.fn(() => ({
      useQuery: vi.fn(() => vi.fn()),
      transact: vi.fn().mockResolvedValue({ success: true }),
      auth: {
        signUp: vi.fn().mockResolvedValue({ user: { id: '1' } }),
        signIn: vi.fn().mockResolvedValue({ user: { id: '1' } })
      }
    })),
    tx: new Proxy({}, {
      get: () => new Proxy({}, {
        get: () => ({
          update: vi.fn(),
          delete: vi.fn()
        })
      })
    }),
    id: vi.fn(() => 'test-id')
  }));

  // Mock Clerk client
  vi.mock('@clerk/nextjs/server', () => ({
    clerkClient: {
      users: {
        createUser: vi.fn().mockResolvedValue({
          id: 'test-user-id',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          firstName: 'Test',
          lastName: 'User',
          publicMetadata: {},
          privateMetadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }),
        getUser: vi.fn().mockResolvedValue({
          id: 'test-user-id',
          emailAddresses: [{ emailAddress: 'test@example.com' }]
        }),
        updateUser: vi.fn().mockResolvedValue({
          id: 'test-user-id',
          emailAddresses: [{ emailAddress: 'test@example.com' }]
        })
      },
      sessions: {
        getSession: vi.fn().mockResolvedValue({
          id: 'test-session-id',
          userId: 'test-user-id'
        })
      }
    },
    auth: vi.fn(() => ({
      userId: 'test-user-id',
      sessionId: 'test-session-id'
    }))
  }));

  // Mock axios for Xano integration
  vi.mock('axios', () => ({
    default: {
      create: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ data: { success: true } }),
        post: vi.fn().mockResolvedValue({ data: { id: '1', success: true } }),
        patch: vi.fn().mockResolvedValue({ data: { id: '1', success: true } }),
        delete: vi.fn().mockResolvedValue({ data: { success: true } }),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      }))
    },
    isAxiosError: vi.fn(() => false)
  }));

  // Mock PostgreSQL client
  vi.mock('pg', () => ({
    Pool: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: vi.fn()
      }),
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      end: vi.fn().mockResolvedValue(undefined)
    })),
    Client: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      end: vi.fn().mockResolvedValue(undefined)
    }))
  }));
});

afterAll(async () => {
  // Clean up test database connections
  // Reset any persistent test state
});