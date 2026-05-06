import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { userSegments } from '../../database/schemas/user.schema';
import {
  normalizeLowercaseString,
  normalizeTrimmedString,
  normalizeUppercaseString
} from '../../common/utils/value-normalizers';

export class CreateUserDto {
  @ApiProperty({ example: 'alex@example.com' })
  @Transform(({ value }) => normalizeLowercaseString(value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Alex' })
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Morgan' })
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: 'US' })
  @Transform(({ value }) => normalizeUppercaseString(value))
  @IsString()
  @Length(2, 2)
  country!: string;

  @ApiProperty({
    enum: userSegments,
    example: 'growth'
  })
  @Transform(({ value }) => normalizeTrimmedString(value))
  @IsIn(userSegments)
  segment!: (typeof userSegments)[number];

  @ApiPropertyOptional({
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
