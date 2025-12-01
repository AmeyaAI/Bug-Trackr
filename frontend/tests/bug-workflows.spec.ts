/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Bug Workflows Tests
 * 
 * Tests bug creation, listing, retrieval, status updates, and assignment.
 * 
 * Requirements: 12.1, 12.2, 12.3
 * Task: 13.1
 */

import { test, expect } from '@playwright/test';

// Test data
const testUser = {
  userId: 'test-user-001',
  phoneNumber: '+1234567890',
  name: 'Test User',
  email: 'testuser@example.com',
  role: 'developer',
};

const testTester = {
  userId: 'test-tester-001',
  phoneNumber: '+1234567891',
  name: 'Test Tester',
  email: 'testtester@example.com',
  role: 'tester',
};

const testProject = {
  name: 'Test Project',
  description: 'A test project for bug tracking',
  createdBy: 'test-user-001',
};

test.describe.configure({ mode: 'serial' });

test.describe('Bug Workflows', () => {
  let createdUserId: string;
  let createdTesterId: string;
  let createdProjectId: string;
  let createdBugId: string;

  test.beforeAll(async ({ request }) => {
    // Create test user
    const userResponse = await request.post('/api/users', {
      data: testUser,
    });
    const user = await userResponse.json();
    createdUserId = user.id;

    // Create test tester
    const testerResponse = await request.post('/api/users', {
      data: testTester,
    });
    const tester = await testerResponse.json();
    createdTesterId = tester.id;

    // Create test project
    const projectResponse = await request.post('/api/projects', {
      data: {
        ...testProject,
        createdBy: createdUserId,
      },
    });
    const project = await projectResponse.json();
    createdProjectId = project.id;
  });

  test('should create bug with valid data', async ({ request }) => {
    const bugData = {
      title: 'Test Bug - Valid Creation',
      description: 'This is a test bug with valid data',
      projectId: createdProjectId,
      reportedBy: createdUserId,
      priority: 'High',
      severity: 'Major',
      tags: ['Bug:Frontend', 'Task'],
    };

    const response = await request.post('/api/bugs', {
      data: bugData,
    });

    expect(response.status()).toBe(201);
    
    const bug = await response.json();
    createdBugId = bug.id;
    
    expect(bug).toHaveProperty('id');
    expect(bug.title).toBe(bugData.title);
    expect(bug.description).toBe(bugData.description);
    expect(bug.projectId).toBe(bugData.projectId);
    expect(bug.reportedBy).toBe(bugData.reportedBy);
    expect(bug.priority).toBe(bugData.priority);
    expect(bug.severity).toBe(bugData.severity);
    expect(bug.status).toBe('Open');
    expect(bug.assignedTo).toBeNull();
    expect(bug.tags).toEqual(bugData.tags);
  });

  test('should return 404 when creating bug with invalid project ID', async ({ request }) => {
    const bugData = {
      title: 'Test Bug - Invalid Project',
      description: 'This bug has an invalid project ID',
      projectId: 'nonexistent-project-id',
      reportedBy: createdUserId,
      priority: 'Medium',
      severity: 'Minor',
    };

    const response = await request.post('/api/bugs', {
      data: bugData,
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Project not found');
  });

  test('should return 404 when creating bug with invalid reporter ID', async ({ request }) => {
    const bugData = {
      title: 'Test Bug - Invalid Reporter',
      description: 'This bug has an invalid reporter ID',
      projectId: createdProjectId,
      reportedBy: 'nonexistent-user-id',
      priority: 'Low',
      severity: 'Minor',
    };

    const response = await request.post('/api/bugs', {
      data: bugData,
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Reporter user not found');
  });

  test('should list all bugs', async ({ request }) => {
    const response = await request.get('/api/bugs');

    expect(response.status()).toBe(200);
    
    const bugs = await response.json();
    expect(Array.isArray(bugs)).toBeTruthy();
    expect(bugs.length).toBeGreaterThan(0);
    
    // Verify the bug we created is in the list
    const ourBug = bugs.find((b: any) => b.id === createdBugId);
    expect(ourBug).toBeDefined();
  });

  test('should retrieve bug by ID', async ({ request }) => {
    const response = await request.get(`/api/bugs/${createdBugId}`);

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.bug.id).toBe(createdBugId);
    expect(data).toHaveProperty('comments');
    expect(Array.isArray(data.comments)).toBeTruthy();
  });

  test('should update bug status as developer', async ({ request }) => {
    const statusUpdate = {
      status: 'In Progress',
      userId: createdUserId,
      userRole: 'developer',
    };

    const response = await request.patch(`/api/bugs/${createdBugId}/status`, {
      data: statusUpdate,
    });

    expect(response.status()).toBe(200);
    
    const updatedBug = await response.json();
    expect(updatedBug.status).toBe('In Progress');
  });

  test('should update bug status as tester', async ({ request }) => {
    const statusUpdate = {
      status: 'Resolved',
      userId: createdTesterId,
      userRole: 'tester',
    };

    const response = await request.patch(`/api/bugs/${createdBugId}/status`, {
      data: statusUpdate,
    });

    expect(response.status()).toBe(200);
    
    const updatedBug = await response.json();
    expect(updatedBug.status).toBe('Resolved');
  });

  test('should close bug as tester', async ({ request }) => {
    const statusUpdate = {
      status: 'Closed',
      userId: createdTesterId,
      userRole: 'tester',
    };

    const response = await request.patch(`/api/bugs/${createdBugId}/status`, {
      data: statusUpdate,
    });

    expect(response.status()).toBe(200);
    
    const updatedBug = await response.json();
    expect(updatedBug.status).toBe('Closed');
  });

  test('should assign bug to user', async ({ request }) => {
    // First, create a new bug for assignment test
    const bugData = {
      title: 'Test Bug - Assignment',
      description: 'This bug will be assigned',
      projectId: createdProjectId,
      reportedBy: createdUserId,
      priority: 'Medium',
      severity: 'Major',
    };

    const createResponse = await request.post('/api/bugs', {
      data: bugData,
    });
    const newBug = await createResponse.json();

    // Now assign it
    const assignmentData = {
      assignedTo: createdTesterId,
      assignedBy: createdUserId,
    };

    const response = await request.patch(`/api/bugs/${newBug.id}/assign`, {
      data: assignmentData,
    });

    expect(response.status()).toBe(200);
    
    const assignedBug = await response.json();
    expect(assignedBug.assignedTo).toBe(createdTesterId);
  });
});
