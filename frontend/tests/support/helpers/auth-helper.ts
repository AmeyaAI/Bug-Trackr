import type { Page } from '@playwright/test';

/**
 * Login via the UI login page.
 * Adapt credentials and selectors to match BugTrackr's auth flow.
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-button').click();
  await page.waitForURL(/\/(authorized|projects|bugs)/);
}
