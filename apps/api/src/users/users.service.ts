import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Model } from 'mongoose';
import { AnalyticsCacheService } from '../analytics-sync/analytics-cache.service';
import { AnalyticsSyncService } from '../analytics-sync/analytics-sync.service';
import { User, type UserDocument } from '../database/schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersListResponseDto } from './dto/users-list-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly analyticsSyncService: AnalyticsSyncService,
    private readonly analyticsCacheService: AnalyticsCacheService
  ) {}

  async listUsers(queryDto: ListUsersQueryDto): Promise<UsersListResponseDto> {
    const filter = this.buildListFilter(queryDto);
    const page = queryDto.page;
    const pageSize = queryDto.pageSize;

    const [items, totalCount] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.userModel.countDocuments(filter)
    ]);

    return {
      items: items.map((item) => UserResponseDto.fromUserDocument(item)),
      page,
      pageSize,
      totalCount
    };
  }

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const normalizedEmail = createUserDto.email.trim().toLowerCase();
    const existingUser = await this.userModel
      .findOne({ email: normalizedEmail })
      .exec();

    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);
    const user = await this.userModel.create({
      email: normalizedEmail,
      passwordHash,
      firstName: createUserDto.firstName.trim(),
      lastName: createUserDto.lastName.trim(),
      country: createUserDto.country.trim().toUpperCase(),
      segment: createUserDto.segment,
      isActive: createUserDto.isActive ?? true
    });

    await this.analyticsSyncService.syncUser(user._id.toString());
    await this.analyticsCacheService.invalidateUsersAnalytics();

    return UserResponseDto.fromUserDocument(user);
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User ${id} was not found.`);
    }

    return UserResponseDto.fromUserDocument(user);
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User ${id} was not found.`);
    }

    if (updateUserDto.firstName !== undefined) {
      user.firstName = updateUserDto.firstName.trim();
    }

    if (updateUserDto.lastName !== undefined) {
      user.lastName = updateUserDto.lastName.trim();
    }

    if (updateUserDto.country !== undefined) {
      user.country = updateUserDto.country.trim().toUpperCase();
    }

    if (updateUserDto.segment !== undefined) {
      user.segment = updateUserDto.segment;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    await user.save();
    await this.analyticsSyncService.syncUser(user._id.toString());
    await this.analyticsCacheService.invalidateUsersAnalytics();

    return UserResponseDto.fromUserDocument(user);
  }

  async deactivateUser(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User ${id} was not found.`);
    }

    user.isActive = false;

    await user.save();
    await this.analyticsSyncService.syncUser(user._id.toString());
    await this.analyticsCacheService.invalidateUsersAnalytics();

    return UserResponseDto.fromUserDocument(user);
  }

  private buildListFilter(queryDto: ListUsersQueryDto): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (queryDto.isActive !== undefined) {
      filter.isActive = queryDto.isActive;
    }

    if (queryDto.search) {
      const searchRegex = new RegExp(
        this.escapeRegex(queryDto.search),
        'i'
      );

      filter.$or = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex }
      ];
    }

    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
