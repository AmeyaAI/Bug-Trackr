# BugTrackr API Testing Suite

This directory contains comprehensive Playwright tests for the BugTrackr Next.js API routes.

## Important Note About Test Data

The current API implementation only supports:
- **Users**: GET operations only (no POST/create endpoint)
- **Projects**: GET operations only (no POST/create endpoint)  
- **Bugs**: Full CRUD (GET, POST, PATCH, DELETE)
- **Comments**: GET and POST
- **Activities**: GET only

This means tests must work with **existing data** in the Collection DB for users and projects. Tests cannot create their own test users and projects.

## Test Files

### 1. `api-health.spec.ts`
Basic health checks to verify API accessibility:
- Health endpoint connectivity
- User listing
- Project listing

**Status**: ✅ All tests passing

### 2. `bug-workflows.spec.ts`
Tests for bug management workflows (Task 13.1):
- Bug creation with valid data
- Bug creation with invalid project ID (404 expected)
- Bug creation with invalid reporter ID (404 expected)
- Bug listing
- Bug retrieval by ID
- Bug status updates as different roles
- Bug assignment

**Requirements**: 12.1, 12.2, 12.3

**Status**: ⚠️ Needs update - must use existing users/projects from DB

### 3. `comment-activity-workflows.spec.ts`
Tests for comments and activity logging (Task 13.2):
- Comment creation on bugs
- Comment listing by bug
- Activity logging on bug operations
- Activity retrieval by bug
- Recent activities retrieval

**Requirements**: 12.4, 12.6

**Status**: ⚠️ Needs update - must use existing users/projects from DB

### 4. `authorization-validation.spec.ts`
Tests for role-based authorization and validation (Task 13.3):
- Role-based authorization for status changes
- Validation errors return 400
- Not-found errors return 404
- Unauthorized actions return 403
- Field validation (empty, too long, invalid enums)

**Requirements**: 12.2, 3.1, 3.2

**Status**: ⚠️ Needs update - must use existing users/projects from DB

### 5. `relation-field-validation.spec.ts`
Tests for referential integrity (Task 13.4):
- Bug creation with nonexistent project
- Bug assignment to nonexistent user
- Comment creation on nonexistent bug
- Referential integrity verification

**Requirements**: 12.7, 5.7, 5.8

**Status**: ⚠️ Needs update - must use existing users/projects from DB

### 6. `query-optimization.spec.ts`
Tests for query performance and filtering (Task 13.5):
- Filter queries for getByProject
- Filter queries for getByBug comments
- page_size parameter for recent activities
- Performance measurements

**Requirements**: 12.9

**Status**: ⚠️ Needs update - must use existing users/projects from DB

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npx playwright test bug-workflows.spec.ts
```

### Run with UI mode
```bash
npm run test:ui
```

### View test report
```bash
npm run test:report
```

## Test Data Requirements

### Prerequisites
Before running tests, ensure the Collection DB has:
1. **At least 2 users** with different roles (developer, tester, or admin)
2. **At least 1 project** 

You can verify this by running:
```bash
npx playwright test api-health.spec.ts
```

This will show the count of existing users and projects.

### Recommended Test Data Setup
Manually create test data in Collection DB:
- User 1: Developer role
- User 2: Tester role  
- User 3: Admin role (optional)
- Project 1: Any test project

## Known Issues

### 1. Collection DB Response Format ✅ FIXED
The Collection DB returns data nested inside a UUID key. This has been fixed in `CollectionDBService.getAllItems()`.

### 2. ID Conflict Warnings
The Collection DB response contains both an `id` field and an `__auto_id__` field. The service correctly uses `__auto_id__` as the authoritative ID. These warnings are informational only.

### 3. Missing POST Endpoints
The user and project endpoints don't support creation (POST). This is a limitation of the current API implementation. Tests must work with existing data.

### 4. Bug Tag Validation
The `createBugSchema` expects tags to be an array of `BugTag` enum values:
- `Epic`
- `Task`
- `Suggestion`
- `Bug:Frontend`
- `Bug:Backend`
- `Bug:Test`

Tests must use these exact values, not arbitrary strings.

## Test Strategy

### Unit Testing Approach
- Each test file focuses on a specific functional area
- Tests use Playwright's `request` fixture for direct API calls
- No browser required - pure API testing
- Tests use existing users and projects from the database

### Test Data Management
- Tests fetch existing users and projects in `beforeAll` hooks
- Tests create their own bugs and comments (which can be created via API)
- Test data is isolated per suite where possible

### Assertions
- HTTP status codes (200, 201, 400, 403, 404, 500)
- Response body structure and content
- Referential integrity
- Authorization rules
- Validation rules

## Next Steps

1. **Update All Test Files**
   - Modify `beforeAll` hooks to fetch existing users/projects instead of creating them
   - Add validation to ensure required test data exists
   - Provide clear error messages if test data is missing

2. **Run Full Test Suite**
   - Execute all test files
   - Document any failures
   - Fix issues as they arise

3. **Performance Baseline**
   - Establish baseline response times
   - Compare filtered vs unfiltered queries
   - Verify optimization improvements

4. **Consider API Enhancements**
   - Add POST endpoints for users and projects if needed for testing
   - Or create a test data seeding script

## Test Coverage

The test suite covers:
- ✅ API connectivity and health checks
- ✅ Bug CRUD operations
- ✅ Comment CRUD operations
- ✅ Activity logging and retrieval
- ✅ Role-based authorization
- ✅ Input validation
- ✅ Referential integrity
- ✅ Query optimization and filtering
- ✅ Error handling (400, 403, 404, 500)

## Requirements Traceability

| Requirement | Test File | Status |
|-------------|-----------|--------|
| 12.1 | bug-workflows.spec.ts | ⚠️ |
| 12.2 | bug-workflows.spec.ts, authorization-validation.spec.ts | ⚠️ |
| 12.3 | bug-workflows.spec.ts | ⚠️ |
| 12.4 | comment-activity-workflows.spec.ts | ⚠️ |
| 12.6 | comment-activity-workflows.spec.ts | ⚠️ |
| 12.7 | relation-field-validation.spec.ts | ⚠️ |
| 12.9 | query-optimization.spec.ts | ⚠️ |
| 3.1 | authorization-validation.spec.ts | ⚠️ |
| 3.2 | authorization-validation.spec.ts | ⚠️ |
| 5.7 | relation-field-validation.spec.ts | ⚠️ |
| 5.8 | relation-field-validation.spec.ts | ⚠️ |

Legend:
- ✅ Passing
- ⚠️ Needs update to use existing data
- 📝 Ready to test
- ❌ Failing

## Fixes Applied

1. **Collection DB Response Parsing** ✅
   - Updated `getAllItems()` to correctly extract items from UUID-keyed response
   - Now properly handles the format: `{ "Collection": "...", "<uuid>": [...], ... }`

2. **Bug Tag Validation** ✅
   - Updated test to use valid `BugTag` enum values
   - Changed from `['test', 'validation']` to `['Bug:Frontend', 'Task']`
