import { ApiProperty } from '@nestjs/swagger';
import { PromocodeResponseDto } from './promocode-response.dto';

export class PromocodesListResponseDto {
  @ApiProperty({
    type: PromocodeResponseDto,
    isArray: true
  })
  items!: PromocodeResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalCount!: number;
}
