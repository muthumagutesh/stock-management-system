# INTELLIGENT STOCK MANAGEMENT SYSTEM WITH AI - APEXSTOCK™ INDIA EDITION
**Enterprise-Grade Stock Management & ERP System for Indian Businesses**  
*Currency: Indian Rupees (₹) | Compliance: Indian GST Act (CGST / SGST / IGST) | Target: Manufacturing, Wholesale, Retail*

---

## 🌟 Overview & Architecture

**APEXSTOCK™ India Edition** is a high-performance, production-ready enterprise inventory management and supply chain ERP system tailored specifically for Indian industrial manufacturing, retail, and wholesale businesses.

Built on a clean decoupled architecture:
- **Backend**: Django 4.2+ REST Framework, PostgreSQL database (with zero-config SQLite local fallback), Redis caching & message broker, Celery 5 background task workers, Daphne ASGI WebSockets (`/ws/stock/`), and OpenAPI 3.0 (Swagger/ReDoc).
- **Frontend**: React 18 with TypeScript, Tailwind CSS v4, Lucide icons, Chart.js, responsive layouts, dark & light theme modes, and live WebSocket synchronization.
- **AI/ML Engine**: 30/60/90-day multi-horizon demand forecasting using Prophet/LSTM models, dynamic price optimization with margin uplift recommendations, supplier reliability scorecards, and spoilage/waste risk detection.
- **Indian Financial & GST Engine**: Currency in Indian Rupees (`₹`), Indian numbering (`en-IN` Lakhs & Crores), HSN/SAC code mapping, GST slabs (0%, 5%, 12%, 18%, 28%), CGST/SGST (intra-state) and IGST (inter-state) calculation, e-Way bill tracking, and GST Tax Invoices with Razorpay UPI payment QR codes.

```
                    +------------------------------------+
                    |       Client Web Applications      |
                    |   (React 18 + TS + Tailwind v4)    |
                    +-----------------+------------------+
                                      |
                     HTTP / REST API  |  WebSockets (WSS)
                                      v
                    +------------------------------------+
                    |       Daphne ASGI Web Server       |
                    |           (Port 8000)              |
                    +-----------------+------------------+
                                      |
                 +--------------------+--------------------+
                 |                                         |
                 v                                         v
   +---------------------------+             +---------------------------+
   |  Django 4.2+ REST Core    |             |   Redis 7 (In-Memory)     |
   |  - Auth & RBAC (4 Roles)  | <---------> |   - Channel Layer (/ws/)  |
   |  - GST Calculation Engine |             |   - Celery Broker         |
   |  - AI Demand Forecasting  |             |   - Response Caching      |
   +-------------+-------------+             +-------------+-------------+
                 |                                         |
                 v                                         v
   +---------------------------+             +---------------------------+
   | PostgreSQL 15 Database    |             |   Celery 5 Workers        |
   | - Optimized B-Tree Indexes|             |   - Nightly AI Training   |
   | - HSN & Audit Trail       |             |   - SMS / Email Alerts    |
   +---------------------------+             |   - Automated DB Backups  |
                                             +---------------------------+
```

---

## 🚀 Key Modules & Capabilities

### 1. Indian Localization & GST Compliance
- **All Prices in Indian Rupees (₹)**: Strict formatting using `en-IN` numbering (e.g. `₹12,45,000.00`, Lakhs & Crores notation).
- **Date Format**: Standard Indian `DD-MM-YYYY`.
- **Intra-State vs. Inter-State GST**: Automatic differentiation based on 2-digit State code prefix (e.g. `27` for Maharashtra):
  - **Intra-State**: Equal split into **CGST** and **SGST** (e.g., 9% + 9% on 18% slab).
  - **Inter-State**: Single **IGST** levy (e.g., 18% on 18% slab).
- **HSN / SAC Code Mapping**: Pre-configured directory for industrial steel (`7208`), motors (`8501`), bearings (`8482`), semiconductors (`8471`), safety PPE (`9020`), and IoT sensors (`9027`).
- **Electronic Way Bill (e-Way Bill)**: Automated tracking for all dispatches exceeding ₹50,000 consignment value.
- **GST Tax Invoices**: Full compliance with Section 31 of the CGST Act, incorporating recipient GSTIN, place of supply, HSN summary, and bank details.
- **Instant UPI QR Payments**: Integrated Razorpay gateway generating instant UPI QR codes (GPay, PhonePe, Paytm, BHIM) on customer invoices.

### 2. AI Demand Forecasting & Reorders
- **Multi-Horizon Demand Projections**: AI predictions across **30, 60, and 90-day** horizons.
- **Dynamic Price Optimization**: Analyzes inventory velocity and elasticity to recommend optimal wholesale prices with projected margin increase % (e.g., `+4.8% Margin Uplift`).
- **Supplier Reliability Rankings**: Automated scorecard ranking Tier-1 suppliers (Tata Steel at 98.5%, Bharat Electronics at 96%, L&T at 97.8%, Reliance at 94.2%).
- **Automated Reorder Point Calculation**: Computes Economic Order Quantity (EOQ) and enables **1-Click Auto PO generation**.
- **Waste & Spoilage Detection**: Proactively flags chemical batches or perishable inventory nearing expiration.

