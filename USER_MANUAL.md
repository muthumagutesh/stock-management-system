# APEXSTOCK™ INDIA EDITION - USER MANUAL
**Intelligent Stock Management System with AI for Indian Enterprises**  
*Currency: Indian Rupees (₹) | Compliance: Indian GST Act (CGST / SGST / IGST)*

---

## 1. Introduction & Overview

**APEXSTOCK™ India Edition** is an enterprise-grade, high-performance intelligent inventory and supply chain management system tailored specifically for Indian manufacturing, retail, and wholesale enterprises.

### Core Capabilities:
- **Indian Rupee (₹) & Numbering Format**: Built-in support for Indian numbering system (`en-IN`), displaying financial valuations and transaction summaries in Lakhs (L) and Crores (Cr).
- **GST Compliance Engine**: Automated calculation of CGST (Central Tax), SGST (State Tax), and IGST (Integrated Tax for inter-state shipments), with HSN/SAC code validation and e-Way bill tracking.
- **AI-Powered Predictive Replenishment**: Statistical and Prophet/LSTM demand forecasting across 30, 60, and 90-day horizons, automated Economic Order Quantity (EOQ) reorder points, dynamic price optimization, and supplier reliability ranking.
- **Real-Time WebSocket Sync**: Live inventory tracking across distributed warehouse docks (Pune, Mumbai, Bengaluru, Chennai) powered by Django Channels & Daphne ASGI.
- **Multi-Channel Payments**: Razorpay India integration with instant UPI QR codes (Google Pay, PhonePe, Paytm, BHIM) and NEFT/RTGS bank details on tax invoices.

---

## 2. Getting Started & Operator Login

### 2.1 Accessing the Application
- **Frontend Web Application**: `http://localhost:5173/`
- **Backend API & Swagger Docs**: `http://localhost:8000/api/docs/`
- **ReDoc Documentation**: `http://localhost:8000/api/redoc/`

### 2.2 Default Role-Based Access Accounts

