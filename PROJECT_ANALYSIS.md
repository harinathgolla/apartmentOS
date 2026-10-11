# Apartment SaaS — Project Analysis

> Auto-generated analysis of `D:\Practice\apartment-saas`
> Date: 2026-10-11

---

## 1. Overview

**Apartment SaaS** is a multi-tenant property/rental management platform targeting apartment owners and tenants (Indian market — INR billing via Razorpay). It handles rent collection, electricity/meter billing, expense tracking, P&L reporting, automated email reminders, subscription billing, and Excel import.

- **Backend:** Spring Boot 4.0.8 · Java 21 · **MySQL 8.4** · Redis · **Liquibase**
- **Frontend:** Next.js 14.2.15 · React 18 · TypeScript · Tailwind CSS · Radix UI
- **Infra:** Docker Compose (MySQL, Redis, MailHog, mock-oauth2, Nginx)

---

## 2. Repository Layout

```
apartment-saas/
├── .gitattributes
├── .gitignore
├── deepWrapCli.py            # CLI helper script
├── backend/                  # Spring Boot application (Maven)
├── frontend/                 # Next.js application
└── containers/               # All Docker/infra config
    ├── .env / .env.example
    ├── docker-compose.yml
    ├── docker-compose.override.yml
    ├── redis/                # redis.conf
    ├── mailhog/  (via image)
    ├── mock-oauth/           # config.json
    ├── nginx/                # reverse proxy (prod)
    └── scripts/              # up.sh, down.sh, logs.sh, reset-db.sh
```

---

## 3. Technology Stack

### Backend (`backend/pom.xml`)

| Area | Technology |
|---|---|
| Framework | Spring Boot **4.0.8** |
| Language | Java **21** (virtual threads enabled) |
| Web | spring-boot-starter-web |
| Persistence | Spring Data JPA + Hibernate |
| DB | **MySQL 8.4** (com.mysql:mysql-connector-j) |
| Migrations | **Liquibase** (spring-boot-starter-liquibase + DB-agnostic XML changelogs) |
| Security | Spring Security + OAuth2 Client + JJWT 0.12.6 |
| Caching | Spring Cache + Caffeine |
| Mail | spring-boot-starter-mail + **Gmail API** (google-api-services-gmail) |
| Excel | Apache POI 5.3.0 (poi-ooxml) |
| PDF | OpenPDF 2.0.3 (invoices) |
| Payments | Razorpay Java SDK 1.4.7 |
| Misc | Lombok, Actuator, Validation |
| Testing | spring-boot-starter-test, spring-security-test, Testcontainers (PostgreSQL) |

### Frontend (`frontend/package.json`)

| Area | Technology |
|---|---|
| Framework | Next.js **14.2.15** (App Router) |
| UI | React 18.3.1, Radix UI primitives, lucide-react icons |
| Styling | Tailwind CSS 3.4 + tailwindcss-animate + CVA + clsx + tailwind-merge |
| Charts | Recharts 2.13 |
| HTTP | Axios 1.7 |
| Forms/UX | sonner (toasts), framer-motion, next-themes, date-fns |
| Language | TypeScript 5.6 |

---

## 4. Docker Infrastructure

### Running Containers (verified via `docker ps`)

| Container | Image | Port(s) | Status |
|---|---|---|---|
| `apt-mysql` | `mysql:8.4` | 3307 → 3306 | Up (healthy) |
| `apt-backend` | `apartment-saas/backend:latest` | 8080 | Up (healthy) |
| `apt-frontend` | `apartment-saas/frontend:latest` | 3000 | Up |
| `apt-redis` | `redis:7-alpine` | 6379 | Up (healthy) |
| `apt-mock-oauth` | `ghcr.io/navikt/mock-oauth2-server:2.1.10` | 9000 → 8080 | Up |
| `apt-mailhog` | `mailhog/mailhog:latest` | 1025, 8025 | Up |

### Compose Profiles (`docker-compose.yml`)

| Profile | Services included |
|---|---|
| default | mysql, redis, mock-oauth |
| `dev` | + mailhog |
| `full` | + backend, frontend |
| `prod` | + nginx (reverse proxy) |

**Startup modes** (`scripts/up.sh`): `infra` (docker only, run app on host), `full` (everything in Docker), `prod` (behind nginx).

### Networks & Volumes

- Network: `apartment-net` (bridge)
- Volumes: `mysql_data`, `redis_data`

### Nginx (prod)

`nginx/conf.d/default.conf` routes:
- `/api/`, `/oauth2/`, `/login/oauth2/` → backend:8080
- `/` (all else) → frontend:3000 (with WebSocket upgrade support)

---

## 5. Configuration

