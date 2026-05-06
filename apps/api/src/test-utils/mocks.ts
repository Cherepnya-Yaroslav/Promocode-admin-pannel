type RedisClientMethods = 'get' | 'set' | 'scan' | 'del' | 'eval' | 'ping' | 'connect';
type ClickHouseClientMethods = 'query' | 'command' | 'insert' | 'ping' | 'close';

export type MockRedisClient = Record<RedisClientMethods, jest.Mock>;
export type MockClickHouseClient = Record<ClickHouseClientMethods, jest.Mock>;

export function mockRedisClient(): MockRedisClient {
  return {
    get: jest.fn(),
    set: jest.fn(),
    scan: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
    ping: jest.fn(),
    connect: jest.fn()
  };
}

export function mockClickHouseClient(): MockClickHouseClient {
  return {
    query: jest.fn(),
    command: jest.fn(),
    insert: jest.fn(),
    ping: jest.fn(),
    close: jest.fn()
  };
}
