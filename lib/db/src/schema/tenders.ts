import { pgTable, serial, text, integer, numeric, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

export const tendersTable = pgTable("tenders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id).notNull(),
  createdBy: integer("created_by").references(() => usersTable.id),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  title: text("title").notNull(),
  referenceNumber: text("reference_number"),
  authority: text("authority").notNull(),
  category: text("category").notNull(),
  state: text("state"),
  estimatedValue: numeric("estimated_value", { precision: 15, scale: 2 }),
  emdAmount: numeric("emd_amount", { precision: 15, scale: 2 }),
  status: text("status").notNull().default("open"),
  source: text("source").notNull(),
  openingDate: date("opening_date"),
  closingDate: date("closing_date"),
  preBidDate: date("pre_bid_date"),
  description: text("description"),
  eligibilityCriteria: text("eligibility_criteria"),
  technicalSpecs: text("technical_specs"),
  paymentTerms: text("payment_terms"),
  penalties: text("penalties"),
  hiddenClauses: text("hidden_clauses"),
  riskScore: text("risk_score"),
  aiSummary: text("ai_summary"),
  portalUrl: text("portal_url"),
  isTracked: boolean("is_tracked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTenderSchema = createInsertSchema(tendersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTender = z.infer<typeof insertTenderSchema>;
export type Tender = typeof tendersTable.$inferSelect;
