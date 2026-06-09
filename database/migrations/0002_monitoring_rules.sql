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
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
