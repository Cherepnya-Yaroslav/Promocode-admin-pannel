import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
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
import { buildSeedBundle } from './seed-data';

interface SeedResult {
  users: number;
  promocodes: number;
  orders: number;
  promoUsages: number;
}

interface UserOrderAggregate {
  totalOrdersCount: number;
  totalOrdersAmount: number;
  totalDiscountAmount: number;
  totalPromoUsageCount: number;
  lastOrderAt: Date | null;
}

interface PromoAggregate {
  totalUsageCount: number;
  uniqueUsersCount: number;
  totalDiscountAmount: number;
  totalRevenueAffected: number;
  lastUsedAt: Date | null;
}

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

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

  async seed(): Promise<SeedResult> {
    await this.clickHouseSchemaService.ensureSchema();

    const seedBundle = buildSeedBundle(new Date());

    await this.resetMongoData();
    await this.clickHouseSchemaService.truncateTables();

    await this.userModel.insertMany(seedBundle.users);
    await this.promoCodeModel.insertMany(seedBundle.promocodes);
    await this.orderModel.insertMany(seedBundle.orders);
    await this.promoUsageModel.insertMany(seedBundle.promoUsages);

    await this.insertClickHouseRows(seedBundle);

    const result: SeedResult = {
      users: seedBundle.users.length,
      promocodes: seedBundle.promocodes.length,
      orders: seedBundle.orders.length,
      promoUsages: seedBundle.promoUsages.length
    };

    this.logger.log(
      `Seed complete: ${result.users} users, ${result.promocodes} promocodes, ${result.orders} orders, ${result.promoUsages} promo usages.`
    );

    return result;
  }

  private async resetMongoData(): Promise<void> {
    await this.promoUsageModel.deleteMany({});
    await this.orderModel.deleteMany({});
    await this.promoCodeModel.deleteMany({});
    await this.userModel.deleteMany({});
  }

  private async insertClickHouseRows(
    seedBundle: ReturnType<typeof buildSeedBundle>
  ): Promise<void> {
    const userMap = new Map(
      seedBundle.users.map((user) => [user._id.toString(), user])
    );
    const promoMap = new Map(
      seedBundle.promocodes.map((promo) => [promo._id.toString(), promo])
    );
    const orderMap = new Map(
      seedBundle.orders.map((order) => [order._id.toString(), order])
    );

    const userRows = this.buildUserRows(seedBundle);
    const promocodeRows = this.buildPromocodeRows(seedBundle);
    const orderRows = seedBundle.orders.map<ClickHouseOrderRow>((order) => {
      const user = userMap.get(order.userId.toString());

      if (!user) {
        throw new Error(`Missing seed user for order ${order._id.toString()}`);
      }

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
        applied_at: this.toNullableTimestamp(order.appliedAt),
        created_at: this.toTimestamp(order.createdAt),
        updated_at: this.toTimestamp(order.updatedAt)
      };
    });

    const promoUsageRows = seedBundle.promoUsages.map<ClickHousePromoUsageRow>(
      (promoUsage) => {
        const user = userMap.get(promoUsage.userId.toString());
        const order = orderMap.get(promoUsage.orderId.toString());
        const promo = promoMap.get(promoUsage.promocodeId.toString());

        if (!user || !order || !promo) {
          throw new Error(
            `Missing seed references for promo usage ${promoUsage._id.toString()}`
          );
        }

        return {
          promo_usage_id: promoUsage._id.toString(),
          used_at: this.toTimestamp(promoUsage.usedAt),
          promocode_id: promo._id.toString(),
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
    );

    await this.clickHouseService.insert(
      this.clickHouseSchemaService.getQualifiedTableName('users'),
      userRows
    );
    await this.clickHouseService.insert(
      this.clickHouseSchemaService.getQualifiedTableName('promocodes'),
      promocodeRows
    );
    await this.clickHouseService.insert(
      this.clickHouseSchemaService.getQualifiedTableName('orders'),
      orderRows
    );
    await this.clickHouseService.insert(
      this.clickHouseSchemaService.getQualifiedTableName('promo_usages'),
      promoUsageRows
    );
  }

  private buildUserRows(
    seedBundle: ReturnType<typeof buildSeedBundle>
  ): ClickHouseUserRow[] {
    const orderAggregates = new Map<string, UserOrderAggregate>();

    for (const order of seedBundle.orders) {
      const userId = order.userId.toString();
      const existing = orderAggregates.get(userId) ?? {
        totalOrdersCount: 0,
        totalOrdersAmount: 0,
        totalDiscountAmount: 0,
        totalPromoUsageCount: 0,
        lastOrderAt: null
      };

      existing.totalOrdersCount += 1;
      existing.totalOrdersAmount = this.roundMoney(
        existing.totalOrdersAmount + order.amount
      );
      existing.totalDiscountAmount = this.roundMoney(
        existing.totalDiscountAmount + order.discountAmount
      );
      existing.lastOrderAt =
        existing.lastOrderAt === null || order.createdAt > existing.lastOrderAt
          ? order.createdAt
          : existing.lastOrderAt;

      orderAggregates.set(userId, existing);
    }

    for (const promoUsage of seedBundle.promoUsages) {
      const userId = promoUsage.userId.toString();
      const existing = orderAggregates.get(userId);

      if (!existing) {
        continue;
      }

      existing.totalPromoUsageCount += 1;
    }

    return seedBundle.users.map((user) => {
      const aggregate = orderAggregates.get(user._id.toString()) ?? {
        totalOrdersCount: 0,
        totalOrdersAmount: 0,
        totalDiscountAmount: 0,
        totalPromoUsageCount: 0,
        lastOrderAt: null
      };

      return {
        user_id: user._id.toString(),
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        full_name: `${user.firstName} ${user.lastName}`,
        is_active: user.isActive ? 1 : 0,
        country: user.country,
        segment: user.segment,
        total_orders_count: aggregate.totalOrdersCount,
        total_orders_amount: aggregate.totalOrdersAmount,
        total_discount_amount: aggregate.totalDiscountAmount,
        total_promo_usage_count: aggregate.totalPromoUsageCount,
        last_order_at: this.toNullableTimestamp(aggregate.lastOrderAt),
        created_at: this.toTimestamp(user.createdAt),
        updated_at: this.toTimestamp(user.updatedAt)
      };
    });
  }

  private buildPromocodeRows(
    seedBundle: ReturnType<typeof buildSeedBundle>
  ): ClickHousePromocodeRow[] {
    const promoAggregates = new Map<string, PromoAggregate>();
    const promoUsers = new Map<string, Set<string>>();

    for (const promoUsage of seedBundle.promoUsages) {
      const promoId = promoUsage.promocodeId.toString();
      const existing = promoAggregates.get(promoId) ?? {
        totalUsageCount: 0,
        uniqueUsersCount: 0,
        totalDiscountAmount: 0,
        totalRevenueAffected: 0,
        lastUsedAt: null
      };

      existing.totalUsageCount += 1;
      existing.totalDiscountAmount = this.roundMoney(
        existing.totalDiscountAmount + promoUsage.discountAmount
      );
      existing.totalRevenueAffected = this.roundMoney(
        existing.totalRevenueAffected + promoUsage.orderAmount
      );
      existing.lastUsedAt =
        existing.lastUsedAt === null || promoUsage.usedAt > existing.lastUsedAt
          ? promoUsage.usedAt
          : existing.lastUsedAt;

      promoAggregates.set(promoId, existing);

      const users = promoUsers.get(promoId) ?? new Set<string>();
      users.add(promoUsage.userId.toString());
      promoUsers.set(promoId, users);
    }

    return seedBundle.promocodes.map((promocode) => {
      const aggregate = promoAggregates.get(promocode._id.toString()) ?? {
        totalUsageCount: 0,
        uniqueUsersCount: 0,
        totalDiscountAmount: 0,
        totalRevenueAffected: 0,
        lastUsedAt: null
      };
      const uniqueUsers = promoUsers.get(promocode._id.toString()) ?? new Set();

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
        total_usage_count: aggregate.totalUsageCount,
        unique_users_count: uniqueUsers.size,
        total_discount_amount: aggregate.totalDiscountAmount,
        total_revenue_affected: aggregate.totalRevenueAffected,
        last_used_at: this.toNullableTimestamp(aggregate.lastUsedAt),
        created_at: this.toTimestamp(promocode.createdAt),
        updated_at: this.toTimestamp(promocode.updatedAt)
      };
    });
  }

  private toTimestamp(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }

  private toNullableTimestamp(date?: Date | null): string | null {
    return date ? this.toTimestamp(date) : null;
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