### Environment Variables (`containers/.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `MYSQL_DATABASE` | apartment_db | DB name |
| `MYSQL_USER` | apartment | DB user |
| `MYSQL_PASSWORD` | apartment | DB password |
| `MYSQL_ROOT_PASSWORD` | rootpassword | MySQL root password |
| `MYSQL_PORT` | 3307 (host) | DB port (host; container stays 3306) |
| `REDIS_PORT` / `REDIS_PASSWORD` | 6379 / redis_dev_pw | Redis |
| `MAILHOG_SMTP_PORT` / `MAILHOG_UI_PORT` | 1025 / 8025 | Mail catcher |
| `BACKEND_PORT` | 8080 | Spring Boot |
| `JWT_SECRET` | dev placeholder | Token signing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | dummy | Google OAuth |
| `RAZORPAY_KEY_ID` / `_SECRET` / `_WEBHOOK_SECRET` | rzp_test_xxx | Billing |
| `FRONTEND_PORT` | 3000 | Next.js |
| `NEXT_PUBLIC_API_URL` | http://localhost:8080 | API base |
| `NGINX_HTTP_PORT` / `NGINX_HTTPS_PORT` | 80 / 443 | Proxy |
| `MOCK_OAUTH_PORT` | 9000 | Mock OAuth |
| `SPRING_PROFILES_ACTIVE` | mock-oauth | Active profile |

### Spring Profiles

| Profile | File | Notes |
|---|---|---|
| default | `application.yml` | localhost DB, real Gmail SMTP, JWT, Razorpay plans |
| `docker` | `application-docker.yml` | Container hostnames; MySQL datasource; **Liquibase** enabled |
| `liquibase` | `application-liquibase.yml` | Dedicated Liquibase migration profile (with optional `mysql` sub-profile) |
| `mock-oauth` | `application-mock-oauth.yml` | Routes Google OAuth → localhost:9000 mock; mail → MailHog |

### Subscription Plans (`application.yml` → `app.billing.plans`)

| Plan | Max Apartments | Max Flats | Price (INR) |
|---|---|---|---|
| TRIAL | 1 | 10 | 0 (30-day trial) |
| STARTER | 1 | 40 | 499 |
| PRO | 5 | 300 | 1499 |
| ENTERPRISE | 999 | 99999 | 4999 |

---

## 6. Backend Architecture

Package root: `com.apartment`

### Structure

```
com/apartment/
├── ApartmentSaasApplication.java
├── billing/          # Razorpay subscription/billing
├── config/           # CorsConfig, SecurityConfig
├── domain/           # JPA entities
├── dto/              # AuthDtos (request/response records)
├── imports/          # ExcelImportService (Apache POI)
├── repo/             # Spring Data repositories
├── scheduler/        # RentReminderScheduler
├── security/         # AuthDetails, JwtAuthFilter, JwtService, CustomUserDetailsService
├── service/          # Business logic
└── web/              # REST controllers
```

### Domain Entities (`domain/`)

`Org`, `User`, `Apartment`, `Flat`, `Tenancy`, `MeterReading`, `RentRecord`, `Expense`, `Invoice`, `Payment`, `Reminder`

### Services (`service/`)

- `ApartmentService`, `TenantService`, `RentService`, `MeterService`, `ExpenseService`
- `ReminderService`, `AuthService`
- `PnlService` (profit & loss reporting)
- `MailerService` (interface) → `SmtpMailerService`, `GmailApiMailerService`
- `OAuthTokenPersistence` (OAuth2 success handler)

### Repositories (`repo/`)

`ApartmentRepository`, `ExpenseRepository`, `FlatRepository`, `MeterReadingRepository`, `OrgRepository`, `ReminderRepository`, `RentRecordRepository`, `TenancyRepository`, `UserRepository`

### Controllers (`web/`)

| Controller | Base Path | Responsibility |
|---|---|---|
| `AuthController` | `/api/auth` | register, login, me |
| `OwnerController` | `/api/owner` | apartments, flats, tenants, rent, meter, expenses, summary, trend, reminders |
| `TenantController` | `/api/tenant` | me, my rent, my meter |
| `ImportController` | — | Excel import |
| `PnlController` | — | P&L reporting |
| `GlobalExceptionHandler` | — | Central error handling |

### Security Model (`SecurityConfig`)

- **Stateless** (no HTTP session; JWT-based)
- CSRF disabled
- Public endpoints: `/api/auth/**`, `/api/billing/webhook/**`, `/login/**`, `/oauth2/**`, `/actuator/**`
- `/api/owner/**` → `ROLE_OWNER`, `ROLE_MANAGER`
- `/api/tenant/**` → `ROLE_TENANT`
- `JwtAuthFilter` runs before `UsernamePasswordAuthenticationFilter`
- OAuth2 login success handled by `OAuthTokenPersistence`
- BCrypt password encoder
- `@EnableMethodSecurity` (method-level `@PreAuthorize` available)

