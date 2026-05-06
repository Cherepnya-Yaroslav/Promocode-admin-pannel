import { Types } from 'mongoose';
import { createUserDocument } from '../auth/testing/auth-test-helpers';
import { type AuthenticatedUser } from '../auth/auth.types';
import { createOrderDocument } from '../orders/testing/orders-test-helpers';
import { createPromocodeDocument } from '../promocodes/testing/promocodes-test-helpers';

export function createTestUser(
  overrides: Parameters<typeof createUserDocument>[0] = {}
) {
  return createUserDocument(overrides);
}

export function createTestPromoCode(
  overrides: Parameters<typeof createPromocodeDocument>[0] = {}
) {
  return createPromocodeDocument(overrides);
}

export function createTestOrder(
  overrides: Parameters<typeof createOrderDocument>[0] = {}
) {
  return createOrderDocument(overrides);
}

export function mockCurrentUser(
  overrides: Partial<AuthenticatedUser> = {}
): AuthenticatedUser {
  return {
    id: new Types.ObjectId().toString(),
    email: 'alex@example.com',
    firstName: 'Alex',
    lastName: 'Morgan',
    isActive: true,
    createdAt: '2026-05-05T12:00:00.000Z',
    updatedAt: '2026-05-05T12:00:00.000Z',
    ...overrides
  };
}
