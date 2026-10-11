CREATE TABLE orgs (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  plan VARCHAR(20) NOT NULL DEFAULT 'TRIAL',
  trial_ends_at TIMESTAMPTZ,
  plan_renews_at TIMESTAMPTZ,
  razorpay_customer_id VARCHAR(120),
  razorpay_subscription_id VARCHAR(120),
  billing_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES orgs(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  role VARCHAR(20) NOT NULL,
  google_refresh_token TEXT,
  google_connected BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE apartments (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500), city VARCHAR(120), state VARCHAR(120), pincode VARCHAR(12),
  total_floors INT,
  purchase_value NUMERIC(14,2), purchase_date DATE,
  loan_amount NUMERIC(14,2), loan_emi NUMERIC(12,2), loan_interest_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE flats (
  id BIGSERIAL PRIMARY KEY,
  apartment_id BIGINT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  flat_no VARCHAR(20) NOT NULL,
  floor INT, area_sqft NUMERIC(10,2), bedrooms INT,
  meter_serial_no VARCHAR(50),
  owner_name VARCHAR(255), owner_phone VARCHAR(32),
  owner_share_pct NUMERIC(5,2),
  UNIQUE(apartment_id, flat_no)
);

CREATE TABLE tenancies (
  id BIGSERIAL PRIMARY KEY,
  flat_id BIGINT NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  apartment_id BIGINT NOT NULL,
  tenant_user_id BIGINT REFERENCES users(id),
  tenant_name VARCHAR(255) NOT NULL,
  tenant_phone VARCHAR(32), tenant_email VARCHAR(255),
  agreement_start DATE, agreement_end DATE,
  rent_amount NUMERIC(12,2), security_deposit NUMERIC(12,2),
  deposit_refunded NUMERIC(12,2) DEFAULT 0,
  rent_due_day INT DEFAULT 5,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE meter_readings (
  id BIGSERIAL PRIMARY KEY,
  flat_id BIGINT NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  apartment_id BIGINT NOT NULL,
  year INT NOT NULL, month VARCHAR(12) NOT NULL,
  previous_reading NUMERIC(12,2) DEFAULT 0,
  present_reading NUMERIC(12,2) DEFAULT 0,
  usage_units NUMERIC(12,2), rate_per_unit NUMERIC(8,2), bill_amount NUMERIC(12,2),
  reading_date DATE,
  UNIQUE(flat_id, year, month)
);

CREATE TABLE rent_records (
  id BIGSERIAL PRIMARY KEY,
  tenancy_id BIGINT REFERENCES tenancies(id) ON DELETE CASCADE,
  flat_id BIGINT NOT NULL, apartment_id BIGINT NOT NULL,
  tenant_name VARCHAR(255),
  month VARCHAR(12) NOT NULL, year INT NOT NULL,
  rent_amount NUMERIC(12,2) DEFAULT 0,
  ebill_amount NUMERIC(12,2) DEFAULT 0,
  water_bill NUMERIC(12,2) DEFAULT 0,
  maintenance_charge NUMERIC(12,2) DEFAULT 0,
  total_collected NUMERIC(12,2) DEFAULT 0,
  house_maid NUMERIC(12,2) DEFAULT 0,
  garbage_vehicle NUMERIC(12,2) DEFAULT 0,
  generator_diesel NUMERIC(12,2) DEFAULT 0,
  shared_ebill NUMERIC(12,2) DEFAULT 0,
  emi_interest NUMERIC(12,2) DEFAULT 0,
  property_tax NUMERIC(12,2) DEFAULT 0,
  insurance NUMERIC(12,2) DEFAULT 0,
  repairs NUMERIC(12,2) DEFAULT 0,
  other_expenses NUMERIC(12,2) DEFAULT 0,
  returns_amount NUMERIC(12,2) DEFAULT 0,
  net_income NUMERIC(14,2), cumulative_total NUMERIC(14,2),
  paid BOOLEAN DEFAULT FALSE, paid_date DATE,
  remarks VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenancy_id, year, month)
);

CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  apartment_id BIGINT NOT NULL,
  category VARCHAR(40) NOT NULL,
  subcategory VARCHAR(80),
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  vendor VARCHAR(255), invoice_no VARCHAR(80),
  notes TEXT, receipt_url TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  apartment_id BIGINT NOT NULL, flat_id BIGINT, tenancy_id BIGINT,
  invoice_no VARCHAR(40) UNIQUE NOT NULL,
  kind VARCHAR(20) NOT NULL,
  month VARCHAR(12), year INT,
  line_items JSONB NOT NULL,
  subtotal NUMERIC(12,2), tax NUMERIC(12,2), total NUMERIC(12,2),
  status VARCHAR(20) DEFAULT 'DRAFT',
  due_date DATE, paid_at TIMESTAMPTZ, pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT REFERENCES invoices(id),
  apartment_id BIGINT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  mode VARCHAR(20), reference VARCHAR(120),
  paid_at TIMESTAMPTZ DEFAULT now(),
  recorded_by BIGINT REFERENCES users(id)
);

CREATE TABLE reminders (
  id BIGSERIAL PRIMARY KEY,
  apartment_id BIGINT NOT NULL, tenancy_id BIGINT,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255), body TEXT,
  status VARCHAR(20), error TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT, user_id BIGINT,
  entity VARCHAR(60), entity_id BIGINT,
  action VARCHAR(30),
  before_json JSONB, after_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rent_apt_ym ON rent_records(apartment_id, year, month);
CREATE INDEX idx_meter_apt_ym ON meter_readings(apartment_id, year, month);
CREATE INDEX idx_exp_apt_date ON expenses(apartment_id, expense_date);
CREATE INDEX idx_inv_apt_status ON invoices(apartment_id, status);
CREATE INDEX idx_users_org ON users(org_id);
