import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseFactory } from '@/lib/database/factory';
import { XanoClient } from '@/lib/database/providers/xano';
import { SupabaseClient } from '@/lib/database/providers/supabase';
import { InstantDBClient } from '@/lib/database/providers/instantdb';
import type { DatabaseConfig } from '@/lib/database/types';

// Mock the provider classes
vi.mock('@/lib/database/providers/xano');
vi.mock('@/lib/database/providers/supabase');
vi.mock('@/lib/database/providers/instantdb');

describe('DatabaseFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DatabaseFactory.clearInstances();
  });

  describe('createClient', () => {
    it('should create Xano client with valid config', async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-key'
      };

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(XanoClient).mockImplementation(() => mockClient as any);

      const client = await DatabaseFactory.createClient(config);

      expect(XanoClient).toHaveBeenCalledWith(config);
      expect(mockClient.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should create Supabase client with valid config', async () => {
      const config: DatabaseConfig = {
        provider: 'supabase',
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-anon-key'
      };

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(SupabaseClient).mockImplementation(() => mockClient as any);

      const client = await DatabaseFactory.createClient(config);

      expect(SupabaseClient).toHaveBeenCalledWith(config);
      expect(mockClient.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should create InstantDB client with valid config', async () => {
      const config: DatabaseConfig = {
        provider: 'instantdb',
        apiKey: 'test-app-id'
      };

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(InstantDBClient).mockImplementation(() => mockClient as any);

      const client = await DatabaseFactory.createClient(config);

      expect(InstantDBClient).toHaveBeenCalledWith(config);
      expect(mockClient.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should throw error for unsupported provider', async () => {
      const config = {
        provider: 'unsupported' as any,
        apiUrl: 'test'
      };

      await expect(DatabaseFactory.createClient(config)).rejects.toThrow(
        'Unsupported database provider: unsupported'
      );
    });

    it('should reuse existing client instance', async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-key'
      };

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(XanoClient).mockImplementation(() => mockClient as any);

      const client1 = await DatabaseFactory.createClient(config, 'test-instance');
      const client2 = await DatabaseFactory.createClient(config, 'test-instance');

      expect(client1).toBe(client2);
      expect(XanoClient).toHaveBeenCalledTimes(1);
    });

    it('should create separate instances for different instance IDs', async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-key'
      };

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(XanoClient).mockImplementation(() => mockClient as any);

      const client1 = await DatabaseFactory.createClient(config, 'instance1');
      const client2 = await DatabaseFactory.createClient(config, 'instance2');

      expect(client1).not.toBe(client2);
      expect(XanoClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('createFromEnvironment', () => {
    beforeEach(() => {
      // Clear all env vars
      vi.unstubAllEnvs();
    });

    it('should detect and create Supabase client from environment', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(SupabaseClient).mockImplementation(() => mockClient as any);

      const client = await DatabaseFactory.createFromEnvironment();

      expect(SupabaseClient).toHaveBeenCalledWith({
        provider: 'supabase',
        apiUrl: 'https://test.supabase.co',
        apiKey: 'test-key',
        options: expect.any(Object)
      });
      expect(client).toBe(mockClient);
    });

    it('should detect and create InstantDB client from environment', async () => {
      vi.stubEnv('INSTANTDB_APP_ID', 'test-app-id');

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(InstantDBClient).mockImplementation(() => mockClient as any);

      const client = await DatabaseFactory.createFromEnvironment();

      expect(InstantDBClient).toHaveBeenCalledWith({
        provider: 'instantdb',
        apiKey: 'test-app-id',
        apiUrl: 'https://api.instantdb.com',
        options: expect.any(Object)
      });
      expect(client).toBe(mockClient);
    });

    it('should fall back to Xano when no specific provider is detected', async () => {
      // No provider-specific env vars set, should fall back to xano
      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(XanoClient).mockImplementation(() => mockClient as any);

      const client = await DatabaseFactory.createFromEnvironment();

      expect(XanoClient).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should handle connection failures gracefully', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

      const mockClient = {
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        isConnected: vi.fn(() => false)
      };
      vi.mocked(SupabaseClient).mockImplementation(() => mockClient as any);

      await expect(DatabaseFactory.createFromEnvironment()).rejects.toThrow(
        'Connection failed'
      );
    });
  });

  describe('getInstance', () => {
    it('should return existing instance', async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-key'
      };

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(XanoClient).mockImplementation(() => mockClient as any);

      await DatabaseFactory.createClient(config, 'test-instance');
      const instance = DatabaseFactory.getInstance('test-instance');

      expect(instance).toBe(mockClient);
    });

    it('should return null for non-existent instance', () => {
      const instance = DatabaseFactory.getInstance('non-existent');
      expect(instance).toBeNull();
    });
  });

  describe('clearInstances', () => {
    it('should clear all instances', async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-key'
      };

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(XanoClient).mockImplementation(() => mockClient as any);

      await DatabaseFactory.createClient(config, 'test-instance');
      expect(DatabaseFactory.getInstance('test-instance')).not.toBeNull();

      DatabaseFactory.clearInstances();
      expect(DatabaseFactory.getInstance('test-instance')).toBeNull();
    });
  });

  describe('getActiveInstances', () => {
    it('should return list of active instance IDs', async () => {
      const config: DatabaseConfig = {
        provider: 'xano',
        apiUrl: 'https://test.xano.io/api/test',
        apiKey: 'test-key'
      };

      const mockClient = { connect: vi.fn(), isConnected: vi.fn(() => true) };
      vi.mocked(XanoClient).mockImplementation(() => mockClient as any);

      await DatabaseFactory.createClient(config, 'instance1');
      await DatabaseFactory.createClient(config, 'instance2');

      const activeInstances = DatabaseFactory.getActiveInstances();
      expect(activeInstances).toContain('instance1');
      expect(activeInstances).toContain('instance2');
      expect(activeInstances).toHaveLength(2);
    });

    it('should return empty array when no instances exist', () => {
      const activeInstances = DatabaseFactory.getActiveInstances();
      expect(activeInstances).toEqual([]);
    });
  });
});