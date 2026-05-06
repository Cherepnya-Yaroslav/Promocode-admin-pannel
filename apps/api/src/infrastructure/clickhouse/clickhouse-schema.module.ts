import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/app-config.module';
import { ClickHouseModule } from './clickhouse.module';
import { ClickHouseSchemaService } from './clickhouse-schema.service';

@Module({
  imports: [AppConfigModule, ClickHouseModule],
  providers: [ClickHouseSchemaService],
  exports: [ClickHouseSchemaService]
})
export class ClickHouseSchemaModule {}
