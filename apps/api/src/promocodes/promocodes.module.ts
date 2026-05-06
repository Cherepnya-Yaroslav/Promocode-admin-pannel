import { Module } from '@nestjs/common';
import { AnalyticsSyncModule } from '../analytics-sync/analytics-sync.module';
import { MongoModelsModule } from '../database/mongo-models.module';
import { PromocodesController } from './promocodes.controller';
import { PromocodesService } from './promocodes.service';

@Module({
  imports: [MongoModelsModule, AnalyticsSyncModule],
  controllers: [PromocodesController],
  providers: [PromocodesService],
  exports: [PromocodesService]
})
export class PromocodesModule {}
