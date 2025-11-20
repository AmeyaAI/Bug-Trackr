/**
 * Error Handling Test for ServiceContainer
 * 
 * Tests that initialization errors are cached and prevent repeated attempts
 * 
 * Run with: npx tsx frontend/lib/services/__test-error-handling.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(__dirname, '../../.env.local') });

import { getServiceContainer, resetServiceContainer, getInitializationError } from './serviceContainer';

async function testErrorHandling() {
  console.log('=== ServiceContainer Error Handling Test ===\n');

  try {
    // Test 1: Simulate initialization failure by not setting env vars
    console.log('Test 1: Testing initialization failure...');
    
    // Clear environment variables to force failure
    const originalBaseUrl = process.env.APPFLYTE_COLLECTION_BASE_URL;
    const originalApiKey = process.env.APPFLYTE_COLLECTION_API_KEY;
    delete process.env.APPFLYTE_COLLECTION_BASE_URL;
    delete process.env.APPFLYTE_COLLECTION_API_KEY;
    
    // Reset to clear any existing instance
    await resetServiceContainer();
    
    // First attempt should fail
    try {
      getServiceContainer();
      console.error('✗ Should have thrown error due to missing env vars');
      process.exit(1);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing required environment variable')) {
        console.log('✓ First initialization attempt failed as expected\n');
      } else {
        throw error;
      }
    }

    // Test 2: Verify error is cached
    console.log('Test 2: Verifying error is cached...');
    const cachedError = getInitializationError();
    if (cachedError && cachedError.message.includes('Missing required environment variable')) {
      console.log('✓ Initialization error is cached\n');
    } else {
      console.error('✗ Error should be cached');
      process.exit(1);
    }

    // Test 3: Verify subsequent attempts fail immediately without retry
    console.log('Test 3: Verifying subsequent attempts fail immediately...');
    try {
      getServiceContainer();
      console.error('✗ Should have thrown cached error');
      process.exit(1);
    } catch (error) {
      if (error instanceof Error && error.message.includes('failed to initialize previously')) {
        console.log('✓ Subsequent attempt failed immediately with cached error\n');
      } else {
        throw error;
      }
    }

    // Test 4: Verify reset clears the error
    console.log('Test 4: Verifying reset clears cached error...');
    await resetServiceContainer();
    const errorAfterReset = getInitializationError();
    if (errorAfterReset === null) {
      console.log('✓ Reset cleared the cached error\n');
    } else {
      console.error('✗ Error should be cleared after reset');
      process.exit(1);
    }

    // Test 5: Verify initialization can succeed after reset
    console.log('Test 5: Verifying initialization succeeds after reset...');
    
    // Restore environment variables (handle undefined case)
    if (originalBaseUrl) {
      process.env.APPFLYTE_COLLECTION_BASE_URL = originalBaseUrl;
    }
    if (originalApiKey) {
      process.env.APPFLYTE_COLLECTION_API_KEY = originalApiKey;
    }
    
    // Also need to reset the config cache
    const { resetConfig } = await import('../utils/config');
    resetConfig();
    
    // Should succeed now
    const services = getServiceContainer();
    console.log('✓ Initialization succeeded after reset and fixing configuration\n');

    // Test 6: Verify no error is cached after successful initialization
    console.log('Test 6: Verifying no error after successful initialization...');
    const finalError = getInitializationError();
    if (finalError === null) {
      console.log('✓ No error cached after successful initialization\n');
    } else {
      console.error('✗ Should not have cached error after success');
      process.exit(1);
    }

    // Cleanup
    await resetServiceContainer();

    console.log('=== All Error Handling Tests Passed ✓ ===\n');
  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testErrorHandling()
    .then(() => {
      console.log('Error handling verification complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error handling verification failed:', error);
      process.exit(1);
    });
}

export { testErrorHandling };
