import { test, expect } from '../support/fixtures/merged-fixtures';
import { createBug, createUser } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';

test.describe('Bug List Page', () => {
  test('should display a list of bugs', async ({ page }) => {
    // Given: An authenticated user and API returns a list of bugs
    const user = createUser();
    const bugs = [
      { ...createBug({ title: 'Login button broken' }), id: '1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { ...createBug({ title: 'Dashboard loading slow' }), id: '2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs, lastEvaluatedKey: null });
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to the bugs page
    await page.goto('/bugs');

    // Then: Bug titles are visible
    await expect(page.getByText('Login button broken')).toBeVisible();
    await expect(page.getByText('Dashboard loading slow')).toBeVisible();
  });

  test('should navigate to bug detail page', async ({ page }) => {
    // Given: An authenticated user and API returns a bug list and detail
    const user = createUser();
    const bug = {
      ...createBug({ title: 'Critical auth issue' }),
      id: 'bug-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs: [bug], lastEvaluatedKey: null });
    await mockApiRoute(page, `bugs/${bug.id}`, bug);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to bugs and clicks a bug (opens in new tab via window.open)
    await page.goto('/bugs');
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByText('Critical auth issue').click(),
    ]);

    // Then: Bug detail page is shown in the new tab
    await expect(popup).toHaveURL(/\/bugs\/bug-1/);
  });
});
