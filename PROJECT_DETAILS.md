# Apartment SaaS — Project Details & Latest Implementation

> Comprehensive technical analysis of `D:\Practice\apartment-saas`
> Updated: 2026-10-12 · reflects the latest meters / utility-scope / tenancy / maintenance features
> Commit: `fb3291f` — docs: update PROJECT_ANALYSIS.md for meter master, utility scope, tenancy/maintenance, nominal charges
> Feature commit: `8679d18` — feat: meter master, PUBLIC/PRIVATE utility scope, tenancy type + maintenance, nominal flat charges

---

## 1. Executive Summary

**Apartment SaaS** (branded *ApartmentOS*) is a multi-tenant, subscription-based property & rental management platform for the **Indian apartment-owner market** (INR billing, Razorpay, Gmail reminders).

Owners manage organizations, apartments, flats, tenants (tenancies), rent collection, electricity/water meter readings, utility bills, expenses, P&L/ROI, email reminders, Excel import and subscription plans. Tenants get a read-only portal for rent history and meter readings.

**Recent additions:** meter master with PUBLIC/PRIVATE utility scope (tenant-paid vs owner-collected), tenancy type (RENTAL/LEASE) + monthly maintenance amount, nominal fixed electricity/water charges for flats without meters, common-area meter split mode (EQUAL/MANUAL), and an owner-only maintenance-coverage view.

**Earlier additions:** meter paid/unpaid status, rent Water+Maintenance line items, a Utility Bills register that auto-creates linked Expenses, owner/common-area electricity readings (also → Expense), per-flat water meter readings, and a maintenance-share suggestion that prefills rent collection.

---

## 2. Technology Stack

### Backend (`backend/pom.xml`)
| Area | Technology |
|---|---|
| Framework | Spring Boot **4.0.8**, Java **21** (virtual threads) |
| Persistence | Spring Data JPA + Hibernate 7.2.24 (`ddl-auto: validate`) |
| DB | MySQL **8.4** (`com.mysql:mysql-connector-j`) |
| Migrations | **Liquibase** (`spring-boot-starter-liquibase`), DB-agnostic XML |
| Security | Spring Security + OAuth2 Client, JJWT 0.12.6 |
| Caching | Spring Cache + Caffeine |
| Mail | Spring Mail + Gmail API |
| Excel | Apache POI 5.3.0 | PDF | OpenPDF 2.0.3 | Payments | Razorpay Java SDK 1.4.7 |

### Frontend (`frontend/package.json`)
Next.js **14.2.15** (App Router), React 18.3.1, TypeScript 5.6, Tailwind CSS 3.4 + `tailwindcss-animate`, Radix UI, lucide-react, Recharts 2.13, Axios 1.7, sonner, next-themes, framer-motion, date-fns.

---

## 3. Repository Layout

```
apartment-saas/
├── PROJECT_ANALYSIS.md                 # earlier analysis
├── PROJECT_DETAILS.md                  # this document
├── UTILITIES_AND_RENT_ENHANCEMENTS.md  # requirements + gap analysis + plan
├── backend/                            # Spring Boot 4 (Maven)
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/apartment/**
│       └── resources/db/changelog/     # Liquibase master + 23 changesets
├── frontend/                           # Next.js 14 (App Router)
│   ├── app/** components/** lib/**
│   └── package.json / tsconfig.json / tailwind.config.ts
└── containers/                         # Docker/infra (compose, Dockerfiles, scripts)
```

---

## 4. Backend Architecture

Package root `com.apartment`:

```
config/     CorsConfig, SecurityConfig
domain/     Org, User, Apartment, Flat, Tenancy, Meter (meter master),
            MeterReading, WaterReading, CommonMeterReading, UtilityBill,
            RentRecord, Expense, Invoice, Payment, Reminder
dto/        AuthDtos (incl. MeterRequest, UtilityBillRequest,
            CommonMeterReadingRequest, WaterReadingRequest, MeterReadingRequest)
imports/    ExcelImportService
repo/       Apartment, User, Org, Flat, Tenancy, Meter, MeterReading, WaterReading,
            CommonMeterReading, UtilityBill, RentRecord, Expense, Reminder
scheduler/  RentReminderScheduler
security/   AuthDetails, CustomUserDetailsService, JwtAuthFilter, JwtService
service/    Auth, Apartment, Tenant, Rent, Meter, Water, CommonMeter, UtilityBill,
            Expense, Reminder, Pnl, Mailer (Smtp/Gmail), OAuthTokenPersistence
web/        Auth, Owner, Meter, Tenant, Pnl, Import, UtilityBill, CommonMeter,
            Water controllers + GlobalExceptionHandler
```