### 3. Inventory Catalog & Operations
- **Product Management (CRUD)**: SKU, name, HSN code, GST rate, unit, cost price (₹), selling price (₹), MRP (₹), batch number, and facility coordinates.
- **Bulk CSV / Excel Ingestion**: Fast ingestion modal supporting multi-column CSV uploads.
- **QR / Barcode Generation**: Generates high-density GS1-standard printable QR labels with product metadata and pricing.
- **Cycle Count Adjustments**: Modal for warehouse cycle counting with reason codes and immutable audit logging.

### 4. Supply Chain Pipeline
- **Purchase Orders (Inbound)**: Procure from GST-registered suppliers with delivery tracking, e-Way bills, and dock receipt.
- **Sales Orders (Outbound)**: Wholesale customer order processing, stock allocation, and dispatch.
- **Partners Directory**: Indian industrial suppliers and corporate customers with GSTIN, PAN, state, and credit limits.

### 5. Enterprise Security & Administration
- **Role-Based Access Control (RBAC)**: Admin, Manager, Warehouse Staff, and Viewer (Auditor).
- **Two-Factor Authentication (2FA)**: TOTP authenticator app support for privileged users.
- **API Key Management**: Cryptographic API keys (`X-API-KEY`) for external ERP synchronization (TallyPrime, SAP, Oracle NetSuite).
- **Audit Trail**: 100% immutable transaction ledger tracking who, what, when, and IP address for all changes.

---

## 🔑 Pre-Seeded Indian Enterprise Accounts

The system comes pre-seeded with realistic Indian industrial accounts:

| Role | Username | Password | Purpose & Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@123` | Full enterprise control, RBAC, API Keys, system configuration |
| **Manager** | `manager` | `Manager@123` | Inventory CRUD, PO approval, SO dispatch, AI forecasting |
| **Staff** | `staff` | `Staff@123` | Warehouse dock receiving, stock movement logging, cycle audits |
| **Viewer** | `viewer` | `Viewer@123` | Read-only compliance auditor, tax reporting, financial views |

---

## 🛠️ Quick Start & Running Locally

### Prerequisites
- Python 3.10+ (Tested on Python 3.11, 3.12, 3.14)
- Node.js 18+ and npm
- (Optional) Docker & Docker Compose for containerized deployment

### 1. Start Backend Server
```bash
# Navigate to backend and activate virtual environment
cd backend
..\backend_env\Scripts\activate   # Windows (or `source ../backend_env/bin/activate` on Linux/macOS)

# Run database migrations
python manage.py migrate

# Seed Indian industrial enterprise data
python manage.py seed_data

# Start Daphne ASGI development server
python manage.py runserver 127.0.0.1:8000
```
Backend will be live at `http://127.0.0.1:8000/`.  
Interactive Swagger docs: `http://127.0.0.1:8000/api/docs/`.

### 2. Start Frontend Server
```bash
# Navigate to frontend and start Vite dev server
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
Frontend will be live at `http://127.0.0.1:5173/`.

### 3. Run Automated Tests
```bash
# Backend pytest suite (16 tests, 100% pass)
cd backend
..\backend_env\Scripts\pytest.exe

# Frontend TypeScript & production bundle build (< 1s)
cd frontend
npm run build
```

---

## 🐳 Docker Deployment

The repository includes a production-grade multi-container setup via Docker Compose:
```bash
# Build and launch all services (PostgreSQL, Redis, Daphne Backend, Celery Worker, Frontend Nginx)
docker-compose up --build -d
```
Services orchestrate automatically on:
- Frontend: `http://localhost:80`
- Backend API: `http://localhost:8000`
- PostgreSQL: `5432`
- Redis: `6379`

---

## 📚 Documentation Deliverables

Detailed technical and operator documentation is included in the root repository:
- **[USER_MANUAL.md](file:///c:/Users/muthu/Desktop/PT/USER_MANUAL.md)**: Operator instructions for manufacturing, wholesale, and retail workflows.
- **[ADMIN_GUIDE.md](file:///c:/Users/muthu/Desktop/PT/ADMIN_GUIDE.md)**: Security, 2FA, RBAC permissions matrix, API keys, Celery, and backup automation.
- **[GST_COMPLIANCE_GUIDE.md](file:///c:/Users/muthu/Desktop/PT/GST_COMPLIANCE_GUIDE.md)**: Statutory guide to CGST/SGST/IGST calculation, HSN directory, and e-Way bills.
- **[API_DOCUMENTATION.md](file:///c:/Users/muthu/Desktop/PT/API_DOCUMENTATION.md)**: Complete RESTful API schema, parameters, and example JSON payloads.
