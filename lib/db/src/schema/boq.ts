import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bidsTable } from "./bids";

export const boqItemsTable = pgTable("boq_items", {
  id: serial("id").primaryKey(),
  bidId: integer("bid_id").references(() => bidsTable.id).notNull(),
  description: text("description").notNull(),
  unit: text("unit"),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 15, scale: 2 }).notNull(),
  margin: numeric("margin", { precision: 5, scale: 2 }),
  gst: numeric("gst", { precision: 5, scale: 2 }),
  vendorQuote: numeric("vendor_quote", { precision: 15, scale: 2 }),
  winProbability: numeric("win_probability", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBoqItemSchema = createInsertSchema(boqItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBoqItem = z.infer<typeof insertBoqItemSchema>;
export type BoqItem = typeof boqItemsTable.$inferSelect;
