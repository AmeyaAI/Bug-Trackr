/**
 * TypeScript interfaces matching backend Pydantic models
 * These types ensure type safety for API communication
 */

import { BugTag, BugType } from '@/lib/models/bug';
export { BugTag };
export type { BugType };

// Enums matching backend
export enum BugStatus {
  OPEN = "Open",
  IN_PROGRESS = "In Progress",
  RESOLVED = "Resolved",
  CLOSED = "Closed",
}

export enum BugPriority {
  LOWEST = "Lowest",
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  HIGHEST = "Highest",
}

export enum BugSeverity {
  MINOR = "Minor",
  MAJOR = "Major",
  BLOCKER = "Blocker",
  // Suggestion severities
  NICE_TO_HAVE = "Nice to have",
  MUST_HAVE = "Must have",
  STRATEGIC = "Strategic",
  // Epic/Task severities
  TRIVIAL = "Trivial",
  MODERATE = "Moderate",
  HEAVY = "Heavy",
  MASSIVE = "Massive",
}

export enum UserRole {
  TESTER = "tester",
  DEVELOPER = "developer",
  ADMIN = "admin",
}

// Core entity interfaces
export interface Bug {
  id: string;  // Changed from _id to match new API
  title: string;
  description: string;
  projectId: string;
  reportedBy: string;
  assignedTo?: string | null;
  sprintId?: string | null;
  status: BugStatus;
  priority: BugPriority;
  severity: BugSeverity;
  type: BugType;
  tags: BugTag[];
  validated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;  // Changed from _id to match new API
  bugId: string;
  authorId: string;
  message: string;
  createdAt: string;
}

export interface Project {
  id: string;  // Changed from _id to match new API
  name: string;
  description: string;
  createdBy: string;
  createdAt?: string;
}

export interface User {
  id: string;  // Changed from _id to match new API
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;  // Changed from _id to match new API
  bugId: string;
  bugTitle: string;
  projectId: string;
  projectName: string;
  action: string;
  performedBy: string;
  performedByName: string;
  assignedToName?: string;  // For "assigned" action - name of user who was assigned
  newStatus?: string;  // For "status_changed" action - the new status value
  timestamp: string;
}

// API Request types
export interface BugCreateRequest {
  title: string;
  description: string;
  projectId: string;
  reportedBy: string;
  priority: BugPriority;
  severity: BugSeverity;
  type: BugType;
  tags: BugTag[];
  sprintId?: string | null;
}

export interface BugStatusUpdateRequest {
  status: BugStatus;
  userId: string;
  userRole: UserRole;
}

export interface BugAssignRequest {
  assignedTo: string;
  assignedBy: string;
}

export interface CommentCreateRequest {
  bugId: string;
  authorId: string;
  message: string;
}

export interface ProjectCreateRequest {
  name: string;
  description: string;
  createdBy: string;
}

// API Response types
export interface BugResponse {
  id: string;
  title: string;
  description: string;
  projectId: string;
  reportedBy: string;
  assignedTo?: string;
  sprintId?: string | null;
  status: BugStatus;
  priority: BugPriority;
  severity: BugSeverity;
  type: BugType;
  tags: BugTag[];
  validated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentResponse {
  id: string;
  bugId: string;
  authorId: string;
  message: string;
  createdAt: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface BugWithCommentsResponse {
  bug: BugResponse;
  comments: CommentResponse[];
}

export interface StatusUpdateResponse {
  success: boolean;
  message: string;
  bug?: BugResponse;
}

export interface AssignmentResponse {
  success: boolean;
  message: string;
  bug?: BugResponse;
}

// Role-based permission helpers
export interface RolePermissions {
  canCreateBug: boolean;
  canValidateBug: boolean;
  canCloseBug: boolean;
  canAssignBug: boolean;
  canUpdateStatus: boolean;
  canComment: boolean;
}

export const getRolePermissions = (role: UserRole): RolePermissions => {
  switch (role) {
    case UserRole.TESTER:
      return {
        canCreateBug: true,
        canValidateBug: true,
        canCloseBug: true,
        canAssignBug: false,
        canUpdateStatus: false,
        canComment: true,
      };
    case UserRole.DEVELOPER:
      return {
        canCreateBug: true,
        canValidateBug: false,
        canCloseBug: false,
        canAssignBug: true,
        canUpdateStatus: true,
        canComment: true,
      };
    case UserRole.ADMIN:
      return {
        canCreateBug: true,
        canValidateBug: true,
        canCloseBug: true,
        canAssignBug: true,
        canUpdateStatus: true,
        canComment: true,
      };
    default:
      return {
        canCreateBug: false,
        canValidateBug: false,
        canCloseBug: false,
        canAssignBug: false,
        canUpdateStatus: false,
        canComment: false,
      };
  }
};
