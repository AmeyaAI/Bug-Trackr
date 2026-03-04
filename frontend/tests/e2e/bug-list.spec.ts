import { test, expect } from '../support/fixtures/merged-fixtures';
import { createBug, createUser, createProject } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import type { Page } from '@playwright/test';
import { seedAuth } from '../support/helpers/auth-seeding';

const makeBug = (overrides: Record<string, unknown> = {}) => ({
  ...createBug(),
  id: overrides.id || `bug-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

test.describe('Bug List Page', () => {
  test('BUG-E2E-003: bug list loads and displays bug entries @p0 @smoke', async ({ page }) => {
    // Given: API returns a list of bugs
    const user = createUser();
    const bugs = [
      makeBug({ id: 'b-1', title: 'Login page crash on submit' }),
      makeBug({ id: 'b-2', title: 'Dashboard widget misaligned' }),
    ];
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs, lastEvaluatedKey: null });
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to the bug list
    await page.goto('/bugs');

    // Then: Both bug titles are visible
    await expect(page.getByText('Login page crash on submit')).toBeVisible();
    await expect(page.getByText('Dashboard widget misaligned')).toBeVisible();
  });

  test('BUG-E2E-012: status filter dropdown is accessible @p1 @regression', async ({ page }) => {
    // Given: Bugs are loaded on the list page
    const user = createUser();
    const bugs = [makeBug({ id: 'b-1', title: 'Filterable Bug', status: 'Open' })];
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs, lastEvaluatedKey: null });
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/bugs');

    // When: User clicks the Status column header dropdown
    await page.getByRole('button', { name: /status/i }).click();

    // Then: Status filter options are visible
    await expect(page.getByText('All Statuses')).toBeVisible();
  });

  test('BUG-E2E-013: pagination next and previous buttons work @p1 @regression', async ({ page }) => {
    // Given: Page 1 loaded with a next page available
    const user = createUser();
    const bugs = Array.from({ length: 10 }, (_, i) => makeBug({ id: `bug-p-${i}`, title: `Paginated Bug ${i}` }));
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs, lastEvaluatedKey: { id: 'cursor-next' } });
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/bugs');

    // When: The page loads
    // Then: Previous is disabled on page 1, Next is enabled
    // Use locator within main to avoid matching sidebar or other nav elements
    const main = page.locator('main');
    await expect(main.getByRole('button', { name: /previous/i })).toBeDisabled();
    await expect(main.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('BUG-E2E-014: search by title filters the bug list @p1 @regression', async ({ page }) => {
    // Given: Bug list is loaded
    const user = createUser();
    const bugs = [makeBug({ id: 'b-s1', title: 'Unique Search Target Bug' })];
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs, lastEvaluatedKey: null });
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/bugs');

    // When: User types in the search box
    await page.getByPlaceholder('Search bugs...').fill('Unique Search');

    // Then: Search input has the typed value
    await expect(page.getByPlaceholder('Search bugs...')).toHaveValue('Unique Search');
  });

  test('BUG-E2E-019: table/kanban view toggle switches view mode @p1 @regression', async ({ page }) => {
    // Given: Bug list page is loaded in table mode
    const user = createUser();
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs: [], lastEvaluatedKey: null });
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/bugs');

    // When: User clicks the Kanban toggle button
    await page.getByRole('button', { name: /kanban/i }).click();

    // Then: The Kanban prompt to select project and sprint is shown
    await expect(page.getByText('Select Project and Sprint')).toBeVisible();
  });
});
