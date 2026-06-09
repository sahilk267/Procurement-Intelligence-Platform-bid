import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { tenantsTable } from "./tenants";

export const ingestionRunsTable = pgTable("ingestion_runs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id).notNull(),
  sources: text("sources").array().notNull(),
  imported: integer("imported").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  errors: text("errors").array().notNull().default([]),
  status: text("status").notNull(),
  description: text("description").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIngestionRunSchema = createInsertSchema(ingestionRunsTable).omit({ id: true, createdAt: true });

export type IngestionRun = typeof ingestionRunsTable.$inferSelect;
