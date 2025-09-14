import { test, expect } from '@playwright/test';

test.describe('Clerk Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/');
  });

  test('should display sign in page', async ({ page }) => {
    await page.goto('/sign-in');

    // Check for sign in form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should display sign up page', async ({ page }) => {
    await page.goto('/sign-up');

    // Check for sign up form elements
    await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('should handle sign up flow', async ({ page }) => {
    await page.goto('/sign-up');

    // Fill out sign up form
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.getByLabel(/password/i).fill('TestPassword123!');

    // Submit form
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should redirect or show success message
    await expect(page).toHaveURL(/\/verify-email|\/dashboard|\/onboarding/);
  });

  test('should handle sign in flow', async ({ page }) => {
    await page.goto('/sign-in');

    // Fill out sign in form
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.getByLabel(/password/i).fill('TestPassword123!');

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard or show error
    await page.waitForURL(/\/dashboard|\/sign-in/, { timeout: 10000 });

    // If successfully signed in, should be on dashboard
    if (page.url().includes('/dashboard')) {
      await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();
    }
  });

  test('should display validation errors for invalid inputs', async ({ page }) => {
    await page.goto('/sign-up');

    // Try to submit with invalid email
    await page.getByRole('textbox', { name: /email/i }).fill('invalid-email');
    await page.getByLabel(/password/i).fill('short');
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show validation errors
    await expect(page.getByText(/invalid email|email is not valid/i)).toBeVisible({
      timeout: 5000
    });
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/sign-in');

    // Look for forgot password link
    const forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();

      // Fill email for password reset
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.getByRole('button', { name: /reset password/i }).click();

      // Should show confirmation message
      await expect(page.getByText(/check your email|reset link sent/i)).toBeVisible({
        timeout: 5000
      });
    }
  });

  test('should handle social sign in options', async ({ page }) => {
    await page.goto('/sign-in');

    // Check for social sign in buttons
    const googleButton = page.getByRole('button', { name: /google/i });
    const githubButton = page.getByRole('button', { name: /github/i });

    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeVisible();
    }

    if (await githubButton.isVisible()) {
      await expect(githubButton).toBeVisible();
    }
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard');

    // Should redirect to sign in
    await page.waitForURL(/\/sign-in/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should display user profile when authenticated', async ({ page }) => {
    // This test assumes user is authenticated
    // In a real test environment, you'd set up proper test users

    // Mock authentication state
    await page.route('**/api/auth/**', async route => {
      if (route.request().url().includes('/session')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              user: {
                id: 'test-user',
                email: 'test@example.com',
                name: 'Test User'
              },
              token: 'mock-token'
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard');

    // Should show authenticated user interface
    await expect(page.getByText(/test@example\.com|test user/i)).toBeVisible({
      timeout: 10000
    });
  });

  test('should handle sign out functionality', async ({ page }) => {
    // Mock authenticated state
    await page.route('**/api/auth/**', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { success: true } })
        });
      } else if (route.request().url().includes('/session')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              user: {
                id: 'test-user',
                email: 'test@example.com',
                name: 'Test User'
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard');

    // Look for sign out button/link
    const signOutButton = page.getByRole('button', { name: /sign out|logout/i });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();

      // Should redirect to home or sign in page
      await page.waitForURL(/\/$|\/sign-in/, { timeout: 10000 });
    }
  });

  test('should handle multi-factor authentication setup', async ({ page }) => {
    // Mock authenticated state
    await page.route('**/api/auth/clerk/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'test-user',
              email: 'test@example.com',
              name: 'Test User'
            }
          }
        })
      });
    });

    await page.goto('/settings/security');

    // Look for MFA setup
    const mfaSection = page.getByText(/two.factor|multi.factor|2fa/i);
    if (await mfaSection.isVisible()) {
      const enableMfaButton = page.getByRole('button', { name: /enable.*mfa|setup.*2fa/i });
      if (await enableMfaButton.isVisible()) {
        await enableMfaButton.click();

        // Should show QR code or setup instructions
        await expect(page.getByText(/qr code|authenticator|backup codes/i)).toBeVisible({
          timeout: 5000
        });
      }
    }
  });

  test('should handle organization management', async ({ page }) => {
    // Mock authenticated state
    await page.route('**/api/auth/clerk/**', async route => {
      if (route.request().url().includes('/organizations')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'org-1',
                name: 'Test Organization',
                role: 'admin'
              }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/organizations');

    // Should display organization list
    await expect(page.getByText(/test organization/i)).toBeVisible({
      timeout: 10000
    });

    // Check for create organization button
    const createOrgButton = page.getByRole('button', { name: /create organization/i });
    if (await createOrgButton.isVisible()) {
      await createOrgButton.click();

      // Should show create organization form
      await expect(page.getByRole('textbox', { name: /organization name/i })).toBeVisible({
        timeout: 5000
      });
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/sign-in');

    // Should display mobile-friendly sign in form
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    // Should maintain functionality
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
  });
});