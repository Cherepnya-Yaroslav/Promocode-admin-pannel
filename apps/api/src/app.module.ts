import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { AnalyticsSyncModule } from './analytics-sync/analytics-sync.module';
import { AppConfigModule } from './config/app-config.module';
import { MongoModelsModule } from './database/mongo-models.module';
import { HealthModule } from './health/health.module';
import { ClickHouseModule } from './infrastructure/clickhouse/clickhouse.module';
import { ClickHouseSchemaModule } from './infrastructure/clickhouse/clickhouse-schema.module';
import { MongoModule } from './infrastructure/mongo/mongo.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { OrdersModule } from './orders/orders.module';
import { PromocodesModule } from './promocodes/promocodes.module';
import { SeedModule } from './seed/seed.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AppConfigModule,
    MongoModule,
    MongoModelsModule,
    ClickHouseModule,
    ClickHouseSchemaModule,
    RedisModule,
    AnalyticsSyncModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    PromocodesModule,
    OrdersModule,
    HealthModule,
    SeedModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
