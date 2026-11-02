import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "../../auth.js";
import { patients } from "../patientCore.js";

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
		headPatientIdx: index("family_groups_head_patient_idx").on(t.headPatientId),
		primaryPatientIdx: index("family_groups_primary_patient_idx").on(
			t.primaryPatientId,
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

export type FamilyGroup = InferSelectModel<typeof familyGroups>;
export type NewFamilyGroup = InferInsertModel<typeof familyGroups>;

export type FamilyRecommendationSource = InferSelectModel<typeof familyRecommendationSources>;
export type NewFamilyRecommendationSource = InferInsertModel<typeof familyRecommendationSources>;

export type PatientRelationship = InferSelectModel<typeof patientRelationships>;
export type NewPatientRelationship = InferInsertModel<typeof patientRelationships>;
