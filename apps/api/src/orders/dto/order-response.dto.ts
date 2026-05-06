import { ApiProperty } from '@nestjs/swagger';
import {
  type OrderDocument,
  type OrderStatus
} from '../../database/schemas/order.schema';

export class OrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ example: 'CREATED' })
  status!: OrderStatus;

  @ApiProperty({ nullable: true })
  promocodeId!: string | null;

  @ApiProperty({ nullable: true })
  promocodeCode!: string | null;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  finalAmount!: number;

  @ApiProperty({ nullable: true })
  appliedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static fromOrderDocument(order: OrderDocument): OrderResponseDto {
    return {
      id: order._id.toString(),
      userId: order.userId.toString(),
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      promocodeId: order.promocodeId?.toString() ?? null,
      promocodeCode: order.promocodeCode ?? null,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      appliedAt: order.appliedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };
  }
}
