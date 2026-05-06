import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { normalizeUppercaseString } from '../../common/utils/value-normalizers';

export class ApplyPromocodeDto {
  @ApiProperty({ example: 'SPRING25' })
  @Transform(({ value }) => normalizeUppercaseString(value))
  @IsString()
  @MinLength(1)
  code!: string;
}
