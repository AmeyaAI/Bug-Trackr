/**
 * Relation Field Validation Tests
 * 
 * Tests referential integrity for relation fields across entities.
 * 
 * Requirements: 12.7, 5.7, 5.8
 * Task: 13.4
 */

import { test, expect } from '@playwright/test';

test.describe('Relation Field Validation', () => {
  let validUserId: string;
  let validProjectId: string;
  let validBugId: string;

  test.beforeAll(async ({ request }) => {
    // Create valid user
    const userResponse = await request.post('/api/users', {
      data: {
        userId: 'relation-user-001',
        phoneNumber: '+1234567896',
        name: 'Relation Test User',
        email: 'relationuser@example.com',
        role: 'developer',
      },
    });
    const user = await userResponse.json();
    validUserId = user.id;

    // Create valid project
    const projectResponse = await request.post('/api/projects', {
      data: {
        name: 'Relation Test Project',
        description: 'Project for relation testing',
        createdBy: validUserId,
      },
    });
    const project = await projectResponse.json();
    validProjectId = project.id;

    // Create valid bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Relation Test Bug',
        description: 'Bug for relation testing',
        projectId: validProjectId,
        reportedBy: validUserId,
        priority: 'Medium',
        severity: 'Major',
      },
    });
    const bug = await bugResponse.json();
    validBugId = bug.id;
  });

  test('should reject bug creation with nonexistent project', async ({ request }) => {
    const response = await request.post('/api/bugs', {
      data: {
        title: 'Bug with Invalid Project Reference',
        description: 'Testing project relation validation',
        projectId: 'nonexistent-project-xyz-123',
        reportedBy: validUserId,
        priority: 'High',
        severity: 'Blocker',
      },
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Project not found');
    expect(error.details).toContain('nonexistent-project-xyz-123');
  });

  test('should reject bug creation with nonexistent reporter', async ({ request }) => {
    const response = await request.post('/api/bugs', {
      data: {
        title: 'Bug with Invalid Reporter Reference',
        description: 'Testing reporter relation validation',
        projectId: validProjectId,
        reportedBy: 'nonexistent-user-abc-456',
        priority: 'Medium',
        severity: 'Major',
      },
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Reporter user not found');
    expect(error.details).toContain('nonexistent-user-abc-456');
  });

  test('should reject bug creation with nonexistent assignee', async ({ request }) => {
    const response = await request.post('/api/bugs', {
      data: {
        title: 'Bug with Invalid Assignee Reference',
        description: 'Testing assignee relation validation',
        projectId: validProjectId,
        reportedBy: validUserId,
        assignedTo: 'nonexistent-assignee-def-789',
        priority: 'Low',
        severity: 'Minor',
      },
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Assignee user not found');
    expect(error.details).toContain('nonexistent-assignee-def-789');
  });

  test('should reject bug assignment to nonexistent user', async ({ request }) => {
    const response = await request.patch(`/api/bugs/${validBugId}/assign`, {
      data: {
        assignedTo: 'nonexistent-user-ghi-012',
        assignedBy: validUserId,
      },
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Assignee user not found');
    expect(error.details).toContain('nonexistent-user-ghi-012');
  });

  test('should reject comment creation on nonexistent bug', async ({ request }) => {
    const response = await request.post('/api/comments', {
      data: {
        bugId: 'nonexistent-bug-jkl-345',
        authorId: validUserId,
        message: 'Comment on nonexistent bug',
      },
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Bug not found');
    expect(error.details).toContain('nonexistent-bug-jkl-345');
  });

  test('should reject comment creation with nonexistent author', async ({ request }) => {
    const response = await request.post('/api/comments', {
      data: {
        bugId: validBugId,
        authorId: 'nonexistent-author-mno-678',
        message: 'Comment with invalid author',
      },
    });

    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toContain('Author user not found');
    expect(error.details).toContain('nonexistent-author-mno-678');
  });

  test('should maintain referential integrity - bug references valid project', async ({ request }) => {
    // Create bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Integrity Test',
        description: 'Testing referential integrity',
        projectId: validProjectId,
        reportedBy: validUserId,
        priority: 'High',
        severity: 'Major',
      },
    });
    
    expect(bugResponse.status()).toBe(201);
    const bug = await bugResponse.json();

    // Verify bug has correct project reference
    expect(bug.projectId).toBe(validProjectId);

    // Verify we can retrieve the project
    const projectResponse = await request.get(`/api/projects/${bug.projectId}`);
    expect(projectResponse.status()).toBe(200);
    
    const project = await projectResponse.json();
    expect(project.id).toBe(validProjectId);
  });

  test('should maintain referential integrity - bug references valid reporter', async ({ request }) => {
    // Create bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Reporter Integrity Test',
        description: 'Testing reporter referential integrity',
        projectId: validProjectId,
        reportedBy: validUserId,
        priority: 'Medium',
        severity: 'Minor',
      },
    });
    
    expect(bugResponse.status()).toBe(201);
    const bug = await bugResponse.json();

    // Verify bug has correct reporter reference
    expect(bug.reportedBy).toBe(validUserId);

    // Verify we can retrieve the reporter
    const userResponse = await request.get(`/api/users/${bug.reportedBy}`);
    expect(userResponse.status()).toBe(200);
    
    const user = await userResponse.json();
    expect(user.id).toBe(validUserId);
  });

  test('should maintain referential integrity - comment references valid bug and author', async ({ request }) => {
    // Create comment
    const commentResponse = await request.post('/api/comments', {
      data: {
        bugId: validBugId,
        authorId: validUserId,
        message: 'Comment for integrity test',
      },
    });
    
    expect(commentResponse.status()).toBe(201);
    const comment = await commentResponse.json();

    // Verify comment has correct references
    expect(comment.bugId).toBe(validBugId);
    expect(comment.authorId).toBe(validUserId);

    // Verify we can retrieve the bug
    const bugResponse = await request.get(`/api/bugs/${comment.bugId}`);
    expect(bugResponse.status()).toBe(200);

    // Verify we can retrieve the author
    const userResponse = await request.get(`/api/users/${comment.authorId}`);
    expect(userResponse.status()).toBe(200);
  });

  test('should maintain referential integrity - assigned bug references valid assignee', async ({ request }) => {
    // Create another user for assignment
    const assigneeResponse = await request.post('/api/users', {
      data: {
        userId: 'assignee-user-002',
        phoneNumber: '+1234567897',
        name: 'Assignee User',
        email: 'assignee@example.com',
        role: 'developer',
      },
    });
    const assignee = await assigneeResponse.json();

    // Create bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Assignment Integrity Test',
        description: 'Testing assignment referential integrity',
        projectId: validProjectId,
        reportedBy: validUserId,
        priority: 'Low',
        severity: 'Minor',
      },
    });
    const bug = await bugResponse.json();

    // Assign bug
    const assignResponse = await request.patch(`/api/bugs/${bug.id}/assign`, {
      data: {
        assignedTo: assignee.id,
        assignedBy: validUserId,
      },
    });
    
    expect(assignResponse.status()).toBe(200);
    const assignedBug = await assignResponse.json();

    // Verify bug has correct assignee reference
    expect(assignedBug.assignedTo).toBe(assignee.id);

    // Verify we can retrieve the assignee
    const userResponse = await request.get(`/api/users/${assignedBug.assignedTo}`);
    expect(userResponse.status()).toBe(200);
    
    const retrievedAssignee = await userResponse.json();
    expect(retrievedAssignee.id).toBe(assignee.id);
  });

  test('should verify all relation fields are validated before creation', async ({ request }) => {
    // Try to create bug with multiple invalid relations
    const response = await request.post('/api/bugs', {
      data: {
        title: 'Bug with Multiple Invalid Relations',
        description: 'Testing multiple relation validations',
        projectId: 'invalid-project',
        reportedBy: 'invalid-reporter',
        assignedTo: 'invalid-assignee',
        priority: 'High',
        severity: 'Blocker',
      },
    });

    // Should fail on first validation (project)
    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error).toHaveProperty('error');
    // Should catch project validation first
    expect(error.error).toContain('Project not found');
  });
});
