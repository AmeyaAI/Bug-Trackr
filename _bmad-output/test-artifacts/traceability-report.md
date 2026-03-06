# Traceability Report

**Generated:** 2026-03-06
**Scope:** Comprehensive — storyreq.md (7 Epics, 18 Stories, 54 test scenarios)
**Gate Type:** Story
**Decision Mode:** Deterministic

---

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% and overall coverage is 98% (target: 90%). The only uncovered requirement (7.1-E2E-001 — AI Chatbot) is P3 and explicitly deferred because the feature is not yet implemented.

---

## Coverage Summary

| Metric | Value |
|--------|-------|
| Total Requirements | 54 |
| Fully Covered | 53 (98%) |
| Partially Covered | 0 (0%) |
| Uncovered | 1 (2%) |
| P0 Coverage | 8/8 (100%) |
| P1 Coverage | 29/29 (100%) |
| P2 Coverage | 16/16 (100%) |
| P3 Coverage | 0/1 (0% — deferred) |

---

## Gate Criteria

| Criterion | Required | Actual | Status |
|-----------|----------|--------|--------|
| P0 Coverage | 100% | 100% | MET |
| Overall Coverage Target | 90% | 98% | MET |
| Critical Gaps (P0) | 0 | 0 | MET |

---

## Traceability Matrix

### Epic 1: User Management & Authentication

| Req ID | Scenario | Priority | Test File | Coverage |
|--------|----------|----------|-----------|----------|
| 1.1-E2E-001 | Authenticated user lands on dashboard | P0 | `auth.spec.ts` | FULL |
| 1.1-E2E-002 | Unauthenticated user redirected to login | P0 | `auth.spec.ts` | FULL |
| 1.1-E2E-003 | User can switch roles via sidebar | P1 | `role-selection.spec.ts` | FULL |
| 1.1-E2E-004 | Selected role persists across session | P1 | `role-selection.spec.ts` | FULL |
| 1.1-E2E-005 | Logout clears tokens and redirects | P0 | `auth.spec.ts` | FULL |
| 1.2-E2E-001 | Sidebar shows user avatar, name, role | P1 | `user-management.spec.ts` | FULL |
| 1.2-E2E-002 | User selector switches between users | P2 | `user-management.spec.ts` | FULL |

### Epic 2: Project Management

| Req ID | Scenario | Priority | Test File | Coverage |
|--------|----------|----------|-----------|----------|
| 2.1-E2E-001 | Projects listed in sidebar | P1 | `projects.spec.ts` | FULL |
| 2.1-E2E-002 | Clicking project navigates to bug list | P1 | `projects.spec.ts` | FULL |
| 2.2-E2E-001 | Admin can create project with name | P0 | `project-management.spec.ts` | FULL |
| 2.2-E2E-002 | New project appears in sidebar immediately | P1 | `project-management.spec.ts` | FULL |
| 2.2-E2E-003 | Non-admin cannot create project | P1 | `role-permissions.spec.ts` | FULL |

### Epic 3: Bug Tracking (Core)

| Req ID | Scenario | Priority | Test File | Coverage |
|--------|----------|----------|-----------|----------|
| 3.1-E2E-001 | Bug creation happy path | P0 | `bug-creation.spec.ts` | FULL |
| 3.1-E2E-002 | Type selection dialog with all options | P0 | `bug-creation.spec.ts` | FULL |
| 3.1-E2E-003 | Title validation < 5 chars rejected | P1 | `bug-creation.spec.ts` | FULL |
| 3.1-E2E-004 | Priority levels displayed correctly | P1 | `bug-crud.spec.ts` | FULL |
| 3.1-E2E-005 | Multiple tags can be selected | P2 | `bug-crud.spec.ts` | FULL |
| 3.1-E2E-006 | Bug defaults to Open status | P1 | `bug-crud.spec.ts` | FULL |
| 3.2-E2E-001 | Bug list shows cards with key fields | P0 | `bug-list.spec.ts` | FULL |
| 3.2-E2E-002 | Filter by status | P1 | `bug-filters.spec.ts` | FULL |
| 3.2-E2E-003 | Filter by priority | P1 | `bug-filters.spec.ts` | FULL |
| 3.2-E2E-004 | Filter by type | P1 | `bug-filters.spec.ts` | FULL |
| 3.3-E2E-001 | Detail view shows all bug fields | P0 | `bug-detail.spec.ts` | FULL |
| 3.3-E2E-002 | Comments section displayed | P1 | `bug-detail.spec.ts` | FULL |
| 3.3-E2E-003 | Activity log visible | P1 | `bug-detail.spec.ts` | FULL |
| 3.4-E2E-001 | Status transition Open -> In Progress | P0 | `bug-status.spec.ts` | FULL |
| 3.4-E2E-002 | Status change recorded in activity log | P1 | `bug-status.spec.ts` | FULL |
| 3.4-E2E-003 | Only authorized roles can change status | P1 | `role-permissions.spec.ts` | FULL |
| 3.5-E2E-001 | Assignee selected from dropdown | P1 | `bug-crud.spec.ts` | FULL |
| 3.5-E2E-002 | Assignment recorded in activity log | P1 | `bug-crud.spec.ts` | FULL |
| 3.5-E2E-003 | Bug can be unassigned (set to null) | P2 | `bug-unassign.spec.ts` *(NEW)* | FULL |
| 3.6-E2E-001 | Edit title and description | P1 | `bug-crud.spec.ts` | FULL |
| 3.6-E2E-002 | Edit recorded in activity log | P1 | `bug-crud.spec.ts` | FULL |
| 3.6-E2E-003 | Validation enforced on required fields | P1 | `bug-edit-validation.spec.ts` *(NEW)* | FULL |
| 3.7-E2E-001 | Tester toggles validated boolean | P1 | `bug-validation.spec.ts` *(NEW)* | FULL |
| 3.7-E2E-002 | Validation status visible on card/detail | P1 | `bug-validation.spec.ts` *(NEW)* | FULL |
| 3.7-E2E-003 | Validation confirmation dialog | P2 | `bug-validation.spec.ts` *(NEW)* | FULL |

