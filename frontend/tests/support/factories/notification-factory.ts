import { faker } from '@faker-js/faker';

type NotificationType =
  | 'assignment'
  | 'status_change'
  | 'comment'
  | 'priority_change'
  | 'severity_escalation'
  | 'mention';

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  bugId: string;
  bugTitle: string;
  message: string;
  actorId: string;
  actorName: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

type NotificationFactoryInput = Partial<Notification>;

export const createNotification = (overrides: NotificationFactoryInput = {}): Notification => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  type: 'assignment',
  bugId: faker.string.uuid(),
  bugTitle: faker.lorem.sentence({ min: 3, max: 8 }),
  message: `You were assigned to bug #${faker.string.alphanumeric(6)}: ${faker.lorem.sentence()}`,
  actorId: faker.string.uuid(),
  actorName: faker.person.fullName(),
  isRead: false,
  readAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createReadNotification = (overrides: NotificationFactoryInput = {}): Notification =>
  createNotification({
    isRead: true,
    readAt: new Date().toISOString(),
    ...overrides,
  });

export const createAssignmentNotification = (overrides: NotificationFactoryInput = {}): Notification =>
  createNotification({
    type: 'assignment',
    message: `You were assigned to bug #${overrides.bugId || faker.string.alphanumeric(6)}: ${overrides.bugTitle || faker.lorem.sentence()}`,
    ...overrides,
  });

export const createStatusChangeNotification = (overrides: NotificationFactoryInput = {}): Notification =>
  createNotification({
    type: 'status_change',
    message: `Bug #${overrides.bugId || faker.string.alphanumeric(6)} status changed from Open to In Progress`,
    ...overrides,
  });

export const createCommentNotification = (overrides: NotificationFactoryInput = {}): Notification =>
  createNotification({
    type: 'comment',
    message: `${overrides.actorName || faker.person.fullName()} commented on bug #${overrides.bugId || faker.string.alphanumeric(6)}: ${overrides.bugTitle || faker.lorem.sentence()}`,
    ...overrides,
  });

export const createPriorityChangeNotification = (overrides: NotificationFactoryInput = {}): Notification =>
  createNotification({
    type: 'priority_change',
    message: `Bug #${overrides.bugId || faker.string.alphanumeric(6)} priority changed from Medium to Highest`,
    ...overrides,
  });

export const createSeverityEscalationNotification = (overrides: NotificationFactoryInput = {}): Notification =>
  createNotification({
    type: 'severity_escalation',
    message: `URGENT: Bug #${overrides.bugId || faker.string.alphanumeric(6)} escalated to Blocker`,
    ...overrides,
  });
