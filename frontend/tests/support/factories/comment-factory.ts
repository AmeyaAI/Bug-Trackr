import { faker } from '@faker-js/faker';

interface Comment {
  id: string;
  bugId: string;
  authorId: string;
  message: string;
  createdAt: string;
}

type CommentFactoryInput = Partial<Comment>;

export const createComment = (overrides: CommentFactoryInput = {}): Comment => ({
  id: faker.string.uuid(),
  bugId: faker.string.uuid(),
  authorId: faker.string.uuid(),
  message: faker.lorem.paragraph(),
  createdAt: new Date().toISOString(),
  ...overrides,
});
