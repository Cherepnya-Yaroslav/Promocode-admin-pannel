import { Module } from '@nestjs/common';
import { ClickHouseModule } from '../infrastructure/clickhouse/clickhouse.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [ClickHouseModule, RedisModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService]
})
export class AnalyticsModule {}