### Security model
- Stateless JWT; CSRF disabled; `JwtAuthFilter` before `UsernamePasswordAuthenticationFilter`.
- Public: `/api/auth/**`, `/api/billing/webhook/**`, `/login/**`, `/oauth2/**`, `/actuator/**`.
- `/api/owner/**` → `OWNER|MANAGER`; `/api/tenant/**` → `TENANT`.
- `AuthDetails(userId, orgId, role, apartmentId)`; all data scoped by `orgId`.

### Subscription plans (`application.yml`)
| Plan | Max Apartments | Max Flats | Price (INR/mo) |
|---|---|---|---|
| TRIAL | 1 | 10 | 0 (30-day trial) |
| STARTER | 1 | 40 | 499 |
| PRO | 5 | 300 | 1499 |
| ENTERPRISE | 999 | 99999 | 4999 |

---

## 5. Database Schema (Liquibase) — 23 changesets

Master: `backend/src/main/resources/db/changelog/db.changelog-master.xml`

| # | File | Table(s) | Notes |
|---|---|---|---|
| 001 | 001-orgs.xml | `orgs` | |
| 002 | 002-users.xml | `users` | FK org_id, unique email |
| 003 | 003-apartments.xml | `apartments` | FK org_id CASCADE |
| 004 | 004-flats.xml | `flats` | unique (apartment_id, flat_no) |
| 005 | 005-tenancies.xml | `tenancies` | frequency, due_day, active(BIT) |
| 006 | 006-meter-readings.xml | `meter_readings` | unique (flat_id, year, month) |
| 007 | 007-rent-records.xml | `rent_records` | FK tenancy; unique (tenancy_id, year, month); paid(BIT) |
| 008 | 008-expenses.xml | `expenses` | FK created_by |
| 009 | 009-invoices.xml | `invoices` | line_items CLOB; unique invoice_no |
| 010 | 010-payments.xml | `payments` | FKs |
| 011 | 011-reminders.xml | `reminders` | |
| 012 | 012-audit-log.xml | `audit_log` | before/after JSON |
| 013 | 013-indexes.xml | — | 6 indexes |
| **014** | **014-meter-readings-paid.xml** | alters `meter_readings` | **adds `paid` BIT, `paid_date` DATE** |
| **015** | **015-utility-bills.xml** | `utility_bills` | **FK apartment; idx_ubill_apt_date, idx_ubill_apt_cat** |
| **016** | **016-common-meter-readings.xml** | `common_meter_readings` | **owner/common electricity; FK apartment; idx_cmeter_apt_ym** |
| **017** | **017-expenses-source.xml** | alters `expenses` | **adds `source`, `source_ref_id`** |
| **018** | **018-water-readings.xml** | `water_readings` | **FK flat; unique (flat_id, year, month); paid BIT; idx_water_apt_ym** |
| **019** | **019-meters.xml** | `meters` | **meter master: per-flat per-utility (ELECTRICITY/WATER); scope PUBLIC/PRIVATE; FK apt (CASCADE) + flat (SET NULL); unique (flat_id, utility_type); idx_meters_apt** |
| **020** | **020-tenancy-type-maintenance.xml** | alters `tenancies` | **adds `tenancy_type` (RENTAL/LEASE, default RENTAL), `maintenance_amount` DECIMAL(12,2) default 0** |
| **021** | **021-meter-readings-meter-id.xml** | alters `meter_readings`, `water_readings` | **adds `meter_id` BIGINT (nullable)** |
| **022** | **022-common-meter-maintenance-split.xml** | alters `common_meter_readings` | **adds `split_mode` (EQUAL/MANUAL, default EQUAL), `per_flat_share` DECIMAL(12,2)** |
| **023** | **023-flat-nominal-charges.xml** | alters `flats` | **adds `nominal_electricity_amount`, `nominal_water_amount` DECIMAL(12,2)** |

