import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ClickHouseService } from '../infrastructure/clickhouse/clickhouse.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { AnalyticsListResponseDto } from './dto/analytics-list-response.dto';
import { PromoUsageAnalyticsRowDto } from './dto/promo-usage-analytics-row.dto';
import { PromoUsagesAnalyticsQueryDto } from './dto/promo-usages-analytics-query.dto';
import { PromocodeAnalyticsRowDto } from './dto/promocode-analytics-row.dto';
import { PromocodesAnalyticsQueryDto } from './dto/promocodes-analytics-query.dto';
import { UserAnalyticsRowDto } from './dto/user-analytics-row.dto';
import { UsersAnalyticsQueryDto } from './dto/users-analytics-query.dto';

interface CountRow {
  total_count: string | number;
}

interface RawUserAnalyticsRow {
  user_id: string;
  email: string;
  full_name: string;
  is_active: number | string;
  country: string;
  segment: string;
  created_at: string;
  total_orders_count: number | string;
  total_orders_amount: number | string;
  total_discount_amount: number | string;
  total_promo_usage_count: number | string;
  last_order_at: string | null;
}

interface RawPromocodeAnalyticsRow {
  promocode_id: string;
  code: string;
  discount_type: string;
  discount_value: number | string;
  is_active: number | string;
  date_from: string;
  date_to: string;
  total_usage_count: number | string;
  total_discount_amount: number | string;
  total_revenue_affected: number | string;
  unique_users_count: number | string;
  conversion_rate: number | string;
  last_used_at: string | null;
}

interface RawPromoUsageAnalyticsRow {
  promo_usage_id: string;
  used_at: string;
  promocode_id: string;
  promocode_code: string;
  discount_type: string;
  user_id: string;
  user_email: string;
  user_full_name: string;
  order_id: string;
  order_amount: number | string;
  discount_amount: number | string;
  final_amount: number | string;
  currency: string;
}

const usersSortColumnMap: Record<
  UsersAnalyticsQueryDto['sortBy'],
  string
> = {
  createdAt: 'created_at',
  email: 'email',
  totalOrdersCount: 'total_orders_count',
  totalOrdersAmount: 'total_orders_amount',
  totalDiscountAmount: 'total_discount_amount',
  totalPromoUsageCount: 'total_promo_usage_count',
  lastOrderAt: 'last_order_at'
};

const promocodesSortColumnMap: Record<
  PromocodesAnalyticsQueryDto['sortBy'],
  string
> = {
  createdAt: 'created_at',
  code: 'code',
  isActive: 'is_active',
  totalUsageCount: 'total_usage_count',
  totalDiscountAmount: 'total_discount_amount',
  totalRevenueAffected: 'total_revenue_affected',
  conversionRate: 'conversion_rate',
  dateTo: 'date_to'
};

const promoUsagesSortColumnMap: Record<
  PromoUsagesAnalyticsQueryDto['sortBy'],
  string
> = {
  usedAt: 'used_at',
  discountAmount: 'discount_amount',
  orderAmount: 'order_amount',
  finalAmount: 'final_amount',
  userEmail: 'user_email',
  promocodeCode: 'promocode_code'
};

@Injectable()
export class AnalyticsService {
  private readonly cacheTtlSeconds = 30;

  constructor(
    private readonly clickHouseService: ClickHouseService,
    private readonly redisService: RedisService
  ) {}

  async getUsersAnalytics(
    queryDto: UsersAnalyticsQueryDto
  ): Promise<AnalyticsListResponseDto<UserAnalyticsRowDto>> {
    const cached = await this.getCachedResponse<UserAnalyticsRowDto>(
      'users',
      queryDto
    );

    if (cached) {
      return cached;
    }

    const where = this.buildUsersWhere(queryDto);
    const sortColumn = usersSortColumnMap[queryDto.sortBy];
    const dataQuery = `
      SELECT
        user_id,
        email,
        full_name,
        is_active,
        country,
        segment,
        created_at,
        total_orders_count,
        total_orders_amount,
        total_discount_amount,
        total_promo_usage_count,
        last_order_at
      FROM users FINAL
      ${where.clause}
      ORDER BY ${sortColumn} ${queryDto.sortDir.toUpperCase()}
      LIMIT {limit: UInt64}
      OFFSET {offset: UInt64}
    `;
    const countQuery = `
      SELECT count() AS total_count
      FROM users FINAL
      ${where.clause}
    `;
    const queryParams = {
      ...where.params,
      limit: queryDto.pageSize,
      offset: (queryDto.page - 1) * queryDto.pageSize
    };

    const [itemsRows, countRows] = await Promise.all([
      this.clickHouseService.query<RawUserAnalyticsRow>(dataQuery, queryParams),
      this.clickHouseService.query<CountRow>(countQuery, where.params)
    ]);

    const response: AnalyticsListResponseDto<UserAnalyticsRowDto> = {
      items: itemsRows.map((row) => this.mapUserRow(row)),
      page: queryDto.page,
      pageSize: queryDto.pageSize,
      totalCount: this.readCount(countRows)
    };

    await this.setCachedResponse('users', queryDto, response);

    return response;
  }

