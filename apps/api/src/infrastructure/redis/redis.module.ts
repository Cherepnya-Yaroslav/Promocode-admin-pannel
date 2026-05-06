import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) =>
        new Redis(configService.redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1
        })
    },
    RedisService
  ],
  exports: [REDIS_CLIENT, RedisService]
})
export class RedisModule {}
