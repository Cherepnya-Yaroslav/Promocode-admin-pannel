import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import {
  PromoCode,
  PromoCodeSchema
} from './schemas/promocode.schema';
import {
  PromoUsage,
  PromoUsageSchema
} from './schemas/promo-usage.schema';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PromoCode.name, schema: PromoCodeSchema },
      { name: Order.name, schema: OrderSchema },
      { name: PromoUsage.name, schema: PromoUsageSchema }
    ])
  ],
  exports: [MongooseModule]
})
export class MongoModelsModule {}
