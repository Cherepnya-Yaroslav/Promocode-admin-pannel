import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, type OrderDocument } from '../database/schemas/order.schema';
import {
  PromoCode,
  type PromoCodeDocument
} from '../database/schemas/promocode.schema';
import {
  PromoUsage,
  type PromoUsageDocument
} from '../database/schemas/promo-usage.schema';
import { User, type UserDocument } from '../database/schemas/user.schema';
import type {
  ClickHouseOrderRow,
  ClickHousePromocodeRow,
  ClickHousePromoUsageRow,
  ClickHouseUserRow
} from '../infrastructure/clickhouse/clickhouse-row.types';
import { ClickHouseSchemaService } from '../infrastructure/clickhouse/clickhouse-schema.service';
import { ClickHouseService } from '../infrastructure/clickhouse/clickhouse.service';

const syncRetryDelaysMs = [0, 100, 250] as const;

@Injectable()
export class AnalyticsSyncService {
  private readonly logger = new Logger(AnalyticsSyncService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(PromoCode.name)
    private readonly promoCodeModel: Model<PromoCodeDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(PromoUsage.name)
    private readonly promoUsageModel: Model<PromoUsageDocument>,
    private readonly clickHouseService: ClickHouseService,
    private readonly clickHouseSchemaService: ClickHouseSchemaService
  ) {}