### Roles

`OWNER`, `TENANT`, `MANAGER`, `ACCOUNTANT`

---

## 7. Database Schema (Liquibase XML Changelogs)

Managed by **Liquibase** via `backend/src/main/resources/db/changelog/db.changelog-master.xml`, which includes 13 changesets (`changes/001`–`013`). All changesets are **DB-agnostic XML** (target DB: **MySQL 8.4**). Tracking tables: `DATABASECHANGELOG`, `DATABASECHANGELOGLOCK`.

### Changelog files (changes/)

| File | Contents |
|---|---|
| `001-orgs.xml` | `orgs` table |
| `002-users.xml` | `users` table (+ FK org_id) |
| `003-apartments.xml` | `apartments` table (+ FK org_id) |
| `004-flats.xml` | `flats` table (+ FK, unique apt+flat_no) |
| `005-tenancies.xml` | `tenancies` table (+ FKs, `frequency`, `due_day`, `active`) |
| `006-meter-readings.xml` | `meter_readings` (+ FK, unique flat+ym) |
| `007-rent-records.xml` | `rent_records` (+ FK, unique tenancy+ym, `payment_mode`, `paid`) |
| `008-expenses.xml` | `expenses` (+ FK created_by) |
| `009-invoices.xml` | `invoices` (line_items as CLOB/TEXT) |
| `010-payments.xml` | `payments` (+ FKs) |
| `011-reminders.xml` | `reminders` |
| `012-audit-log.xml` | `audit_log` |
| `013-indexes.xml` | 6 indexes (rent, meter, expenses, invoices, users, rent_paid) |

### Core tables (created by Liquibase)

| Table | Key columns |
|---|---|
| `orgs` | name, slug, plan, trial_ends_at, razorpay_customer_id/subscription_id, billing_email |
| `users` | org_id, email (unique), password_hash, role, google_refresh_token, google_connected (BIT) |
| `apartments` | org_id, address, purchase_value/date, loan_amount/emi/interest_rate |
| `flats` | apartment_id, flat_no (unique per apt), area_sqft, meter_serial_no, owner_share_pct |
| `tenancies` | flat_id, tenant_user_id, rent_amount, security_deposit, due_day, frequency, active (BIT) |
| `meter_readings` | flat_id, year+month (unique), previous/present reading, usage_units, rate, bill |
| `rent_records` | tenancy_id, month+year (unique), rent/ebill/water/maintenance, many expense fields, net_income, cumulative_total, payment_mode, paid (BIT) |
| `expenses` | apartment_id, category, amount, expense_date, vendor, receipt_url |
| `invoices` | invoice_no (unique), kind, line_items (TEXT/CLOB), subtotal/tax/total, status |
| `payments` | invoice_id, amount, mode, reference |
| `reminders` | apartment_id, tenancy_id, recipient_email, subject, body, status, sent_at |
| `audit_log` | org_id, user_id, entity, action, before_json/after_json (TEXT/CLOB) |

Indexes: `idx_rent_apt_ym`, `idx_meter_apt_ym`, `idx_exp_apt_date`, `idx_inv_apt_status`, `idx_users_org`, `idx_rent_paid`.

> **Note:** boolean columns (`users.google_connected`, `tenancies.active`, `rent_records.paid`) are defined as `BIT` in the changelogs so they map to MySQL `BIT(1)`, which Hibernate's MySQL dialect expects for Java `Boolean` (Liquibase's default `BOOLEAN`→`TINYINT` fails Hibernate `validate`).

---

## 8. Frontend Architecture

Next.js **App Router** structure:

```
app/
├── layout.tsx, globals.css, page.tsx
├── login/page.tsx
├── pricing/page.tsx
├── owner/
│   ├── layout.tsx, page.tsx (dashboard)
│   ├── electricity/  expenses/  import/
│   ├── pnl/  reminders/  rent/  tenants/
└── tenant/page.tsx
components/
├── charts/      pnl-chart.tsx, revenue-chart.tsx
├── dashboard/   kpi-card.tsx, page-header.tsx
├── layout/      app-shell.tsx, sidebar.tsx, topbar.tsx
└── ui/          avatar, badge, button, card, dropdown-menu, input,
                 label, sonner, table, tabs, theme-provider
lib/
├── api.ts       Axios instance + interceptors + Me type
└── utils.ts
```

### API Client (`lib/api.ts`)

- Axios base URL from `NEXT_PUBLIC_API_URL` (fallback `http://localhost:8080`)
- **Request interceptor:** attaches `Authorization: Bearer <token>` from `localStorage`
- **Response interceptor:** on 401 → clears storage and redirects to `/login`
- `Me` type: `{ id, email, fullName, role, orgId, apartmentId, googleConnected }`

### Main feature pages (owner)

