import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { clerkClient, auth } from '@clerk/nextjs/server';
import { createDatabaseError } from '@/lib/database/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, metadata = {} } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create user with Clerk
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName: firstName || metadata.firstName || email.split('@')[0],
      lastName: lastName || metadata.lastName,
      publicMetadata: {
        role: metadata.role || 'user',
        onboardingComplete: false,
        ...metadata.public
      },
      privateMetadata: {
        ...metadata.private
      },
      unsafeMetadata: {
        ...metadata.unsafe
      }
    });

    // Format response to match AuthUser interface
    const authUser = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0],
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
      message: 'User created successfully'
    });

  } catch (error: any) {
    console.error('Clerk signup error:', error);

    // Handle specific Clerk errors
    if (error.errors && Array.isArray(error.errors)) {
      const clerkError = error.errors[0];
      return NextResponse.json(
        {
          error: clerkError.message || 'Signup failed',
          code: clerkError.code || 'SIGNUP_ERROR',
          details: error.errors
        },
        { status: error.status || 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error during signup',
        code: 'SIGNUP_ERROR'
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