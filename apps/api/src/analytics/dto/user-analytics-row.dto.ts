import { ApiProperty } from '@nestjs/swagger';

export class UserAnalyticsRowDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  country!: string;

  @ApiProperty()
  segment!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  totalOrdersCount!: number;

  @ApiProperty()
  totalOrdersAmount!: number;

  @ApiProperty()
  totalDiscountAmount!: number;

  @ApiProperty()
  totalPromoUsageCount!: number;

  @ApiProperty({ nullable: true })
  lastOrderAt!: string | null;
}
