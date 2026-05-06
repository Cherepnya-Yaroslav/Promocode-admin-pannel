import { Module } from '@nestjs/common';
import { AnalyticsSyncModule } from '../analytics-sync/analytics-sync.module';
import { MongoModelsModule } from '../database/mongo-models.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [MongoModelsModule, AnalyticsSyncModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
