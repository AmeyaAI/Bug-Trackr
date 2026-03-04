import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser, createProject, createBug } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import type { Page } from '@playwright/test';
import { seedAuth } from '../support/helpers/auth-seeding';

test.describe('Projects Page', () => {
  test('PROJ-E2E-001: project list displays projects with bug and sprint counts @p0 @smoke', async ({ page }) => {
    // Given: Projects and bugs exist in the system
    const user = createUser();
    const project = { ...createProject({ name: 'Acme Web App' }), id: 'proj-a1', createdAt: new Date().toISOString() };
    const bugs = [
      { ...createBug({ projectId: project.id, status: 'Open' as any }), id: 'pb-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { ...createBug({ projectId: project.id, status: 'Resolved' as any }), id: 'pb-2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    const sprints = [{ id: 'sp-1', name: 'Sprint 1', projectId: project.id, status: 'active', startDate: new Date().toISOString(), endDate: new Date().toISOString(), goal: '' }];

    await seedAuth(page, user);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'bugs*', bugs);
    await mockApiRoute(page, 'sprints*', sprints);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to the projects page
    await page.goto('/projects');

    // Then: Project card shows name and bug counts
    await expect(page.getByText('Acme Web App')).toBeVisible();
    await expect(page.getByText('Total Bugs:')).toBeVisible();
  });

  test('PROJ-E2E-002: project creation form loads with required fields @p1 @regression', async ({ page }) => {
    // Given: An authenticated user
    const user = createUser();
    await seedAuth(page, user);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to the new project page
    await page.goto('/projects/new');

    // Then: Project creation form is displayed
    await expect(page.getByText('Create New Project')).toBeVisible();
    await expect(page.getByPlaceholder('Project name')).toBeVisible();
    await expect(page.getByRole('button', { name: /create project/i })).toBeVisible();
  });

  test('PROJ-E2E-003: clicking View Bugs navigates to project bugs @p1 @regression', async ({ page }) => {
    // Given: A project exists on the projects page
    const user = createUser();
    const project = { ...createProject({ name: 'Navigate Project' }), id: 'proj-nav-1', createdAt: new Date().toISOString() };
    await seedAuth(page, user);
    await mockApiRoute(page, 'projects*', [project]);
    // Mock singular project route for the detail page
    await mockApiRoute(page, `projects/${project.id}`, project);
    await mockApiRoute(page, 'bugs*', { bugs: [], lastEvaluatedKey: null });
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/projects');

    // When: User clicks View Bugs on the project card
    await page.getByRole('button', { name: /view bugs/i }).click();

    // Then: User is navigated to the project detail page
    await expect(page).toHaveURL(/\/projects\/proj-nav-1/);
  });
});
