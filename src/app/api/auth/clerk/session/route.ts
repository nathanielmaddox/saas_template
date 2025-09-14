import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionId, getToken } = auth();

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Get user details from Clerk
    const user = await clerkClient.users.getUser(userId);
    const session = await clerkClient.sessions.getSession(sessionId);
    const token = await getToken();

    if (!user || !session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Format response to match AuthSession interface
    const authUser = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress?.split('@')[0] || '',
      avatar: user.imageUrl,
      role: user.publicMetadata?.role as string || 'user',
      metadata: {
        firstName: user.firstName,
        lastName: user.lastName,
        ...user.publicMetadata,
        ...user.privateMetadata
      },
      emailVerified: user.emailAddresses[0]?.verification?.status === 'verified',
      phoneVerified: user.phoneNumbers[0]?.verification?.status === 'verified',
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt)
    };

    const authSession = {
      user: authUser,
      token: token || sessionId,
      expiresAt: new Date(session.expireAt),
      refreshToken: session.id
    };

    return NextResponse.json({
      data: authSession,
      message: 'Session retrieved successfully'
    });

  } catch (error: any) {
    console.error('Clerk session error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve session',
        code: 'SESSION_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, sessionId } = auth();

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'No active session to sign out' },
        { status: 401 }
      );
    }

    // Revoke the current session
    await clerkClient.sessions.revokeSession(sessionId);

    return NextResponse.json({
      data: { success: true },
      message: 'Successfully signed out'
    });

  } catch (error: any) {
    console.error('Clerk signout error:', error);

    return NextResponse.json(
      {
        error: 'Failed to sign out',
        code: 'SIGNOUT_ERROR'
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
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}