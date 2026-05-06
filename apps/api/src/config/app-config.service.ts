import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AppEnvironmentConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  swaggerPath: string;
  corsOrigins: string;
  mongoUri: string;
  clickhouseUrl: string;
  clickhouseUser: string;
  clickhousePassword: string;
  clickhouseDatabase: string;
  redisUrl: string;
  jwtSecret: string;
}

@Injectable()
export class AppConfigService {
  constructor(
    private readonly configService: ConfigService<AppEnvironmentConfig, true>
  ) {}

  get nodeEnv(): string {
    return this.configService.get('nodeEnv', { infer: true });
  }

  get port(): number {
    return this.configService.get('port', { infer: true });
  }

  get apiPrefix(): string {
    return this.configService.get('apiPrefix', { infer: true });
  }

  get swaggerPath(): string {
    return this.configService.get('swaggerPath', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.configService
      .get('corsOrigins', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  get mongoUri(): string {
    return this.configService.get('mongoUri', { infer: true });
  }

  get clickhouseUrl(): string {
    return this.configService.get('clickhouseUrl', { infer: true });
  }

  get clickhouseUser(): string {
    return this.configService.get('clickhouseUser', { infer: true });
  }

  get clickhousePassword(): string {
    return this.configService.get('clickhousePassword', { infer: true });
  }

  get clickhouseDatabase(): string {
    return this.configService.get('clickhouseDatabase', { infer: true });
  }

  get redisUrl(): string {
    return this.configService.get('redisUrl', { infer: true });
  }

  get jwtSecret(): string {
    return this.configService.get('jwtSecret', { infer: true });
  }

  get mongoDatabaseName(): string {
    const databaseName = this.mongoUri.match(/\/([^/?]+)(?:\?|$)/)?.[1];

    if (!databaseName) {
      throw new Error('Unable to derive MongoDB database name from MONGO_URI.');
    }

    return databaseName;
  }
}
