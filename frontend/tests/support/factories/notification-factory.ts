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
  message: faker.lorem.sentence(),
  actorId: faker.string.uuid(),
  actorName: faker.person.fullName(),
  isRead: false,
  readAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createAssignmentNotification = (overrides: NotificationFactoryInput = {}) =>
  createNotification({
    type: 'assignment',
    message: `You have been assigned to bug: ${faker.lorem.sentence({ min: 3, max: 6 })}`,
    ...overrides,
  });

export const createStatusChangeNotification = (overrides: NotificationFactoryInput = {}) =>
  createNotification({
    type: 'status_change',
    message: `Bug status changed to ${faker.helpers.arrayElement(['In Progress', 'Resolved', 'Closed', 'Reopened'])}`,
    ...overrides,
  });

export const createCommentNotification = (overrides: NotificationFactoryInput = {}) =>
  createNotification({
    type: 'comment',
    message: `${faker.person.fullName()} commented on a bug you are following`,
    ...overrides,
  });

export const createUnreadNotification = (overrides: NotificationFactoryInput = {}) =>
  createNotification({
    isRead: false,
    readAt: null,
    ...overrides,
  });

export const createReadNotification = (overrides: NotificationFactoryInput = {}) =>
  createNotification({
    isRead: true,
    readAt: faker.date.recent().toISOString(),
    ...overrides,
  });
