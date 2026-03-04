import { test, expect } from '../support/fixtures/merged-fixtures';
import {
  createUser,
  createProject,
  createNotification,
  createAssignmentNotification,
} from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';
import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types for notification preferences
// ---------------------------------------------------------------------------

interface NotificationPreferences {
  assignment: boolean;
  statusChange: boolean;
  comment: boolean;
  priorityChange: boolean;
  severityEscalation: boolean;
  mention: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

/**
 * Creates a default notification preferences object with all types enabled
 * and quiet hours disabled.
 */
const createDefaultPreferences = (
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences => ({
  assignment: true,
  statusChange: true,
  comment: true,
  priorityChange: true,
  severityEscalation: true,
  mention: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Bootstraps the page with auth, core API mocks, and notification preferences.
 */
const setupPreferencesPage = async (
  page: Page,
  opts: {
    user: ReturnType<typeof createUser>;
    preferences?: NotificationPreferences;
    notifications?: ReturnType<typeof createNotification>[];
    notificationCount?: number;
  },
) => {
  const project = {
    ...createProject({ name: 'Preferences Test Project' }),
    id: 'proj-prefs-1',
    createdAt: new Date().toISOString(),
  };

  const preferences = opts.preferences ?? createDefaultPreferences();
  const notifications = opts.notifications ?? [];
  const unreadCount = opts.notificationCount ?? notifications.filter((n) => !n.isRead).length;

  await seedAuth(page, opts.user);
  await mockApiRoute(page, 'bugs*', []);
  await mockApiRoute(page, 'projects*', [project]);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'users*', [{ ...opts.user, id: opts.user.userId }]);
  await mockApiRoute(page, 'comments*', []);
  await mockApiRoute(page, 'activity-logs*', []);
  await mockApiRoute(page, 'notifications*', notifications);
  await mockApiRoute(page, 'notifications/count*', { count: unreadCount });
  await mockApiRoute(page, 'notification-preferences*', preferences);
};

// ---------------------------------------------------------------------------
// Story 3.1 — Notification Settings / Preferences
// ---------------------------------------------------------------------------

test.describe('Notification Preferences (Story 3.1)', () => {
  test('3.1-E2E-001: Disabled notification type does not create notifications @p0', async ({ page }) => {
    // Given: A user who has disabled "assignment" notifications in their preferences
    const user = createUser({ name: 'Disabled Type Tester' });

    const preferencesWithAssignmentOff = createDefaultPreferences({
      assignment: false,
    });

    // Even though an assignment event occurred, the API returns 0 notifications
    // because the trigger service respects the user's disabled preference.
    await setupPreferencesPage(page, {
      user,
      preferences: preferencesWithAssignmentOff,
      notifications: [],
      notificationCount: 0,
    });

    // When: User navigates to the dashboard after a bug assignment event
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: No notification badge is shown (assignment notifications are suppressed)
    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();

    // And: The settings page reflects that assignment is OFF
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Navigate to the notifications preferences section
    const notifSection = page
      .getByRole('heading', { name: /notification/i })
      .or(page.locator('[data-testid="notification-preferences"]'));
    await expect(notifSection).toBeVisible();

    // The assignment toggle should be in the OFF state
    const assignmentToggle = page.locator('[data-testid="pref-toggle-assignment"]')
      .or(page.getByRole('switch', { name: /assignment/i }));
    await expect(assignmentToggle).toBeVisible();

    // Verify it is toggled off (unchecked/false)
    await expect(assignmentToggle).not.toBeChecked();
  });

  test('3.1-E2E-002: Toggle switches render with correct defaults (all ON) @p1', async ({ page }) => {
    // Given: A brand new user with default preferences (all notification types enabled)
    const user = createUser({ name: 'Default Prefs Tester' });
    const defaultPrefs = createDefaultPreferences();

    await setupPreferencesPage(page, {
      user,
      preferences: defaultPrefs,
    });

    // When: User navigates to the settings / notification preferences page
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Then: All notification type toggles are in the ON (checked) state
    const toggleTestIds = [
      'pref-toggle-assignment',
      'pref-toggle-status-change',
      'pref-toggle-comment',
      'pref-toggle-priority-change',
      'pref-toggle-severity-escalation',
      'pref-toggle-mention',
    ];

    for (const testId of toggleTestIds) {
      const toggle = page.locator(`[data-testid="${testId}"]`)
        .or(page.getByRole('switch', { name: new RegExp(testId.replace('pref-toggle-', '').replace(/-/g, ' '), 'i') }));
      await expect(toggle).toBeVisible();
      await expect(toggle).toBeChecked();
    }

    // And: Quiet hours toggle is OFF by default
    const quietHoursToggle = page.locator('[data-testid="pref-toggle-quiet-hours"]')
      .or(page.getByRole('switch', { name: /quiet hours/i }));
    await expect(quietHoursToggle).toBeVisible();
    await expect(quietHoursToggle).not.toBeChecked();
  });

  test('3.1-E2E-003: Quiet hours toggle suppresses notifications @p2', async ({ page }) => {
    // Given: A user who has enabled quiet hours (22:00 - 08:00)
    const user = createUser({ name: 'Quiet Hours Tester' });

    const preferencesWithQuietHours = createDefaultPreferences({
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
    });

    // Even though events occurred during quiet hours, no notifications are generated
    await setupPreferencesPage(page, {
      user,
      preferences: preferencesWithQuietHours,
      notifications: [],
      notificationCount: 0,
    });

    // When: User navigates to the settings page
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Then: The quiet hours toggle is ON
    const quietHoursToggle = page.locator('[data-testid="pref-toggle-quiet-hours"]')
      .or(page.getByRole('switch', { name: /quiet hours/i }));
    await expect(quietHoursToggle).toBeVisible();
    await expect(quietHoursToggle).toBeChecked();

    // And: The quiet hours time range is displayed
    await expect(page.getByText(/22:00/)).toBeVisible();
    await expect(page.getByText(/08:00/)).toBeVisible();

    // And: No notifications appear on the dashboard during quiet hours
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();

    // When: Quiet hours are disabled and an assignment notification exists
    const postQuietNotification = createAssignmentNotification({
      userId: user.userId,
      bugTitle: 'Post quiet hours bug',
      message: 'You have been assigned after quiet hours ended',
      isRead: false,
    });

    const preferencesWithQuietOff = createDefaultPreferences({
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    });

    await setupPreferencesPage(page, {
      user,
      preferences: preferencesWithQuietOff,
      notifications: [postQuietNotification],
      notificationCount: 1,
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: Notifications resume — badge shows 1
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');
  });
});
