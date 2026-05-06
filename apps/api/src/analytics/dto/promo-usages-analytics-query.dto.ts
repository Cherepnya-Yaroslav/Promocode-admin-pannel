import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min
} from 'class-validator';
import {
  normalizeLowercaseString,
  normalizeTrimmedString,
  normalizeUppercaseString
} from '../../common/utils/value-normalizers';
import { BaseAnalyticsQueryDto } from './base-analytics-query.dto';

const discountTypes = ['PERCENT', 'FIXED'] as const;

export const promoUsageAnalyticsSortKeys = [
  'usedAt',
  'discountAmount',
  'orderAmount',
  'finalAmount',
  'userEmail',
  'promocodeCode'
] as const;

export class PromoUsagesAnalyticsQueryDto extends BaseAnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: promoUsageAnalyticsSortKeys,
    example: 'usedAt'
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value
  )
  @IsIn(promoUsageAnalyticsSortKeys)
  sortBy: (typeof promoUsageAnalyticsSortKeys)[number] = 'usedAt';

  @ApiPropertyOptional({ example: 'SPRING25' })
  @IsOptional()
  @Transform(({ value }) => normalizeUppercaseString(value))
  @IsString()
  promocodeCode?: string;

  @ApiPropertyOptional({ example: 'alex@example.com' })
  @IsOptional()
  @Transform(({ value }) => normalizeLowercaseString(value))
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @Transform(({ value }) => normalizeUppercaseString(value))
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 'PERCENT', enum: discountTypes })
  @IsOptional()
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsIn(discountTypes)
  discountType?: (typeof discountTypes)[number];

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minDiscountAmount?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDiscountAmount?: number;
}
