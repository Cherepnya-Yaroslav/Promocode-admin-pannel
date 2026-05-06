export default (): Record<string, string | number> => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  swaggerPath: process.env.SWAGGER_PATH ?? 'api/v1/docs',
  corsOrigins:
    process.env.CORS_ORIGINS ??
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174',
  mongoUri:
    process.env.MONGO_URI ??
    'mongodb://promocode:promocode@mongo:27017/promocode-manager?authSource=admin',
  clickhouseUrl: process.env.CLICKHOUSE_URL ?? 'http://clickhouse:8123',
  clickhouseUser: process.env.CLICKHOUSE_USER ?? 'promocode',
  clickhousePassword: process.env.CLICKHOUSE_PASSWORD ?? 'promocode',
  clickhouseDatabase: process.env.CLICKHOUSE_DATABASE ?? 'promocode_manager',
  redisUrl: process.env.REDIS_URL ?? 'redis://redis:6379',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-stage-4'
});
