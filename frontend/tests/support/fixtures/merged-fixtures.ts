import { mergeTests, test as base } from '@playwright/test';
import { test as apiRequestFixture } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { test as networkErrorMonitorFixture } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures';
import { test as interceptNetworkCallFixture } from '@seontechnologies/playwright-utils/intercept-network-call/fixtures';
import { blockUnmockedExternalRequests } from '../helpers/network-helper';

// Auto-blocks all external API requests so tests never hit real services.
// Specific mocks registered later via mockApiRoute() take priority (LIFO).
const testWithNetworkGuard = base.extend({
  page: async ({ page }, use) => {
    await blockUnmockedExternalRequests(page);
    await use(page);
  },
});

export const test = mergeTests(
  testWithNetworkGuard,
  apiRequestFixture,
  networkErrorMonitorFixture,
  interceptNetworkCallFixture,
);

export { expect } from '@playwright/test';
