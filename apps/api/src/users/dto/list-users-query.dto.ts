import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';
import {
  normalizeBooleanQuery,
  normalizeTrimmedString
} from '../../common/utils/value-normalizers';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({ example: 'alex' })
  @IsOptional()
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => normalizeBooleanQuery(value))
  @IsBoolean()
  isActive?: boolean;
}
