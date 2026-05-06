import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';
import { PromoUsageResponseDto } from './promo-usage-response.dto';

export class ApplyPromocodeResponseDto {
  @ApiProperty({ type: OrderResponseDto })
  order!: OrderResponseDto;

  @ApiProperty({ type: PromoUsageResponseDto })
  promoUsage!: PromoUsageResponseDto;
}
