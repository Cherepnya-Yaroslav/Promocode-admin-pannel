export type RateLimitSubject =
  | 'ip'
  | 'login-email-and-ip'
  | 'authenticated-user-and-order';

export interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  ttlSeconds: number;
  subject: RateLimitSubject;
  message: string;
}

export interface RateLimitDecision {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  retryAfterSeconds: number;
}
