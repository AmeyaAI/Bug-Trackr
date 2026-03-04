import { faker } from '@faker-js/faker';

interface Sprint {
  id: string;
  name: string;
  projectId: string;
  status: 'planned' | 'active' | 'completed';
  startDate: string;
  endDate: string;
  goal: string;
}

type SprintFactoryInput = Partial<Sprint>;

export const createSprint = (overrides: SprintFactoryInput = {}): Sprint => {
  const startDate = overrides.startDate || new Date(Date.now() - 7 * 86400000).toISOString();
  const endDate = overrides.endDate || new Date(Date.now() + 7 * 86400000).toISOString();

  return {
    id: faker.string.uuid(),
    name: `Sprint ${faker.number.int({ min: 1, max: 100 })}`,
    projectId: faker.string.uuid(),
    status: 'active',
    startDate,
    endDate,
    goal: faker.lorem.sentence(),
    ...overrides,
  };
};

export const createPlannedSprint = (overrides: SprintFactoryInput = {}) =>
  createSprint({
    status: 'planned',
    startDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 28 * 86400000).toISOString(),
    ...overrides,
  });

export const createCompletedSprint = (overrides: SprintFactoryInput = {}) =>
  createSprint({
    status: 'completed',
    startDate: new Date(Date.now() - 28 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    ...overrides,
  });
