import { Test } from '@nestjs/testing';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  const redisClient = {
    incr: jest.fn(),
    pttl: jest.fn(),
    pexpire: jest.fn()
  };

  const redisService = {
    getConnectedClient: jest.fn().mockResolvedValue(redisClient)
  };

  let rateLimitService: RateLimitService;

  beforeEach(async () => {
    jest.resetAllMocks();
    redisService.getConnectedClient.mockResolvedValue(redisClient);

    const moduleRef = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: RedisService,
          useValue: redisService
        }
      ]
    }).compile();

    rateLimitService = moduleRef.get(RateLimitService);
  });

  it('allows requests under the limit and sets a ttl on first consumption', async () => {
    redisClient.incr.mockResolvedValue(1);
    redisClient.pttl.mockResolvedValue(-1);
    redisClient.pexpire.mockResolvedValue(1);

    const result = await rateLimitService.consume('rate:key', 5, 60);

    expect(redisClient.pexpire).toHaveBeenCalledWith('rate:key', 60_000);
    expect(result).toEqual({
      allowed: true,
      currentCount: 1,
      remaining: 4,
      retryAfterSeconds: 60
    });
  });

  it('rejects requests over the limit and preserves the active ttl window', async () => {
    redisClient.incr.mockResolvedValue(7);
    redisClient.pttl.mockResolvedValue(12_000);

    const result = await rateLimitService.consume('rate:key', 6, 60);

    expect(redisClient.pexpire).not.toHaveBeenCalled();
    expect(result).toEqual({
      allowed: false,
      currentCount: 7,
      remaining: 0,
      retryAfterSeconds: 12
    });
  });
});
