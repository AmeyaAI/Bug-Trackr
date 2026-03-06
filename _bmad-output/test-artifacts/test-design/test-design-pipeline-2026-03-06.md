# Test Design: Notifications & Alerts System

**Mode:** System-Level (Comprehensive — Requirements-Driven)
**Source:** GitHub Issue #25 — PRD: Notifications & Alerts System
**Date:** 2026-03-06
**Framework:** Playwright E2E
**Repository:** AmeyaAI/Bug-Trackr

---

## 1. Requirements Summary

### Epic 1: Notification Infrastructure
- **Story 1.1:** Notification Data Model (`bug_tracking_notifications` collection)
- **Story 1.2:** Notification API Endpoints (GET, PATCH, count)
- **Story 1.3:** Notification Trigger Service (auto-create on bug events)

### Epic 2: Notification UI
- **Story 2.1:** Notification Bell & Dropdown (sidebar icon, badge, popover)
- **Story 2.2:** Notifications Page (`/notifications` route)
- **Story 2.3:** Real-Time Notification Updates (polling, toast, context)

### Epic 3: Notification Preferences
- **Story 3.1:** Notification Settings (toggle switches, quiet hours)

---

## 2. Testability Assessment

### Controllability
- **Strong:** Existing test infrastructure with factories, network mocking (`mockApiRoute`), and auth seeding allows full control over notification state
- **Strong:** Collection DB mock pattern supports creating `bug_tracking_notifications` mock data
- **Concern:** Notification trigger service integration with existing bug/comment API routes may require careful mock setup to verify notification creation side-effects

### Observability
- **Strong:** UI elements (bell icon, badge count, dropdown, toast) are directly observable in Playwright
- **Strong:** Network mocking allows verifying API calls made by the notification system
- **Concern:** Polling mechanism (30-second interval) requires time manipulation or accelerated polling in tests

### Reliability
- **Strong:** Existing test patterns with `blockUnmockedExternalRequests` prevent external API leakage
- **Concern:** Real-time polling tests may be flaky due to timing; use `page.waitForResponse` patterns
- **Concern:** Toast auto-dismiss (5 seconds) requires careful timing in assertions

### ASRs (Architecturally Significant Requirements)
- **ACTIONABLE:** Notification collection naming must follow existing pattern (`bug_tracking_notifications`)
- **ACTIONABLE:** API endpoints must follow existing Next.js pages/api pattern
- **FYI:** Polling approach intentionally simple (no WebSocket/SSE)

---

## 3. Risk Assessment

| ID | Risk | Category | P | I | Score | Action | Mitigation |
|----|------|----------|---|---|-------|--------|------------|
| R1 | Notification trigger service creates duplicate notifications | BUS | 2 | 3 | 6 | MITIGATE | Test deduplication logic explicitly |
| R2 | Polling mechanism causes excessive API calls or memory leaks | PERF | 2 | 2 | 4 | MONITOR | Test polling interval and cleanup |
| R3 | Notification dropdown fails to close when clicking outside | TECH | 2 | 1 | 2 | DOCUMENT | Standard Popover behavior test |
| R4 | Mark-all-as-read fails with large notification sets | PERF | 1 | 2 | 2 | DOCUMENT | Test with multiple notifications |
| R5 | Notification preferences not respected by trigger service | BUS | 2 | 3 | 6 | MITIGATE | Test each preference toggle effect |
| R6 | Bell badge count becomes stale or shows wrong number | TECH | 2 | 2 | 4 | MONITOR | Test count accuracy after operations |
| R7 | Toast notification blocks user interaction | TECH | 1 | 2 | 2 | DOCUMENT | Verify toast auto-dismiss |
| R8 | Notification navigation to bug detail fails for deleted bugs | TECH | 2 | 2 | 4 | MONITOR | Test edge case with missing bug |
| R9 | Quiet hours calculation incorrect across timezones | BUS | 2 | 2 | 4 | MONITOR | Test quiet hours boundary |
| R10 | Severity escalation notification not sent to all admins | BUS | 2 | 3 | 6 | MITIGATE | Test admin broadcast logic |

**High Risks (Score ≥ 6):** R1, R5, R10 — all require explicit test coverage with deduplication, preferences, and broadcast verification.

---

## 4. Coverage Matrix

### Epic 1, Story 1.1: Notification Data Model

