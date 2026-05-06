import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AnalyticsCacheService } from '../analytics-sync/analytics-cache.service';
import { AnalyticsSyncService } from '../analytics-sync/analytics-sync.service';
import { Order } from '../database/schemas/order.schema';
import { PromoCode } from '../database/schemas/promocode.schema';
import { PromoUsage } from '../database/schemas/promo-usage.schema';
import { createPromocodeDocument } from '../promocodes/testing/promocodes-test-helpers';
import { ApplyPromocodeLockService } from './apply-promocode-lock.service';
import { OrdersService } from './orders.service';
import {
  createOrderDocument,
  createPromoUsageDocument
} from './testing/orders-test-helpers';

describe('OrdersService', () => {
  const orderModel = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn()
  };

  const promoCodeModel = {
    findOne: jest.fn()
  };

  const promoUsageModel = {
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn()
  };

  const analyticsSyncService = {
    syncOrder: jest.fn(),
    syncUser: jest.fn(),
    syncPromocode: jest.fn(),
    syncPromoUsage: jest.fn(),
    removeOrder: jest.fn(),
    removePromoUsage: jest.fn()
  };

  const analyticsCacheService = {
    invalidateUsersAnalytics: jest.fn(),
    invalidatePromocodesAnalytics: jest.fn(),
    invalidatePromoUsagesAnalytics: jest.fn()
  };

  const applyPromocodeLockService = {
    acquire: jest.fn(),
    release: jest.fn()
  };

  const currentUser = {
    id: new Types.ObjectId().toString(),
    email: 'alex@example.com',
    firstName: 'Alex',
    lastName: 'Morgan',
    isActive: true,
    createdAt: '2026-05-05T12:00:00.000Z',
    updatedAt: '2026-05-05T12:00:00.000Z'
  };

  let ordersService: OrdersService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(PromoCode.name), useValue: promoCodeModel },
        { provide: getModelToken(PromoUsage.name), useValue: promoUsageModel },
        { provide: AnalyticsSyncService, useValue: analyticsSyncService },
        { provide: AnalyticsCacheService, useValue: analyticsCacheService },
        {
          provide: ApplyPromocodeLockService,
          useValue: applyPromocodeLockService
        }
      ]
    }).compile();

    ordersService = moduleRef.get(OrdersService);
  });

  it('creates an order, syncs analytics, and returns the command response', async () => {
    const createdOrder = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id)
    });
    orderModel.create.mockResolvedValue(createdOrder);

    const result = await ordersService.createOrder(currentUser, {
      amount: 240,
      currency: 'USD'
    });

    expect(orderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 240,
        currency: 'USD',
        status: 'CREATED',
        discountAmount: 0,
        finalAmount: 240
      })
    );
    expect(analyticsSyncService.syncOrder).toHaveBeenCalledWith(
      createdOrder._id.toString()
    );
    expect(analyticsSyncService.syncUser).toHaveBeenCalledWith(currentUser.id);
    expect(analyticsCacheService.invalidateUsersAnalytics).toHaveBeenCalled();
    expect(result.status).toBe('CREATED');
  });

  it('deletes a current-user order without promo usage and refreshes affected analytics', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id)
    });
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    orderModel.findByIdAndDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });

    const result = await ordersService.deleteOrder(currentUser, order._id.toString());

    expect(orderModel.findByIdAndDelete).toHaveBeenCalledWith(order._id);
    expect(analyticsSyncService.removeOrder).toHaveBeenCalledWith(order._id.toString());
    expect(analyticsSyncService.syncUser).toHaveBeenCalledWith(currentUser.id);
    expect(analyticsCacheService.invalidateUsersAnalytics).toHaveBeenCalled();
    expect(result.id).toBe(order._id.toString());
  });

  it('deletes related promo usage when removing an applied order', async () => {
    const promocodeId = new Types.ObjectId();
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id),
      promocodeId,
      promocodeCode: 'VIP40',
      status: 'PROMOCODE_APPLIED'
    });
    const promoUsage = createPromoUsageDocument({
      userId: new Types.ObjectId(currentUser.id),
      orderId: order._id,
      promocodeId
    });

    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    orderModel.findByIdAndDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promoUsage)
    });
    promoUsageModel.findByIdAndDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promoUsage)
    });

    await ordersService.deleteOrder(currentUser, order._id.toString());

    expect(promoUsageModel.findByIdAndDelete).toHaveBeenCalledWith(promoUsage._id);
    expect(analyticsSyncService.removePromoUsage).toHaveBeenCalledWith(
      promoUsage._id.toString()
    );
    expect(analyticsSyncService.syncPromocode).toHaveBeenCalledWith(
      promocodeId.toString()
    );
    expect(analyticsCacheService.invalidatePromoUsagesAnalytics).toHaveBeenCalled();
    expect(analyticsCacheService.invalidatePromocodesAnalytics).toHaveBeenCalled();
  });

  it('rejects apply-promocode when lock acquisition fails', async () => {
    applyPromocodeLockService.acquire.mockResolvedValue(null);

    await expect(
      ordersService.applyPromocode(currentUser, new Types.ObjectId().toString(), {
        code: 'SPRING25'
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects applying a promocode to another user order', async () => {
    const foreignOrder = createOrderDocument({
      userId: new Types.ObjectId()
    });
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(foreignOrder)
    });

    await expect(
      ordersService.applyPromocode(currentUser, foreignOrder._id.toString(), {
        code: 'SPRING25'
      })
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(applyPromocodeLockService.release).toHaveBeenCalledWith(
      foreignOrder._id.toString(),
      'lock-token'
    );
  });

  it('rejects applying a promocode to a non-existing order and releases the lock', async () => {
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });

    await expect(
      ordersService.applyPromocode(currentUser, new Types.ObjectId().toString(), {
        code: 'SPRING25'
      })
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(applyPromocodeLockService.release).toHaveBeenCalledWith(
      expect.any(String),
      'lock-token'
    );
  });

  it('rejects applying a promocode twice to the same order', async () => {
    const existingOrder = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id),
      promocodeId: new Types.ObjectId(),
      promocodeCode: 'SPRING25'
    });
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingOrder)
    });

    await expect(
      ordersService.applyPromocode(currentUser, existingOrder._id.toString(), {
        code: 'SPRING25'
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects applying a second promocode when a promo usage already exists for the order', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id)
    });
    const existingUsage = createPromoUsageDocument({
      userId: new Types.ObjectId(currentUser.id),
      orderId: order._id
    });
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingUsage)
    });

    await expect(
      ordersService.applyPromocode(currentUser, order._id.toString(), {
        code: 'SPRING25'
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects non-existing promocodes', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id)
    });
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });

    await expect(
      ordersService.applyPromocode(currentUser, order._id.toString(), {
        code: 'MISSING'
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects inactive promocodes', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id)
    });
    const promocode = createPromocodeDocument({ isActive: false });
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promocode)
    });

    await expect(
      ordersService.applyPromocode(currentUser, order._id.toString(), {
        code: promocode.code
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects not-started promocodes', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id)
    });
    const promocode = createPromocodeDocument({
      dateFrom: new Date('2099-05-01T00:00:00.000Z'),
      dateTo: new Date('2099-05-31T23:59:59.999Z')
    });
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promocode)
    });

    await expect(
      ordersService.applyPromocode(currentUser, order._id.toString(), {
        code: promocode.code
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects expired promocodes', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id)
    });
    const promocode = createPromocodeDocument({
      dateFrom: new Date('2020-05-01T00:00:00.000Z'),
      dateTo: new Date('2020-05-31T23:59:59.999Z')
    });
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promocode)
    });

    await expect(
      ordersService.applyPromocode(currentUser, order._id.toString(), {
        code: promocode.code
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects promocodes when total usage limit is exceeded', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id)
    });
    const promocode = createPromocodeDocument({
      totalUsageLimit: 1,
      perUserUsageLimit: 2
    });
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promocode)
    });
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    await expect(
      ordersService.applyPromocode(currentUser, order._id.toString(), {
        code: promocode.code
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects promocodes when per-user usage limit is exceeded', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id)
    });
    const promocode = createPromocodeDocument({
      totalUsageLimit: 10,
      perUserUsageLimit: 1
    });
    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promocode)
    });
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await expect(
      ordersService.applyPromocode(currentUser, order._id.toString(), {
        code: promocode.code
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies a percent promocode, calculates the discount correctly, creates promo usage, syncs analytics, and invalidates caches', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id),
      amount: 240,
      discountAmount: 0,
      finalAmount: 240
    });
    order.save = jest.fn().mockResolvedValue(order);
    const promocode = createPromocodeDocument({
      _id: new Types.ObjectId(),
      code: 'SPRING25',
      discountType: 'PERCENT',
      discountValue: 25,
      maxDiscountAmount: 50
    });
    const promoUsage = createPromoUsageDocument({
      userId: new Types.ObjectId(currentUser.id),
      orderId: order._id,
      promocodeId: promocode._id,
      promocodeCode: promocode.code,
      discountAmount: 50,
      finalAmount: 190
    });

    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promocode)
    });
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    promoUsageModel.create.mockResolvedValue(promoUsage);

    const result = await ordersService.applyPromocode(
      currentUser,
      order._id.toString(),
      { code: 'SPRING25' }
    );

    expect(order.save).toHaveBeenCalled();
    expect(order.status).toBe('PROMOCODE_APPLIED');
    expect(order.discountAmount).toBe(50);
    expect(order.finalAmount).toBe(190);
    expect(promoUsageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order._id,
        promocodeId: promocode._id,
        discountAmount: 50,
        finalAmount: 190
      })
    );
    expect(analyticsSyncService.syncOrder).toHaveBeenCalledWith(
      order._id.toString()
    );
    expect(analyticsSyncService.syncPromoUsage).toHaveBeenCalledWith(
      promoUsage._id.toString()
    );
    expect(analyticsSyncService.syncUser).toHaveBeenCalledWith(currentUser.id);
    expect(analyticsSyncService.syncPromocode).toHaveBeenCalledWith(
      promocode._id.toString()
    );
    expect(analyticsCacheService.invalidateUsersAnalytics).toHaveBeenCalled();
    expect(
      analyticsCacheService.invalidatePromocodesAnalytics
    ).toHaveBeenCalled();
    expect(
      analyticsCacheService.invalidatePromoUsagesAnalytics
    ).toHaveBeenCalled();
    expect(result.order.discountAmount).toBe(50);
    expect(result.promoUsage.discountAmount).toBe(50);
  });

  it('releases the distributed lock after a successful promocode application', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id),
      amount: 120,
      discountAmount: 0,
      finalAmount: 120
    });
    order.save = jest.fn().mockResolvedValue(order);
    const promocode = createPromocodeDocument({
      _id: new Types.ObjectId(),
      code: 'SPRING10',
      discountType: 'PERCENT',
      discountValue: 10
    });
    const promoUsage = createPromoUsageDocument({
      userId: new Types.ObjectId(currentUser.id),
      orderId: order._id,
      promocodeId: promocode._id,
      promocodeCode: promocode.code,
      discountAmount: 12,
      finalAmount: 108
    });

    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promocode)
    });
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    promoUsageModel.create.mockResolvedValue(promoUsage);

    await ordersService.applyPromocode(currentUser, order._id.toString(), {
      code: promocode.code
    });

    expect(applyPromocodeLockService.release).toHaveBeenCalledWith(
      order._id.toString(),
      'lock-token'
    );
  });

  it('releases the distributed lock after a downstream sync failure without corrupting the order mutation', async () => {
    const order = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id),
      amount: 100,
      discountAmount: 0,
      finalAmount: 100
    });
    order.save = jest.fn().mockResolvedValue(order);
    const promocode = createPromocodeDocument({
      _id: new Types.ObjectId(),
      code: 'SPRING15',
      discountType: 'PERCENT',
      discountValue: 15
    });
    const promoUsage = createPromoUsageDocument({
      userId: new Types.ObjectId(currentUser.id),
      orderId: order._id,
      promocodeId: promocode._id,
      promocodeCode: promocode.code,
      discountAmount: 15,
      finalAmount: 85
    });

    applyPromocodeLockService.acquire.mockResolvedValue('lock-token');
    applyPromocodeLockService.release.mockResolvedValue(true);
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    promoUsageModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promocode)
    });
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    promoUsageModel.create.mockResolvedValue(promoUsage);
    analyticsSyncService.syncOrder.mockRejectedValueOnce(
      new Error('ClickHouse unavailable')
    );

    await expect(
      ordersService.applyPromocode(currentUser, order._id.toString(), {
        code: promocode.code
      })
    ).rejects.toThrow('ClickHouse unavailable');

    expect(order.save).toHaveBeenCalled();
    expect(order.promocodeCode).toBe(promocode.code);
    expect(order.discountAmount).toBe(15);
    expect(promoUsageModel.create).toHaveBeenCalled();
    expect(applyPromocodeLockService.release).toHaveBeenCalledWith(
      order._id.toString(),
      'lock-token'
    );
  });

  it('surfaces create-order sync failures after the Mongo write, preserving the command-side create', async () => {
    const createdOrder = createOrderDocument({
      userId: new Types.ObjectId(currentUser.id),
      amount: 87
    });
    orderModel.create.mockResolvedValue(createdOrder);
    analyticsSyncService.syncOrder.mockRejectedValueOnce(
      new Error('ClickHouse unavailable')
    );

    await expect(
      ordersService.createOrder(currentUser, {
        amount: 87,
        currency: 'USD'
      })
    ).rejects.toThrow('ClickHouse unavailable');

    expect(orderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 87,
        currency: 'USD'
      })
    );
  });
});
