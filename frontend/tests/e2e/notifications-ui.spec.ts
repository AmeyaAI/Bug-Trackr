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

// ---------------------------------------------------------------------------
// Negative Tests — UI Resilience for Invalid Types & Empty Fields
// ---------------------------------------------------------------------------

test.describe('Notification UI — Invalid Type Resilience', () => {
  test('NOTIF.UI-NEG-001: UI renders notification with unrecognized type without crashing @p2 @regression', async ({ page }) => {
    // Given: A user has a notification with an invalid/unknown type field
    const user = createUser({ name: 'Invalid Type UI Tester' });

    // Intentionally use 'as any' to bypass TypeScript type checking for the negative test
    const invalidTypeNotification = createNotification({
      userId: user.userId,
      type: 'unknown_type' as any,
      bugTitle: 'Bug with unknown type',
      message: 'This notification has an unrecognized type',
      isRead: false,
    });

    await setupNotificationsPage(page, {
      user,
      notifications: [invalidTypeNotification],
      notificationCount: 1,
    });

    // When: User navigates to the notifications page
    await page.goto('/notifications');

    // Then: The page loads without crashing
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(1);

    // And: The notification message is still visible (graceful rendering)
    await expect(page.getByText('This notification has an unrecognized type')).toBeVisible();
  });

  test('NOTIF.UI-NEG-002: Dropdown renders notification with invalid type gracefully @p2 @regression', async ({ page }) => {
    // Given: A user with a mix of valid and invalid type notifications
    const user = createUser({ name: 'Invalid Type Dropdown Tester' });

    const validNotification = createAssignmentNotification({
      userId: user.userId,
      bugTitle: 'Valid assignment bug',
      message: 'You were assigned to a bug',
      isRead: false,
    });
    const invalidNotification = createNotification({
      userId: user.userId,
      type: 'nonexistent_event' as any,
      bugTitle: 'Invalid type bug',
      message: 'Notification with bad type',
      isRead: false,
    });

    await setupNotificationsPage(page, {
      user,
      notifications: [validNotification, invalidNotification],
      notificationCount: 2,
    });

    // When: User opens the notification dropdown
    await page.goto('/');
    await page.locator('[data-testid="notification-bell"]').click();

    // Then: The dropdown opens and shows both notifications (doesn't crash)
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(2);

    // And: Both notification messages are rendered
    await expect(page.getByText('You were assigned to a bug')).toBeVisible();
    await expect(page.getByText('Notification with bad type')).toBeVisible();
  });
});

test.describe('Notification UI — Empty Field Resilience', () => {
  test('NOTIF.UI-NEG-003: UI renders notification with empty message field gracefully @p2 @regression', async ({ page }) => {
    // Given: A user has a notification with an empty message field
    const user = createUser({ name: 'Empty Msg UI Tester' });

    const emptyMsgNotification = createNotification({
      userId: user.userId,
      type: 'assignment',
      bugTitle: 'Bug with no message',
      message: '',
      isRead: false,
    });

    await setupNotificationsPage(page, {
      user,
      notifications: [emptyMsgNotification],
      notificationCount: 1,
    });

    // When: User navigates to the notifications page
    await page.goto('/notifications');

    // Then: The page renders without crashing — at least the notification item exists
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(1);

    // And: The bug title is still shown as a fallback
    await expect(page.getByText('Bug with no message')).toBeVisible();
  });

  test('NOTIF.UI-NEG-004: UI renders notification with empty bugTitle gracefully @p2 @regression', async ({ page }) => {
    // Given: A user has a notification with an empty bugTitle
    const user = createUser({ name: 'Empty Title UI Tester' });

    const emptyTitleNotification = createNotification({
      userId: user.userId,
      type: 'comment',
      bugTitle: '',
      message: 'Comment on unnamed bug',
      isRead: false,
    });

    await setupNotificationsPage(page, {
      user,
      notifications: [emptyTitleNotification],
      notificationCount: 1,
    });

    // When: User navigates to the notifications page
    await page.goto('/notifications');

    // Then: The page renders without crashing
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(1);

    // And: The notification message is still visible
    await expect(page.getByText('Comment on unnamed bug')).toBeVisible();
  });

  test('NOTIF.UI-NEG-005: UI renders notification with empty actorName gracefully @p2 @regression', async ({ page }) => {
    // Given: A user has a notification with an empty actorName
    const user = createUser({ name: 'Empty Actor UI Tester' });

    const emptyActorNotification = createNotification({
      userId: user.userId,
      type: 'status_change',
      bugTitle: 'Status change bug',
      message: 'Bug status changed to Resolved',
      actorName: '',
      isRead: false,
    });

    await setupNotificationsPage(page, {
      user,
      notifications: [emptyActorNotification],
      notificationCount: 1,
    });

    // When: User opens the notification dropdown
    await page.goto('/');
    await page.locator('[data-testid="notification-bell"]').click();

    // Then: The dropdown renders without crashing
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(1);

    // And: The notification is displayed with available information
    await expect(page.getByText(/status changed|Resolved/i)).toBeVisible();
  });

  test('NOTIF.UI-NEG-006: Notifications page handles multiple notifications with missing fields @p2 @regression', async ({ page }) => {
    // Given: A user has several notifications with various empty fields
    const user = createUser({ name: 'Multi Empty Fields Tester' });

    const normalNotification = createAssignmentNotification({
      userId: user.userId,
      bugTitle: 'Normal bug',
      message: 'Normal notification message',
      isRead: false,
    });
    const emptyMessageNotif = createNotification({
      userId: user.userId,
      type: 'comment',
      bugTitle: 'Bug with empty message',
      message: '',
      isRead: false,
    });
    const emptyTitleNotif = createNotification({
      userId: user.userId,
      type: 'status_change',
      bugTitle: '',
      message: 'Status changed on unnamed bug',
      isRead: false,
    });
    const emptyActorNotif = createNotification({
      userId: user.userId,
      type: 'priority_change',
      bugTitle: 'Priority bug',
      message: 'Priority changed',
      actorName: '',
      actorId: '',
      isRead: false,
    });

    await setupNotificationsPage(page, {
      user,
      notifications: [normalNotification, emptyMessageNotif, emptyTitleNotif, emptyActorNotif],
      notificationCount: 4,
    });

    // When: User navigates to the notifications page
    await page.goto('/notifications');

    // Then: All 4 notification items render without the page crashing
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(4);

    // And: The normal notification renders fully
    await expect(page.getByText('Normal notification message')).toBeVisible();
  });
});
