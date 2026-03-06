# Test Design: Epic 1 - User Management & Authentication

**Date:** 2026-03-06
**Author:** TEA Pipeline (triggered by @gangadharneeli)
**Status:** Draft
**Source:** GitHub Issue #22

---

## Executive Summary

**Scope:** Epic-level test design for Epic 1 — User Management & Authentication

**Risk Summary:**

- Total risks identified: 6
- High-priority risks (>=6): 2
- Critical categories: SEC, BUS

**Coverage Summary:**

- P0 scenarios: 6 (~12-18 hours)
- P1 scenarios: 5 (~5-10 hours)
- P2 scenarios: 3 (~1.5-3 hours)
- P3 scenarios: 2 (~0.5-1 hours)
- **Total effort**: ~19-32 hours (~3-4 days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| **Google OAuth popup flow** | Relies on external auth-sandbox.ameya.ai; cannot be tested in isolated E2E | Auth tokens are seeded via localStorage; OAuth integration is out of scope |
| **Group Management iframe widget** | External S3-hosted widget; admin-only; not part of Epic 1 stories | Covered by separate admin tests |
| **Backend Collection DB CRUD** | No backend server; all data access is client-side to external API | API calls are mocked via route interception |

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | SEC | Auth guard bypass: unauthenticated users accessing protected routes | 2 | 3 | 6 | E2E tests for redirect on all protected routes | QA | Sprint 1 |
| R-002 | BUS | Role persistence failure: selected role not persisted across page navigations, causing incorrect permissions | 2 | 3 | 6 | E2E tests verifying localStorage persistence and role consistency across navigations | QA | Sprint 1 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-003 | SEC | Token expiration not handled gracefully, leaving user in broken state | 2 | 2 | 4 | Seed expired tokens and verify redirect to login | QA |
| R-004 | BUS | Multi-role user unable to switch roles, stuck on one role | 2 | 2 | 4 | E2E test for full role switch flow via settings | QA |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-005 | TECH | Sidebar collapse/expand breaks user profile display | 1 | 2 | 2 | Monitor |
| R-006 | BUS | Avatar initials incorrectly computed for edge-case names | 1 | 1 | 1 | Monitor |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## Entry Criteria

- [x] Requirements and acceptance criteria defined (Issue #22)
- [x] Test environment provisioned (localhost:3005 via Next.js dev server)
- [x] Test data factories ready (user-factory.ts with createUser, createAdminUser, createTesterUser)
- [x] Auth seeding helpers available (seedAuth, seedAuthMultiRole, seedAuthWithWelcome)
- [x] Network mocking infrastructure in place (mockApiRoute, blockUnmockedExternalRequests)

## Exit Criteria

- [ ] All P0 tests passing
- [ ] All P1 tests passing (or failures triaged)
- [ ] No open high-priority / high-severity bugs
- [ ] Test coverage agreed as sufficient for auth and role management flows

---

## Test Coverage Plan

### Traceability Matrix

| Req ID | Acceptance Criteria | Test ID(s) | Priority | Test Level |
| --- | --- | --- | --- | --- |
| AC-1.1.1 | User can authenticate and land on the authorized page | 1.1-E2E-001, 1.1-E2E-002 | P0 | E2E |
| AC-1.1.2 | User can switch between available roles (Admin, Developer, Tester) via sidebar | 1.1-E2E-003, 1.1-E2E-004 | P0 | E2E |
| AC-1.1.3 | Selected role persists across the session | 1.1-E2E-005, 1.1-E2E-006 | P0 | E2E |
| AC-1.1.4 | Unauthorized users are redirected to the login screen | 1.1-E2E-007, 1.1-E2E-008 | P0 | E2E |
| AC-1.2.1 | Sidebar displays user avatar, name, and active role | 1.2-E2E-001, 1.2-E2E-002, 1.2-E2E-003 | P1 | E2E |
| AC-1.2.2 | User selector allows switching between registered users (for demo/dev) | 1.2-E2E-004, 1.2-E2E-005 | P1 | E2E |

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (>=6) + No workaround

| Scenario ID | Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| 1.1-E2E-001 | Authenticated user with seeded token lands on dashboard | E2E | R-001 | Verifies auth flow end-to-end |
| 1.1-E2E-002 | Unauthenticated user is redirected from protected route to /login | E2E | R-001 | AuthGuard redirect validation |
| 1.1-E2E-003 | Multi-role user can switch role via Settings > Switch Role | E2E | R-004 | Full role switch flow |
| 1.1-E2E-005 | Selected role persists in localStorage after page navigation | E2E | R-002 | Role persistence validation |
| 1.1-E2E-007 | Logout clears tokens and redirects to /login | E2E | R-001 | Token cleanup verification |
| 1.1-E2E-008 | Accessing /settings without auth redirects to /login | E2E | R-001 | Auth guard on settings page |

**Total P0**: 6 tests, ~12-18 hours

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Scenario ID | Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| 1.1-E2E-004 | Single-role user auto-redirects past role selection to dashboard | E2E | - | UX: skip unnecessary step |
| 1.1-E2E-006 | Role persists after navigating between multiple pages | E2E | R-002 | Extended persistence check |
| 1.2-E2E-001 | Sidebar displays user name and role badge for developer | E2E | - | Profile display |
| 1.2-E2E-002 | Sidebar displays correct avatar initials for user | E2E | R-006 | Avatar rendering |
| 1.2-E2E-003 | Sidebar displays different role badge variants (admin/dev/tester) | E2E | - | Badge variant validation |

**Total P1**: 5 tests, ~5-10 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Scenario ID | Scenario | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| 1.2-E2E-004 | User selector shows multiple registered users | E2E | - | Demo/dev feature |
| 1.2-E2E-005 | Switching user via selector updates sidebar display | E2E | - | User switching |
| 1.1-E2E-009 | Sidebar collapses/expands and user profile remains visible | E2E | R-005 | Responsive sidebar |

**Total P2**: 3 tests, ~1.5-3 hours

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Edge cases

| Scenario ID | Scenario | Test Level | Notes |
| --- | --- | --- | --- |
| 1.2-E2E-006 | Avatar initials for single-name user (no last name) | E2E | Edge case |
| 1.1-E2E-010 | Mobile sidebar shows user info correctly | E2E | Responsive |

**Total P3**: 2 tests, ~0.5-1 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] 1.1-E2E-001: Authenticated session loads dashboard (30s)
- [ ] 1.1-E2E-002: Unauthenticated redirect to /login (30s)
- [ ] 1.1-E2E-007: Logout clears session (30s)

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [ ] 1.1-E2E-001: Auth session + dashboard load (E2E)
- [ ] 1.1-E2E-002: Unauth redirect (E2E)
- [ ] 1.1-E2E-003: Role switching via settings (E2E)
- [ ] 1.1-E2E-005: Role persistence in localStorage (E2E)
- [ ] 1.1-E2E-007: Logout flow (E2E)
- [ ] 1.1-E2E-008: Auth guard on /settings (E2E)

**Total**: 6 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] 1.1-E2E-004: Single-role auto-redirect (E2E)
- [ ] 1.1-E2E-006: Multi-page role persistence (E2E)
- [ ] 1.2-E2E-001: Sidebar user name + role badge (E2E)
- [ ] 1.2-E2E-002: Avatar initials display (E2E)
- [ ] 1.2-E2E-003: Role badge variants (E2E)

