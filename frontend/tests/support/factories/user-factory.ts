import { faker } from '@faker-js/faker';
import type { User, UserRole } from '@/lib/models/user';

type UserFactoryInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

export const createUser = (overrides: UserFactoryInput = {}): Omit<User, 'id' | 'createdAt' | 'updatedAt'> => ({
  userId: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: 'developer' as UserRole,
  ...overrides,
});

export const createAdminUser = (overrides: UserFactoryInput = {}) =>
  createUser({ role: 'admin' as UserRole, ...overrides });

export const createTesterUser = (overrides: UserFactoryInput = {}) =>
  createUser({ role: 'tester' as UserRole, ...overrides });
