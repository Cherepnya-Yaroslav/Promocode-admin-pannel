import { InjectConnection } from '@nestjs/mongoose';
import {
  Injectable,
  Logger,
  ServiceUnavailableException
} from '@nestjs/common';
import type { Connection } from 'mongoose';
import { ClickHouseService } from '../infrastructure/clickhouse/clickhouse.service';
import { RedisService } from '../infrastructure/redis/redis.service';

type DependencyState = 'up' | 'down';

interface DependencyMap {
  mongo: DependencyState;
  clickhouse: DependencyState;
  redis: DependencyState;
}

export interface HealthStatusResponse {
  status: 'ok';
  services: DependencyMap;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectConnection()
    private readonly mongoConnection: Connection,
    private readonly clickHouseService: ClickHouseService,
    private readonly redisService: RedisService
  ) {}

  async getStatus(): Promise<HealthStatusResponse> {
    const [mongo, clickhouse, redis] = await Promise.all([
      this.checkMongo(),
      this.checkClickHouse(),
      this.checkRedis()
    ]);

    const services: DependencyMap = {
      mongo,
      clickhouse,
      redis
    };

    if (Object.values(services).some((serviceStatus) => serviceStatus === 'down')) {
      throw new ServiceUnavailableException({
        message: 'One or more infrastructure dependencies are unavailable.',
        services
      });
    }

    return {
      status: 'ok',
      services,
      timestamp: new Date().toISOString()
    };
  }

  private async checkMongo(): Promise<DependencyState> {
    try {
      const database = this.mongoConnection.db;

      if (!database) {
        return 'down';
      }

      await database.admin().ping();

      return 'up';
    } catch (error) {
      this.logger.error(
        `MongoDB health check failed: ${this.getErrorMessage(error)}`
      );

      return 'down';
    }
  }

  private async checkClickHouse(): Promise<DependencyState> {
    try {
      const isHealthy = await this.clickHouseService.ping();

      return isHealthy ? 'up' : 'down';
    } catch (error) {
      this.logger.error(
        `ClickHouse health check failed: ${this.getErrorMessage(error)}`
      );

      return 'down';
    }
  }

  private async checkRedis(): Promise<DependencyState> {
    try {
      const response = await this.redisService.ping();

      return response === 'PONG' ? 'up' : 'down';
    } catch (error) {
      this.logger.error(
        `Redis health check failed: ${this.getErrorMessage(error)}`
      );

      return 'down';
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
