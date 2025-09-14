import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseFactory } from '@/lib/database/factory';
import { XanoClient } from '@/lib/database/providers/xano';
import { SupabaseClient } from '@/lib/database/providers/supabase';
import { InstantDBClient } from '@/lib/database/providers/instantdb';
import type { DatabaseClient, DatabaseConfig, User, Subscription } from '@/lib/database/types';

describe('Database Providers Integration', () => {
  let client: DatabaseClient;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
    DatabaseFactory.clearInstances();
  });

  describe('Xano Integration', () => {
    beforeEach(async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-api-key'
      };

      client = await DatabaseFactory.createClient(config);
    });

    it('should connect to Xano successfully', async () => {
      expect(client).toBeInstanceOf(XanoClient);
      expect(client.isConnected()).toBe(true);
    });

    it('should perform CRUD operations', async () => {
      // Test create
      const createResponse = await client.create('users', {
        email: 'test@example.com',
        name: 'Test User'
      });

      expect(createResponse.data).toBeDefined();
      expect(createResponse.data.id).toBeDefined();

      // Test read
      const readResponse = await client.findById('users', createResponse.data.id);
      expect(readResponse.data).toBeDefined();
      expect(readResponse.data.email).toBe('test@example.com');

      // Test update
      const updateResponse = await client.update('users', createResponse.data.id, {
        name: 'Updated User'
      });
      expect(updateResponse.data.name).toBe('Updated User');

      // Test delete
      const deleteResponse = await client.delete('users', createResponse.data.id);
      expect(deleteResponse.data.success).toBe(true);
    });

    it('should handle authentication operations', async () => {
      const signUpResponse = await client.signUp('newuser@example.com', 'password123');
      expect(signUpResponse.data).toBeDefined();
      expect(signUpResponse.data.email).toBe('newuser@example.com');

      const signInResponse = await client.signIn('newuser@example.com', 'password123');
      expect(signInResponse.data.user).toBeDefined();
      expect(signInResponse.data.token).toBeDefined();
    });

    it('should handle batch operations', async () => {
      const batchData = [
        { email: 'user1@example.com', name: 'User 1' },
        { email: 'user2@example.com', name: 'User 2' },
        { email: 'user3@example.com', name: 'User 3' }
      ];

      const createManyResponse = await client.createMany('users', batchData);
      expect(createManyResponse.data).toHaveLength(3);

      const updateManyResponse = await client.updateMany('users',
        { name: 'User 1' },
        { status: 'updated' }
      );
      expect(updateManyResponse.data.count).toBeGreaterThan(0);
    });

    it('should handle subscription operations', async () => {
      const userId = 'test-user-id';

      const updateSubscriptionResponse = await client.updateSubscription(userId, {
        plan: 'premium',
        status: 'active'
      });
      expect(updateSubscriptionResponse.data).toBeDefined();

      const getSubscriptionResponse = await client.getSubscription(userId);
      expect(getSubscriptionResponse.data.plan).toBe('premium');

      const cancelResponse = await client.cancelSubscription(userId);
      expect(cancelResponse.data.status).toBe('cancelled');
    });
  });

  describe('Supabase Integration', () => {
    beforeEach(async () => {
      const config: DatabaseConfig = {
        provider: 'supabase',
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-anon-key'
      };

      client = await DatabaseFactory.createClient(config);
    });

    it('should connect to Supabase successfully', async () => {
      expect(client).toBeInstanceOf(SupabaseClient);
      expect(client.isConnected()).toBe(true);
    });

    it('should handle query options correctly', async () => {
      const queryOptions = {
        filter: { status: 'active' },
        sort: { created_at: 'desc' as const },
        limit: 10,
        offset: 0,
        select: ['id', 'name', 'email']
      };

      const response = await client.findMany('users', queryOptions);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      if (response.pagination) {
        expect(response.pagination.limit).toBe(10);
        expect(response.pagination.page).toBe(1);
      }
    });

    it('should handle authentication with Supabase Auth', async () => {
      const signUpResponse = await client.signUp('supabase@example.com', 'password123', {
        name: 'Supabase User'
      });

      expect(signUpResponse.data).toBeDefined();
      expect(signUpResponse.data.email).toBe('supabase@example.com');
    });

    it('should support real-time subscriptions', async () => {
      const mockCallback = vi.fn();

      const unsubscribe = await client.subscribe('users',
        { status: 'active' },
        mockCallback
      );

      expect(typeof unsubscribe).toBe('function');

      // Clean up subscription
      unsubscribe();
    });
  });

  describe('InstantDB Integration', () => {
    beforeEach(async () => {
      const config: DatabaseConfig = {
        provider: 'instantdb',
        apiKey: 'test-app-id',
        apiUrl: 'https://api.instantdb.com'
      };

      client = await DatabaseFactory.createClient(config);
    });

    it('should connect to InstantDB successfully', async () => {
      expect(client).toBeInstanceOf(InstantDBClient);
      expect(client.isConnected()).toBe(true);
    });

    it('should handle transaction-based operations', async () => {
      const createResponse = await client.create('users', {
        email: 'instant@example.com',
        name: 'Instant User'
      });

      expect(createResponse.data).toBeDefined();
      expect(createResponse.data.id).toBeDefined();

      // InstantDB uses transactions for all operations
      const updateResponse = await client.update('users', createResponse.data.id, {
        name: 'Updated Instant User'
      });

      expect(updateResponse.data).toBeDefined();
    });

    it('should handle real-time subscriptions', async () => {
      const mockCallback = vi.fn();

      const unsubscribe = await client.subscribe('users',
        { status: 'active' },
        mockCallback
      );

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should handle offline-first operations', async () => {
      // InstantDB is designed for offline-first
      const batchOperations = [
        { email: 'offline1@example.com', name: 'Offline User 1' },
        { email: 'offline2@example.com', name: 'Offline User 2' }
      ];

      const response = await client.createMany('users', batchOperations);
      expect(response.data).toHaveLength(2);
    });
  });

  describe('Cross-Provider Compatibility', () => {
    it('should maintain consistent API across providers', async () => {
      const providers = [
        { provider: 'xano', apiUrl: 'https://test.xano.io/api/test', apiKey: 'test-key' },
        { provider: 'supabase', apiUrl: 'https://test.supabase.co', apiKey: 'test-key' },
        { provider: 'instantdb', apiKey: 'test-app-id' }
      ] as const;

      for (const config of providers) {
        const client = await DatabaseFactory.createClient(config);

        // Test that all clients implement the same interface
        expect(typeof client.connect).toBe('function');
        expect(typeof client.disconnect).toBe('function');
        expect(typeof client.isConnected).toBe('function');
        expect(typeof client.findMany).toBe('function');
        expect(typeof client.findById).toBe('function');
        expect(typeof client.findOne).toBe('function');
        expect(typeof client.create).toBe('function');
        expect(typeof client.update).toBe('function');
        expect(typeof client.delete).toBe('function');
        expect(typeof client.signUp).toBe('function');
        expect(typeof client.signIn).toBe('function');

        await client.disconnect();
      }
    });

    it('should handle provider switching seamlessly', async () => {
      // Start with Xano
      let config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-key'
      };

      let client1 = await DatabaseFactory.createClient(config, 'switch-test');
      expect(client1).toBeInstanceOf(XanoClient);

      // Switch to Supabase with same instance ID (should create new instance)
      config = {
        provider: 'supabase',
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key'
      };

      let client2 = await DatabaseFactory.createClient(config, 'switch-test-2');
      expect(client2).toBeInstanceOf(SupabaseClient);
      expect(client2).not.toBe(client1);

      await client1.disconnect();
      await client2.disconnect();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle connection failures gracefully', async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://invalid-url.example.com',
        apiKey: 'invalid-key'
      };

      await expect(DatabaseFactory.createClient(config)).rejects.toThrow();
    });

    it('should handle API errors consistently across providers', async () => {
      // Mock network error for all providers
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const configs = [
        { provider: 'xano', apiUrl: 'https://test.xano.io/api/test', apiKey: 'test' },
        { provider: 'supabase', apiUrl: 'https://test.supabase.co', apiKey: 'test' }
      ] as const;

      for (const config of configs) {
        try {
          const client = await DatabaseFactory.createClient(config);
          await client.findMany('users');
        } catch (error) {
          expect(error).toBeDefined();
          // Should be a properly formatted database error
          expect(error).toHaveProperty('code');
          expect(error).toHaveProperty('message');
        }
      }

      // Restore fetch
      global.fetch = originalFetch;
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent operations', async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-key'
      };

      const client = await DatabaseFactory.createClient(config);

      // Create multiple concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        client.create('users', {
          email: `concurrent${i}@example.com`,
          name: `Concurrent User ${i}`
        })
      );

      const results = await Promise.allSettled(operations);

      // Most should succeed (depending on rate limits)
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      await client.disconnect();
    });

    it('should implement connection pooling for multiple instances', async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-key'
      };

      // Create multiple instances
      const client1 = await DatabaseFactory.createClient(config, 'pool-1');
      const client2 = await DatabaseFactory.createClient(config, 'pool-2');
      const client3 = await DatabaseFactory.createClient(config, 'pool-3');

      expect(client1).not.toBe(client2);
      expect(client2).not.toBe(client3);

      const activeInstances = DatabaseFactory.getActiveInstances();
      expect(activeInstances).toContain('pool-1');
      expect(activeInstances).toContain('pool-2');
      expect(activeInstances).toContain('pool-3');

      await client1.disconnect();
      await client2.disconnect();
      await client3.disconnect();
    });
  });
});