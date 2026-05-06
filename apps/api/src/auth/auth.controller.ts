import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiTags
} from '@nestjs/swagger';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './auth.types';
import { AuthResponseDto } from './dto/auth-response.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new operator account',
    description:
      'Creates a command-side user account and returns a JWT access token for the protected console.'
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      default: {
        summary: 'Operator registration payload',
        value: {
          email: 'alex@example.com',
          password: 'StrongPass123!',
          firstName: 'Alex',
          lastName: 'Morgan'
        }
      }
    }
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    keyPrefix: 'rate-limit:auth:login',
    limit: 5,
    ttlSeconds: 60,
    subject: 'login-email-and-ip',
    message: 'Too many login attempts.'
  })
  @ApiOperation({
    summary: 'Authenticate and create an operator session',
    description:
      'Validates email/password, returns a JWT access token, and is Redis rate-limited to reduce brute-force attempts.'
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      default: {
        summary: 'Operator login payload',
        value: {
          email: 'alex@example.com',
          password: 'StrongPass123!'
        }
      }
    }
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Credentials are invalid or the user account is inactive.'
  })
  @ApiTooManyRequestsResponse({
    description: 'Redis-backed login rate limit exceeded.'
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Return the current authenticated operator',
    description:
      'Reads the user profile for the current JWT subject without exposing passwordHash.'
  })
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiUnauthorizedResponse({
    description: 'JWT is missing, invalid, or belongs to an inactive user.'
  })
  async me(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<CurrentUserDto> {
    return this.authService.getCurrentUser(currentUser.id);
  }
}
