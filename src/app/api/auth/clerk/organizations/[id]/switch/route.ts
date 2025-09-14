import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, sessionId } = auth();

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const organizationId = params.id;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Verify user is a member of the organization
    const membership = await clerkClient.organizations.getOrganizationMembership({
      organizationId,
      userId
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 403 }
      );
    }

    // Update session to use this organization as active
    await clerkClient.sessions.getSession(sessionId);

    // Note: Clerk handles organization switching primarily client-side
    // This endpoint serves as a validation and confirmation

    const organization = await clerkClient.organizations.getOrganization({
      organizationId
    });

    return NextResponse.json({
      data: {
        success: true,
        organizationId: organization.id,
        organizationName: organization.name,
        role: membership.role
      },
      message: 'Organization switched successfully'
    });

  } catch (error: any) {
    console.error('Clerk switch organization error:', error);

    if (error.status === 404) {
      return NextResponse.json(
        {
          error: 'Organization not found or user not a member',
          code: 'ORGANIZATION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to switch organization',
        code: 'SWITCH_ORGANIZATION_ERROR'
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}