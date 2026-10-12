# Utilities, Bills & Rent Collection — Enhancement Plan

> Requested by: product owner
> Date: 2026-10-12
> Scope: `frontend/app/owner/utilities`, `frontend/app/owner/rent`,
> `frontend/app/owner/expenses`, plus backend `MeterService`, `RentService`,
> `ExpenseService`, and new utility-bill persistence.
> This document captures the requirements, gap analysis against the current code,
> and a concrete implementation plan.

---

## 1. Requirements (verbatim intent)

### R1 — Utilities dashboard: per-tab metrics
- The **Overview** tab currently only surfaces *electricity* usage/bill/meters.
- Make **each sub-tab** (Overview, Electricity, Water, Utility Bills) show its own metrics.
- **Electricity tab**: add the ability to **add a meter reading** (not just view), including usage details and a **paid / unpaid status**.
- That electricity status must **link to the tenant's rent collection** — when collecting rent, the **due electricity amount should be auto-populated**.
  - If a bill detail exists -> prefill it.
  - If not -> allow **free-text / optional** entry (for owners who collect a fixed amount regardless).

### R2 — Rent collection: more line items
- After **Rent amount**, also show/add **Maintenance amount** and **Water bill**.
  (Electricity is already partially there via `ebillAmount`.)

### R3 — Utility bills + owner common-area electricity -> expenses
- In Electricity section: option to add an **owner / common-area meter reading**. This is paid by the owner and should be recorded as an **expense**, and (where applicable) map into the tenants' **maintenance amount**.
- In **Utility Bills**: allow adding items such as:
  - Generator fuel
  - (Lift / building) maintenance
  - Property taxes
  - Building / municipal taxes
  - Plumbing, electrical work, building repair works
  - ...any other utility bill
- These should **link into the Expenses dashboard**.

---

## 2. Current State (verified from code)

### 2.1 Frontend — Utilities (`app/owner/utilities/page.tsx`)
- Tabs: `overview | electricity | water | bills`.
- Data source: `GET /api/owner/meter?year&month` only.
- Overview + Electricity render the same electricity KPI trio (usage, charges, meters recorded) + a readings table.
- **Water** and **Bills** tabs are **placeholders** — explicit copy says "Backend integration required".
- **No add/edit reading UI**, **no paid status** on a reading.

### 2.2 Frontend — Electricity (`app/owner/electricity/page.tsx`)
- Read-only table (prev, present, units, rate, bill) for a year/month. No add, no status.

### 2.3 Frontend — Rent (`app/owner/rent/page.tsx`)
- Already fetches `GET /api/owner/meter` and shows a per-row `meterBill` + `meterUnits`.
- `CollectModal` already has fields: `rentAmount`, `ebillAmount`, `waterBill`, `maintenanceCharge`, `paymentMode`, `paidDate`, `remarks`.
- **Prefill logic today:** `ebillAmount` defaults to `meterBill` if no existing record. `waterBill` / `maintenanceCharge` default to empty.
- Table columns today: Tenant, Flat, **Rent, EBill, Total**, Status, Action.
  (No Water / Maintenance columns; Total = Rent + EBill only.)

### 2.4 Backend — Meter (`MeterReading` entity, `MeterService`, `006-meter-readings.xml`)
- Columns: `flat_id`, `apartment_id`, `year`, `month`, `previous_reading`, `present_reading`, `usage_units`, `rate_per_unit`, `bill_amount`, `reading_date`.
- **No `paid` / `status` column.**
- `flat_id` is **NOT NULL** with FK -> `flats` — so an **owner/common-area meter cannot be stored** without schema change.
- Service computes `usage = present - previous`, `bill = usage x rate`.
- Endpoints: `POST /api/owner/meter` (upsert), `GET /api/owner/meter?year&month`.

### 2.5 Backend — Rent (`RentRecord`, `RentService`, `007-rent-records.xml`)
- `RentRecord` **already has** `waterBill` and `maintenanceCharge` columns, plus a large set of owner-expense fields (`houseMaid`, `garbageVehicle`, `generatorDiesel`, `sharedEbill`, `emiInterest`, `propertyTax`, `insurance`, `repairs`, `otherExpenses`, `returnsAmount`).
- `RentService.recalc` sets `totalCollected = rent + ebill + water + maintenance` and `netIncome = cumulativeTotal = totalCollected`. (The owner-expense fields are **not** subtracted here.)
- So R2 is **mostly a UI gap**, not a schema gap — the fields already exist and `collect` already accepts them.

### 2.6 Backend — Expenses (`Expense`, `ExpenseService`, `008-expenses.xml`)
- Columns: `apartment_id`, `category`, `subcategory`, `amount`, `expense_date`, `vendor`, `invoice_no`, `notes`, `receipt_url`, `created_by`.
- `POST /api/owner/expenses` + `GET /api/owner/expenses`.
- Free-form `category` (VARCHAR 40) — so utility-bill categories can be represented **today** without schema change, but there is **no dedicated utility-bill entity** linking to a meter/period.

