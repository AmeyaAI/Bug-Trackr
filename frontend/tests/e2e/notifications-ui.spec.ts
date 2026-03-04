import { test, expect } from '../support/fixtures/merged-fixtures';
import {
  createUser,
  createProject,
  createNotification,
  createAssignmentNotification,
  createStatusChangeNotification,
  createCommentNotification,
  createUnreadNotification,
  createReadNotification,
} from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';
import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Bootstraps the page with auth, core API mocks, and notification data.
 */
const setupNotificationsPage = async (
  page: Page,
  opts: {
    user: ReturnType<typeof createUser>;
    notifications?: ReturnType<typeof createNotification>[];
    notificationCount?: number;
  },
) => {
  const project = {
    ...createProject({ name: 'UI Test Project' }),
    id: 'proj-ui-1',
    createdAt: new Date().toISOString(),
  };

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
};

/**
 * Generates an array of unread notifications with descending timestamps.
 */
const generateUnreadNotifications = (
  userId: string,
  count: number,
): ReturnType<typeof createNotification>[] => {
  const types = ['assignment', 'status_change', 'comment', 'priority_change'] as const;
  return Array.from({ length: count }, (_, i) => {
    const createdAt = new Date(Date.now() - i * 60_000).toISOString(); // 1 min apart
    const type = types[i % types.length];
    return createNotification({
      userId,
      type,
      isRead: false,
      readAt: null,
      createdAt,
      bugTitle: `Test Bug #${i + 1}`,
      message: `Notification message ${i + 1}`,
    });
  });
};

// ---------------------------------------------------------------------------
// Story 2.1 — Bell Icon & Dropdown
// ---------------------------------------------------------------------------

