import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser, createAdminUser } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import type { Page } from '@playwright/test';
import { seedAuth, seedAuthMultiRole } from '../support/helpers/auth-seeding';

const setupMocks = async (page: Page, user: ReturnType<typeof createUser>) => {
  await mockApiRoute(page, 'bugs*', []);
  await mockApiRoute(page, 'projects*', []);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
  await mockApiRoute(page, 'activity-logs*', []);
};

test.describe('Navigation & Settings', () => {
  test('NAV-E2E-001: sidebar links navigate to correct pages @p1 @regression', async ({ page }) => {
    // Given: An authenticated user on the dashboard
    const user = createUser();
    await seedAuth(page, user);
    await setupMocks(page, user);
    await page.goto('/');

    // When: User clicks the Bugs sidebar link
    await page.getByRole('link', { name: 'Bugs' }).click();

    // Then: User navigates to the bugs page
    await expect(page).toHaveURL(/\/bugs/);
    await expect(page.getByRole('heading', { name: /all bugs/i })).toBeVisible();
  });

  test('NAV-E2E-002: Group Management link only appears for admin @p1 @regression', async ({ page }) => {
    // Given: A non-admin user
    const user = createUser({ role: 'developer' as any });
    await seedAuth(page, user);
    await setupMocks(page, user);
    await page.goto('/');

    // When: Dashboard loads
    // Then: Group Management link is NOT visible in sidebar
    await expect(page.getByText('Group Management')).not.toBeVisible();
  });

  test('SETTINGS-E2E-001: theme toggle is visible on settings page @p2 @regression', async ({ page }) => {
    // Given: User navigates to settings
    const user = createUser();
    await seedAuth(page, user);
    await setupMocks(page, user);
    await page.goto('/settings');

    // When: Settings page loads
    // Then: Appearance section with Theme heading is visible
    await expect(page.getByText('Appearance')).toBeVisible();
    await expect(page.getByText('Theme').first()).toBeVisible();
  });

  test('SETTINGS-E2E-002: Switch Role button visible for multi-role user @p2 @regression', async ({ page }) => {
    // Given: A multi-role user on the settings page
    const user = createUser({ role: 'developer' as any });
    await seedAuthMultiRole(page, user, ['developer', 'tester', 'admin']);
    await setupMocks(page, user);
    await page.goto('/settings');

    // When: Settings page loads
    // Then: Switch Role button is visible
    await expect(page.getByRole('button', { name: /switch role/i })).toBeVisible();
  });

  test('SETTINGS-E2E-003: Switch Role button is hidden for single-role user @p2 @regression', async ({ page }) => {
    // Given: A single-role user on the settings page
    const user = createUser({ role: 'developer' as any });
    await seedAuth(page, user);
    await setupMocks(page, user);
    await page.goto('/settings');

    // When: Settings page loads
    // Then: Switch Role button is NOT visible
    await expect(page.getByText('Switch Role')).not.toBeVisible();
  });

  test('ACTLOG-E2E-001: activity logs page displays timeline @p1 @regression', async ({ page }) => {
    // Given: Activity logs exist
    const user = createUser({ name: 'Logger' });
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'activity-logs*', []);
    await page.goto('/activity-logs');

    // When: Activity logs page loads
    // Then: Activity log heading is visible
    await expect(page.getByRole('heading', { name: /activity log/i })).toBeVisible();
  });
});
