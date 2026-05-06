import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import type { RateLimitDecision } from './rate-limit.types';

@Injectable()
export class RateLimitService {
  constructor(private readonly redisService: RedisService) {}

  async consume(
    key: string,
    limit: number,
    ttlSeconds: number
  ): Promise<RateLimitDecision> {
    const client = await this.redisService.getConnectedClient();
    const ttlMilliseconds = ttlSeconds * 1000;
    const currentCount = await client.incr(key);
    let currentTtlMilliseconds = await client.pttl(key);

    if (currentTtlMilliseconds < 0) {
      await client.pexpire(key, ttlMilliseconds);
      currentTtlMilliseconds = ttlMilliseconds;
    }

    return {
      allowed: currentCount <= limit,
      currentCount,
      remaining: Math.max(limit - currentCount, 0),
      retryAfterSeconds: Math.max(
        Math.ceil(currentTtlMilliseconds / 1000),
        1
      )
    };
  }
}
