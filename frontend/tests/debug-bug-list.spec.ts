/**
 * Debug test to check what bugs exist in the database
 */

import { test, expect } from '@playwright/test';

test.describe('Debug Bug List', () => {
  test('should list all bugs and show their IDs', async ({ request }) => {
    const response = await request.get('/api/bugs');
    
    console.log('Response status:', response.status());
    const bugs = await response.json();
    console.log('Total bugs:', bugs.length);
    
    if (bugs.length > 0) {
      console.log('\nBugs in database:');
      bugs.forEach((bug: any, index: number) => {
        console.log(`\n${index + 1}. Bug ID: ${bug.id}`);
        console.log(`   Title: ${bug.title}`);
        console.log(`   Status: ${bug.status}`);
        console.log(`   Project ID: ${bug.projectId}`);
      });
    } else {
      console.log('No bugs found in database');
    }
    
    expect(response.status()).toBe(200);
  });

  test('should try to get a specific bug if any exist', async ({ request }) => {
    // First get all bugs
    const listResponse = await request.get('/api/bugs');
    const bugs = await listResponse.json();
    
    if (bugs.length > 0) {
      const firstBug = bugs[0];
      console.log(`\nTrying to fetch bug with ID: ${firstBug.id}`);
      
      // Try to get the first bug
      const bugResponse = await request.get(`/api/bugs/${firstBug.id}`);
      console.log('Bug detail response status:', bugResponse.status());
      
      if (bugResponse.status() === 200) {
        const bugDetail = await bugResponse.json();
        console.log('Bug detail fetched successfully:');
        console.log(JSON.stringify(bugDetail, null, 2));
      } else {
        const error = await bugResponse.json();
        console.log('Error fetching bug:', error);
      }
    } else {
      console.log('No bugs to test with');
    }
  });
});
