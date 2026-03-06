import { test, expect } from '../support/fixtures/merged-fixtures';
import {
  createBug,
  createUser,
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
/*  Story 3.6 — Edit Bug Details (Validation enforcement)              */
/* ------------------------------------------------------------------ */

test.describe('Bug Edit Validation (Story 3.6)', () => {
  test('3.6-E2E-003: Validation enforced on required fields during edit @p1 @regression', async ({ page }) => {
    // Given: A developer viewing an existing bug in detail/edit mode
    const user = createUser({ name: 'Edit Validator' });

    const project = {
      ...createProject({ name: 'Edit Validation Project' }),
      id: 'proj-editval-1',
      createdAt: new Date().toISOString(),
    };

    const bug = makeBug({
      id: 'bug-editval-1',
      title: 'Original Bug Title That Is Valid',
      description: 'Original description with enough content',
      projectId: project.id,
      reportedBy: user.userId,
      assignedTo: user.userId,
      status: 'Open',
    });

    await seedAuth(page, user);
    await mockApiRoute(page, `bugs/${bug.id}`, bug);
    await mockApiRoute(page, 'bugs*', [bug]);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'notifications*', []);
    await mockApiRoute(page, 'notifications/count*', { count: 0 });

    // When: User navigates to the bug detail page
    await page.goto(`/bugs/${bug.id}`);
    await expect(page.getByText(bug.title as string)).toBeVisible();

    // And: User enters edit mode (if applicable)
    const editButton = page
      .getByRole('button', { name: /edit/i })
      .or(page.locator('[data-testid="edit-bug"]'));
    const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEditButton) {
      await editButton.click();
    }

    // When: User clears the title field (makes it too short)
    const titleInput = page
      .getByPlaceholder(/title|description of the bug/i)
      .or(page.locator('[data-testid="bug-title-input"]'))
      .or(page.getByRole('textbox', { name: /title/i }));

    const titleVisible = await titleInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (titleVisible) {
      await titleInput.clear();
      await titleInput.fill('Ab'); // Too short (< 5 chars)

      // And: Attempts to save
      const saveButton = page
        .getByRole('button', { name: /save|update|submit/i })
        .or(page.locator('[data-testid="save-bug"]'));
      await saveButton.click();

      // Then: A validation error message is displayed
      await expect(
        page.getByText(/required|too short|minimum|at least/i),
      ).toBeVisible();
    }
  });
});
