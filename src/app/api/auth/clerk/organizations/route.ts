import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's organizations
    const organizationMemberships = await clerkClient.users.getOrganizationMembershipList({
      userId
    });

    const organizations = organizationMemberships.data.map(membership => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
      metadata: membership.organization.publicMetadata,
      createdAt: new Date(membership.organization.createdAt),
      updatedAt: new Date(membership.organization.updatedAt)
    }));

    return NextResponse.json({
      data: organizations,
      message: 'Organizations retrieved successfully'
    });

  } catch (error: any) {
    console.error('Clerk organizations error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve organizations',
        code: 'GET_ORGANIZATIONS_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, slug, metadata = {} } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Create organization
    const organization = await clerkClient.organizations.createOrganization({
      name,
      slug,
      publicMetadata: metadata,
      createdBy: userId
    });

    const formattedOrg = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      metadata: organization.publicMetadata,
      createdAt: new Date(organization.createdAt),
      updatedAt: new Date(organization.updatedAt)
    };

    return NextResponse.json({
      data: formattedOrg,
      message: 'Organization created successfully'
    });

  } catch (error: any) {
    console.error('Clerk create organization error:', error);

    // Handle specific Clerk errors
    if (error.errors && Array.isArray(error.errors)) {
      const clerkError = error.errors[0];
      return NextResponse.json(
        {
          error: clerkError.message || 'Organization creation failed',
          code: clerkError.code || 'CREATE_ORGANIZATION_ERROR',
          details: error.errors
        },
        { status: error.status || 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create organization',
        code: 'CREATE_ORGANIZATION_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}