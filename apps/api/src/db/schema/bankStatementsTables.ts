import { pgTable, uuid, text, integer, bigint, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations, users } from "./auth.js";
import { cashOperations } from "./finance.js";

/**
 * Uploaded 1C DirectBank / KlientBank statement headers with deduplicated source SHA-256 hash.
 */
export const bankStatements = pgTable(
	"bank_statements",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
		uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
		sourceFilename: text("source_filename").notNull(),
		sourceHash: text("source_hash").notNull(),
		bankAccountNumber: text("bank_account_number").notNull().default(""),
		periodStart: text("period_start"),
		periodEnd: text("period_end"),
		openingBalanceKopecks: bigint("opening_balance_kopecks", { mode: "bigint" }).notNull().default(0n),
		closingBalanceKopecks: bigint("closing_balance_kopecks", { mode: "bigint" }).notNull().default(0n),
		totalIncomingKopecks: bigint("total_incoming_kopecks", { mode: "bigint" }).notNull().default(0n),
		totalOutgoingKopecks: bigint("total_outgoing_kopecks", { mode: "bigint" }).notNull().default(0n),
		transactionCount: integer("transaction_count").notNull().default(0),
		matchedCount: integer("matched_count").notNull().default(0),
		unmatchedCount: integer("unmatched_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("uq_bank_statements_org_source_hash").on(table.organizationId, table.sourceHash),
	],
);

/**
 * Parsed individual payment orders from 1C DirectBank statements with cash_operations reconciliation link.
 */
export const bankStatementTransactions = pgTable(
	"bank_statement_transactions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
		statementId: uuid("statement_id").notNull().references(() => bankStatements.id, { onDelete: "cascade" }),
		txFingerprint: text("tx_fingerprint").notNull(),
		documentNumber: text("document_number").notNull(),
		documentDate: text("document_date").notNull(),
		direction: text("direction").notNull(),
		amountKopecks: bigint("amount_kopecks", { mode: "bigint" }).notNull().default(0n),
		payerName: text("payer_name").notNull().default(""),
		payerInn: text("payer_inn"),
		receiverName: text("receiver_name").notNull().default(""),
		receiverInn: text("receiver_inn"),
		paymentPurpose: text("payment_purpose").notNull().default(""),
		matchStatus: text("match_status").notNull().default("unmatched"),
		matchedCashOperationId: uuid("matched_cash_operation_id").references(() => cashOperations.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("uq_bank_statement_tx_org_fingerprint").on(table.organizationId, table.txFingerprint),
		index("idx_bank_statement_tx_statement_id").on(table.statementId),
	],
);
