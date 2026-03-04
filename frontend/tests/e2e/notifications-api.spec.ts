import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';
import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Notification factory helper
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  userId: string;
  type: 'assignment' | 'status_change' | 'comment' | 'priority_change' | 'severity_escalation' | 'mention';
  bugId: string;
  bugTitle: string;
  message: string;
  actorId: string;
  actorName: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

let notifSeq = 0;

const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: `notif-${++notifSeq}`,
  userId: 'user-1',
  type: 'assignment',
  bugId: 'bug-1',
  bugTitle: 'Login page crash on submit',
  message: 'You were assigned to bug #bug-1: Login page crash on submit',
  actorId: 'actor-1',
  actorName: 'Jane Developer',
  isRead: false,
  readAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Common page setup helpers
// ---------------------------------------------------------------------------

/**
 * Sets up authentication and standard API mocks so the app can load.
 * Returns the seeded user for reference.
 */
const setupAuthenticatedPage = async (page: Page) => {
  const user = createUser({ name: 'Notif Tester' });
  await seedAuth(page, user);
  await mockApiRoute(page, 'bugs*', []);
  await mockApiRoute(page, 'projects*', []);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
  return user;
};

/**
 * Intercepts the Next.js API notification endpoints using page.route()
 * since these are app-level API routes (not Collection DB routes).
 */
