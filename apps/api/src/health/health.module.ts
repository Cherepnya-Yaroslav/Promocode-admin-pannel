import { Module } from '@nestjs/common';
import { ClickHouseModule } from '../infrastructure/clickhouse/clickhouse.module';
import { MongoModule } from '../infrastructure/mongo/mongo.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [MongoModule, ClickHouseModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthService]
})
export class HealthModule {}
