import {
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsCacheService } from '../analytics-sync/analytics-cache.service';
import { AnalyticsSyncService } from '../analytics-sync/analytics-sync.service';
import { PromoCode } from '../database/schemas/promocode.schema';
import { createPromocodeDocument } from './testing/promocodes-test-helpers';
import { PromocodesService } from './promocodes.service';

describe('PromocodesService', () => {
  const promoCodeModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn()
  };

  const analyticsSyncService = {
    syncPromocode: jest.fn()
  };

  const analyticsCacheService = {
    invalidatePromocodesAnalytics: jest.fn()
  };

  let promocodesService: PromocodesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        PromocodesService,
        {
          provide: getModelToken(PromoCode.name),
          useValue: promoCodeModel
        },
        {
          provide: AnalyticsSyncService,
          useValue: analyticsSyncService
        },
        {
          provide: AnalyticsCacheService,
          useValue: analyticsCacheService
        }
      ]
    }).compile();

    promocodesService = moduleRef.get(PromocodesService);
  });

  it('creates a promocode, syncs analytics, and returns the command response', async () => {
    promoCodeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const createdPromocode = createPromocodeDocument();
    promoCodeModel.create.mockResolvedValue(createdPromocode);

    const result = await promocodesService.createPromocode({
      code: 'spring25',
      description: '25 percent seasonal campaign',
      discountType: 'PERCENT',
      discountValue: 25,
      maxDiscountAmount: 100,
      minOrderAmount: 50,
      totalUsageLimit: 5000,
      perUserUsageLimit: 1,
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.999Z',
      isActive: true
    });

    expect(promoCodeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SPRING25'
      })
    );
    expect(analyticsSyncService.syncPromocode).toHaveBeenCalledWith(
      createdPromocode._id.toString()
    );
    expect(
      analyticsCacheService.invalidatePromocodesAnalytics
    ).toHaveBeenCalled();
    expect(result.code).toBe('SPRING25');
  });

  it('rejects duplicate promocode creation', async () => {
    promoCodeModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(createPromocodeDocument())
    });

    await expect(
      promocodesService.createPromocode({
        code: 'SPRING25',
        description: '25 percent seasonal campaign',
        discountType: 'PERCENT',
        discountValue: 25,
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.999Z'
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid promocode date windows', async () => {
    await expect(
      promocodesService.createPromocode({
        code: 'SPRING25',
        description: '25 percent seasonal campaign',
        discountType: 'PERCENT',
        discountValue: 25,
        dateFrom: '2026-05-31T23:59:59.999Z',
        dateTo: '2026-05-01T00:00:00.000Z'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects percent-based promocodes above 100 percent', async () => {
    promoCodeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      promocodesService.createPromocode({
        code: 'SPRING125',
        description: 'Impossible percentage discount',
        discountType: 'PERCENT',
        discountValue: 125,
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.999Z'
      })
    ).rejects.toThrow(
      'Percent-based promocodes cannot exceed 100 percent discount.'
    );
  });

  it('rejects per-user usage limits that exceed the total usage limit', async () => {
    promoCodeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      promocodesService.createPromocode({
        code: 'SPRING25',
        description: '25 percent seasonal campaign',
        discountType: 'PERCENT',
        discountValue: 25,
        totalUsageLimit: 2,
        perUserUsageLimit: 3,
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-31T23:59:59.999Z'
      })
    ).rejects.toThrow(
      'Promocode per-user usage limit cannot exceed total usage limit.'
    );
  });

  it('deactivates a promocode and reprojects analytics', async () => {
    const existingPromocode = createPromocodeDocument();
    existingPromocode.save = jest.fn().mockResolvedValue(existingPromocode);
    promoCodeModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingPromocode)
    });

    const result = await promocodesService.deactivatePromocode(
      existingPromocode._id.toString()
    );

    expect(existingPromocode.isActive).toBe(false);
    expect(existingPromocode.save).toHaveBeenCalled();
    expect(analyticsSyncService.syncPromocode).toHaveBeenCalledWith(
      existingPromocode._id.toString()
    );
    expect(
      analyticsCacheService.invalidatePromocodesAnalytics
    ).toHaveBeenCalled();
    expect(result.isActive).toBe(false);
  });
});
