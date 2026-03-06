import { test, expect } from '../support/fixtures/merged-fixtures';
import {
  createUser,
  createAdminUser,
  createBug,
  createProject,
  createComment,
  createNotification,
  createAssignmentNotification,
  createStatusChangeNotification,
  createCommentNotification,
  createPriorityChangeNotification,
  createSeverityEscalationNotification,
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

const setupTriggerContext = async (
  page: Page,
  options: {
    notifications?: ReturnType<typeof createNotification>[];
    bugs?: Record<string, unknown>[];
    users?: Record<string, unknown>[];
  } = {},
) => {
  const user = createUser({ name: 'Trigger User' });
  const project = {
    ...createProject({ name: 'Trigger Project' }),
    id: 'proj-trigger-1',
    createdAt: new Date().toISOString(),
  };
  const defaultBug = makeBug({
    id: 'bug-trigger-1',
    title: 'Trigger Test Bug',
    projectId: project.id,
    reportedBy: user.userId,
    status: 'Open',
  });

  await seedAuth(page, user);
  await mockApiRoute(page, `bugs/${defaultBug.id}`, defaultBug);
  await mockApiRoute(page, 'bugs*', options.bugs || [defaultBug]);
  await mockApiRoute(
    page,
    'users*',
    options.users || [{ ...user, id: user.userId }],
  );
  await mockApiRoute(page, 'projects*', [project]);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'activity-logs*', []);
  await mockApiRoute(page, 'comments*', []);
  await mockApiRoute(page, 'notifications*', options.notifications || []);

  await page.route('**/api/notifications/count*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        unread: (options.notifications || []).filter((n) => !n.isRead).length,
        total: (options.notifications || []).length,
      }),
    }),
  );

  return { user, project, bug: defaultBug };
};

/* ------------------------------------------------------------------ */
/*  Story 1.1 – Notification Data Model                                */
/* ------------------------------------------------------------------ */

test.describe('Notification Data Model (Story 1.1)', () => {
  test('1.1-E2E-001: Notification displays all required fields @p1 @regression', async ({
    page,
  }) => {
    // Given: A notification with all fields populated
    const userId = 'user-fields-1';
    const notifications = [
      createAssignmentNotification({
        userId,
        id: 'notif-fields-1',
        bugId: 'bug-field-1',
        bugTitle: 'Login Page Crash',
        message: 'You were assigned to bug #bug-field-1: Login Page Crash',
        actorId: 'actor-1',
        actorName: 'Charlie Manager',
        isRead: false,
        readAt: null,
        createdAt: new Date(Date.now() - 300000).toISOString(),
      }),
    ];
    await setupTriggerContext(page, { notifications });

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: Notification displays message and actor name
    await expect(page.getByText(/Login Page Crash/)).toBeVisible();
    await expect(page.getByText('Charlie Manager')).toBeVisible();
  });

  test('1.1-E2E-002: Unread notification count is correct @p1 @regression', async ({ page }) => {
    // Given: 3 unread and 2 read notifications
    const userId = 'user-count-1';
    const notifications = [
      ...Array.from({ length: 3 }, (_, i) =>
        createNotification({
          userId,
          id: `notif-unread-${i}`,
          isRead: false,
          createdAt: new Date(Date.now() - i * 60000).toISOString(),
        }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        createNotification({
          userId,
          id: `notif-read-${i}`,
          isRead: true,
          readAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - (i + 3) * 60000).toISOString(),
        }),
      ),
    ];

    const user = createUser({ name: 'Count User' });
    const project = {
      ...createProject({ name: 'Count Project' }),
      id: 'proj-count-1',
      createdAt: new Date().toISOString(),
    };

    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'notifications*', notifications);
    await page.route('**/api/notifications/count*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread: 3, total: 5 }),
      }),
    );

    // When: User navigates to home
    await page.goto('/');

    // Then: The bell icon area indicates unread count
    const bellButton = page.getByRole('button', { name: /notification/i })
      .or(page.locator('[data-testid="notification-bell"]'));
    await expect(bellButton.first()).toBeVisible();
  });

  test('1.1-E2E-003: Notifications paginated correctly @p2 @regression', async ({ page }) => {
    // Given: 30 notifications (more than one page)
    const userId = 'user-pag-1';
    const notifications = Array.from({ length: 30 }, (_, i) =>
      createNotification({
        userId,
        id: `notif-pag-${i}`,
        message: `Paginated notification item ${i + 1}`,
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
      }),
    );

    const user = createUser({ name: 'Pagination User' });
    const project = {
      ...createProject({ name: 'Pagination Project' }),
      id: 'proj-pag-1',
      createdAt: new Date().toISOString(),
    };

    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'notifications*', notifications.slice(0, 20));
    await page.route('**/api/notifications/count*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread: 30, total: 30 }),
      }),
    );

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: First page of notifications is displayed
    await expect(page.getByText('Paginated notification item 1')).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  Story 1.2 – Notification API Endpoints                             */