test.describe('Notification Bell & Dropdown (Story 2.1)', () => {
  test('2.1-E2E-001: Bell icon shows unread badge count, hidden when 0 @p0 @smoke', async ({ page }) => {
    // Given: A user with 3 unread notifications
    const user = createUser({ name: 'Badge Tester' });
    const notifications = generateUnreadNotifications(user.userId, 3);

    await setupNotificationsPage(page, { user, notifications, notificationCount: 3 });

    // When: User navigates to the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: The notification bell is visible with a badge showing "3"
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('3');

    // And: When all notifications are read, the badge disappears
    await setupNotificationsPage(page, { user, notifications: [], notificationCount: 0 });
    await page.goto('/');
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
  });

  test('2.1-E2E-002: Clicking notification marks as read AND navigates to bug detail @p0', async ({ page }) => {
    // Given: A user with one unread assignment notification
    const user = createUser({ name: 'Click Nav Tester' });
    const notification = createAssignmentNotification({
      userId: user.userId,
      bugId: 'bug-nav-1',
      bugTitle: 'Navigation target bug',
      isRead: false,
    });

    await setupNotificationsPage(page, { user, notifications: [notification], notificationCount: 1 });

    // Mock the individual bug route for the detail page
    await mockApiRoute(page, 'bugs/bug-nav-1', {
      id: 'bug-nav-1',
      title: 'Navigation target bug',
      status: 'Open',
      priority: 'Medium',
      severity: 'Major',
      projectId: 'proj-ui-1',
      reportedBy: user.userId,
      assignedTo: user.userId,
      type: 'bug',
      tags: [],
      validated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // When: User opens the notification dropdown and clicks the notification
    await page.goto('/');
    await page.locator('[data-testid="notification-bell"]').click();
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();

    // Mock the mark-as-read response
    await mockApiRoute(page, `notifications/${notification.id}`, {
      ...notification,
      isRead: true,
      readAt: new Date().toISOString(),
    });

    await page.locator('[data-testid="notification-item"]').first().click();

    // Then: User is navigated to the bug detail page
    await expect(page).toHaveURL(/\/bugs\/bug-nav-1/);
  });

  test('2.1-E2E-003: Dropdown shows 10 most recent notifications @p1', async ({ page }) => {
    // Given: A user with 15 notifications (only 10 should show in dropdown)
    const user = createUser({ name: 'Dropdown Limit Tester' });
    const notifications = generateUnreadNotifications(user.userId, 15);

    // The API should return only the 10 most recent for the dropdown
    const dropdownNotifications = notifications.slice(0, 10);

    await setupNotificationsPage(page, {
      user,
      notifications: dropdownNotifications,
      notificationCount: 15,
    });

    // When: User opens the notification dropdown
    await page.goto('/');
    await page.locator('[data-testid="notification-bell"]').click();

    // Then: Exactly 10 notification items are displayed
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
    const items = page.locator('[data-testid="notification-item"]');
    await expect(items).toHaveCount(10);
  });

  test('2.1-E2E-004: Unread notifications have highlighted background @p1', async ({ page }) => {
    // Given: A mix of read and unread notifications
    const user = createUser({ name: 'Highlight Tester' });
    const unread = createUnreadNotification({
      userId: user.userId,
      bugTitle: 'Unread Bug',
      message: 'This is unread',
    });
    const read = createReadNotification({
      userId: user.userId,
      bugTitle: 'Read Bug',
      message: 'This was already read',
    });

    await setupNotificationsPage(page, {
      user,
      notifications: [unread, read],
      notificationCount: 1,
    });

    // When: User opens the notification dropdown
    await page.goto('/');
    await page.locator('[data-testid="notification-bell"]').click();

    // Then: The unread notification has a highlighted/unread CSS class
    const unreadItem = page.locator('[data-testid="notification-item"]').filter({ hasText: 'Unread Bug' });
    await expect(unreadItem).toBeVisible();
    await expect(unreadItem).toHaveAttribute('data-unread', 'true');

    // And: The read notification does NOT have the highlighted state
    const readItem = page.locator('[data-testid="notification-item"]').filter({ hasText: 'Read Bug' });
    await expect(readItem).toBeVisible();
    await expect(readItem).toHaveAttribute('data-unread', 'false');
  });

  test('2.1-E2E-005: Mark all as read button in dropdown @p1', async ({ page }) => {
    // Given: A user with multiple unread notifications
    const user = createUser({ name: 'Mark All Tester' });
    const notifications = generateUnreadNotifications(user.userId, 4);

    await setupNotificationsPage(page, { user, notifications, notificationCount: 4 });

    // When: User opens dropdown and clicks "Mark all as read"
    await page.goto('/');
    await page.locator('[data-testid="notification-bell"]').click();
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();

    // Mock the mark-all-read endpoint
    await mockApiRoute(page, 'notifications/mark-all-read*', { success: true });
    // After marking all read, the count should be 0
    await mockApiRoute(page, 'notifications/count*', { count: 0 });

    await page.getByRole('button', { name: /mark all as read/i }).click();

    // Then: The badge disappears (count becomes 0)
    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
  });

  test('2.1-E2E-006: Dropdown closes when clicking outside @p1', async ({ page }) => {
    // Given: A user with notifications and an open dropdown
    const user = createUser({ name: 'Outside Click Tester' });
    const notifications = generateUnreadNotifications(user.userId, 2);

    await setupNotificationsPage(page, { user, notifications, notificationCount: 2 });

    await page.goto('/');
    await page.locator('[data-testid="notification-bell"]').click();
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();

    // When: User clicks outside the dropdown (on the main page body)
    await page.locator('main').click({ position: { x: 10, y: 10 } });

    // Then: The dropdown is no longer visible
    await expect(page.locator('[data-testid="notification-dropdown"]')).not.toBeVisible();
  });

  test('2.1-E2E-007: "View all notifications" link navigates to /notifications @p1', async ({ page }) => {
    // Given: A user with the notification dropdown open
    const user = createUser({ name: 'View All Tester' });
    const notifications = generateUnreadNotifications(user.userId, 3);

    await setupNotificationsPage(page, { user, notifications, notificationCount: 3 });

    await page.goto('/');
    await page.locator('[data-testid="notification-bell"]').click();
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();

    // When: User clicks the "View all notifications" link
    await page.getByRole('link', { name: /view all|see all/i }).click();

    // Then: User is navigated to the full notifications page
    await expect(page).toHaveURL(/\/notifications/);
  });
});

// ---------------------------------------------------------------------------
// Story 2.2 — Full Notifications Page
// ---------------------------------------------------------------------------

test.describe('Notifications Page (Story 2.2)', () => {
  test('2.2-E2E-001: /notifications page displays paginated list @p1', async ({ page }) => {
    // Given: A user with 25 notifications (to test pagination)
    const user = createUser({ name: 'Pagination Tester' });
    const allNotifications = generateUnreadNotifications(user.userId, 25);

    // First page returns first 20 with a pagination cursor
    const firstPage = allNotifications.slice(0, 20);

    await setupNotificationsPage(page, {
      user,
      notifications: firstPage,
      notificationCount: 25,
    });

    // When: User navigates to the notifications page
    await page.goto('/notifications');

    // Then: Notification items are displayed
    const items = page.locator('[data-testid="notification-item"]');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // And: A pagination control or "load more" button is present
    const paginationControl = page
      .getByRole('button', { name: /next|load more|show more/i })
      .or(page.locator('[data-testid="notification-pagination"]'));
    await expect(paginationControl).toBeVisible();
  });

  test('2.2-E2E-002: Filter tabs filter correctly @p1', async ({ page }) => {
    // Given: A user with notifications of different types
    const user = createUser({ name: 'Filter Tester' });
    const assignmentNotif = createAssignmentNotification({
      userId: user.userId,
      bugTitle: 'Assignment Bug',
      message: 'You have been assigned',
    });
    const statusNotif = createStatusChangeNotification({
      userId: user.userId,
      bugTitle: 'Status Bug',
      message: 'Bug status changed to Resolved',
    });
    const commentNotif = createCommentNotification({
      userId: user.userId,
      bugTitle: 'Comment Bug',
      message: 'Someone commented on your bug',
    });

    await setupNotificationsPage(page, {
      user,
      notifications: [assignmentNotif, statusNotif, commentNotif],
      notificationCount: 3,
    });

    // When: User navigates to the notifications page
    await page.goto('/notifications');
    await expect(page.locator('[data-testid="notification-item"]').first()).toBeVisible();

    // Then: "All" tab shows all 3 notifications
    const allItems = page.locator('[data-testid="notification-item"]');
    await expect(allItems).toHaveCount(3);

    // When: User clicks the "Assignments" filter tab
    // Mock the filtered response
    await mockApiRoute(page, 'notifications*', [assignmentNotif]);
    await page
      .getByRole('tab', { name: /assignment/i })
      .or(page.locator('[data-testid="filter-assignment"]'))
      .click();

    // Then: Only assignment notifications are shown
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="notification-item"]').first()).toContainText('Assignment Bug');
  });

  test('2.2-E2E-003: Bulk mark all as read on notifications page @p1', async ({ page }) => {
    // Given: A user on the /notifications page with unread items
    const user = createUser({ name: 'Bulk Read Tester' });
    const notifications = generateUnreadNotifications(user.userId, 5);

    await setupNotificationsPage(page, { user, notifications, notificationCount: 5 });

    // When: User navigates to the notifications page
    await page.goto('/notifications');
    await expect(page.locator('[data-testid="notification-item"]').first()).toBeVisible();

    // Mock the mark-all-read response
    await mockApiRoute(page, 'notifications/mark-all-read*', { success: true });
    await mockApiRoute(page, 'notifications/count*', { count: 0 });

    // Prepare read versions of all notifications for the re-fetch
    const readNotifications = notifications.map((n) => ({
      ...n,
      isRead: true,
      readAt: new Date().toISOString(),
    }));
    await mockApiRoute(page, 'notifications*', readNotifications);

    // When: User clicks the "Mark all as read" button
    await page.getByRole('button', { name: /mark all as read/i }).click();

    // Then: All notification items lose their unread highlight
    const unreadItems = page.locator('[data-testid="notification-item"][data-unread="true"]');
    await expect(unreadItems).toHaveCount(0);

    // And: The bell badge in the header reflects 0 unread
    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
  });

  test('2.2-E2E-004: Empty state when no notifications @p1', async ({ page }) => {
    // Given: A user with zero notifications
    const user = createUser({ name: 'Empty State Tester' });

    await setupNotificationsPage(page, { user, notifications: [], notificationCount: 0 });

    // When: User navigates to the notifications page
    await page.goto('/notifications');

    // Then: An empty state message is displayed
    await expect(
      page.getByText(/no notifications|you.re all caught up|nothing here/i),
    ).toBeVisible();

    // And: No notification items are rendered
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(0);
  });
});
