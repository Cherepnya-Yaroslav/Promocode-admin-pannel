import { ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { AppConfigService } from '../config/app-config.service';
import { User } from '../database/schemas/user.schema';
import { createTestUser } from '../test-utils/factories';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('AuthController (e2e-ish)', () => {
  const jwtSecret = 'test-jwt-secret';
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    getCurrentUser: jest.fn()
  };
  const userModel = {
    findById: jest.fn()
  };

  let app: INestApplication;
  let jwtService: JwtService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuthController],
      providers: [
        JwtAuthGuard,
        JwtStrategy,
        {
          provide: AuthService,
          useValue: authService
        },
        {
          provide: AppConfigService,
          useValue: {
            jwtSecret
          }
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true
        }
      })
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    jwtService = new JwtService({ secret: jwtSecret });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects invalid register payloads through DTO validation', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        password: '123',
        firstName: '',
        lastName: ''
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'email must be an email',
        'password must be longer than or equal to 8 characters',
        'firstName must be longer than or equal to 1 characters',
        'lastName must be longer than or equal to 1 characters'
      ])
    );
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('rejects missing JWT on protected endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/auth/me');

    expect(response.status).toBe(401);
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('rejects invalid JWT on protected endpoint', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer definitely-invalid-token');

    expect(response.status).toBe(401);
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('returns the current user for a valid JWT without leaking passwordHash', async () => {
    const user = createTestUser();
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user)
    });
    authService.getCurrentUser.mockResolvedValue({
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    });

    const token = jwtService.sign({
      sub: user._id.toString(),
      email: user.email
    });
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(authService.getCurrentUser).toHaveBeenCalledWith(user._id.toString());
  });
});
