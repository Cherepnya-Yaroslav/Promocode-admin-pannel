import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  Min
} from 'class-validator';
import { discountTypes } from '../../database/schemas/promocode.schema';
import {
  normalizeTrimmedString,
  normalizeUppercaseString
} from '../../common/utils/value-normalizers';

export class CreatePromocodeDto {
  @ApiProperty({ example: 'SPRING25' })
  @Transform(({ value }) => normalizeUppercaseString(value))
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty({ example: '25 percent seasonal campaign' })
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({
    enum: discountTypes,
    example: 'PERCENT'
  })
  @IsIn(discountTypes)
  discountType!: (typeof discountTypes)[number];

  @ApiProperty({ example: 25 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue!: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalUsageLimit?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserUsageLimit?: number;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-05-31T23:59:59.999Z' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
