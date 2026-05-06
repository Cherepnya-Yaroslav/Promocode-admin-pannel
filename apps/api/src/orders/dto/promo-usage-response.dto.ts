import { ApiProperty } from '@nestjs/swagger';
import { type PromoUsageDocument } from '../../database/schemas/promo-usage.schema';

export class PromoUsageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  promocodeId!: string;

  @ApiProperty()
  promocodeCode!: string;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  usedAt!: string;

  static fromPromoUsageDocument(
    promoUsage: PromoUsageDocument
  ): PromoUsageResponseDto {
    return {
      id: promoUsage._id.toString(),
      userId: promoUsage.userId.toString(),
      orderId: promoUsage.orderId.toString(),
      promocodeId: promoUsage.promocodeId.toString(),
      promocodeCode: promoUsage.promocodeCode,
      discountAmount: promoUsage.discountAmount,
      usedAt: promoUsage.usedAt.toISOString()
    };
  }
}