| Test ID | Scenario | Level | Priority | Tags | AC Reference |
|---------|----------|-------|----------|------|-------------|
| 1.1-E2E-001 | Notification displays with all required fields (type icon, message, actor, timestamp, read state) | E2E | P1 | @p1 @regression | AC: collection fields |
| 1.1-E2E-002 | Unread notification count returns correct number | E2E | P1 | @p1 @regression | AC: countUnread |
| 1.1-E2E-003 | Notifications paginated correctly (limit/offset) | E2E | P2 | @p2 @regression | AC: findByUserId with pagination |

### Epic 1, Story 1.2: Notification API Endpoints

| Test ID | Scenario | Level | Priority | Tags | AC Reference |
|---------|----------|-------|----------|------|-------------|
| 1.2-E2E-001 | GET notifications returns paginated list sorted by createdAt desc | E2E | P1 | @p1 @regression | AC: GET /api/notifications |
| 1.2-E2E-002 | GET notifications with unreadOnly filter shows only unread | E2E | P1 | @p1 @regression | AC: unreadOnly param |
| 1.2-E2E-003 | PATCH mark single notification as read updates read state and readAt | E2E | P1 | @p1 @smoke | AC: PATCH /api/notifications/{id}/read |
| 1.2-E2E-004 | PATCH mark all notifications as read for a user | E2E | P1 | @p1 @regression | AC: PATCH /api/notifications/read-all |
| 1.2-E2E-005 | GET notification count returns unread and total counts | E2E | P1 | @p1 @smoke | AC: GET /api/notifications/count |

### Epic 1, Story 1.3: Notification Trigger Service

| Test ID | Scenario | Level | Priority | Tags | AC Reference |
|---------|----------|-------|----------|------|-------------|
| 1.3-E2E-001 | Bug assignment creates notification for assignee | E2E | P0 | @p0 @smoke | AC: Bug assigned |
| 1.3-E2E-002 | Bug status change creates notification for assignee and reporter | E2E | P0 | @p0 @smoke | AC: Bug status changed |
| 1.3-E2E-003 | New comment creates notification for assignee and previous commenters (not author) | E2E | P1 | @p1 @regression | AC: New comment |
| 1.3-E2E-004 | Priority change creates notification for assignee | E2E | P1 | @p1 @regression | AC: Priority changed |
| 1.3-E2E-005 | Severity escalation to Critical/Blocker notifies all project admins | E2E | P0 | @p0 @smoke | AC: Severity escalation |
| 1.3-E2E-006 | Duplicate notifications are not created (user is both assignee and commenter) | E2E | P1 | @p1 @regression | AC: No duplicates |

### Epic 2, Story 2.1: Notification Bell & Dropdown

| Test ID | Scenario | Level | Priority | Tags | AC Reference |
|---------|----------|-------|----------|------|-------------|
| 2.1-E2E-001 | Bell icon visible in sidebar header | E2E | P0 | @p0 @smoke | AC: Bell icon added |
| 2.1-E2E-002 | Red badge shows unread count; hidden when count is 0 | E2E | P0 | @p0 @smoke | AC: Badge with count |
| 2.1-E2E-003 | Clicking bell opens dropdown with 10 most recent notifications | E2E | P1 | @p1 @regression | AC: Dropdown panel |
| 2.1-E2E-004 | Each notification shows icon (by type), message, time ago, and read/unread state | E2E | P1 | @p1 @regression | AC: Notification item display |
| 2.1-E2E-005 | Unread notifications have highlight background | E2E | P2 | @p2 @regression | AC: Unread highlight |
| 2.1-E2E-006 | Clicking notification marks as read AND navigates to bug detail | E2E | P0 | @p0 @smoke | AC: Click behavior |
| 2.1-E2E-007 | "Mark all as read" button in dropdown marks all as read | E2E | P1 | @p1 @regression | AC: Mark all as read |
| 2.1-E2E-008 | "View all notifications" link navigates to /notifications | E2E | P1 | @p1 @regression | AC: View all link |
| 2.1-E2E-009 | Dropdown closes when clicking outside | E2E | P2 | @p2 @regression | AC: Click outside closes |

### Epic 2, Story 2.2: Notifications Page

