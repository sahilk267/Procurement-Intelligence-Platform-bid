import { pgTable, serial, text, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { tendersTable } from "./tenders";
import { usersTable } from "./users";

export const bidsTable = pgTable("bids", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id).notNull(),
  tenderId: integer("tender_id").references(() => tendersTable.id).notNull(),
  createdBy: integer("created_by").references(() => usersTable.id),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  stage: text("stage").notNull().default("shortlisted"),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  notes: text("notes"),
  targetValue: numeric("target_value", { precision: 15, scale: 2 }),
  submissionDate: date("submission_date"),
  resultDate: date("result_date"),
  wonValue: numeric("won_value", { precision: 15, scale: 2 }),
  lostReason: text("lost_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bidTasksTable = pgTable("bid_tasks", {
  id: serial("id").primaryKey(),
  bidId: integer("bid_id").references(() => bidsTable.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignedRole: text("assigned_role"),
  status: text("status").notNull().default("pending"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBidSchema = createInsertSchema(bidsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBidTaskSchema = createInsertSchema(bidTasksTable).omit({ id: true, createdAt: true });
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bidsTable.$inferSelect;
export type InsertBidTask = z.infer<typeof insertBidTaskSchema>;
export type BidTask = typeof bidTasksTable.$inferSelect;
