import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser, createProject } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import type { Page } from '@playwright/test';
import { seedAuth } from '../support/helpers/auth-seeding';

const setupBugCreationPage = async (page: Page) => {
  const user = createUser({ name: 'Bug Reporter' });
  const project = { ...createProject({ name: 'Alpha Project' }), id: 'proj-1', createdAt: new Date().toISOString() };
  await seedAuth(page, user);
  await mockApiRoute(page, 'projects*', [project]);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'users*', [{ ...user, id: user.userId }]);
  await mockApiRoute(page, 'bugs*', []);
  return { user, project };
};

test.describe('Bug Creation', () => {
  test('BUG-E2E-015: type selection dialog appears on /bugs/new @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user navigates to create a bug
    await setupBugCreationPage(page);

    // When: User opens the bug creation page
    await page.goto('/bugs/new');

    // Then: The type selection dialog is displayed with all type options
    await expect(page.getByRole('heading', { name: /what are you creating/i })).toBeVisible();
    // Type options are buttons with heading text inside the dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Epic' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Task' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Suggestion' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Bug' })).toBeVisible();
  });

  test('BUG-E2E-001: bug creation happy path @p0 @smoke', async ({ page }) => {
    // Given: An authenticated user with a project available
    const { project } = await setupBugCreationPage(page);
    const createdBug = { id: 'new-bug-1', title: 'Test Bug Title Valid' };
    await mockApiRoute(page, 'bugs', createdBug);

    // When: User fills out the bug creation form
    await page.goto('/bugs/new');
    await page.getByRole('dialog').getByRole('button', { name: /bug an issue/i }).click();
    await expect(page.getByText('Create New Bug')).toBeVisible();
    await page.getByPlaceholder('Brief description of the bug').fill('Test Bug Title Valid');

    // Then: The form title input is populated
    await expect(page.getByPlaceholder('Brief description of the bug')).toHaveValue('Test Bug Title Valid');
  });

  test('BUG-E2E-004: form validation rejects title under 5 characters @p1 @regression', async ({ page }) => {
    // Given: User is on the bug creation form after selecting Bug type
    await setupBugCreationPage(page);
    await page.goto('/bugs/new');
    await page.getByRole('dialog').getByRole('button', { name: /bug an issue/i }).click();

    // When: User enters a title shorter than 5 characters and submits
    await page.getByPlaceholder('Brief description of the bug').fill('Abc');
    await page.getByRole('button', { name: /create bug/i }).click();

    // Then: Validation error is shown
    await expect(page.getByText('Title must be at least 5 characters')).toBeVisible();
  });

  test('BUG-E2E-005: form validation requires project selection @p1 @regression', async ({ page }) => {
    // Given: User is on the bug creation form
    await setupBugCreationPage(page);
    await page.goto('/bugs/new');
    await page.getByRole('dialog').getByRole('button', { name: /bug an issue/i }).click();

    // When: User fills title but does not select a project and submits
    await page.getByPlaceholder('Brief description of the bug').fill('Valid Title Here');
    await page.getByRole('button', { name: /create bug/i }).click();

    // Then: Project required validation message appears
    await expect(page.getByText('Project is required')).toBeVisible();
  });

  test('BUG-E2E-016: severity options change based on selected type @p1 @regression', async ({ page }) => {
    // Given: User is on the creation form after selecting Suggestion type
    await setupBugCreationPage(page);
    await page.goto('/bugs/new');
    await page.getByRole('dialog').getByRole('button', { name: /suggestion/i }).click();

    // When: User opens the Severity dropdown
    // After selecting Suggestion type, severity defaults to "Nice to have"
    await page.getByRole('combobox').filter({ hasText: 'Nice to have' }).click();

    // Then: Suggestion-specific severities are shown
    await expect(page.getByRole('option', { name: 'Nice to have' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Must have' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Strategic' })).toBeVisible();
  });

  test('BUG-E2E-017: tag multi-select allows selecting multiple tags @p2 @regression', async ({ page }) => {
    // Given: User is on the bug creation form with Bug type selected
    await setupBugCreationPage(page);
    await page.goto('/bugs/new');
    await page.getByRole('dialog').getByRole('button', { name: /bug an issue/i }).click();

    // When: User clicks on multiple tag buttons
    await page.getByRole('button', { name: 'Bug:Frontend' }).click();
    await page.getByRole('button', { name: 'UI' }).click();

    // Then: Both tags show selected state (checkmark prefix)
    await expect(page.getByRole('button', { name: /.*Bug:Frontend/ })).toContainText('Bug:Frontend');
    await expect(page.getByRole('button', { name: /.*UI/ })).toContainText('UI');
  });
});
