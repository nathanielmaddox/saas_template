import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDNSService } from '@/lib/dns';

// Validation schemas
const setupDNSSchema = z.object({
  domain_id: z.string().min(1, 'Domain ID is required'),
  action: z.enum(['setup', 'remove', 'verify', 'ssl-status'])
});

/**
 * POST /api/domains/dns - Manage DNS for custom domains
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain_id, action } = setupDNSSchema.parse(body);

    const dnsService = getDNSService();

    if (!dnsService.isAvailable()) {
      return NextResponse.json(
        {
          error: 'DNS management not available',
          message: 'DNS provider not configured. Please set up Cloudflare API credentials.'
        },
        { status: 503 }
      );
    }

    let result;

    switch (action) {
      case 'setup':
        result = await dnsService.setupCustomDomain(domain_id);
        break;

      case 'remove':
        result = await dnsService.removeCustomDomain(domain_id);
        break;

      case 'verify':
        result = await dnsService.verifyDNSConfiguration(domain_id);
        break;

      case 'ssl-status':
        result = await dnsService.getSSLStatus(domain_id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: `DNS ${action} failed`,
          details: result.errors || ['Unknown error']
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        action,
        domain_id,
        success: true,
        ...result
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in DNS management API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/domains/dns - Get DNS management status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domain_id');

    if (!domainId) {
      // Return DNS service availability
      const dnsService = getDNSService();
      return NextResponse.json({
        data: {
          available: dnsService.isAvailable(),
          provider: process.env.DNS_PROVIDER || 'cloudflare',
          features: {
            automated_setup: dnsService.isAvailable(),
            ssl_management: dnsService.isAvailable(),
            verification: dnsService.isAvailable()
          }
        }
      });
    }

    // Get specific domain DNS status
    const dnsService = getDNSService();

    if (!dnsService.isAvailable()) {
      return NextResponse.json(
        { error: 'DNS management not available' },
        { status: 503 }
      );
    }

    // This would require additional methods to get current DNS status
    // For now, return basic status
    return NextResponse.json({
      data: {
        domain_id: domainId,
        dns_managed: true,
        provider: process.env.DNS_PROVIDER || 'cloudflare'
      }
    });

  } catch (error) {
    console.error('Error getting DNS status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}