> Booleans use `BIT` → MySQL `BIT(1)` (Hibernate MySQL dialect). Never edit applied changesets.

---

## 6. REST API — Owner endpoints

**Auth** — `/api/auth`: `POST /register`, `POST /login`, `GET /me`

**Owner** — `/api/owner`
| Method | Path | Purpose |
|---|---|---|
| POST/GET/PUT/DELETE | `/apartments`, `/apartments/{id}` | Apartment CRUD |
| POST `/apartments/{aptId}/flats`; GET `/flats` | Flats |
| POST/GET/PUT | `/tenants`, `/tenants/{id}` | Tenancies |
| POST | `/tenants/{id}/deactivate` · `/reactivate` | Tenancy status |
| GET | `/rent?year&month&apartmentId` | Rent records |
| POST | `/rent/collect`, `/rent/bulk-collect` | Payments |
| POST/GET | `/meter` | Electricity readings |
| POST | `/meter/{id}/paid?paid=` | **Electricity paid toggle** |
| POST/GET | `/expenses` | Expenses |
| GET | `/summary`, `/trend?months=6` | Dashboard |
| POST | `/reminders/send` | Reminders |

**Utility Bills** — `/api/owner/utility-bills`: `GET`, `POST` (→ auto Expense), `DELETE /{id}`, `GET /maintenance-suggestion?year&month` (per-flat share)

**Common-area** — `/api/owner/common-meter`: `GET`, `POST` (→ auto Expense `COMMON_METER`), `DELETE /{id}`

**Water** — `/api/owner/water`: `GET ?year&month`, `POST`, `POST /{id}/paid?paid=`

**Meters** — `/api/owner/meters`: `GET ?apartmentId`, `POST ?apartmentId`, `PUT /{id}?apartmentId`, `DELETE /{id}?apartmentId` (meter master CRUD)

**Maintenance coverage** — `GET /api/owner/rent/maintenance-coverage?year&month` → `{ expected, collected, commonAreaCost, maintenanceExpenses, outgo, surplus, covered }`

**Tenant** — `/api/tenant`: `GET /me`, `/rent`, `/meter`

**GlobalExceptionHandler:** `IllegalArgumentException`→401, `IllegalStateException`→409, validation→400, else→500.

---

## 7. Latest Features

### 7.1 Meter paid status (electricity)
- `meter_readings.paid`/`paid_date` (014); `MeterService.markPaid`; `POST /meter/{id}/paid`.
- UI: Electricity page + Utilities→Electricity show Paid/Pending, Mark paid/Unpay, KPI row, add/edit modal with live usage + bill.

### 7.2 Rent: Water + Maintenance
- Rent table columns: Tenant, Flat, Rent, Water, Maint., EBill, Total, Status, Action. `Total = rent + water + maint + ebill`.
- `RentService.recalc` sums all four into `totalCollected`.

### 7.3 Utility Bills → Expenses
- `utility_bills` (015) + `expenses.source`/`source_ref_id` (017).
- `UtilityBillService.create` persists bill then auto-creates `Expense` (`source=UTILITY_BILL`); delete removes both.
- Categories: Generator fuel, Lift/Building maintenance, Property tax, Municipal/building tax, Plumbing, Electrical, Repairs, Other.
- UI: Utilities → Utility bills tab (table + Add bill + delete) with "Recover via maintenance".
- Expenses dashboard shows **Source** badge (Manual / Utility bill / Common meter).

### 7.4 Owner/common-area electricity → Expenses
- `common_meter_readings` (016); `CommonMeterService.upsert` → `Expense` (`source=COMMON_METER`).
- UI: "Common area" button in Electricity tab.

### 7.5 Water readings
- `water_readings` (018); `WaterService`/`WaterController`.
- UI: Utilities → Water tab (KPIs + readings table + Add/Edit/Mark paid). Shared modal via `endpoint`/`title` props.

