import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: Redis
  ) {}

  getClient(): Redis {
    return this.client;
  }

  async getConnectedClient(): Promise<Redis> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }

    return this.client;
  }

  async ping(): Promise<string> {
    const client = await this.getConnectedClient();

    return client.ping();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}