| Role | Username | Password | Purpose & Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@123` | Full enterprise control, RBAC, API Keys, system configuration |
| **Manager** | `manager` | `Manager@123` | Inventory CRUD, PO approval, SO dispatch, AI forecasting |
| **Staff** | `staff` | `Staff@123` | Warehouse dock receiving, stock movement logging, cycle audits |
| **Viewer** | `viewer` | `Viewer@123` | Read-only compliance auditor, tax reporting, financial views |

> **Role Switcher**: Use the quick role toggle located on the top right navigation bar to instantly switch between operator accounts during operations or testing.

---

## 3. Executive Command Center (Dashboard)

The Dashboard provides executive management with a real-time snapshot of the company's financial and physical inventory health:
- **Total Stock Valuation (₹)**: Current procurement cost valuation and potential retail revenue.
- **30-Day Sales Revenue (₹)**: Monthly customer order inflows vs. procurement outflow.
- **Stock Warnings**: Real-time counter of Out of Stock items and Low Stock warnings.
- **Pipeline Orders**: Pending customer sales dispatches and incoming supplier purchase orders.
- **Financial Performance Graph**: Dual-bar comparison of monthly sales revenue vs. procurement outlays in ₹.
- **Inventory Health Breakdown**: Doughnut chart categorizing items into Optimal, Low Stock Alert, Out of Stock, and Overstocked.

---

## 4. Product Catalog & Inventory Management

### 4.1 Viewing Catalog SKUs
Navigate to **Inventory & Products** from the sidebar. Each product row displays:
- **SKU & Description**: Unique stock keeping unit, lot/batch number, and warehouse bay/shelf.
- **HSN / SAC Code**: Harmonized System Nomenclature (e.g., `8501`, `7208`, `8471`).
- **GST Rate Badge**: Applicable tax slab (`0%`, `5%`, `12%`, `18%`, `28%`).
- **Stock Level & Unit**: On-hand quantity, unit of measurement (`pcs`, `MT`, `kg`, `meters`), and minimum safety threshold.
- **Pricing Breakdown**: Procurement Cost (₹), Selling Price (₹), and Total Inventory Value (₹).

### 4.2 Adding a Product
1. Click **Add Product** on the top right.
2. Enter the Product SKU, Name, and Warehouse Facility location.
3. Select or enter the **HSN/SAC Code** and select the applicable **GST Slab** (`18% GST Standard`).
4. Set the **Cost Price (₹)**, **Selling Price (₹)**, and **MRP (₹)**.
5. Specify the initial quantity, alert threshold, and AI reorder quantity target.
6. Click **Register Product**. The product is immediately broadcast to all active clients via WebSockets.

### 4.3 Bulk Ingestion (CSV / Excel)
1. Click **Bulk CSV Import** in the inventory toolbar.
2. Select your `.csv` file or paste raw CSV text containing headers: `sku, name, category, cost_price, selling_price, hsn_code, gst_rate, quantity, reorder_level, location`.
3. Click **Ingest Catalog**. The system validates all rows and provides a summary of created and updated SKUs.

### 4.4 Printing Industrial SKU QR Labels
1. Click the **QR Code** icon next to any product in the inventory table.
2. A high-density QR tag is rendered containing the SKU, HSN code, MRP, selling price, and warehouse facility coordinates.
3. Click **Print Tag** for thermal barcode label printing or **Save PNG** for digital archival.

---

## 5. Supplier Purchase Orders (PO)

### 5.1 Issuing a Purchase Order
1. Navigate to **Purchase Orders** and click **Issue Purchase Order**.
2. Select an authorized Indian supplier (e.g., *Tata Steel*, *Bharat Electronics Ltd*, *L&T*, *Reliance*). The supplier's GSTIN and state are automatically loaded.
3. Add line items and specify quantities. The system automatically calculates:
   - **Taxable Value (₹)**
   - **CGST (9%) + SGST (9%)** for intra-state suppliers (Maharashtra).
   - **IGST (18%)** for inter-state suppliers (e.g., Karnataka, Jharkhand, Gujarat).
   - **Total Inbound Amount (₹)**
4. Click **Create Purchase Order**. Status defaults to `ORDERED`.

### 5.2 Receiving Stock at Warehouse Docks
1. When goods arrive at the warehouse dock with the supplier's delivery challan and e-Way bill, locate the order under **Inbound / In Transit**.
2. Click **Receive Stock**.
3. Confirm the receipt dialog. The system will:
   - Mark the PO status as `RECEIVED`.
   - Automatically increment the product's on-hand quantity.
   - Record an immutable `IN` stock movement in the audit trail.
   - Broadcast live stock level updates to all active sessions.

---

## 6. Customer Sales Orders & GST Tax Invoices

### 6.1 Creating a Sales Order
1. Navigate to **Sales & Invoices** and click **Create Sales Order**.
2. Select the B2B customer (e.g., *Maruti Suzuki*, *Mahindra & Mahindra*, *Tata Motors*, *BHEL*).
3. Add items and specify wholesale quantities and trade discounts.
4. The system validates inventory availability and calculates taxable value, CGST/SGST/IGST, and grand total in ₹.
5. Click **Create Sales Order**.

### 6.2 Generating & Printing GST Tax Invoices
1. Click the **GST Invoice** button on any sales order card.
2. A standard GST Tax Invoice is displayed complying with Section 31 of the CGST Act, 2017:
   - **Original for Recipient** header.
   - Supplier GSTIN (`27AAACA9999P1Z8`), PAN, and State code.
   - Customer GSTIN, Place of Supply, and e-Way bill number.
   - HSN summary table with tax breakdown.
   - Bank NEFT/RTGS details (ICICI Bank).
   - Authorized signatory box.
3. Click **Print / Save PDF** to generate an official customer tax invoice.

### 6.3 Instant UPI / Razorpay Payment Collection
1. On the GST Tax Invoice modal, click **UPI / Razorpay**.
2. The system triggers the backend Razorpay integration and generates an instant payment intent link and UPI VPA (`upi://pay?pa=apexstock@icici&pn=...`).
3. Customers can scan and pay instantly via Google Pay, PhonePe, Paytm, or BHIM UPI.

---

## 7. AI Demand Forecasting & Reorder Engine

Navigate to **AI Demand Forecast** to access machine-learning inventory predictions:

### 7.1 Demand Horizons (30 / 60 / 90 Days)
- **Daily Sales Velocity**: Statistical rate of stock consumption.
- **Multi-Horizon Predictions**: Projected demand for the next 30, 60, and 90 days.
- **Stockout Risk Rating**: Real-time evaluation (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **1-Click Auto PO**: Click **Auto PO** to generate an automated purchase order draft matching the AI's Recommended Reorder Quantity.

### 7.2 AI Price Optimization
- Compares current selling prices against turnover elasticity to identify optimal prices.
- Displays the projected profit margin increase percentage (e.g., `+4.8% Margin Uplift`).

### 7.3 Supplier Reliability Scorecard
- Evaluates Tier-1 suppliers on delivery speed, GST invoice accuracy, and order fulfillment.
- Ranks suppliers by reliability score (e.g., Tata Steel at 98.5%, Larsen & Toubro at 97.8%).

### 7.4 Waste & Expiry Detection
- Scans inventory batches with calibration or expiration dates to prevent scrap and wastage.

---

## 8. Reports & Analytics Export

Navigate to **Analytics & Reports** to download enterprise financial data:
- **Excel Spreadsheet (`.xlsx`)**: Full inventory audit ledger with HSN codes, GST rates, unit costs, and valuations.
- **CSV Data (`.csv`)**: Raw structured transaction logs for import into ERP systems (TallyPrime, SAP, Oracle NetSuite).
- **Executive PDF Report (`.pdf`)**: Formatted executive report with financial tables and signatures.
