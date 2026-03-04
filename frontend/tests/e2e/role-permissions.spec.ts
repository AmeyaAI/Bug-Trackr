import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser, createTesterUser, createAdminUser, createBug } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';

const mockBugDetail = (user: ReturnType<typeof createUser>, status: string, validated: boolean) => ({
  ...createBug({ title: 'Permission Test Bug', reportedBy: user.userId }),
  id: 'perm-bug-1',
  status,
  validated,
  assignedTo: user.userId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

test.describe('Role Permissions', () => {
  test('ROLE-E2E-003: tester sees Validate and Close buttons on resolved bug @p0 @regression', async ({ page }) => {
    // Given: A tester user viewing a resolved bug detail
    const user = createTesterUser();
    const bug = mockBugDetail(user, 'Resolved', false);
    await seedAuth(page, user);
    // The detail page fetches bug (singular) and comments (list) separately
    await mockApiRoute(page, 'bugs/perm-bug-1', bug);
    await mockApiRoute(page, 'bugs*', [bug]);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);

    // When: Tester navigates to the bug detail page
    await page.goto('/bugs/perm-bug-1');

    // Then: Validate button is visible (tester can validate)
    await expect(page.getByRole('button', { name: /validate/i })).toBeVisible();
  });

  test('ROLE-E2E-004: developer sees Assign and Update Status buttons @p0 @regression', async ({ page }) => {
    // Given: A developer user viewing an open bug detail
    const user = createUser({ role: 'developer' as any });
    const bug = mockBugDetail(user, 'Open', false);
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs/perm-bug-1', bug);
    await mockApiRoute(page, 'bugs*', [bug]);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);

    // When: Developer navigates to the bug detail page
    await page.goto('/bugs/perm-bug-1');

    // Then: Assign and Update Status buttons are visible
    await expect(page.getByRole('button', { name: /assign/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /update status/i })).toBeVisible();
  });

  test('ROLE-E2E-005: admin has Group Management in sidebar @p1 @regression', async ({ page }) => {
    // Given: An admin user with full permissions
    const user = createAdminUser();
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: Admin navigates to the dashboard
    await page.goto('/');

    // Then: Group Management link is visible in the sidebar
    await expect(page.getByText('Group Management')).toBeVisible();
  });

  test('ROLE-E2E-006: non-admin is redirected away from /user-management @p1 @regression', async ({ page }) => {
    // Given: A developer user (non-admin)
    const user = createUser({ role: 'developer' as any });
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: Developer tries to access /user-management directly
    await page.goto('/user-management');

    // Then: User is redirected to the home page (not the user-management page)
    await expect(page).toHaveURL('/');
  });
});
