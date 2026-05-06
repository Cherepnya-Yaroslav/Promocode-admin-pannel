import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { ClickHouseClient } from '@clickhouse/client';
import { CLICKHOUSE_CLIENT } from './clickhouse.constants';

@Injectable()
export class ClickHouseService implements OnApplicationShutdown {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly client: ClickHouseClient
  ) {}

  getClient(): ClickHouseClient {
    return this.client;
  }

  async ping(): Promise<boolean> {
    const result = await this.client.ping();

    return result.success;
  }

  async command(query: string): Promise<void> {
    await this.client.command({ query });
  }

  async query<T>(
    query: string,
    queryParams?: Record<string, unknown>
  ): Promise<T[]> {
    const resultSet = await this.client.query(
      queryParams
        ? {
            query,
            format: 'JSONEachRow',
            query_params: queryParams
          }
        : {
            query,
            format: 'JSONEachRow'
          }
    );

    return resultSet.json<T>();
  }

  async insert<T extends object>(
    table: string,
    values: T[]
  ): Promise<void> {
    if (values.length === 0) {
      return;
    }

    await this.client.insert({
      table,
      values,
      format: 'JSONEachRow'
    } as never);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}
