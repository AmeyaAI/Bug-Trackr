/**
 * User model types and interfaces for the new Collection DB schema
 */

export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  TESTER = 'tester',
}

export interface User {
  readonly id: string;              // from __auto_id__
  userId: string;
  name: string;                     // PII: Handle with care
  email: string;                    // PII: Handle with care, mask in logs
  role: UserRole;
  availableRoles?: UserRole[];      // Roles available to the user in the organization
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