  async getPromocodesAnalytics(
    queryDto: PromocodesAnalyticsQueryDto
  ): Promise<AnalyticsListResponseDto<PromocodeAnalyticsRowDto>> {
    const cached = await this.getCachedResponse<PromocodeAnalyticsRowDto>(
      'promocodes',
      queryDto
    );

    if (cached) {
      return cached;
    }

    const where = this.buildPromocodesWhere(queryDto);
    const sortColumn = promocodesSortColumnMap[queryDto.sortBy];
    const dataQuery = `
      SELECT
        promocode_id,
        code,
        discount_type,
        discount_value,
        is_active,
        date_from,
        date_to,
        total_usage_count,
        total_discount_amount,
        total_revenue_affected,
        unique_users_count,
        if(total_revenue_affected = 0, 0, total_discount_amount / total_revenue_affected) AS conversion_rate,
        last_used_at
      FROM promocodes FINAL
      ${where.clause}
      ORDER BY ${sortColumn} ${queryDto.sortDir.toUpperCase()}
      LIMIT {limit: UInt64}
      OFFSET {offset: UInt64}
    `;
    const countQuery = `
      SELECT count() AS total_count
      FROM promocodes FINAL
      ${where.clause}
    `;
    const queryParams = {
      ...where.params,
      limit: queryDto.pageSize,
      offset: (queryDto.page - 1) * queryDto.pageSize
    };

    const [itemsRows, countRows] = await Promise.all([
      this.clickHouseService.query<RawPromocodeAnalyticsRow>(
        dataQuery,
        queryParams
      ),
      this.clickHouseService.query<CountRow>(countQuery, where.params)
    ]);

    const response: AnalyticsListResponseDto<PromocodeAnalyticsRowDto> = {
      items: itemsRows.map((row) => this.mapPromocodeRow(row)),
      page: queryDto.page,
      pageSize: queryDto.pageSize,
      totalCount: this.readCount(countRows)
    };

    await this.setCachedResponse('promocodes', queryDto, response);

    return response;
  }

  async getPromoUsagesAnalytics(
    queryDto: PromoUsagesAnalyticsQueryDto
  ): Promise<AnalyticsListResponseDto<PromoUsageAnalyticsRowDto>> {
    const cached = await this.getCachedResponse<PromoUsageAnalyticsRowDto>(
      'promo-usages',
      queryDto
    );

    if (cached) {
      return cached;
    }

    const where = this.buildPromoUsagesWhere(queryDto);
    const sortColumn = promoUsagesSortColumnMap[queryDto.sortBy];
    const dataQuery = `
      SELECT
        promo_usage_id,
        used_at,
        promocode_id,
        promocode_code,
        discount_type,
        user_id,
        user_email,
        user_full_name,
        order_id,
        order_amount,
        discount_amount,
        final_amount,
        currency
      FROM promo_usages FINAL
      ${where.clause}
      ORDER BY ${sortColumn} ${queryDto.sortDir.toUpperCase()}
      LIMIT {limit: UInt64}
      OFFSET {offset: UInt64}
    `;
    const countQuery = `
      SELECT count() AS total_count
      FROM promo_usages FINAL
      ${where.clause}
    `;
    const queryParams = {
      ...where.params,
      limit: queryDto.pageSize,
      offset: (queryDto.page - 1) * queryDto.pageSize
    };

    const [itemsRows, countRows] = await Promise.all([
      this.clickHouseService.query<RawPromoUsageAnalyticsRow>(
        dataQuery,
        queryParams
      ),
      this.clickHouseService.query<CountRow>(countQuery, where.params)
    ]);

    const response: AnalyticsListResponseDto<PromoUsageAnalyticsRowDto> = {
      items: itemsRows.map((row) => this.mapPromoUsageRow(row)),
      page: queryDto.page,
      pageSize: queryDto.pageSize,
      totalCount: this.readCount(countRows)
    };

    await this.setCachedResponse('promo-usages', queryDto, response);

    return response;
  }