### 7.6 Maintenance-share prefill in rent
- `GET /utility-bills/maintenance-suggestion` → `{ perFlat }`. Rent modal prefills `maintenanceCharge` when empty.

### 7.7 Utilities dashboard per-tab metrics
Overview (Electricity/Water/Bills/Meters), Electricity, Water, Utility Bills — each with its own KPIs and tables.

### 7.8 Meter master + PUBLIC/PRIVATE utility scope
- `meters` table (019) + `Meter` entity/repo + `MeterController` (`/api/owner/meters`). One meter per flat per utility.
- `scope`: **PUBLIC** = tenant pays the utility directly → owner does **not** collect it in rent; **PRIVATE** = owner bills/collects. No meter mapped → treated as PRIVATE.
- `RentService.isPublic(flatId, type)` skips/zeroes PUBLIC-meter electricity/water in collection; the rent collect modal disables those fields.
- Readings carry `meter_id` (021) on both `meter_readings` and `water_readings`.
- UI: new `/owner/meters` page + sidebar entry.

### 7.9 Tenancy type + maintenance amount
- `tenancies.tenancy_type` (RENTAL ~11-month | LEASE fixed-term) + `maintenance_amount` (020).
- `TenantService` persists both on create/update; rent collection auto-fills maintenance from the tenancy when the field is empty.
- UI: tenant form gets a tenancy-type dropdown + maintenance amount; tenants table shows them.

### 7.10 Nominal charges for unmetered flats
- `flats.nominal_electricity_amount` / `nominal_water_amount` (023).
- `RentService.nominalFor(flatId, type)` returns the fixed amount when a flat has **no** meter mapped for that utility; applied at collection when no reading-driven figure is supplied.
- UI: flat form gets nominal electricity/water fields.

### 7.11 Common-meter split mode + maintenance coverage
- `common_meter_readings.split_mode` (EQUAL auto-divides across active flats | MANUAL uses owner `per_flat_share`) + `per_flat_share` (022).
- `RentService.maintenanceCoverage(aptId, year, month)`: expected maintenance vs collected vs common-area/maintenance outgo, with surplus/shortfall; owner-only.
- UI: rent page shows a **Maintenance coverage** card (Expected / Collected / Outgo / Surplus-Shortfall).

---

## 8. Frontend Routes

| Route | Description |
|---|---|
| `/` | Landing | `/login` | Auth | `/pricing` | Plans |
| `/owner` | Dashboard | `/owner/tenants` | Tenants+flats |
| `/owner/rent` | Rent collection | `/owner/utilities` | Utilities (4 tabs) |
| `/owner/electricity` | Electricity | `/owner/expenses` | Expenses |
| `/owner/meters` | Meter master | `/owner/utilities` | Utilities (tabs incl. Meters) |
| `/owner/pnl` | P&L/ROI | `/owner/import` | Excel |
| `/owner/reminders` | Reminders | `/owner/profile`, `/owner/settings` |
| `/tenant` | Tenant portal |

Shared: `components/utilities/{meter-reading,utility-bill,common-meter}-modal.tsx`; `lib/api.ts`, `lib/utils.ts`.

---

## 9. Infrastructure

Docker Compose profiles: default (mysql, redis, mock-oauth), `dev` (+mailhog), `full` (+backend, frontend), `prod` (+nginx). Scripts: `up.sh {infra|full|prod}`, `down.sh`, `logs.sh`, `reset-db.sh`.

Local dev ports: Frontend **3001**/3000, Backend **8080**, MySQL **3307**→3306, Redis 6379, MailHog 8025, Mock OAuth 9000.

---

## 10. How to Run (local)

```bash
# MySQL must be on 3307 (see application.yml)
cd backend && mvn spring-boot:run    # http://localhost:8080
cd frontend && npm run dev            # http://localhost:3001 (API 8080 via .env.local)
```

Liquibase applies all 23 changesets on backend start.

> **Known issue:** a host `mvn spring-boot:run` session crashed once with `exit code -1073741819` (Windows `ACCESS_VIOLATION`, `0xC0000005`) *after* the app had started and served requests — not a schema/Spring error. Re-run with `-XX:ErrorFile` to capture `hs_err_pid*.log` for diagnosis.
