import { test, expect } from '../support/fixtures/merged-fixtures';
import { createBug, createUser, createProject } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';

test.describe('Dashboard', () => {
  test('DASH-E2E-001: stat cards display total, open, in-progress, and resolved counts @p0 @smoke', async ({ page }) => {
    // Given: Bugs exist with various statuses
    const user = createUser({ name: 'Dashboard Viewer' });
    const project = { ...createProject(), id: 'dp-1', createdAt: new Date().toISOString() };
    const bugs = [
      { ...createBug({ status: 'Open' as any, projectId: project.id }), id: 'db-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { ...createBug({ status: 'In Progress' as any, projectId: project.id }), id: 'db-2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { ...createBug({ status: 'Resolved' as any, projectId: project.id }), id: 'db-3', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', bugs);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to the dashboard
    await page.goto('/');

    // Then: All four stat cards are visible
    await expect(page.getByText('Total Bugs')).toBeVisible();
    await expect(page.getByText('Open Bugs')).toBeVisible();
    // Use .first() to avoid strict mode violation with "In Progress" stat card vs badge
    await expect(page.getByText('In Progress').first()).toBeVisible();
    await expect(page.getByText('Resolved').first()).toBeVisible();
  });

  test('DASH-E2E-002: Assigned to Me section shows tabs for Active, Backlog, Review @p1 @regression', async ({ page }) => {
    // Given: User is logged in and on the dashboard
    const user = createUser({ name: 'Assigned Viewer' });
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/');

    // When: Dashboard loads
    // Then: Assigned to Me heading and tab buttons are visible
    await expect(page.getByText('Assigned to Me')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Active', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Backlog', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review', exact: true })).toBeVisible();
  });

  test('DASH-E2E-003: sprint widget displays when active sprint exists @p1 @regression', async ({ page }) => {
    // Given: An active sprint exists
    const user = createUser({ name: 'Sprint Viewer' });
    const project = { ...createProject(), id: 'sw-proj', createdAt: new Date().toISOString() };
    const sprint = {
      id: 'sw-sprint-1',
      name: 'Active Sprint Widget',
      projectId: project.id,
      status: 'active',
      startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      goal: 'Widget test',
    };

    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', [sprint]);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/');

    // When: Dashboard loads with active sprint
    // Then: Sprint widget shows sprint name and days remaining
    await expect(page.getByText('Active Sprint Widget')).toBeVisible();
    await expect(page.getByText(/days left/i)).toBeVisible();
  });

  test('DASH-E2E-004: Report Bug button navigates to /bugs/new @p0 @smoke', async ({ page }) => {
    // Given: User is on the dashboard
    const user = createUser({ name: 'Reporter' });
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/');

    // When: User clicks Report Bug button
    await page.getByRole('button', { name: /report bug/i }).click();

    // Then: Navigation to bug creation page
    await expect(page).toHaveURL(/\/bugs\/new/);
  });
});
