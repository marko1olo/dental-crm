import type { FiscalReceiptDetails } from "@dental/shared";
import { sql, relations } from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import {
	ledgerPaymentMethod,
	paymentMethod,
	paymentStatus,
} from "../_common.js";
import { organizations } from "../auth.js";
import { visits } from "../clinical.js";
import { patients } from "../patients.js";

export const payments = pgTable(
	"payments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		documentId: uuid("document_id"),
		clientMutationId: text("client_mutation_id"),
		/*
		 * Рубли с копейками, точный десятичный тип (миграция 0131). Раньше здесь был
		 * integer, и касса не могла принять ни 1500,50, ни 0,50.
		 *
		 * `mode: "number"` обязателен, а не косметика. По умолчанию drizzle отдаёт
		 * numeric строкой: `mapFromDriverValue` возвращает `String(value)`, причём
		 * независимо от разбора типов в драйвере. Первый заход был сделан через
		 * `$type<number>()` — тип стал числом только для компилятора, а в бою
		 * приходила строка «1500.50», схема оплаты её отвергала, и получалось худшее
		 * из возможного: платёж уже лёг в базу, а кассир увидел ошибку. С этим
		 * режимом drizzle сам приводит значение к числу при чтении и к строке при
		 * записи.
		 */
		amountRub: numeric("amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		amountKopecks: bigint("amount_kopecks", { mode: "bigint" })
			.notNull()
			.default(0n),
		method: paymentMethod("method").notNull().default("card"),
		status: paymentStatus("status").notNull().default("paid"),
		paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
		fiscalReceiptNumber: text("fiscal_receipt_number"),
		fiscalReceiptIssuedAt: text("fiscal_receipt_issued_at"),
		fiscalReceiptUrl: text("fiscal_receipt_url"),
		fiscalReceipt: jsonb("fiscal_receipt").$type<FiscalReceiptDetails | null>(),
		payerFullName: text("payer_full_name"),
		payerInn: text("payer_inn"),
		payerBirthDate: text("payer_birth_date"),
		payerIdentityDocument: text("payer_identity_document"),
		payerRelationship: text("payer_relationship"),
		taxDeductionCode: text("tax_deduction_code"),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			idxPaymentsOrgPaidAt: index("idx_payments_org_paid_at").on(
				table.organizationId,
				table.paidAt,
			),
			idxPaymentsOrgCreatedDesc: index("idx_payments_org_created_desc").on(
				table.organizationId,
				table.createdAt.desc(),
			),
			idxPaymentsOrgPatient: index("idx_payments_org_patient").on(
				table.organizationId,
				table.patientId,
			),
			idxPaymentsOrgPatientCreated: index("idx_payments_org_patient_created").on(
				table.organizationId,
				table.patientId,
				table.createdAt,
			),
			idxPaymentsOrgStatus: index("idx_payments_org_status").on(
				table.organizationId,
				table.status,
			),
			paymentsOrgClientMutationUnique: unique(
				"payments_org_client_mutation_unique",
			).on(table.organizationId, table.clientMutationId),
			patientIdIdx: index("payments_patientId_idx").on(table.patientId),
			visitIdIdx: index("payments_visitId_idx").on(table.visitId),
			documentIdIdx: index("payments_document_id_idx").on(table.documentId),
		};
	},
);

export const fiscalReceiptQueue = pgTable(
	"fiscal_receipt_queue",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		paymentId: uuid("payment_id").references(() => payments.id, {
			onDelete: "set null",
		}),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		receiptType: varchar("receipt_type", { length: 32 }).notNull(),
		status: varchar("status", { length: 32 })
			.$type<
				| "pending_print"
				| "printing"
				| "printed"
				| "hardware_offline"
				| "offline_pending"
				| "dead_letter"
				| "failed"
			>()
			.notNull()
			.default("pending_print"),
		payloadJson: jsonb("payload_json").notNull(),
		retryCount: integer("retry_count").notNull().default(0),
		lastError: text("last_error"),
		printedAt: timestamp("printed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		idxFiscalReceiptQueueOrgStatus: index(
			"idx_fiscal_receipt_queue_org_status",
		).on(table.organizationId, table.status),
		idxFiscalReceiptQueueOrgCreatedAt: index(
			"idx_fiscal_receipt_queue_org_created_at",
		).on(table.organizationId, table.createdAt),
		idxFiscalReceiptQueuePaymentId: index(
			"idx_fiscal_receipt_queue_payment_id",
		).on(table.paymentId),
		idxFiscalReceiptQueueVisitId: index(
			"idx_fiscal_receipt_queue_visit_id",
		).on(table.visitId),
	}),
);

export type FiscalReceiptQueueItem = typeof fiscalReceiptQueue.$inferSelect;

export type NewFiscalReceiptQueueItem = typeof fiscalReceiptQueue.$inferInsert;

// #58 — финансы::закрепение_денег_за_врачами_или_услугами
export const advanceDepositTaggings = pgTable(
	"advance_deposit_taggings",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").references(() => patients.id, {
			onDelete: "cascade",
		}),
		patientName: text("patient_name").notNull(),
		depositAmountKopecks: bigint("deposit_amount_kopecks", { mode: "bigint" })
			.notNull()
			.default(sql`0`),
		taggedTargetType: text("tagged_target_type").notNull(),
		taggedTargetName: text("tagged_target_name").notNull(),
		allocationStatus: text("allocation_status").default("pinned").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("advance_deposit_taggings_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("advance_deposit_taggings_patient_id_idx").on(
			t.patientId,
		),
	}),
);

export const sberbankTransactions = pgTable(
	"sberbank_transactions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		orderId: text("order_id").notNull(),
		amountKopecks: bigint("amount_kopecks", { mode: "bigint" }).notNull(),
		status: text("status").notNull(),
		patientId: uuid("patient_id").notNull(),
		visitId: text("visit_id"),
		documentId: text("document_id"),
		invoiceId: text("invoice_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(t) => ({
		organizationIdIdx: index("sberbank_transactions_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("sberbank_transactions_patient_id_idx").on(
			t.patientId,
		),
		orgCreatedIdx: index("sberbank_transactions_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
		orgOrderUniqueIdx: uniqueIndex("sberbank_transactions_org_order_id_uidx").on(
			t.organizationId,
			t.orderId,
		),
	}),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
	organization: one(organizations, {
		fields: [payments.organizationId],
		references: [organizations.id],
	}),
	patient: one(patients, {
		fields: [payments.patientId],
		references: [patients.id],
	}),
	visit: one(visits, {
		fields: [payments.visitId],
		references: [visits.id],
	}),
}));
