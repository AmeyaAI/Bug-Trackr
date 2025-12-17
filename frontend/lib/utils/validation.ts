/**
 * Zod validation schemas for request validation
 */

import { z } from 'zod';
import { UserRole } from '../models/user';
import { BugStatus, BugPriority, BugSeverity, BugTag } from '../models/bug';
import { ActivityAction } from '../models/activity';

// User schemas
export const createUserSchema = z.object({
  userId: z.string({
    required_error: 'User ID is required',
    invalid_type_error: 'User ID must be a string',
  }).min(1, 'User ID cannot be empty'),
  name: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string',
  }).min(1, 'Name cannot be empty').max(200, 'Name must be 200 characters or less'),
  email: z.string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string',
  }).email('Invalid email address'),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid user role. Must be admin, developer, or tester' }),
  }),
});

export const updateUserSchema = z.object({
  userId: z.string().min(1).optional(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string({
    required_error: 'Project name is required',
    invalid_type_error: 'Project name must be a string',
  }).min(1, 'Project name cannot be empty').max(200, 'Project name must be 200 characters or less'),
  description: z.string({
    required_error: 'Project description is required',
    invalid_type_error: 'Project description must be a string',
  }).min(1, 'Project description cannot be empty').max(2000, 'Project description must be 2000 characters or less'),
  createdBy: z.string({
    required_error: 'Creator user ID is required',
    invalid_type_error: 'Creator user ID must be a string',
  }).min(1, 'Creator user ID cannot be empty'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
});

// Sprint schemas
export const createSprintSchema = z.object({
  projectId: z.string({
    required_error: 'Project ID is required',
    invalid_type_error: 'Project ID must be a string',
  }).min(1, 'Project ID cannot be empty'),
  name: z.string({
    required_error: 'Sprint name is required',
    invalid_type_error: 'Sprint name must be a string',
  }).min(1, 'Sprint name cannot be empty'),
  startDate: z.string().or(z.date()).transform(val => new Date(val)),
  endDate: z.string().or(z.date()).transform(val => new Date(val)),
  goal: z.string().optional(),
  status: z.enum(['planned', 'active', 'completed']).optional(),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const updateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  endDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  goal: z.string().optional(),
  status: z.enum(['planned', 'active', 'completed']).optional(),
});

// Bug schemas
export const createBugSchema = z.object({
  title: z.string({
    required_error: 'Bug title is required',
    invalid_type_error: 'Bug title must be a string',
  }).min(1, 'Bug title cannot be empty').max(200, 'Bug title must be 200 characters or less'),
  description: z.string({
    required_error: 'Bug description is required',
    invalid_type_error: 'Bug description must be a string',
  }).min(1, 'Bug description cannot be empty').max(5000, 'Bug description must be 5000 characters or less'),
  projectId: z.string({
    required_error: 'Project ID is required',
    invalid_type_error: 'Project ID must be a string',
  }).min(1, 'Project ID cannot be empty'),
  reportedBy: z.string({
    required_error: 'Reporter user ID is required',
    invalid_type_error: 'Reporter user ID must be a string',
  }).min(1, 'Reporter user ID cannot be empty'),
  priority: z.nativeEnum(BugPriority, {
    errorMap: () => ({ message: 'Invalid bug priority. Must be Lowest, Low, Medium, High, or Highest' }),
  }),
  severity: z.nativeEnum(BugSeverity, {
    errorMap: () => ({ message: 'Invalid bug severity. Must be Minor, Major, or Blocker' }),
  }),
  type: z.enum(['bug', 'epic', 'task', 'suggestion']).optional().default('bug'),
  tags: z.array(z.nativeEnum(BugTag, {
    errorMap: () => ({ message: 'Invalid bug tag. Must be Epic, Task, Suggestion, Bug:Frontend, Bug:Backend, or Bug:Test' }),
  })).optional().default([]),
  status: z.nativeEnum(BugStatus, {
    errorMap: () => ({ message: 'Invalid bug status. Must be Open, In Progress, Resolved, or Closed' }),
  }).optional(),
  assignedTo: z.string().min(1, 'Assigned user ID cannot be empty').optional(),
  sprintId: z.string().nullable().optional(),
  attachments: z.array(z.string()).optional().default([]),
});

export const updateBugStatusSchema = z.object({
  status: z.nativeEnum(BugStatus, {
    errorMap: () => ({ message: 'Invalid bug status. Must be Open, In Progress, Resolved, or Closed' }),
  }),
  userId: z.string({
    required_error: 'User ID is required',
    invalid_type_error: 'User ID must be a string',
  }).min(1, 'User ID cannot be empty'),
  userRole: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid user role. Must be admin, developer, or tester' }),
  }),
});

export const assignBugSchema = z.object({
  assignedTo: z.string({
    required_error: 'Assignee user ID is required',
    invalid_type_error: 'Assignee user ID must be a string',
  }).min(1, 'Assignee user ID cannot be empty'),
  assignedBy: z.string({
    required_error: 'Assigner user ID is required',
    invalid_type_error: 'Assigner user ID must be a string',
  }).min(1, 'Assigner user ID cannot be empty'),
});

export const updateBugSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  status: z.nativeEnum(BugStatus).optional(),
  priority: z.nativeEnum(BugPriority).optional(),
  severity: z.nativeEnum(BugSeverity).optional(),
  projectId: z.string().min(1).optional(),
  assignedTo: z.string().min(1).nullable().optional(),
  sprintId: z.string().nullable().optional(),
  attachments: z.string().optional(),
  tags: z.array(z.nativeEnum(BugTag)).optional(),
});

// Comment schemas
export const createCommentSchema = z.object({
  bugId: z.string({
    required_error: 'Bug ID is required',
    invalid_type_error: 'Bug ID must be a string',
  }).min(1, 'Bug ID cannot be empty'),
  authorId: z.string({
    required_error: 'Author user ID is required',
    invalid_type_error: 'Author user ID must be a string',
  }).min(1, 'Author user ID cannot be empty'),
  message: z.string({
    required_error: 'Comment message is required',
    invalid_type_error: 'Comment message must be a string',
  }).min(1, 'Comment message cannot be empty').max(2000, 'Comment message must be 2000 characters or less'),
});

// Activity schemas
export const createActivitySchema = z.object({
  bugId: z.string({
    required_error: 'Bug ID is required',
    invalid_type_error: 'Bug ID must be a string',
  }).min(1, 'Bug ID cannot be empty'),
  action: z.nativeEnum(ActivityAction, {
    errorMap: () => ({ message: 'Invalid activity action. Must be reported, assigned, status_changed, or commented' }),
  }),
  authorId: z.string({
    required_error: 'Author user ID is required',
    invalid_type_error: 'Author user ID must be a string',
  }).min(1, 'Author user ID cannot be empty'),
});
