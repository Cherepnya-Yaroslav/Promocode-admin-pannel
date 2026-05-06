import { ApiProperty } from '@nestjs/swagger';

export class PromoUsageAnalyticsRowDto {
  @ApiProperty()
  promoUsageId!: string;

  @ApiProperty()
  usedAt!: string;

  @ApiProperty()
  promocodeId!: string;

  @ApiProperty()
  promocodeCode!: string;

  @ApiProperty()
  discountType!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  userEmail!: string;

  @ApiProperty()
  userFullName!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  orderAmount!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  finalAmount!: number;

  @ApiProperty()
  currency!: string;
}
