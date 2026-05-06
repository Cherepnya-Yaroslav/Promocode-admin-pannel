import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

export class OrdersListResponseDto {
  @ApiProperty({
    type: OrderResponseDto,
    isArray: true
  })
  items!: OrderResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalCount!: number;
}
