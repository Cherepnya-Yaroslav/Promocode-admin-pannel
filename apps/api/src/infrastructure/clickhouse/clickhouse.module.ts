import { Module } from '@nestjs/common';
import { createClient } from '@clickhouse/client';
import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';
import { CLICKHOUSE_CLIENT } from './clickhouse.constants';
import { ClickHouseService } from './clickhouse.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: CLICKHOUSE_CLIENT,
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) =>
        createClient({
          url: configService.clickhouseUrl,
          username: configService.clickhouseUser,
          password: configService.clickhousePassword,
          database: configService.clickhouseDatabase
        })
    },
    ClickHouseService
  ],
  exports: [CLICKHOUSE_CLIENT, ClickHouseService]
})
export class ClickHouseModule {}
