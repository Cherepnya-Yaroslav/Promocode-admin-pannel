import { SetMetadata } from '@nestjs/common';
import type { RateLimitOptions } from './rate-limit.types';

export const RATE_LIMIT_METADATA_KEY = 'rate_limit_options';

export const RateLimit = (options: RateLimitOptions): MethodDecorator =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, options);
