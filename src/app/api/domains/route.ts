import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabaseClient, getTenantFromRequest } from '@/lib/database/utils';
import {
  isValidDomain,
  isValidSubdomain,
  generateVerificationToken,
  generateDomainVerification
} from '@/lib/domain';
import { Domain } from '@/lib/database/types';

// Validation schemas
const createDomainSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant ID is required'),
  domain: z.string().min(1, 'Domain is required'),
  type: z.enum(['subdomain', 'custom']),
  verification_method: z.enum(['dns', 'file', 'cname']).default('dns')
});

const updateDomainSchema = z.object({
  status: z.enum(['pending', 'verified', 'failed', 'expired']).optional(),
  ssl_enabled: z.boolean().optional(),
  ssl_status: z.enum(['pending', 'active', 'failed', 'expired']).optional()
});

/**
 * GET /api/domains - Get domains for a tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const tenantInfo = getTenantFromRequest(request);

    // Use tenant from headers if available, otherwise require tenant_id param
    const effectiveTenantId = tenantInfo.tenantId || tenantId;

    if (!effectiveTenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get tenant-aware database client
    const db = await getDatabaseClient(request, {
      requireTenant: true,
      tenantId: effectiveTenantId
    });

    const domains = await db.getDomainsByTenant(effectiveTenantId);

    return NextResponse.json(domains);
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/domains - Create a new domain
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createDomainSchema.parse(body);

    // Validate domain format
    if (validatedData.type === 'custom') {
      if (!isValidDomain(validatedData.domain)) {
        return NextResponse.json(
          { error: 'Invalid domain format' },
          { status: 400 }
        );
      }
    } else if (validatedData.type === 'subdomain') {
      if (!isValidSubdomain(validatedData.domain)) {
        return NextResponse.json(
          { error: 'Invalid subdomain format' },
          { status: 400 }
        );
      }
    }

    const db = await createDatabaseClient();

    // Check if domain already exists
    try {
      const existingTenant = await db.getTenantByDomain(validatedData.domain);
      if (existingTenant.data) {
        return NextResponse.json(
          { error: 'Domain already exists' },
          { status: 409 }
        );
      }
    } catch {
      // Domain doesn't exist, which is what we want
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Create domain record
    const domainData: Partial<Domain> = {
      tenant_id: validatedData.tenant_id,
      domain: validatedData.domain,
      type: validatedData.type,
      status: 'pending',
      verification_token: verificationToken,
      verification_method: validatedData.verification_method,
      ssl_enabled: false,
      ssl_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await db.createDomain(domainData);

    // Generate verification instructions
    const verificationRecords = generateDomainVerification(
      validatedData.domain,
      verificationToken
    );

    return NextResponse.json({
      ...result,
      verification_records: verificationRecords
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating domain:', error);
    return NextResponse.json(
      { error: 'Failed to create domain' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/domains - Update domain
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('id');

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateDomainSchema.parse(body);

    const db = await createDatabaseClient();

    // Add updated timestamp
    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString()
    };

    const result = await db.updateDomain(domainId, updateData);

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating domain:', error);
    return NextResponse.json(
      { error: 'Failed to update domain' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/domains - Delete domain
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('id');

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    const db = await createDatabaseClient();
    const result = await db.deleteDomain(domainId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error deleting domain:', error);
    return NextResponse.json(
      { error: 'Failed to delete domain' },
      { status: 500 }
    );
  }
}