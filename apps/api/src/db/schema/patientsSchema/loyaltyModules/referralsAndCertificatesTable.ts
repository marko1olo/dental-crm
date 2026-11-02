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
import { organizations } from "../../auth.js";
import { payments } from "../../billing.js";
import { patients } from "../patientCore.js";

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

export const giftCertificates = pgTable(
	"gift_certificates",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		serialNumber: text("serial_number").notNull(),
		nominalRub: numeric("nominal_rub", { precision: 12, scale: 2 }).notNull(),
		initialBalanceRub: numeric("initial_balance_rub", {
			precision: 12,
			scale: 2,
		}).notNull(),
		currentBalanceRub: numeric("current_balance_rub", {
			precision: 12,
			scale: 2,
		}).notNull(),
		purchaserPatientId: uuid("purchaser_patient_id").references(() => patients.id, {
			onDelete: "set null",
		}),
		purchaserName: text("purchaser_name"),
		recipientPatientId: uuid("recipient_patient_id").references(() => patients.id, {
			onDelete: "set null",
		}),
		recipientName: text("recipient_name"),
		recipientPhone: text("recipient_phone"),
		status: text("status").notNull().default("active"),
		issuedAt: timestamp("issued_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		notes: text("notes"),
		relatedPaymentId: uuid("related_payment_id").references(() => payments.id, {
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
		orgSerialUniqIdx: uniqueIndex("idx_gift_certificates_org_serial").on(
			t.organizationId,
			t.serialNumber,
		),
		purchaserIdx: index("idx_gift_certificates_org_purchaser").on(
			t.organizationId,
			t.purchaserPatientId,
		),
		recipientIdx: index("idx_gift_certificates_org_recipient").on(
			t.organizationId,
			t.recipientPatientId,
		),
		paymentIdx: index("idx_gift_certificates_payment").on(t.relatedPaymentId),
		orgStatusIdx: index("idx_gift_certificates_org_status").on(
			t.organizationId,
			t.status,
		),
		orgCreatedIdx: index("idx_gift_certificates_org_created").on(
			t.organizationId,
			t.createdAt,
		),
	}),
);

export type LostPatientsFilter = InferSelectModel<typeof lostPatientsFilters>;
export type NewLostPatientsFilter = InferInsertModel<typeof lostPatientsFilters>;

export type ReferralCampaign = InferSelectModel<typeof referralCampaigns>;
export type NewReferralCampaign = InferInsertModel<typeof referralCampaigns>;

export type PatientReferralCode = InferSelectModel<typeof patientReferralCodes>;
export type NewPatientReferralCode = InferInsertModel<typeof patientReferralCodes>;

export type PatientReferral = InferSelectModel<typeof patientReferrals>;
export type NewPatientReferral = InferInsertModel<typeof patientReferrals>;

export type GiftCertificate = InferSelectModel<typeof giftCertificates>;
export type NewGiftCertificate = InferInsertModel<typeof giftCertificates>;
