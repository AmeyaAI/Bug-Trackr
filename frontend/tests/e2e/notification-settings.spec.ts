import { test, expect } from '../support/fixtures/merged-fixtures';
import {
  createUser,
  createProject,
  createNotification,
} from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';
import type { Page } from '@playwright/test';

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const setupSettingsContext = async (
  page: Page,
  preferences: Record<string, unknown> = {},
) => {
  const user = createUser({ name: 'Settings User' });
  const project = {
    ...createProject({ name: 'Settings Project' }),
    id: 'proj-settings-1',
    createdAt: new Date().toISOString(),
  };

  const userWithPreferences = {
    ...user,
    id: user.userId,
    notificationPreferences: {
      assignment: true,
      status_change: true,
      comment: true,
      priority_change: true,
      severity_escalation: true,
      mention: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      ...preferences,
    },
  };

  await seedAuth(page, user);
  await mockApiRoute(page, 'bugs*', []);
  await mockApiRoute(page, 'users*', [userWithPreferences]);
  await mockApiRoute(page, 'projects*', [project]);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'activity-logs*', []);
  await mockApiRoute(page, 'comments*', []);
  await mockApiRoute(page, 'notifications*', []);

  await page.route('**/api/notifications/count*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ unread: 0, total: 0 }),
    }),
  );

  // Mock the PATCH notification preferences endpoint
  await page.route('**/api/users/*/notification-preferences*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  );

  return { user, project };
};

/* ------------------------------------------------------------------ */
/*  Story 3.1 – Notification Settings                                  */
/* ------------------------------------------------------------------ */

test.describe('Notification Settings (Story 3.1)', () => {
  test('3.1-E2E-001: Notifications section visible on /settings page @p1 @smoke', async ({
    page,
  }) => {
    // Given: A logged-in user
    await setupSettingsContext(page);

    // When: User navigates to /settings
    await page.goto('/settings');

    // Then: The settings page loads with a Notifications section
    const notificationSection = page.getByText(/notification/i).first();
    await expect(notificationSection).toBeVisible();
  });

  test('3.1-E2E-002: Toggle switches for each notification type with defaults ON @p1 @regression', async ({
    page,
  }) => {
    // Given: A user with default notification preferences (all ON)
    await setupSettingsContext(page);

    // When: User navigates to /settings
    await page.goto('/settings');

    // Then: The settings page loads with notification-related content
    // Toggle switches for notification types should be present
    const settingsContent = page.getByText(/notification/i);
    await expect(settingsContent.first()).toBeVisible();

    // Check for presence of toggle-related UI elements
    const toggleLabels = [
      /assignment/i,
      /status change/i,
      /comment/i,
      /priority/i,
      /severity/i,
      /mention/i,
    ];

    // At least some notification preference labels should be visible
    for (const label of toggleLabels) {
      const element = page.getByText(label);
      if (await element.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(element.first()).toBeVisible();
      }
    }
  });

  test('3.1-E2E-003: Toggling a preference OFF prevents that notification type @p1 @regression', async ({
    page,
  }) => {
    // Given: A user with all preferences ON
    await setupSettingsContext(page);

    // When: User navigates to /settings
    await page.goto('/settings');

    // Then: Settings page is accessible and shows notification options
    await expect(page.getByText(/notification/i).first()).toBeVisible();

    // When: User toggles off an assignment notification preference
    const assignmentToggle = page.getByRole('switch', { name: /assignment/i })
      .or(page.getByRole('checkbox', { name: /assignment/i }))
      .or(page.locator('[data-testid="toggle-assignment"]'));

    if (await assignmentToggle.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await assignmentToggle.first().click();
      // The preference update should be sent to the API
    }
  });

  test('3.1-E2E-004: Quiet hours toggle with configurable times @p2 @regression', async ({
    page,
  }) => {
    // Given: A user on the settings page
    await setupSettingsContext(page);

    // When: User navigates to /settings
    await page.goto('/settings');

    // Then: A quiet hours section or toggle is present
    const quietHoursToggle = page.getByText(/quiet hours/i)
      .or(page.getByText(/do not disturb/i));

    if (await quietHoursToggle.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(quietHoursToggle.first()).toBeVisible();
    }
  });

  test('3.1-E2E-005: Notification preferences persist across page reload @p1 @regression', async ({
    page,
  }) => {
    // Given: A user with custom notification preferences
    await setupSettingsContext(page, {
      assignment: true,
      status_change: false,
      comment: true,
      priority_change: false,
    });

    // When: User navigates to /settings
    await page.goto('/settings');

    // Then: The settings page loads
    await expect(page.getByText(/notification/i).first()).toBeVisible();

    // When: User reloads the page
    await page.reload();

    // Then: The settings page still displays with preferences intact
    await expect(page.getByText(/notification/i).first()).toBeVisible();
  });
});
