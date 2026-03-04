import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser, createProject } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import type { Page } from '@playwright/test';
import { seedAuth } from '../support/helpers/auth-seeding';

test.describe('Sprints Page', () => {
  test('SPRINT-E2E-001: sprint list displays for a project @p1 @regression', async ({ page }) => {
    // Given: A project with sprints exists
    const user = createUser();
    const project = { ...createProject({ name: 'Sprint Project' }), id: 'proj-sp1', createdAt: new Date().toISOString() };
    const sprints = [
      { id: 'sp-1', name: 'Sprint Alpha', projectId: project.id, status: 'active', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 14 * 86400000).toISOString(), goal: 'Complete login module' },
      { id: 'sp-2', name: 'Sprint Beta', projectId: project.id, status: 'planned', startDate: new Date(Date.now() + 15 * 86400000).toISOString(), endDate: new Date(Date.now() + 28 * 86400000).toISOString(), goal: 'Build dashboard' },
    ];

    await seedAuth(page, user);
    await mockApiRoute(page, `projects/${project.id}`, project);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', sprints);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to the project sprints page
    await page.goto(`/projects/${project.id}/sprints`);

    // Then: Sprint cards are displayed with names
    await expect(page.getByRole('heading', { name: 'Sprint Board' })).toBeVisible();
    await expect(page.getByText('Sprint Alpha')).toBeVisible();
    await expect(page.getByText('Sprint Beta')).toBeVisible();
  });

  test('SPRINT-E2E-002: create sprint dialog opens @p1 @regression', async ({ page }) => {
    // Given: User is on the project sprints page
    const user = createUser();
    const project = { ...createProject({ name: 'Sprint Create Project' }), id: 'proj-sp2', createdAt: new Date().toISOString() };

    await seedAuth(page, user);
    await mockApiRoute(page, `projects/${project.id}`, project);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto(`/projects/${project.id}/sprints`);

    // When: User clicks the first Create Sprint button (header button)
    await page.getByRole('button', { name: /create sprint/i }).first().click();

    // Then: Create sprint dialog is visible
    await expect(page.getByRole('heading', { name: /create.*sprint/i })).toBeVisible();
  });
});