  private buildUsersWhere(queryDto: UsersAnalyticsQueryDto): {
    clause: string;
    params: Record<string, unknown>;
  } {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (queryDto.dateFrom) {
      conditions.push(
        'created_at >= parseDateTime64BestEffort({dateFrom: String})'
      );
      params.dateFrom = queryDto.dateFrom;
    }

    if (queryDto.dateTo) {
      conditions.push(
        'created_at <= parseDateTime64BestEffort({dateTo: String})'
      );
      params.dateTo = queryDto.dateTo;
    }

    if (queryDto.email) {
      conditions.push('positionCaseInsensitiveUTF8(email, {email: String}) > 0');
      params.email = queryDto.email;
    }

    if (queryDto.isActive !== undefined) {
      conditions.push('is_active = {isActive: UInt8}');
      params.isActive = queryDto.isActive ? 1 : 0;
    }

    if (queryDto.country) {
      conditions.push('country = {country: String}');
      params.country = queryDto.country;
    }

    if (queryDto.segment) {
      conditions.push('segment = {segment: String}');
      params.segment = queryDto.segment;
    }

    return this.buildWhereClause(conditions, params);
  }

  private buildPromocodesWhere(queryDto: PromocodesAnalyticsQueryDto): {
    clause: string;
    params: Record<string, unknown>;
  } {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (queryDto.dateFrom) {
      conditions.push(
        'created_at >= parseDateTime64BestEffort({dateFrom: String})'
      );
      params.dateFrom = queryDto.dateFrom;
    }

    if (queryDto.dateTo) {
      conditions.push(
        'created_at <= parseDateTime64BestEffort({dateTo: String})'
      );
      params.dateTo = queryDto.dateTo;
    }

    if (queryDto.code) {
      conditions.push('positionCaseInsensitiveUTF8(code, {code: String}) > 0');
      params.code = queryDto.code;
    }

    if (queryDto.isActive !== undefined) {
      conditions.push('is_active = {isActive: UInt8}');
      params.isActive = queryDto.isActive ? 1 : 0;
    }

    if (queryDto.state === 'active') {
      conditions.push('is_active = 1');
      conditions.push('date_from <= now64(3)');
      conditions.push('date_to >= now64(3)');
    }

    if (queryDto.state === 'inactive') {
      conditions.push('is_active = 0');
    }

    if (queryDto.state === 'scheduled') {
      conditions.push('is_active = 1');
      conditions.push('date_from > now64(3)');
    }

    if (queryDto.state === 'expired') {
      conditions.push('date_to < now64(3)');
    }

    if (queryDto.discountType) {
      conditions.push('discount_type = {discountType: String}');
      params.discountType = queryDto.discountType;
    }

    if (queryDto.minUsageCount !== undefined) {
      conditions.push('total_usage_count >= {minUsageCount: UInt64}');
      params.minUsageCount = queryDto.minUsageCount;
    }

    return this.buildWhereClause(conditions, params);
  }

  private buildPromoUsagesWhere(queryDto: PromoUsagesAnalyticsQueryDto): {
    clause: string;
    params: Record<string, unknown>;
  } {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (queryDto.dateFrom) {
      conditions.push(
        'used_at >= parseDateTime64BestEffort({dateFrom: String})'
      );
      params.dateFrom = queryDto.dateFrom;
    }

    if (queryDto.dateTo) {
      conditions.push(
        'used_at <= parseDateTime64BestEffort({dateTo: String})'
      );
      params.dateTo = queryDto.dateTo;
    }

    if (queryDto.promocodeCode) {
      conditions.push(
        'positionCaseInsensitiveUTF8(promocode_code, {promocodeCode: String}) > 0'
      );
      params.promocodeCode = queryDto.promocodeCode;
    }

    if (queryDto.userEmail) {
      conditions.push(
        'positionCaseInsensitiveUTF8(user_email, {userEmail: String}) > 0'
      );
      params.userEmail = queryDto.userEmail;
    }

    if (queryDto.currency) {
      conditions.push('currency = {currency: String}');
      params.currency = queryDto.currency;
    }

    if (queryDto.discountType) {
      conditions.push('discount_type = {discountType: String}');
      params.discountType = queryDto.discountType;
    }

    if (queryDto.minDiscountAmount !== undefined) {
      conditions.push('discount_amount >= {minDiscountAmount: Float64}');
      params.minDiscountAmount = queryDto.minDiscountAmount;
    }

    if (queryDto.maxDiscountAmount !== undefined) {
      conditions.push('discount_amount <= {maxDiscountAmount: Float64}');
      params.maxDiscountAmount = queryDto.maxDiscountAmount;
    }

    return this.buildWhereClause(conditions, params);
  }

