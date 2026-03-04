# BugTrackr Frontend - Test Suite

## Setup

```bash
# Install dependencies (includes @playwright/test)
npm install

# Install Playwright browsers
npx playwright install

# Copy test environment file
cp tests/.env.example .env.local
```

## Running Tests

```bash
# Run all E2E tests (Chromium only)
npm run test:e2e

# Run smoke tests only (~2 min)
npm run test:e2e:smoke

# Run P0 critical tests
npm run test:e2e:p0

# Run P0 + P1 tests
npm run test:e2e:p0-p1

# Run full regression suite
npm run test:e2e:regression

# Run across all browsers
npm test

# Interactive UI mode
npm run test:ui

# Headed mode (see browser)
npx playwright test --headed

# Run a specific file
npx playwright test tests/e2e/auth.spec.ts

# Run tests matching a pattern
npx playwright test --grep "Bug List"

# Debug a test
npx playwright test --debug

# Show last HTML report
npm run test:report
```

## Test Suite Structure

```
tests/
├── e2e/                              # 50 E2E test cases across 12 files
│   ├── auth.spec.ts                  # AUTH-E2E-001..003 (auth, redirect, logout)
│   ├── role-selection.spec.ts        # ROLE-E2E-001..002 (single/multi-role)
│   ├── role-permissions.spec.ts      # ROLE-E2E-003..006 (tester/dev/admin perms)
│   ├── bug-creation.spec.ts          # BUG-E2E-001,004,005,015..017 (form, validation)
│   ├── bug-list.spec.ts              # BUG-E2E-003,012..014,019 (list, filter, search)
│   ├── bug-detail.spec.ts            # BUG-E2E-006..010 (detail, comments, actions)
│   ├── bug-kanban.spec.ts            # BUG-E2E-002,011,018,020 (kanban, validation)
│   ├── projects.spec.ts              # PROJ-E2E-001..003 (list, create, navigate)
│   ├── sprints.spec.ts               # SPRINT-E2E-001..002 (list, create)
│   ├── dashboard.spec.ts             # DASH-E2E-001..004 (stats, assigned, sprint)
│   ├── navigation.spec.ts            # NAV/SETTINGS/ACTLOG (sidebar, theme, roles)
│   └── ui-extras.spec.ts             # UI/PERF (welcome, responsive, performance)
├── support/
│   ├── fixtures/
│   │   └── merged-fixtures.ts        # Merged Playwright + playwright-utils fixtures
│   ├── factories/
│   │   ├── index.ts                  # Barrel export for all factories
│   │   ├── user-factory.ts           # createUser, createAdminUser, createTesterUser
│   │   ├── bug-factory.ts            # createBug, createHighPriorityBug, createTask
│   │   ├── project-factory.ts        # createProject
│   │   ├── sprint-factory.ts         # createSprint, createPlannedSprint, createCompletedSprint
│   │   ├── comment-factory.ts        # createComment
│   │   └── activity-factory.ts       # createActivity, createAssignedActivity, createStatusChangedActivity
│   └── helpers/
│       ├── auth-seeding.ts           # seedAuth, seedAuthMultiRole, seedAuthWithWelcome
│       ├── auth-helper.ts            # loginAs (UI-based login)
│       └── network-helper.ts         # mockApiRoute, waitForApiResponse
└── README.md
```

## Priority Tagging Convention

Every test name includes priority and category tags:

| Tag | Meaning | When to Run |
|-----|---------|-------------|
| `@p0` | Critical path, blocks release | Every PR |
| `@p1` | Important feature, common workflow | Every PR |
| `@p2` | Secondary feature, edge case | Every PR (fast enough) |
| `@p3` | Nice-to-have, exploratory | Nightly |
| `@smoke` | Minimal sanity check | Pre-commit |
| `@regression` | Full coverage | Full suite |

## Key Patterns

### Auth Seeding (not UI login)
Tests seed localStorage directly via `addInitScript` — no OAuth popup needed:
```typescript
import { seedAuth } from '../support/helpers/auth-seeding';
const user = createUser({ role: 'developer' as any });
await seedAuth(page, user);  // Sets dpod-token + refresh-token + bugtrackr_current_user
```

### Network-First Mocking
All API mocks are set up BEFORE navigation to prevent race conditions:
```typescript
await mockApiRoute(page, 'bugs*', [bug1, bug2]);
await mockApiRoute(page, 'users*', [user]);
await page.goto('/bugs');  // Mocks already in place
```

### Data Factories
Use faker-powered factories for parallel-safe, unique test data:
```typescript
import { createBug, createUser, createProject } from '../support/factories';
const user = createUser({ name: 'Custom Name' });
const bug = createBug({ title: 'Specific Bug', projectId: 'proj-1' });
```

### Merged Fixtures
Import `test` and `expect` from merged-fixtures to get all playwright-utils:
```typescript
import { test, expect } from '../support/fixtures/merged-fixtures';
// Provides: apiRequest, networkErrorMonitor, interceptNetworkCall
```

## Anti-Patterns (AVOID)

- `page.waitForTimeout(3000)` — Use explicit waits instead
- `if (await element.isVisible())` — Tests must be deterministic
- CSS class selectors — Use `getByRole`, `getByText`, `getByPlaceholder`
- Hardcoded test data — Use factories with faker
- Shared state between tests — Each test sets up its own data
- Page object classes — Keep tests direct and simple

## CI Integration

The `playwright.config.ts` is configured for CI with:
- 2 retries on failure
- 2 parallel workers
- HTML + JUnit + list reporters
- Traces, screenshots, and videos retained on failure
- `webServer` auto-starts the dev server on port 3005
