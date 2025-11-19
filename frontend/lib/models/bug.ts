/**
 * Bug model types and interfaces for the new Collection DB schema
 */

export enum BugStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
}

export enum BugPriority {
  LOWEST = 'Lowest',
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  HIGHEST = 'Highest',
}

export enum BugSeverity {
  MINOR = 'Minor',
  MAJOR = 'Major',
  BLOCKER = 'Blocker',
}

/**
 * Predefined bug tags for categorization
 * Multiple tags can be applied to a single bug
 */
export enum BugTag {
  EPIC = 'Epic',
  TASK = 'Task',
  SUGGESTION = 'Suggestion',
  BUG_FRONTEND = 'Bug:Frontend',
  BUG_BACKEND = 'Bug:Backend',
  BUG_TEST = 'Bug:Test',
}

/**
 * Helper to get all available bug tags as an array
 */
export const ALL_BUG_TAGS = Object.values(BugTag);

export interface Bug {
  readonly id: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: BugPriority;
  severity: BugSeverity;
  projectId: string;        // Relation to Project.id
  reportedBy: string;       // Relation to User.id
  assignedTo: string | null; // Relation to User.id (nullable)
  attachments: string;      // Comma-separated URLs or file paths
  tags: BugTag[];           // Array of predefined tags (can be multiple)
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type CreateBugInput = Omit<Bug, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateBugInput = Partial<Omit<Bug, 'id' | 'createdAt' | 'updatedAt'>>;
