import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import { ResourceIdParamDto } from '../common/dto/resource-id-param.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersListResponseDto } from './dto/users-list-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'alex' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: true })
  @ApiOkResponse({ type: UsersListResponseDto })
  async listUsers(
    @Query() queryDto: ListUsersQueryDto
  ): Promise<UsersListResponseDto> {
    return this.usersService.listUsers(queryDto);
  }

  @Post()
  @ApiCreatedResponse({ type: UserResponseDto })
  async createUser(
    @Body() createUserDto: CreateUserDto
  ): Promise<UserResponseDto> {
    return this.usersService.createUser(createUserDto);
  }

  @Get(':id')
  @ApiOkResponse({ type: UserResponseDto })
  async getUserById(
    @Param() params: ResourceIdParamDto
  ): Promise<UserResponseDto> {
    return this.usersService.getUserById(params.id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UserResponseDto })
  async updateUser(
    @Param() params: ResourceIdParamDto,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(params.id, updateUserDto);
  }

  @Post(':id/deactivate')
  @ApiOkResponse({ type: UserResponseDto })
  async deactivateUser(
    @Param() params: ResourceIdParamDto
  ): Promise<UserResponseDto> {
    return this.usersService.deactivateUser(params.id);
  }
}
