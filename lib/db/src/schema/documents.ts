import { pgTable, serial, text, integer, date, boolean, timestamp, numeric, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id).notNull(),
  createdBy: integer("created_by").references(() => usersTable.id),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url"),
  expiryDate: date("expiry_date"),
  // OCR related fields
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  extractedText: text("extracted_text"),
  textConfidence: numeric("text_confidence", { precision: 5, scale: 2 }),
  language: text("language"),
  parsedContent: json("parsed_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
