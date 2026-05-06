import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { AnalyticsCacheService } from '../analytics-sync/analytics-cache.service';
import { AnalyticsSyncService } from '../analytics-sync/analytics-sync.service';
import { User } from '../database/schemas/user.schema';
import { AuthService } from './auth.service';
import { createUserDocument } from './testing/auth-test-helpers';

describe('AuthService', () => {
  const model = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn()
  };

  const jwtService = {
    sign: jest.fn()
  };

  const analyticsSyncService = {
    syncUser: jest.fn()
  };

  const analyticsCacheService = {
    invalidateUsersAnalytics: jest.fn()
  };

  let authService: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: model
        },
        {
          provide: JwtService,
          useValue: jwtService
        },
        {
          provide: AnalyticsSyncService,
          useValue: analyticsSyncService
        },
        {
          provide: AnalyticsCacheService,
          useValue: analyticsCacheService
        }
      ]
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  it('registers a new user, hashes password, and returns sanitized response', async () => {
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const createdUser = createUserDocument({
      passwordHash: await bcrypt.hash('StrongPass123!', 12)
    });
    model.create.mockResolvedValue(createdUser);
    jwtService.sign.mockReturnValue('signed-token');

    const result = await authService.register({
      email: 'Alex@Example.com',
      password: 'StrongPass123!',
      firstName: 'Alex',
      lastName: 'Morgan'
    });

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alex@example.com',
        passwordHash: expect.any(String),
        country: 'US',
        segment: 'starter'
      })
    );
    expect(analyticsSyncService.syncUser).toHaveBeenCalledWith(
      createdUser._id.toString()
    );
    expect(analyticsCacheService.invalidateUsersAnalytics).toHaveBeenCalled();
    expect(result.accessToken).toBe('signed-token');
    expect(result.user.email).toBe('alex@example.com');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate registration', async () => {
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(createUserDocument())
    });

    await expect(
      authService.register({
        email: 'alex@example.com',
        password: 'StrongPass123!',
        firstName: 'Alex',
        lastName: 'Morgan'
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with valid credentials and returns sanitized response', async () => {
    const passwordHash = await bcrypt.hash('StrongPass123!', 12);
    const existingUser = createUserDocument({ passwordHash });
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingUser)
    });
    jwtService.sign.mockReturnValue('signed-token');

    const result = await authService.login({
      email: 'alex@example.com',
      password: 'StrongPass123!'
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.user.id).toBe(existingUser._id.toString());
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects login with invalid password', async () => {
    const passwordHash = await bcrypt.hash('StrongPass123!', 12);
    const existingUser = createUserDocument({ passwordHash });
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingUser)
    });

    await expect(
      authService.login({
        email: 'alex@example.com',
        password: 'WrongPass123!'
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns current user without password hash', async () => {
    const existingUser = createUserDocument();
    model.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingUser)
    });

    const result = await authService.getCurrentUser(existingUser._id.toString());

    expect(result.id).toBe(existingUser._id.toString());
    expect(result).not.toHaveProperty('passwordHash');
  });
});