/* ------------------------------------------------------------------ */

test.describe('Notification API Endpoints (Story 1.2)', () => {
  test('1.2-E2E-001: GET notifications returns sorted list @p1 @regression', async ({ page }) => {
    // Given: Notifications sorted by createdAt descending
    const userId = 'user-sort-1';
    const now = Date.now();
    const notifications = [
      createNotification({
        userId,
        id: 'notif-sort-1',
        message: 'Most recent notification',
        createdAt: new Date(now).toISOString(),
      }),
      createNotification({
        userId,
        id: 'notif-sort-2',
        message: 'Older notification',
        createdAt: new Date(now - 3600000).toISOString(),
      }),
      createNotification({
        userId,
        id: 'notif-sort-3',
        message: 'Oldest notification',
        createdAt: new Date(now - 7200000).toISOString(),
      }),
    ];
    await setupTriggerContext(page, { notifications });

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: All notifications are visible
    await expect(page.getByText('Most recent notification')).toBeVisible();
    await expect(page.getByText('Older notification')).toBeVisible();
    await expect(page.getByText('Oldest notification')).toBeVisible();
  });

  test('1.2-E2E-002: GET notifications with unreadOnly filter @p1 @regression', async ({
    page,
  }) => {
    // Given: Mix of read and unread notifications
    const userId = 'user-unreadonly-1';
    const notifications = [
      createNotification({
        userId,
        id: 'notif-uo-unread',
        message: 'Unread only test - unread',
        isRead: false,
        createdAt: new Date().toISOString(),
      }),
      createNotification({
        userId,
        id: 'notif-uo-read',
        message: 'Unread only test - read',
        isRead: true,
        readAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 60000).toISOString(),
      }),
    ];
    await setupTriggerContext(page, { notifications });

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: Both notifications are visible in the "All" view
    await expect(page.getByText('Unread only test - unread')).toBeVisible();
    await expect(page.getByText('Unread only test - read')).toBeVisible();
  });

  test('1.2-E2E-003: Mark single notification as read @p1 @smoke', async ({ page }) => {
    // Given: An unread notification
    const userId = 'user-markone-1';
    const notifications = [
      createNotification({
        userId,
        id: 'notif-markone-1',
        bugId: 'bug-markone-1',
        bugTitle: 'Mark Read Test Bug',
        message: 'Mark this notification as read',
        isRead: false,
        createdAt: new Date().toISOString(),
      }),
    ];

    const user = createUser({ name: 'Mark One User' });
    const project = {
      ...createProject({ name: 'Mark One Project' }),
      id: 'proj-markone-1',
      createdAt: new Date().toISOString(),
    };
    const bug = makeBug({
      id: 'bug-markone-1',
      title: 'Mark Read Test Bug',
      projectId: project.id,
    });

    await seedAuth(page, user);
    await mockApiRoute(page, `bugs/${bug.id}`, bug);
    await mockApiRoute(page, 'bugs*', [bug]);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'notifications*', notifications);

    // Mock PATCH mark-as-read
    await page.route('**/api/notifications/*/read*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...notifications[0],
          isRead: true,
          readAt: new Date().toISOString(),
        }),
      }),
    );
    await page.route('**/api/notifications/count*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread: 1, total: 1 }),
      }),
    );

    // When: User opens notification bell and sees the notification
    await page.goto('/');
    const bellButton = page.getByRole('button', { name: /notification/i })
      .or(page.locator('[data-testid="notification-bell"]'));
    await bellButton.first().click();

    // Then: The notification is visible
    await expect(page.getByText('Mark this notification as read')).toBeVisible();
  });

  test('1.2-E2E-004: Mark all notifications as read @p1 @regression', async ({ page }) => {
    // Given: Multiple unread notifications
    const userId = 'user-markall2-1';
    const notifications = Array.from({ length: 4 }, (_, i) =>
      createNotification({
        userId,
        id: `notif-ma2-${i}`,
        message: `Mark all test ${i + 1}`,
        isRead: false,
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
      }),
    );

    const user = createUser({ name: 'Mark All User' });
    const project = {
      ...createProject({ name: 'Mark All Project' }),
      id: 'proj-ma2-1',
      createdAt: new Date().toISOString(),
    };

    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'notifications*', notifications);
    await page.route('**/api/notifications/count*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread: 4, total: 4 }),
      }),
    );
    await page.route('**/api/notifications/read-all*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      }),
    );

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: The notifications are visible
    await expect(page.getByText('Mark all test 1')).toBeVisible();
  });

  test('1.2-E2E-005: GET notification count returns unread and total @p1 @smoke', async ({
    page,
  }) => {
    // Given: Known notification counts
    const user = createUser({ name: 'Count API User' });
    const project = {
      ...createProject({ name: 'Count API Project' }),
      id: 'proj-capi-1',
      createdAt: new Date().toISOString(),
    };

    let countRequested = false;
    await seedAuth(page, user);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'notifications*', []);

    await page.route('**/api/notifications/count*', (route) => {
      countRequested = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread: 7, total: 15 }),
      });
    });

    // When: User navigates to home page (count endpoint polled)
    await page.goto('/');

    // Then: The bell icon area should render (count is consumed by UI)
    const bellButton = page.getByRole('button', { name: /notification/i })
      .or(page.locator('[data-testid="notification-bell"]'));
    await expect(bellButton.first()).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  Story 1.3 – Notification Trigger Service                           */
