/**
 * Authorization and Validation Tests
 * 
 * Tests role-based authorization, validation errors, and error status codes.
 * 
 * Requirements: 12.2, 3.1, 3.2
 * Task: 13.3
 */

import { test, expect } from '@playwright/test';

test.describe('Authorization and Validation', () => {
  let developerId: string;
  let testerId: string;
  let adminId: string;
  let projectId: string;
  let bugId: string;

  test.beforeAll(async ({ request }) => {
    // Create developer user
    const devResponse = await request.post('/api/users', {
      data: {
        userId: 'auth-dev-001',
        phoneNumber: '+1234567893',
        name: 'Auth Developer',
        email: 'authdev@example.com',
        role: 'developer',
      },
    });
    const dev = await devResponse.json();
    developerId = dev.id;

    // Create tester user
    const testerResponse = await request.post('/api/users', {
      data: {
        userId: 'auth-tester-001',
        phoneNumber: '+1234567894',
        name: 'Auth Tester',
        email: 'authtester@example.com',
        role: 'tester',
      },
    });
    const tester = await testerResponse.json();
    testerId = tester.id;

    // Create admin user
    const adminResponse = await request.post('/api/users', {
      data: {
        userId: 'auth-admin-001',
        phoneNumber: '+1234567895',
        name: 'Auth Admin',
        email: 'authadmin@example.com',
        role: 'admin',
      },
    });
    const admin = await adminResponse.json();
    adminId = admin.id;

    // Create test project
    const projectResponse = await request.post('/api/projects', {
      data: {
        name: 'Auth Test Project',
        description: 'Project for authorization testing',
        createdBy: developerId,
      },
    });
    const project = await projectResponse.json();
    projectId = project.id;

    // Create test bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Auth Test Bug',
        description: 'Bug for authorization testing',
        projectId: projectId,
        reportedBy: developerId,
        priority: 'Medium',
        severity: 'Major',
      },
    });
    const bug = await bugResponse.json();
    bugId = bug.id;
  });

  test('should allow tester to close bug', async ({ request }) => {
    const response = await request.patch(`/api/bugs/${bugId}/status`, {
      data: {
        status: 'Closed',
        userId: testerId,
        userRole: 'tester',
      },
    });

    expect(response.status()).toBe(200);
    
    const bug = await response.json();
    expect(bug.status).toBe('Closed');
  });

  test('should allow admin to close bug', async ({ request }) => {
    // Create a new bug for this test
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Admin Close Test',
        description: 'Testing admin close permission',
        projectId: projectId,
        reportedBy: developerId,
        priority: 'Low',
        severity: 'Minor',
      },
    });
    const newBug = await bugResponse.json();

    const response = await request.patch(`/api/bugs/${newBug.id}/status`, {
      data: {
        status: 'Closed',
        userId: adminId,
        userRole: 'admin',
      },
    });

    expect(response.status()).toBe(200);
    
    const bug = await response.json();
    expect(bug.status).toBe('Closed');
  });

  test('should return 403 when developer tries to close bug', async ({ request }) => {
    // Create a new bug for this test
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Developer Close Test',
        description: 'Testing developer close restriction',
        projectId: projectId,
        reportedBy: developerId,
        priority: 'Medium',
        severity: 'Major',
      },
    });
    const newBug = await bugResponse.json();

    const response = await request.patch(`/api/bugs/${newBug.id}/status`, {
      data: {
        status: 'Closed',
        userId: developerId,
        userRole: 'developer',
      },
    });

    expect(response.status()).toBe(403);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toBe('Forbidden');
    expect(error.details).toContain('Only Testers and Admins can close bugs');
    expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  test('should return 403 when developer tries to modify closed bug', async ({ request }) => {
    const response = await request.patch(`/api/bugs/${bugId}/status`, {
      data: {
        status: 'In Progress',
        userId: developerId,
        userRole: 'developer',
      },
    });

    expect(response.status()).toBe(403);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toBe('Forbidden');
    expect(error.details).toContain('Only Admins can modify closed bugs');
  });

  test('should allow admin to modify closed bug', async ({ request }) => {
    const response = await request.patch(`/api/bugs/${bugId}/status`, {
      data: {
        status: 'Resolved',
        userId: adminId,
        userRole: 'admin',
      },
    });

    expect(response.status()).toBe(200);
    
    const bug = await response.json();
    expect(bug.status).toBe('Resolved');
  });

  test('should return 400 for missing required fields', async ({ request }) => {
    const response = await request.post('/api/bugs', {
      data: {
        title: 'Incomplete Bug',
        // Missing description, projectId, reportedBy, priority, severity
      },
    });

    expect(response.status()).toBe(400);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toBe('Validation failed');
    expect(error).toHaveProperty('details');
    expect(Array.isArray(error.details)).toBeTruthy();
  });

  test('should return 400 for invalid enum values', async ({ request }) => {
    const response = await request.post('/api/bugs', {
      data: {
        title: 'Bug with Invalid Priority',
        description: 'Testing invalid enum',
        projectId: projectId,
        reportedBy: developerId,
        priority: 'InvalidPriority',
        severity: 'Major',
      },
    });

    expect(response.status()).toBe(400);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toBe('Validation failed');
  });

  test('should return 400 for invalid status enum', async ({ request }) => {
    // Create a new bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Invalid Status Test',
        description: 'Testing invalid status',
        projectId: projectId,
        reportedBy: developerId,
        priority: 'Medium',
        severity: 'Minor',
      },
    });
    const newBug = await bugResponse.json();

    const response = await request.patch(`/api/bugs/${newBug.id}/status`, {
      data: {
        status: 'InvalidStatus',
        userId: testerId,
        userRole: 'tester',
      },
    });

    expect(response.status()).toBe(400);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toBe('Validation failed');
  });

  test('should return 404 for nonexistent bug', async ({ request }) => {
    const response = await request.get('/api/bugs/nonexistent-bug-id-12345');

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Bug not found');
  });

  test('should return 404 for nonexistent project in bug creation', async ({ request }) => {
    const response = await request.post('/api/bugs', {
      data: {
        title: 'Bug with Nonexistent Project',
        description: 'Testing project validation',
        projectId: 'nonexistent-project-id',
        reportedBy: developerId,
        priority: 'High',
        severity: 'Blocker',
      },
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Project not found');
  });

  test('should return 404 for nonexistent user in bug assignment', async ({ request }) => {
    // Create a new bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Invalid Assignment Test',
        description: 'Testing user validation in assignment',
        projectId: projectId,
        reportedBy: developerId,
        priority: 'Low',
        severity: 'Minor',
      },
    });
    const newBug = await bugResponse.json();

    const response = await request.patch(`/api/bugs/${newBug.id}/assign`, {
      data: {
        assignedTo: 'nonexistent-user-id',
        assignedBy: developerId,
      },
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Assignee user not found');
  });

  test('should return 400 for empty title', async ({ request }) => {
    const response = await request.post('/api/bugs', {
      data: {
        title: '',
        description: 'Bug with empty title',
        projectId: projectId,
        reportedBy: developerId,
        priority: 'Medium',
        severity: 'Major',
      },
    });

    expect(response.status()).toBe(400);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toBe('Validation failed');
  });

  test('should return 400 for title exceeding max length', async ({ request }) => {
    const longTitle = 'A'.repeat(201); // Max is 200

    const response = await request.post('/api/bugs', {
      data: {
        title: longTitle,
        description: 'Bug with too long title',
        projectId: projectId,
        reportedBy: developerId,
        priority: 'Low',
        severity: 'Minor',
      },
    });

    expect(response.status()).toBe(400);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toBe('Validation failed');
  });
});
