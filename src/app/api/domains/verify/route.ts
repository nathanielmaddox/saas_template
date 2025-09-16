import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDatabaseClient } from '@/lib/database/factory';
import {
  verifyDomainOwnership,
  checkDomainPointing,
  checkSSLCertificate
} from '@/lib/domain';

// Validation schema
const verifyDomainSchema = z.object({
  domain_id: z.string().min(1, 'Domain ID is required')
});

/**
 * POST /api/domains/verify - Verify domain ownership and configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain_id } = verifyDomainSchema.parse(body);

    const db = await createDatabaseClient();

    // Get domain record
    const domainResult = await db.getDomain(domain_id);
    if (!domainResult.data) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    const domain = domainResult.data;
    const verificationResults = {
      ownership_verified: false,
      dns_configured: false,
      ssl_verified: false,
      errors: [] as string[]
    };

    // Step 1: Verify domain ownership
    if (domain.verification_token) {
      try {
        verificationResults.ownership_verified = await verifyDomainOwnership(
          domain.domain,
          domain.verification_token
        );
      } catch (error) {
        verificationResults.errors.push(`Ownership verification failed: ${error}`);
      }
    }

    // Step 2: Check DNS configuration
    if (verificationResults.ownership_verified) {
      try {
        verificationResults.dns_configured = await checkDomainPointing(domain.domain);
      } catch (error) {
        verificationResults.errors.push(`DNS configuration check failed: ${error}`);
      }
    }

    // Step 3: Check SSL certificate (only for custom domains in production)
    if (domain.type === 'custom' && process.env.NODE_ENV === 'production') {
      try {
        verificationResults.ssl_verified = await checkSSLCertificate(domain.domain);
      } catch (error) {
        verificationResults.errors.push(`SSL verification failed: ${error}`);
      }
    } else {
      // Assume SSL is handled for subdomains
      verificationResults.ssl_verified = true;
    }

    // Update domain status based on verification results
    let newStatus = domain.status;
    let sslStatus = domain.ssl_status;

    if (verificationResults.ownership_verified && verificationResults.dns_configured) {
      newStatus = 'verified';
      if (verificationResults.ssl_verified) {
        sslStatus = 'active';
      }
    } else if (verificationResults.errors.length > 0) {
      newStatus = 'failed';
    }

    // Update domain record
    await db.updateDomain(domain_id, {
      status: newStatus,
      ssl_status: sslStatus,
      verified_at: newStatus === 'verified' ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({
      data: {
        domain_id,
        status: newStatus,
        ssl_status: sslStatus,
        verification_results: verificationResults
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error verifying domain:', error);
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/domains/verify - Get verification instructions for a domain
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domain_id');

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    const db = await createDatabaseClient();

    // Get domain record
    const domainResult = await db.getDomain(domainId);
    if (!domainResult.data) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    const domain = domainResult.data;

    // Get verification records
    const verificationRecords = await db.verifyDomain(domainId);

    // Build instructions based on verification method
    const instructions = {
      domain: domain.domain,
      type: domain.type,
      verification_method: domain.verification_method,
      records: verificationRecords.data,
      instructions: generateVerificationInstructions(domain)
    };

    return NextResponse.json({ data: instructions });

  } catch (error) {
    console.error('Error getting verification instructions:', error);
    return NextResponse.json(
      { error: 'Failed to get verification instructions' },
      { status: 500 }
    );
  }
}

/**
 * Generate human-readable verification instructions
 */
function generateVerificationInstructions(domain: any) {
  const instructions = [];

  if (domain.type === 'subdomain') {
    instructions.push({
      step: 1,
      title: 'Subdomain Configuration',
      description: `Your subdomain ${domain.domain} will be automatically configured once verified.`,
      action: 'No action required for subdomains.'
    });
  } else {
    instructions.push({
      step: 1,
      title: 'Add DNS Records',
      description: 'Add the following DNS records to your domain:',
      action: 'Log in to your domain registrar and add the TXT record for verification.'
    });

    instructions.push({
      step: 2,
      title: 'Point Domain to Our Servers',
      description: 'Configure your domain to point to our servers:',
      action: 'Add the CNAME or A record to route traffic to our servers.'
    });

    instructions.push({
      step: 3,
      title: 'SSL Certificate',
      description: 'SSL certificate will be automatically generated once DNS is configured.',
      action: 'Wait for automatic SSL provisioning (usually takes 5-10 minutes).'
    });
  }

  return instructions;
}