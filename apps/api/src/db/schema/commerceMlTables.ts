import { pgTable, uuid, text, integer, bigint, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations, users } from "./auth.js";

/**
 * Journal of exported CommerceML 2.09 packages per organization (dedup against double-posting).
 */
export const commercemlExportedPackages = pgTable(
	"commerceml_exported_packages",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
		packageId: text("package_id").notNull(),
		packageKind: text("package_kind").notNull().default("shift_export"),
		documentCount: integer("document_count").notNull().default(0),
		totalAmountKopecks: bigint("total_amount_kopecks", { mode: "bigint" }).notNull().default(0n),
		exportedByUserId: uuid("exported_by_user_id").references(() => users.id, { onDelete: "set null" }),
		exportedAt: timestamp("exported_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("uq_commerceml_exported_packages_org_pkg").on(table.organizationId, table.packageId),
	],
);

/**
 * Audit journal for inbound and outbound CommerceML 2.09 synchronization runs.
 */
export const commercemlSyncJournal = pgTable(
	"commerceml_sync_journal",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
		syncId: text("sync_id").notNull(),
		packageId: text("package_id"),
		direction: text("direction").notNull().default("inbound"),
		status: text("status").notNull(),
		processedCount: integer("processed_count").notNull().default(0),
		createdCount: integer("created_count").notNull().default(0),
		updatedCount: integer("updated_count").notNull().default(0),
		errorsJson: jsonb("errors_json").$type<string[]>().notNull().default([]),
		summaryText: text("summary_text").notNull().default(""),
		actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("idx_commerceml_sync_journal_org_created").on(table.organizationId, table.createdAt),
		index("idx_commerceml_sync_journal_org_sync_id").on(table.organizationId, table.syncId),
	],
);
