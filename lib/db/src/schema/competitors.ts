import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const competitorRecordsTable = pgTable("competitor_records", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id).notNull(),
  companyName: text("company_name").notNull(),
  tenderId: integer("tender_id"),
  tenderTitle: text("tender_title"),
  awardedAmount: numeric("awarded_amount", { precision: 15, scale: 2 }),
  authority: text("authority"),
  year: integer("year"),
  category: text("category"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const amendmentsTable = pgTable("amendments", {
  id: serial("id").primaryKey(),
  tenderId: integer("tender_id").notNull(),
  version: integer("version").notNull().default(1),
  type: text("type").notNull(),
  summary: text("summary").notNull(),
  changes: text("changes"),
  publishedAt: timestamp("published_at"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
});

export const clarificationsTable = pgTable("clarifications", {
  id: serial("id").primaryKey(),
  bidId: integer("bid_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  status: text("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id).notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  type: text("type").notNull(),
  categories: text("categories").array(),
  oemProducts: text("oem_products").array(),
  rating: numeric("rating", { precision: 3, scale: 1 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  type: text("type").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompetitorSchema = createInsertSchema(competitorRecordsTable).omit({ id: true, createdAt: true });
export const insertAmendmentSchema = createInsertSchema(amendmentsTable).omit({ id: true, detectedAt: true });
export const insertClarificationSchema = createInsertSchema(clarificationsTable).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });

export type Competitor = typeof competitorRecordsTable.$inferSelect;
export type Amendment = typeof amendmentsTable.$inferSelect;
export type Clarification = typeof clarificationsTable.$inferSelect;
export type Vendor = typeof vendorsTable.$inferSelect;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