### 2.7 Backend — Invoices (`Invoice`, `009-invoices.xml`)
- Table + entity exist (`invoiceNo`, `kind`, `month`, `year`, `lineItems` CLOB, `subtotal/tax/total`, `status`, `dueDate`, `paidAt`, `pdfUrl`).
- **No controller / service / UI** — schema-only. Could be leveraged for a formal tenant utility bill, but currently unused.

---

## 3. Gap Summary

| # | Requirement | Schema change? | Backend change | Frontend change |
|---|---|---|---|---|
| R1a | Per-tab metrics in Utilities | no | no | rewrite tabs |
| R1b | Add meter reading from Utilities/Electricity | no | no (endpoint exists) | add form |
| R1c | Paid/unpaid status on meter reading | **yes** (`meter_readings.paid`, `paid_date`) | entity + repo + service + endpoint | toggle + badge |
| R1d | Electricity due prefilled in rent collect | no (already partially) | no | improve prefill + show units/status |
| R2 | Water + Maintenance line items in rent UI | no (fields exist) | no | add columns + modal fields |
| R3a | Owner/common-area meter reading -> expense | **yes** (new table or nullable flat + scope) | entity + service (+ expense creation) | new UI |
| R3b | Utility Bills (generator, lift, taxes, repairs...) | **yes** (new `utility_bills` table) | new entity/repo/service/controller | new tab |
| R3c | Utility bills link to Expenses dashboard | partial (expense category) | auto-create Expense row on bill save | show source/link |

---

## 4. Proposed Implementation Plan

### 4.1 Schema / Liquibase (append-only — do NOT edit applied changesets)

> Per project rule: never modify an already-applied changeset. Add **new** changesets
> `014-*`, `015-*`, `016-*`, `017-*` to `db.changelog-master.xml`.

**014-meter-readings-paid-and-common.xml**
- Add to `meter_readings`:
  - `paid` BIT default 0
  - `paid_date` DATE
- For common/owner-area readings, **create a dedicated table** `common_meter_readings`
  (mirrors `meter_readings` minus `flat_id`, plus `label`) instead of making `flat_id`
  nullable — this avoids breaking the unique constraint `uk_meter_flat_ym` and the FK.

**015-utility-bills.xml** — new table `utility_bills`:

| column | type | notes |
|---|---|---|
| id | BIGINT PK auto | |
| apartment_id | BIGINT NOT NULL | FK apartments |
| category | VARCHAR(40) NOT NULL | GENERATOR_FUEL, LIFT_MAINTENANCE, PROPERTY_TAX, MUNICIPAL_TAX, PLUMBING, ELECTRICAL, REPAIRS, OTHER |
| subcategory | VARCHAR(80) | free text |
| description | VARCHAR(500) | |
| amount | DECIMAL(12,2) NOT NULL | |
| bill_date | DATE NOT NULL | |
| vendor | VARCHAR(255) | |
| invoice_no | VARCHAR(80) | |
| period_month | VARCHAR(12) | optional billing period |
| period_year | INT | |
| affects_maintenance | BIT default 0 | if true, can be recovered via tenant maintenance |
| expense_id | BIGINT | FK expenses (auto-created) |
| created_by | BIGINT | FK users |
| created_at | TIMESTAMP | |

- Indexes: `idx_ubill_apt_date (apartment_id, bill_date)`, `idx_ubill_apt_cat (apartment_id, category)`.

**016-rent-records-utility-links.xml**
- Add to `rent_records`: `utility_bill_total` DECIMAL(12,2) default 0 (optional roll-up).

**017-expenses-source.xml**
- Add to `expenses`: `source` VARCHAR(20) default `MANUAL` (MANUAL / UTILITY_BILL / COMMON_METER),
  `source_ref_id` BIGINT.

### 4.2 Backend — new/changed classes

**New**
- `domain/UtilityBill.java` (entity mapped to `utility_bills`).
- `domain/CommonMeterReading.java` (mapped to `common_meter_readings`).
- `repo/UtilityBillRepository.java` — `findByApartmentIdOrderByBillDateDesc`, `findByApartmentIdAndCategory`, `findByApartmentIdAndPeriodYear`.
- `repo/CommonMeterReadingRepository.java`.
- `service/UtilityBillService.java` — on create/update:
  1. persist the utility bill,
  2. **auto-create an `Expense`** row (mapped category, amount, date, vendor, invoiceNo, notes = description + period, `source=UTILITY_BILL`, `sourceRefId`), with `createdBy`,
  3. store the returned `expenseId` back on the bill.
  - If `affectsMaintenance=true`, expose a helper to compute a per-flat maintenance share
    (amount / active flats) for use by rent collection.
