INSERT INTO tenants (id, name, slug, created_at, updated_at) VALUES (1, 'ProcureIntel Demo', 'procureintel-demo', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;

INSERT INTO users (tenant_id, email, password_hash, name, role, created_at, updated_at) VALUES 
(1, 'admin@demo.com', '22208292cb9672c2fc10d7a5ef85abbf:b43317fcf5156f214a50239dc0cc4753e3f86340e4cbd76ce501a3a848f1ce04', 'Demo Admin', 'company_owner', NOW(), NOW()) 
ON CONFLICT (email) DO NOTHING;

INSERT INTO tenders (id, tenant_id, title, reference_number, authority, category, state, estimated_value, emd_amount, status, source, opening_date, closing_date, pre_bid_date, portal_url, description, eligibility_criteria, created_at, updated_at)
VALUES
  (1, 1, 'Bangalore Metro Station Electrical Works', 'BM/2026/01', 'Bangalore Metro Rail Corporation', 'Electrical', 'Karnataka', 22500000.00, 500000.00, 'open', 'gem', '2026-05-01', '2026-05-20', '2026-05-10', 'https://gem.gov.in/tenders/1', 'Supply, installation and testing of electrical equipment for new metro station.', 'Company must have completed at least 2 electrical metro projects in last 5 years.', NOW(), NOW()),
  (2, 1, 'State Highway Bridge Construction', 'SHB/2026/44', 'Karnataka Public Works Department', 'Civil', 'Karnataka', 81000000.00, 1500000.00, 'open', 'state', '2026-05-05', '2026-05-25', '2026-05-15', 'https://state.gov.in/tenders/2', 'Construction of a new 4-lane bridge on NH47 including foundations and superstructure.', 'Bidders must have minimum annual turnover of ₹100 crore and relevant bridge work experience.', NOW(), NOW()),
  (3, 1, 'Railway Signalling and Telecom Upgrade', 'RTE/2026/12', 'Indian Railways', 'Railway', 'Karnataka', 54000000.00, 1000000.00, 'open', 'railway', '2026-05-03', '2026-05-23', '2026-05-14', 'https://railway.gov.in/tenders/3', 'Upgrade signalling and telecom systems on the Bangalore-Mysore corridor.', 'Vendor must hold valid RDSO approval and prior signalling contract experience.', NOW(), NOW()),
  (4, 1, 'Solar Panel Supply for Government School Campuses', 'GEM/2026/77', 'GeM Portal', 'Electrical', 'Karnataka', 12500000.00, 250000.00, 'open', 'gem', '2026-05-08', '2026-05-28', '2026-05-18', 'https://gem.gov.in/tenders/4', 'Supply of solar PV modules, inverters, and mounting structures for 25 government schools.', 'Bidder must be registered on GeM and have completed at least 5 solar EPC projects.', NOW(), NOW()),
  (5, 1, 'IT Hardware Procurement for Municipal Corporation', 'GEM/2026/81', 'GeM Portal', 'IT', 'Karnataka', 18500000.00, 100000.00, 'open', 'gem', '2026-05-06', '2026-05-26', '2026-05-16', 'https://gem.gov.in/tenders/5', 'Procurement of laptops, desktops, and networking equipment for city administration offices.', 'Vendor must be an authorized reseller with GST compliance and warranty support.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO monitoring_rules (tenant_id, name, keywords, sources, categories, states, authorities, is_active, created_at, updated_at) VALUES
(1, 'Demo infrastructure opportunities', '["electrical","solar","IT infrastructure"]'::jsonb, '["gem","cppp","state","railway","defence","municipal","private"]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;
