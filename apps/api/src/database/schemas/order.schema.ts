import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const orderStatuses = ['CREATED', 'PROMOCODE_APPLIED'] as const;
export type OrderStatus = (typeof orderStatuses)[number];

@Schema({
  collection: 'orders',
  timestamps: true,
  versionKey: false
})
export class Order {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, trim: true, uppercase: true })
  currency!: string;

  @Prop({
    required: true,
    enum: orderStatuses,
    default: 'CREATED'
  })
  status!: OrderStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'PromoCode',
    required: false
  })
  promocodeId?: Types.ObjectId;

  @Prop({ required: false, trim: true, uppercase: true })
  promocodeCode?: string;

  @Prop({ required: true, min: 0, default: 0 })
  discountAmount!: number;

  @Prop({ required: true, min: 0 })
  finalAmount!: number;

  @Prop({ required: false })
  appliedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type OrderDocument = HydratedDocument<Order>;

export const OrderSchema = SchemaFactory.createForClass(Order);