  async syncUser(userId: string): Promise<void> {
    await this.runWithRetries(`user ${userId}`, async () => {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new NotFoundException(`User ${userId} was not found.`);
      }

      const orders = await this.orderModel.find({ userId: user._id }).exec();
      const promoUsageCount = await this.promoUsageModel.countDocuments({
        userId: user._id
      });

      const row = this.buildUserRow(user, orders, promoUsageCount);

      await this.replaceRow(
        this.clickHouseSchemaService.getQualifiedTableName('users'),
        'user_id',
        user._id.toString(),
        row
      );
    });
  }

  async syncPromocode(promocodeId: string): Promise<void> {
    await this.runWithRetries(`promocode ${promocodeId}`, async () => {
      const promocode = await this.promoCodeModel.findById(promocodeId).exec();

      if (!promocode) {
        throw new NotFoundException(
          `Promocode ${promocodeId} was not found.`
        );
      }

      const promoUsages = await this.promoUsageModel
        .find({ promocodeId: promocode._id })
        .exec();

      const row = this.buildPromocodeRow(promocode, promoUsages);

      await this.replaceRow(
        this.clickHouseSchemaService.getQualifiedTableName('promocodes'),
        'promocode_id',
        promocode._id.toString(),
        row
      );
    });
  }

  async syncOrder(orderId: string): Promise<void> {
    await this.runWithRetries(`order ${orderId}`, async () => {
      const order = await this.orderModel.findById(orderId).exec();

      if (!order) {
        throw new NotFoundException(`Order ${orderId} was not found.`);
      }

      const user = await this.userModel.findById(order.userId).exec();

      if (!user) {
        throw new NotFoundException(
          `User ${order.userId.toString()} was not found for order ${orderId}.`
        );
      }

      const row = this.buildOrderRow(order, user);

      await this.replaceRow(
        this.clickHouseSchemaService.getQualifiedTableName('orders'),
        'order_id',
        order._id.toString(),
        row
      );
    });
  }

  async syncPromoUsage(promoUsageId: string): Promise<void> {
    await this.runWithRetries(`promo usage ${promoUsageId}`, async () => {
      const promoUsage = await this.promoUsageModel.findById(promoUsageId).exec();

      if (!promoUsage) {
        throw new NotFoundException(
          `Promo usage ${promoUsageId} was not found.`
        );
      }

      const user = await this.userModel.findById(promoUsage.userId).exec();
      const order = await this.orderModel.findById(promoUsage.orderId).exec();
      const promocode = await this.promoCodeModel
        .findById(promoUsage.promocodeId)
        .exec();

      if (!user || !order || !promocode) {
        throw new NotFoundException(
          `Promo usage ${promoUsageId} is missing its related user, order, or promocode.`
        );
      }

      const row = this.buildPromoUsageRow(promoUsage, user, order, promocode);

      await this.replaceRow(
        this.clickHouseSchemaService.getQualifiedTableName('promo_usages'),
        'promo_usage_id',
        promoUsage._id.toString(),
        row
      );
    });
  }

  async removeOrder(orderId: string): Promise<void> {
    await this.runWithRetries(`order ${orderId} deletion`, async () => {
      await this.deleteRow(
        this.clickHouseSchemaService.getQualifiedTableName('orders'),
        'order_id',
        orderId
      );
    });
  }

  async removePromoUsage(promoUsageId: string): Promise<void> {
    await this.runWithRetries(`promo usage ${promoUsageId} deletion`, async () => {
      await this.deleteRow(
        this.clickHouseSchemaService.getQualifiedTableName('promo_usages'),
        'promo_usage_id',
        promoUsageId
      );
    });
  }

  private async runWithRetries(
    entityLabel: string,
    syncOperation: () => Promise<void>
  ): Promise<void> {
    let lastError: unknown;

    for (let attemptIndex = 0; attemptIndex < syncRetryDelaysMs.length; attemptIndex += 1) {
      const attemptNumber = attemptIndex + 1;
      const retryDelayMs = syncRetryDelaysMs[attemptIndex] ?? 0;

      try {
        if (attemptIndex > 0) {
          await this.delay(retryDelayMs);
        }

        await syncOperation();
        return;
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `Analytics sync failed for ${entityLabel} on attempt ${attemptNumber}/${syncRetryDelaysMs.length}: ${this.getErrorMessage(
            error
          )}`
        );
      }
    }

    throw new InternalServerErrorException(
      `MongoDB write succeeded, but analytics sync failed for ${entityLabel}.`,
      {
        cause: lastError
      }
    );
  }

  private buildUserRow(
    user: UserDocument,
    orders: OrderDocument[],
    promoUsageCount: number
  ): ClickHouseUserRow {
    let totalOrdersAmount = 0;
    let totalDiscountAmount = 0;
    let lastOrderAt: Date | null = null;

    for (const order of orders) {
      totalOrdersAmount = this.roundMoney(totalOrdersAmount + order.amount);
      totalDiscountAmount = this.roundMoney(
        totalDiscountAmount + order.discountAmount
      );
      lastOrderAt =
        lastOrderAt === null ||
        order.createdAt.getTime() > lastOrderAt.getTime()
          ? order.createdAt
          : lastOrderAt;
    }

    return {
      user_id: user._id.toString(),
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      full_name: `${user.firstName} ${user.lastName}`,
      is_active: user.isActive ? 1 : 0,
      country: user.country,
      segment: user.segment,
      total_orders_count: orders.length,
      total_orders_amount: totalOrdersAmount,
      total_discount_amount: totalDiscountAmount,
      total_promo_usage_count: promoUsageCount,
      last_order_at: this.toNullableTimestamp(lastOrderAt),
      created_at: this.toTimestamp(user.createdAt),
      updated_at: this.toTimestamp(user.updatedAt)
    };
  }

  private buildPromocodeRow(
    promocode: PromoCodeDocument,
    promoUsages: PromoUsageDocument[]
  ): ClickHousePromocodeRow {
    let totalDiscountAmount = 0;
    let totalRevenueAffected = 0;
    let lastUsedAt: Date | null = null;
    const uniqueUserIds = new Set<string>();

    for (const promoUsage of promoUsages) {
      totalDiscountAmount = this.roundMoney(
        totalDiscountAmount + promoUsage.discountAmount
      );
      totalRevenueAffected = this.roundMoney(
        totalRevenueAffected + promoUsage.orderAmount
      );
      uniqueUserIds.add(promoUsage.userId.toString());
      lastUsedAt =
        lastUsedAt === null ||
        promoUsage.usedAt.getTime() > lastUsedAt.getTime()
          ? promoUsage.usedAt
          : lastUsedAt;
    }

    return {
      promocode_id: promocode._id.toString(),
      code: promocode.code,
      description: promocode.description,
      discount_type: promocode.discountType,
      discount_value: promocode.discountValue,
      max_discount_amount: promocode.maxDiscountAmount ?? null,
      min_order_amount: promocode.minOrderAmount ?? null,
      total_usage_limit: promocode.totalUsageLimit ?? null,
      per_user_usage_limit: promocode.perUserUsageLimit ?? null,
      is_active: promocode.isActive ? 1 : 0,
      date_from: this.toTimestamp(promocode.dateFrom),
      date_to: this.toTimestamp(promocode.dateTo),
      total_usage_count: promoUsages.length,
      unique_users_count: uniqueUserIds.size,
      total_discount_amount: totalDiscountAmount,
      total_revenue_affected: totalRevenueAffected,
      last_used_at: this.toNullableTimestamp(lastUsedAt),
      created_at: this.toTimestamp(promocode.createdAt),
      updated_at: this.toTimestamp(promocode.updatedAt)
    };
  }

  private buildOrderRow(
    order: OrderDocument,
    user: UserDocument
  ): ClickHouseOrderRow {
    return {
      order_id: order._id.toString(),
      user_id: user._id.toString(),
      user_email: user.email,
      user_full_name: `${user.firstName} ${user.lastName}`,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      promocode_id: order.promocodeId?.toString() ?? null,
      promocode_code: order.promocodeCode ?? null,
      discount_amount: order.discountAmount,
      final_amount: order.finalAmount,
      applied_at: this.toNullableTimestamp(order.appliedAt ?? null),
      created_at: this.toTimestamp(order.createdAt),
      updated_at: this.toTimestamp(order.updatedAt)
    };
  }

  private buildPromoUsageRow(
    promoUsage: PromoUsageDocument,
    user: UserDocument,
    order: OrderDocument,
    promocode: PromoCodeDocument
  ): ClickHousePromoUsageRow {
    return {
      promo_usage_id: promoUsage._id.toString(),
      used_at: this.toTimestamp(promoUsage.usedAt),
      promocode_id: promocode._id.toString(),
      promocode_code: promoUsage.promocodeCode,
      discount_type: promoUsage.discountType,
      discount_value: promoUsage.discountValueSnapshot,
      user_id: user._id.toString(),
      user_email: user.email,
      user_full_name: `${user.firstName} ${user.lastName}`,
      order_id: order._id.toString(),
      order_amount: promoUsage.orderAmount,
      discount_amount: promoUsage.discountAmount,
      final_amount: promoUsage.finalAmount,
      currency: promoUsage.currency,
      order_created_at: this.toTimestamp(order.createdAt),
      created_at: this.toTimestamp(promoUsage.createdAt),
      updated_at: this.toTimestamp(promoUsage.updatedAt)
    };
  }

  private async replaceRow<T extends object>(
    tableName: string,
    idColumn: 'user_id' | 'promocode_id' | 'order_id' | 'promo_usage_id',
    idValue: string,
    row: T
  ): Promise<void> {
    await this.deleteRow(tableName, idColumn, idValue);
    await this.clickHouseService.insert(tableName, [row]);
  }

  private async deleteRow(
    tableName: string,
    idColumn: 'user_id' | 'promocode_id' | 'order_id' | 'promo_usage_id',
    idValue: string
  ): Promise<void> {
    await this.clickHouseService.command(
      `ALTER TABLE ${tableName} DELETE WHERE ${idColumn} = ${this.toSqlString(
        idValue
      )} SETTINGS mutations_sync = 1`
    );
  }

  private toTimestamp(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }

  private toNullableTimestamp(date: Date | null): string | null {
    return date ? this.toTimestamp(date) : null;
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private toSqlString(value: string): string {
    return `'${value.replace(/'/g, "\\'")}'`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