- `service/CommonMeterService.java` — upsert common-area reading; on save, **auto-create an `Expense`**
  (category `ELECTRICITY_COMMON`, amount = billAmount, `source=COMMON_METER`).
- `web/UtilityBillController.java` — `/api/owner/utility-bills` (GET list, POST create, PUT update, DELETE).
- `web/CommonMeterController.java` — `/api/owner/common-meter` (POST upsert, GET by year/month).
- DTO records (extend `AuthDtos` or new `UtilityDtos`): `UtilityBillRequest`, `CommonMeterReadingRequest`.

**Changed**
- `domain/MeterReading.java` — add `paid`, `paidDate`.
- `dto/AuthDtos.java` — extend `MeterReadingRequest` with optional `paid`.
- `service/MeterService.java` — support `paid` on upsert; new `markPaid(flatId, year, month, paid)`.
- `repo/MeterReadingRepository.java` — add `findByApartmentIdAndYearAndMonthAndPaid` (optional).
- `web/OwnerController.java` — add `POST /api/owner/meter/{id}/paid` (toggle paid); optionally extend `/summary` with `electricityDue` / `electricityPaid`.
- `service/ExpenseService.java` — add `createInternal(...)` reused by UtilityBillService/CommonMeterService.
- `service/RentService.java` — `recalc` already includes water+maintenance in `totalCollected`; optionally fold `utility_bill_total` in.
- `web/OwnerController.java` `POST /rent/collect` — no contract change needed (fields already accepted).

### 4.3 Frontend — Utilities page rewrite (`app/owner/utilities/page.tsx`)

**Tabs & metrics**
- **Overview**: cards for Electricity (usage + Rs bill), Water (usage + Rs bill), Utility bills (count + Rs total), Expenses linked (Rs). Pull from meter, water, utility-bills, expenses.
- **Electricity**:
  - KPI cards: total units, total charges, meters recorded, **paid vs pending**.
  - Table adds: **Status (Paid/Pending)** + **Action (Mark paid / Edit)**.
  - "**Add reading**" button -> modal (flat select, year, month, prev, present, rate -> live usage + bill preview; optional paid toggle).
  - "**Add common-area reading**" button -> modal (label, year, month, prev, present, rate) -> saves + creates expense.
- **Water**: add a `water_readings` table + `WaterService` (mirrors Electricity), metrics + add-reading UI.
- **Utility Bills**:
  - Table: date, category, description, vendor, amount, period, **affects maintenance**, linked expense id.
  - "Add bill" modal with the category dropdown (Generator fuel, Lift maintenance, Property tax, Municipal tax, Plumbing, Electrical, Repairs, Other), amount, date, vendor, invoice no, notes, and a **"Recover from tenants via maintenance"** checkbox.
  - On save -> backend creates the linked Expense; UI shows a "View in Expenses" link.

### 4.4 Frontend — Electricity page (`app/owner/electricity/page.tsx`)
- Add "Add / edit reading" + "Mark paid" actions (reuse a shared `components/utilities/meter-reading-modal.tsx`).

### 4.5 Frontend — Rent collection (`app/owner/rent/page.tsx`)
- **Table columns**: Tenant, Flat, Rent, **Water**, **Maintenance**, **EBill (due)**, Total, Status, Action.
  - `Total = rent + water + maintenance + ebill`.
- **CollectModal**:
  - Keep existing fields; make **Water Bill** and **Maintenance** prominent (already in state).
  - **Electricity prefill** (R1d): if a meter reading for that flat/period exists -> prefill `ebillAmount` with its bill and show `X units - Paid/Pending`. If none -> leave blank with a hint "No meter reading - enter fixed amount (optional)".
  - If the reading is already marked **Paid** at the meter level, show a note and optionally avoid double-billing (owner choice).
  - **Maintenance prefill**: if a utility bill for the period has `affects_maintenance=true`, prefill `maintenanceCharge` with the per-flat share and show a tooltip "From utility bills: {category}".
  - **Pending computation**: update from `rent + meterBill` to `rent + water + maintenance + ebill` using existing record values when present.

### 4.6 Frontend — Expenses dashboard (`app/owner/expenses/page.tsx`)
- Auto-created utility expenses appear naturally (they are `Expense` rows).
- Add a **source badge** column: `MANUAL` vs `UTILITY_BILL` vs `COMMON_METER` (uses changeset 017 fields).

---

## 5. Suggested Phasing

