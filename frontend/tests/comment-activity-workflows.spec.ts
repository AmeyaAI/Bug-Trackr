/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Comment and Activity Workflows Tests
 * 
 * Tests comment creation, listing, activity logging, and retrieval.
 * 
 * Requirements: 12.4, 12.6
 * Task: 13.2
 */

import { test, expect } from '@playwright/test';

test.describe('Comment and Activity Workflows', () => {
  let testUserId: string;
  let testProjectId: string;
  let testBugId: string;

  test.beforeAll(async ({ request }) => {
    // Create test user
    const userResponse = await request.post('/api/users', {
      data: {
        userId: 'comment-test-user-001',
        phoneNumber: '+1234567892',
        name: 'Comment Test User',
        email: 'commentuser@example.com',
        role: 'developer',
      },
    });
    const user = await userResponse.json();
    testUserId = user.id;

    // Create test project
    const projectResponse = await request.post('/api/projects', {
      data: {
        name: 'Comment Test Project',
        description: 'Project for testing comments',
        createdBy: testUserId,
      },
    });
    const project = await projectResponse.json();
    testProjectId = project.id;

    // Create test bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Test Bug for Comments',
        description: 'This bug will have comments',
        projectId: testProjectId,
        reportedBy: testUserId,
        priority: 'Medium',
        severity: 'Minor',
      },
    });
    const bug = await bugResponse.json();
    testBugId = bug.id;
  });

  test('should create comment on bug', async ({ request }) => {
    const commentData = {
      bugId: testBugId,
      authorId: testUserId,
      message: 'This is a test comment on the bug',
    };

    const response = await request.post('/api/comments', {
      data: commentData,
    });

    expect(response.status()).toBe(201);
    
    const comment = await response.json();
    expect(comment).toHaveProperty('id');
    expect(comment.bugId).toBe(commentData.bugId);
    expect(comment.authorId).toBe(commentData.authorId);
    expect(comment.message).toBe(commentData.message);
    expect(comment).toHaveProperty('createdAt');
  });

  test('should list comments by bug', async ({ request }) => {
    // Create another comment
    await request.post('/api/comments', {
      data: {
        bugId: testBugId,
        authorId: testUserId,
        message: 'Second comment for testing',
      },
    });

    // List comments for the bug
    const response = await request.get(`/api/comments?bugId=${testBugId}`);

    expect(response.status()).toBe(200);
    
    const comments = await response.json();
    expect(Array.isArray(comments)).toBeTruthy();
    expect(comments.length).toBeGreaterThanOrEqual(2);
    
    // Verify all comments belong to the bug
    comments.forEach((comment: any) => {
      expect(comment.bugId).toBe(testBugId);
    });
  });

  test('should log activity on bug creation', async ({ request }) => {
    // Create a new bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Activity Test',
        description: 'Testing activity logging',
        projectId: testProjectId,
        reportedBy: testUserId,
        priority: 'Low',
        severity: 'Minor',
      },
    });
    const bug = await bugResponse.json();

    // Get activities for the bug
    const activitiesResponse = await request.get(`/api/activities?bugId=${bug.id}`);
    expect(activitiesResponse.status()).toBe(200);
    
    const activities = await activitiesResponse.json();
    expect(Array.isArray(activities)).toBeTruthy();
    
    // Should have at least one "reported" activity
    const reportedActivity = activities.find((a: any) => a.action === 'reported');
    expect(reportedActivity).toBeDefined();
    expect(reportedActivity.bugId).toBe(bug.id);
    expect(reportedActivity.authorId).toBe(testUserId);
  });

  test('should log activity on status change', async ({ request }) => {
    // Create a new bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Status Activity Test',
        description: 'Testing status change activity',
        projectId: testProjectId,
        reportedBy: testUserId,
        priority: 'Medium',
        severity: 'Major',
      },
    });
    const bug = await bugResponse.json();

    // Update status
    await request.patch(`/api/bugs/${bug.id}/status`, {
      data: {
        status: 'In Progress',
        userId: testUserId,
        userRole: 'developer',
      },
    });

    // Get activities for the bug
    const activitiesResponse = await request.get(`/api/activities?bugId=${bug.id}`);
    const activities = await activitiesResponse.json();
    
    // Should have "reported" and "status_changed" activities
    const statusChangedActivity = activities.find((a: any) => a.action === 'status_changed');
    expect(statusChangedActivity).toBeDefined();
    expect(statusChangedActivity.bugId).toBe(bug.id);
  });

  test('should log activity on bug assignment', async ({ request }) => {
    // Create a new bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Assignment Activity Test',
        description: 'Testing assignment activity',
        projectId: testProjectId,
        reportedBy: testUserId,
        priority: 'High',
        severity: 'Blocker',
      },
    });
    const bug = await bugResponse.json();

    // Assign bug
    await request.patch(`/api/bugs/${bug.id}/assign`, {
      data: {
        assignedTo: testUserId,
        assignedBy: testUserId,
      },
    });

    // Get activities for the bug
    const activitiesResponse = await request.get(`/api/activities?bugId=${bug.id}`);
    const activities = await activitiesResponse.json();
    
    // Should have "assigned" activity
    const assignedActivity = activities.find((a: any) => a.action === 'assigned');
    expect(assignedActivity).toBeDefined();
    expect(assignedActivity.bugId).toBe(bug.id);
  });

  test('should log activity on comment creation', async ({ request }) => {
    // Create a new bug
    const bugResponse = await request.post('/api/bugs', {
      data: {
        title: 'Bug for Comment Activity Test',
        description: 'Testing comment activity',
        projectId: testProjectId,
        reportedBy: testUserId,
        priority: 'Low',
        severity: 'Minor',
      },
    });
    const bug = await bugResponse.json();

    // Add comment
    await request.post('/api/comments', {
      data: {
        bugId: bug.id,
        authorId: testUserId,
        message: 'Test comment for activity logging',
      },
    });

    // Get activities for the bug
    const activitiesResponse = await request.get(`/api/activities?bugId=${bug.id}`);
    const activities = await activitiesResponse.json();
    
    // Should have "commented" activity
    const commentedActivity = activities.find((a: any) => a.action === 'commented');
    expect(commentedActivity).toBeDefined();
    expect(commentedActivity.bugId).toBe(bug.id);
  });

  test('should retrieve activities by bug', async ({ request }) => {
    const response = await request.get(`/api/activities?bugId=${testBugId}`);

    expect(response.status()).toBe(200);
    
    const activities = await response.json();
    expect(Array.isArray(activities)).toBeTruthy();
    
    // Verify all activities belong to the bug
    activities.forEach((activity: any) => {
      expect(activity.bugId).toBe(testBugId);
    });
    
    // Verify activities are sorted by timestamp (descending)
    for (let i = 0; i < activities.length - 1; i++) {
      const current = new Date(activities[i].timestamp).getTime();
      const next = new Date(activities[i + 1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  test('should retrieve recent activities with limit', async ({ request }) => {
    const limit = 5;
    const response = await request.get(`/api/activities?limit=${limit}`);

    expect(response.status()).toBe(200);
    
    const activities = await response.json();
    expect(Array.isArray(activities)).toBeTruthy();
    expect(activities.length).toBeLessThanOrEqual(limit);
    
    // Verify activities are sorted by timestamp (descending)
    for (let i = 0; i < activities.length - 1; i++) {
      const current = new Date(activities[i].timestamp).getTime();
      const next = new Date(activities[i + 1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });
});
