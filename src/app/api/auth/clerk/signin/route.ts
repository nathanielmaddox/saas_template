import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, auth } from '@clerk/nextjs/server';
import { SignJWT } from 'jose';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe = false } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Note: Clerk doesn't support direct password signin via API
    // This would typically be handled by Clerk's frontend components
    // For backend integration, we work with sessions and tokens

    // This endpoint is primarily for compatibility with the auth abstraction
    // In practice, Clerk signin would happen through their components
    return NextResponse.json(
      {
        error: 'Direct password signin should use Clerk components. Use /api/auth/clerk/session to verify existing sessions.',
        code: 'USE_CLERK_COMPONENTS',
        details: {
          suggestion: 'Use SignIn component from @clerk/nextjs or handle signin client-side'
        }
      },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Clerk signin error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error during signin',
        code: 'SIGNIN_ERROR'
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