import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';

test.describe('Authentication', () => {
  test('AUTH-E2E-001: token seeding enables authenticated session and dashboard loads @p0 @smoke', async ({ page }) => {
    // Given: A valid user with seeded auth tokens
    const user = createUser({ name: 'Test Developer' });
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [user]);

    // When: User navigates to the dashboard
    await page.goto('/');

    // Then: The dashboard loads with the user's welcome message
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('AUTH-E2E-002: unauthenticated user is redirected from /bugs to /login @p0 @smoke', async ({ page }) => {
    // Given: No auth tokens are set (fresh session)

    // When: User attempts to navigate to a protected route
    await page.goto('/bugs');

    // Then: User is redirected to the login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('AUTH-E2E-003: logout clears tokens and redirects to /login @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user on the settings page
    const user = createUser({ name: 'Logout Tester' });
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [user]);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // When: User clicks the Sign Out button
    await page.getByRole('button', { name: /sign out/i }).click();

    // Then: User is redirected to the login page
    await expect(page).toHaveURL(/\/login/);
  });
});
