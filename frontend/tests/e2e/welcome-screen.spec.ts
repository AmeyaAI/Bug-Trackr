import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser, createProject } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth, seedAuthWithWelcome } from '../support/helpers/auth-seeding';

/* ------------------------------------------------------------------ */
/*  Story 6.3 — Welcome Screen                                        */
/* ------------------------------------------------------------------ */

test.describe('Welcome Screen (Story 6.3)', () => {
  test('6.3-E2E-001: Welcome screen shown when no project is selected @p2 @regression', async ({ page }) => {
    // Given: An authenticated user who has NOT seen the welcome screen yet
    const user = createUser({ name: 'Welcome Tester' });

    await seedAuthWithWelcome(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', []);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'notifications*', []);
    await mockApiRoute(page, 'notifications/count*', { count: 0 });

    // When: User navigates to the home page without selecting a project
    await page.goto('/');

    // Then: A welcome or onboarding screen is displayed
    await expect(
      page.getByText(/welcome|get started|onboarding/i),
    ).toBeVisible();
  });

  test('6.3-E2E-002: Welcome screen provides quick actions to create or view projects @p2 @regression', async ({ page }) => {
    // Given: An authenticated user on the welcome screen
    const user = createUser({ name: 'Quick Action Tester' });
    const project = {
      ...createProject({ name: 'Existing Project' }),
      id: 'proj-welcome-1',
      createdAt: new Date().toISOString(),
    };

    await seedAuthWithWelcome(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'notifications*', []);
    await mockApiRoute(page, 'notifications/count*', { count: 0 });

    // When: User navigates to the home page
    await page.goto('/');

    // Then: The welcome screen displays quick action options
    await expect(
      page.getByText(/welcome|get started|onboarding/i),
    ).toBeVisible();

    // And: There is a way to create a project or view existing ones
    const createAction = page
      .getByRole('button', { name: /create.*project/i })
      .or(page.getByRole('link', { name: /create.*project/i }))
      .or(page.locator('[data-testid="create-project-action"]'));

    const viewAction = page
      .getByRole('button', { name: /view.*project|browse.*project|existing/i })
      .or(page.getByRole('link', { name: /view.*project|browse.*project|existing/i }))
      .or(page.locator('[data-testid="view-projects-action"]'));

    // At least one quick action should be visible
    const hasCreate = await createAction.isVisible().catch(() => false);
    const hasView = await viewAction.isVisible().catch(() => false);

    expect(hasCreate || hasView).toBe(true);
  });
});
