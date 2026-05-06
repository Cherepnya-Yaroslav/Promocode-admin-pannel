import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsCacheService } from '../analytics-sync/analytics-cache.service';
import { AnalyticsSyncService } from '../analytics-sync/analytics-sync.service';
import { User } from '../database/schemas/user.schema';
import { createUserDocument } from '../auth/testing/auth-test-helpers';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const userModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn()
  };

  const analyticsSyncService = {
    syncUser: jest.fn()
  };

  const analyticsCacheService = {
    invalidateUsersAnalytics: jest.fn()
  };

  let usersService: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModel
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

    usersService = moduleRef.get(UsersService);
  });

  it('creates a user, hashes the password, syncs analytics, and returns a sanitized response', async () => {
    userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const createdUser = createUserDocument();
    userModel.create.mockResolvedValue(createdUser);

    const result = await usersService.createUser({
      email: 'Alex@Example.com',
      password: 'StrongPass123!',
      firstName: 'Alex',
      lastName: 'Morgan',
      country: 'us',
      segment: 'growth',
      isActive: true
    });

    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alex@example.com',
        passwordHash: expect.any(String),
        country: 'US',
        segment: 'growth'
      })
    );
    expect(analyticsSyncService.syncUser).toHaveBeenCalledWith(
      createdUser._id.toString()
    );
    expect(analyticsCacheService.invalidateUsersAnalytics).toHaveBeenCalled();
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate user email creation', async () => {
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(createUserDocument())
    });

    await expect(
      usersService.createUser({
        email: 'alex@example.com',
        password: 'StrongPass123!',
        firstName: 'Alex',
        lastName: 'Morgan',
        country: 'US',
        segment: 'starter'
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a user and reprojects analytics', async () => {
    const existingUser = createUserDocument();
    existingUser.save = jest.fn().mockResolvedValue(existingUser);
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingUser)
    });

    const result = await usersService.updateUser(existingUser._id.toString(), {
      firstName: 'Ava',
      country: 'de',
      segment: 'vip',
      isActive: false
    });

    expect(existingUser.firstName).toBe('Ava');
    expect(existingUser.country).toBe('DE');
    expect(existingUser.segment).toBe('vip');
    expect(existingUser.isActive).toBe(false);
    expect(existingUser.save).toHaveBeenCalled();
    expect(analyticsSyncService.syncUser).toHaveBeenCalledWith(
      existingUser._id.toString()
    );
    expect(analyticsCacheService.invalidateUsersAnalytics).toHaveBeenCalled();
    expect(result.isActive).toBe(false);
  });

  it('deactivates a user and reprojects analytics', async () => {
    const existingUser = createUserDocument();
    existingUser.save = jest.fn().mockResolvedValue(existingUser);
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingUser)
    });

    const result = await usersService.deactivateUser(
      existingUser._id.toString()
    );

    expect(existingUser.isActive).toBe(false);
    expect(existingUser.save).toHaveBeenCalled();
    expect(analyticsSyncService.syncUser).toHaveBeenCalledWith(
      existingUser._id.toString()
    );
    expect(analyticsCacheService.invalidateUsersAnalytics).toHaveBeenCalled();
    expect(result.isActive).toBe(false);
  });
});
