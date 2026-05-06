import { Module } from '@nestjs/common';
import { MongoModelsModule } from '../database/mongo-models.module';
import { ClickHouseSchemaModule } from '../infrastructure/clickhouse/clickhouse-schema.module';
import { ClickHouseModule } from '../infrastructure/clickhouse/clickhouse.module';
import { SeedService } from './seed.service';

@Module({
  imports: [MongoModelsModule, ClickHouseModule, ClickHouseSchemaModule],
  providers: [SeedService],
  exports: [SeedService]
})
export class SeedModule {}
