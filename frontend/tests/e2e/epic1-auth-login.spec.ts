import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser, createAdminUser, createTesterUser } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth, seedAuthMultiRole } from '../support/helpers/auth-seeding';
import type { Page } from '@playwright/test';

/**
 * Epic 1 - Story 1.1: User Login & Role Selection
 *
 * Tests for authentication flow, role selection, role switching,
 * role persistence, and auth guard redirects.
 *
 * Acceptance Criteria:
 * - AC-1.1.1: User can authenticate and land on the authorized page
 * - AC-1.1.2: User can switch between available roles (Admin, Developer, Tester) via the sidebar
 * - AC-1.1.3: Selected role persists across the session
 * - AC-1.1.4: Unauthorized users are redirected to the login screen
 */

const setupMocks = async (page: Page, user: ReturnType<typeof createUser>) => {
  await mockApiRoute(page, 'bugs*', []);
  await mockApiRoute(page, 'projects*', []);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
  await mockApiRoute(page, 'activity-logs*', []);
};

test.describe('Epic 1 - Story 1.1: User Login & Role Selection', () => {
  // --- AC-1.1.1: User can authenticate and land on the authorized page ---

  test('1.1-E2E-001: authenticated user with seeded token lands on dashboard @p0 @smoke', async ({ page }) => {
    // Given: A valid user with seeded auth tokens
    const user = createUser({ name: 'Auth Test User', role: 'developer' as any });
    await seedAuth(page, user);
    await setupMocks(page, user);

    // When: User navigates to the dashboard
    await page.goto('/');

    // Then: The dashboard loads successfully with welcome message
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('1.1-E2E-002: unauthenticated user is redirected from protected route to /login @p0 @smoke', async ({ page }) => {
    // Given: No auth tokens are set (fresh browser session)

    // When: User attempts to navigate to a protected route
    await page.goto('/bugs');

    // Then: User is redirected to the login page
    await expect(page).toHaveURL(/\/login/);
  });

  // --- AC-1.1.2: User can switch between available roles ---

  test('1.1-E2E-003: multi-role user can switch role via Settings > Switch Role @p0 @smoke', async ({ page }) => {
    // Given: A user with multiple available roles
    const user = createUser({ name: 'Multi Role User', role: 'developer' as any });
    const roles = ['admin', 'developer', 'tester'];
    await seedAuthMultiRole(page, user, roles);
    await setupMocks(page, user);

    // When: User navigates to settings
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Then: The Switch Role button is visible with current role displayed
    await expect(page.getByRole('button', { name: /switch role/i })).toBeVisible();
    await expect(page.getByText(/current role/i)).toBeVisible();

    // When: User clicks Switch Role
    await page.getByRole('button', { name: /switch role/i }).click();

    // Then: User is redirected to the role selection page
    await expect(page).toHaveURL(/\/select-role/);
  });

  test('1.1-E2E-004: single-role user auto-redirects past role selection to dashboard @p1 @regression', async ({ page }) => {
    // Given: A user with a single role
    const user = createUser({ name: 'Single Role Dev', role: 'developer' as any });
    await seedAuth(page, user);
    await setupMocks(page, user);

    // When: User navigates to dashboard
    await page.goto('/');

    // Then: User lands on dashboard, not the role selection page
    await expect(page).not.toHaveURL(/\/select-role/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  // --- AC-1.1.3: Selected role persists across the session ---

  test('1.1-E2E-005: selected role persists in localStorage after page navigation @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user with a specific role
    const user = createUser({ name: 'Persistence Test User', role: 'tester' as any });
    await seedAuth(page, user);
    await setupMocks(page, user);

    // When: User navigates to the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: The role persists in localStorage
    const storedUser = await page.evaluate(() => {
      const raw = localStorage.getItem('bugtrackr_current_user');
      return raw ? JSON.parse(raw) : null;
    });
    expect(storedUser).toBeTruthy();
    expect(storedUser.role).toBe('tester');
  });

  test('1.1-E2E-006: role persists after navigating between multiple pages @p1 @regression', async ({ page }) => {
    // Given: An authenticated admin user
    const user = createAdminUser({ name: 'Admin Navigator' });
    await seedAuth(page, user);
    await setupMocks(page, user);

    // When: User navigates through multiple pages
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: Role is still persisted correctly in localStorage
    const storedUser = await page.evaluate(() => {
      const raw = localStorage.getItem('bugtrackr_current_user');
      return raw ? JSON.parse(raw) : null;
    });
    expect(storedUser).toBeTruthy();
    expect(storedUser.role).toBe('admin');
  });

  // --- AC-1.1.4: Unauthorized users are redirected to the login screen ---

  test('1.1-E2E-007: logout clears tokens and redirects to /login @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user on the settings page
    const user = createUser({ name: 'Logout Tester' });
    await seedAuth(page, user);
    await setupMocks(page, user);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // When: User clicks the Sign Out button
    await page.getByRole('button', { name: /sign out/i }).click();

    // Then: User is redirected to the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('1.1-E2E-008: accessing /settings without auth redirects to /login @p0', async ({ page }) => {
    // Given: No auth tokens are set

    // When: User attempts to navigate to settings
    await page.goto('/settings');

    // Then: User is redirected to the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('1.1-E2E-009: accessing / (dashboard) without auth redirects to /login @p2', async ({ page }) => {
    // Given: No auth tokens are set

    // When: User attempts to navigate to the dashboard
    await page.goto('/');

    // Then: User is redirected to the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('1.1-E2E-010: accessing /projects without auth redirects to /login @p2', async ({ page }) => {
    // Given: No auth tokens are set

    // When: User attempts to navigate to projects
    await page.goto('/projects');

    // Then: User is redirected to the login page
    await expect(page).toHaveURL(/\/login/);
  });
});
