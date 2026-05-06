import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsListResponseDto<TItem> {
  @ApiProperty({ isArray: true })
  items!: TItem[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalCount!: number;
}
