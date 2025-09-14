// Authentication abstraction types for multi-provider support
export type AuthProvider = 'nextauth' | 'clerk' | 'supabase' | 'custom';

export interface AuthConfig {
  provider: AuthProvider;
  options?: Record<string, any>;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
  metadata?: Record<string, any>;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface SignInData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse<T = any> {
  data?: T;
  error?: AuthError;
  message?: string;
}

export interface AuthError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

export interface AuthClient {
  // Core authentication
  signUp(data: SignUpData): Promise<AuthResponse<AuthUser>>;
  signIn(data: SignInData): Promise<AuthResponse<AuthSession>>;
  signOut(): Promise<AuthResponse<{ success: boolean }>>;

  // User management
  getCurrentUser(): Promise<AuthResponse<AuthUser>>;
  updateProfile(data: Partial<AuthUser>): Promise<AuthResponse<AuthUser>>;
  deleteAccount(): Promise<AuthResponse<{ success: boolean }>>;

  // Password management
  changePassword(oldPassword: string, newPassword: string): Promise<AuthResponse<{ success: boolean }>>;
  requestPasswordReset(email: string): Promise<AuthResponse<{ success: boolean }>>;
  resetPassword(token: string, newPassword: string): Promise<AuthResponse<{ success: boolean }>>;

  // Email verification
  sendVerificationEmail(): Promise<AuthResponse<{ success: boolean }>>;
  verifyEmail(token: string): Promise<AuthResponse<{ success: boolean }>>;

  // Multi-factor authentication
  enableMFA?(): Promise<AuthResponse<{ qrCode: string; backupCodes: string[] }>>;
  disableMFA?(): Promise<AuthResponse<{ success: boolean }>>;
  verifyMFA?(code: string): Promise<AuthResponse<{ success: boolean }>>;

  // Social authentication
  signInWithProvider?(provider: string): Promise<AuthResponse<AuthSession>>;
  linkProvider?(provider: string): Promise<AuthResponse<{ success: boolean }>>;
  unlinkProvider?(provider: string): Promise<AuthResponse<{ success: boolean }>>;

  // Session management
  refreshSession?(): Promise<AuthResponse<AuthSession>>;
  getSession(): Promise<AuthResponse<AuthSession | null>>;
  invalidateAllSessions?(): Promise<AuthResponse<{ success: boolean }>>;

  // Organization management (for enterprise)
  createOrganization?(name: string, metadata?: Record<string, any>): Promise<AuthResponse<Organization>>;
  getOrganizations?(): Promise<AuthResponse<Organization[]>>;
  switchOrganization?(organizationId: string): Promise<AuthResponse<{ success: boolean }>>;
  inviteUser?(email: string, role: string, organizationId?: string): Promise<AuthResponse<{ success: boolean }>>;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthHook {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (data: SignInData) => Promise<AuthResponse<AuthSession>>;
  signUp: (data: SignUpData) => Promise<AuthResponse<AuthUser>>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<AuthResponse<AuthUser>>;
}

// Utility functions
export function createAuthError(message: string, code: string, statusCode: number, details?: Record<string, any>): AuthError {
  return {
    message,
    code,
    statusCode,
    details
  };
}

export function isAuthError(error: unknown): error is AuthError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error && 'statusCode' in error;
}

export function validateAuthConfig(config: AuthConfig): void {
  if (!config.provider) {
    throw new Error('Auth provider is required');
  }

  const supportedProviders: AuthProvider[] = ['nextauth', 'clerk', 'supabase', 'custom'];
  if (!supportedProviders.includes(config.provider)) {
    throw new Error(`Unsupported auth provider: ${config.provider}`);
  }
}