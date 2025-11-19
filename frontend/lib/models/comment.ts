/**
 * Comment model types and interfaces for the new Collection DB schema
 */

export interface Comment {
  readonly id: string;
  bugId: string;      // Relation to Bug.id
  authorId: string;   // Relation to User.id
  message: string;
  readonly createdAt: Date;
}

export type CreateCommentInput = Omit<Comment, 'id' | 'createdAt'>;
