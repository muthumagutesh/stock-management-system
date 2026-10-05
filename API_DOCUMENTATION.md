# ApexStock™ RESTful API Reference

Base URL: `http://localhost:8000/api`  
Interactive Swagger UI: `http://localhost:8000/api/docs/`  
Redoc: `http://localhost:8000/api/redoc/`  
OpenAPI JSON Schema: `http://localhost:8000/api/schema/`

---

## 1. Authentication (`/api/auth/`)

### `POST /api/auth/login/`
Obtains JWT Access and Refresh tokens.
- **Request:**
  ```json
  {
    "username": "admin",
    "password": "Admin@123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access": "<JWT_ACCESS_TOKEN>",
    "refresh": "<JWT_REFRESH_TOKEN>",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@apexstock.io",
      "role": "ADMIN",
      "first_name": "Eleanor",
      "last_name": "Vance"
    }
  }
  ```

### `POST /api/auth/refresh/`
Refreshes expired access token.

### `GET /api/auth/me/`
Returns current user profile and RBAC permissions.

### `GET /api/auth/users/` (Admin only)
Lists all operator accounts.

### `POST /api/auth/users/` (Admin only)
Provisions a new operator with assigned role (`ADMIN`, `MANAGER`, `STAFF`).

---

## 2. Inventory & Catalog (`/api/inventory/`)

### `GET /api/inventory/products/`
List products with filtering by category, search query, and stock status.
- **Query Parameters:**
  - `search`: Filter by name, SKU, or barcode.
  - `category`: Filter by category ID.
  - `is_active`: Filter by active state.

### `POST /api/inventory/products/` (Admin, Manager)
Creates a new catalog item.

### `GET /api/inventory/products/{id}/`
Retrieves single product details.

### `POST /api/inventory/products/{id}/adjust_stock/`
Performs an audit-logged physical stock adjustment.
- **Request:**
  ```json
  {
    "product_id": 1,
    "new_quantity": 45,
    "reason": "Cycle Count Discrepancy Correction",
    "notes": "Verified on Aisle 3"
  }
  ```

### `GET /api/inventory/products/low_stock/`
Retrieves all products where `quantity_on_hand <= min_stock_level`.

### `GET /api/inventory/movements/`
Lists immutable stock movement history (`IN`, `OUT`, `ADJUSTMENT`, `RETURN`).

### `GET /api/inventory/audit-logs/`
Lists system audit logs with JSON diffs.

---

## 3. Orders Management (`/api/orders/`)

### `GET /api/orders/purchases/`
Lists supplier purchase orders.

### `POST /api/orders/purchases/`
Creates a new purchase order with multi-line items.
- **Request:**
  ```json
  {
    "supplier_id": 1,
    "expected_delivery_date": "2026-10-15",
    "notes": "Fast-track delivery",
    "items": [
      { "product_id": 1, "quantity": 30, "unit_cost": 145.00 }
    ]
  }
  ```

### `POST /api/orders/purchases/{id}/receive/`
Atomically marks purchase order as received, increments product stock levels, and records `StockMovement` (type `IN`).

### `GET /api/orders/sales/`
Lists customer sales orders.

### `POST /api/orders/sales/`
Creates a sales order with real-time stock validation.
- **Request:**
  ```json
  {
    "customer_id": 1,
    "shipping_address": "Austin Gigafactory Bay 4",
    "notes": "Expedited dispatch",
    "payment_status": "PAID",
    "items": [
      { "product_id": 2, "quantity": 5, "unit_price": 790.00, "discount": 0.0 }
    ]
  }
  ```

### `POST /api/orders/sales/{id}/fulfill/`
Atomically dispatches sales order, reduces on-hand product stock, and records `StockMovement` (type `OUT`).

---

## 4. Analytics & AI Forecasting (`/api/analytics/`)

### `GET /api/analytics/dashboard/`
Returns aggregated executive KPIs, valuation totals, monthly revenue/expense trends, and stock health breakdown.

### `GET /api/analytics/forecasts/`
Returns AI demand forecasting predictions with daily sales velocity, 7-day/30-day demand, and risk ratings.

### `POST /api/analytics/forecasts/run/`
Triggers immediate batch recalculation of AI forecasting models.

### `POST /api/analytics/reorder/quick-po/`
Auto-generates draft purchase orders based on AI recommendations.

### `GET /api/analytics/export/csv/`
Streams RFC 4180 CSV inventory valuation report.

### `GET /api/analytics/export/excel/`
Streams styled OpenPyXL `.xlsx` spreadsheet.

### `GET /api/analytics/export/pdf/`
Streams ReportLab PDF inventory valuation report.

---

## 5. Real-Time WebSockets (`/ws/stock/`)

Connecting to `ws://localhost:8000/ws/stock/` streams real-time events:
- `product_created`
- `product_updated`
- `stock_level_changed`
- `po_created`
- `po_received`
- `so_created`
- `so_fulfilled`
- `forecast_updated`
