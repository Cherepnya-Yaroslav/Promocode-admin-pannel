import { ApiProperty } from '@nestjs/swagger';
import {
  type DiscountType,
  type PromoCodeDocument
} from '../../database/schemas/promocode.schema';

export class PromocodeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ example: 'PERCENT' })
  discountType!: DiscountType;

  @ApiProperty()
  discountValue!: number;

  @ApiProperty({
    nullable: true,
    type: Number
  })
  maxDiscountAmount!: number | null;

  @ApiProperty({
    nullable: true,
    type: Number
  })
  minOrderAmount!: number | null;

  @ApiProperty({
    nullable: true,
    type: Number
  })
  totalUsageLimit!: number | null;

  @ApiProperty({
    nullable: true,
    type: Number
  })
  perUserUsageLimit!: number | null;

  @ApiProperty()
  dateFrom!: string;

  @ApiProperty()
  dateTo!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static fromPromocodeDocument(
    promocode: PromoCodeDocument
  ): PromocodeResponseDto {
    return {
      id: promocode._id.toString(),
      code: promocode.code,
      description: promocode.description,
      discountType: promocode.discountType,
      discountValue: promocode.discountValue,
      maxDiscountAmount: promocode.maxDiscountAmount ?? null,
      minOrderAmount: promocode.minOrderAmount ?? null,
      totalUsageLimit: promocode.totalUsageLimit ?? null,
      perUserUsageLimit: promocode.perUserUsageLimit ?? null,
      dateFrom: promocode.dateFrom.toISOString(),
      dateTo: promocode.dateTo.toISOString(),
      isActive: promocode.isActive,
      createdAt: promocode.createdAt.toISOString(),
      updatedAt: promocode.updatedAt.toISOString()
    };
  }
}
