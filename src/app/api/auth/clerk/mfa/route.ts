import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

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
    const { action, code, type = 'totp' } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required (enable, disable, verify)' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'enable':
        try {
          // Create TOTP (Time-based One-Time Password) for the user
          const totp = await clerkClient.users.createTOTP(userId);

          return NextResponse.json({
            data: {
              qrCode: totp.qrCode || '',
              secret: totp.secret || '',
              backupCodes: totp.backupCodes || []
            },
            message: 'MFA setup initiated. Use the QR code to configure your authenticator app.'
          });
        } catch (error: any) {
          return NextResponse.json(
            {
              error: 'Failed to enable MFA',
              code: 'MFA_ENABLE_ERROR',
              details: error.message
            },
            { status: 400 }
          );
        }

      case 'verify':
        if (!code) {
          return NextResponse.json(
            { error: 'Verification code is required' },
            { status: 400 }
          );
        }

        try {
          // Verify the TOTP code
          const verification = await clerkClient.users.verifyTOTP(userId, { code });

          if (verification.verified) {
            return NextResponse.json({
              data: { success: true },
              message: 'MFA verification successful'
            });
          } else {
            return NextResponse.json(
              {
                error: 'Invalid verification code',
                code: 'INVALID_MFA_CODE'
              },
              { status: 400 }
            );
          }
        } catch (error: any) {
          return NextResponse.json(
            {
              error: 'MFA verification failed',
              code: 'MFA_VERIFY_ERROR',
              details: error.message
            },
            { status: 400 }
          );
        }

      case 'disable':
        try {
          // Remove TOTP for the user
          await clerkClient.users.disableTOTP(userId);

          return NextResponse.json({
            data: { success: true },
            message: 'MFA disabled successfully'
          });
        } catch (error: any) {
          return NextResponse.json(
            {
              error: 'Failed to disable MFA',
              code: 'MFA_DISABLE_ERROR',
              details: error.message
            },
            { status: 400 }
          );
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: enable, disable, or verify' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Clerk MFA error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error during MFA operation',
        code: 'MFA_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user to check MFA status
    const user = await clerkClient.users.getUser(userId);

    const mfaEnabled = user.twoFactorEnabled || false;
    const totpEnabled = user.totpEnabled || false;
    const backupCodeEnabled = user.backupCodeEnabled || false;

    return NextResponse.json({
      data: {
        mfaEnabled,
        totpEnabled,
        backupCodeEnabled,
        availableMethods: ['totp', 'backup_code']
      },
      message: 'MFA status retrieved successfully'
    });

  } catch (error: any) {
    console.error('Clerk MFA status error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve MFA status',
        code: 'MFA_STATUS_ERROR'
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