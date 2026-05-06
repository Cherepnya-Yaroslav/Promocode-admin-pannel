export type DiscountType = 'PERCENT' | 'FIXED';

export interface PaginatedResponse<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PromocodeRecord {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  totalUsageLimit: number | null;
  perUserUsageLimit: number | null;
  dateFrom: string;
  dateTo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'CREATED' | 'PROMOCODE_APPLIED';

export interface OrderRecord {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  promocodeId: string | null;
  promocodeCode: string | null;
  discountAmount: number;
  finalAmount: number;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromoUsageRecord {
  id: string;
  userId: string;
  orderId: string;
  promocodeId: string;
  promocodeCode: string;
  discountAmount: number;
  usedAt: string;
}

export interface ApplyPromocodeResponse {
  order: OrderRecord;
  promoUsage: PromoUsageRecord;
}
