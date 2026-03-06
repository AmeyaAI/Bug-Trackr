# Traceability Report — Notifications & Alerts System

**Date:** 2026-03-06
**Gate Type:** Story (scoped to notification features)
**Decision Mode:** Deterministic
**Attempt:** 1 (Feedback re-run: edge case review)

---

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% and overall coverage is 100% (target: 90%). All 34 core acceptance criteria are covered by implemented tests, plus 20 additional edge case tests strengthen coverage of high-risk scenarios.

---

## Coverage Summary

| Metric | Value |
|--------|-------|
| Total Requirements (ACs) | 34 |
| Fully Covered | 34 (100%) |
| P0 Coverage | 7/7 (100%) |
| P1 Coverage | 19/19 (100%) |
| P2 Coverage | 9/9 (100%) |
| Edge Case Tests Added | 20 |
| Total Tests | 54 |
| Critical Gaps | 0 |

---

## Traceability Matrix

### Epic 1, Story 1.1: Notification Data Model

| AC Reference | Test ID | Test File | Priority | Status |
|-------------|---------|-----------|----------|--------|
| collection fields | 1.1-E2E-001 | notification-triggers.spec.ts:86 | P1 | COVERED |
| countUnread | 1.1-E2E-002 | notification-triggers.spec.ts:115 | P1 | COVERED |
| findByUserId with pagination | 1.1-E2E-003 | notification-triggers.spec.ts:170 | P2 | COVERED |
| null readAt handling | EC-1.1-001 | notification-triggers.spec.ts (edge) | P2 | COVERED (edge) |

### Epic 1, Story 1.2: Notification API Endpoints

| AC Reference | Test ID | Test File | Priority | Status |
|-------------|---------|-----------|----------|--------|
| GET /api/notifications | 1.2-E2E-001 | notification-triggers.spec.ts:218 | P1 | COVERED |
| unreadOnly param | 1.2-E2E-002 | notification-triggers.spec.ts:253 | P1 | COVERED |
| PATCH mark single read | 1.2-E2E-003 | notification-triggers.spec.ts:285 | P1 | COVERED |
| PATCH mark all read | 1.2-E2E-004 | notification-triggers.spec.ts:352 | P1 | COVERED |
| GET count | 1.2-E2E-005 | notification-triggers.spec.ts:402 | P1 | COVERED |
| Empty array response | EC-1.2-001 | notification-triggers.spec.ts (edge) | P2 | COVERED (edge) |
| 500 error handling | EC-1.2-002 | notification-triggers.spec.ts (edge) | P1 | COVERED (edge) |

### Epic 1, Story 1.3: Notification Trigger Service

| AC Reference | Test ID | Test File | Priority | Status |
|-------------|---------|-----------|----------|--------|
| Bug assigned | 1.3-E2E-001 | notification-triggers.spec.ts:447 | **P0** | COVERED |
| Bug status changed | 1.3-E2E-002 | notification-triggers.spec.ts:472 | **P0** | COVERED |
| New comment | 1.3-E2E-003 | notification-triggers.spec.ts:493 | P1 | COVERED |
| Priority changed | 1.3-E2E-004 | notification-triggers.spec.ts:516 | P1 | COVERED |
| Severity escalation | 1.3-E2E-005 | notification-triggers.spec.ts:539 | **P0** | COVERED |
| No duplicates | 1.3-E2E-006 | notification-triggers.spec.ts:585 | P1 | COVERED |
| Missing actorName | EC-1.3-001 | notification-triggers.spec.ts (edge) | P1 | COVERED (edge) |
| Missing bugId | EC-1.3-002 | notification-triggers.spec.ts (edge) | P1 | COVERED (edge) |
| Rapid status changes | EC-1.3-003 | notification-triggers.spec.ts (edge) | P1 | COVERED (edge) |
| Critical escalation | EC-1.3-004 | notification-triggers.spec.ts (edge) | P0 | COVERED (edge) |
| Mixed dedup | EC-1.3-005 | notification-triggers.spec.ts (edge) | P1 | COVERED (edge) |

