import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../infrastructure/redis/redis.service';

@Injectable()
export class ApplyPromocodeLockService {
  private readonly lockTtlMs = 10_000;

  constructor(private readonly redisService: RedisService) {}

  async acquire(orderId: string): Promise<string | null> {
    const token = randomUUID();
    const client = await this.redisService.getConnectedClient();
    const lockKey = this.getLockKey(orderId);
    const result = await client.set(
      lockKey,
      token,
      'PX',
      this.lockTtlMs,
      'NX'
    );

    return result === 'OK' ? token : null;
  }

  async release(orderId: string, token: string): Promise<boolean> {
    const client = await this.redisService.getConnectedClient();
    const result = await client.eval(
      `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        end

        return 0
      `,
      1,
      this.getLockKey(orderId),
      token
    );

    return result === 1;
  }

  private getLockKey(orderId: string): string {
    return `lock:apply-promocode:order:${orderId}`;
  }
}
