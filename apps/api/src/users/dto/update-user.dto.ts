import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MinLength
} from 'class-validator';
import { userSegments } from '../../database/schemas/user.schema';
import {
  normalizeTrimmedString,
  normalizeUppercaseString
} from '../../common/utils/value-normalizers';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Alex' })
  @IsOptional()
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Morgan' })
  @IsOptional()
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional({ example: 'DE' })
  @IsOptional()
  @Transform(({ value }) => normalizeUppercaseString(value))
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({
    enum: userSegments,
    example: 'vip'
  })
  @IsOptional()
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsIn(userSegments)
  segment?: (typeof userSegments)[number];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
