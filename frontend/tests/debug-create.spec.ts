/**
 * Debug test to understand data creation
 */

import { test, expect } from '@playwright/test';

test.describe('Debug Create Operations', () => {
  test('should create a user and return ID', async ({ request }) => {
    const userData = {
      userId: 'debug-user-001',
      phoneNumber: '+1234567890',
      name: 'Debug User',
      email: 'debug@example.com',
      role: 'developer',
    };

    console.log('Creating user with data:', JSON.stringify(userData, null, 2));

    const response = await request.post('/api/users', {
      data: userData,
    });

    console.log('Response status:', response.status());
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));

    expect(response.status()).toBe(201);
    expect(body).toHaveProperty('id');
    expect(body.id).toBeDefined();
    expect(body.id).not.toBeNull();
    
    console.log('Created user ID:', body.id);
  });

  test('should create a project and return ID', async ({ request }) => {
    // First create a user
    const userResponse = await request.post('/api/users', {
      data: {
        userId: 'debug-user-002',
        phoneNumber: '+1234567891',
        name: 'Debug User 2',
        email: 'debug2@example.com',
        role: 'developer',
      },
    });
    const user = await userResponse.json();
    console.log('Created user:', JSON.stringify(user, null, 2));

    // Now create a project
    const projectData = {
      name: 'Debug Project',
      description: 'A debug project',
      createdBy: user.id,
    };

    console.log('Creating project with data:', JSON.stringify(projectData, null, 2));

    const response = await request.post('/api/projects', {
      data: projectData,
    });

    console.log('Response status:', response.status());
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));

    expect(response.status()).toBe(201);
    expect(body).toHaveProperty('id');
    expect(body.id).toBeDefined();
    expect(body.id).not.toBeNull();
    
    console.log('Created project ID:', body.id);
  });
});
