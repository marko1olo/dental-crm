import type {
	PatientAdministrativeProfile,
} from "@dental/shared";
import { sql, relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { patientStatus } from "./_common.js";
import { organizations, users } from "./auth.js";
import { payments } from "./billing.js";
import { visits } from "./clinical.js";
import { appointments } from "./schedule.js";

export const patients = pgTable(
	"patients",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		status: patientStatus("status").notNull().default("active"),
		fullName: text("full_name").notNull(),
		birthDate: text("birth_date"),
		phone: text("phone"),
		email: text("email"),
		notes: text("notes"),
		administrativeProfile: jsonb(
			"administrative_profile",
		).$type<PatientAdministrativeProfile | null>(),
		familyGroupId: uuid("family_group_id"),
		/**
		 * Куда объединена карточка (миграция 0128). Заполнено — значит это дубль, все
		 * записи, оплаты и снимки перенесены в указанную карточку.
		 *
		 * Карточка при слиянии НЕ УДАЛЯЕТСЯ: это медицинские данные, и удаление
		 * лишает клинику доказательств. Открыв её по старой ссылке, администратор
		 * должен увидеть, куда она объединена, а не пустоту.
		 */
		mergedIntoPatientId: uuid("merged_into_patient_id"),
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			idxPatientsOrgCreated: index("idx_patients_org_created").on(
				table.organizationId,
				table.createdAt,
			),
		};
	},
);

export const patientConsents = pgTable(
	"patient_consents",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		kind: text("kind").notNull(),
		grantedAt: timestamp("granted_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		documentId: uuid("document_id"),
	},
	(t) => ({
		organizationIdIdx: index("patient_consents_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("patient_consents_patient_id_idx").on(t.patientId),
		documentIdIdx: index("patient_consents_document_id_idx").on(t.documentId),
	}),
);

// =====================================================
// WAVE 9 & WAVE 10 — COMPETITOR PARITY SCHEMA TABLES
// =====================================================

// #46 — рабочее_место::история_последних_просмотренных_карточек
export const recentPatientHistory = pgTable(
	"recent_patient_history",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		userId: uuid("user_id").notNull(),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		patientName: text("patient_name").notNull(),
		phone: text("phone"),
		lastViewedAt: timestamp("last_viewed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("recent_patient_history_organization_id_idx").on(
			t.organizationId,
		),
		userIdIdx: index("recent_patient_history_user_id_idx").on(t.userId),
		patientIdIdx: index("recent_patient_history_patient_id_idx").on(
			t.patientId,
		),
	}),
);

// #55 — пациенты::вкладка_приемы_рабочий_стол_администратора
export const patientServiceLineages = pgTable(
	"patient_service_lineages",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		leadSource: text("lead_source").notNull(),
		rescheduleCount: integer("reschedule_count").default(0).notNull(),
		waitlistEntryId: uuid("waitlist_entry_id"),
		finalVisitId: uuid("final_visit_id"),
		lifecycleStage: text("lifecycle_stage").default("completed").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("patient_service_lineages_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// =====================================================
// WAVE 12 — COMPETITOR PARITY SCHEMA TABLES
// =====================================================

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

// patient duplicate merge queues (deduplication workflow)
export const patientDuplicateMergeQueues = pgTable(
	"patient_duplicate_merge_queues",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		sourcePatientId: uuid("source_patient_id").notNull(),
		targetPatientId: uuid("target_patient_id").notNull(),
		matchScore: numeric("match_score", { precision: 5, scale: 4 }),
		status: text("status").notNull().default("pending"),
		resolvedBy: uuid("resolved_by"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"patient_duplicate_merge_queues_organizationId_idx",
		).on(t.organizationId),
	}),
);

/**
 * Задачи (поручения) по пациенту: перезвонить, дослать документы, проверить
 * самочувствие.
 *
 * Экран карточки (PatientTaskTicketsWidget) умел создавать поручение, отмечать
 * его выполненным, возвращать в работу и удалять — а сервера под ним не было:
 * живая проверка сети видела на карточке 404 на GET .../tickets. Имена полей
 * повторяют контракт, который экран уже отправляет. Физическая таблица:
 * drizzle/0144_patient_task_tickets.sql.
 */
export const patientTaskTickets = pgTable(
	"patient_task_tickets",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").notNull(),
		// Без внешнего ключа намеренно: сотрудника могут уволить и удалить, а
		// поручение обязано остаться в карте. Экран показывает «Неизвестный сотрудник».
		assignedToId: uuid("assigned_to_id"),
		title: text("title").notNull(),
		description: text("description"),
		status: text("status").notNull().default("pending"),
		priority: text("priority").notNull().default("normal"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("patient_task_tickets_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

/**
 * Рекламации и осложнения по пациенту — основание для гарантии, возврата и
 * переделки.
 *
 * Экран карточки (PatientReclamationsWidget) умел фиксировать, урегулировать и
 * удалять инциденты, а сервера под ним не было: живая проверка сети видела на
 * карточке 404. Имена полей повторяют контракт, который экран уже отправляет —
 * менять их значило бы ломать работающий клиент. Физическая таблица:
 * drizzle/0143_patient_reclamations.sql.
 */
export const patientReclamations = pgTable(
	"patient_reclamations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").notNull(),
		// Без внешнего ключа намеренно: сотрудника могут уволить и удалить, а разбор
		// по его работе обязан остаться в карте.
		doctorId: uuid("doctor_id"),
		complicationDetails: text("complication_details").notNull(),
		proposedAction: text("proposed_action"),
		status: text("status").notNull().default("under_review"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("patient_reclamations_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// patient archive reasons and blacklists
export const patientArchiveReasonsAndBlacklists = pgTable(
	"patient_archive_reasons_and_blacklists",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id"),
		patientName: text("patient_name"),
		archiveReason: text("archive_reason"),
		isBlacklisted: boolean("is_blacklisted").notNull().default(false),
		isBookingBlocked: boolean("is_booking_blocked").notNull().default(true),
		warningBadge: text("warning_badge").notNull().default("Черный список"),
		blacklistReason: text("blacklist_reason"),
		archivedBy: uuid("archived_by"),
		archivedAt: timestamp("archived_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"patient_archive_reasons_and_blacklists_organizationId_idx",
		).on(t.organizationId),
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

export const patientDrugAllergies = pgTable(
	"patient_drug_allergies",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		allergenGroup: text("allergen_group").notNull(),
		drugInnLatin: text("drug_inn_latin"),
		reactionSeverity: text("reaction_severity").notNull(),
		clinicalManifestations: text("clinical_manifestations").notNull(),
		diagnosedDate: date("diagnosed_date"),
		isConfirmedByAllergist: boolean("is_confirmed_by_allergist")
			.notNull()
			.default(false),
		hasSamterTriad: boolean("has_samter_triad").notNull().default(false),
		notes: text("notes"),
		recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("patient_drug_allergies_org_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
	}),
);

export const patientsRelations = relations(patients, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [patients.organizationId],
		references: [organizations.id],
	}),
	appointments: many(appointments),
	consents: many(patientConsents),
	visits: many(visits),
}));
