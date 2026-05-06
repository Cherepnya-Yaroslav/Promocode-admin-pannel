import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min
} from 'class-validator';
import {
  normalizeBooleanQuery,
  normalizeTrimmedString,
  normalizeUppercaseString
} from '../../common/utils/value-normalizers';
import { BaseAnalyticsQueryDto } from './base-analytics-query.dto';

const discountTypes = ['PERCENT', 'FIXED'] as const;
const promocodeStates = ['active', 'inactive', 'scheduled', 'expired'] as const;

export const promocodeAnalyticsSortKeys = [
  'createdAt',
  'code',
  'isActive',
  'totalUsageCount',
  'totalDiscountAmount',
  'totalRevenueAffected',
  'conversionRate',
  'dateTo'
] as const;

export class PromocodesAnalyticsQueryDto extends BaseAnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: promocodeAnalyticsSortKeys,
    example: 'createdAt'
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value
  )
  @IsIn(promocodeAnalyticsSortKeys)
  sortBy: (typeof promocodeAnalyticsSortKeys)[number] = 'createdAt';

  @ApiPropertyOptional({ example: 'SPRING25' })
  @IsOptional()
  @Transform(({ value }) => normalizeUppercaseString(value))
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => normalizeBooleanQuery(value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'active',
    enum: promocodeStates
  })
  @IsOptional()
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsIn(promocodeStates)
  state?: (typeof promocodeStates)[number];

  @ApiPropertyOptional({ example: 'PERCENT', enum: discountTypes })
  @IsOptional()
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsIn(discountTypes)
  discountType?: (typeof discountTypes)[number];

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minUsageCount?: number;
}
