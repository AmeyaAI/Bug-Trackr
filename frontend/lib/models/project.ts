/**
 * Project model types and interfaces for the new Collection DB schema
 */

export interface Project {
  readonly id: string;
  name: string;
  description: string;
  readonly createdBy: string;  // User ID (relation to User.id) - immutable after creation
}

export type CreateProjectInput = Omit<Project, 'id'>;
export type UpdateProjectInput = Partial<Omit<Project, 'id' | 'createdBy'>>;
