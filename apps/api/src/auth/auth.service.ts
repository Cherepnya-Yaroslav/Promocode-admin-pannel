import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { AnalyticsCacheService } from '../analytics-sync/analytics-cache.service';
import { AnalyticsSyncService } from '../analytics-sync/analytics-sync.service';
import { User, type UserDocument } from '../database/schemas/user.schema';
import type { JwtPayload } from './auth.types';
import { AuthResponseDto } from './dto/auth-response.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly analyticsSyncService: AnalyticsSyncService,
    private readonly analyticsCacheService: AnalyticsCacheService
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const existingUser = await this.userModel
      .findOne({ email: normalizedEmail })
      .exec();

    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);
    const user = await this.userModel.create({
      email: normalizedEmail,
      passwordHash,
      firstName: registerDto.firstName.trim(),
      lastName: registerDto.lastName.trim(),
      isActive: true,
      country: 'US',
      segment: 'starter'
    });

    await this.analyticsSyncService.syncUser(user._id.toString());
    await this.analyticsCacheService.invalidateUsersAnalytics();

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userModel
      .findOne({ email: loginDto.email.trim().toLowerCase() })
      .exec();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  async getCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not authorized.');
    }

    return CurrentUserDto.fromUserDocument(user);
  }

  private buildAuthResponse(user: UserDocument): AuthResponseDto {
    return {
      user: CurrentUserDto.fromUserDocument(user),
      accessToken: this.signAccessToken(user)
    };
  }

  private signAccessToken(user: UserDocument): string {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email
    };

    return this.jwtService.sign(payload);
  }
}