  private buildWhereClause(
    conditions: string[],
    params: Record<string, unknown>
  ): {
    clause: string;
    params: Record<string, unknown>;
  } {
    if (conditions.length === 0) {
      return {
        clause: '',
        params
      };
    }

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      params
    };
  }

  private mapUserRow(row: RawUserAnalyticsRow): UserAnalyticsRowDto {
    return {
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      isActive: this.toBoolean(row.is_active),
      country: row.country,
      segment: row.segment,
      createdAt: this.toIsoString(row.created_at),
      totalOrdersCount: this.toNumber(row.total_orders_count),
      totalOrdersAmount: this.toNumber(row.total_orders_amount),
      totalDiscountAmount: this.toNumber(row.total_discount_amount),
      totalPromoUsageCount: this.toNumber(row.total_promo_usage_count),
      lastOrderAt: row.last_order_at ? this.toIsoString(row.last_order_at) : null
    };
  }

  private mapPromocodeRow(
    row: RawPromocodeAnalyticsRow
  ): PromocodeAnalyticsRowDto {
    return {
      promocodeId: row.promocode_id,
      code: row.code,
      discountType: row.discount_type,
      discountValue: this.toNumber(row.discount_value),
      isActive: this.toBoolean(row.is_active),
      dateFrom: this.toIsoString(row.date_from),
      dateTo: this.toIsoString(row.date_to),
      totalUsageCount: this.toNumber(row.total_usage_count),
      totalDiscountAmount: this.toNumber(row.total_discount_amount),
      totalRevenueAffected: this.toNumber(row.total_revenue_affected),
      uniqueUsersCount: this.toNumber(row.unique_users_count),
      conversionRate: this.toNumber(row.conversion_rate),
      lastUsedAt: row.last_used_at ? this.toIsoString(row.last_used_at) : null
    };
  }

  private mapPromoUsageRow(
    row: RawPromoUsageAnalyticsRow
  ): PromoUsageAnalyticsRowDto {
    return {
      promoUsageId: row.promo_usage_id,
      usedAt: this.toIsoString(row.used_at),
      promocodeId: row.promocode_id,
      promocodeCode: row.promocode_code,
      discountType: row.discount_type,
      userId: row.user_id,
      userEmail: row.user_email,
      userFullName: row.user_full_name,
      orderId: row.order_id,
      orderAmount: this.toNumber(row.order_amount),
      discountAmount: this.toNumber(row.discount_amount),
      finalAmount: this.toNumber(row.final_amount),
      currency: row.currency
    };
  }

  private async getCachedResponse<TItem>(
    resource: string,
    queryDto:
      | UsersAnalyticsQueryDto
      | PromocodesAnalyticsQueryDto
      | PromoUsagesAnalyticsQueryDto
  ): Promise<AnalyticsListResponseDto<TItem> | null> {
    const client = await this.redisService.getConnectedClient();
    const cachedValue = await client.get(this.buildCacheKey(resource, queryDto));

    if (!cachedValue) {
      return null;
    }

    return JSON.parse(cachedValue) as AnalyticsListResponseDto<TItem>;
  }

  private async setCachedResponse<TItem>(
    resource: string,
    queryDto:
      | UsersAnalyticsQueryDto
      | PromocodesAnalyticsQueryDto
      | PromoUsagesAnalyticsQueryDto,
    response: AnalyticsListResponseDto<TItem>
  ): Promise<void> {
    const client = await this.redisService.getConnectedClient();

    await client.set(
      this.buildCacheKey(resource, queryDto),
      JSON.stringify(response),
      'EX',
      this.cacheTtlSeconds
    );
  }

  private buildCacheKey(
    resource: string,
    queryDto:
      | UsersAnalyticsQueryDto
      | PromocodesAnalyticsQueryDto
      | PromoUsagesAnalyticsQueryDto
  ): string {
    const normalizedQuery = Object.entries(queryDto)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .reduce<Record<string, unknown>>((accumulator, [key, value]) => {
        accumulator[key] = value;
        return accumulator;
      }, {});
    const hash = createHash('sha256')
      .update(JSON.stringify({ resource, query: normalizedQuery }))
      .digest('hex');

    return `analytics:${resource}:${hash}`;
  }

  private readCount(rows: CountRow[]): number {
    const countValue = rows[0]?.total_count ?? 0;

    return this.toNumber(countValue);
  }

  private toNumber(value: string | number): number {
    return typeof value === 'number' ? value : Number(value);
  }

  private toBoolean(value: string | number): boolean {
    return this.toNumber(value) === 1;
  }

  private toIsoString(value: string): string {
    return `${value.replace(' ', 'T')}Z`;
  }
}
