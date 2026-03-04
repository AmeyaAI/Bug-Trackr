import { faker } from '@faker-js/faker';
import type { Project } from '@/lib/models/project';

type ProjectFactoryInput = Partial<Omit<Project, 'id' | 'createdAt'>>;

export const createProject = (overrides: ProjectFactoryInput = {}): Omit<Project, 'id' | 'createdAt'> => ({
  name: faker.company.name() + ' Project',
  description: faker.lorem.sentence(),
  createdBy: faker.string.uuid(),
  ...overrides,
});
