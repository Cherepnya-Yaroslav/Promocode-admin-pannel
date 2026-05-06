import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export const discountTypes = ['PERCENT', 'FIXED'] as const;
export type DiscountType = (typeof discountTypes)[number];

@Schema({
  collection: 'promocodes',
  timestamps: true,
  versionKey: false
})
export class PromoCode {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  })
  code!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({
    required: true,
    enum: discountTypes
  })
  discountType!: DiscountType;

  @Prop({ required: true, min: 0 })
  discountValue!: number;

  @Prop({ required: false, min: 0 })
  maxDiscountAmount?: number;

  @Prop({ required: false, min: 0 })
  minOrderAmount?: number;

  @Prop({ required: false, min: 0 })
  totalUsageLimit?: number;

  @Prop({ required: false, min: 0 })
  perUserUsageLimit?: number;

  @Prop({ required: true })
  dateFrom!: Date;

  @Prop({ required: true })
  dateTo!: Date;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PromoCodeDocument = HydratedDocument<PromoCode>;

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);
