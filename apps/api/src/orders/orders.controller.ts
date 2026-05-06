import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTooManyRequestsResponse,
  ApiTags
} from '@nestjs/swagger';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceIdParamDto } from '../common/dto/resource-id-param.dto';
import { ApplyPromocodeDto } from './dto/apply-promocode.dto';
import { ApplyPromocodeResponseDto } from './dto/apply-promocode-response.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersListResponseDto } from './dto/orders-list-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new order for the current authenticated user',
    description:
      'Creates a command-side order in MongoDB. Promocode application is intentionally a separate later mutation.'
  })
  @ApiBody({
    type: CreateOrderDto,
    examples: {
      default: {
        summary: 'Create order payload',
        value: {
          amount: 240,
          currency: 'USD'
        }
      }
    }
  })
  @ApiCreatedResponse({ type: OrderResponseDto })
  async createOrder(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createOrderDto: CreateOrderDto
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(currentUser, createOrderDto);
  }

  @Get('my')
  @ApiOperation({
    summary: 'List orders for the current authenticated user',
    description:
      "Returns only the current operator's orders with server-side pagination."
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiOkResponse({ type: OrdersListResponseDto })
  async listMyOrders(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() queryDto: ListMyOrdersQueryDto
  ): Promise<OrdersListResponseDto> {
    return this.ordersService.listMyOrders(currentUser, queryDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an order owned by the current authenticated user',
    description:
      'Deletes the command-side order, removes any related promo usage, and invalidates the affected analytics projections.'
  })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({
    description: 'The order does not exist.'
  })
  async deleteOrder(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: ResourceIdParamDto
  ): Promise<OrderResponseDto> {
    return this.ordersService.deleteOrder(currentUser, params.id);
  }

  @Post(':id/apply-promocode')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    keyPrefix: 'rate-limit:orders:apply-promocode',
    limit: 6,
    ttlSeconds: 60,
    subject: 'authenticated-user-and-order',
    message: 'Too many promocode apply attempts for this order.'
  })
  @ApiOperation({
    summary: 'Apply a promocode to a current-user order',
    description:
      'Validates ownership, active window, usage limits, and lock state before creating a promo usage record and syncing analytics.'
  })
  @ApiBody({
    type: ApplyPromocodeDto,
    examples: {
      default: {
        summary: 'Apply promocode payload',
        value: {
          code: 'SPRING25'
        }
      }
    }
  })
  @ApiOkResponse({ type: ApplyPromocodeResponseDto })
  @ApiConflictResponse({
    description:
      'The order already has a promocode, a lock is already held, or the apply flow is already in progress.'
  })
  @ApiNotFoundResponse({
    description: 'The order or promocode does not exist.'
  })
  @ApiTooManyRequestsResponse({
    description: 'Redis-backed apply-promocode rate limit exceeded.'
  })
  async applyPromocode(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: ResourceIdParamDto,
    @Body() applyPromocodeDto: ApplyPromocodeDto
  ): Promise<ApplyPromocodeResponseDto> {
    return this.ordersService.applyPromocode(
      currentUser,
      params.id,
      applyPromocodeDto
    );
  }
}
