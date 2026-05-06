import { Types } from 'mongoose';
import type { OrderDocument } from '../../database/schemas/order.schema';
import type { PromoUsageDocument } from '../../database/schemas/promo-usage.schema';

export function createOrderDocument(
  overrides: Partial<OrderDocument> = {}
): OrderDocument {
  const now = new Date('2026-05-05T12:00:00.000Z');

  return {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    amount: 240,
    currency: 'USD',
    status: 'CREATED',
    discountAmount: 0,
    finalAmount: 240,
    createdAt: now,
    updatedAt: now,
    save: jest.fn(),
    toJSON: () => ({}) as never,
    toObject: () => ({}) as never,
    ...overrides
  } as OrderDocument;
}

export function createPromoUsageDocument(
  overrides: Partial<PromoUsageDocument> = {}
): PromoUsageDocument {
  const now = new Date('2026-05-05T12:05:00.000Z');

  return {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    orderId: new Types.ObjectId(),
    promocodeId: new Types.ObjectId(),
    promocodeCode: 'SPRING25',
    discountType: 'PERCENT',
    discountValueSnapshot: 25,
    orderAmount: 240,
    discountAmount: 60,
    finalAmount: 180,
    currency: 'USD',
    usedAt: now,
    createdAt: now,
    updatedAt: now,
    toJSON: () => ({}) as never,
    toObject: () => ({}) as never,
    ...overrides
  } as PromoUsageDocument;
}
