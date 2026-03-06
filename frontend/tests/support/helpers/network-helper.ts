import type { Page } from '@playwright/test';

/**
 * Maps test-friendly route names to actual Collection DB plural collection names.
 */
const COLLECTION_MAP: Record<string, string> = {
  'bugs': 'bug_tracking_bugss',
  'projects': 'bug_tracking_projects',
  'sprints': 'bug_tracking_sprintss',
  'users': 'users',
  'comments': 'bug_tracking_commentss',
  'activity-logs': 'bug_tracking_activitiess',
  'notifications': 'bug_tracking_notificationss',
};

/**
 * Maps test-friendly route names to actual Collection DB singular collection names.
 */
const SINGULAR_COLLECTION_MAP: Record<string, string> = {
  'bugs': 'bug_tracking_bugs',
  'projects': 'bug_tracking_project',
  'sprints': 'bug_tracking_sprints',
  'users': 'user',
  'comments': 'bug_tracking_comments',
  'activity-logs': 'bug_tracking_activities',
  'notifications': 'bug_tracking_notifications',
};

/** External domains that should be blocked in tests */
const EXTERNAL_DOMAINS = [
  'appflyte-backend.ameya.ai',
  'auth-sandbox.ameya.ai',
];

/**
 * Converts a friendly test route pattern to a Playwright glob matching
 * real Collection DB URLs.
 *
 * Examples:
 *   'bugs*'       -> '** /bug_tracking_bugss*'
 *   'bugs'        -> '** /bug_tracking_bugss*'
 *   'bugs/abc-1'  -> '** /bug_tracking_bugs/abc-1*'
 */
function resolveCollectionGlob(urlPattern: string): string {
  // Item route like 'bugs/some-id'
  const slashIndex = urlPattern.indexOf('/');
  if (slashIndex > 0) {
    const resource = urlPattern.substring(0, slashIndex);
    const rest = urlPattern.substring(slashIndex + 1);
    const singularCollection = SINGULAR_COLLECTION_MAP[resource];
    if (singularCollection) {
      return `**/${singularCollection}/${rest}*`;
    }
    return `**/${urlPattern}*`;
  }

  // List route like 'bugs*' or 'bugs'
  const cleanName = urlPattern.replace(/\*+$/, '');
  const pluralCollection = COLLECTION_MAP[cleanName];
  if (pluralCollection) {
    return `**/${pluralCollection}*`;
  }

  // Fallback: use pattern as-is
  return `**/${urlPattern}`;
}

/**
 * Intercept a Collection DB route and respond with mock data.
 * Uses friendly names that map to real collection URLs.
 *
 * @example
 *   await mockApiRoute(page, 'bugs*', []);           // list
 *   await mockApiRoute(page, 'bugs/bug-1', { ... }); // single item
 */
export async function mockApiRoute(
  page: Page,
  urlPattern: string,
  responseBody: unknown,
  status = 200,
): Promise<void> {
  const globPattern = resolveCollectionGlob(urlPattern);

  // Transform paginated response to match raw Collection DB format.
  // Tests pass { bugs: [...], lastEvaluatedKey: {...} } (camelCase) but
  // collectionDb.getAllItemsPaginated() looks for `last_evaluated_key` (snake_case).
  let body = responseBody;
  if (body && typeof body === 'object' && !Array.isArray(body) && 'lastEvaluatedKey' in (body as Record<string, unknown>)) {
    const { lastEvaluatedKey, ...rest } = body as Record<string, unknown>;
    body = { ...rest, last_evaluated_key: lastEvaluatedKey };
  }

  await page.route(globPattern, (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    }),
  );
}

/**
 * Wait for a specific Collection DB call to complete and return its response JSON.
 */
export async function waitForApiResponse(page: Page, urlPattern: string): Promise<unknown> {
  const cleanName = urlPattern.replace(/\*+$/, '');
  const collectionName = COLLECTION_MAP[cleanName] || urlPattern;

  const response = await page.waitForResponse(
    (resp) => resp.url().includes(`/${collectionName}`) && resp.status() === 200,
  );
  return response.json();
}

/**
 * Blocks all requests to external API domains that aren't handled by
 * a more specific mock. Register this BEFORE mockApiRoute calls so that
 * Playwright's LIFO ordering gives specific mocks priority.
 */
export async function blockUnmockedExternalRequests(page: Page): Promise<void> {
  await page.route(
    (url) => EXTERNAL_DOMAINS.some((d) => url.hostname === d),
    (route) => {
      console.warn(`[Test] Blocked unmocked external request: ${route.request().url()}`);
      route.fulfill({
        status: 599,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unmocked external request in test',
          url: route.request().url(),
        }),
      });
    },
  );
}
