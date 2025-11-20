/**
 * API Health Check Test
 * 
 * Simple test to verify the API is accessible and responding.
 */

import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('should access health endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    
    console.log('Health check status:', response.status());
    const body = await response.json();
    console.log('Health check response:', JSON.stringify(body, null, 2));
    
    expect(response.status()).toBe(200);
  });

  test('should list users', async ({ request }) => {
    const response = await request.get('/api/users');
    
    console.log('Users list status:', response.status());
    const users = await response.json();
    console.log('Users count:', users.length);
    
    expect(response.status()).toBe(200);
    expect(Array.isArray(users)).toBeTruthy();
  });

  test('should list projects', async ({ request }) => {
    const response = await request.get('/api/projects');
    
    console.log('Projects list status:', response.status());
    const projects = await response.json();
    console.log('Projects count:', projects.length);
    
    expect(response.status()).toBe(200);
    expect(Array.isArray(projects)).toBeTruthy();
  });
});
