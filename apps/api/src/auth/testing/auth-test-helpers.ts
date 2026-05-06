import { Types } from 'mongoose';
import type { UserDocument } from '../../database/schemas/user.schema';

export function createUserDocument(
  overrides: Partial<UserDocument> = {}
): UserDocument {
  const now = new Date('2026-05-05T12:00:00.000Z');

  return {
    _id: new Types.ObjectId(),
    email: 'alex@example.com',
    passwordHash: '$2a$12$placeholder',
    firstName: 'Alex',
    lastName: 'Morgan',
    isActive: true,
    country: 'US',
    segment: 'starter',
    createdAt: now,
    updatedAt: now,
    toJSON: () => ({}) as never,
    toObject: () => ({}) as never,
    ...overrides
  } as UserDocument;
}
