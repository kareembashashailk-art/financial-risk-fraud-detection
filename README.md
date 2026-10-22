# Financial Risk Analysis & Rule-Based Fraud Detection System

> **Academic Project Notice:** This full-stack software application was developed as a college B.Tech capstone prototype. It operates exclusively on synthetic transactions and fictional banking entities for educational and demonstration purposes. It is **not** certified for production banking, real credit-card processing, or regulatory compliance without further enterprise auditing.

---

## 1. System Overview & Objective

Modern financial institutions process millions of electronic transactions daily. Identifying potentially fraudulent activity while minimizing friction for legitimate customers requires real-time monitoring and transparent heuristics.

The **Financial Risk Analysis and Rule-Based Fraud Detection System** is an end-to-end monitoring solution that:
1. Ingests financial transactions via real-time REST API endpoints or batch CSV uploads.
2. Evaluates transactions against a modular, configurable **Rule-Based Fraud Detection Engine**.
3. Calculates a composite, capped **Risk Score (0–100)** and categorizes transactions into **Low, Medium, or High Risk**.
4. Automatically generates investigative **Alerts** for elevated-risk transactions.
5. Provides a dedicated **Analyst Investigation Workstation** with status workflows (`New` &rarr; `Under Review` &rarr; `Escalated` &rarr; `Closed`) and formal decisions (`Confirmed Suspicious`, `False Positive`, `Needs Investigation`).
6. Enforces **Role-Based Access Control (RBAC)** on the backend for Super Admins, Risk Analysts, and Read-Only Auditors.
7. Maintains an immutable **Security & Compliance Audit Trail**.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide React, Chart.js & React-ChartJS-2.
- **Backend**: Python 3.14 / Flask REST API, Flask-CORS, Flask-JWT-Extended.
- **Database ORM & Migrations**: SQLAlchemy 2.0, Flask-SQLAlchemy 3.1, Flask-Migrate 4.1 (Alembic).
- **Supported Databases**:
  - **MySQL 8.0+** via `PyMySQL` and `cryptography`.
  - **SQLite 3** automatic zero-configuration fallback for local development.
- **Data Ingestion**: Python CSV parser and Pandas for batch processing and schema validation.
- **API Documentation**: OpenAPI / Swagger UI via `flasgger` (`/apidocs`).
- **Testing**: Pytest with automated coverage for authentication, RBAC, heuristics, scoring, alert generation, and CSV import.
- **Version Control**: Git.

---

## 3. High-Level Architecture

```mermaid
flowchart TD
    subgraph Client_Tier["Client Tier (React 18 + Vite)"]
        UI["Web Browser / Dashboard UI"]
        AuthContext["Auth Context (JWT Storage)"]
        AxiosClient["Axios API Client + Interceptors"]
    end

    subgraph API_Gateway["Flask REST API Tier (Python)"]
        AuthRoutes["/api/auth (Login, Profile, Logout)"]
        TxRoutes["/api/transactions (CRUD, Batch CSV)"]
        AlertRoutes["/api/alerts (Triage, Decisions)"]
        RuleRoutes["/api/rules (Config, Parameters)"]
        DashRoutes["/api/dashboard (Stats, Charts)"]
        AuditRoutes["/api/audit-logs (Immutable Trail)"]
        RBAC["RBAC Decorator Layer (Role Enforcement)"]
    end

    subgraph Core_Services["Core Detection & Risk Services"]
        Engine["Fraud Rule Engine (Heuristics)"]
        Scorer["Risk Scoring Aggregator (0-100 Cap)"]
        AlertService["Alert Management & Duplicate Prevention"]
        CsvService["CSV Validation & Ingestion Engine"]
        AuditService["Audit Logger (Masked Credentials)"]
    end

    subgraph Data_Storage["Database Persistence Tier"]
        DB[(MySQL / SQLite Fallback)]
        Models["Users • Accounts • Transactions • Rules • Alerts • AuditLogs"]
    end

    UI --> AxiosClient
    AxiosClient -->|Bearer JWT| RBAC
    RBAC --> AuthRoutes & TxRoutes & AlertRoutes & RuleRoutes & DashRoutes & AuditRoutes
    TxRoutes & AlertRoutes --> Engine
    Engine --> Scorer
    Scorer --> AlertService
    AlertService --> DB
    TxRoutes & RuleRoutes & AlertRoutes --> AuditService
    AuditService --> DB
    AuthRoutes & TxRoutes & AlertRoutes & RuleRoutes & DashRoutes --> Models
    Models --> DB
```

