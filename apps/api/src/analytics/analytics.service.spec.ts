import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Test } from '@nestjs/testing';
import { ClickHouseService } from '../infrastructure/clickhouse/clickhouse.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { AnalyticsService } from './analytics.service';
import { PromocodesAnalyticsQueryDto } from './dto/promocodes-analytics-query.dto';
import { PromoUsagesAnalyticsQueryDto } from './dto/promo-usages-analytics-query.dto';
import { UsersAnalyticsQueryDto } from './dto/users-analytics-query.dto';

describe('AnalyticsService', () => {
  const clickHouseService = {
    query: jest.fn()
  };

  const redisClient = {
    get: jest.fn(),
    set: jest.fn()
  };

  const redisService = {
    getConnectedClient: jest.fn().mockResolvedValue(redisClient)
  };

  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    redisService.getConnectedClient.mockResolvedValue(redisClient);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: ClickHouseService,
          useValue: clickHouseService
        },
        {
          provide: RedisService,
          useValue: redisService
        }
      ]
    }).compile();

    analyticsService = moduleRef.get(AnalyticsService);
  });

  it('returns cached users analytics without querying ClickHouse', async () => {
    redisClient.get.mockResolvedValue(
      JSON.stringify({
        items: [{ userId: 'user-1', email: 'alex@example.com' }],
        page: 1,
        pageSize: 20,
        totalCount: 1
      })
    );

    const result = await analyticsService.getUsersAnalytics({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortDir: 'desc'
    });

    expect(clickHouseService.query).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(1);
  });

  it('queries ClickHouse with whitelisted sort columns and caches users analytics', async () => {
    redisClient.get.mockResolvedValue(null);
    clickHouseService.query
      .mockResolvedValueOnce([
        {
          user_id: 'user-1',
          email: 'alex@example.com',
          full_name: 'Alex Morgan',
          is_active: 1,
          country: 'US',
          segment: 'vip',
          created_at: '2026-05-01 10:00:00.000',
          total_orders_count: 12,
          total_orders_amount: 980,
          total_discount_amount: 140,
          total_promo_usage_count: 4,
          last_order_at: '2026-05-05 12:05:00.000'
        }
      ])
      .mockResolvedValueOnce([{ total_count: 1 }]);

    const result = await analyticsService.getUsersAnalytics({
      page: 2,
      pageSize: 10,
      sortBy: 'totalOrdersAmount',
      sortDir: 'asc',
      email: 'alex@example.com',
      isActive: true
    });

    expect(clickHouseService.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('ORDER BY total_orders_amount ASC'),
      expect.objectContaining({
        email: 'alex@example.com',
        isActive: 1,
        limit: 10,
        offset: 10
      })
    );
    expect(redisClient.set).toHaveBeenCalledWith(
      expect.stringMatching(/^analytics:users:/),
      expect.any(String),
      'EX',
      30
    );
    expect(result.items[0]?.totalOrdersAmount).toBe(980);
    expect(result.page).toBe(2);
    const [dataQuery, queryParams] = clickHouseService.query.mock.calls[0] as [
      string,
      Record<string, unknown>
    ];
    expect(dataQuery).not.toContain('alex@example.com');
    expect(queryParams.email).toBe('alex@example.com');
  });

  it('queries ClickHouse for promocode analytics with derived conversion rate sorting', async () => {
    redisClient.get.mockResolvedValue(null);
    clickHouseService.query
      .mockResolvedValueOnce([
        {
          promocode_id: 'promo-1',
          code: 'SPRING25',
          discount_type: 'PERCENT',
          discount_value: 25,
          is_active: 1,
          date_from: '2026-05-01 00:00:00.000',
          date_to: '2026-05-31 23:59:59.999',
          total_usage_count: 220,
          total_discount_amount: 8450,
          total_revenue_affected: 49200,
          unique_users_count: 205,
          conversion_rate: 0.17,
          last_used_at: '2026-05-05 11:59:00.000'
        }
      ])
      .mockResolvedValueOnce([{ total_count: 1 }]);

    const result = await analyticsService.getPromocodesAnalytics({
      page: 1,
      pageSize: 20,
      sortBy: 'conversionRate',
      sortDir: 'desc',
      discountType: 'PERCENT',
      state: 'active',
      minUsageCount: 100
    });

    const [dataQuery] = clickHouseService.query.mock.calls[0] as [
      string,
      Record<string, unknown>
    ];

    expect(dataQuery).toContain('is_active = 1');
    expect(dataQuery).toContain('date_from <= now64(3)');
    expect(dataQuery).toContain('date_to >= now64(3)');
    expect(dataQuery).toContain('total_usage_count >= {minUsageCount: UInt64}');
    expect(clickHouseService.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('ORDER BY conversion_rate DESC'),
      expect.objectContaining({
        discountType: 'PERCENT',
        minUsageCount: 100,
        limit: 20,
        offset: 0
      })
    );
    expect(result.items[0]?.conversionRate).toBe(0.17);
  });

  it('parameterizes analytics filters and applies date-range filters for promo usage analytics', async () => {
    redisClient.get.mockResolvedValue(null);
    clickHouseService.query
      .mockResolvedValueOnce([
        {
          promo_usage_id: 'usage-1',
          used_at: '2026-05-05 10:15:00.000',
          promocode_id: 'promo-1',
          promocode_code: 'SPRING25',
          discount_type: 'PERCENT',
          user_id: 'user-1',
          user_email: 'alex@example.com',
          user_full_name: 'Alex Morgan',
          order_id: 'order-1',
          order_amount: 200,
          discount_amount: 50,
          final_amount: 150,
          currency: 'USD'
        }
      ])
      .mockResolvedValueOnce([{ total_count: 1 }]);

    const injectedEmail = "alex@example.com' OR 1=1 --";
    const result = await analyticsService.getPromoUsagesAnalytics({
      page: 1,
      pageSize: 25,
      sortBy: 'usedAt',
      sortDir: 'desc',
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.999Z',
      userEmail: injectedEmail,
      promocodeCode: 'SPRING',
      currency: 'USD',
      discountType: 'PERCENT',
      minDiscountAmount: 20,
      maxDiscountAmount: 60
    });

    const [dataQuery, params] = clickHouseService.query.mock.calls[0] as [
      string,
      Record<string, unknown>
    ];

    expect(dataQuery).toContain(
      'used_at >= parseDateTime64BestEffort({dateFrom: String})'
    );
    expect(dataQuery).toContain(
      'used_at <= parseDateTime64BestEffort({dateTo: String})'
    );
    expect(dataQuery).toContain(
      'positionCaseInsensitiveUTF8(user_email, {userEmail: String}) > 0'
    );
    expect(dataQuery).toContain(
      'discount_amount >= {minDiscountAmount: Float64}'
    );
    expect(dataQuery).toContain(
      'discount_amount <= {maxDiscountAmount: Float64}'
    );
    expect(dataQuery).not.toContain(injectedEmail);
    expect(params).toMatchObject({
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.999Z',
      userEmail: injectedEmail,
      promocodeCode: 'SPRING',
      currency: 'USD',
      discountType: 'PERCENT',
      minDiscountAmount: 20,
      maxDiscountAmount: 60,
      limit: 25,
      offset: 0
    });
    expect(result.totalCount).toBe(1);
  });

  it('uses different redis cache keys for different query params', async () => {
    redisClient.get.mockResolvedValue(null);
    clickHouseService.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total_count: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total_count: 0 }]);

    await analyticsService.getUsersAnalytics({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortDir: 'desc',
      email: 'alex@example.com'
    });
    await analyticsService.getUsersAnalytics({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortDir: 'desc',
      email: 'maria@example.com'
    });

    const [firstKey] = redisClient.get.mock.calls[0] as [string];
    const [secondKey] = redisClient.get.mock.calls[1] as [string];

    expect(firstKey).not.toBe(secondKey);
    expect(firstKey).toMatch(/^analytics:users:/);
    expect(secondKey).toMatch(/^analytics:users:/);
  });

  it('validates analytics query params and rejects unsupported sort columns', async () => {
    const dto = plainToInstance(UsersAnalyticsQueryDto, {
      sortBy: 'dropTable',
      sortDir: 'desc'
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('validates promocode analytics sort columns and accepts whitelisted values only', async () => {
    const validDto = plainToInstance(PromocodesAnalyticsQueryDto, {
      sortBy: 'conversionRate',
      sortDir: 'asc'
    });
    const invalidDto = plainToInstance(PromocodesAnalyticsQueryDto, {
      sortBy: 'raw_sql',
      sortDir: 'asc'
    });

    const validErrors = await validate(validDto);
    const invalidErrors = await validate(invalidDto);

    expect(validErrors).toHaveLength(0);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('validates promo-usage analytics sort columns and rejects non-whitelisted values', async () => {
    const validDto = plainToInstance(PromoUsagesAnalyticsQueryDto, {
      sortBy: 'usedAt',
      sortDir: 'asc'
    });
    const invalidDto = plainToInstance(PromoUsagesAnalyticsQueryDto, {
      sortBy: 'used_at; DROP TABLE promo_usages',
      sortDir: 'asc'
    });

    const validErrors = await validate(validDto);
    const invalidErrors = await validate(invalidDto);

    expect(validErrors).toHaveLength(0);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('validates new analytics filter fields and accepts whitelisted values only', async () => {
    const validPromocodeDto = plainToInstance(PromocodesAnalyticsQueryDto, {
      state: 'scheduled',
      minUsageCount: 3
    });
    const invalidPromocodeDto = plainToInstance(PromocodesAnalyticsQueryDto, {
      state: 'paused'
    });
    const validPromoUsageDto = plainToInstance(PromoUsagesAnalyticsQueryDto, {
      minDiscountAmount: 10,
      maxDiscountAmount: 50
    });

    const validPromocodeErrors = await validate(validPromocodeDto);
    const invalidPromocodeErrors = await validate(invalidPromocodeDto);
    const validPromoUsageErrors = await validate(validPromoUsageDto);

    expect(validPromocodeErrors).toHaveLength(0);
    expect(invalidPromocodeErrors.length).toBeGreaterThan(0);
    expect(validPromoUsageErrors).toHaveLength(0);
  });
});