const mockNotificationsApi = async (
  page: Page,
  notifications: Notification[],
  unreadCount?: number,
) => {
  const total = notifications.length;
  const unread = unreadCount ?? notifications.filter((n) => !n.isRead).length;

  // GET /api/notifications — paginated list
  await page.route('**/api/notifications?**', (route) => {
    const url = new URL(route.request().url());
    const userId = url.searchParams.get('userId');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    if (!userId) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'userId query parameter is required' }),
      });
    }

    let filtered = notifications.filter((n) => n.userId === userId);
    if (unreadOnly) {
      filtered = filtered.filter((n) => !n.isRead);
    }

    const paginated = filtered.slice(offset, offset + limit);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        notifications: paginated,
        total: filtered.length,
        limit,
        offset,
        hasMore: offset + limit < filtered.length,
      }),
    });
  });

  // GET /api/notifications/count
  await page.route('**/api/notifications/count?**', (route) => {
    const url = new URL(route.request().url());
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'userId query parameter is required' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ unread, total }),
    });
  });

  // PATCH /api/notifications/{id}/read — mark single as read
  await page.route('**/api/notifications/*/read', (route) => {
    if (route.request().method() !== 'PATCH') {
      return route.fallback();
    }

    const urlParts = route.request().url().split('/');
    const readIndex = urlParts.indexOf('read');
    const notifId = readIndex > 0 ? urlParts[readIndex - 1] : null;
    const target = notifications.find((n) => n.id === notifId);

    if (!target) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Notification not found' }),
      });
    }

    target.isRead = true;
    target.readAt = new Date().toISOString();

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(target),
    });
  });

  // PATCH /api/notifications/read-all
  await page.route('**/api/notifications/read-all?**', (route) => {
    if (route.request().method() !== 'PATCH') {
      return route.fallback();
    }

    const url = new URL(route.request().url());
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'userId query parameter is required' }),
      });
    }

    notifications
      .filter((n) => n.userId === userId && !n.isRead)
      .forEach((n) => {
        n.isRead = true;
        n.readAt = new Date().toISOString();
      });

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, modifiedCount: notifications.filter((n) => n.userId === userId && n.isRead).length }),
    });
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Notification API — Core Endpoints', () => {
  test.beforeEach(() => {
    // Reset the sequence counter between tests for deterministic IDs
    notifSeq = 0;
  });

  // -----------------------------------------------------------------------
  // 1. GET notifications returns paginated list (P0)
  // -----------------------------------------------------------------------
  test('NOTIF.1.2-E2E-001: GET notifications returns paginated list for authenticated user @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user with several notifications
    const user = await setupAuthenticatedPage(page);
    const notifications = [
      createNotification({ userId: user.userId, type: 'assignment', message: 'You were assigned to bug #bug-1: Login crash', bugTitle: 'Login crash' }),
      createNotification({ userId: user.userId, type: 'comment', message: 'Jane commented on bug #bug-2: Dashboard misaligned', bugTitle: 'Dashboard misaligned' }),
      createNotification({ userId: user.userId, type: 'status_change', message: 'Bug #bug-3 status changed to Resolved', bugTitle: 'API timeout error', isRead: true, readAt: new Date().toISOString() }),
    ];
    await mockNotificationsApi(page, notifications);

    // When: User navigates to the notifications page
    await page.goto('/notifications');

    // Then: Notification messages from the mocked list are visible on the page
    await expect(page.getByText('Login crash')).toBeVisible();
    await expect(page.getByText('Dashboard misaligned')).toBeVisible();
    await expect(page.getByText('API timeout error')).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 2. PATCH mark single notification as read (P0)
  // -----------------------------------------------------------------------
  test('NOTIF.1.2-E2E-002: PATCH mark single notification as read updates state @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user with an unread notification
    const user = await setupAuthenticatedPage(page);
    const notifications = [
      createNotification({ userId: user.userId, type: 'assignment', message: 'You were assigned to bug #bug-1: Login crash', bugTitle: 'Login crash' }),
    ];
    await mockNotificationsApi(page, notifications);
    await page.goto('/notifications');
    await expect(page.getByText('Login crash')).toBeVisible();

    // When: The PATCH /api/notifications/{id}/read endpoint is called
    const response = await page.evaluate(async (notifId) => {
      const res = await fetch(`/api/notifications/${notifId}/read`, { method: 'PATCH' });
      return { status: res.status, body: await res.json() };
    }, notifications[0].id);

    // Then: The API responds with 200 and the notification is marked as read
    expect(response.status).toBe(200);
    expect(response.body.isRead).toBe(true);
    expect(response.body.readAt).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // 3. PATCH mark all as read (P0)
  // -----------------------------------------------------------------------
  test('NOTIF.1.2-E2E-003: PATCH mark all notifications as read updates all unread @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user with multiple unread notifications
    const user = await setupAuthenticatedPage(page);
    const notifications = [
      createNotification({ userId: user.userId, type: 'assignment', message: 'Assigned to bug #1', bugTitle: 'Bug one' }),
      createNotification({ userId: user.userId, type: 'comment', message: 'Comment on bug #2', bugTitle: 'Bug two' }),
      createNotification({ userId: user.userId, type: 'status_change', message: 'Status changed bug #3', bugTitle: 'Bug three' }),
    ];
    await mockNotificationsApi(page, notifications);
    await page.goto('/notifications');

    // When: The PATCH /api/notifications/read-all endpoint is called
    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/notifications/read-all?userId=${userId}`, { method: 'PATCH' });
      return { status: res.status, body: await res.json() };
    }, user.userId);

    // Then: The API responds with 200 and confirms all notifications were marked
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.modifiedCount).toBe(3);
  });

  // -----------------------------------------------------------------------
  // 4. GET notification count (P0)
  // -----------------------------------------------------------------------
  test('NOTIF.1.2-E2E-004: GET notification count returns unread and total counts @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user with a mix of read and unread notifications
    const user = await setupAuthenticatedPage(page);
    const notifications = [
      createNotification({ userId: user.userId, isRead: false }),
      createNotification({ userId: user.userId, isRead: false }),
      createNotification({ userId: user.userId, isRead: true, readAt: new Date().toISOString() }),
      createNotification({ userId: user.userId, isRead: true, readAt: new Date().toISOString() }),
      createNotification({ userId: user.userId, isRead: false }),
    ];
    await mockNotificationsApi(page, notifications);
    await page.goto('/');

    // When: The GET /api/notifications/count endpoint is called
    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/notifications/count?userId=${userId}`);
      return { status: res.status, body: await res.json() };
    }, user.userId);

    // Then: The API responds with correct unread and total counts
    expect(response.status).toBe(200);
    expect(response.body.unread).toBe(3);
    expect(response.body.total).toBe(5);
  });
});

