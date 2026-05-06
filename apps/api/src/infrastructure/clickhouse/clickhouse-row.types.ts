export interface ClickHouseUserRow {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: number;
  country: string;
  segment: string;
  total_orders_count: number;
  total_orders_amount: number;
  total_discount_amount: number;
  total_promo_usage_count: number;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClickHousePromocodeRow {
  promocode_id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  total_usage_limit: number | null;
  per_user_usage_limit: number | null;
  is_active: number;
  date_from: string;
  date_to: string;
  total_usage_count: number;
  unique_users_count: number;
  total_discount_amount: number;
  total_revenue_affected: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClickHouseOrderRow {
  order_id: string;
  user_id: string;
  user_email: string;
  user_full_name: string;
  amount: number;
  currency: string;
  status: string;
  promocode_id: string | null;
  promocode_code: string | null;
  discount_amount: number;
  final_amount: number;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClickHousePromoUsageRow {
  promo_usage_id: string;
  used_at: string;
  promocode_id: string;
  promocode_code: string;
  discount_type: string;
  discount_value: number;
  user_id: string;
  user_email: string;
  user_full_name: string;
  order_id: string;
  order_amount: number;
  discount_amount: number;
  final_amount: number;
  currency: string;
  order_created_at: string;
  created_at: string;
  updated_at: string;
}