| Test ID | Scenario | Level | Priority | Tags | AC Reference |
|---------|----------|-------|----------|------|-------------|
| 2.2-E2E-001 | Notifications page accessible at /notifications | E2E | P0 | @p0 @smoke | AC: New page at /notifications |
| 2.2-E2E-002 | Shows all notifications for current user, paginated (20 per page) | E2E | P1 | @p1 @regression | AC: Paginated display |
| 2.2-E2E-003 | Filter tabs: All, Unread, Assignments, Comments, Status Changes | E2E | P1 | @p1 @regression | AC: Filter tabs |
| 2.2-E2E-004 | Each notification shows type icon, full message, actor avatar, timestamp, read/unread | E2E | P1 | @p1 @regression | AC: Notification display |
| 2.2-E2E-005 | "Mark all as read" bulk action works | E2E | P1 | @p1 @regression | AC: Bulk mark all as read |
| 2.2-E2E-006 | Empty state message displayed when no notifications | E2E | P2 | @p2 @regression | AC: Empty state |
| 2.2-E2E-007 | Page title shows unread count: "Notifications (3)" | E2E | P2 | @p2 @regression | AC: Title with count |
| 2.2-E2E-008 | Notifications page accessible from sidebar navigation | E2E | P1 | @p1 @regression | AC: Accessible from sidebar |

### Epic 2, Story 2.3: Real-Time Notification Updates

| Test ID | Scenario | Level | Priority | Tags | AC Reference |
|---------|----------|-------|----------|------|-------------|
| 2.3-E2E-001 | Notification count badge updates when new notifications arrive (polling) | E2E | P1 | @p1 @regression | AC: Auto-update badge |
| 2.3-E2E-002 | Toast notification appears when new notification detected | E2E | P1 | @p1 @regression | AC: Toast notification |
| 2.3-E2E-003 | Toast shows message and "View" link, auto-dismisses after 5 seconds | E2E | P2 | @p2 @regression | AC: Toast content and dismiss |
| 2.3-E2E-004 | NotificationContext provides unreadCount, notifications, markAsRead, refreshNotifications | E2E | P2 | @p2 @regression | AC: Context API |

### Epic 3, Story 3.1: Notification Settings

| Test ID | Scenario | Level | Priority | Tags | AC Reference |
|---------|----------|-------|----------|------|-------------|
| 3.1-E2E-001 | Notifications section visible on /settings page | E2E | P1 | @p1 @smoke | AC: New section on settings |
| 3.1-E2E-002 | Toggle switches for each notification type with correct defaults (all ON) | E2E | P1 | @p1 @regression | AC: Toggle switches |
| 3.1-E2E-003 | Toggling a preference OFF prevents that notification type | E2E | P1 | @p1 @regression | AC: Preferences respected |
| 3.1-E2E-004 | Quiet hours toggle with configurable start/end times | E2E | P2 | @p2 @regression | AC: Quiet hours |
| 3.1-E2E-005 | Notification preferences saved and persisted across page reload | E2E | P1 | @p1 @regression | AC: Stored per-user |

---

## 5. Execution Strategy

### PR (CI) — All functional tests (estimated <10 min)
- Run all P0 + P1 + P2 tests tagged `@p0|@p1|@p2`
- Fast: Network-mocked, no real backend calls

### Smoke Suite — Quick confidence
- Run `@smoke` tagged tests (P0 critical paths)
- ~2 minutes

### Regression — Full suite
- Run all `@regression` tagged tests
- Includes edge cases and secondary flows

---

## 6. Resource Estimates

| Priority | Scenario Count | Estimated Effort |
|----------|---------------|-----------------|
| P0 | 6 | ~8–12 hours |
| P1 | 19 | ~15–25 hours |
| P2 | 9 | ~6–10 hours |
| P3 | 0 | — |
| **Total** | **34** | **~29–47 hours** |

---

## 7. Quality Gates

| Gate | Threshold |
|------|-----------|
| P0 pass rate | 100% |
| P1 pass rate | ≥ 95% |
| High-risk mitigations complete | R1, R5, R10 covered |
| Coverage target | ≥ 80% of acceptance criteria mapped |
| No critical risks OPEN | All score ≥ 6 risks have test coverage |

---

## 8. Test Infrastructure Needs

### New Factory Required
- `notification-factory.ts` — creates notification mock data with all fields

### Network Helper Updates
- Add `notifications` → `bug_tracking_notifications` to `COLLECTION_MAP`
- Add singular mapping for notification item routes

### No Framework Changes Needed
- Playwright already configured with correct test patterns
- Existing fixtures, helpers, and factory patterns are sufficient

---

## 9. Completion Report

- **Mode:** System-Level (Comprehensive Requirements-Driven)
- **Output:** `_bmad-output/test-artifacts/test-design/test-design-pipeline-2026-03-06.md`
- **Total scenarios:** 34 (6 P0, 19 P1, 9 P2)
- **Key risks:** R1 (duplicate notifications), R5 (preferences not respected), R10 (admin broadcast)
- **Framework needed:** No — Playwright already configured
- **Open assumptions:** Notification collection follows existing `bug_tracking_*` naming pattern; API endpoints follow existing Next.js pages/api patterns
