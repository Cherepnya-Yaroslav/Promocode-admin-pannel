import { Module } from '@nestjs/common';
import { MongoModelsModule } from '../database/mongo-models.module';
import { ClickHouseSchemaModule } from '../infrastructure/clickhouse/clickhouse-schema.module';
import { ClickHouseModule } from '../infrastructure/clickhouse/clickhouse.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { AnalyticsCacheService } from './analytics-cache.service';
import { AnalyticsSyncService } from './analytics-sync.service';

@Module({
  imports: [
    MongoModelsModule,
    ClickHouseModule,
    ClickHouseSchemaModule,
    RedisModule
  ],
  providers: [AnalyticsSyncService, AnalyticsCacheService],
  exports: [AnalyticsSyncService, AnalyticsCacheService]
})
export class AnalyticsSyncModule {}
