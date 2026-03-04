import type { Page } from '@playwright/test';
import type { createUser } from '../factories';

type UserData = ReturnType<typeof createUser>;

/**
 * Creates a structurally valid JWT token for testing.
 * Not cryptographically signed, but has the correct 3-part base64url
 * format that jwt-decode expects.
 */
function createFakeJwt(overrides: Record<string, unknown> = {}): string {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 86400, // 24h from now
    iat: Math.floor(Date.now() / 1000),
    user_id: 'test-user-id',
    provider: 'google',
    subscription_id: '7f6242d2-de2e-482d-bc67-78ae3abc476f',
    third_party_token: 'fake-google-oauth-token',
    ...overrides,
  };

  const b64url = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  return `${b64url(header)}.${b64url(payload)}.fake-signature`;
}

/**
 * Seed localStorage with auth tokens and user data for test authentication.
 * Must be called BEFORE page.goto() since it uses addInitScript.
 */
export async function seedAuth(page: Page, user: UserData): Promise<void> {
  const fakeJwt = createFakeJwt({ user_id: user.userId });

  await page.addInitScript((args) => {
    localStorage.setItem('dpod-token', JSON.stringify(args.jwt));
    localStorage.setItem('refresh-token', JSON.stringify('fake-refresh-token'));
    localStorage.setItem('bugtrackr_current_user', JSON.stringify({
      id: args.user.userId,
      name: args.user.name,
      email: args.user.email,
      role: args.user.role,
      availableRoles: [args.user.role],
    }));
    sessionStorage.setItem('hasSeenWelcome', 'true');
  }, { jwt: fakeJwt, user });
}

/**
 * Seed auth for a user with multiple available roles.
 * Must be called BEFORE page.goto().
 */
export async function seedAuthMultiRole(page: Page, user: UserData, roles: string[]): Promise<void> {
  const fakeJwt = createFakeJwt({ user_id: user.userId });

  await page.addInitScript((args) => {
    localStorage.setItem('dpod-token', JSON.stringify(args.jwt));
    localStorage.setItem('refresh-token', JSON.stringify('fake-refresh-token'));
    localStorage.setItem('bugtrackr_current_user', JSON.stringify({
      id: args.user.userId,
      name: args.user.name,
      email: args.user.email,
      role: args.user.role,
      availableRoles: args.roles,
    }));
    sessionStorage.setItem('hasSeenWelcome', 'true');
  }, { jwt: fakeJwt, user, roles });
}

/**
 * Seed auth WITHOUT suppressing the welcome screen.
 * Use for tests that verify welcome screen behavior.
 */
export async function seedAuthWithWelcome(page: Page, user: UserData): Promise<void> {
  const fakeJwt = createFakeJwt({ user_id: user.userId });

  await page.addInitScript((args) => {
    localStorage.setItem('dpod-token', JSON.stringify(args.jwt));
    localStorage.setItem('refresh-token', JSON.stringify('fake-refresh-token'));
    localStorage.setItem('bugtrackr_current_user', JSON.stringify({
      id: args.user.userId,
      name: args.user.name,
      email: args.user.email,
      role: args.user.role,
      availableRoles: [args.user.role],
    }));
  }, { jwt: fakeJwt, user });
}
