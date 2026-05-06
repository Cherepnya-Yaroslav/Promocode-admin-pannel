import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import {
  normalizeBooleanQuery,
  normalizeLowercaseString,
  normalizeTrimmedString,
  normalizeUppercaseString
} from '../../common/utils/value-normalizers';
import { BaseAnalyticsQueryDto } from './base-analytics-query.dto';

export const userAnalyticsSortKeys = [
  'createdAt',
  'email',
  'totalOrdersCount',
  'totalOrdersAmount',
  'totalDiscountAmount',
  'totalPromoUsageCount',
  'lastOrderAt'
] as const;

export class UsersAnalyticsQueryDto extends BaseAnalyticsQueryDto {
  @ApiPropertyOptional({ enum: userAnalyticsSortKeys, example: 'createdAt' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value
  )
  @IsIn(userAnalyticsSortKeys)
  sortBy: (typeof userAnalyticsSortKeys)[number] = 'createdAt';

  @ApiPropertyOptional({ example: 'alex@example.com' })
  @IsOptional()
  @Transform(({ value }) => normalizeLowercaseString(value))
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => normalizeBooleanQuery(value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @Transform(({ value }) => normalizeUppercaseString(value))
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ example: 'vip' })
  @IsOptional()
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsString()
  segment?: string;
}
