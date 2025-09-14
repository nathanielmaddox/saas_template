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

    const user = await clerkClient.users.getUser(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Format response to match AuthUser interface
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

    return NextResponse.json({
      data: authUser,
      message: 'Profile retrieved successfully'
    });

  } catch (error: any) {
    console.error('Clerk profile retrieval error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve profile',
        code: 'GET_PROFILE_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, avatar, role, metadata = {} } = body;

    // Extract first and last name if provided
    let firstName = metadata.firstName;
    let lastName = metadata.lastName;

    if (name && !firstName && !lastName) {
      const nameParts = name.trim().split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }

    // Update user in Clerk
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    // Update metadata
    if (role || metadata.public) {
      updateData.publicMetadata = {
        ...(role && { role }),
        ...metadata.public
      };
    }

    if (metadata.private) {
      updateData.privateMetadata = metadata.private;
    }

    if (metadata.unsafe) {
      updateData.unsafeMetadata = metadata.unsafe;
    }

    const updatedUser = await clerkClient.users.updateUser(userId, updateData);

    // Handle avatar update separately if provided
    if (avatar) {
      try {
        await clerkClient.users.updateUserProfileImage(userId, {
          file: avatar // This expects a file object or URL
        });
      } catch (avatarError) {
        console.warn('Avatar update failed:', avatarError);
      }
    }

    // Format response to match AuthUser interface
    const authUser = {
      id: updatedUser.id,
      email: updatedUser.emailAddresses[0]?.emailAddress || '',
      name: `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || updatedUser.emailAddresses[0]?.emailAddress?.split('@')[0] || '',
      avatar: updatedUser.imageUrl,
      role: updatedUser.publicMetadata?.role as string || 'user',
      metadata: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        ...updatedUser.publicMetadata,
        ...updatedUser.privateMetadata
      },
      emailVerified: updatedUser.emailAddresses[0]?.verification?.status === 'verified',
      phoneVerified: updatedUser.phoneNumbers[0]?.verification?.status === 'verified',
      createdAt: new Date(updatedUser.createdAt),
      updatedAt: new Date(updatedUser.updatedAt)
    };

    return NextResponse.json({
      data: authUser,
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Clerk profile update error:', error);

    // Handle specific Clerk errors
    if (error.errors && Array.isArray(error.errors)) {
      const clerkError = error.errors[0];
      return NextResponse.json(
        {
          error: clerkError.message || 'Profile update failed',
          code: clerkError.code || 'UPDATE_PROFILE_ERROR',
          details: error.errors
        },
        { status: error.status || 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update profile',
        code: 'UPDATE_PROFILE_ERROR'
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
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}