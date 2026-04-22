import { pgTable, serial, text, integer, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tendersTable } from "./tenders";
import { tenantsTable } from "./tenants";

export const tenderAnalysisTable = pgTable("tender_analysis", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id).notNull(),
  tenderId: integer("tender_id").references(() => tendersTable.id).notNull(),
  eligibilityScore: numeric("eligibility_score", { precision: 5, scale: 2 }),
  riskScore: text("risk_score"),
  eligibilityCriteria: jsonb("eligibility_criteria"),
  keyDeadlines: jsonb("key_deadlines"),
  riskFactors: jsonb("risk_factors"),
  hiddenClauses: jsonb("hidden_clauses"),
  turnoverRequired: numeric("turnover_required", { precision: 15, scale: 2 }),
  certifications: jsonb("certifications"),
  emdAmount: numeric("emd_amount", { precision: 15, scale: 2 }),
  paymentTerms: text("payment_terms"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companyProfileTable = pgTable("company_profiles", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id).notNull().unique(),
  companyName: text("company_name").notNull(),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  annualTurnover: numeric("annual_turnover", { precision: 15, scale: 2 }),
  yearsOfExperience: integer("years_of_experience"),
  certifications: jsonb("certifications"),
  oemAuthorizations: jsonb("oem_authorizations"),
  pastProjects: jsonb("past_projects"),
  categories: jsonb("categories"),
  states: jsonb("states"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTenderAnalysisSchema = createInsertSchema(tenderAnalysisTable).omit({ id: true, createdAt: true });
export const insertCompanyProfileSchema = createInsertSchema(companyProfileTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenderAnalysis = z.infer<typeof insertTenderAnalysisSchema>;
export type TenderAnalysis = typeof tenderAnalysisTable.$inferSelect;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type CompanyProfile = typeof companyProfileTable.$inferSelect;
