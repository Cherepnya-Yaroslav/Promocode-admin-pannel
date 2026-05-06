import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export const userSegments = ['starter', 'growth', 'vip'] as const;
export type UserSegment = (typeof userSegments)[number];

@Schema({
  collection: 'users',
  timestamps: true,
  versionKey: false
})
export class User {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop({ required: true, trim: true, uppercase: true })
  country!: string;

  @Prop({
    required: true,
    enum: userSegments
  })
  segment!: UserSegment;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
