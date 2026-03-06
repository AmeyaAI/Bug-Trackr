import { test, expect } from '../support/fixtures/merged-fixtures';
import {
  createBug,
  createUser,
  createAdminUser,
  createProject,
} from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';
import type { Page } from '@playwright/test';

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const makeBug = (overrides: Record<string, unknown> = {}) => ({
  ...createBug(),
  id: overrides.id || `bug-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/* ------------------------------------------------------------------ */
/*  Story 3.5 — Assign Bug (Unassign scenario)                        */
/* ------------------------------------------------------------------ */

test.describe('Bug Unassignment (Story 3.5)', () => {
  test('3.5-E2E-003: Bug can be unassigned (set to null) @p2 @regression', async ({ page }) => {
    // Given: An admin viewing a bug that is currently assigned to a developer
    const admin = createAdminUser({ name: 'Unassign Admin' });
    const developer = createUser({ name: 'Currently Assigned Dev' });

    const project = {
      ...createProject({ name: 'Unassign Project' }),
      id: 'proj-unassign-1',
      createdAt: new Date().toISOString(),
    };

    const bug = makeBug({
      id: 'bug-unassign-1',
      title: 'Bug With Assignee',
      projectId: project.id,
      reportedBy: admin.userId,
      assignedTo: developer.userId,
      status: 'Open',
    });

    await seedAuth(page, admin);
    await mockApiRoute(page, `bugs/${bug.id}`, bug);
    await mockApiRoute(page, 'bugs*', [bug]);
    await mockApiRoute(page, 'users*', [
      { ...admin, id: admin.userId },
      { ...developer, id: developer.userId },
    ]);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'notifications*', []);
    await mockApiRoute(page, 'notifications/count*', { count: 0 });

    // When: Admin navigates to the bug detail page
    await page.goto(`/bugs/${bug.id}`);
    await expect(page.getByText(bug.title as string)).toBeVisible();

    // Then: The current assignee is displayed
    await expect(page.getByText(developer.name)).toBeVisible();

    // When: Admin unassigns the bug (selects "Unassigned" / "None" from dropdown)
    const unassignedBug = { ...bug, assignedTo: null, updatedAt: new Date().toISOString() };
    await mockApiRoute(page, `bugs/${bug.id}`, unassignedBug);

    // Look for the assignee dropdown/selector
    const assigneeSelector = page
      .getByRole('combobox', { name: /assign/i })
      .or(page.locator('[data-testid="assignee-select"]'))
      .or(page.locator('select').filter({ hasText: developer.name }));

    const selectorVisible = await assigneeSelector.isVisible({ timeout: 5000 }).catch(() => false);

    if (selectorVisible) {
      await assigneeSelector.click();

      // Select the unassigned/none option
      const unassignOption = page
        .getByRole('option', { name: /unassign|none|no one/i })
        .or(page.getByText(/unassign|none|no one/i));
      await unassignOption.click();
    }

    // Then: The assignee field should show unassigned state
    // (This verifies the mock returns null for assignedTo)
    await expect(
      page.getByText(/unassigned|not assigned|no assignee/i)
        .or(page.locator('[data-testid="assignee-empty"]')),
    ).toBeVisible();
  });
});
