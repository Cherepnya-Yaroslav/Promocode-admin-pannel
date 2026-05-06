import {
  CanActivate,
  ExecutionContext,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_METADATA_KEY } from './rate-limit.decorator';
import { RateLimitExceededException } from './rate-limit.exception';
import { RateLimitService } from './rate-limit.service';
import type { RateLimitOptions } from './rate-limit.types';

interface RequestLike {
  ip?: string;
  body?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
  user?: {
    id?: string;
    sub?: string;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_METADATA_KEY,
      context.getHandler()
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestLike>();
    const key = this.buildKey(request, options);
    const decision = await this.rateLimitService.consume(
      key,
      options.limit,
      options.ttlSeconds
    );

    if (!decision.allowed) {
      throw new RateLimitExceededException(
        `${options.message} Retry after ${decision.retryAfterSeconds} seconds.`
      );
    }

    return true;
  }

  private buildKey(request: RequestLike, options: RateLimitOptions): string {
    const ipAddress = this.normalizeIpAddress(request.ip);

    switch (options.subject) {
      case 'ip':
        return `${options.keyPrefix}:${ipAddress}`;
      case 'login-email-and-ip': {
        const emailValue =
          typeof request.body?.email === 'string'
            ? request.body.email.trim().toLowerCase()
            : 'anonymous';

        return `${options.keyPrefix}:${ipAddress}:${emailValue}`;
      }
      case 'authenticated-user-and-order': {
        const userId = request.user?.id ?? request.user?.sub ?? 'anonymous';
        const orderId = request.params?.id ?? 'unknown-order';

        return `${options.keyPrefix}:${userId}:${orderId}`;
      }
    }
  }

  private normalizeIpAddress(value: string | undefined): string {
    if (!value) {
      return 'unknown-ip';
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)[0] ?? 'unknown-ip';
  }
}