---

## 4. Role-Based Access Control (RBAC) Matrix

Role permissions are strictly enforced on the Flask backend, not just hidden in the user interface:

| Capability | Super Admin | Risk Analyst | Read-Only Viewer |
| :--- | :---: | :---: | :---: |
| View Dashboard Stats & Visual Charts | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Search & Filter Transactions | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| View Triggered Rule Breakdown | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Simulate Live Transaction | :white_check_mark: | :white_check_mark: | :x: |
| Batch CSV Upload | :white_check_mark: | :white_check_mark: | :x: |
| Assign / Reassign Alerts | :white_check_mark: | :white_check_mark: | :x: |
| Update Alert Status & Record Decisions | :white_check_mark: | :white_check_mark: | :x: |
| Toggle Rules (Activate/Deactivate) | :white_check_mark: | :x: | :x: |
| Edit Rule Weights & Thresholds | :white_check_mark: | :x: | :x: |
| Create New Custom Detection Rules | :white_check_mark: | :x: | :x: |
| Manage System Users & Reviewers | :white_check_mark: | :x: | :x: |
| View Regulatory Audit Logs | :white_check_mark: | :white_check_mark: | :x: |

---

## 5. Fraud Detection Rules & Scoring Algorithm

### Detection Rules

1. **Rule 1: High Transaction Amount (`RULE_HIGH_AMOUNT`)**
   - **Logic:** Flags transactions where `amount >= threshold_amount` (Default: `$5,000.00`).
   - **Weight:** 60 pts.
2. **Rule 2: Rapid Velocity (`RULE_RAPID_VELOCITY`)**
   - **Logic:** Flags accounts executing $\ge 3$ transactions within a configurable time window (Default: 300 seconds / 5 minutes).
   - **Weight:** 35 pts.
3. **Rule 3: Unusual Transaction Frequency (`RULE_TX_FREQUENCY`)**
   - **Logic:** Flags accounts initiating $\ge 5$ transactions within 1 hour.
   - **Weight:** 25 pts.
4. **Rule 4: Repeated Failed Transactions (`RULE_REPEATED_FAILED`)**
   - **Logic:** Flags accounts with $\ge 2$ failed transaction attempts within 30 minutes (identifies card testing and brute force authorization).
   - **Weight:** 30 pts.
5. **Rule 5: Unusual Location & Velocity (`RULE_UNUSUAL_LOCATION`)**
   - **Logic:**
     - High-Risk Jurisdiction: Matches origin against configured watchlists (`Tor Exit Node`, `Sanctioned Region`, `Proxy`).
     - Impossible Travel Velocity: Detects successive transactions across different cities or countries within an impossible time window (e.g. 2 hours).
     - *Missing Location Data:* Does **not** infer fraud when location is empty or absent.
   - **Weight:** 35 pts.
6. **Rule 6: High-Risk Merchant Category (`RULE_RESTRICTED_CATEGORY`)**
   - **Logic:** Flags transactions initiated in elevated-risk industries (e.g. unregulated crypto exchange, offshore gambling).
   - **Weight:** 25 pts.

### Risk Scoring Aggregation

$$\text{Raw Score} = \sum_{i \in \text{Unique Triggered Rules}} \text{Weight}_i$$

$$\text{Final Risk Score} = \min(100, \max(0, \text{Raw Score}))$$

- **Deduplication:** A rule triggered multiple times during a single transaction evaluation is only counted once to prevent artificial score inflation.
- **Risk Tiers:**
  - **Low Risk:** 0 – 29
  - **Medium Risk:** 30 – 59
  - **High Risk:** 60 – 100 *(Automatically triggers an investigative Alert)*

---

