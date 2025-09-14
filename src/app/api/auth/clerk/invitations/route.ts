import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, role = 'basic_member', organizationId } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Use provided organizationId or current org context
    const targetOrgId = organizationId || orgId;

    if (!targetOrgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Verify user has permission to invite (must be admin or have invite permissions)
    const membership = await clerkClient.organizations.getOrganizationMembership({
      organizationId: targetOrgId,
      userId
    });

    if (!membership || (membership.role !== 'admin' && membership.role !== 'org:admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to invite users' },
        { status: 403 }
      );
    }

    // Create organization invitation
    const invitation = await clerkClient.organizationInvitations.createOrganizationInvitation({
      organizationId: targetOrgId,
      emailAddress: email,
      role,
      inviterUserId: userId
    });

    return NextResponse.json({
      data: {
        success: true,
        invitationId: invitation.id,
        email: invitation.emailAddress,
        role: invitation.role,
        status: invitation.status,
        expiresAt: new Date(invitation.createdAt + 7 * 24 * 60 * 60 * 1000) // 7 days from creation
      },
      message: 'Invitation sent successfully'
    });

  } catch (error: any) {
    console.error('Clerk invitation error:', error);

    // Handle specific Clerk errors
    if (error.errors && Array.isArray(error.errors)) {
      const clerkError = error.errors[0];
      return NextResponse.json(
        {
          error: clerkError.message || 'Invitation failed',
          code: clerkError.code || 'INVITATION_ERROR',
          details: error.errors
        },
        { status: error.status || 400 }
      );
    }

    if (error.status === 404) {
      return NextResponse.json(
        {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to send invitation',
        code: 'INVITATION_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || orgId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Verify user has permission to view invitations
    const membership = await clerkClient.organizations.getOrganizationMembership({
      organizationId,
      userId
    });

    if (!membership || (membership.role !== 'admin' && membership.role !== 'org:admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view invitations' },
        { status: 403 }
      );
    }

    // Get organization invitations
    const invitations = await clerkClient.organizationInvitations.getOrganizationInvitationList({
      organizationId,
      limit: 50
    });

    const formattedInvitations = invitations.data.map(invitation => ({
      id: invitation.id,
      email: invitation.emailAddress,
      role: invitation.role,
      status: invitation.status,
      createdAt: new Date(invitation.createdAt),
      expiresAt: new Date(invitation.createdAt + 7 * 24 * 60 * 60 * 1000)
    }));

    return NextResponse.json({
      data: formattedInvitations,
      message: 'Invitations retrieved successfully'
    });

  } catch (error: any) {
    console.error('Clerk get invitations error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve invitations',
        code: 'GET_INVITATIONS_ERROR'
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