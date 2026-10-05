export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  department?: string;
  is_active: boolean;
  is_2fa_enabled?: boolean;
  is_admin?: boolean;
  is_manager?: boolean;
  is_viewer?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  products_count?: number;
}

export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OPTIMAL' | 'OVERSTOCKED';

export interface Product {
  id: number;
  sku: string;
  name: string;
  barcode?: string;
  category: number | null;
  category_name?: string;
  description: string;
  hsn_code: string;
  gst_rate: string | number;
  unit: string;
  cost_price: string | number;
  selling_price: string | number;
  mrp: string | number;
  quantity_on_hand: number;
  min_stock_level: number;
  max_stock_level: number;
  reorder_quantity: number;
  location: string;
  batch_number?: string;
  expiry_date?: string | null;
  image_url?: string;
  is_active: boolean;
  stock_status: StockStatus;
  total_cost_value: string | number;
  total_retail_value: string | number;
  gross_margin_percent: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  product_unit: string;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'WASTE';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_price: string | number;
  reference_number: string;
  created_by_name?: string;
  timestamp: string;
  notes: string;
}

export interface Supplier {
  id: number;
  name: string;
  code: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  pan: string;
  state: string;
  lead_time_days: number;
  rating: string | number;
  reliability_score: string | number;
  payment_terms: string;
  is_active: boolean;
  orders_count?: number;
}

export interface Customer {
  id: number;
  name: string;
  code: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  pan: string;
  state: string;
  customer_type: 'RETAIL' | 'WHOLESALE' | 'CORPORATE';
  credit_limit: string | number;
  balance: string | number;
  loyalty_points: number;
  orders_count?: number;
}

export interface PurchaseOrderItem {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  product_unit: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: string | number;
  total_cost: string | number;
}

export type POStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier: number;
  supplier_name: string;
  supplier_gstin?: string;
  status: POStatus;
  ordered_date: string;
  expected_delivery_date?: string;
  received_date?: string;
  taxable_amount: string | number;
  cgst_amount: string | number;
  sgst_amount: string | number;
  igst_amount: string | number;
  is_inter_state: boolean;
  e_way_bill_number?: string;
  total_amount: string | number;
  created_by_name?: string;
  items: PurchaseOrderItem[];
  items_count?: number;
  notes: string;
  created_at: string;
}

export interface SalesOrderItem {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  product_unit: string;
  quantity: number;
  unit_price: string | number;
  discount: string | number;
  total_price: string | number;
}

export type SOStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';

export interface SalesOrder {
  id: number;
  so_number: string;
  customer: number;
  customer_name: string;
  customer_gstin?: string;
  status: SOStatus;
  payment_status: PaymentStatus;
  order_date: string;
  shipped_date?: string;
  taxable_amount: string | number;
  cgst_amount: string | number;
  sgst_amount: string | number;
  igst_amount: string | number;
  is_inter_state: boolean;
  e_way_bill_number?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  total_amount: string | number;
  created_by_name?: string;
  items: SalesOrderItem[];
  items_count?: number;
  shipping_address: string;
  notes: string;
  created_at: string;
}

export interface DemandForecast {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  product_unit: string;
  hsn_code?: string;
  category_name?: string;
  current_stock: number;
  min_stock_level: number;
  current_selling_price?: string | number;
  daily_velocity: number;
  predicted_demand_next_7_days: number;
  predicted_demand_next_30_days: number;
  predicted_demand_next_60_days: number;
  predicted_demand_next_90_days: number;
  recommended_reorder_qty: number;
  days_until_stockout: number;
  stockout_risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_score: number;
  optimal_price_recommendation?: string | number;
  potential_margin_increase_percent?: number;
  is_waste_risk?: boolean;
  waste_risk_reason?: string;
  forecast_date: string;
  last_calculated_at: string;
}

export interface SystemNotification {
  id: number;
  title: string;
  message: string;
  notification_type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ORDER_STATUS' | 'REORDER_RECOMMENDED' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  is_read: boolean;
  target_role: string;
  related_link?: string;
  created_at: string;
}

export interface DashboardMetrics {
  currency: string;
  currency_symbol: string;
  kpis: {
    total_products: number;
    total_cost_valuation: number;
    total_retail_valuation: number;
    potential_profit: number;
    monthly_revenue: number;
    monthly_expenses: number;
    pending_sales_orders: number;
    pending_purchase_orders: number;
    out_of_stock_count: number;
    low_stock_count: number;
  };
  stock_health: {
    out_of_stock: number;
    low_stock: number;
    optimal: number;
    overstocked: number;
  };
  monthly_trends: Array<{
    month: string;
    revenue: number;
    expenses: number;
  }>;
  categories: Array<{
    id: number;
    name: string;
    product_count: number;
    valuation: number;
  }>;
}

export interface AuditLogItem {
  id: number;
  user: number | null;
  user_name: string;
  action: string;
  model_name: string;
  object_id: string;
  timestamp: string;
  ip_address?: string;
  changes: Record<string, any>;
}

export interface CompanySettings {
  company_name: string;
  gstin: string;
  state: string;
  pan: string;
  address: string;
  currency: string;
  currency_symbol: string;
  phone: string;
  email: string;
  sms_gateway: string;
  payment_gateway: string;
  e_way_bill_active: boolean;
  default_gst_rate: number;
}

export interface SupplierReliabilityItem {
  id: number;
  name: string;
  code: string;
  gstin: string;
  lead_time_days: number;
  rating: number;
  reliability_score: number;
  total_orders: number;
  state: string;
}
