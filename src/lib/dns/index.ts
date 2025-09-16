/**
 * DNS Management Service
 * Integrates with domain verification and provides automated DNS management
 */

import { createDNSProvider, DNSProvider } from './cloudflare';
import { Domain, DomainVerification } from '@/lib/database/types';
import { createDatabaseClient } from '@/lib/database/factory';

export interface DNSManagementResult {
  success: boolean;
  recordsCreated?: string[];
  errors?: string[];
}

export class DNSManagementService {
  private dnsProvider: DNSProvider | null;

  constructor() {
    this.dnsProvider = createDNSProvider();
  }

  /**
   * Check if DNS management is available
   */
  isAvailable(): boolean {
    return this.dnsProvider !== null;
  }

  /**
   * Automatically setup DNS for a custom domain
   */
  async setupCustomDomain(domainId: string): Promise<DNSManagementResult> {
    if (!this.dnsProvider) {
      return {
        success: false,
        errors: ['DNS management not configured']
      };
    }

    try {
      const db = await createDatabaseClient();
      const domainResult = await db.getDomain(domainId);

      if (!domainResult.data) {
        return {
          success: false,
          errors: ['Domain not found']
        };
      }

      const domain = domainResult.data;

      if (domain.type !== 'custom') {
        return {
          success: false,
          errors: ['DNS management only available for custom domains']
        };
      }

      if (!domain.verification_token) {
        return {
          success: false,
          errors: ['Domain verification token not found']
        };
      }

      // Setup DNS records
      const result = await this.dnsProvider.setupCustomDomain(
        domain.domain,
        domain.verification_token
      );

      // Update domain with DNS record IDs for future reference
      await db.updateDomain(domainId, {
        status: 'pending',
        updated_at: new Date().toISOString(),
        settings: {
          ...domain.settings,
          dns_records: {
            verification_record_id: result.verificationRecord.id,
            routing_record_id: result.routingRecord.id
          }
        }
      });

      return {
        success: true,
        recordsCreated: [
          result.verificationRecord.id,
          result.routingRecord.id
        ].filter(Boolean)
      };

    } catch (error) {
      console.error('Failed to setup custom domain DNS:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Remove DNS records for a domain
   */
  async removeCustomDomain(domainId: string): Promise<DNSManagementResult> {
    if (!this.dnsProvider) {
      return {
        success: false,
        errors: ['DNS management not configured']
      };
    }

    try {
      const db = await createDatabaseClient();
      const domainResult = await db.getDomain(domainId);

      if (!domainResult.data) {
        return {
          success: false,
          errors: ['Domain not found']
        };
      }

      const domain = domainResult.data;

      await this.dnsProvider.removeCustomDomain(domain.domain);

      // Clear DNS record IDs from domain settings
      await db.updateDomain(domainId, {
        status: 'expired',
        updated_at: new Date().toISOString(),
        settings: {
          ...domain.settings,
          dns_records: undefined
        }
      });

      return { success: true };

    } catch (error) {
      console.error('Failed to remove custom domain DNS:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Verify DNS configuration and update domain status
   */
  async verifyDNSConfiguration(domainId: string): Promise<DNSManagementResult> {
    if (!this.dnsProvider) {
      return {
        success: false,
        errors: ['DNS management not configured']
      };
    }

    try {
      const db = await createDatabaseClient();
      const domainResult = await db.getDomain(domainId);

      if (!domainResult.data) {
        return {
          success: false,
          errors: ['Domain not found']
        };
      }

      const domain = domainResult.data;

      if (!domain.verification_token) {
        return {
          success: false,
          errors: ['Domain verification token not found']
        };
      }

      // Verify DNS configuration
      const verification = await this.dnsProvider.verifyDNSConfiguration(
        domain.domain,
        domain.verification_token
      );

      // Update domain status based on verification results
      let newStatus = domain.status;
      let sslStatus = domain.ssl_status;

      if (verification.verificationValid && verification.routingValid) {
        newStatus = 'verified';
        if (verification.sslEnabled) {
          sslStatus = 'active';
        }
      } else {
        newStatus = 'failed';
      }

      await db.updateDomain(domainId, {
        status: newStatus,
        ssl_status: sslStatus,
        ssl_enabled: verification.sslEnabled,
        verified_at: newStatus === 'verified' ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      });

      return {
        success: verification.verificationValid && verification.routingValid,
        errors: !verification.verificationValid ? ['Domain verification failed'] :
                !verification.routingValid ? ['DNS routing configuration invalid'] : undefined
      };

    } catch (error) {
      console.error('Failed to verify DNS configuration:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get SSL certificate status
   */
  async getSSLStatus(domainId: string): Promise<{
    success: boolean;
    status?: 'active' | 'pending' | 'failed';
    certificateAuthority?: string;
    expiresOn?: string;
    errors?: string[];
  }> {
    if (!this.dnsProvider || !('getSSLStatus' in this.dnsProvider)) {
      return {
        success: false,
        errors: ['SSL status checking not available with current DNS provider']
      };
    }

    try {
      const db = await createDatabaseClient();
      const domainResult = await db.getDomain(domainId);

      if (!domainResult.data) {
        return {
          success: false,
          errors: ['Domain not found']
        };
      }

      const domain = domainResult.data;
      const sslStatus = await (this.dnsProvider as any).getSSLStatus(domain.domain);

      // Update domain SSL status
      await db.updateDomain(domainId, {
        ssl_status: sslStatus.status,
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        ...sslStatus
      };

    } catch (error) {
      console.error('Failed to get SSL status:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Automated domain setup workflow
   */
  async automatedDomainSetup(domainId: string): Promise<DNSManagementResult> {
    if (!this.dnsProvider) {
      return {
        success: false,
        errors: ['DNS management not configured']
      };
    }

    try {
      // Step 1: Setup DNS records
      const setupResult = await this.setupCustomDomain(domainId);
      if (!setupResult.success) {
        return setupResult;
      }

      // Step 2: Wait for DNS propagation (in production, this would be done via webhooks)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Step 3: Verify configuration
      const verificationResult = await this.verifyDNSConfiguration(domainId);
      if (!verificationResult.success) {
        return verificationResult;
      }

      // Step 4: Check SSL status
      await this.getSSLStatus(domainId);

      return {
        success: true,
        recordsCreated: setupResult.recordsCreated
      };

    } catch (error) {
      console.error('Automated domain setup failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

// Singleton instance
let dnsService: DNSManagementService;

export function getDNSService(): DNSManagementService {
  if (!dnsService) {
    dnsService = new DNSManagementService();
  }
  return dnsService;
}

export { DNSProvider } from './cloudflare';