| Phase | Deliverable | Depends on |
|---|---|---|
| **P1** | Rent UI: add Water + Maintenance columns/fields (no schema change) | — |
| **P2** | Electricity: add-reading modal + `paid` column (changeset 014) + status UI | P1 not required |
| **P3** | Utilities Overview + per-tab metrics; Electricity add/edit/status wired | P2 |
| **P4** | Utility Bills table + CRUD + auto-Expense (changeset 015) | P3 |
| **P5** | Common-area meter reading + auto-Expense | P4 |
| **P6** | Rent prefill from meter (due electricity) + maintenance share from utility bills | P3, P4 |
| **P7** | Water readings (table + service + UI) | P3 |
| **P8** | Expenses source badge + deep links (changeset 017) | P4 |

---

## 6. Open Questions / Decisions Needed

1. **Water readings**: separate `water_readings` table vs. generalize `meter_readings` with a `utility_type` discriminator? (Recommend parallel table short-term.)
2. **Common-area electricity**: dedicated table `common_meter_readings` vs. allow `flat_id NULL` with `scope=COMMON`? (Recommend dedicated table.)
3. **Maintenance recovery**: should `affects_maintenance` utility bills be (a) auto-split equally across active flats, (b) split by `owner_share_pct`/area, or (c) manually entered by the owner at rent-collect time? (Recommend (c) with an (a) suggestion prefilled.)
4. **Double-billing**: if an electricity reading is marked Paid at the meter level, should rent collection still include it? (Owner toggle recommended.)
5. **`Expense.source`**: add explicit source columns (changeset 017) or infer via `utility_bills.expense_id` join? (Recommend explicit columns.)
6. **Invoices**: use the existing (unused) `invoices` table for formal tenant utility bills, or keep utility bills owner-side only for now?
7. **Paid status on meter reading vs. rent record**: single source of truth? (Recommend meter-level `paid` is authoritative for electricity; rent record `ebillAmount` reflects what was actually collected.)

---

## 7. Files Likely Touched

**Backend**
- `backend/src/main/resources/db/changelog/db.changelog-master.xml` (+ 014/015/016/017)
- `backend/src/main/resources/db/changelog/changes/014-*.xml`, `015-*.xml`, `016-*.xml`, `017-*.xml`
- `backend/src/main/java/com/apartment/domain/MeterReading.java`
- `backend/src/main/java/com/apartment/domain/UtilityBill.java` *(new)*
- `backend/src/main/java/com/apartment/domain/CommonMeterReading.java` *(new)*
- `backend/src/main/java/com/apartment/domain/Expense.java` (source fields)
- `backend/src/main/java/com/apartment/repo/UtilityBillRepository.java` *(new)*
- `backend/src/main/java/com/apartment/repo/CommonMeterReadingRepository.java` *(new)*
- `backend/src/main/java/com/apartment/repo/MeterReadingRepository.java`
- `backend/src/main/java/com/apartment/service/UtilityBillService.java` *(new)*
- `backend/src/main/java/com/apartment/service/CommonMeterService.java` *(new)*
- `backend/src/main/java/com/apartment/service/MeterService.java`
- `backend/src/main/java/com/apartment/service/ExpenseService.java`
- `backend/src/main/java/com/apartment/service/RentService.java` (optional)
- `backend/src/main/java/com/apartment/web/UtilityBillController.java` *(new)*
- `backend/src/main/java/com/apartment/web/CommonMeterController.java` *(new)*
- `backend/src/main/java/com/apartment/web/OwnerController.java`
- `backend/src/main/java/com/apartment/dto/AuthDtos.java` (or new `UtilityDtos.java`)

**Frontend**
- `frontend/app/owner/utilities/page.tsx` (major rewrite)
- `frontend/app/owner/electricity/page.tsx`
- `frontend/app/owner/rent/page.tsx`
- `frontend/app/owner/expenses/page.tsx`
- `frontend/components/utilities/meter-reading-modal.tsx` *(new)*
- `frontend/components/utilities/utility-bill-modal.tsx` *(new)*
- `frontend/components/utilities/common-meter-modal.tsx` *(new)*

---

## 8. Acceptance Criteria

- [ ] Utilities page shows distinct metrics for Overview, Electricity, Water, Utility Bills.
- [ ] Electricity tab can **add** a reading (flat, period, prev/present/rate) and shows computed usage + bill.
- [ ] Electricity readings show **Paid / Pending** and can be toggled.
- [ ] Rent collection modal **prefills the due electricity** from the reading when present; blank + free-text when absent.
- [ ] Rent table + modal include **Water bill** and **Maintenance** line items; Total reflects all four.
- [ ] Owner/common-area electricity can be recorded and **appears in Expenses**.
- [ ] Utility bills (generator fuel, lift/building maintenance, property/municipal tax, plumbing/electrical/repairs, other) can be added and **appear in Expenses**.
- [ ] Utility bills with "recover via maintenance" surface a per-flat maintenance suggestion in rent collection.
- [ ] No previously-applied Liquibase changeset is edited (only new changesets added).