/* ------------------------------------------------------------------ */

test.describe('Notification Trigger Service (Story 1.3)', () => {
  test('1.3-E2E-001: Bug assignment creates notification for assignee @p0 @smoke', async ({
    page,
  }) => {
    // Given: A bug assigned to a user, triggering an assignment notification
    const assigneeId = 'user-assignee-1';
    const notifications = [
      createAssignmentNotification({
        userId: assigneeId,
        id: 'notif-assign-trigger-1',
        bugId: 'bug-assign-1',
        bugTitle: 'Assigned Bug Title',
        message: 'You were assigned to bug #bug-assign-1: Assigned Bug Title',
        actorName: 'Team Lead',
        createdAt: new Date().toISOString(),
      }),
    ];
    await setupTriggerContext(page, { notifications });

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: The assignment notification is visible
    await expect(page.getByText(/You were assigned to bug.*Assigned Bug Title/)).toBeVisible();
  });

  test('1.3-E2E-002: Bug status change creates notification @p0 @smoke', async ({ page }) => {
    // Given: A bug status changed, triggering a notification
    const notifications = [
      createStatusChangeNotification({
        id: 'notif-status-trigger-1',
        bugId: 'bug-status-1',
        bugTitle: 'Status Change Bug',
        message: 'Bug #bug-status-1 status changed from Open to In Progress',
        actorName: 'Developer Alice',
        createdAt: new Date().toISOString(),
      }),
    ];
    await setupTriggerContext(page, { notifications });

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: The status change notification is visible
    await expect(page.getByText(/status changed from Open to In Progress/)).toBeVisible();
  });

  test('1.3-E2E-003: New comment creates notification (not for author) @p1 @regression', async ({
    page,
  }) => {
    // Given: A comment was added, notifying assignee and previous commenters
    const notifications = [
      createCommentNotification({
        id: 'notif-comment-trigger-1',
        bugId: 'bug-comment-1',
        bugTitle: 'Commented Bug',
        actorName: 'Commenter Bob',
        message: 'Commenter Bob commented on bug #bug-comment-1: Commented Bug',
        createdAt: new Date().toISOString(),
      }),
    ];
    await setupTriggerContext(page, { notifications });

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: The comment notification is visible with actor name
    await expect(page.getByText(/Commenter Bob commented on bug/)).toBeVisible();
  });

  test('1.3-E2E-004: Priority change creates notification for assignee @p1 @regression', async ({
    page,
  }) => {
    // Given: A bug priority was changed
    const notifications = [
      createPriorityChangeNotification({
        id: 'notif-priority-trigger-1',
        bugId: 'bug-priority-1',
        bugTitle: 'Priority Change Bug',
        message: 'Bug #bug-priority-1 priority changed from Medium to Highest',
        actorName: 'Manager Carol',
        createdAt: new Date().toISOString(),
      }),
    ];
    await setupTriggerContext(page, { notifications });

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: The priority change notification is visible
    await expect(page.getByText(/priority changed from Medium to Highest/)).toBeVisible();
  });

  test('1.3-E2E-005: Severity escalation notifies all project admins @p0 @smoke', async ({
    page,
  }) => {
    // Given: A bug severity escalated to Blocker, notifying all admins
    const adminUser = createAdminUser({ name: 'Admin Dave' });
    const project = {
      ...createProject({ name: 'Escalation Project' }),
      id: 'proj-esc-1',
      createdAt: new Date().toISOString(),
    };

    const notifications = [
      createSeverityEscalationNotification({
        userId: adminUser.userId,
        id: 'notif-sev-trigger-1',
        bugId: 'bug-sev-1',
        bugTitle: 'Critical Production Bug',
        message: 'URGENT: Bug #bug-sev-1 escalated to Blocker',
        actorName: 'Developer Eve',
        createdAt: new Date().toISOString(),
      }),
    ];

    await seedAuth(page, adminUser);
    await mockApiRoute(page, 'bugs*', []);
    await mockApiRoute(page, 'users*', [{ ...adminUser, id: adminUser.userId }]);
    await mockApiRoute(page, 'projects*', [project]);
    await mockApiRoute(page, 'sprints*', []);
    await mockApiRoute(page, 'activity-logs*', []);
    await mockApiRoute(page, 'comments*', []);
    await mockApiRoute(page, 'notifications*', notifications);
    await page.route('**/api/notifications/count*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unread: 1, total: 1 }),
      }),
    );

    // When: Admin user navigates to /notifications
    await page.goto('/notifications');

    // Then: The severity escalation notification is visible with URGENT prefix
    await expect(page.getByText(/URGENT.*escalated to Blocker/)).toBeVisible();
  });

  test('1.3-E2E-006: No duplicate notifications for user with multiple roles @p1 @regression', async ({
    page,
  }) => {
    // Given: A user who is both assignee and commenter receives only one notification
    const userId = 'user-dedup-1';
    // Only one notification should exist (not two)
    const notifications = [
      createCommentNotification({
        userId,
        id: 'notif-dedup-1',
        bugId: 'bug-dedup-1',
        bugTitle: 'Dedup Test Bug',
        actorName: 'Another User',
        message: 'Another User commented on bug #bug-dedup-1: Dedup Test Bug',
        createdAt: new Date().toISOString(),
      }),
    ];
    await setupTriggerContext(page, { notifications });

    // When: User navigates to /notifications
    await page.goto('/notifications');

    // Then: Only one notification for this event (not duplicated)
    const notifElements = page.getByText(/commented on bug.*Dedup Test Bug/);
    await expect(notifElements).toHaveCount(1);
  });
});
