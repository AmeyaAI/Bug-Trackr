import { test, expect } from '../support/fixtures/merged-fixtures';
import { createUser, createAdminUser, createTesterUser } from '../support/factories';
import { mockApiRoute } from '../support/helpers/network-helper';
import { seedAuth } from '../support/helpers/auth-seeding';
import type { Page } from '@playwright/test';

/**
 * Epic 1 - Story 1.2: User Profile Display
 *
 * Tests for sidebar user profile display including avatar, name,
 * role badge, and user selector functionality.
 *
 * Acceptance Criteria:
 * - AC-1.2.1: Sidebar displays user avatar, name, and active role
 * - AC-1.2.2: User selector allows switching between registered users (for demo/dev purposes)
 */

const setupMocks = async (page: Page, user: ReturnType<typeof createUser>, additionalUsers: any[] = []) => {
  const allUsers = [{ ...user, id: user.userId }, ...additionalUsers];
  await mockApiRoute(page, 'bugs*', []);
  await mockApiRoute(page, 'projects*', []);
  await mockApiRoute(page, 'sprints*', []);
  await mockApiRoute(page, 'users*', allUsers);
  await mockApiRoute(page, 'activity-logs*', []);
};

test.describe('Epic 1 - Story 1.2: User Profile Display', () => {
  // --- AC-1.2.1: Sidebar displays user avatar, name, and active role ---

  test('1.2-E2E-001: sidebar displays user name and role badge for developer @p1 @regression', async ({ page }) => {
    // Given: An authenticated developer user with a known name
    const user = createUser({ name: 'Alice Johnson', role: 'developer' as any });
    await seedAuth(page, user);
    await setupMocks(page, user);

    // When: User navigates to the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: The sidebar displays the user's name and developer role badge
    await expect(page.getByText('Alice Johnson')).toBeVisible();
    await expect(page.getByText('Developer')).toBeVisible();
  });

  test('1.2-E2E-002: sidebar displays correct avatar initials for user @p1 @regression', async ({ page }) => {
    // Given: An authenticated user with a two-word name
    const user = createUser({ name: 'Bob Smith', role: 'developer' as any });
    await seedAuth(page, user);
    await setupMocks(page, user);

    // When: User navigates to the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: The sidebar shows the avatar with the correct initials (BS)
    await expect(page.getByText('BS')).toBeVisible();
  });

  test('1.2-E2E-003: sidebar displays admin role badge variant @p1 @regression', async ({ page }) => {
    // Given: An authenticated admin user
    const user = createAdminUser({ name: 'Admin User' });
    await seedAuth(page, user);
    await setupMocks(page, user);

    // When: User navigates to the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: The sidebar displays the Admin role badge
    await expect(page.getByText('Admin User')).toBeVisible();
    await expect(page.getByText('Admin')).toBeVisible();
  });

  test('1.2-E2E-004: sidebar displays tester role badge variant @p1 @regression', async ({ page }) => {
    // Given: An authenticated tester user
    const user = createTesterUser({ name: 'QA Tester' });
    await seedAuth(page, user);
    await setupMocks(page, user);

    // When: User navigates to the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: The sidebar displays the Tester role badge
    await expect(page.getByText('QA Tester')).toBeVisible();
    await expect(page.getByText('Tester')).toBeVisible();
  });

  // --- AC-1.2.2: User selector allows switching between registered users ---

  test('1.2-E2E-005: user selector shows current user among multiple registered users @p2', async ({ page }) => {
    // Given: Multiple users exist in the system
    const currentUser = createUser({ name: 'Bob Smith', role: 'developer' as any });
    const otherUser = {
      id: 'user-other-1',
      userId: 'user-other-1',
      name: 'Carol Tester',
      email: 'carol@example.com',
      role: 'tester' as any,
    };

    await seedAuth(page, currentUser);
    await setupMocks(page, currentUser, [otherUser]);

    // When: User navigates to the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: The current user's name is displayed in the sidebar
    await expect(page.getByText('Bob Smith')).toBeVisible();
    await expect(page.getByText('Developer')).toBeVisible();
  });

  test('1.2-E2E-006: avatar initials for single-name user @p3', async ({ page }) => {
    // Given: A user with only a first name (edge case)
    const user = createUser({ name: 'Madonna', role: 'developer' as any });
    await seedAuth(page, user);
    await setupMocks(page, user);

    // When: User navigates to the dashboard
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then: The sidebar shows an avatar with single initial
    await expect(page.getByText('Madonna')).toBeVisible();
    // Avatar should handle single-name gracefully (first letter at minimum)
    await expect(page.getByText('M')).toBeVisible();
  });
});
