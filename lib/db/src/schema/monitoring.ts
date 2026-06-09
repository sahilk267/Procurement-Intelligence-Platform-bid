import { pgTable, serial, text, integer, numeric, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

export const monitoringRulesTable = pgTable("monitoring_rules", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id).notNull(),
  createdBy: integer("created_by").references(() => usersTable.id),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  name: text("name").notNull(),
  keywords: jsonb("keywords").notNull(),
  sources: jsonb("sources"),
  categories: jsonb("categories"),
  states: jsonb("states"),
  authorities: jsonb("authorities"),
  minValue: numeric("min_value", { precision: 15, scale: 2 }),
  maxValue: numeric("max_value", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMonitoringRuleSchema = createInsertSchema(monitoringRulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMonitoringRule = z.infer<typeof insertMonitoringRuleSchema>;
export type MonitoringRule = typeof monitoringRulesTable.$inferSelect;
