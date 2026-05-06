import { Reflector } from '@nestjs/core';
import { RateLimitExceededException } from './rate-limit.exception';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import type { RateLimitOptions } from './rate-limit.types';

describe('RateLimitGuard', () => {
  const reflector = {
    get: jest.fn()
  };

  const rateLimitService = {
    consume: jest.fn()
  };

  const guard = new RateLimitGuard(
    reflector as unknown as Reflector,
    rateLimitService as unknown as RateLimitService
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('builds a login key from ip and email and allows the request', async () => {
    const options: RateLimitOptions = {
      keyPrefix: 'rate-limit:auth:login',
      limit: 5,
      ttlSeconds: 60,
      subject: 'login-email-and-ip',
      message: 'Too many login attempts.'
    };
    reflector.get.mockReturnValue(options);
    rateLimitService.consume.mockResolvedValue({
      allowed: true,
      currentCount: 1,
      remaining: 4,
      retryAfterSeconds: 60
    });

    const context = {
      getHandler: () => 'handler',
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          body: {
            email: 'ALEX@EXAMPLE.COM'
          }
        })
      })
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(rateLimitService.consume).toHaveBeenCalledWith(
      'rate-limit:auth:login:127.0.0.1:alex@example.com',
      5,
      60
    );
  });

  it('rejects apply-promocode requests when the Redis rate limit is exhausted', async () => {
    const options: RateLimitOptions = {
      keyPrefix: 'rate-limit:orders:apply-promocode',
      limit: 6,
      ttlSeconds: 60,
      subject: 'authenticated-user-and-order',
      message: 'Too many promocode apply attempts for this order.'
    };
    reflector.get.mockReturnValue(options);
    rateLimitService.consume.mockResolvedValue({
      allowed: false,
      currentCount: 7,
      remaining: 0,
      retryAfterSeconds: 22
    });

    const context = {
      getHandler: () => 'handler',
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'user-1'
          },
          params: {
            id: 'order-1'
          }
        })
      })
    };

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      new RateLimitExceededException(
        'Too many promocode apply attempts for this order. Retry after 22 seconds.'
      )
    );
    expect(rateLimitService.consume).toHaveBeenCalledWith(
      'rate-limit:orders:apply-promocode:user-1:order-1',
      6,
      60
    );
  });
});
