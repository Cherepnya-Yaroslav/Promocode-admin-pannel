import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from '../auth/dto/register.dto';
import { BaseAnalyticsQueryDto } from '../analytics/dto/base-analytics-query.dto';
import { PromocodesAnalyticsQueryDto } from '../analytics/dto/promocodes-analytics-query.dto';
import { ApplyPromocodeDto } from '../orders/dto/apply-promocode.dto';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { CreatePromocodeDto } from '../promocodes/dto/create-promocode.dto';
import { ListPromocodesQueryDto } from '../promocodes/dto/list-promocodes-query.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

describe('DTO validation rules', () => {
  it('rejects invalid auth register fields', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'bad',
      password: '123',
      firstName: '',
      lastName: ''
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects blank names in create user dto after trimming', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'alex@example.com',
      password: 'StrongPass123!',
      firstName: '   ',
      lastName: ' ',
      country: 'US',
      segment: 'starter'
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid order amounts', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      amount: 0,
      currency: 'USD'
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid promocode DTO limits', async () => {
    const dto = plainToInstance(CreatePromocodeDto, {
      code: 'SPRING25',
      description: 'Spring campaign',
      discountType: 'PERCENT',
      discountValue: 25,
      totalUsageLimit: 0,
      perUserUsageLimit: 0,
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.999Z'
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects blank apply-promocode codes', async () => {
    const dto = plainToInstance(ApplyPromocodeDto, {
      code: '   '
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid analytics sort directions', async () => {
    const dto = plainToInstance(BaseAnalyticsQueryDto, {
      sortDir: 'sideways'
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('parses false boolean query params for command lists correctly', async () => {
    const dto = plainToInstance(
      ListPromocodesQueryDto,
      { isActive: 'false' },
      { enableImplicitConversion: true }
    );

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(false);
  });

  it('parses false boolean query params for analytics lists correctly', async () => {
    const dto = plainToInstance(
      PromocodesAnalyticsQueryDto,
      { isActive: 'false' },
      { enableImplicitConversion: true }
    );

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(false);
  });
});