## 6. Installation & Quickstart Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.10, 3.11, 3.12, 3.14)
- Node.js 18+ and npm 9+
- Optional: MySQL Server 8.0+ (if omitted, SQLite zero-configuration runs automatically)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd financial-risk-fraud-detection
```

### Step 2: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python3 -m venv ../venv
source ../venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

*(Optional: If running with MySQL, update `DATABASE_URL` in `backend/.env`)*:
```env
DATABASE_URL=mysql+pymysql://username:password@127.0.0.1:3306/financial_risk_db
```

### Step 3: Seed Demonstration Database
Run the deterministic seed script to populate fictional accounts, detection rules, 14-day transaction history, and example alerts:
```bash
python seed.py
```

### Step 4: Start Backend REST API Server
```bash
python run.py
```
*Backend API will run at `http://127.0.0.1:5000`.*
*Interactive Swagger documentation available at: `http://127.0.0.1:5000/apidocs`.*

### Step 5: Frontend Setup & Startup
In a separate terminal:
```bash
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```
*Frontend application will be accessible at: `http://localhost:5173`.*

---

## 7. Demo User Credentials

The application comes pre-seeded with 3 user accounts covering every RBAC level:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `AdminPassword123!` | System configuration, rule adjustments, user administration, full audit access |
| **Risk Analyst** | `analyst` | `AnalystPassword123!` | Investigating alerts, recording decisions, simulated transactions, CSV batch import |
| **Auditor / Read-Only** | `viewer` | `ViewerPassword123!` | Viewing permitted dashboard charts, transaction logs (all mutation controls disabled) |

*The login screen includes 1-click credential buttons for rapid evaluation.*

---

## 8. Batch CSV Import Format

A sample CSV file is provided in the root directory: [`sample_transactions.csv`](sample_transactions.csv).

### Required Columns:
- `account_id` (e.g. `ACC-001`)
- `amount` (e.g. `150.00` or `12500.00`)
- `timestamp` (format: `YYYY-MM-DD HH:MM:SS` or ISO-8601)

### Optional Columns:
- `transaction_id` (auto-generated if omitted)
- `currency` (default: `USD`)
- `merchant_name`
- `merchant_category` (`groceries`, `retail`, `crypto`, `gambling`, etc.)
- `channel` (`online`, `in_store`, `atm`, `wire`)
- `status` (`completed`, `failed`, `pending`)
- `location` (e.g. `Seattle, US` or `Tor Exit Node`)
- `ip_address`

---

## 9. Automated Testing Suite

Comprehensive Pytest test cases are located in `backend/tests/`:

```bash
cd backend
source ../venv/bin/activate
PYTHONPATH=. pytest tests/ -v
```

### Test Coverage Highlights:
- **`test_auth.py`**: Authentication token issuance, invalid password rejection, profile endpoint, password hashing security.
- **`test_rbac.py`**: Backend role enforcement (Super Admin vs Analyst vs Read-Only).
- **`test_rules_engine.py`**: Unit tests for all detection rules (High Amount, Rapid Velocity, Frequency, Failed Attempts, Location watchlists, Impossible Travel, Restricted Category).
- **`test_scoring.py`**: Weight summation, 100-point ceiling cap, rule trigger deduplication, threshold partition validation.
- **`test_alerts.py`**: Automated alert generation on High Risk, duplicate prevention, status transitions, review notes, immutable history.
- **`test_csv_import.py`**: Header validation, data type enforcement, duplicate ID rejection, alert generation from imported rows.
- **`test_dashboard.py`**: Summary card metrics and 14-day chart aggregation without hardcoded placeholders.

---

## 10. Known Limitations & Future Scope

### Limitations of Current Prototype:
1. **Rule Engine Architecture:** The rule engine evaluates individual heuristics sequentially. While highly explainable and transparent, it does not currently compute multi-dimensional statistical machine-learning embeddings.
2. **IP Geolocation:** Location matching currently relies on supplied location tags (city, country, network tag) rather than a live MaxMind GeoIP2 binary database lookup.
3. **Session Revocation:** JWT tokens are validated statelessly using cryptographic signatures. A production enhancement would incorporate a Redis blocklist for instant single-token revocation.

### Future Scope:
- Integration of supervised ML models (e.g. XGBoost, Isolation Forest) alongside rule-based heuristics for hybrid risk scoring.
- Real-time Kafka / RabbitMQ streaming pipeline for high-throughput transaction processing.
- Graph database integration (Neo4j) to uncover multi-account fraud rings and money laundering structuring (smurfing).
