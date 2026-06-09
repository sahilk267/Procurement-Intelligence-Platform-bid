-- Basic schema for Procurement Intelligence Platform
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  tenant_id INTEGER REFERENCES tenants(id),
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenders (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  value NUMERIC(15,2),
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  published_date DATE,
  closing_date DATE,
  source TEXT,
  source_url TEXT,
  is_tracked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  tender_id INTEGER REFERENCES tenders(id) NOT NULL,
  stage TEXT NOT NULL DEFAULT 'shortlisted',
  assigned_to INTEGER REFERENCES users(email),
  notes TEXT,
  target_value NUMERIC(15,2),
  submission_date DATE,
  result_date DATE,
  won_value NUMERIC(15,2),
  lost_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_rules (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  keywords JSONB NOT NULL,
  sources JSONB,
  categories JSONB,
  states JSONB,
  authorities JSONB,
  min_value NUMERIC(15,2),
  max_value NUMERIC(15,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert seed data
INSERT INTO tenants (id, name, slug, created_at, updated_at) VALUES (1, 'ProcureIntel Demo', 'procureintel-demo', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;

INSERT INTO users (tenant_id, email, password_hash, name, role, created_at, updated_at) VALUES
(1, 'admin@demo.com', '22208292cb9672c2fc10d7a5ef85abbf:b43317fcf5156f214a50239dc0cc4753e3f86340e4cbd76ce501a3a848f1ce04', 'Demo Admin', 'company_owner', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO monitoring_rules (tenant_id, name, keywords, sources, categories, states, authorities, is_active, created_at, updated_at) VALUES
(1, 'Demo infrastructure opportunities', '["electrical","solar","IT infrastructure"]'::jsonb, '["gem","cppp","state","railway","defence","municipal","private"]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;
