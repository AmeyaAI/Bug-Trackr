# PRD: Notifications & Alerts System

## Overview

Add a real-time notification system to BugTrackr that alerts users when bugs they're involved with are updated, assigned, commented on, or change status. This eliminates the need for users to manually check for updates and improves team collaboration speed.

## Problem Statement

Currently, BugTrackr users have no way to know when something changes on a bug they care about unless they manually navigate to it. Developers miss status updates, testers don't know when bugs are reassigned to them, and admins can't track critical severity escalations — all of which slow down the bug resolution workflow.

## Goals

1. Users are notified within seconds of relevant bug activity
2. Reduce time-to-awareness for bug assignments and status changes from hours to seconds
3. Provide a persistent notification history so users can review missed alerts
4. Support both in-app and browser push notifications

## Non-Goals

- Email notifications (future phase)
- Slack/Teams integrations (future phase)
- SMS alerts

---

# Epic 1: Notification Infrastructure

## Description

Build the backend notification system — data model, API endpoints, and real-time delivery mechanism.

### Story 1.1: Notification Data Model

**As a** developer,
**I want** a notifications collection in the database,
**So that** notifications can be stored, queried, and marked as read.

**Acceptance Criteria:**

- A new `bug_tracking_notifications` collection is created with fields:
  - `id` (string, auto-generated)
  - `userId` (string, references users collection) — the recipient
  - `type` (enum: `assignment`, `status_change`, `comment`, `priority_change`, `severity_escalation`, `mention`)
  - `bugId` (string, references bugs collection)
  - `bugTitle` (string, denormalized for display)
  - `message` (string, human-readable notification text)
  - `actorId` (string, references users collection) — who triggered it
  - `actorName` (string, denormalized)
  - `isRead` (boolean, default false)
  - `readAt` (datetime, nullable)
  - `createdAt` (datetime)
- Repository layer supports: create, findByUserId (with pagination), markAsRead, markAllAsRead, countUnread
- Validation: userId and bugId must reference existing records

### Story 1.2: Notification API Endpoints

**As a** frontend developer,
**I want** REST API endpoints for notifications,
**So that** the UI can fetch, display, and manage notifications.

**Acceptance Criteria:**

- `GET /api/notifications?userId={id}&unreadOnly={bool}&limit={n}&offset={n}` — returns paginated notifications for a user, sorted by createdAt descending
- `PATCH /api/notifications/{id}/read` — marks a single notification as read, sets readAt timestamp
- `PATCH /api/notifications/read-all?userId={id}` — marks all notifications as read for a user
- `GET /api/notifications/count?userId={id}` — returns `{ unread: number, total: number }`
- All endpoints return proper HTTP status codes (200, 400, 404)
- Response includes related bug title and actor name (denormalized)

### Story 1.3: Notification Trigger Service

**As a** system,
**I want** notifications to be automatically created when relevant bug events occur,
**So that** users are alerted without manual intervention.

**Acceptance Criteria:**

- A `NotificationService` is created in `lib/services/` with a `notify(event)` method
- Notifications are triggered on these events:
  - **Bug assigned**: Notify the assignee — "You were assigned to bug #{bugId}: {title}"
  - **Bug status changed**: Notify the assignee and reporter — "Bug #{bugId} status changed from {old} to {new}"
  - **New comment**: Notify the bug assignee and all previous commenters (except the comment author) — "{actor} commented on bug #{bugId}: {title}"
  - **Priority changed**: Notify the assignee — "Bug #{bugId} priority changed from {old} to {new}"
  - **Severity escalated to Critical/Blocker**: Notify ALL project admins — "URGENT: Bug #{bugId} escalated to {severity}"
- The service is called from existing API routes (bugs/status, bugs/assign, comments/create) without breaking existing functionality
- Duplicate notifications are not created (e.g., if user is both assignee and commenter, they get one notification)

---

# Epic 2: Notification UI

## Description

Build the frontend notification components — bell icon, dropdown panel, notification list page, and real-time badge updates.

### Story 2.1: Notification Bell & Dropdown

**As a** user,
**I want** a notification bell icon in the sidebar header,
**So that** I can see at a glance if I have new notifications.

**Acceptance Criteria:**

- A bell icon is added to the `AppSidebar` component header, next to the user selector
- A red badge shows the unread notification count (hidden when count is 0)
- Clicking the bell opens a dropdown panel showing the 10 most recent notifications
- Each notification item shows: icon (based on type), message, time ago (e.g., "2m ago"), and read/unread state
- Unread notifications have a subtle highlight background
- Clicking a notification: marks it as read AND navigates to the related bug detail page
- A "Mark all as read" button at the top of the dropdown
- A "View all notifications" link at the bottom that navigates to `/notifications`
- The dropdown closes when clicking outside

### Story 2.2: Notifications Page

**As a** user,
**I want** a full notifications page,
**So that** I can review my complete notification history.

**Acceptance Criteria:**

- A new page at `/notifications` accessible from the sidebar
- Shows all notifications for the current user, paginated (20 per page)
- Filter tabs: All | Unread | Assignments | Comments | Status Changes
- Each notification shows: type icon, full message, actor avatar, timestamp, read/unread state
- Bulk actions: "Mark selected as read", "Mark all as read"
- Empty state message when no notifications exist
- Page title shows unread count: "Notifications (3)"

### Story 2.3: Real-Time Notification Updates

**As a** user,
**I want** notifications to appear in real-time without refreshing the page,
**So that** I'm immediately aware of bug activity.

**Acceptance Criteria:**

- The notification count badge updates automatically when new notifications arrive
- Polling mechanism: fetch unread count every 30 seconds via `GET /api/notifications/count`
- When a new notification is detected (count increases), show a brief toast notification in the bottom-right corner
- Toast shows: notification message, "View" link, auto-dismisses after 5 seconds
- A `NotificationContext` provider wraps the app to manage notification state globally
- The context exposes: `unreadCount`, `notifications`, `markAsRead()`, `refreshNotifications()`

---

# Epic 3: Notification Preferences

## Description

Allow users to control which notifications they receive and how they're displayed.

### Story 3.1: Notification Settings

**As a** user,
**I want** to configure my notification preferences,
**So that** I only receive alerts that are relevant to me.

**Acceptance Criteria:**

- A new "Notifications" section is added to the existing `/settings` page
- Toggle switches for each notification type:
  - Bug assignments (default: ON)
  - Status changes on my bugs (default: ON)
  - New comments on my bugs (default: ON)
  - Priority changes (default: ON)
  - Severity escalations (default: ON, admin only)
  - Mentions (default: ON)
- A "Quiet hours" toggle: suppress notifications between configurable start/end times
- Settings are stored per-user in the users collection (new `notificationPreferences` field)
- `PATCH /api/users/{id}/notification-preferences` endpoint to update preferences
- The NotificationService respects user preferences before creating notifications

---

## Technical Notes

- All new API routes follow existing patterns in `pages/api/`
- Use the existing `CollectionDBService` and repository pattern for data access
- Notification components should use ShadCN UI primitives (Popover for dropdown, Badge for count)
- The polling approach is intentionally simple — SSE or WebSocket upgrade is deferred to a future phase
- All timestamps use ISO 8601 format consistent with existing collections
