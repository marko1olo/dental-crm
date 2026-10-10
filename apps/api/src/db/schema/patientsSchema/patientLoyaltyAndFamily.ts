import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../auth.js";
import { payments } from "../billing.js";
import { patients } from "./patientCore.js";

// family groups (linked family accounts)
export const familyGroups = pgTable(
	"family_groups",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		/**
		 * NOT NULL с миграции 0119. Раньше колонка допускала NULL, а
		 * routes/finance_family.ts выбирал группы условием
		 * `organization_id = :orgId OR organization_id IS NULL` и присваивал
		 * найденную бесхозную группу первой обратившейся клинике — вместе с
		 * балансом семейного кошелька.
		 */
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		// Primary identifiers — 'name' is the display name, 'groupName' kept for compat
		name: text("name"),
		groupName: text("group_name").notNull().default(""),
		// The head (primary) patient of the family; the billing wallet is tied here
		headPatientId: uuid("head_patient_id"),
		primaryPatientId: uuid("primary_patient_id"),
		/**
		 * Баланс семейного кошелька.
		 *
		 * Колонка физически создана как numeric(12, 2) (миграция 0000), и драйвер
		 * отдаёт её СТРОКОЙ. Раньше здесь стояло integer("balance") с комментарием
		 * «in whole rubles»: TypeScript был уверен, что это number, а в рантайме
		 * приходило "150.50", и любое сложение без Number() давало склейку строк —
		 * "150.50" + 1000 === "150.501000". Объявление приведено к настоящему типу,
		 * чтобы компилятор требовал явного перевода через parseKopecks().
		 */
		balance: numeric("balance", { precision: 12, scale: 2 })
			.notNull()
			.default("0.00"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("family_groups_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// family recommendation sources (family referral attribution)
export const familyRecommendationSources = pgTable(
	"family_recommendation_sources",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		familyGroupName: text("family_group_name").notNull(),
		newMemberName: text("new_member_name").notNull(),
		referrerMemberName: text("referrer_member_name").notNull(),
		assignedMarketingSource: text("assigned_marketing_source")
			.notNull()
			.default("Рекомендация семьи"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"family_recommendation_sources_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #6 — маркетинг::фильтр_потерянных_пациентов_в_отчете
export const lostPatientsFilters = pgTable(
	"lost_patients_filters",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		phone: text("phone").notNull(),
		daysSinceLastVisit: integer("days_since_last_visit").default(90).notNull(),
		hasFutureAppointment: boolean("has_future_appointment")
			.default(false)
			.notNull(),
		hasActiveCrmTask: boolean("has_active_crm_task").default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("lost_patients_filters_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

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
	}),
);

export const referralCampaigns = pgTable(
	"referral_campaigns",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		name: text("name").notNull().default("Приведи друга"),
		isActive: boolean("is_active").notNull().default(true),
		refereeWelcomePoints: numeric("referee_welcome_points", {
			precision: 12,
			scale: 2,
		})
			.notNull()
			.default("500.00"),
		referrerTier1Points: numeric("referrer_tier1_points", {
			precision: 12,
			scale: 2,
		})
			.notNull()
			.default("1000.00"),
		referrerTier2Points: numeric("referrer_tier2_points", {
			precision: 12,
			scale: 2,
		})
			.notNull()
			.default("300.00"),
		minFirstSpendThresholdRub: numeric("min_first_spend_threshold_rub", {
			precision: 12,
			scale: 2,
		})
			.notNull()
			.default("1500.00"),
		shareMessageTemplate: text("share_message_template")
			.notNull()
			.default(
				"Привет! Дарю тебе 500 ₽ на первое лечение в стоматологии {clinicName}. Запишись по ссылке: {inviteLink}",
			),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("referral_campaigns_org_idx").on(t.organizationId),
	}),
);

export const patientReferralCodes = pgTable(
	"patient_referral_codes",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		referralCode: text("referral_code").notNull(),
		referralToken: text("referral_token").notNull(),
		clickCount: integer("click_count").notNull().default(0),
		signupCount: integer("signup_count").notNull().default(0),
		convertedCount: integer("converted_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		codeIdx: uniqueIndex("patient_referral_codes_code_idx").on(
			t.organizationId,
			t.referralCode,
		),
		tokenIdx: uniqueIndex("patient_referral_codes_token_idx").on(
			t.referralToken,
		),
		patientIdx: uniqueIndex("patient_referral_codes_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
	}),
);

export const patientReferrals = pgTable(
	"patient_referrals",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		campaignId: uuid("campaign_id").references(() => referralCampaigns.id),
		referrerPatientId: uuid("referrer_patient_id")
			.notNull()
			.references(() => patients.id),
		parentReferrerPatientId: uuid("parent_referrer_patient_id").references(
			() => patients.id,
		),
		refereePatientId: uuid("referee_patient_id")
			.notNull()
			.references(() => patients.id),
		status: text("status").notNull().default("registered"),
		qualifyingPaymentId: uuid("qualifying_payment_id").references(
			() => payments.id,
		),
		qualifyingAmountRub: numeric("qualifying_amount_rub", {
			precision: 12,
			scale: 2,
		}),
		rewardedAt: timestamp("rewarded_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		refereeIdx: uniqueIndex("patient_referrals_referee_idx").on(
			t.organizationId,
			t.refereePatientId,
		),
		referrerIdx: index("patient_referrals_referrer_idx").on(
			t.organizationId,
			t.referrerPatientId,
		),
	}),
);

export const patientRelationships = pgTable(
	"patient_relationships",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		relatedPatientId: uuid("related_patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		relationshipType: text("relationship_type").notNull(),
		isLegalRepresentative: boolean("is_legal_representative").notNull().default(false),
		canViewMedicalRecord: boolean("can_view_medical_record").notNull().default(false),
		canSignConsents: boolean("can_sign_consents").notNull().default(false),
		canSpendFamilyWallet: boolean("can_spend_family_wallet").notNull().default(false),
		documentProofNumber: text("document_proof_number"),
		isPrimaryPayer: boolean("is_primary_payer").notNull().default(false),
		canViewRecords: boolean("can_view_records").notNull().default(false),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("patient_relationships_org_idx").on(t.organizationId),
		patientIdx: index("patient_relationships_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
		relatedPatientIdx: index("patient_relationships_related_patient_idx").on(
			t.organizationId,
			t.relatedPatientId,
		),
		pairUniqIdx: uniqueIndex("patient_relationships_pair_uniq_idx").on(
			t.patientId,
			t.relatedPatientId,
		),
		noSelfLinkCheck: check(
			"patient_relationships_no_self_link",
			sql`${t.patientId} != ${t.relatedPatientId}`,
		),
	}),
);
