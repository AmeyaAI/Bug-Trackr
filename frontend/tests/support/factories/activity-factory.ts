import { faker } from '@faker-js/faker';

interface ActivityLog {
  id: string;
  bugId: string;
  bugTitle: string;
  projectId: string;
  projectName: string;
  action: 'reported' | 'assigned' | 'status_changed' | 'validated' | 'commented';
  performedBy: string;
  performedByName: string;
  assignedToName?: string;
  newStatus?: string;
  timestamp: string;
}

type ActivityFactoryInput = Partial<ActivityLog>;

export const createActivity = (overrides: ActivityFactoryInput = {}): ActivityLog => ({
  id: faker.string.uuid(),
  bugId: faker.string.uuid(),
  bugTitle: faker.lorem.sentence({ min: 3, max: 8 }),
  projectId: faker.string.uuid(),
  projectName: faker.company.name() + ' Project',
  action: 'reported',
  performedBy: faker.string.uuid(),
  performedByName: faker.person.fullName(),
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createAssignedActivity = (overrides: ActivityFactoryInput = {}) =>
  createActivity({
    action: 'assigned',
    assignedToName: faker.person.fullName(),
    ...overrides,
  });

export const createStatusChangedActivity = (overrides: ActivityFactoryInput = {}) =>
  createActivity({
    action: 'status_changed',
    newStatus: 'In Progress',
    ...overrides,
  });
