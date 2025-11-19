/**
 * Activity model types and interfaces for the new Collection DB schema
 */

/**
 * Valid activity action types
 */
export enum ActivityAction {
  REPORTED = 'reported',
  ASSIGNED = 'assigned',
  STATUS_CHANGED = 'status_changed',
  COMMENTED = 'commented',
}

export interface Activity {
  readonly id: string;
  bugId: string;      // Relation to Bug.id
  action: ActivityAction | string;  // ActivityAction enum or custom string
  authorId: string;   // Relation to User.id
  readonly timestamp: Date;
}

export type CreateActivityInput = Omit<Activity, 'id'>;
