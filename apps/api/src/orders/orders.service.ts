import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, Model } from 'mongoose';
import { AnalyticsCacheService } from '../analytics-sync/analytics-cache.service';
import { AnalyticsSyncService } from '../analytics-sync/analytics-sync.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  Order,
  type OrderDocument
} from '../database/schemas/order.schema';
import {
  PromoCode,
  type PromoCodeDocument
} from '../database/schemas/promocode.schema';
import {
  PromoUsage,
  type PromoUsageDocument
} from '../database/schemas/promo-usage.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApplyPromocodeDto } from './dto/apply-promocode.dto';
import { ApplyPromocodeResponseDto } from './dto/apply-promocode-response.dto';
import { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersListResponseDto } from './dto/orders-list-response.dto';
import { PromoUsageResponseDto } from './dto/promo-usage-response.dto';
import { ApplyPromocodeLockService } from './apply-promocode-lock.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(PromoCode.name)
    private readonly promoCodeModel: Model<PromoCodeDocument>,
    @InjectModel(PromoUsage.name)
    private readonly promoUsageModel: Model<PromoUsageDocument>,
    private readonly analyticsSyncService: AnalyticsSyncService,
    private readonly analyticsCacheService: AnalyticsCacheService,
    private readonly applyPromocodeLockService: ApplyPromocodeLockService
  ) {}

  async createOrder(
    currentUser: AuthenticatedUser,
    createOrderDto: CreateOrderDto
  ): Promise<OrderResponseDto> {
    const order = await this.orderModel.create({
      userId: new Types.ObjectId(currentUser.id),
      amount: this.roundMoney(createOrderDto.amount),
      currency: createOrderDto.currency,
      status: 'CREATED',
      discountAmount: 0,
      finalAmount: this.roundMoney(createOrderDto.amount)
    });

    await this.analyticsSyncService.syncOrder(order._id.toString());
    await this.analyticsSyncService.syncUser(currentUser.id);
    await this.analyticsCacheService.invalidateUsersAnalytics();

    return OrderResponseDto.fromOrderDocument(order);
  }

  async listMyOrders(
    currentUser: AuthenticatedUser,
    queryDto: ListMyOrdersQueryDto
  ): Promise<OrdersListResponseDto> {
    const filter = {
      userId: new Types.ObjectId(currentUser.id)
    };

    const [items, totalCount] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((queryDto.page - 1) * queryDto.pageSize)
        .limit(queryDto.pageSize)
        .exec(),
      this.orderModel.countDocuments(filter)
    ]);

    return {
      items: items.map((item) => OrderResponseDto.fromOrderDocument(item)),
      page: queryDto.page,
      pageSize: queryDto.pageSize,
      totalCount
    };
  }

  async deleteOrder(
    currentUser: AuthenticatedUser,
    orderId: string
  ): Promise<OrderResponseDto> {
    const order = await this.orderModel.findById(orderId).exec();

    if (!order) {
      throw new NotFoundException(`Order ${orderId} was not found.`);
    }

    if (order.userId.toString() !== currentUser.id) {
      throw new ForbiddenException(
        'You cannot delete another user\'s order.'
      );
    }

    const promoUsage = await this.promoUsageModel.findOne({ orderId: order._id }).exec();

    await this.orderModel.findByIdAndDelete(order._id).exec();

    if (promoUsage) {
      await this.promoUsageModel.findByIdAndDelete(promoUsage._id).exec();
      await this.analyticsSyncService.removePromoUsage(promoUsage._id.toString());
      await this.analyticsCacheService.invalidatePromoUsagesAnalytics();
    }

    await this.analyticsSyncService.removeOrder(order._id.toString());
    await this.analyticsSyncService.syncUser(currentUser.id);
    await this.analyticsCacheService.invalidateUsersAnalytics();

    if (order.promocodeId) {
      await this.analyticsSyncService.syncPromocode(order.promocodeId.toString());
      await this.analyticsCacheService.invalidatePromocodesAnalytics();
    }

    return OrderResponseDto.fromOrderDocument(order);
  }

  async applyPromocode(
    currentUser: AuthenticatedUser,
    orderId: string,
    applyPromocodeDto: ApplyPromocodeDto
  ): Promise<ApplyPromocodeResponseDto> {
    const lockToken = await this.applyPromocodeLockService.acquire(orderId);

    if (!lockToken) {
      throw new ConflictException(
        'Promocode application already in progress for this order. Please retry.'
      );
    }

    try {
      const order = await this.orderModel.findById(orderId).exec();

      if (!order) {
        throw new NotFoundException(`Order ${orderId} was not found.`);
      }

      if (order.userId.toString() !== currentUser.id) {
        throw new ForbiddenException(
          'You cannot apply a promocode to another user\'s order.'
        );
      }

      if (order.promocodeId || order.promocodeCode) {
        throw new ConflictException('This order already has a promocode.');
      }

      const existingPromoUsage = await this.promoUsageModel
        .findOne({ orderId: order._id })
        .exec();

      if (existingPromoUsage) {
        throw new ConflictException('This order already has a promocode.');
      }

      const promocode = await this.promoCodeModel
        .findOne({ code: applyPromocodeDto.code.trim().toUpperCase() })
        .exec();

      if (!promocode) {
        throw new NotFoundException(
          `Promocode ${applyPromocodeDto.code.trim().toUpperCase()} was not found.`
        );
      }

      await this.assertPromocodeCanBeApplied(promocode, order, currentUser.id);

      const discountAmount = await this.calculateDiscountAmount(
        promocode,
        order.amount
      );
      const usedAt = new Date();

      order.promocodeId = promocode._id;
      order.promocodeCode = promocode.code;
      order.status = 'PROMOCODE_APPLIED';
      order.discountAmount = discountAmount;
      order.finalAmount = this.roundMoney(order.amount - discountAmount);
      order.appliedAt = usedAt;

      await order.save();

      const promoUsage = await this.promoUsageModel.create({
        userId: new Types.ObjectId(currentUser.id),
        orderId: order._id,
        promocodeId: promocode._id,
        promocodeCode: promocode.code,
        discountType: promocode.discountType,
        discountValueSnapshot: promocode.discountValue,
        orderAmount: order.amount,
        discountAmount,
        finalAmount: order.finalAmount,
        currency: order.currency,
        usedAt
      });

      await this.analyticsSyncService.syncOrder(order._id.toString());
      await this.analyticsSyncService.syncPromoUsage(promoUsage._id.toString());
      await this.analyticsSyncService.syncUser(currentUser.id);
      await this.analyticsSyncService.syncPromocode(promocode._id.toString());
      await this.analyticsCacheService.invalidateUsersAnalytics();
      await this.analyticsCacheService.invalidatePromocodesAnalytics();
      await this.analyticsCacheService.invalidatePromoUsagesAnalytics();

      return {
        order: OrderResponseDto.fromOrderDocument(order),
        promoUsage: PromoUsageResponseDto.fromPromoUsageDocument(promoUsage)
      };
    } finally {
      await this.applyPromocodeLockService.release(orderId, lockToken);
    }
  }

  private assertPromocodeCanBeApplied(
    promocode: PromoCodeDocument,
    order: OrderDocument,
    userId: string
  ): Promise<void> {
    if (!promocode.isActive) {
      throw new BadRequestException('Promocode is inactive.');
    }

    const now = new Date();

    if (promocode.dateFrom > now) {
      throw new BadRequestException('Promocode is not started yet.');
    }

    if (promocode.dateTo < now) {
      throw new BadRequestException('Promocode is expired.');
    }

    if (
      promocode.minOrderAmount !== undefined &&
      order.amount < promocode.minOrderAmount
    ) {
      throw new BadRequestException(
        'Order amount does not meet promocode minimum order amount.'
      );
    }

    return this.assertUsageLimits(promocode, userId);
  }

  private async assertUsageLimits(
    promocode: PromoCodeDocument,
    userId: string
  ): Promise<void> {
    if (promocode.totalUsageLimit !== undefined) {
      const totalUsageCount = await this.promoUsageModel.countDocuments({
        promocodeId: promocode._id
      });

      if (totalUsageCount >= promocode.totalUsageLimit) {
        throw new BadRequestException('Promocode total usage limit exceeded.');
      }
    }

    if (promocode.perUserUsageLimit !== undefined) {
      const perUserUsageCount = await this.promoUsageModel.countDocuments({
        promocodeId: promocode._id,
        userId: new Types.ObjectId(userId)
      });

      if (perUserUsageCount >= promocode.perUserUsageLimit) {
        throw new BadRequestException(
          'Promocode per-user usage limit exceeded.'
        );
      }
    }
  }

  private async calculateDiscountAmount(
    promocode: PromoCodeDocument,
    orderAmount: number
  ): Promise<number> {
    if (promocode.discountType === 'FIXED') {
      return this.roundMoney(Math.min(orderAmount, promocode.discountValue));
    }

    const percentDiscount = this.roundMoney(
      (orderAmount * promocode.discountValue) / 100
    );

    if (promocode.maxDiscountAmount !== undefined) {
      return this.roundMoney(
        Math.min(percentDiscount, promocode.maxDiscountAmount)
      );
    }

    return percentDiscount;
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