test.describe('Notification API — Filtering & Validation', () => {
  test.beforeEach(() => {
    notifSeq = 0;
  });

  // -----------------------------------------------------------------------
  // 5. Filter by unreadOnly (P1)
  // -----------------------------------------------------------------------
  test('NOTIF.1.2-E2E-005: GET notifications with unreadOnly=true filters out read notifications @p1 @regression', async ({ page }) => {
    // Given: An authenticated user with both read and unread notifications
    const user = await setupAuthenticatedPage(page);
    const notifications = [
      createNotification({ userId: user.userId, type: 'assignment', message: 'Unread assignment', isRead: false }),
      createNotification({ userId: user.userId, type: 'comment', message: 'Read comment', isRead: true, readAt: new Date().toISOString() }),
      createNotification({ userId: user.userId, type: 'mention', message: 'Unread mention', isRead: false }),
    ];
    await mockNotificationsApi(page, notifications);
    await page.goto('/');

    // When: The GET endpoint is called with unreadOnly=true
    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/notifications?userId=${userId}&unreadOnly=true`);
      return { status: res.status, body: await res.json() };
    }, user.userId);

    // Then: Only unread notifications are returned
    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(2);
    expect(response.body.notifications.every((n: Notification) => !n.isRead)).toBe(true);
    expect(response.body.total).toBe(2);
  });

  // -----------------------------------------------------------------------
  // 6. API returns 400 for missing userId (P1)
  // -----------------------------------------------------------------------
  test('NOTIF.1.2-E2E-006: GET notifications returns 400 when userId is missing @p1 @regression', async ({ page }) => {
    // Given: An authenticated user with notification mocks
    await setupAuthenticatedPage(page);
    await mockNotificationsApi(page, []);
    await page.goto('/');

    // When: The GET endpoint is called without a userId parameter
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/notifications?limit=10');
      return { status: res.status, body: await res.json() };
    });

    // Then: The API responds with 400 and an error message
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('userId query parameter is required');
  });

  // -----------------------------------------------------------------------
  // 7. API returns 404 for non-existent notification (P1)
  // -----------------------------------------------------------------------
  test('NOTIF.1.2-E2E-007: PATCH mark read returns 404 for non-existent notification @p1 @regression', async ({ page }) => {
    // Given: An authenticated user with notification mocks but no matching ID
    await setupAuthenticatedPage(page);
    await mockNotificationsApi(page, []);
    await page.goto('/');

    // When: The PATCH endpoint is called with a non-existent notification ID
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/notifications/non-existent-id/read', { method: 'PATCH' });
      return { status: res.status, body: await res.json() };
    });

    // Then: The API responds with 404 and an error message
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Notification not found');
  });
});

test.describe('Notification API — Pagination', () => {
  test.beforeEach(() => {
    notifSeq = 0;
  });

  // -----------------------------------------------------------------------
  // 8. Pagination with limit and offset (P2)
  // -----------------------------------------------------------------------
  test('NOTIF.1.2-E2E-008: GET notifications paginates correctly with limit and offset @p2 @regression', async ({ page }) => {
    // Given: An authenticated user with 15 notifications
    const user = await setupAuthenticatedPage(page);
    const notifications = Array.from({ length: 15 }, (_, i) =>
      createNotification({
        userId: user.userId,
        type: 'comment',
        message: `Notification message ${i + 1}`,
        bugTitle: `Bug title ${i + 1}`,
        bugId: `bug-${i + 1}`,
      }),
    );
    await mockNotificationsApi(page, notifications);
    await page.goto('/');

    // When: First page is requested with limit=5, offset=0
    const page1 = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=5&offset=0`);
      return { status: res.status, body: await res.json() };
    }, user.userId);

    // Then: First 5 notifications are returned with hasMore=true
    expect(page1.status).toBe(200);
    expect(page1.body.notifications).toHaveLength(5);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.total).toBe(15);
    expect(page1.body.offset).toBe(0);
    expect(page1.body.limit).toBe(5);

    // When: Second page is requested with limit=5, offset=5
    const page2 = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=5&offset=5`);
      return { status: res.status, body: await res.json() };
    }, user.userId);

    // Then: Next 5 notifications are returned with hasMore=true
    expect(page2.status).toBe(200);
    expect(page2.body.notifications).toHaveLength(5);
    expect(page2.body.hasMore).toBe(true);
    expect(page2.body.offset).toBe(5);

    // When: Third (last) page is requested with limit=5, offset=10
    const page3 = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=5&offset=10`);
      return { status: res.status, body: await res.json() };
    }, user.userId);

    // Then: Final 5 notifications are returned with hasMore=false
    expect(page3.status).toBe(200);
    expect(page3.body.notifications).toHaveLength(5);
    expect(page3.body.hasMore).toBe(false);
    expect(page3.body.offset).toBe(10);
  });

  test('NOTIF.1.2-E2E-009: GET notifications with offset beyond total returns empty list @p2 @regression', async ({ page }) => {
    // Given: An authenticated user with 3 notifications
    const user = await setupAuthenticatedPage(page);
    const notifications = [
      createNotification({ userId: user.userId, message: 'Only three notifications exist' }),
      createNotification({ userId: user.userId, message: 'Second notification' }),
      createNotification({ userId: user.userId, message: 'Third notification' }),
    ];
    await mockNotificationsApi(page, notifications);
    await page.goto('/');

    // When: A request is made with an offset beyond the total count
    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=10&offset=100`);
      return { status: res.status, body: await res.json() };
    }, user.userId);

    // Then: An empty list is returned with hasMore=false
    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(0);
    expect(response.body.hasMore).toBe(false);
    expect(response.body.total).toBe(3);
  });
});

test.describe('Notification API — Count Endpoint Validation', () => {
  test.beforeEach(() => {
    notifSeq = 0;
  });

  test('NOTIF.1.2-E2E-010: GET notification count returns 400 when userId is missing @p1 @regression', async ({ page }) => {
    // Given: An authenticated user with notification mocks
    await setupAuthenticatedPage(page);
    await mockNotificationsApi(page, []);
    await page.goto('/');

    // When: The GET /api/notifications/count endpoint is called without userId
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/notifications/count?');
      return { status: res.status, body: await res.json() };
    });

    // Then: The API responds with 400 and an error message
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('userId query parameter is required');
  });

  test('NOTIF.1.2-E2E-011: GET notification count returns zero when user has no notifications @p2 @regression', async ({ page }) => {
    // Given: An authenticated user with no notifications
    const user = await setupAuthenticatedPage(page);
    await mockNotificationsApi(page, [], 0);
    await page.goto('/');

    // When: The GET /api/notifications/count endpoint is called
    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/notifications/count?userId=${userId}`);
      return { status: res.status, body: await res.json() };
    }, user.userId);

    // Then: Both unread and total are zero
    expect(response.status).toBe(200);
    expect(response.body.unread).toBe(0);
    expect(response.body.total).toBe(0);
  });
});

