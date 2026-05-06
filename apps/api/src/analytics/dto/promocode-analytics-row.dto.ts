import { ApiProperty } from '@nestjs/swagger';

export class PromocodeAnalyticsRowDto {
  @ApiProperty()
  promocodeId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  discountType!: string;

  @ApiProperty()
  discountValue!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  dateFrom!: string;

  @ApiProperty()
  dateTo!: string;

  @ApiProperty()
  totalUsageCount!: number;

  @ApiProperty()
  totalDiscountAmount!: number;

  @ApiProperty()
  totalRevenueAffected!: number;

  @ApiProperty()
  uniqueUsersCount!: number;

  @ApiProperty()
  conversionRate!: number;

  @ApiProperty({ nullable: true })
  lastUsedAt!: string | null;
}
