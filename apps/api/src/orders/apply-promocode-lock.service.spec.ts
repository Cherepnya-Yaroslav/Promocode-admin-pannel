import { Test } from '@nestjs/testing';
import { RedisService } from '../infrastructure/redis/redis.service';
import { ApplyPromocodeLockService } from './apply-promocode-lock.service';

describe('ApplyPromocodeLockService', () => {
  const redisClient = {
    set: jest.fn(),
    eval: jest.fn()
  };

  const redisService = {
    getConnectedClient: jest.fn().mockResolvedValue(redisClient)
  };

  let lockService: ApplyPromocodeLockService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplyPromocodeLockService,
        {
          provide: RedisService,
          useValue: redisService
        }
      ]
    }).compile();

    lockService = moduleRef.get(ApplyPromocodeLockService);
  });

  it('acquires an order-scoped redis lock with NX + PX', async () => {
    redisClient.set.mockResolvedValue('OK');

    const token = await lockService.acquire('order-1');

    expect(redisClient.set).toHaveBeenCalledWith(
      'lock:apply-promocode:order:order-1',
      expect.any(String),
      'PX',
      10000,
      'NX'
    );
    expect(token).toEqual(expect.any(String));
  });

  it('releases the lock only when the token matches', async () => {
    redisClient.eval.mockResolvedValue(1);

    const released = await lockService.release('order-1', 'token-1');

    expect(redisClient.eval).toHaveBeenCalled();
    expect(released).toBe(true);
  });
});