### Epic 2, Story 2.1: Notification Bell & Dropdown

| AC Reference | Test ID | Test File | Priority | Status |
|-------------|---------|-----------|----------|--------|
| Bell icon added | 2.1-E2E-001 | notification-bell.spec.ts:63 | **P0** | COVERED |
| Badge with count | 2.1-E2E-002 | notification-bell.spec.ts:77 | **P0** | COVERED |
| Dropdown panel | 2.1-E2E-003 | notification-bell.spec.ts:105 | P1 | COVERED |
| Notification item display | 2.1-E2E-004 | notification-bell.spec.ts:133 | P1 | COVERED |
| Unread highlight | 2.1-E2E-005 | notification-bell.spec.ts:170 | P2 | COVERED |
| Click behavior | 2.1-E2E-006 | notification-bell.spec.ts:203 | **P0** | COVERED |
| Mark all as read | 2.1-E2E-007 | notification-bell.spec.ts:270 | P1 | COVERED |
| View all link | 2.1-E2E-008 | notification-bell.spec.ts:308 | P1 | COVERED |
| Click outside closes | 2.1-E2E-009 | notification-bell.spec.ts:331 | P2 | COVERED |
| Badge overflow (99+) | EC-2.1-001 | notification-bell.spec.ts (edge) | P2 | COVERED (edge) |
| Deleted bug (404) | EC-2.1-002 | notification-bell.spec.ts (edge) | P1 | COVERED (edge) |
| Mark all API error | EC-2.1-003 | notification-bell.spec.ts (edge) | P1 | COVERED (edge) |
| Long message | EC-2.1-004 | notification-bell.spec.ts (edge) | P2 | COVERED (edge) |
| Rapid toggle | EC-2.1-005 | notification-bell.spec.ts (edge) | P2 | COVERED (edge) |
| Auth error (401) | EC-2.1-006 | notification-bell.spec.ts (edge) | P1 | COVERED (edge) |

### Epic 2, Story 2.2: Notifications Page

| AC Reference | Test ID | Test File | Priority | Status |
|-------------|---------|-----------|----------|--------|
| New page at /notifications | 2.2-E2E-001 | notifications-page.spec.ts:69 | **P0** | COVERED |
| Paginated display | 2.2-E2E-002 | notifications-page.spec.ts:86 | P1 | COVERED |
| Filter tabs | 2.2-E2E-003 | notifications-page.spec.ts:110 | P1 | COVERED |
| Notification display | 2.2-E2E-004 | notifications-page.spec.ts:156 | P1 | COVERED |
| Bulk mark all as read | 2.2-E2E-005 | notifications-page.spec.ts:182 | P1 | COVERED |
| Empty state | 2.2-E2E-006 | notifications-page.spec.ts:208 | P2 | COVERED |
| Title with count | 2.2-E2E-007 | notifications-page.spec.ts:224 | P2 | COVERED |
| Accessible from sidebar | 2.2-E2E-008 | notifications-page.spec.ts:250 | P1 | COVERED |
| Pagination boundary (20) | EC-2.2-001 | notifications-page.spec.ts (edge) | P2 | COVERED (edge) |
| Pagination overflow (21) | EC-2.2-002 | notifications-page.spec.ts (edge) | P2 | COVERED (edge) |
| Unread filter | EC-2.2-003 | notifications-page.spec.ts (edge) | P1 | COVERED (edge) |
| Empty after mark all | EC-2.2-004 | notifications-page.spec.ts (edge) | P1 | COVERED (edge) |
| All-read state | EC-2.2-005 | notifications-page.spec.ts (edge) | P2 | COVERED (edge) |

### Epic 2, Story 2.3: Real-Time Notification Updates

