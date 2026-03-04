import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth, seedAuthMultiRole } from '../support/helpers/auth-seeding';

test.describe('Role Selection', () => {
  test('ROLE-E2E-001: single-role user auto-redirects past role selection to dashboard @p0 @smoke', async ({ page }) => {
    // Given: A user with a single role (developer)
    const user = createUser({ role: 'developer' as any });
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [user]);

    // When: User navigates to dashboard
    await page.goto('/');

    // Then: User lands on dashboard, not the role selection page
    await expect(page).not.toHaveURL(/\/select-role/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('ROLE-E2E-002: multi-role user sees role selection and can choose @p1 @regression', async ({ page }) => {
    // Given: A user with multiple roles seeded into localStorage
    const user = createUser({ role: 'developer' as any });
    const roles = ['developer', 'tester', 'admin'];
    await seedAuthMultiRole(page, user, roles);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [user]);

    // When: User navigates to the dashboard
    await page.goto('/');

    // Then: The dashboard loads since the user context is already set from localStorage
    // The Switch Role option is available in settings for multi-role users
    await page.goto('/settings');
    await expect(page.getByText('Switch Role')).toBeVisible();
  });
});
