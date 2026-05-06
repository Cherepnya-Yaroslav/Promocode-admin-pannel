import { Types } from 'mongoose';
import type { DiscountType } from '../database/schemas/promocode.schema';
import type { OrderStatus } from '../database/schemas/order.schema';
import type { UserSegment } from '../database/schemas/user.schema';

interface SeedUserRecord {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  country: string;
  segment: UserSegment;
  createdAt: Date;
  updatedAt: Date;
}

interface SeedPromocodeRecord {
  _id: Types.ObjectId;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | undefined;
  minOrderAmount?: number | undefined;
  totalUsageLimit?: number | undefined;
  perUserUsageLimit?: number | undefined;
  dateFrom: Date;
  dateTo: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SeedOrderRecord {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  currency: string;
  status: OrderStatus;
  promocodeId?: Types.ObjectId | undefined;
  promocodeCode?: string | undefined;
  discountAmount: number;
  finalAmount: number;
  appliedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

interface SeedPromoUsageRecord {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  promocodeId: Types.ObjectId;
  promocodeCode: string;
  discountType: DiscountType;
  discountValueSnapshot: number;
  orderAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  usedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeedBundle {
  users: SeedUserRecord[];
  promocodes: SeedPromocodeRecord[];
  orders: SeedOrderRecord[];
  promoUsages: SeedPromoUsageRecord[];
}

const dayInMs = 24 * 60 * 60 * 1000;

export function buildSeedBundle(now: Date): SeedBundle {
  const baseDate = new Date(now.getTime() - 45 * dayInMs);
  const activeFrom = new Date(now.getTime() - 14 * dayInMs);
  const activeTo = new Date(now.getTime() + 45 * dayInMs);
  const expiredFrom = new Date(now.getTime() - 90 * dayInMs);
  const expiredTo = new Date(now.getTime() - 15 * dayInMs);
  const futureFrom = new Date(now.getTime() + 10 * dayInMs);
  const futureTo = new Date(now.getTime() + 60 * dayInMs);

  const users: SeedUserRecord[] = [
    createUser('alex.morgan@example.com', 'Alex', 'Morgan', 'US', 'vip', true, 0, baseDate),
    createUser('nina.lee@example.com', 'Nina', 'Lee', 'US', 'growth', true, 1, baseDate),
    createUser('omar.khan@example.com', 'Omar', 'Khan', 'AE', 'growth', true, 2, baseDate),
    createUser('sofia.ivanova@example.com', 'Sofia', 'Ivanova', 'RU', 'vip', true, 3, baseDate),
    createUser('marco.rossi@example.com', 'Marco', 'Rossi', 'IT', 'starter', true, 4, baseDate),
    createUser('ayla.demir@example.com', 'Ayla', 'Demir', 'TR', 'growth', true, 5, baseDate),
    createUser('liam.smith@example.com', 'Liam', 'Smith', 'GB', 'starter', true, 6, baseDate),
    createUser('emma.clark@example.com', 'Emma', 'Clark', 'CA', 'growth', true, 7, baseDate),
    createUser('yuki.tanaka@example.com', 'Yuki', 'Tanaka', 'JP', 'vip', true, 8, baseDate),
    createUser('mia.garcia@example.com', 'Mia', 'Garcia', 'ES', 'starter', true, 9, baseDate),
    createUser('noah.patel@example.com', 'Noah', 'Patel', 'IN', 'growth', true, 10, baseDate),
    createUser('lucy.brown@example.com', 'Lucy', 'Brown', 'AU', 'starter', false, 11, baseDate)
  ];

  const promocodes: SeedPromocodeRecord[] = [
    createPromocode(
      'WELCOME10',
      '10 percent welcome offer for new customer acquisition.',
      'PERCENT',
      10,
      activeFrom,
      activeTo,
      true,
      1200,
      1,
      15,
      20,
      baseDate,
      0
    ),
    createPromocode(
      'VIP40',
      'High-value VIP growth code with capped discount.',
      'PERCENT',
      40,
      activeFrom,
      activeTo,
      true,
      300,
      2,
      80,
      150,
      baseDate,
      1
    ),
    createPromocode(
      'CASH25',
      'Fixed cash discount for medium basket recovery.',
      'FIXED',
      25,
      activeFrom,
      activeTo,
      true,
      900,
      3,
      undefined,
      60,
      baseDate,
      2
    ),
    createPromocode(
      'RISK15',
      'Inactive retention code paused after exposure review.',
      'PERCENT',
      15,
      activeFrom,
      activeTo,
      false,
      600,
      2,
      50,
      40,
      baseDate,
      3
    ),
    createPromocode(
      'SPRING20',
      'Expired spring campaign used for historical analytics.',
      'PERCENT',
      20,
      expiredFrom,
      expiredTo,
      false,
      800,
      2,
      70,
      30,
      baseDate,
      4
    ),
    createPromocode(
      'SUMMER30',
      'Scheduled future summer code not yet active.',
      'PERCENT',
      30,
      futureFrom,
      futureTo,
      true,
      1500,
      1,
      90,
      50,
      baseDate,
      5
    )
  ];

  const orders: SeedOrderRecord[] = [];
  const promoUsages: SeedPromoUsageRecord[] = [];

  const orderBlueprints = [
    { userIndex: 0, amount: 420, currency: 'USD', promoIndex: 1, daysAgo: 20 },
    { userIndex: 0, amount: 180, currency: 'USD', promoIndex: undefined, daysAgo: 10 },
    { userIndex: 1, amount: 110, currency: 'USD', promoIndex: 0, daysAgo: 18 },
    { userIndex: 1, amount: 260, currency: 'USD', promoIndex: 2, daysAgo: 7 },
    { userIndex: 2, amount: 320, currency: 'AED', promoIndex: 2, daysAgo: 16 },
    { userIndex: 2, amount: 95, currency: 'AED', promoIndex: undefined, daysAgo: 5 },
    { userIndex: 3, amount: 500, currency: 'RUB', promoIndex: 1, daysAgo: 14 },
    { userIndex: 3, amount: 230, currency: 'RUB', promoIndex: 4, daysAgo: 32 },
    { userIndex: 4, amount: 140, currency: 'EUR', promoIndex: 0, daysAgo: 13 },
    { userIndex: 4, amount: 88, currency: 'EUR', promoIndex: undefined, daysAgo: 3 },
    { userIndex: 5, amount: 275, currency: 'TRY', promoIndex: 2, daysAgo: 12 },
    { userIndex: 5, amount: 190, currency: 'TRY', promoIndex: undefined, daysAgo: 2 },
    { userIndex: 6, amount: 150, currency: 'GBP', promoIndex: 0, daysAgo: 11 },
    { userIndex: 6, amount: 340, currency: 'GBP', promoIndex: 3, daysAgo: 24 },
    { userIndex: 7, amount: 210, currency: 'CAD', promoIndex: 2, daysAgo: 9 },
    { userIndex: 7, amount: 130, currency: 'CAD', promoIndex: undefined, daysAgo: 4 },
    { userIndex: 8, amount: 620, currency: 'JPY', promoIndex: 1, daysAgo: 8 },
    { userIndex: 8, amount: 260, currency: 'JPY', promoIndex: 4, daysAgo: 28 },
    { userIndex: 9, amount: 145, currency: 'EUR', promoIndex: 0, daysAgo: 6 },
    { userIndex: 9, amount: 310, currency: 'EUR', promoIndex: undefined, daysAgo: 1 },
    { userIndex: 10, amount: 170, currency: 'INR', promoIndex: 2, daysAgo: 15 },
    { userIndex: 10, amount: 290, currency: 'INR', promoIndex: undefined, daysAgo: 5 },
    { userIndex: 11, amount: 205, currency: 'AUD', promoIndex: 4, daysAgo: 26 },
    { userIndex: 11, amount: 118, currency: 'AUD', promoIndex: undefined, daysAgo: 6 }
  ] as const;

  for (const [index, blueprint] of orderBlueprints.entries()) {
    const user = users[blueprint.userIndex];
    const createdAt = new Date(now.getTime() - blueprint.daysAgo * dayInMs);
    const orderId = new Types.ObjectId();

    if (!user) {
      throw new Error(`Missing seed user for index ${blueprint.userIndex}`);
    }

    const promocode =
      blueprint.promoIndex === undefined
        ? undefined
        : promocodes[blueprint.promoIndex];

    const discountAmount = promocode
      ? calculateDiscount(blueprint.amount, promocode.discountType, promocode.discountValue, promocode.maxDiscountAmount)
      : 0;

    const finalAmount = roundMoney(blueprint.amount - discountAmount);
    const appliedAt = promocode
      ? new Date(createdAt.getTime() + 45 * 60 * 1000)
      : undefined;
    const status: OrderStatus = promocode ? 'PROMOCODE_APPLIED' : 'CREATED';

    orders.push({
      _id: orderId,
      userId: user._id,
      amount: blueprint.amount,
      currency: blueprint.currency,
      status,
      promocodeId: promocode?._id,
      promocodeCode: promocode?.code,
      discountAmount,
      finalAmount,
      appliedAt,
      createdAt,
      updatedAt: appliedAt ?? createdAt
    });

    if (promocode && appliedAt) {
      promoUsages.push({
        _id: new Types.ObjectId(),
        userId: user._id,
        orderId,
        promocodeId: promocode._id,
        promocodeCode: promocode.code,
        discountType: promocode.discountType,
        discountValueSnapshot: promocode.discountValue,
        orderAmount: blueprint.amount,
        discountAmount,
        finalAmount,
        currency: blueprint.currency,
        usedAt: appliedAt,
        createdAt: appliedAt,
        updatedAt: appliedAt
      });
    }

    if (index % 3 === 0) {
      const extraCreatedAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);
      const extraAmount = roundMoney(blueprint.amount * 0.65);
      orders.push({
        _id: new Types.ObjectId(),
        userId: user._id,
        amount: extraAmount,
        currency: blueprint.currency,
        status: 'CREATED',
        discountAmount: 0,
        finalAmount: extraAmount,
        createdAt: extraCreatedAt,
        updatedAt: extraCreatedAt
      });
    }
  }

  return {
    users,
    promocodes,
    orders,
    promoUsages
  };
}

function createUser(
  email: string,
  firstName: string,
  lastName: string,
  country: string,
  segment: UserSegment,
  isActive: boolean,
  offsetDays: number,
  baseDate: Date
): SeedUserRecord {
  const createdAt = new Date(baseDate.getTime() + offsetDays * dayInMs);

  return {
    _id: new Types.ObjectId(),
    email,
    passwordHash: 'stage3-seed-password-placeholder',
    firstName,
    lastName,
    isActive,
    country,
    segment,
    createdAt,
    updatedAt: createdAt
  };
}

function createPromocode(
  code: string,
  description: string,
  discountType: DiscountType,
  discountValue: number,
  dateFrom: Date,
  dateTo: Date,
  isActive: boolean,
  totalUsageLimit: number,
  perUserUsageLimit: number,
  maxDiscountAmount: number | undefined,
  minOrderAmount: number | undefined,
  baseDate: Date,
  offsetDays: number
): SeedPromocodeRecord {
  const createdAt = new Date(baseDate.getTime() + offsetDays * dayInMs);

  return {
    _id: new Types.ObjectId(),
    code,
    description,
    discountType,
    discountValue,
    maxDiscountAmount,
    minOrderAmount,
    totalUsageLimit,
    perUserUsageLimit,
    dateFrom,
    dateTo,
    isActive,
    createdAt,
    updatedAt: createdAt
  };
}

function calculateDiscount(
  amount: number,
  discountType: DiscountType,
  discountValue: number,
  maxDiscountAmount?: number
): number {
  const rawDiscount =
    discountType === 'PERCENT'
      ? roundMoney((amount * discountValue) / 100)
      : roundMoney(discountValue);

  const cappedDiscount =
    maxDiscountAmount === undefined
      ? rawDiscount
      : Math.min(rawDiscount, maxDiscountAmount);

  return roundMoney(cappedDiscount);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}