**Total**: 5 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] 1.2-E2E-004: User selector shows multiple users (E2E)
- [ ] 1.2-E2E-005: User switching updates sidebar (E2E)
- [ ] 1.1-E2E-009: Sidebar collapse/expand profile (E2E)
- [ ] 1.2-E2E-006: Single-name avatar initials (E2E)
- [ ] 1.1-E2E-010: Mobile sidebar user info (E2E)

**Total**: 5 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| --- | --- | --- | --- | --- |
| P0 | 6 | 2.0-3.0 | 12-18 | Auth flows, security-critical |
| P1 | 5 | 1.0-2.0 | 5-10 | Standard UI validation |
| P2 | 3 | 0.5-1.0 | 1.5-3 | Edge cases, secondary flows |
| P3 | 2 | 0.25-0.5 | 0.5-1 | Exploratory, low priority |
| **Total** | **16** | **-** | **~19-32** | **~3-4 days** |

### Prerequisites

**Test Data:**

- `createUser` factory (faker-based, role configurable)
- `createAdminUser` / `createTesterUser` convenience factories
- `seedAuth` / `seedAuthMultiRole` for auth token seeding

**Tooling:**

- Playwright for E2E browser automation
- `@seontechnologies/playwright-utils` for API request, network monitoring
- `mockApiRoute` helper for Collection DB route interception

**Environment:**

- Next.js dev server on localhost:3005
- No external dependencies required (all APIs mocked)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: >=95% (waivers required for failures)
- **P2/P3 pass rate**: >=90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths (auth, role selection)**: >=80%
- **Security scenarios (auth guard, token handling)**: 100%
- **Business logic (role switching, persistence)**: >=70%
- **Edge cases**: >=50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (>=6) items unmitigated
- [ ] Security tests (SEC category) pass 100%

---

## Mitigation Plans

### R-001: Auth Guard Bypass (Score: 6)

**Mitigation Strategy:** Comprehensive E2E tests covering all protected routes (/bugs, /projects, /settings, /) to verify redirect to /login when unauthenticated
**Owner:** QA
**Timeline:** Sprint 1
**Status:** Planned
**Verification:** All P0 auth redirect tests pass consistently

### R-002: Role Persistence Failure (Score: 6)

**Mitigation Strategy:** E2E tests that set a role, navigate across pages, and verify the role is maintained in both UI display and localStorage
**Owner:** QA
**Timeline:** Sprint 1
**Status:** Planned
**Verification:** Role value in localStorage matches displayed role after navigation

---

## Assumptions and Dependencies

### Assumptions

1. Auth tokens can be seeded via localStorage without real OAuth flow
2. Collection DB API responses can be fully mocked via Playwright route interception
3. The `select-role` page correctly reads `availableRoles` from the user context
4. Role switching via Settings navigates to `/select-role` and back

### Dependencies

1. `seedAuth` / `seedAuthMultiRole` helpers functioning correctly
2. `mockApiRoute` helper mapping friendly names to Collection DB URLs
3. Next.js dev server running on port 3005

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| **AuthGuard** | Central to all protected routes | Existing auth.spec.ts tests must pass |
| **UserContext** | Role state used by sidebar, permissions, nav | Existing role-selection.spec.ts and navigation.spec.ts |
| **AppSidebar** | Displays user profile, navigation links | Existing navigation.spec.ts |
| **SidebarUserSelector** | Shows avatar, name, role badge | New tests + existing user-management.spec.ts |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- Source Issue: GitHub Issue #22
- Requirements: Epic 1 — User Management & Authentication (Story 1.1, Story 1.2)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `_bmad/tea/testarch/test-design`
**Pipeline mode**: requirements (comprehensive)
