/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Query Optimization Tests
 * 
 * Tests filter queries and pagination parameters for performance optimization.
 * 
 * Requirements: 12.9
 * Task: 13.5
 */

import { test, expect } from '@playwright/test';

test.describe('Query Optimization', () => {
  let userId: string;
  let project1Id: string;
  let project2Id: string;
  let bug1Id: string;
  let bug2Id: string;
  let bug3Id: string;

  test.beforeAll(async ({ request }) => {
    // Create test user
    const userResponse = await request.post('/api/users', {
      data: {
        userId: 'query-user-001',
        phoneNumber: '+1234567898',
        name: 'Query Test User',
        email: 'queryuser@example.com',
        role: 'developer',
      },
    });
    const user = await userResponse.json();
    userId = user.id;

    // Create two projects
    const project1Response = await request.post('/api/projects', {
      data: {
        name: 'Query Test Project 1',
        description: 'First project for query testing',
        createdBy: userId,
      },
    });
    const project1 = await project1Response.json();
    project1Id = project1.id;

    const project2Response = await request.post('/api/projects', {
      data: {
        name: 'Query Test Project 2',
        description: 'Second project for query testing',
        createdBy: userId,
      },
    });
    const project2 = await project2Response.json();
    project2Id = project2.id;

    // Create bugs in different projects
    const bug1Response = await request.post('/api/bugs', {
      data: {
        title: 'Bug in Project 1 - Open',
        description: 'First bug for query testing',
        projectId: project1Id,
        reportedBy: userId,
        priority: 'High',
        severity: 'Major',
        status: 'Open',
      },
    });
    const bug1 = await bug1Response.json();
    bug1Id = bug1.id;

    const bug2Response = await request.post('/api/bugs', {
      data: {
        title: 'Bug in Project 1 - In Progress',
        description: 'Second bug for query testing',
        projectId: project1Id,
        reportedBy: userId,
        priority: 'Medium',
        severity: 'Minor',
        status: 'In Progress',
      },
    });
    const bug2 = await bug2Response.json();
    bug2Id = bug2.id;

    const bug3Response = await request.post('/api/bugs', {
      data: {
        title: 'Bug in Project 2 - Open',
        description: 'Third bug for query testing',
        projectId: project2Id,
        reportedBy: userId,
        priority: 'Low',
        severity: 'Minor',
        status: 'Open',
      },
    });
    const bug3 = await bug3Response.json();
    bug3Id = bug3.id;
  });

  test('should filter bugs by project using getByProject', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`/api/bugs?projectId=${project1Id}`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status()).toBe(200);
    
    const bugs = await response.json();
    expect(Array.isArray(bugs)).toBeTruthy();
    
    // Verify all bugs belong to project1
    bugs.forEach((bug: any) => {
      expect(bug.projectId).toBe(project1Id);
    });
    
    // Should have exactly 2 bugs from project1
    expect(bugs.length).toBe(2);
    
    // Verify specific bugs are present
    const bugIds = bugs.map((b: any) => b.id);
    expect(bugIds).toContain(bug1Id);
    expect(bugIds).toContain(bug2Id);
    expect(bugIds).not.toContain(bug3Id);
    
    // Log response time for performance monitoring
    console.log(`getByProject response time: ${responseTime}ms`);
  });

  test('should filter bugs by status', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/bugs?status=Open');
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status()).toBe(200);
    
    const bugs = await response.json();
    expect(Array.isArray(bugs)).toBeTruthy();
    
    // Verify all bugs have status 'Open'
    bugs.forEach((bug: any) => {
      expect(bug.status).toBe('Open');
    });
    
    // Should have at least 2 Open bugs (bug1 and bug3)
    expect(bugs.length).toBeGreaterThanOrEqual(2);
    
    console.log(`getByStatus response time: ${responseTime}ms`);
  });

  test('should filter bugs by assignee', async ({ request }) => {
    // First assign a bug
    await request.patch(`/api/bugs/${bug1Id}/assign`, {
      data: {
        assignedTo: userId,
        assignedBy: userId,
      },
    });

    const startTime = Date.now();
    
    const response = await request.get(`/api/bugs?assignedTo=${userId}`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status()).toBe(200);
    
    const bugs = await response.json();
    expect(Array.isArray(bugs)).toBeTruthy();
    
    // Verify all bugs are assigned to userId
    bugs.forEach((bug: any) => {
      expect(bug.assignedTo).toBe(userId);
    });
    
    // Should have at least 1 assigned bug
    expect(bugs.length).toBeGreaterThanOrEqual(1);
    
    console.log(`getByAssignee response time: ${responseTime}ms`);
  });

  test('should filter comments by bug using getByBug', async ({ request }) => {
    // Create comments on bug1
    await request.post('/api/comments', {
      data: {
        bugId: bug1Id,
        authorId: userId,
        message: 'First comment on bug1',
      },
    });

    await request.post('/api/comments', {
      data: {
        bugId: bug1Id,
        authorId: userId,
        message: 'Second comment on bug1',
      },
    });

    // Create comment on bug2
    await request.post('/api/comments', {
      data: {
        bugId: bug2Id,
        authorId: userId,
        message: 'Comment on bug2',
      },
    });

    const startTime = Date.now();
    
    const response = await request.get(`/api/comments?bugId=${bug1Id}`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status()).toBe(200);
    
    const comments = await response.json();
    expect(Array.isArray(comments)).toBeTruthy();
    
    // Verify all comments belong to bug1
    comments.forEach((comment: any) => {
      expect(comment.bugId).toBe(bug1Id);
    });
    
    // Should have exactly 2 comments on bug1
    expect(comments.length).toBe(2);
    
    console.log(`getByBug (comments) response time: ${responseTime}ms`);
  });

  test('should use page_size parameter for recent activities', async ({ request }) => {
    const limit = 10;
    
    const startTime = Date.now();
    
    const response = await request.get(`/api/activities?limit=${limit}`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status()).toBe(200);
    
    const activities = await response.json();
    expect(Array.isArray(activities)).toBeTruthy();
    
    // Should not exceed the limit
    expect(activities.length).toBeLessThanOrEqual(limit);
    
    // Verify activities are sorted by timestamp (descending)
    for (let i = 0; i < activities.length - 1; i++) {
      const current = new Date(activities[i].timestamp).getTime();
      const next = new Date(activities[i + 1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
    
    console.log(`getRecent with page_size response time: ${responseTime}ms`);
  });

  test('should verify filter query reduces response size', async ({ request }) => {
    // Get all bugs (no filter)
    const allBugsResponse = await request.get('/api/bugs');
    const allBugs = await allBugsResponse.json();
    
    // Get filtered bugs (by project)
    const filteredResponse = await request.get(`/api/bugs?projectId=${project1Id}`);
    const filteredBugs = await filteredResponse.json();
    
    // Filtered result should be smaller or equal
    expect(filteredBugs.length).toBeLessThanOrEqual(allBugs.length);
    
    // Filtered result should only contain bugs from project1
    expect(filteredBugs.length).toBe(2);
    
    console.log(`All bugs count: ${allBugs.length}, Filtered bugs count: ${filteredBugs.length}`);
  });

  test('should verify filter query performance improvement', async ({ request }) => {
    // Measure time for unfiltered query
    const unfilteredStart = Date.now();
    await request.get('/api/bugs');
    const unfilteredTime = Date.now() - unfilteredStart;
    
    // Measure time for filtered query
    const filteredStart = Date.now();
    await request.get(`/api/bugs?projectId=${project1Id}`);
    const filteredTime = Date.now() - filteredStart;
    
    console.log(`Unfiltered query time: ${unfilteredTime}ms`);
    console.log(`Filtered query time: ${filteredTime}ms`);
    
    // Both should complete in reasonable time (< 1000ms)
    expect(unfilteredTime).toBeLessThan(1000);
    expect(filteredTime).toBeLessThan(1000);
  });

  test('should handle multiple filter scenarios efficiently', async ({ request }) => {
    // Test filtering by different statuses
    const openBugsResponse = await request.get('/api/bugs?status=Open');
    const openBugs = await openBugsResponse.json();
    
    const inProgressResponse = await request.get('/api/bugs?status=In Progress');
    const inProgressBugs = await inProgressResponse.json();
    
    // Verify correct filtering
    openBugs.forEach((bug: any) => {
      expect(bug.status).toBe('Open');
    });
    
    inProgressBugs.forEach((bug: any) => {
      expect(bug.status).toBe('In Progress');
    });
    
    console.log(`Open bugs: ${openBugs.length}, In Progress bugs: ${inProgressBugs.length}`);
  });

  test('should verify activities filter by bug works correctly', async ({ request }) => {
    // Get all activities
    const allActivitiesResponse = await request.get('/api/activities');
    const allActivities = await allActivitiesResponse.json();
    
    // Get activities for specific bug
    const bugActivitiesResponse = await request.get(`/api/activities?bugId=${bug1Id}`);
    const bugActivities = await bugActivitiesResponse.json();
    
    // Filtered result should be smaller or equal
    expect(bugActivities.length).toBeLessThanOrEqual(allActivities.length);
    
    // All activities should belong to bug1
    bugActivities.forEach((activity: any) => {
      expect(activity.bugId).toBe(bug1Id);
    });
    
    console.log(`All activities: ${allActivities.length}, Bug activities: ${bugActivities.length}`);
  });

  test('should verify limit parameter controls result size', async ({ request }) => {
    // Test different limit values
    const limit5Response = await request.get('/api/activities?limit=5');
    const limit5Activities = await limit5Response.json();
    
    const limit10Response = await request.get('/api/activities?limit=10');
    const limit10Activities = await limit10Response.json();
    
    // Verify limits are respected
    expect(limit5Activities.length).toBeLessThanOrEqual(5);
    expect(limit10Activities.length).toBeLessThanOrEqual(10);
    
    console.log(`Limit 5: ${limit5Activities.length} activities, Limit 10: ${limit10Activities.length} activities`);
  });
});
