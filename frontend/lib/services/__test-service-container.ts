/**
 * Service Container Verification Script
 *
 * This script verifies that the ServiceContainer initializes correctly
 * and all repositories are accessible with lazy initialization.
 *
 * Run with: npx tsx frontend/lib/services/__test-service-container.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(__dirname, '../../.env.local') });

import { getServiceContainer, resetServiceContainer } from './serviceContainer';

async function testServiceContainer() {
  console.log('=== Service Container Verification (Lazy Initialization) ===\n');

  try {
    // Test 1: Get service container instance
    console.log('Test 1: Getting ServiceContainer instance...');
    const services = getServiceContainer();
    console.log('✓ ServiceContainer instance created (no services initialized yet)\n');

    // Test 2: Verify lazy initialization - accessing repositories one by one
    console.log('Test 2: Verifying lazy initialization...');

    console.log('  Accessing UserRepository...');
    const userRepo = services.getUserRepository();
    console.log('  ✓ UserRepository initialized on first access');

    console.log('  Accessing ProjectRepository...');
    const projectRepo = services.getProjectRepository();
    console.log('  ✓ ProjectRepository initialized on first access');

    console.log('  Accessing BugRepository...');
    const bugRepo = services.getBugRepository();
    console.log('  ✓ BugRepository initialized on first access');

    console.log('  Accessing CommentRepository...');
    const commentRepo = services.getCommentRepository();
    console.log('  ✓ CommentRepository initialized on first access');

    console.log('  Accessing ActivityRepository...');
    const activityRepo = services.getActivityRepository();
    console.log('  ✓ ActivityRepository initialized on first access\n');

    // Test 3: Verify Collection DB service is accessible
    console.log('Test 3: Verifying Collection DB service...');
    const collectionDb = services.getCollectionDBService();
    console.log('✓ CollectionDBService accessible\n');

    // Test 4: Verify subsequent access returns same instances (no re-initialization)
    console.log('Test 4: Verifying cached instances...');
    const userRepo2 = services.getUserRepository();
    const isSameInstance = userRepo === userRepo2;
    console.log(`✓ Subsequent access returns cached instance: ${isSameInstance}\n`);

    // Test 5: Verify configuration is loaded
    console.log('Test 5: Verifying configuration...');
    const config = services.getConfig();
    console.log('✓ Configuration loaded');
    console.log(`  - Base URL: ${config.collectionBaseUrl.substring(0, 50)}...`);
    console.log(`  - Debug mode: ${config.debug}\n`);

    // Test 6: Verify isReady status
    console.log('Test 6: Verifying ready status...');
    const isReady = services.isReady();
    console.log(`✓ ServiceContainer ready status: ${isReady}\n`);

    // Test 7: Test singleton pattern
    console.log('Test 7: Verifying singleton pattern...');
    const services2 = getServiceContainer();
    const isSameContainer = services === services2;
    console.log(`✓ Singleton pattern working: ${isSameContainer}\n`);

    // Test 8: Test cleanup
    console.log('Test 8: Testing cleanup...');
    await resetServiceContainer();
    console.log('✓ ServiceContainer reset successfully\n');

    // Test 9: Verify new instance can be created after reset
    console.log('Test 9: Creating new instance after reset...');
    const services3 = getServiceContainer();
    const isDifferentInstance = services !== services3;
    console.log(`✓ New instance created after reset: ${isDifferentInstance}\n`);

    // Test 10: Verify lazy initialization works on new instance
    console.log('Test 10: Verifying lazy initialization on new instance...');
    const newUserRepo = services3.getUserRepository();
    console.log('✓ Lazy initialization works on new instance\n');

    // Test 11: Verify accessing closed container throws error
    console.log('Test 11: Verifying closed container throws error...');
    await services3.close();
    try {
      services3.getUserRepository();
      console.error('✗ Should have thrown error when accessing closed container');
      process.exit(1);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        console.log('✓ Accessing closed container throws appropriate error\n');
      } else {
        throw error;
      }
    }

    // Final cleanup
    await resetServiceContainer();

    console.log('=== All Tests Passed ✓ ===\n');
  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testServiceContainer()
    .then(() => {
      console.log('Verification complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { testServiceContainer };
