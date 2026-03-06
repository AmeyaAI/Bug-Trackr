# Pipeline Context

## Push Info
- Branch: master
- Commits: N/A (requirements-driven from GitHub Issue #22)
- Repository: AmeyaAI/Bug-Trackr

## Change Classification
- Mode: **requirements**
- Source: GitHub Issue #22 — "New issue found- bug not saving"
- Pipeline trigger: `@tea-generate` by user `gangadharneeli`

## Requirements Scope

### Epic 1: User Management & Authentication

#### Story 1.1: User Login & Role Selection
- User can authenticate and land on the authorized page
- User can switch between available roles (Admin, Developer, Tester) via the sidebar
- Selected role persists across the session
- Unauthorized users are redirected to the login screen

#### Story 1.2: User Profile Display
- Sidebar displays user avatar, name, and active role
- User selector allows switching between registered users (for demo/dev purposes)

## Changed Source Files
Requirements-driven mode — no source file changes. Testing covers:
- `pages/login.tsx` — OAuth login page
- `pages/authorized.tsx` — OAuth callback
- `pages/select-role.tsx` — Role selection page
- `pages/settings.tsx` — Role switching + sign out
- `components/AuthGuard.tsx` — Auth redirect guard
- `components/AppSidebar.tsx` — Sidebar with nav links
- `components/SidebarUserSelector.tsx` — User profile display in sidebar
- `contexts/UserContext.tsx` — User state management
- `lib/models/user.ts` — User model with roles
- `lib/repositories/userRepository.ts` — User data access

## Test Scope
- Authentication flow (OAuth login, token handling, redirect)
- Role selection (single-role auto-redirect, multi-role picker)
- Role switching via settings page
- Role persistence across session (localStorage)
- Auth guard (redirect unauthorized users to login)
- Sidebar user profile display (avatar, name, role badge)
- User selector functionality

## Existing Tests
- `frontend/tests/e2e/auth.spec.ts` — OAuth flow, redirect to login, logout
- `frontend/tests/e2e/role-selection.spec.ts` — Single vs multi-role auto-redirect
- `frontend/tests/e2e/user-management.spec.ts` — Role switching, sidebar user/role display
- `frontend/tests/e2e/navigation.spec.ts` — Sidebar links, admin-only links

## Test Infrastructure
- Framework: Playwright
- Config: `frontend/playwright.config.ts`
- Base URL: `http://localhost:3005`
- Custom fixtures: `frontend/tests/support/fixtures/merged-fixtures.ts`
- Auth helpers: `frontend/tests/support/helpers/auth-seeding.ts` (seedAuth, seedAuthMultiRole, seedAuthWithWelcome)
- Network helpers: `frontend/tests/support/helpers/network-helper.ts` (mockApiRoute, waitForApiResponse)
- Factories: `frontend/tests/support/factories/` (user-factory.ts, etc.)

## Pipeline State
- change_source: github-issue
- changed_files: [requirements from issue #22]
- scope: user-management, authentication, role-selection, sidebar-profile
- mode: requirements
- framework_needed: false (Playwright already configured)
- test_design_output: _bmad-output/test-artifacts/test-design/test-design-pipeline-2026-03-06.md
- automate_attempt: 1
- generated_files: [frontend/tests/e2e/epic1-auth-login.spec.ts, frontend/tests/e2e/epic1-user-profile.spec.ts]
- automation_summary: _bmad-output/test-artifacts/automation-summary.md
- review_passed: true
- review_score: 92/100 (A+)
- gate_passed: true
- gate_decision: PASS (P0: 100%, Overall: 100%)
