import {
  User, Product, Category, Supplier, Customer,
  PurchaseOrder, SalesOrder, DemandForecast,
  SystemNotification, DashboardMetrics, StockMovement, AuditLogItem
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('apex_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('apex_refresh_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}${endpoint}`;
    let response: Response;

    try {
      response = await fetch(url, { ...options, headers });
    } catch (err) {
      console.warn(`API request to ${url} failed or network error.`, err);
      throw new Error(`Network connection error to backend server at ${url}`);
    }

    // Token expired? Attempt refresh once
    if (response.status === 401 && this.getRefreshToken() && !endpoint.includes('/auth/refresh/')) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          errorMsg = typeof errorJson.error.message === 'string' ? errorJson.error.message : JSON.stringify(errorJson.error.message);
        } else if (errorJson?.message) {
          errorMsg = errorJson.message;
        } else if (errorJson?.detail) {
          errorMsg = errorJson.detail;
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return response.json();
  }

  public async refreshToken(): Promise<boolean> {
    const refresh = this.getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('apex_access_token', data.access);
        return true;
      }
    } catch (_) {}
    return false;
  }

  // --- Auth Endpoints ---
  async login(username: string, password: string): Promise<{ access: string; refresh: string; user: User }> {
    const data = await this.request<{ access: string; refresh: string; user: User }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    localStorage.setItem('apex_access_token', data.access);
    localStorage.setItem('apex_refresh_token', data.refresh);
    localStorage.setItem('apex_user', JSON.stringify(data.user));
    return data;
  }

  async getCurrentUser(): Promise<{ user: User; permissions: any }> {
    return this.request('/auth/me/');
  }

  async getUsers(): Promise<User[]> {
    const res = await this.request<{ results: User[] } | User[]>('/auth/users/');
    return Array.isArray(res) ? res : res.results;
  }

  async createUser(userData: any): Promise<User> {
    return this.request('/auth/users/', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // --- Dashboard & Analytics ---
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request('/analytics/dashboard/');
  }

  async getForecasts(risk?: string, search?: string): Promise<DemandForecast[]> {
    const params = new URLSearchParams();
    if (risk) params.set('risk', risk);
    if (search) params.set('search', search);
    return this.request(`/analytics/forecasts/?${params.toString()}`);
  }

  async runDemandForecast(): Promise<any> {
    return this.request('/analytics/forecasts/run/', { method: 'POST' });
  }

  async quickReorderPO(supplierId: number, items: Array<{ product_id: number; quantity: number }>): Promise<any> {
    return this.request('/analytics/reorder/quick-po/', {
      method: 'POST',
      body: JSON.stringify({ supplier_id: supplierId, items })
    });
  }

  // --- Products & Inventory ---
  async getProducts(params?: { category?: string; search?: string }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    const res = await this.request<{ results: Product[] } | Product[]>(`/inventory/products/?${query.toString()}`);
    return Array.isArray(res) ? res : res.results;
  }

  async getProduct(id: number): Promise<Product> {
    return this.request(`/inventory/products/${id}/`);
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    return this.request('/inventory/products/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    return this.request(`/inventory/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteProduct(id: number): Promise<void> {
    return this.request(`/inventory/products/${id}/`, { method: 'DELETE' });
  }

  async adjustStock(productId: number, newQuantity: number, reason: string, notes?: string): Promise<any> {
    return this.request(`/inventory/products/${productId}/adjust_stock/`, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, new_quantity: newQuantity, reason, notes: notes || '' })
    });
  }

  async getLowStockProducts(): Promise<Product[]> {
    return this.request('/inventory/products/low_stock/');
  }

  async getCategories(): Promise<Category[]> {
    const res = await this.request<{ results: Category[] } | Category[]>('/inventory/categories/');
    return Array.isArray(res) ? res : res.results;
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    return this.request('/inventory/categories/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getStockMovements(productId?: number): Promise<StockMovement[]> {
    const query = productId ? `?product=${productId}` : '';
    const res = await this.request<{ results: StockMovement[] } | StockMovement[]>(`/inventory/movements/${query}`);
    return Array.isArray(res) ? res : res.results;
  }

  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await this.request<{ results: AuditLogItem[] } | AuditLogItem[]>('/inventory/audit-logs/');
    return Array.isArray(res) ? res : res.results;
  }

  // --- Purchase Orders ---
  async getPurchaseOrders(statusFilter?: string): Promise<PurchaseOrder[]> {
    const query = statusFilter ? `?status=${statusFilter}` : '';
    const res = await this.request<{ results: PurchaseOrder[] } | PurchaseOrder[]>(`/orders/purchases/${query}`);
    return Array.isArray(res) ? res : res.results;
  }

  async createPurchaseOrder(data: {
    supplier_id: number;
    expected_delivery_date?: string;
    notes?: string;
    items: Array<{ product_id: number; quantity: number; unit_cost?: number }>;
  }): Promise<PurchaseOrder> {
    return this.request('/orders/purchases/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async receivePurchaseOrder(id: number): Promise<any> {
    return this.request(`/orders/purchases/${id}/receive/`, { method: 'POST' });
  }

  // --- Sales Orders ---
  async getSalesOrders(statusFilter?: string): Promise<SalesOrder[]> {
    const query = statusFilter ? `?status=${statusFilter}` : '';
    const res = await this.request<{ results: SalesOrder[] } | SalesOrder[]>(`/orders/sales/${query}`);
    return Array.isArray(res) ? res : res.results;
  }

  async createSalesOrder(data: {
    customer_id: number;
    shipping_address?: string;
    notes?: string;
    items: Array<{ product_id: number; quantity: number; unit_price?: number; discount?: number }>;
  }): Promise<SalesOrder> {
    return this.request('/orders/sales/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async fulfillSalesOrder(id: number): Promise<any> {
    return this.request(`/orders/sales/${id}/fulfill/`, { method: 'POST' });
  }

  // --- Suppliers & Customers ---
  async getSuppliers(): Promise<Supplier[]> {
    const res = await this.request<{ results: Supplier[] } | Supplier[]>('/orders/suppliers/');
    return Array.isArray(res) ? res : res.results;
  }

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    return this.request('/orders/suppliers/', { method: 'POST', body: JSON.stringify(data) });
  }

  async getCustomers(): Promise<Customer[]> {
    const res = await this.request<{ results: Customer[] } | Customer[]>('/orders/customers/');
    return Array.isArray(res) ? res : res.results;
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    return this.request('/orders/customers/', { method: 'POST', body: JSON.stringify(data) });
  }

  // --- Notifications ---
  async getNotifications(): Promise<SystemNotification[]> {
    const res = await this.request<{ results: SystemNotification[] } | SystemNotification[]>('/notifications/alerts/');
    return Array.isArray(res) ? res : res.results;
  }

  async markAllNotificationsRead(): Promise<any> {
    return this.request('/notifications/alerts/mark_all_read/', { method: 'POST' });
  }

  async markNotificationRead(id: number): Promise<any> {
    return this.request(`/notifications/alerts/${id}/mark_read/`, { method: 'POST' });
  }

  // --- India Edition APIs ---
  async getCompanySettings(): Promise<any> {
    return this.request('/analytics/settings/');
  }

  async updateCompanySettings(data: any): Promise<any> {
    return this.request('/analytics/settings/', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getSupplierReliability(): Promise<any[]> {
    return this.request('/analytics/suppliers/reliability/');
  }

  async bulkUploadProducts(csvContent: string): Promise<any> {
    return this.request('/inventory/products/bulk_upload/', {
      method: 'POST',
      body: JSON.stringify({ csv_content: csvContent })
    });
  }

  async getProductQRCode(productId: number): Promise<{ product_sku: string; qr_base64: string }> {
    return this.request(`/inventory/products/${productId}/qr_code/`);
  }

  async createRazorpayOrder(orderId: number): Promise<{
    razorpay_order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    upi_intent_uri: string;
  }> {
    return this.request(`/orders/sales/${orderId}/create_razorpay_order/`, {
      method: 'POST'
    });
  }

  // --- Exports ---
  getExportCSVUrl(): string {
    return `${API_BASE}/analytics/export/csv/`;
  }

  getExportExcelUrl(): string {
    return `${API_BASE}/analytics/export/excel/`;
  }

  getExportPDFUrl(): string {
    return `${API_BASE}/analytics/export/pdf/`;
  }
}

export const api = new ApiService();

