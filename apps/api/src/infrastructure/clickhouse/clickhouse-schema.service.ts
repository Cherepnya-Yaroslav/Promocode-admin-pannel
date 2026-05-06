import { createClient } from '@clickhouse/client';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap
} from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { ClickHouseService } from './clickhouse.service';

@Injectable()
export class ClickHouseSchemaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ClickHouseSchemaService.name);

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly clickHouseService: ClickHouseService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureSchema();
  }

  async ensureSchema(): Promise<void> {
    await this.ensureDatabase();

    for (const statement of this.getCreateTableStatements()) {
      await this.clickHouseService.command(statement);
    }

    this.logger.log('ClickHouse analytical schema is ready.');
  }

  async truncateTables(): Promise<void> {
    for (const tableName of this.getTableNames()) {
      await this.clickHouseService.command(
        `TRUNCATE TABLE IF EXISTS ${this.getQualifiedTableName(tableName)}`
      );
    }
  }

  getTableNames(): readonly string[] {
    return ['users', 'promocodes', 'orders', 'promo_usages'] as const;
  }

  getQualifiedTableName(tableName: string): string {
    return `${this.escapeIdentifier(
      this.appConfigService.clickhouseDatabase
    )}.${this.escapeIdentifier(tableName)}`;
  }

  private async ensureDatabase(): Promise<void> {
    const adminClient = createClient({
      url: this.appConfigService.clickhouseUrl,
      username: this.appConfigService.clickhouseUser,
      password: this.appConfigService.clickhousePassword
    });

    try {
      await adminClient.command({
        query: `CREATE DATABASE IF NOT EXISTS ${this.escapeIdentifier(
          this.appConfigService.clickhouseDatabase
        )}`
      });
    } finally {
      await adminClient.close();
    }
  }

  private getCreateTableStatements(): string[] {
    const usersTable = this.getQualifiedTableName('users');
    const promocodesTable = this.getQualifiedTableName('promocodes');
    const ordersTable = this.getQualifiedTableName('orders');
    const promoUsagesTable = this.getQualifiedTableName('promo_usages');

    return [
      `CREATE TABLE IF NOT EXISTS ${usersTable} (
        user_id String,
        email String,
        first_name String,
        last_name String,
        full_name String,
        is_active UInt8,
        country LowCardinality(String),
        segment LowCardinality(String),
        total_orders_count UInt32,
        total_orders_amount Decimal(12, 2),
        total_discount_amount Decimal(12, 2),
        total_promo_usage_count UInt32,
        last_order_at Nullable(DateTime64(3)),
        created_at DateTime64(3),
        updated_at DateTime64(3)
      ) ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (is_active, created_at, user_id)`,
      `CREATE TABLE IF NOT EXISTS ${promocodesTable} (
        promocode_id String,
        code String,
        description String,
        discount_type LowCardinality(String),
        discount_value Decimal(12, 2),
        max_discount_amount Nullable(Decimal(12, 2)),
        min_order_amount Nullable(Decimal(12, 2)),
        total_usage_limit Nullable(UInt32),
        per_user_usage_limit Nullable(UInt16),
        is_active UInt8,
        date_from DateTime64(3),
        date_to DateTime64(3),
        total_usage_count UInt32,
        unique_users_count UInt32,
        total_discount_amount Decimal(12, 2),
        total_revenue_affected Decimal(12, 2),
        last_used_at Nullable(DateTime64(3)),
        created_at DateTime64(3),
        updated_at DateTime64(3)
      ) ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (is_active, code, promocode_id)`,
      `CREATE TABLE IF NOT EXISTS ${ordersTable} (
        order_id String,
        user_id String,
        user_email String,
        user_full_name String,
        amount Decimal(12, 2),
        currency LowCardinality(String),
        status LowCardinality(String),
        promocode_id Nullable(String),
        promocode_code Nullable(String),
        discount_amount Decimal(12, 2),
        final_amount Decimal(12, 2),
        applied_at Nullable(DateTime64(3)),
        created_at DateTime64(3),
        updated_at DateTime64(3)
      ) ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (created_at, order_id)`,
      `CREATE TABLE IF NOT EXISTS ${promoUsagesTable} (
        promo_usage_id String,
        used_at DateTime64(3),
        promocode_id String,
        promocode_code String,
        discount_type LowCardinality(String),
        discount_value Decimal(12, 2),
        user_id String,
        user_email String,
        user_full_name String,
        order_id String,
        order_amount Decimal(12, 2),
        discount_amount Decimal(12, 2),
        final_amount Decimal(12, 2),
        currency LowCardinality(String),
        order_created_at DateTime64(3),
        created_at DateTime64(3),
        updated_at DateTime64(3)
      ) ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (used_at, promocode_code, promo_usage_id)`
    ];
  }

  private escapeIdentifier(identifier: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
      throw new Error(`Unsafe ClickHouse identifier: ${identifier}`);
    }

    return identifier;
  }
}
