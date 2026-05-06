export type AnalyticsSortDirection = 'asc' | 'desc';

export interface AnalyticsListResponse<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export const userAnalyticsSortKeys = [
  'createdAt',
  'email',
  'totalOrdersCount',
  'totalOrdersAmount',
  'totalDiscountAmount',
  'totalPromoUsageCount',
  'lastOrderAt'
] as const;

export type UserAnalyticsSortKey = (typeof userAnalyticsSortKeys)[number];

export interface UserAnalyticsRow {
  userId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  country: string;
  segment: string;
  createdAt: string;
  totalOrdersCount: number;
  totalOrdersAmount: number;
  totalDiscountAmount: number;
  totalPromoUsageCount: number;
  lastOrderAt: string | null;
}

export interface UsersAnalyticsQuery {
  page: number;
  pageSize: number;
  sortBy: UserAnalyticsSortKey;
  sortDir: AnalyticsSortDirection;
  dateFrom?: string;
  dateTo?: string;
  email?: string;
  isActive?: boolean;
  country?: string;
  segment?: string;
}

export const promocodeAnalyticsSortKeys = [
  'createdAt',
  'code',
  'isActive',
  'totalUsageCount',
  'totalDiscountAmount',
  'totalRevenueAffected',
  'conversionRate',
  'dateTo'
] as const;

export type PromocodeAnalyticsSortKey =
  (typeof promocodeAnalyticsSortKeys)[number];

export interface PromocodeAnalyticsRow {
  promocodeId: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  isActive: boolean;
  dateFrom: string;
  dateTo: string;
  totalUsageCount: number;
  totalDiscountAmount: number;
  totalRevenueAffected: number;
  uniqueUsersCount: number;
  conversionRate: number;
  lastUsedAt: string | null;
}

export interface PromocodesAnalyticsQuery {
  page: number;
  pageSize: number;
  sortBy: PromocodeAnalyticsSortKey;
  sortDir: AnalyticsSortDirection;
  dateFrom?: string;
  dateTo?: string;
  code?: string;
  isActive?: boolean;
  state?: 'active' | 'inactive' | 'scheduled' | 'expired';
  discountType?: 'PERCENT' | 'FIXED';
  minUsageCount?: number;
}

export const promoUsageAnalyticsSortKeys = [
  'usedAt',
  'discountAmount',
  'orderAmount',
  'finalAmount',
  'userEmail',
  'promocodeCode'
] as const;

export type PromoUsageAnalyticsSortKey =
  (typeof promoUsageAnalyticsSortKeys)[number];

export interface PromoUsageAnalyticsRow {
  promoUsageId: string;
  usedAt: string;
  promocodeId: string;
  promocodeCode: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  orderId: string;
  orderAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  discountType: 'PERCENT' | 'FIXED';
}

export interface PromoUsagesAnalyticsQuery {
  page: number;
  pageSize: number;
  sortBy: PromoUsageAnalyticsSortKey;
  sortDir: AnalyticsSortDirection;
  dateFrom?: string;
  dateTo?: string;
  promocodeCode?: string;
  userEmail?: string;
  currency?: string;
  discountType?: 'PERCENT' | 'FIXED';
  minDiscountAmount?: number;
  maxDiscountAmount?: number;
}
