import { ClerkProvider, useAuth, useUser, useSignIn, useSignUp, useClerk } from '@clerk/nextjs';
import type {
  AuthClient,
  AuthUser,
  AuthSession,
  SignUpData,
  SignInData,
  AuthResponse,
  AuthError,
  Organization
} from '../types';
import { createAuthError } from '../types';

/**
 * Clerk authentication client implementation
 * Provides enterprise-grade authentication with built-in user management
 */
export class ClerkAuthClient implements AuthClient {
  private publishableKey: string;

  constructor(config: { publishableKey: string; options?: Record<string, any> }) {
    if (!config.publishableKey) {
      throw createAuthError('Clerk publishable key is required', 'CONFIG_ERROR', 400);
    }

    this.publishableKey = config.publishableKey;
  }

  // Core authentication
  async signUp(data: SignUpData): Promise<AuthResponse<AuthUser>> {
    try {
      // This would typically be called from a React component using useSignUp
      // For server-side or standalone usage, we'd use Clerk's backend API
      const response = await fetch('/api/auth/clerk/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: this.mapClerkUser(result.user) };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Sign up failed',
          'SIGNUP_ERROR',
          500
        )
      };
    }
  }

  async signIn(data: SignInData): Promise<AuthResponse<AuthSession>> {
    try {
      const response = await fetch('/api/auth/clerk/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return {
        data: {
          user: this.mapClerkUser(result.user),
          token: result.session.id,
          expiresAt: new Date(result.session.expireAt),
        }
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Sign in failed',
          'SIGNIN_ERROR',
          500
        )
      };
    }
  }

  async signOut(): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Sign out failed',
          'SIGNOUT_ERROR',
          500
        )
      };
    }
  }

  // User management
  async getCurrentUser(): Promise<AuthResponse<AuthUser>> {
    try {
      const response = await fetch('/api/auth/clerk/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { data: null as any };
        }

        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      const result = await response.json();
      return { data: this.mapClerkUser(result.user) };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to get current user',
          'GET_USER_ERROR',
          500
        )
      };
    }
  }

  async updateProfile(data: Partial<AuthUser>): Promise<AuthResponse<AuthUser>> {
    try {
      const response = await fetch('/api/auth/clerk/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: this.mapClerkUser(result.user) };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to update profile',
          'UPDATE_PROFILE_ERROR',
          500
        )
      };
    }
  }

  async deleteAccount(): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to delete account',
          'DELETE_ACCOUNT_ERROR',
          500
        )
      };
    }
  }

  // Password management
  async changePassword(oldPassword: string, newPassword: string): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword, newPassword }),
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to change password',
          'CHANGE_PASSWORD_ERROR',
          500
        )
      };
    }
  }

  async requestPasswordReset(email: string): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to request password reset',
          'REQUEST_PASSWORD_RESET_ERROR',
          500
        )
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to reset password',
          'RESET_PASSWORD_ERROR',
          500
        )
      };
    }
  }

  // Email verification
  async sendVerificationEmail(): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to send verification email',
          'SEND_VERIFICATION_ERROR',
          500
        )
      };
    }
  }

  async verifyEmail(token: string): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to verify email',
          'VERIFY_EMAIL_ERROR',
          500
        )
      };
    }
  }

  // Multi-factor authentication
  async enableMFA(): Promise<AuthResponse<{ qrCode: string; backupCodes: string[] }>> {
    try {
      const response = await fetch('/api/auth/clerk/enable-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return {
        data: {
          qrCode: result.qrCode,
          backupCodes: result.backupCodes
        }
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to enable MFA',
          'ENABLE_MFA_ERROR',
          500
        )
      };
    }
  }

  async disableMFA(): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/disable-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to disable MFA',
          'DISABLE_MFA_ERROR',
          500
        )
      };
    }
  }

  async verifyMFA(code: string): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/verify-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to verify MFA',
          'VERIFY_MFA_ERROR',
          500
        )
      };
    }
  }

  // Social authentication
  async signInWithProvider(provider: string): Promise<AuthResponse<AuthSession>> {
    try {
      const response = await fetch(`/api/auth/clerk/oauth/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return {
        data: {
          user: this.mapClerkUser(result.user),
          token: result.session.id,
          expiresAt: new Date(result.session.expireAt),
        }
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to sign in with provider',
          'OAUTH_SIGNIN_ERROR',
          500
        )
      };
    }
  }

  async linkProvider(provider: string): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch(`/api/auth/clerk/link-provider/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to link provider',
          'LINK_PROVIDER_ERROR',
          500
        )
      };
    }
  }

  async unlinkProvider(provider: string): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch(`/api/auth/clerk/unlink-provider/${provider}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to unlink provider',
          'UNLINK_PROVIDER_ERROR',
          500
        )
      };
    }
  }

  // Session management
  async refreshSession(): Promise<AuthResponse<AuthSession>> {
    try {
      const response = await fetch('/api/auth/clerk/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return {
        data: {
          user: this.mapClerkUser(result.user),
          token: result.session.id,
          expiresAt: new Date(result.session.expireAt),
        }
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to refresh session',
          'REFRESH_SESSION_ERROR',
          500
        )
      };
    }
  }

  async getSession(): Promise<AuthResponse<AuthSession | null>> {
    try {
      const response = await fetch('/api/auth/clerk/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        return { data: null };
      }

      const result = await response.json();

      if (!response.ok) {
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return {
        data: result.session ? {
          user: this.mapClerkUser(result.user),
          token: result.session.id,
          expiresAt: new Date(result.session.expireAt),
        } : null
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to get session',
          'GET_SESSION_ERROR',
          500
        )
      };
    }
  }

  async invalidateAllSessions(): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/invalidate-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to invalidate sessions',
          'INVALIDATE_SESSIONS_ERROR',
          500
        )
      };
    }
  }

  // Organization management
  async createOrganization(name: string, metadata?: Record<string, any>): Promise<AuthResponse<Organization>> {
    try {
      const response = await fetch('/api/auth/clerk/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, metadata }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: this.mapClerkOrganization(result.organization) };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to create organization',
          'CREATE_ORGANIZATION_ERROR',
          500
        )
      };
    }
  }

  async getOrganizations(): Promise<AuthResponse<Organization[]>> {
    try {
      const response = await fetch('/api/auth/clerk/organizations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return {
        data: result.organizations.map((org: any) => this.mapClerkOrganization(org))
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to get organizations',
          'GET_ORGANIZATIONS_ERROR',
          500
        )
      };
    }
  }

  async switchOrganization(organizationId: string): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/switch-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to switch organization',
          'SWITCH_ORGANIZATION_ERROR',
          500
        )
      };
    }
  }

  async inviteUser(email: string, role: string, organizationId?: string): Promise<AuthResponse<{ success: boolean }>> {
    try {
      const response = await fetch('/api/auth/clerk/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role, organizationId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw createAuthError(result.message, result.code, response.status, result);
      }

      return { data: { success: true } };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        return { error: error as AuthError };
      }

      return {
        error: createAuthError(
          error instanceof Error ? error.message : 'Failed to invite user',
          'INVITE_USER_ERROR',
          500
        )
      };
    }
  }

  // Helper methods
  private mapClerkUser(clerkUser: any): AuthUser {
    return {
      id: clerkUser.id,
      email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      avatar: clerkUser.profileImageUrl,
      role: clerkUser.publicMetadata?.role || 'user',
      metadata: clerkUser.publicMetadata || {},
      emailVerified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified',
      phoneVerified: clerkUser.phoneNumbers?.[0]?.verification?.status === 'verified',
      createdAt: new Date(clerkUser.createdAt),
      updatedAt: new Date(clerkUser.updatedAt),
    };
  }

  private mapClerkOrganization(clerkOrg: any): Organization {
    return {
      id: clerkOrg.id,
      name: clerkOrg.name,
      slug: clerkOrg.slug,
      metadata: clerkOrg.publicMetadata || {},
      createdAt: new Date(clerkOrg.createdAt),
      updatedAt: new Date(clerkOrg.updatedAt),
    };
  }
}