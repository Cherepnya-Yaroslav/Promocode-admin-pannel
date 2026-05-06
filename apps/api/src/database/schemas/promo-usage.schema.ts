import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';
import { discountTypes, type DiscountType } from './promocode.schema';

@Schema({
  collection: 'promo_usages',
  timestamps: true,
  versionKey: false
})
export class PromoUsage {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true,
    index: true
  })
  orderId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'PromoCode',
    required: true,
    index: true
  })
  promocodeId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  promocodeCode!: string;

  @Prop({
    required: true,
    enum: discountTypes
  })
  discountType!: DiscountType;

  @Prop({ required: true, min: 0 })
  discountValueSnapshot!: number;

  @Prop({ required: true, min: 0 })
  orderAmount!: number;

  @Prop({ required: true, min: 0 })
  discountAmount!: number;

  @Prop({ required: true, min: 0 })
  finalAmount!: number;

  @Prop({ required: true, trim: true, uppercase: true })
  currency!: string;

  @Prop({ required: true })
  usedAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PromoUsageDocument = HydratedDocument<PromoUsage>;

export const PromoUsageSchema = SchemaFactory.createForClass(PromoUsage);
