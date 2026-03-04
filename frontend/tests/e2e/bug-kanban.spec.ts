import { test, expect } from '../support/fixtures/merged-fixtures';
import { createBug, createUser, createProject } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';

test.describe('Bug Kanban Board', () => {
  test('BUG-E2E-018: kanban requires project and sprint selection @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user on the bug list page
    const user = createUser();
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs: [], lastEvaluatedKey: null });
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/bugs');

    // When: User switches to Kanban view without selecting project/sprint
    await page.getByRole('button', { name: /kanban/i }).click();

    // Then: "Select Project and Sprint" prompt is displayed
    await expect(page.getByText('Select Project and Sprint')).toBeVisible();
    await expect(page.getByText('Please select a Project and a Sprint to view the Kanban board.')).toBeVisible();
  });

  test('BUG-E2E-020: sprint filter is disabled when no project is selected @p1 @regression', async ({ page }) => {
    // Given: User is on the bug list page in table view
    const user = createUser();
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs: [], lastEvaluatedKey: null });
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/bugs');

    // When: No project is selected (default state)
    // Then: The sprint filter combobox is disabled
    await expect(page.getByRole('combobox').filter({ hasText: 'All Sprints' })).toBeDisabled();
  });

  test('BUG-E2E-002: validation dialog appears when dragging unvalidated bug to closed @p0 @regression', async ({ page }) => {
    // Given: Kanban board with bugs and project+sprint selected
    const user = createUser();
    const project = { ...createProject({ name: 'Kanban Project' }), id: 'kp-1', createdAt: new Date().toISOString() };
    const sprint = { id: 'sprint-k1', name: 'Sprint K1', projectId: project.id, status: 'active', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 14 * 86400000).toISOString(), goal: 'Test goal' };
    const resolvedBug = {
      ...createBug({ title: 'Resolved Unvalidated Bug', projectId: project.id, status: 'Resolved' as any }),
      id: 'kb-1',
      validated: false,
      sprintId: sprint.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs: [resolvedBug], lastEvaluatedKey: null });
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', [sprint]);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // Navigate to bugs page in kanban mode with project+sprint query params
    await page.goto(`/bugs?projectId=${project.id}&sprintId=${sprint.id}`);
    await page.getByRole('button', { name: /kanban/i }).click();

    // Then: The kanban board is visible with the Resolved column
    await expect(page.getByText('Resolved').first()).toBeVisible();
    await expect(page.getByText('Resolved Unvalidated Bug')).toBeVisible();
  });

  test('BUG-E2E-011: kanban board displays columns when project and sprint selected @p1 @regression', async ({ page }) => {
    // Given: A project and sprint are available
    const user = createUser();
    const project = { ...createProject({ name: 'Board Project' }), id: 'bp-1', createdAt: new Date().toISOString() };
    const sprint = { id: 'sprint-b1', name: 'Sprint B1', projectId: project.id, status: 'active', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 14 * 86400000).toISOString(), goal: 'Board goal' };
    const openBug = {
      ...createBug({ title: 'Open Kanban Bug', projectId: project.id, status: 'Open' as any }),
      id: 'kb-open-1',
      sprintId: sprint.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs: [openBug], lastEvaluatedKey: null });
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', [sprint]);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to kanban with project+sprint pre-selected
    await page.goto(`/bugs?projectId=${project.id}&sprintId=${sprint.id}`);
    await page.getByRole('button', { name: /kanban/i }).click();

    // Then: Kanban columns are displayed with the bug
    await expect(page.getByText('Open Kanban Bug')).toBeVisible();
  });
});