Dashboard, Electricity (meter), Expenses, Import (Excel), P&L, Reminders, Rent, Tenants — plus pricing and tenant portal.

---

## 9. Key Workflows & Integrations

### Authentication
1. **Local:** register/login → JWT issued (`app.jwt.expiration-ms: 24h`, refresh 30d)
2. **Google OAuth2:** scopes `openid email profile` + `gmail.send`; success handler persists refresh token (`OAuthTokenPersistence`)
3. **Dev:** `mock-oauth` profile redirects Google login to local mock server (`localhost:9000/google`); mock user `owner@saienclave.test`

### Rent Collection (`OwnerController`)
- `POST /api/owner/rent` — upsert rent record
- `POST /api/owner/rent/collect` — record single tenant payment
- `POST /api/owner/rent/bulk-collect` — mark set/all active tenancies paid
- `GET /api/owner/rent?year&month` — monthly view

### Electricity / Meter
- `POST /api/owner/meter` upsert; `GET` by year+month; usage & bill computed from readings × rate

### Expense Tracking
- Categories, subcategories, vendor, receipt URL; scoped to apartment

### P&L & Analytics
- `GET /api/owner/summary` — collected/pending/units/tenant count this month
- `GET /api/owner/trend?months=6` — income vs expense over time
- `PnlService` / `PnlController` — detailed profit & loss

### Reminders & Email
- `RentReminderScheduler` — scheduled reminders
- `POST /api/owner/reminders/send` — bulk send to all active tenants
- Dual mailers: **SMTP** (dev/MailHog) and **Gmail API** (send as user)

### Billing (Razorpay)
- Subscription plans, trial (30 days), webhook endpoint `/api/billing/webhook/**`
- Tracks `razorpay_customer_id`, `razorpay_subscription_id`, `plan_renews_at`

### Excel Import
- `ExcelImportService` (Apache POI) via `ImportController` — bulk data ingestion

---

## 10. Observations & Potential Issues

1. **Resolved — migration tool:** The project now uses **Liquibase exclusively**. Flyway (deps, config, `db/migration/V*.sql`) was removed. `spring-boot-starter-liquibase` is required (raw `liquibase-core` is silently ignored by Spring Boot 4's autoconfiguration).
2. **Resolved — DB is MySQL 8.4.** Postgres + pgAdmin services, volumes, and directories removed. Host port **3307** maps to container 3306 (host 3306 is occupied by a native MySQL on this machine).
3. **Secrets in defaults:** JWT secret, DB password, Razorpay keys have insecure dev defaults in `.env.example` and `application.yml`. Ensure real values via env in any non-dev environment.
4. **`Google OAuth` in docker profile:** scopes list omits `gmail.send` (present in default profile), so Gmail API sending may not work under `docker`.
5. **No docker healthchecks** for mailhog, mock-oauth (mysql, redis, backend define them).
6. **`.env` file present** in `containers/` (git-ignored per `.gitignore`).
7. **CORS:** `SecurityConfig` calls `.cors(c -> {})` enabling defaults; actual allowed origins are in `CorsConfig`.
8. **Changelog checksum discipline:** do not edit an already-applied changeset; add a new changeset instead, or checksum validation will fail on next startup.

---

## 11. Quick Start

```bash
# 1. Infra only (recommended for development)
cd containers && ./scripts/up.sh infra

# Run backend on host
cd backend && mvn spring-boot:run

# Run frontend on host
cd frontend && npm install && npm run dev

# 2. Full stack in Docker
cd containers && ./scripts/up.sh full

# 3. Production stack (behind nginx)
cd containers && ./scripts/up.sh prod
```

### Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| MySQL | localhost:3307 (→ container 3306) |
| MailHog UI | http://localhost:8025 |
| Mock OAuth | http://localhost:9000 |
| Redis | localhost:6379 |
| App via Nginx (prod) | http://localhost:80 |

---

## 12. Summary

Apartment SaaS is a well-structured, modern multi-tenant rental management platform:

- **Backend:** clean layered Spring Boot 4 app (controller → service → repo → domain) with JWT + Google OAuth, **Liquibase** migrations, dual mailers, Razorpay billing, POI Excel import, and OpenPDF invoicing.
- **Frontend:** Next.js App Router with Radix/Tailwind UI, dedicated owner and tenant portals, charts, and a token-based Axios client.
- **Infra:** profile-driven Docker Compose supporting three run modes (infra / full / prod) with a local dev stack (**MySQL 8.4**, Redis, MailHog, mock OAuth) and Nginx for production.

The DB layer is now **MySQL 8.4** with **Liquibase** as the sole migration tool (13 DB-agnostic XML changesets). The earlier Postgres/Flyway setup was fully removed and the full stack was verified running (backend healthy, all 14 tables created by Liquibase).
