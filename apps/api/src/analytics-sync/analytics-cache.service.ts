import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../infrastructure/redis/redis.service';

@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async invalidateUsersAnalytics(): Promise<void> {
    await this.deleteByPattern('analytics:users:*');
  }

  async invalidatePromocodesAnalytics(): Promise<void> {
    await this.deleteByPattern('analytics:promocodes:*');
  }

  async invalidatePromoUsagesAnalytics(): Promise<void> {
    await this.deleteByPattern('analytics:promo-usages:*');
  }

  private async deleteByPattern(pattern: string): Promise<void> {
    const client = this.redisService.getClient();

    if (client.status === 'wait') {
      await client.connect();
    }

    let cursor = '0';
    let deletedKeysCount = 0;

    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        '100'
      );

      cursor = nextCursor;

      if (keys.length > 0) {
        deletedKeysCount += await client.del(...keys);
      }
    } while (cursor !== '0');

    this.logger.debug(
      `Invalidated ${deletedKeysCount} analytics cache keys for pattern "${pattern}".`
    );
  }
}
