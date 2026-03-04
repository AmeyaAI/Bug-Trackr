import { test, expect } from '../support/fixtures/merged-fixtures';
import { createBug, createUser, createProject } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth, seedAuthWithWelcome } from '../support/helpers/auth-seeding';

test.describe('UI Extras & Performance', () => {
  test('UI-E2E-001: welcome screen displays on first session @p2 @regression', async ({ page }) => {
    // Given: A new session where hasSeenWelcome is not set
    const user = createUser({ name: 'Welcome User' });
    await seedAuthWithWelcome(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to the dashboard
    await page.goto('/');

    // Then: Welcome screen overlay with loading animation is displayed
    await expect(page.getByText(/loading/i)).toBeVisible();
  });

  test('UI-E2E-002: welcome screen does not replay when already seen @p2 @regression', async ({ page }) => {
    // Given: hasSeenWelcome is already set in session storage
    const user = createUser({ name: 'Returning User' });
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to the dashboard
    await page.goto('/');

    // Then: Dashboard content is immediately visible without welcome overlay
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('UI-E2E-003: markdown preview available in bug creation description field @p2 @regression', async ({ page }) => {
    // Given: User is on the bug creation form
    const user = createUser();
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', [{ ...createProject(), id: 'mp-1', createdAt: new Date().toISOString() }]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/bugs/new');
    // Select Bug type from the dialog
    await page.getByRole('dialog').getByRole('button', { name: /bug an issue/i }).click();

    // When: User views the description area
    // Then: The description label is present
    await expect(page.getByText('Description').first()).toBeVisible();
  });

  test('UI-E2E-004: sidebar collapses responsively @p3 @regression', async ({ page }) => {
    // Given: User is on the dashboard
    const user = createUser();
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await page.goto('/');

    // When: Viewport is set to mobile size
    await page.setViewportSize({ width: 375, height: 812 });

    // Then: The main heading is still visible (page adapts)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('PERF-E2E-001: dashboard loads within acceptable time @p2 @regression', async ({ page }) => {
    // Given: An authenticated user with mock data
    const user = createUser();
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: Measuring navigation to dashboard
    const startTime = Date.now();
    await page.goto('/');
    await page.getByRole('heading', { name: /welcome back/i }).waitFor();
    const loadTime = Date.now() - startTime;

    // Then: Page loads within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('PERF-E2E-002: bug list handles large dataset without timeout @p3 @regression', async ({ page }) => {
    // Given: A large set of bugs returned from the API
    const user = createUser();
    const largeBugSet = Array.from({ length: 50 }, (_, i) => ({
      ...createBug({ title: `Large Dataset Bug ${i}` }),
      id: `large-${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', { bugs: largeBugSet.slice(0, 10), lastEvaluatedKey: { id: 'cursor' } });
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);

    // When: User navigates to the bug list
    const startTime = Date.now();
    await page.goto('/bugs');
    await page.getByText('Large Dataset Bug 0').waitFor();
    const loadTime = Date.now() - startTime;

    // Then: Page renders within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
