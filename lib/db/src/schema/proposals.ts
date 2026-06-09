import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bidsTable } from "./bids";
import { usersTable } from "./users";

export const proposalsTable = pgTable("proposals", {
  id: serial("id").primaryKey(),
  bidId: integer("bid_id").references(() => bidsTable.id).notNull(),
  createdBy: integer("created_by").references(() => usersTable.id),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  version: integer("version").notNull().default(1),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProposalSchema = createInsertSchema(proposalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposalsTable.$inferSelect;
