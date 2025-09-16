/**
 * Domain management utilities for multi-tenant SaaS
 * Handles subdomain and custom domain routing, verification, and management
 */

import crypto from 'crypto';
import dns from 'dns/promises';
import { Domain, DomainVerification, Tenant } from './database/types';

export interface DomainInfo {
  domain: string;
  subdomain?: string;
  rootDomain: string;
  isSubdomain: boolean;
  isCustomDomain: boolean;
  tenant?: Tenant;
}

/**
 * Parse domain information from request
 */
export function parseDomain(host: string): DomainInfo {
  const domain = host.toLowerCase().replace(/:\d+$/, ''); // Remove port if present
  const parts = domain.split('.');

  // Define your root domain(s)
  const rootDomains = [
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost',
    process.env.NEXT_PUBLIC_PROD_DOMAIN || 'yoursaas.com'
  ];

  // Check if it's a subdomain of your root domain
  const isSubdomain = rootDomains.some(rootDomain => {
    return domain.endsWith(`.${rootDomain}`) && domain !== rootDomain;
  });

  let subdomain: string | undefined;
  let rootDomain: string;

  if (isSubdomain) {
    // Extract subdomain
    const matchingRoot = rootDomains.find(root => domain.endsWith(`.${root}`));
    rootDomain = matchingRoot!;
    subdomain = domain.replace(`.${rootDomain}`, '');
  } else {
    // It's either the root domain or a custom domain
    rootDomain = rootDomains.find(root => domain === root) || domain;
  }

  return {
    domain,
    subdomain,
    rootDomain,
    isSubdomain: !!subdomain,
    isCustomDomain: !isSubdomain && !rootDomains.includes(domain)
  };
}

/**
 * Generate domain verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate domain verification records
 */
export function generateDomainVerification(domain: string, token: string): DomainVerification[] {
  return [
    {
      domain,
      type: 'TXT',
      name: `_saas-verify.${domain}`,
      value: token
    },
    {
      domain,
      type: 'CNAME',
      name: domain,
      value: process.env.NEXT_PUBLIC_CNAME_TARGET || 'cname.yoursaas.com'
    },
    {
      domain,
      type: 'A',
      name: domain,
      value: process.env.NEXT_PUBLIC_A_RECORD || '192.168.1.1'
    }
  ];
}

/**
 * Verify domain ownership via DNS
 */
export async function verifyDomainOwnership(domain: string, token: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(`_saas-verify.${domain}`);
    return records.some(record => record.some(value => value === token));
  } catch (error) {
    console.error(`Failed to verify domain ${domain}:`, error);
    return false;
  }
}

/**
 * Check if domain points to our service
 */
export async function checkDomainPointing(domain: string): Promise<boolean> {
  try {
    // Check CNAME record
    try {
      const cnameRecords = await dns.resolveCname(domain);
      const expectedCname = process.env.NEXT_PUBLIC_CNAME_TARGET;
      if (expectedCname && cnameRecords.includes(expectedCname)) {
        return true;
      }
    } catch {
      // CNAME might not exist, check A record
    }

    // Check A record
    const aRecords = await dns.resolve4(domain);
    const expectedARecord = process.env.NEXT_PUBLIC_A_RECORD;
    if (expectedARecord && aRecords.includes(expectedARecord)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Failed to check domain pointing for ${domain}:`, error);
    return false;
  }
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Validate subdomain format
 */
export function isValidSubdomain(subdomain: string): boolean {
  const subdomainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  const reservedSubdomains = [
    'www', 'api', 'app', 'admin', 'dashboard', 'mail', 'email',
    'support', 'help', 'docs', 'blog', 'dev', 'staging', 'test',
    'demo', 'cdn', 'assets', 'static', 'media', 'ftp', 'secure'
  ];

  return subdomainRegex.test(subdomain) &&
         subdomain.length >= 3 &&
         subdomain.length <= 63 &&
         !reservedSubdomains.includes(subdomain.toLowerCase());
}

/**
 * Generate unique subdomain suggestion
 */
export function generateSubdomainSuggestion(baseName: string): string {
  const cleanName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);

  const suffix = crypto.randomBytes(2).toString('hex');
  return `${cleanName}${suffix}`;
}

/**
 * Extract tenant identifier from request
 */
export function extractTenantIdentifier(domainInfo: DomainInfo): string | null {
  if (domainInfo.isSubdomain && domainInfo.subdomain) {
    return domainInfo.subdomain;
  }

  if (domainInfo.isCustomDomain) {
    return domainInfo.domain;
  }

  return null;
}

/**
 * Build tenant URL
 */
export function buildTenantUrl(tenant: Tenant, path: string = ''): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const url = `${protocol}://${tenant.slug}.${rootDomain}${path}`;
  return url;
}

/**
 * Build custom domain URL
 */
export function buildCustomDomainUrl(domain: string, path: string = ''): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${domain}${path}`;
}

/**
 * Check if SSL certificate is valid for domain
 */
export async function checkSSLCertificate(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.error(`SSL check failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Domain configuration for different environments
 */
export const domainConfig = {
  development: {
    rootDomain: 'localhost:3000',
    protocol: 'http',
    allowedOrigins: ['http://localhost:3000']
  },
  production: {
    rootDomain: process.env.NEXT_PUBLIC_PROD_DOMAIN || 'yoursaas.com',
    protocol: 'https',
    allowedOrigins: [
      `https://${process.env.NEXT_PUBLIC_PROD_DOMAIN}`,
      `https://*.${process.env.NEXT_PUBLIC_PROD_DOMAIN}`
    ]
  }
};

/**
 * Get current domain configuration
 */
export function getCurrentDomainConfig() {
  const env = process.env.NODE_ENV as 'development' | 'production';
  return domainConfig[env] || domainConfig.development;
}