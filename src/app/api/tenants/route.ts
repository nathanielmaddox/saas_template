import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDatabaseClient } from '@/lib/database/factory';
import { isValidSubdomain, generateSubdomainSuggestion } from '@/lib/domain';
import { Tenant } from '@/lib/database/types';

// Validation schemas
const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').max(63, 'Slug too long'),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  owner_id: z.string().min(1, 'Owner ID is required'),
  settings: z.record(z.any()).optional()
});

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(3).max(63).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
  settings: z.record(z.any()).optional()
});

/**
 * GET /api/tenants - Get tenants (with filters)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');
    const slug = searchParams.get('slug');
    const domain = searchParams.get('domain');

    const db = await createDatabaseClient();

    if (slug) {
      const tenant = await db.getTenantBySlug(slug);
      return NextResponse.json(tenant);
    }

    if (domain) {
      const tenant = await db.getTenantByDomain(domain);
      return NextResponse.json(tenant);
    }

    if (ownerId) {
      const tenants = await db.findMany<Tenant>('tenants', {
        filter: { owner_id: ownerId, status: 'active' },
        sort: { created_at: 'desc' }
      });
      return NextResponse.json(tenants);
    }

    // Admin only - get all tenants
    const tenants = await db.findMany<Tenant>('tenants', {
      sort: { created_at: 'desc' },
      limit: 50
    });

    return NextResponse.json(tenants);

  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants - Create a new tenant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTenantSchema.parse(body);

    // Validate subdomain format
    if (!isValidSubdomain(validatedData.slug)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format. Use only letters, numbers, and hyphens.' },
        { status: 400 }
      );
    }

    const db = await createDatabaseClient();

    // Check if slug is already taken
    try {
      const existingTenant = await db.getTenantBySlug(validatedData.slug);
      if (existingTenant.data) {
        // Suggest alternative
        const suggestion = generateSubdomainSuggestion(validatedData.slug);
        return NextResponse.json(
          {
            error: 'Subdomain already taken',
            suggestion: suggestion
          },
          { status: 409 }
        );
      }
    } catch {
      // Slug doesn't exist, which is what we want
    }

    // Create tenant record
    const tenantData: Partial<Tenant> = {
      name: validatedData.name,
      slug: validatedData.slug,
      plan: validatedData.plan,
      status: 'active',
      owner_id: validatedData.owner_id,
      settings: validatedData.settings || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await db.createTenant(tenantData);

    // Create default subdomain
    if (result.data) {
      try {
        await db.createDomain({
          tenant_id: result.data.id,
          domain: validatedData.slug,
          type: 'subdomain',
          status: 'verified', // Subdomains are auto-verified
          verification_method: 'dns',
          ssl_enabled: true,
          ssl_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          verified_at: new Date().toISOString()
        });
      } catch (domainError) {
        console.error('Failed to create default domain:', domainError);
        // Don't fail the tenant creation for this
      }
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenants - Update tenant
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateTenantSchema.parse(body);

    // If updating slug, validate it
    if (validatedData.slug && !isValidSubdomain(validatedData.slug)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format' },
        { status: 400 }
      );
    }

    const db = await createDatabaseClient();

    // If updating slug, check if it's available
    if (validatedData.slug) {
      try {
        const existingTenant = await db.getTenantBySlug(validatedData.slug);
        if (existingTenant.data && existingTenant.data.id !== tenantId) {
          return NextResponse.json(
            { error: 'Subdomain already taken' },
            { status: 409 }
          );
        }
      } catch {
        // Slug doesn't exist, which is what we want
      }
    }

    // Add updated timestamp
    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString()
    };

    const result = await db.updateTenant(tenantId, updateData);

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants - Delete tenant
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const db = await createDatabaseClient();

    // Soft delete - mark as deleted instead of removing
    const result = await db.updateTenant(tenantId, {
      status: 'deleted',
      updated_at: new Date().toISOString()
    });

    // Also mark all domains as deleted
    try {
      const domains = await db.getDomainsByTenant(tenantId);
      if (domains.data) {
        for (const domain of domains.data) {
          await db.updateDomain(domain.id, {
            status: 'expired',
            updated_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Failed to update domains for deleted tenant:', error);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}