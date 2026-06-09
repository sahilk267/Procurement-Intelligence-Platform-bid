-- Add audit tracking fields to all tables
-- This migration adds created_by and updated_by fields for audit logging

-- Users table
ALTER TABLE users ADD COLUMN created_by INTEGER;
ALTER TABLE users ADD COLUMN updated_by INTEGER;

-- Tenders table
ALTER TABLE tenders ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE tenders ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Bids table
ALTER TABLE bids ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE bids ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- BOQ Items table
ALTER TABLE boq_items ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE boq_items ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Proposals table
ALTER TABLE proposals ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE proposals ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Documents table
ALTER TABLE documents ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE documents ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Knowledge Items table
ALTER TABLE knowledge_items ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE knowledge_items ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Tender Analysis table
ALTER TABLE tender_analysis ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE tender_analysis ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Company Profiles table
ALTER TABLE company_profiles ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE company_profiles ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Competitor Records table
ALTER TABLE competitor_records ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE competitor_records ADD COLUMN updated_by INTEGER REFERENCES users(id);
ALTER TABLE competitor_records ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Vendors table
ALTER TABLE vendors ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE vendors ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Amendments table
ALTER TABLE amendments ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) NOT NULL;
ALTER TABLE amendments ADD COLUMN created_by INTEGER REFERENCES users(id);

-- Clarifications table
ALTER TABLE clarifications ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) NOT NULL;
ALTER TABLE clarifications ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE clarifications ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Monitoring Rules table
ALTER TABLE monitoring_rules ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE monitoring_rules ADD COLUMN updated_by INTEGER REFERENCES users(id);
