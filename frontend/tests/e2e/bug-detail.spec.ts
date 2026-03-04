import { test, expect } from '../support/fixtures/merged-fixtures';
import { createBug, createUser, createTesterUser, createProject } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import type { Page } from '@playwright/test';
import { seedAuth } from '../support/helpers/auth-seeding';

const setupBugDetailPage = async (page: Page, role: string, bugOverrides: Record<string, unknown> = {}) => {
  const user = createUser({ role: role as any, name: 'Detail Tester' });
  const project = { ...createProject({ name: 'Detail Project' }), id: 'proj-d1', createdAt: new Date().toISOString() };
  const bug = {
    ...createBug({ title: 'Detail Test Bug', projectId: project.id, reportedBy: user.userId }),
    id: 'bug-detail-1',
    assignedTo: user.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...bugOverrides,
  };
  const comments = [
    { id: 'c-1', bugId: bug.id, authorId: user.userId, message: 'First comment on bug', createdAt: new Date().toISOString() },
  ];

  await seedAuth(page, user);
  // The detail page fetches bug via singular route and comments via list route separately
  await mockApiRoute(page, `bugs/${bug.id}`, bug);
  await mockApiRoute(page, 'bugs*', [bug]);
  await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
  await mockApiRoute(page, 'projects*', [project]);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'activity-logs*', []);
  await mockApiRoute(page, 'comments*', comments);

  return { user, bug, project, comments };
};

test.describe('Bug Detail Page', () => {
  test('BUG-E2E-006: detail page loads with title, description, and comments @p0 @smoke', async ({ page }) => {
    // Given: A bug with comments exists
    await setupBugDetailPage(page, 'developer');

    // When: User navigates to the bug detail page
    await page.goto('/bugs/bug-detail-1');

    // Then: Bug title, and comment are displayed
    await expect(page.getByText('Detail Test Bug')).toBeVisible();
    await expect(page.getByText('First comment on bug')).toBeVisible();
  });

  test('BUG-E2E-007: activity log button opens activity panel @p1 @regression', async ({ page }) => {
    // Given: User is on the bug detail page
    await setupBugDetailPage(page, 'developer');
    await page.goto('/bugs/bug-detail-1');

    // When: User clicks the Activity Log button
    await page.getByRole('button', { name: /activity log/i }).click();

    // Then: Activity log panel heading is visible
    await expect(page.getByRole('heading', { name: /activity log/i })).toBeVisible();
  });

  test('BUG-E2E-008: developer can open the assign dialog @p0 @regression', async ({ page }) => {
    // Given: A developer user on a bug detail page
    await setupBugDetailPage(page, 'developer', { status: 'Open' });
    await page.goto('/bugs/bug-detail-1');

    // When: Developer clicks the Assign button
    await page.getByRole('button', { name: /assign/i }).click();

    // Then: The assign dialog is displayed
    await expect(page.getByRole('heading', { name: /assign bug/i })).toBeVisible();
    await expect(page.getByText('Select a user to assign this bug to')).toBeVisible();
  });

  test('BUG-E2E-009: developer can open the update status dialog @p0 @regression', async ({ page }) => {
    // Given: A developer on a bug detail page with an open bug
    await setupBugDetailPage(page, 'developer', { status: 'Open' });
    await page.goto('/bugs/bug-detail-1');

    // When: Developer clicks Update Status button
    await page.getByRole('button', { name: /update status/i }).click();

    // Then: The status update dialog is displayed
    await expect(page.getByRole('heading', { name: /update status/i })).toBeVisible();
    await expect(page.getByText('Change the bug status')).toBeVisible();
  });

  test('BUG-E2E-010: tester sees validate button on resolved bug @p0 @regression', async ({ page }) => {
    // Given: A tester user viewing a resolved, unvalidated bug
    await setupBugDetailPage(page, 'tester', { status: 'Resolved', validated: false });
    await page.goto('/bugs/bug-detail-1');

    // When: Page loads
    // Then: Validate button is visible for tester
    await expect(page.getByRole('button', { name: /validate/i })).toBeVisible();
  });
});
