import { Module } from '@nestjs/common';
import { AnalyticsSyncModule } from '../analytics-sync/analytics-sync.module';
import { RateLimitModule } from '../common/rate-limit/rate-limit.module';
import { MongoModelsModule } from '../database/mongo-models.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { ApplyPromocodeLockService } from './apply-promocode-lock.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [MongoModelsModule, AnalyticsSyncModule, RedisModule, RateLimitModule],
  controllers: [OrdersController],
  providers: [OrdersService, ApplyPromocodeLockService]
})
export class OrdersModule {}