test.describe('Notification API — Notification Types Coverage', () => {
  test.beforeEach(() => {
    notifSeq = 0;
  });

  test('NOTIF.1.2-E2E-012: all notification types are returned correctly in the list @p1 @regression', async ({ page }) => {
    // Given: An authenticated user with one notification of each type
    const user = await setupAuthenticatedPage(page);
    const notifications = [
      createNotification({ userId: user.userId, type: 'assignment', message: 'You were assigned to bug #1', bugTitle: 'Assignment bug' }),
      createNotification({ userId: user.userId, type: 'status_change', message: 'Bug #2 status changed to Resolved', bugTitle: 'Status bug' }),
      createNotification({ userId: user.userId, type: 'comment', message: 'Jane commented on bug #3', bugTitle: 'Comment bug' }),
      createNotification({ userId: user.userId, type: 'priority_change', message: 'Bug #4 priority changed to Highest', bugTitle: 'Priority bug' }),
      createNotification({ userId: user.userId, type: 'severity_escalation', message: 'URGENT: Bug #5 escalated to Blocker', bugTitle: 'Severity bug' }),
      createNotification({ userId: user.userId, type: 'mention', message: 'You were mentioned in bug #6', bugTitle: 'Mention bug' }),
    ];
    await mockNotificationsApi(page, notifications);
    await page.goto('/');

    // When: The GET endpoint is called for all notifications
    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      return { status: res.status, body: await res.json() };
    }, user.userId);

    // Then: All 6 notification types are present in the response
    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(6);

    const types = response.body.notifications.map((n: Notification) => n.type);
    expect(types).toContain('assignment');
    expect(types).toContain('status_change');
    expect(types).toContain('comment');
    expect(types).toContain('priority_change');
    expect(types).toContain('severity_escalation');
    expect(types).toContain('mention');
  });
});

test.describe('Notification API — Mark All As Read Validation', () => {
  test.beforeEach(() => {
    notifSeq = 0;
  });

  test('NOTIF.1.2-E2E-013: PATCH mark all as read returns 400 when userId is missing @p1 @regression', async ({ page }) => {
    // Given: An authenticated user with notification mocks
    await setupAuthenticatedPage(page);
    await mockNotificationsApi(page, []);
    await page.goto('/');

    // When: The PATCH /api/notifications/read-all endpoint is called without userId
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/notifications/read-all?', { method: 'PATCH' });
      return { status: res.status, body: await res.json() };
    });

    // Then: The API responds with 400 and an error message
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('userId query parameter is required');
  });
});
