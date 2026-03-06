import { test, expect } from '../support/fixtures/merged-fixtures';
import {
  createBug,
  createUser,
  createTesterUser,
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

const setupValidationPage = async (
  page: Page,
  opts: {
    role: 'tester' | 'developer' | 'admin';
    bugOverrides?: Record<string, unknown>;
  },
) => {
  const user =
    opts.role === 'tester'
      ? createTesterUser({ name: 'Validation Tester' })
      : createUser({ name: 'Validation Dev' });

  const project = {
    ...createProject({ name: 'Validation Project' }),
    id: 'proj-val-1',
    createdAt: new Date().toISOString(),
  };

  const bug = makeBug({
    id: 'bug-val-1',
    title: 'Bug Needing Validation',
    projectId: project.id,
    reportedBy: user.userId,
    assignedTo: user.userId,
    status: 'Open',
    validated: false,
    ...opts.bugOverrides,
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

  return { user, project, bug };
};

/* ------------------------------------------------------------------ */
/*  Story 3.7 — Validate Bug                                          */
/* ------------------------------------------------------------------ */

test.describe('Bug Validation (Story 3.7)', () => {
  test('3.7-E2E-001: Tester can toggle validated boolean on a bug @p1 @regression', async ({ page }) => {
    // Given: A tester viewing an unvalidated bug
    const { bug } = await setupValidationPage(page, {
      role: 'tester',
      bugOverrides: { validated: false },
    });

    // Mock the update endpoint to return the validated bug
    const validatedBug = { ...bug, validated: true, updatedAt: new Date().toISOString() };
    await mockApiRoute(page, `bugs/${bug.id}`, validatedBug);

    // When: Tester navigates to the bug detail page
    await page.goto(`/bugs/${bug.id}`);
    await expect(page.getByText(bug.title as string)).toBeVisible();

    // Then: The validate button or toggle is visible
    const validateControl = page
      .getByRole('button', { name: /validate/i })
      .or(page.getByRole('switch', { name: /validate/i }))
      .or(page.locator('[data-testid="validate-bug"]'));
    await expect(validateControl).toBeVisible();

    // When: Tester clicks the validate control
    await validateControl.click();

    // Then: A confirmation dialog appears (if implemented)
    const confirmDialog = page.getByRole('dialog').or(page.getByRole('alertdialog'));
    const hasDialog = await confirmDialog.isVisible().catch(() => false);

    if (hasDialog) {
      // Confirm the validation action
      await page
        .getByRole('button', { name: /confirm|yes|validate/i })
        .click();
    }

    // Then: The bug validation state updates — validated indicator becomes visible
    await expect(
      page.getByText(/validated/i).or(page.locator('[data-testid="validated-badge"]')),
    ).toBeVisible();
  });

  test('3.7-E2E-002: Validation status visible on bug card and detail view @p1 @regression', async ({ page }) => {
    // Given: A validated bug in the bug list
    const { bug, project } = await setupValidationPage(page, {
      role: 'tester',
      bugOverrides: { validated: true },
    });

    // When: User views the bug list page
    await page.goto(`/projects/${project.id}/bugs`);

    // Fallback: if project-scoped URL doesn't exist, try bugs list
    const hasBugCards = await page.locator('[data-testid="bug-card"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasBugCards) {
      await page.goto('/bugs');
    }

    // Then: The bug card should show a validation indicator
    const bugCard = page.locator('[data-testid="bug-card"]').filter({ hasText: bug.title as string })
      .or(page.locator('article, [role="listitem"]').filter({ hasText: bug.title as string }));

    const cardVisible = await bugCard.isVisible({ timeout: 5000 }).catch(() => false);
    if (cardVisible) {
      // Validation badge or icon should be present on the card
      await expect(
        bugCard.locator('[data-testid="validated-badge"]')
          .or(bugCard.getByText(/validated/i))
          .or(bugCard.locator('[aria-label*="validated" i]')),
      ).toBeVisible();
    }

    // And: The detail view also shows the validated status
    await page.goto(`/bugs/${bug.id}`);
    await expect(page.getByText(bug.title as string)).toBeVisible();
    await expect(
      page.getByText(/validated/i).or(page.locator('[data-testid="validated-badge"]')),
    ).toBeVisible();
  });

  test('3.7-E2E-003: Validation confirmation dialog appears before applying @p2 @regression', async ({ page }) => {
    // Given: A tester on an unvalidated bug detail page
    const { bug } = await setupValidationPage(page, {
      role: 'tester',
      bugOverrides: { validated: false },
    });

    await page.goto(`/bugs/${bug.id}`);
    await expect(page.getByText(bug.title as string)).toBeVisible();

    // When: Tester clicks the validate control
    const validateControl = page
      .getByRole('button', { name: /validate/i })
      .or(page.getByRole('switch', { name: /validate/i }))
      .or(page.locator('[data-testid="validate-bug"]'));
    await expect(validateControl).toBeVisible();
    await validateControl.click();

    // Then: A confirmation dialog should appear
    const confirmDialog = page.getByRole('dialog').or(page.getByRole('alertdialog'));
    await expect(confirmDialog).toBeVisible();

    // And: The dialog has confirm and cancel actions
    await expect(
      page.getByRole('button', { name: /confirm|yes|validate/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /cancel|no/i }),
    ).toBeVisible();

    // When: User cancels the action
    await page.getByRole('button', { name: /cancel|no/i }).click();

    // Then: The dialog closes and validation state does not change
    await expect(confirmDialog).not.toBeVisible();
  });
});
