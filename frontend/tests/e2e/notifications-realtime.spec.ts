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
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Bootstraps the page with auth and core API mocks.
 * Notification-specific mocks are configured per-test so they can be
 * updated mid-test to simulate real-time arrivals.
 */
const setupRealtimePage = async (
  page: Page,
  opts: {
    user: ReturnType<typeof createUser>;
    initialNotifications?: ReturnType<typeof createNotification>[];
    initialUnreadCount?: number;
  },
) => {
  const project = {
    ...createProject({ name: 'Realtime Test Project' }),
    id: 'proj-rt-1',
    createdAt: new Date().toISOString(),
  };

  const notifications = opts.initialNotifications ?? [];
  const unreadCount = opts.initialUnreadCount ?? notifications.filter((n) => !n.isRead).length;

  await seedAuth(page, opts.user);
  await mockApiRoute(page, 'bugs*', []);
  await mockApiRoute(page, 'projects*', [project]);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'users*', [{ ...opts.user, id: opts.user.userId }]);
  await mockApiRoute(page, 'comments*', []);
  await mockApiRoute(page, 'activity-logs*', []);
  await mockApiRoute(page, 'notifications*', notifications);
  await mockApiRoute(page, 'notifications/count*', { count: unreadCount });
};

// ---------------------------------------------------------------------------
// Story 2.3 — Real-Time Updates
// ---------------------------------------------------------------------------

test.describe('Notification Real-Time Updates (Story 2.3)', () => {
  test('2.3-E2E-001: Badge count updates when new notification arrives via polling @p0', async ({ page }) => {
    // Given: A user starts with 1 unread notification
    const user = createUser({ name: 'Polling Tester' });
    const existingNotification = createAssignmentNotification({
      userId: user.userId,
      bugId: 'bug-poll-1',
      bugTitle: 'Existing assigned bug',
      isRead: false,
    });

    await setupRealtimePage(page, {
      user,
      initialNotifications: [existingNotification],
      initialUnreadCount: 1,
    });

    // When: User navigates to the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: Badge initially shows "1"
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');

    // When: A new notification arrives (simulated by updating the mock responses)
    const newNotification = createAssignmentNotification({
      userId: user.userId,
      bugId: 'bug-poll-2',
      bugTitle: 'Newly assigned bug',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // Update the mocked endpoints to reflect the new state
    await mockApiRoute(page, 'notifications*', [newNotification, existingNotification]);
    await mockApiRoute(page, 'notifications/count*', { count: 2 });

    // Then: After the polling interval, the badge count updates to "2"
    // Wait for the polling cycle to pick up the new count (max 15s for slow intervals)
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('2', {
      timeout: 15_000,
    });
  });

  test('2.3-E2E-002: Toast notification appears when new notification detected @p1', async ({ page }) => {
    // Given: A user starts with 0 notifications
    const user = createUser({ name: 'Toast Tester' });

    await setupRealtimePage(page, {
      user,
      initialNotifications: [],
      initialUnreadCount: 0,
    });

    // When: User is on the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // And: The badge should not be visible initially
    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();

    // When: A new notification arrives via polling
    const incomingNotification = createNotification({
      userId: user.userId,
      type: 'comment',
      bugTitle: 'Toast trigger bug',
      message: 'Someone commented on your bug',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await mockApiRoute(page, 'notifications*', [incomingNotification]);
    await mockApiRoute(page, 'notifications/count*', { count: 1 });

    // Then: A toast notification appears on-screen
    const toast = page
      .locator('[data-testid="notification-toast"]')
      .or(page.locator('[role="status"]').filter({ hasText: /notification|commented/i }));
    await expect(toast).toBeVisible({ timeout: 15_000 });

    // And: The toast contains information about the notification
    await expect(toast).toContainText(/comment|Toast trigger bug/i);
  });

  test('2.3-E2E-003: Toast auto-dismisses after 5 seconds @p1', async ({ page }) => {
    // Given: A user starts with 0 notifications
    const user = createUser({ name: 'Toast Dismiss Tester' });

    await setupRealtimePage(page, {
      user,
      initialNotifications: [],
      initialUnreadCount: 0,
    });

    // When: User is on the dashboard and a notification arrives
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    const incomingNotification = createNotification({
      userId: user.userId,
      type: 'assignment',
      bugTitle: 'Dismiss test bug',
      message: 'You have been assigned to a bug',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await mockApiRoute(page, 'notifications*', [incomingNotification]);
    await mockApiRoute(page, 'notifications/count*', { count: 1 });

    // Then: Wait for the toast to appear
    const toast = page
      .locator('[data-testid="notification-toast"]')
      .or(page.locator('[role="status"]').filter({ hasText: /assigned|Dismiss test bug/i }));
    await expect(toast).toBeVisible({ timeout: 15_000 });

    // And: The toast auto-dismisses after approximately 5 seconds
    // We allow a generous timeout window (5s dismiss + 1s animation buffer)
    await expect(toast).not.toBeVisible({ timeout: 8_000 });
  });
});
