/**
 * Sprint model types and interfaces
 * 
 * Requirements: 2.1
 */

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface Sprint {
  readonly id: string;
  projectId: string;      // Foreign Key to Project
  name: string;           // e.g., "Sprint 24"
  startDate: Date;
  endDate: Date;
  goal?: string;          // Optional description
  status: SprintStatus;
  bugIds?: string[];      // IDs of bugs in this sprint
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSprintInput {
  projectId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  goal?: string;
  status?: SprintStatus;
}

export interface UpdateSprintInput {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  goal?: string;
  status?: SprintStatus;
}
