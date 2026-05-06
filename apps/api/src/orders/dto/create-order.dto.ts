import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Length, Min } from 'class-validator';
import { normalizeUppercaseString } from '../../common/utils/value-normalizers';

export class CreateOrderDto {
  @ApiProperty({ example: 240 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: 'USD' })
  @Transform(({ value }) => normalizeUppercaseString(value))
  @IsString()
  @Length(3, 3)
  currency!: string;
}
