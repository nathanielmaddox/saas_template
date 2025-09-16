/**
 * Cloudflare DNS management integration
 * Provides automated DNS record management for domain verification and routing
 */

interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
  email?: string;
}

interface DNSRecord {
  id?: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX';
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
}

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
}

export class CloudflareDNSManager {
  private config: CloudflareConfig;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(config: CloudflareConfig) {
    this.config = config;
  }

  /**
   * Create a DNS record
   */
  async createRecord(record: DNSRecord): Promise<DNSRecord> {
    const response = await this.makeRequest(`/zones/${this.config.zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl || 1, // 1 = automatic
        priority: record.priority,
        proxied: record.proxied || false
      })
    });

    if (!response.success) {
      throw new Error(`Failed to create DNS record: ${response.errors.map(e => e.message).join(', ')}`);
    }

    return {
      id: response.result.id,
      type: response.result.type,
      name: response.result.name,
      content: response.result.content,
      ttl: response.result.ttl,
      priority: response.result.priority,
      proxied: response.result.proxied
    };
  }

  /**
   * Update a DNS record
   */
  async updateRecord(recordId: string, record: Partial<DNSRecord>): Promise<DNSRecord> {
    const response = await this.makeRequest(`/zones/${this.config.zoneId}/dns_records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl || 1,
        priority: record.priority,
        proxied: record.proxied || false
      })
    });

    if (!response.success) {
      throw new Error(`Failed to update DNS record: ${response.errors.map(e => e.message).join(', ')}`);
    }

    return response.result;
  }

  /**
   * Delete a DNS record
   */
  async deleteRecord(recordId: string): Promise<boolean> {
    const response = await this.makeRequest(`/zones/${this.config.zoneId}/dns_records/${recordId}`, {
      method: 'DELETE'
    });

    if (!response.success) {
      throw new Error(`Failed to delete DNS record: ${response.errors.map(e => e.message).join(', ')}`);
    }

    return true;
  }

  /**
   * List DNS records with optional filtering
   */
  async listRecords(filters?: {
    type?: string;
    name?: string;
    content?: string;
  }): Promise<DNSRecord[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.name) params.append('name', filters.name);
    if (filters?.content) params.append('content', filters.content);

    const url = `/zones/${this.config.zoneId}/dns_records${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.makeRequest(url);

    if (!response.success) {
      throw new Error(`Failed to list DNS records: ${response.errors.map(e => e.message).join(', ')}`);
    }

    return response.result.map((record: any) => ({
      id: record.id,
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl,
      priority: record.priority,
      proxied: record.proxied
    }));
  }

  /**
   * Create verification TXT record for domain ownership
   */
  async createVerificationRecord(domain: string, token: string): Promise<DNSRecord> {
    return this.createRecord({
      type: 'TXT',
      name: `_saas-verify.${domain}`,
      content: token,
      ttl: 300 // 5 minutes for faster verification
    });
  }

  /**
   * Create CNAME record to point domain to SaaS platform
   */
  async createCNAMERecord(domain: string, target: string): Promise<DNSRecord> {
    return this.createRecord({
      type: 'CNAME',
      name: domain,
      content: target,
      ttl: 300,
      proxied: true // Enable Cloudflare proxy for SSL and security
    });
  }

  /**
   * Create A record to point domain to IP address
   */
  async createARecord(domain: string, ipAddress: string): Promise<DNSRecord> {
    return this.createRecord({
      type: 'A',
      name: domain,
      content: ipAddress,
      ttl: 300,
      proxied: true
    });
  }

  /**
   * Setup complete DNS configuration for a custom domain
   */
  async setupCustomDomain(domain: string, verificationToken: string): Promise<{
    verificationRecord: DNSRecord;
    routingRecord: DNSRecord;
  }> {
    try {
      // Create verification record
      const verificationRecord = await this.createVerificationRecord(domain, verificationToken);

      // Create routing record (CNAME or A record)
      const target = process.env.NEXT_PUBLIC_CNAME_TARGET;
      const ipAddress = process.env.NEXT_PUBLIC_A_RECORD;

      let routingRecord: DNSRecord;
      if (target) {
        routingRecord = await this.createCNAMERecord(domain, target);
      } else if (ipAddress) {
        routingRecord = await this.createARecord(domain, ipAddress);
      } else {
        throw new Error('No routing target configured (CNAME_TARGET or A_RECORD)');
      }

      return {
        verificationRecord,
        routingRecord
      };

    } catch (error) {
      console.error('Failed to setup custom domain DNS:', error);
      throw error;
    }
  }

  /**
   * Remove DNS records for a domain
   */
  async removeCustomDomain(domain: string): Promise<void> {
    try {
      // Find and remove verification records
      const verificationRecords = await this.listRecords({
        type: 'TXT',
        name: `_saas-verify.${domain}`
      });

      for (const record of verificationRecords) {
        if (record.id) {
          await this.deleteRecord(record.id);
        }
      }

      // Find and remove routing records
      const routingRecords = await this.listRecords({
        name: domain
      });

      for (const record of routingRecords) {
        if (record.id && (record.type === 'CNAME' || record.type === 'A')) {
          await this.deleteRecord(record.id);
        }
      }

    } catch (error) {
      console.error('Failed to remove custom domain DNS:', error);
      throw error;
    }
  }

  /**
   * Verify if DNS records are correctly configured
   */
  async verifyDNSConfiguration(domain: string, expectedToken: string): Promise<{
    verificationValid: boolean;
    routingValid: boolean;
    sslEnabled: boolean;
  }> {
    try {
      // Check verification record
      const verificationRecords = await this.listRecords({
        type: 'TXT',
        name: `_saas-verify.${domain}`
      });

      const verificationValid = verificationRecords.some(
        record => record.content === expectedToken
      );

      // Check routing record
      const routingRecords = await this.listRecords({
        name: domain
      });

      const expectedTarget = process.env.NEXT_PUBLIC_CNAME_TARGET;
      const expectedIP = process.env.NEXT_PUBLIC_A_RECORD;

      const routingValid = routingRecords.some(record => {
        if (record.type === 'CNAME' && expectedTarget) {
          return record.content === expectedTarget;
        }
        if (record.type === 'A' && expectedIP) {
          return record.content === expectedIP;
        }
        return false;
      });

      // Check SSL status (requires domain to be proxied through Cloudflare)
      const sslEnabled = routingRecords.some(record => record.proxied === true);

      return {
        verificationValid,
        routingValid,
        sslEnabled
      };

    } catch (error) {
      console.error('Failed to verify DNS configuration:', error);
      return {
        verificationValid: false,
        routingValid: false,
        sslEnabled: false
      };
    }
  }

  /**
   * Get SSL certificate status for a domain
   */
  async getSSLStatus(domain: string): Promise<{
    status: 'active' | 'pending' | 'failed';
    certificateAuthority?: string;
    expiresOn?: string;
  }> {
    try {
      const response = await this.makeRequest(`/zones/${this.config.zoneId}/ssl/certificate_packs`);

      if (!response.success) {
        return { status: 'failed' };
      }

      const cert = response.result.find((cert: any) =>
        cert.hosts.includes(domain)
      );

      if (!cert) {
        return { status: 'pending' };
      }

      return {
        status: cert.status === 'active' ? 'active' : 'pending',
        certificateAuthority: cert.certificate_authority,
        expiresOn: cert.expires_on
      };

    } catch (error) {
      console.error('Failed to get SSL status:', error);
      return { status: 'failed' };
    }
  }

  /**
   * Make authenticated request to Cloudflare API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Create Cloudflare DNS manager instance
 */
export function createCloudflareManager(): CloudflareDNSManager | null {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !zoneId) {
    console.warn('Cloudflare DNS management not configured (missing API_TOKEN or ZONE_ID)');
    return null;
  }

  return new CloudflareDNSManager({
    apiToken,
    zoneId,
    email: process.env.CLOUDFLARE_EMAIL
  });
}

/**
 * DNS provider factory
 */
export interface DNSProvider {
  createVerificationRecord(domain: string, token: string): Promise<DNSRecord>;
  createCNAMERecord(domain: string, target: string): Promise<DNSRecord>;
  setupCustomDomain(domain: string, token: string): Promise<any>;
  removeCustomDomain(domain: string): Promise<void>;
  verifyDNSConfiguration(domain: string, token: string): Promise<any>;
}

export function createDNSProvider(): DNSProvider | null {
  const provider = process.env.DNS_PROVIDER || 'cloudflare';

  switch (provider) {
    case 'cloudflare':
      return createCloudflareManager();
    default:
      console.warn(`DNS provider '${provider}' not supported`);
      return null;
  }
}