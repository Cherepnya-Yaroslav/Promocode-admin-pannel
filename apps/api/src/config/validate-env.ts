const requiredVariables = [
  'MONGO_URI',
  'CLICKHOUSE_URL',
  'CLICKHOUSE_USER',
  'CLICKHOUSE_DATABASE',
  'REDIS_URL',
  'JWT_SECRET'
] as const;

type EnvironmentRecord = Record<string, string | undefined>;

function assertPort(portValue: string | undefined): number {
  const parsedPort = Number(portValue ?? '3000');

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error('PORT must be a positive integer.');
  }

  return parsedPort;
}

export function validateEnv(env: EnvironmentRecord): EnvironmentRecord {
  for (const variableName of requiredVariables) {
    if (!env[variableName]) {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  assertPort(env.PORT);

  return env;
}
