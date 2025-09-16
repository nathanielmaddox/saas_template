import { NextRequest, NextResponse } from 'next/server';
import { createDatabaseClient } from '@/lib/database/factory';
import { parseDomain, extractTenantIdentifier } from '@/lib/domain';

/**
 * GET /api/tenant/current - Get current tenant information based on domain
 */
export async function GET(request: NextRequest) {
  try {
    // Get domain information from request
    const host = request.headers.get('host');
    if (!host) {
      return NextResponse.json(
        { error: 'Invalid host header' },
        { status: 400 }
      );
    }

    // Parse domain information
    const domainInfo = parseDomain(host);
    const tenantIdentifier = extractTenantIdentifier(domainInfo);

    if (!tenantIdentifier) {
      return NextResponse.json(
        { error: 'No tenant identifier found' },
        { status: 404 }
      );
    }

    const db = await createDatabaseClient();

    // Get tenant based on identifier type
    let tenant;
    try {
      if (domainInfo.isSubdomain) {
        tenant = await db.getTenantBySlug(tenantIdentifier);
      } else if (domainInfo.isCustomDomain) {
        tenant = await db.getTenantByDomain(tenantIdentifier);
      } else {
        return NextResponse.json(
          { error: 'Invalid domain type' },
          { status: 400 }
        );
      }

      if (!tenant.data) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }

      // Check if tenant is active
      if (tenant.data.status !== 'active') {
        return NextResponse.json(
          { error: 'Tenant is not active' },
          { status: 403 }
        );
      }

    } catch (error) {
      console.error('Error fetching tenant:', error);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get tenant domains
    let domains = [];
    try {
      const domainsResult = await db.getDomainsByTenant(tenant.data.id);
      domains = domainsResult.data || [];
    } catch (error) {
      console.error('Error fetching domains:', error);
      // Don't fail the request for this
    }

    // Build response
    const response = {
      tenant_id: tenant.data.id,
      tenant_name: tenant.data.name,
      tenant_slug: tenant.data.slug,
      tenant_plan: tenant.data.plan,
      tenant_status: tenant.data.status,
      domain_type: domainInfo.isSubdomain ? 'subdomain' : 'custom',
      current_domain: domainInfo.domain,
      domains: domains.map(domain => ({
        id: domain.id,
        domain: domain.domain,
        type: domain.type,
        status: domain.status,
        ssl_enabled: domain.ssl_enabled,
        ssl_status: domain.ssl_status,
        verified_at: domain.verified_at
      })),
      settings: tenant.data.settings || {},
      created_at: tenant.data.created_at,
      updated_at: tenant.data.updated_at
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in current tenant API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}