import { Types } from 'mongoose';
import type { PromoCodeDocument } from '../../database/schemas/promocode.schema';

export function createPromocodeDocument(
  overrides: Partial<PromoCodeDocument> = {}
): PromoCodeDocument {
  const now = new Date('2026-05-05T12:00:00.000Z');

  return {
    _id: new Types.ObjectId(),
    code: 'SPRING25',
    description: '25 percent seasonal campaign',
    discountType: 'PERCENT',
    discountValue: 25,
    maxDiscountAmount: 100,
    minOrderAmount: 50,
    totalUsageLimit: 5000,
    perUserUsageLimit: 1,
    dateFrom: new Date('2026-05-01T00:00:00.000Z'),
    dateTo: new Date('2026-05-31T23:59:59.999Z'),
    isActive: true,
    createdAt: now,
    updatedAt: now,
    toJSON: () => ({}) as never,
    toObject: () => ({}) as never,
    ...overrides
  } as PromoCodeDocument;
}
