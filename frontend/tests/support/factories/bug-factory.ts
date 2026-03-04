import { faker } from '@faker-js/faker';
import { BugStatus, BugPriority, BugSeverity, type Bug, type BugType, type BugTag } from '@/lib/models/bug';

type BugFactoryInput = Partial<Omit<Bug, 'id' | 'createdAt' | 'updatedAt'>>;

export const createBug = (overrides: BugFactoryInput = {}): Omit<Bug, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: faker.lorem.sentence({ min: 3, max: 8 }),
  description: faker.lorem.paragraph(),
  status: BugStatus.OPEN,
  priority: BugPriority.MEDIUM,
  severity: BugSeverity.MAJOR,
  projectId: faker.string.uuid(),
  reportedBy: faker.string.uuid(),
  assignedTo: null,
  sprintId: null,
  type: 'bug' as BugType,
  attachments: '',
  tags: [],
  validated: false,
  ...overrides,
});

export const createHighPriorityBug = (overrides: BugFactoryInput = {}) =>
  createBug({ priority: BugPriority.HIGHEST, severity: BugSeverity.BLOCKER, ...overrides });

export const createTask = (overrides: BugFactoryInput = {}) =>
  createBug({ type: 'task' as BugType, severity: BugSeverity.MODERATE, tags: [] as BugTag[], ...overrides });
