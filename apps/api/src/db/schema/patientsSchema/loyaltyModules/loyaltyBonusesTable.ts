import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../../auth.js";
import { payments } from "../../billing.js";
import { patients } from "../patientCore.js";

// ─── Loyalty Programs & Patient Bonus Balances ───────────────────────────────

export const loyaltyPrograms = pgTable(
	"loyalty_programs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		name: text("name").notNull(),
		tier: text("tier").notNull().default("bronze"),
		minSpendThresholdRub: numeric("min_spend_threshold_rub", {
			precision: 12,
			scale: 2,
		})
			.notNull()
			.default("0.00"),
		cashbackPercent: numeric("cashback_percent", {
			precision: 5,
			scale: 2,
		})
			.notNull()
			.default("3.00"),
		maxInvoiceCoveragePercent: numeric("max_invoice_coverage_percent", {
			precision: 5,
			scale: 2,
		})
			.notNull()
			.default("30.00"),
		pointsTtlDays: integer("points_ttl_days").default(180),
		pointRateRub: numeric("point_rate_rub", {
			precision: 12,
			scale: 2,
		})
			.notNull()
			.default("1.00"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("loyalty_programs_org_idx").on(t.organizationId),
	}),
);

export const patientBonusBalances = pgTable(
	"patient_bonus_balances",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		activePoints: numeric("active_points", { precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		pendingPoints: numeric("pending_points", { precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		lifetimeEarnedPoints: numeric("lifetime_earned_points", {
			precision: 12,
			scale: 2,
		})
			.notNull()
			.default("0.00"),
		lifetimeSpentPoints: numeric("lifetime_spent_points", {
			precision: 12,
			scale: 2,
		})
			.notNull()
			.default("0.00"),
		lifetimeExpiredPoints: numeric("lifetime_expired_points", {
			precision: 12,
			scale: 2,
		})
			.notNull()
			.default("0.00"),
		currentLoyaltyProgramId: uuid("current_loyalty_program_id").references(
			() => loyaltyPrograms.id,
		),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: uniqueIndex("patient_bonus_balances_org_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
	}),
);

export const bonusTransactions = pgTable(
	"bonus_transactions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		amountPoints: numeric("amount_points", { precision: 12, scale: 2 }).notNull(),
		balanceAfterPoints: numeric("balance_after_points", {
			precision: 12,
			scale: 2,
		}).notNull(),
		type: text("type").notNull(),
		relatedPaymentId: uuid("related_payment_id").references(() => payments.id),
		relatedInvoiceId: uuid("related_invoice_id"),
		relatedReferralId: uuid("related_referral_id"),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		unspentPoints: numeric("unspent_points", { precision: 12, scale: 2 }).default(
			"0.00",
		),
		clientMutationId: text("client_mutation_id"),
		description: text("description").notNull(),
		createdById: uuid("created_by_id").references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		patientIdx: index("bonus_transactions_patient_idx").on(
			t.organizationId,
			t.patientId,
			t.createdAt,
		),
		mutationIdx: uniqueIndex("bonus_tx_org_mutation_unique").on(
			t.organizationId,
			t.clientMutationId,
		),
		relatedPaymentIdx: index("bonus_tx_related_payment_idx").on(
			t.relatedPaymentId,
		),
		relatedInvoiceIdx: index("bonus_tx_related_invoice_idx").on(
			t.relatedInvoiceId,
		),
		orgCreatedIdx: index("bonus_tx_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
	}),
);

export type LoyaltyProgram = InferSelectModel<typeof loyaltyPrograms>;
export type NewLoyaltyProgram = InferInsertModel<typeof loyaltyPrograms>;

export type PatientBonusBalance = InferSelectModel<typeof patientBonusBalances>;
export type NewPatientBonusBalance = InferInsertModel<typeof patientBonusBalances>;

export type BonusTransaction = InferSelectModel<typeof bonusTransactions>;
export type NewBonusTransaction = InferInsertModel<typeof bonusTransactions>;
