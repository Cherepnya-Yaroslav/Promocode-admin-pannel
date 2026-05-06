import { InternalServerErrorException, Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Order } from '../database/schemas/order.schema';
import { PromoCode } from '../database/schemas/promocode.schema';
import { PromoUsage } from '../database/schemas/promo-usage.schema';
import { User } from '../database/schemas/user.schema';
import { ClickHouseSchemaService } from '../infrastructure/clickhouse/clickhouse-schema.service';
import { ClickHouseService } from '../infrastructure/clickhouse/clickhouse.service';
import { createTestOrder, createTestPromoCode, createTestUser } from '../test-utils/factories';
import { AnalyticsSyncService } from './analytics-sync.service';

describe('AnalyticsSyncService', () => {
  const userModel = {
    findById: jest.fn()
  };
  const promoCodeModel = {
    findById: jest.fn()
  };
  const orderModel = {
    findById: jest.fn(),
    find: jest.fn()
  };
  const promoUsageModel = {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn()
  };
  const clickHouseService = {
    command: jest.fn(),
    insert: jest.fn()
  };
  const clickHouseSchemaService = {
    getQualifiedTableName: jest.fn()
  };

  let analyticsSyncService: AnalyticsSyncService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsSyncService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(PromoCode.name), useValue: promoCodeModel },
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(PromoUsage.name), useValue: promoUsageModel },
        { provide: ClickHouseService, useValue: clickHouseService },
        {
          provide: ClickHouseSchemaService,
          useValue: clickHouseSchemaService
        }
      ]
    }).compile();

    analyticsSyncService = moduleRef.get(AnalyticsSyncService);
  });

  it('retries sync failures and eventually upserts the user row', async () => {
    const user = createTestUser();
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user)
    });
    orderModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([])
    });
    promoUsageModel.countDocuments.mockResolvedValue(0);
    clickHouseSchemaService.getQualifiedTableName.mockReturnValue('db.users');
    clickHouseService.command
      .mockRejectedValueOnce(new Error('transient-1'))
      .mockRejectedValueOnce(new Error('transient-2'))
      .mockResolvedValue(undefined);
    clickHouseService.insert.mockResolvedValue(undefined);

    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await analyticsSyncService.syncUser(user._id.toString());

    expect(clickHouseService.command).toHaveBeenCalledTimes(3);
    expect(clickHouseService.insert).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it('throws after retry exhaustion when sync keeps failing', async () => {
    const promocode = createTestPromoCode();
    promoCodeModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(promocode)
    });
    promoUsageModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([])
    });
    clickHouseSchemaService.getQualifiedTableName.mockReturnValue('db.promocodes');
    clickHouseService.command.mockRejectedValue(new Error('clickhouse-down'));

    await expect(
      analyticsSyncService.syncPromocode(promocode._id.toString())
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(clickHouseService.command).toHaveBeenCalledTimes(3);
  });

  it('syncs orders to ClickHouse using the related user projection data', async () => {
    const user = createTestUser();
    const order = createTestOrder({
      userId: user._id
    });
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(order)
    });
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user)
    });
    clickHouseSchemaService.getQualifiedTableName.mockReturnValue('db.orders');
    clickHouseService.command.mockResolvedValue(undefined);
    clickHouseService.insert.mockResolvedValue(undefined);

    await analyticsSyncService.syncOrder(order._id.toString());

    expect(clickHouseService.insert).toHaveBeenCalledWith(
      'db.orders',
      [
        expect.objectContaining({
          order_id: order._id.toString(),
          user_email: user.email,
          user_full_name: `${user.firstName} ${user.lastName}`
        })
      ]
    );
  });
});