### Epic 4: Sprint Management

| Req ID | Scenario | Priority | Test File | Coverage |
|--------|----------|----------|-----------|----------|
| 4.1-E2E-001 | Sprint creation with name and dates | P1 | `sprint-management.spec.ts` | FULL |
| 4.1-E2E-002 | Sprint appears in management view | P1 | `sprint-management.spec.ts` | FULL |
| 4.2-E2E-001 | Bug linked to sprint via sprintId | P1 | `sprint-management.spec.ts` | FULL |
| 4.2-E2E-002 | Bug moved between sprints | P2 | `sprint-management.spec.ts` | FULL |

### Epic 5: Collaboration

| Req ID | Scenario | Priority | Test File | Coverage |
|--------|----------|----------|-----------|----------|
| 5.1-E2E-001 | User adds a comment with markdown | P1 | `comments-activity.spec.ts` | FULL |
| 5.1-E2E-002 | Comments displayed chronologically | P1 | `comments-activity.spec.ts` | FULL |
| 5.1-E2E-003 | Comment shows author and timestamp | P2 | `comments-activity.spec.ts` | FULL |
| 5.2-E2E-001 | Activity log shows status changes | P1 | `comments-activity.spec.ts` | FULL |
| 5.2-E2E-002 | Global activity page shows recent activity | P2 | `comments-activity.spec.ts` | FULL |

### Epic 6: UI/UX

| Req ID | Scenario | Priority | Test File | Coverage |
|--------|----------|----------|-----------|----------|
| 6.1-E2E-001 | Theme toggle in sidebar | P2 | `ui-theme.spec.ts` | FULL |
| 6.1-E2E-002 | Preference persists across sessions | P2 | `ui-theme.spec.ts` | FULL |
| 6.2-E2E-001 | Sidebar collapses on small screens | P2 | `responsive.spec.ts` | FULL |
| 6.2-E2E-002 | Bug cards usable on mobile viewports | P2 | `responsive.spec.ts` | FULL |
| 6.3-E2E-001 | Welcome screen when no project selected | P2 | `welcome-screen.spec.ts` *(NEW)* | FULL |
| 6.3-E2E-002 | Quick actions to create/view projects | P2 | `welcome-screen.spec.ts` *(NEW)* | FULL |
| 6.4-E2E-001 | Columns for each status displayed | P1 | `kanban-board.spec.ts` | FULL |
| 6.4-E2E-002 | Bug cards in correct status column | P1 | `kanban-board.spec.ts` | FULL |

### Epic 7: Chatbot Integration

| Req ID | Scenario | Priority | Test File | Coverage |
|--------|----------|----------|-----------|----------|
| 7.1-E2E-001 | Chatbot accessible from UI | P3 | — | NONE (DEFERRED) |

---

## Gaps & Recommendations

### Uncovered Requirements

| Req ID | Story | Priority | Reason |
|--------|-------|----------|--------|
| 7.1-E2E-001 | 7.1 | P3 | Feature not yet implemented — chatbot integration deferred |

### Recommendations

1. **LOW** — Story 7.1 (AI Chatbot) tests should be created when the chatbot feature is implemented
2. **LOW** — Run `test-review` to address P1 quality findings (conditional flow patterns in generated tests)

---

## New Tests Added by Pipeline

| File | Story | Tests | Priority |
|------|-------|-------|----------|
| `bug-validation.spec.ts` | 3.7 | 3 | P1 x2, P2 x1 |
| `welcome-screen.spec.ts` | 6.3 | 2 | P2 x2 |
| `bug-unassign.spec.ts` | 3.5 | 1 | P2 x1 |
| `bug-edit-validation.spec.ts` | 3.6 | 1 | P1 x1 |

**Total:** 7 new tests covering 4 previously gapped stories

---

## Next Actions

- GATE: PASS — Release approved, coverage meets standards
- All P0 requirements have 100% coverage
- All P1 requirements have 100% coverage
- Overall coverage at 98% exceeds 90% target
- Only gap is P3 chatbot (deferred — not yet implemented)
