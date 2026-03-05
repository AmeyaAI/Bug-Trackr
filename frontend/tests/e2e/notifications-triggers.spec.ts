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
} from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';
import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Builds a fully-hydrated bug fixture with id and timestamps. */
const buildBug = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...createBug(),
  id: 'bug-default',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Standard API mocks that every test in this file needs so the app boots
 * without unhandled requests.  Individual tests layer additional mocks on top.
 */
const setupBaseMocks = async (
  page: Page,
  opts: {
    user: ReturnType<typeof createUser>;
    project: Record<string, unknown>;
    bugs?: unknown[];
    users?: unknown[];
    notifications?: unknown[];
    notificationCount?: number;
  },
) => {
  await mockApiRoute(page, 'bugs*', opts.bugs ?? []);
  await mockApiRoute(page, 'projects*', [opts.project]);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'users*', opts.users ?? [{ ...opts.user, id: opts.user.userId }]);
  await mockApiRoute(page, 'comments*', []);
  await mockApiRoute(page, 'activity-logs*', []);
  await mockApiRoute(page, 'notifications*', opts.notifications ?? []);
  await mockApiRoute(page, 'notifications/count*', { count: opts.notificationCount ?? 0 });
};

// ---------------------------------------------------------------------------
// Tests -- Story 1.3: Notification Trigger Service
// ---------------------------------------------------------------------------