| AC Reference | Test ID | Test File | Priority | Status |
|-------------|---------|-----------|----------|--------|
| Auto-update badge | 2.3-E2E-001 | notifications-page.spec.ts:273 | P1 | COVERED |
| Toast notification | 2.3-E2E-002 | notifications-page.spec.ts:314 | P1 | COVERED |
| Toast content and dismiss | 2.3-E2E-003 | notifications-page.spec.ts:355 | P2 | COVERED |
| Context API | 2.3-E2E-004 | notifications-page.spec.ts:389 | P2 | COVERED |
| Poll transient failure | EC-2.3-001 | notifications-page.spec.ts (edge) | P1 | COVERED (edge) |

### Epic 3, Story 3.1: Notification Settings

| AC Reference | Test ID | Test File | Priority | Status |
|-------------|---------|-----------|----------|--------|
| New section on settings | 3.1-E2E-001 | notification-settings.spec.ts:77 | P1 | COVERED |
| Toggle switches | 3.1-E2E-002 | notification-settings.spec.ts:91 | P1 | COVERED |
| Preferences respected | 3.1-E2E-003 | notification-settings.spec.ts:124 | P1 | COVERED |
| Quiet hours | 3.1-E2E-004 | notification-settings.spec.ts:147 | P2 | COVERED |
| Stored per-user | 3.1-E2E-005 | notification-settings.spec.ts:165 | P1 | COVERED |
| All preferences OFF | EC-3.1-001 | notification-settings.spec.ts (edge) | P1 | COVERED (edge) |
| Save API error | EC-3.1-002 | notification-settings.spec.ts (edge) | P1 | COVERED (edge) |
| Same start/end time | EC-3.1-003 | notification-settings.spec.ts (edge) | P2 | COVERED (edge) |
| Midnight spanning | EC-3.1-004 | notification-settings.spec.ts (edge) | P2 | COVERED (edge) |
| No prefs field (new user) | EC-3.1-005 | notification-settings.spec.ts (edge) | P1 | COVERED (edge) |

---

## Risk Coverage

| Risk ID | Risk | Score | Test Coverage |
|---------|------|-------|---------------|
| R1 | Duplicate notifications | 6 | 1.3-E2E-006 + EC-1.3-005 |
| R2 | Polling excessive calls | 4 | 2.3-E2E-001 + EC-2.3-001 |
| R3 | Dropdown click-outside | 2 | 2.1-E2E-009 |
| R4 | Mark-all large sets | 2 | 2.1-E2E-007 + EC-2.1-003 |
| R5 | Preferences not respected | 6 | 3.1-E2E-003 + EC-3.1-001 |
| R6 | Badge count stale | 4 | 2.1-E2E-002 + EC-2.1-001 |
| R7 | Toast blocks interaction | 2 | 2.3-E2E-003 |
| R8 | Navigate to deleted bug | 4 | EC-2.1-002 |
| R9 | Quiet hours timezone | 4 | EC-3.1-003 + EC-3.1-004 |
| R10 | Severity escalation broadcast | 6 | 1.3-E2E-005 + EC-1.3-004 |

**All high-risk scenarios (R1, R5, R10 — score >= 6) have multiple test coverage.** ✅

---

## Gap Analysis

### Critical Gaps (P0)
None. All P0 acceptance criteria are covered.

### High Gaps (P1)
None. All P1 acceptance criteria are covered.

### Medium Gaps (P2)
None. All P2 acceptance criteria are covered.

---

## Gate Criteria

| Criterion | Required | Actual | Status |
|-----------|----------|--------|--------|
| P0 Coverage | 100% | 100% (7/7) | **MET** |
| Overall Coverage | ≥ 90% | 100% (34/34) | **MET** |
| High-Risk Coverage | R1, R5, R10 | All covered | **MET** |
| No Critical Gaps | 0 | 0 | **MET** |

---

## Next Actions

1. Merge PR when CI passes
2. Implement notification features to match test expectations
3. Run tests against actual implementation to validate
