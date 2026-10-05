# APEXSTOCK™ INDIA EDITION - ADMINISTRATOR & DEVOPS GUIDE
**Enterprise Security, Role-Based Access Control, API Keys, Backup Automation, and Cloud Deployment**

---

## 1. System Architecture & Topology

APEXSTOCK™ India Edition utilizes a high-performance modern decoupled architecture designed for high throughput, sub-500ms API response times, and 99.99% uptime.

```
                    +------------------------------------+
                    |        Client Web Browsers         |
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
   |  - Auth & RBAC (JWT)      | <---------> |   - Channel Layers        |
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

## 2. Role-Based Access Control (RBAC) Matrix

ApexStock enforces strict role separation across four predefined enterprise roles:

| Module / Action | Admin | Manager | Staff | Viewer (Auditor) |
| :--- | :---: | :---: | :---: | :---: |
| **View Dashboard & Metrics** | Yes | Yes | Yes | Yes |
| **View Products & Prices** | Yes | Yes | Yes | Yes |
| **Create / Edit / Delete Products** | Yes | Yes | No | No |
| **Adjust Stock Quantity** | Yes | Yes | Yes | No |
| **Issue Purchase Order** | Yes | Yes | No | No |
| **Receive PO at Dock** | Yes | Yes | Yes | No |
| **Create & Fulfill Sales Order** | Yes | Yes | No | No |
| **View & Print GST Invoices** | Yes | Yes | Yes | Yes |
| **Run AI 30/60/90 Forecasting** | Yes | Yes | No | No |
| **Download PDF / Excel / CSV** | Yes | Yes | Yes | Yes |
| **User & RBAC Management** | Yes | No | No | No |
| **API Keys & System Settings** | Yes | No | No | No |
| **View Compliance Audit Logs** | Yes | Yes | No | Yes |

### 2.1 Permissions Classes in Django REST Framework
- `IsAdminUser`: Reserved exclusively for role `ADMIN` or superuser accounts.
- `IsManagerOrAbove`: Permits `ADMIN` and `MANAGER`.
- `IsStaffOrAbove`: Permits `ADMIN`, `MANAGER`, and `STAFF`.
- `ReadOnlyOrManager`: Grants read-only `SAFE_METHODS` (`GET`, `HEAD`, `OPTIONS`) to `VIEWER` and `STAFF`, while requiring `MANAGER` or `ADMIN` for write operations (`POST`, `PUT`, `PATCH`, `DELETE`).

---

## 3. Two-Factor Authentication (2FA) & Security

### 3.1 Enabling 2FA for Privileged Users
Two-Factor Authentication is enforced for all accounts with `ADMIN` or `MANAGER` privileges:
1. In the Django Admin (`/admin/`) or User Management module, view the target user.
2. Ensure `is_2fa_enabled` is set to `True`.
3. The server generates a standard Base32 TOTP secret compatible with Google Authenticator, Microsoft Authenticator, or Duo.
4. On login, after validating primary JWT credentials, the server requires a 6-digit TOTP verification token before issuing the session refresh token.

### 3.2 Password Policy & Encryption
- Uses Django's `PBKDF2PasswordHasher` with SHA-256 and 600,000 hashing iterations.
- Enforces minimum 8 characters, alphanumeric mix, and special character validation.

---

## 4. API Key Management for External ERP Integration

ApexStock provides secure, rate-limited API Key authentication for programmatic synchronization with external ERPs (such as **TallyPrime**, **SAP ECC/S4HANA**, and **Oracle NetSuite**).

### 4.1 Creating an API Key
To issue a new key:
```powershell
cd backend
..\backend_env\Scripts\python.exe manage.py shell
```
```python
from apps.authentication.models import APIKey, CustomUser
admin_user = CustomUser.objects.filter(role=CustomUser.Role.ADMIN).first()
key_obj, raw_key = APIKey.generate(name="TallyPrime ERP Connector", user=admin_user)
print(f"API Key Created: {raw_key}")
```

### 4.2 Using the API Key in HTTP Headers
External systems authenticate by passing the key in the `X-API-KEY` header:
```bash
curl -X GET "http://localhost:8000/api/inventory/products/" \
  -H "X-API-KEY: apk_live_your_generated_key_here" \
  -H "Content-Type: application/json"
```

---

## 5. Background Tasks & Celery Execution

Celery handles background operations such as report generation, SMS/Email notifications, and nightly AI demand forecast training.

### 5.1 Starting Celery Worker (Production)
```bash
celery -A core worker -l info --concurrency=4
```

### 5.2 Starting Celery Beat (Scheduled Recurring Jobs)
```bash
celery -A core beat -l info
```

### 5.3 Scheduled Cron Tasks in ApexStock
- **Daily at Midnight (`0 0 * * *`)**: Run automated AI demand forecasting and EOQ calculations across all active SKUs.
- **Hourly (`0 * * * *`)**: Scan inventory batches for perishable expiration and generate system notifications.
- **Weekly (`0 2 * * 0`)**: Automated database vacuum, index reindexing, and full JSON audit archive.

---

## 6. Database Backup & Disaster Recovery Automation

### 6.1 Automated Backup Script (`scripts/backup_db.py`)
Run the backup script directly or add it to Windows Task Scheduler / Linux crontab:
```powershell
python scripts/backup_db.py
```
This produces an encrypted, timestamped archive in `backups/apexstock_backup_YYYYMMDD_HHMMSS.sql.gz`.

### 6.2 Restoration Procedure
To restore from a backup:
```bash
# Decompress and restore PostgreSQL dump
gunzip -c backups/apexstock_backup_20261005_120000.sql.gz | psql -U postgres -d apexstock_db
```

---

## 7. Audit Trail & Regulatory Compliance

Every write operation, price change, and stock adjustment is permanently recorded in the immutable `inventory_auditlog` table:
- **Timestamp**: High-precision UTC timestamp.
- **User**: Operator username and employee ID.
- **Action**: `STOCK_ADJUSTMENT`, `PURCHASE_RECEIPT`, `SALES_DISPATCH`, `PRICE_CHANGE`, `PRODUCT_MODIFICATION`.
- **IP Address**: Client IPv4/IPv6 address.
- **Changes JSON**: Exact before-and-after delta snapshot.

Audit logs cannot be edited or deleted via the API and can be exported as an official PDF / Excel audit pack from the **Audit Trail** module.