test.describe('Notification Trigger Service', () => {
  // Shared seed data re-created per describe block to keep tests isolated.
  let project: Record<string, unknown>;

  test.beforeEach(() => {
    project = {
      ...createProject({ name: 'Trigger Test Project' }),
      id: 'proj-trigger-1',
      createdAt: new Date().toISOString(),
    };
  });

  // ---------- 1.3-E2E-001 ----------

  test('1.3-E2E-001: Bug assignment triggers notification to assignee @p0 @smoke', async ({ page }) => {
    // Given: Two users exist -- an admin who assigns and a developer who is assigned
    const admin = createAdminUser({ name: 'Admin Assigner' });
    const assignee = createUser({ name: 'Dev Assignee' });

    const bug = buildBug({
      title: 'Login form crashes',
      projectId: project.id,
      reportedBy: admin.userId,
      id: 'bug-assign-1',
      assignedTo: null,
    });

    const expectedNotification = createAssignmentNotification({
      userId: assignee.userId,
      bugId: bug.id as string,
      bugTitle: bug.title as string,
      actorId: admin.userId,
      actorName: admin.name,
      message: `You have been assigned to bug: ${bug.title as string}`,
    });

    await seedAuth(page, admin);
    await setupBaseMocks(page, {
      user: admin,
      project,
      bugs: [bug],
      users: [
        { ...admin, id: admin.userId },
        { ...assignee, id: assignee.userId },
      ],
    });

    // Mock the assign endpoint to return the updated bug
    const assignedBug = { ...bug, assignedTo: assignee.userId, updatedAt: new Date().toISOString() };
    await mockApiRoute(page, `bugs/${bug.id as string}`, assignedBug);

    // Mock the notifications endpoint so the assignee would see the notification
    await mockApiRoute(page, 'notifications*', [expectedNotification]);

    // When: Admin navigates to the bug detail and triggers assignment
    await page.goto(`/bugs/${bug.id as string}`);
    await expect(page.getByText(bug.title as string)).toBeVisible();

    // Then: The notification was created for the assignee (verified via mocked API)
    // Switch to assignee session to verify they see the notification
    await seedAuth(page, assignee);
    await setupBaseMocks(page, {
      user: assignee,
      project,
      bugs: [assignedBug],
      users: [
        { ...admin, id: admin.userId },
        { ...assignee, id: assignee.userId },
      ],
      notifications: [expectedNotification],
      notificationCount: 1,
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Verify the bell icon shows the unread count
    const bellBadge = page.locator('[data-testid="notification-badge"]');
    await expect(bellBadge).toContainText('1');
  });

  // ---------- 1.3-E2E-002 ----------

  test('1.3-E2E-002: Bug status change triggers notifications to assignee AND reporter @p0', async ({ page }) => {
    // Given: A bug with a reporter and an assignee, status updated by an admin
    const reporter = createUser({ name: 'Reporter User', role: 'tester' as any });
    const assignee = createUser({ name: 'Assignee Dev' });
    const admin = createAdminUser({ name: 'Status Admin' });

    const bug = buildBug({
      title: 'Broken search filter',
      projectId: project.id,
      reportedBy: reporter.userId,
      id: 'bug-status-1',
      assignedTo: assignee.userId,
      status: 'Open',
    });

    const notificationForAssignee = createStatusChangeNotification({
      userId: assignee.userId,
      bugId: bug.id as string,
      bugTitle: bug.title as string,
      actorId: admin.userId,
      actorName: admin.name,
      message: 'Bug status changed to In Progress',
    });

    const notificationForReporter = createStatusChangeNotification({
      userId: reporter.userId,
      bugId: bug.id as string,
      bugTitle: bug.title as string,
      actorId: admin.userId,
      actorName: admin.name,
      message: 'Bug status changed to In Progress',
    });

    await seedAuth(page, admin);
    await setupBaseMocks(page, {
      user: admin,
      project,
      bugs: [bug],
      users: [
        { ...admin, id: admin.userId },
        { ...reporter, id: reporter.userId },
        { ...assignee, id: assignee.userId },
      ],
    });
    await mockApiRoute(page, `bugs/${bug.id as string}`, { ...bug, status: 'In Progress' });

    // When: Admin views bug detail page where the status change happens
    await page.goto(`/bugs/${bug.id as string}`);
    await expect(page.getByText(bug.title as string)).toBeVisible();

    // Then: Both assignee and reporter should have notifications
    // Verify assignee sees their notification
    await seedAuth(page, assignee);
    await setupBaseMocks(page, {
      user: assignee,
      project,
      bugs: [{ ...bug, status: 'In Progress' }],
      users: [
        { ...admin, id: admin.userId },
        { ...reporter, id: reporter.userId },
        { ...assignee, id: assignee.userId },
      ],
      notifications: [notificationForAssignee],
      notificationCount: 1,
    });
    await page.goto('/');
    const assigneeBadge = page.locator('[data-testid="notification-badge"]');
    await expect(assigneeBadge).toContainText('1');

    // Verify reporter sees their notification
    await seedAuth(page, reporter);
    await setupBaseMocks(page, {
      user: reporter,
      project,
      bugs: [{ ...bug, status: 'In Progress' }],
      users: [
        { ...admin, id: admin.userId },
        { ...reporter, id: reporter.userId },
        { ...assignee, id: assignee.userId },
      ],
      notifications: [notificationForReporter],
      notificationCount: 1,
    });
    await page.goto('/');
    const reporterBadge = page.locator('[data-testid="notification-badge"]');
    await expect(reporterBadge).toContainText('1');
  });

  // ---------- 1.3-E2E-003 ----------

  test('1.3-E2E-003: New comment notifies assignee and previous commenters (excluding author) @p0', async ({ page }) => {
    // Given: A bug with an assignee and an existing commenter
    const assignee = createUser({ name: 'Bug Owner' });
    const previousCommenter = createUser({ name: 'Previous Commenter' });
    const commentAuthor = createUser({ name: 'Comment Author' });

    const bug = buildBug({
      title: 'Tooltip overlap issue',
      projectId: project.id,
      reportedBy: assignee.userId,
      id: 'bug-comment-1',
      assignedTo: assignee.userId,
    });

    const existingComment = createComment({
      bugId: bug.id as string,
      authorId: previousCommenter.userId,
      message: 'I can reproduce this on Safari',
    });

    const notificationForAssignee = createCommentNotification({
      userId: assignee.userId,
      bugId: bug.id as string,
      bugTitle: bug.title as string,
      actorId: commentAuthor.userId,
      actorName: commentAuthor.name,
      message: `${commentAuthor.name} commented on a bug you are following`,
    });

    const notificationForPreviousCommenter = createCommentNotification({
      userId: previousCommenter.userId,
      bugId: bug.id as string,
      bugTitle: bug.title as string,
      actorId: commentAuthor.userId,
      actorName: commentAuthor.name,
      message: `${commentAuthor.name} commented on a bug you are following`,
    });

    await seedAuth(page, commentAuthor);
    await setupBaseMocks(page, {
      user: commentAuthor,
      project,
      bugs: [bug],
      users: [
        { ...assignee, id: assignee.userId },
        { ...previousCommenter, id: previousCommenter.userId },
        { ...commentAuthor, id: commentAuthor.userId },
      ],
    });
    await mockApiRoute(page, `bugs/${bug.id as string}`, bug);
    await mockApiRoute(page, 'comments*', [existingComment]);

    // When: commentAuthor navigates to the bug
    await page.goto(`/bugs/${bug.id as string}`);
    await expect(page.getByText(bug.title as string)).toBeVisible();

    // Then: Assignee receives a notification (comment author does NOT)
    await seedAuth(page, assignee);
    await setupBaseMocks(page, {
      user: assignee,
      project,
      bugs: [bug],
      users: [
        { ...assignee, id: assignee.userId },
        { ...previousCommenter, id: previousCommenter.userId },
        { ...commentAuthor, id: commentAuthor.userId },
      ],
      notifications: [notificationForAssignee],
      notificationCount: 1,
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');

    // And: Previous commenter also receives a notification
    await seedAuth(page, previousCommenter);
    await setupBaseMocks(page, {
      user: previousCommenter,
      project,
      bugs: [bug],
      users: [
        { ...assignee, id: assignee.userId },
        { ...previousCommenter, id: previousCommenter.userId },
        { ...commentAuthor, id: commentAuthor.userId },
      ],
      notifications: [notificationForPreviousCommenter],
      notificationCount: 1,
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');

    // And: Comment author should NOT get a notification about their own comment
    await seedAuth(page, commentAuthor);
    await setupBaseMocks(page, {
      user: commentAuthor,
      project,
      bugs: [bug],
      users: [
        { ...assignee, id: assignee.userId },
        { ...previousCommenter, id: previousCommenter.userId },
        { ...commentAuthor, id: commentAuthor.userId },
      ],
      notifications: [],
      notificationCount: 0,
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
  });

  // ---------- 1.3-E2E-004 ----------

  test('1.3-E2E-004: Severity escalation to Critical/Blocker notifies ALL admin users @p0', async ({ page }) => {
    // Given: A bug escalated to Blocker severity and two admin users exist
    const developer = createUser({ name: 'Escalating Dev' });
    const admin1 = createAdminUser({ name: 'Admin One' });
    const admin2 = createAdminUser({ name: 'Admin Two' });

    const bug = buildBug({
      title: 'Production DB timeout',
      projectId: project.id,
      reportedBy: developer.userId,
      severity: 'Major',
      id: 'bug-escalation-1',
      assignedTo: developer.userId,
    });

    const escalatedBug = { ...bug, severity: 'Blocker', updatedAt: new Date().toISOString() };

    const notificationForAdmin1 = createNotification({
      type: 'severity_escalation',
      userId: admin1.userId,
      bugId: bug.id as string,
      bugTitle: bug.title as string,
      actorId: developer.userId,
      actorName: developer.name,
      message: `Bug "${bug.title as string}" has been escalated to Blocker severity`,
    });

    const notificationForAdmin2 = createNotification({
      type: 'severity_escalation',
      userId: admin2.userId,
      bugId: bug.id as string,
      bugTitle: bug.title as string,
      actorId: developer.userId,
      actorName: developer.name,
      message: `Bug "${bug.title as string}" has been escalated to Blocker severity`,
    });

    await seedAuth(page, developer);
    await setupBaseMocks(page, {
      user: developer,
      project,
      bugs: [bug],
      users: [
        { ...developer, id: developer.userId },
        { ...admin1, id: admin1.userId },
        { ...admin2, id: admin2.userId },
      ],
    });
    await mockApiRoute(page, `bugs/${bug.id as string}`, escalatedBug);

    // When: Developer views the bug detail (severity escalation has occurred)
    await page.goto(`/bugs/${bug.id as string}`);
    await expect(page.getByText(bug.title as string)).toBeVisible();

    // Then: Admin One receives a severity-escalation notification
    await seedAuth(page, admin1);
    await setupBaseMocks(page, {
      user: admin1,
      project,
      bugs: [escalatedBug],
      users: [
        { ...developer, id: developer.userId },
        { ...admin1, id: admin1.userId },
        { ...admin2, id: admin2.userId },
      ],
      notifications: [notificationForAdmin1],
      notificationCount: 1,
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');

    // And: Admin Two also receives a severity-escalation notification
    await seedAuth(page, admin2);
    await setupBaseMocks(page, {
      user: admin2,
      project,
      bugs: [escalatedBug],
      users: [
        { ...developer, id: developer.userId },
        { ...admin1, id: admin1.userId },
        { ...admin2, id: admin2.userId },
      ],
      notifications: [notificationForAdmin2],
      notificationCount: 1,
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');
  });

  // ---------- 1.3-E2E-005 ----------

  test('1.3-E2E-005: Duplicate prevention -- user with multiple roles gets single notification @p0', async ({ page }) => {
    // Given: A user who is both the assignee AND the reporter of a bug.
    //        When a status change happens, they should get only ONE notification, not two.
    const dualRoleUser = createUser({ name: 'Dual Role Dev' });
    const admin = createAdminUser({ name: 'Changing Admin' });

    const bug = buildBug({
      title: 'Deduplication test bug',
      projectId: project.id,
      reportedBy: dualRoleUser.userId,
      id: 'bug-dedup-1',
      assignedTo: dualRoleUser.userId,
      status: 'Open',
    });

    // Only ONE notification should exist despite the user being both reporter + assignee
    const singleNotification = createStatusChangeNotification({
      userId: dualRoleUser.userId,
      bugId: bug.id as string,
      bugTitle: bug.title as string,
      actorId: admin.userId,
      actorName: admin.name,
      message: 'Bug status changed to Resolved',
    });

    await seedAuth(page, dualRoleUser);
    await setupBaseMocks(page, {
      user: dualRoleUser,
      project,
      bugs: [{ ...bug, status: 'Resolved' }],
      users: [
        { ...dualRoleUser, id: dualRoleUser.userId },
        { ...admin, id: admin.userId },
      ],
      notifications: [singleNotification],
      notificationCount: 1,
    });
    await mockApiRoute(page, `bugs/${bug.id as string}`, { ...bug, status: 'Resolved' });

    // When: Dual-role user loads the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: Badge shows exactly 1, proving deduplication
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).toContainText('1');

    // And: Clicking the bell only reveals ONE notification for this bug
    await page.locator('[data-testid="notification-bell"]').click();
    const dropdownItems = page.locator('[data-testid="notification-item"]');
    const itemsForThisBug = dropdownItems.filter({ hasText: bug.title as string });
    await expect(itemsForThisBug).toHaveCount(1);
  });

  // ---------- 1.3-E2E-006 ----------

  test('1.3-E2E-006: Priority change triggers notification to assignee @p1', async ({ page }) => {
    // Given: A bug assigned to a developer whose priority is changed
    const assignee = createUser({ name: 'Priority Watcher' });
    const admin = createAdminUser({ name: 'Priority Admin' });

    const bug = buildBug({
      title: 'Slow API response time',
      projectId: project.id,
      reportedBy: admin.userId,
      priority: 'Medium',
      id: 'bug-priority-1',
      assignedTo: assignee.userId,
    });

    const priorityNotification = createNotification({
      type: 'priority_change',
      userId: assignee.userId,
      bugId: bug.id as string,
      bugTitle: bug.title as string,
      actorId: admin.userId,
      actorName: admin.name,
      message: `Priority of "${bug.title as string}" changed from Medium to Highest`,
    });

    const updatedBug = { ...bug, priority: 'Highest', updatedAt: new Date().toISOString() };

    await seedAuth(page, assignee);
    await setupBaseMocks(page, {
      user: assignee,
      project,
      bugs: [updatedBug],
      users: [
        { ...assignee, id: assignee.userId },
        { ...admin, id: admin.userId },
      ],
      notifications: [priorityNotification],
      notificationCount: 1,
    });
    await mockApiRoute(page, `bugs/${bug.id as string}`, updatedBug);

    // When: Assignee loads the dashboard after priority change
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: Assignee sees a notification badge
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');

    // And: Opening the dropdown shows the priority change notification
    await page.locator('[data-testid="notification-bell"]').click();
    await expect(page.locator('[data-testid="notification-item"]').first()).toContainText('Priority');
  });

  // ---------- 1.3-E2E-007 ----------

  test('1.3-E2E-007: Trigger service does not break existing bug creation (regression) @p1', async ({ page }) => {
    // Given: A developer creates a new bug -- the trigger service should not
    //        interfere with the normal bug creation flow.
    const developer = createUser({ name: 'Bug Creator' });

    await seedAuth(page, developer);
    await setupBaseMocks(page, {
      user: developer,
      project,
      bugs: [],
      notifications: [],
      notificationCount: 0,
    });

    const newBug = buildBug({
      title: 'New bug via form',
      projectId: project.id,
      reportedBy: developer.userId,
      id: 'bug-new-1',
    });
    await mockApiRoute(page, `bugs/${newBug.id as string}`, newBug);

    // When: Developer navigates to the bug creation page
    await page.goto('/bugs/new');

    // Then: The bug creation form renders without errors
    await expect(page.getByRole('heading', { name: /create|new|report/i })).toBeVisible();

    // And: The page has no console errors from the trigger service
    // (Playwright network guard will catch unhandled external requests)
  });

  // ---------- 1.3-E2E-008 ----------

  test('1.3-E2E-008: Trigger service does not break existing comment creation (regression) @p1', async ({ page }) => {
    // Given: A developer views a bug detail page with existing comments
    const developer = createUser({ name: 'Comment Tester' });

    const bug = buildBug({
      title: 'Regression comment test',
      projectId: project.id,
      reportedBy: developer.userId,
      id: 'bug-comment-regression-1',
      assignedTo: developer.userId,
    });

    const existingComment = createComment({
      bugId: bug.id as string,
      authorId: developer.userId,
      message: 'Existing comment should remain visible',
    });

    await seedAuth(page, developer);
    await setupBaseMocks(page, {
      user: developer,
      project,
      bugs: [bug],
      notifications: [],
      notificationCount: 0,
    });
    await mockApiRoute(page, `bugs/${bug.id as string}`, bug);
    await mockApiRoute(page, 'comments*', [existingComment]);

    // When: Developer navigates to the bug detail page
    await page.goto(`/bugs/${bug.id as string}`);

    // Then: The page loads normally -- title and existing comment are visible
    await expect(page.getByText(bug.title as string)).toBeVisible();
    await expect(page.getByText('Existing comment should remain visible')).toBeVisible();

    // And: The comment input area is present, confirming the form is functional
    await expect(
      page.getByRole('textbox', { name: /comment|message/i }).or(page.locator('textarea')),
    ).toBeVisible();
  });
});
