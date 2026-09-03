import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";
import { visits } from "./clinical.js";
import { patients } from "./patients.js";

/**
 * 1. Каталог зубов и челюстей (55 сущностей)
 * Взрослые (11-48), детские (51-85), челюсти JU/JL, прикус C
 */
export const clinicalTeethCatalog = pgTable("clinical_teeth_catalog", {
	id: integer("id").primaryKey(), // 1..55
	code: varchar("code", { length: 8 }).notNull().unique(), // "11", "48", "JU", "JL", "C"
	nameRu: varchar("name_ru", { length: 128 }).notNull(), // "1.1 Верхний правый центральный резец"
	type: varchar("type", { length: 8 }).notNull().default("T"), // "T" = Зуб, "J" = Челюсть/Дуга/Прикус
	isChild: boolean("is_child").notNull().default(false), // 0 = взрослый, 1 = молочный, false для челюстей
	quoter: integer("quoter"), // 1..4 (квадрант)
	order: integer("order").notNull().default(0),
});

/**
 * 2. Каталог дефектов зубов (91 элемент)
 * Требующие лечения (require_treatment), вылеченные (cured_teeth),
 * рентген/КЛКТ (rg_klkt), аномалии (anomaly)
 */
export const toothDefectsCatalog = pgTable("tooth_defects_catalog", {
	id: integer("id").primaryKey(), // ID из StomX каталога
	name: varchar("name", { length: 255 }).notNull(), // "Кариес", "Пломба", "Имплантат"
	alias: varchar("alias", { length: 32 }).notNull(), // "С", "П", "ИМ", "Pt"
	type: varchar("type", { length: 32 }).notNull(), // "outpatient", "orthodontic", "anomaly"
	key: varchar("key", { length: 32 }), // "require_treatment", "cured_teeth", "rg_klkt", "position" и др.
	color: varchar("color", { length: 32 }), // "red", "yellow", "green", "white", etc.
	order: integer("order").notNull().default(100),
	canDelete: boolean("can_delete").notNull().default(false),
	isActive: boolean("is_active").notNull().default(true),
});

/**
 * 3. Стоматологический классификатор МКБ-10 (1 841 категория)
 * Стоматологический кластер K00-K14 помечен флагом isDentalSpecialty = true
 */
export const mkbCategories = pgTable(
	"mkb_categories",
	{
		id: varchar("id", { length: 32 }).primaryKey(), // "A00", "K02", "K00-K14"
		parentId: varchar("parent_id", { length: 32 }),
		code: varchar("code", { length: 32 }).notNull(),
		name: text("name").notNull(),
		isDentalSpecialty: boolean("is_dental_specialty").notNull().default(false), // true для K00-K14
		order: integer("order").notNull().default(0),
	},
	(t) => ({
		codeIdx: index("idx_mkb_code").on(t.code),
		parentIdx: index("idx_mkb_parent").on(t.parentId),
		dentalSpecialtyIdx: index("idx_mkb_dental_specialty").on(t.isDentalSpecialty),
	}),
);

/**
 * 4. Множественные дефекты на зубе/челюсти пациента
 * Позволяет хранить на одном зубе одновременно: пломбу, рецессию, вторичный кариес и т.д.
 */
export const patientToothDefects = pgTable(
	"patient_tooth_defects",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		toothCode: varchar("tooth_code", { length: 8 })
			.notNull()
			.references(() => clinicalTeethCatalog.code),
		defectId: integer("defect_id")
			.notNull()
			.references(() => toothDefectsCatalog.id),
		visitId: uuid("visit_id").references(() => visits.id, { onDelete: "set null" }),
		diagnosedByDoctorId: uuid("diagnosed_by_doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		diagnosedAt: timestamp("diagnosed_at", { withTimezone: true }).notNull().defaultNow(),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }), // Дата снятия / излечения
		comment: text("comment"),
	},
	(t) => ({
		patientToothIdx: index("idx_patient_tooth_defects_patient_tooth").on(
			t.organizationId,
			t.patientId,
			t.toothCode,
		),
		patientIdIdx: index("idx_patient_tooth_defects_patient_id").on(t.patientId),
		orgIdIdx: index("idx_patient_tooth_defects_organization_id").on(t.organizationId),
	}),
);

/**
 * 5. Рубрики клинических шаблонов 043/у (33 рубрики)
 */
export const outpatientTemplateCategories = pgTable("outpatient_template_categories", {
	id: integer("id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(), // "Кариес", "Пульпит", "Удаление зубов"
	parentId: integer("parent_id"),
	specialty: varchar("specialty", { length: 64 }).notNull().default("therapy"),
	order: integer("order").notNull().default(0),
});

/**
 * 6. Клинические шаблоны амбулаторной карты 043/у (448 шаблонов)
 */
export const outpatientTemplates = pgTable(
	"outpatient_templates",
	{
		id: integer("id").primaryKey(),
		categoryId: integer("category_id")
			.notNull()
			.references(() => outpatientTemplateCategories.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 255 }).notNull(),
		contentJson: jsonb("content_json").notNull(),
		mkbCode: varchar("mkb_code", { length: 32 }),
		order: integer("order").notNull().default(0),
	},
	(t) => ({
		categoryIdIdx: index("idx_outpatient_templates_category_id").on(t.categoryId),
		mkbCodeIdx: index("idx_outpatient_templates_mkb_code").on(t.mkbCode),
	}),
);

/**
 * 7. Верификация амбулаторных карт начмедом / контроль качества (24-часовой замок)
 */
export const outpatientVerifications = pgTable(
	"outpatient_verifications",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		visitId: uuid("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		doctorId: uuid("doctor_id")
			.notNull()
			.references(() => users.id),
		cmoUserId: uuid("cmo_user_id").references(() => users.id), // Начмед / Главный врач
		status: varchar("status", { length: 32 }).notNull().default("draft"), // "draft", "review", "approved", "rejected"
		rejectionReason: text("rejection_reason"),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
		editableDeadline: timestamp("editable_deadline", { withTimezone: true }).notNull(), // 24 часа от даты приема
	},
	(t) => ({
		orgStatusIdx: index("idx_outpatient_verif_org_status").on(t.organizationId, t.status),
		visitIdx: unique("uniq_outpatient_verif_visit").on(t.visitId),
		patientIdx: index("idx_outpatient_verif_patient").on(t.patientId),
	}),
);

// Drizzle Relations
export const clinicalTeethCatalogRelations = relations(clinicalTeethCatalog, ({ many }) => ({
	patientDefects: many(patientToothDefects),
}));

export const toothDefectsCatalogRelations = relations(toothDefectsCatalog, ({ many }) => ({
	patientDefects: many(patientToothDefects),
}));

export const patientToothDefectsRelations = relations(patientToothDefects, ({ one }) => ({
	organization: one(organizations, {
		fields: [patientToothDefects.organizationId],
		references: [organizations.id],
	}),
	patient: one(patients, {
		fields: [patientToothDefects.patientId],
		references: [patients.id],
	}),
	tooth: one(clinicalTeethCatalog, {
		fields: [patientToothDefects.toothCode],
		references: [clinicalTeethCatalog.code],
	}),
	defect: one(toothDefectsCatalog, {
		fields: [patientToothDefects.defectId],
		references: [toothDefectsCatalog.id],
	}),
	visit: one(visits, {
		fields: [patientToothDefects.visitId],
		references: [visits.id],
	}),
	doctor: one(users, {
		fields: [patientToothDefects.diagnosedByDoctorId],
		references: [users.id],
	}),
}));

export const outpatientTemplateCategoriesRelations = relations(
	outpatientTemplateCategories,
	({ many, one }) => ({
		templates: many(outpatientTemplates),
		parent: one(outpatientTemplateCategories, {
			fields: [outpatientTemplateCategories.parentId],
			references: [outpatientTemplateCategories.id],
		}),
	}),
);

export const outpatientTemplatesRelations = relations(outpatientTemplates, ({ one }) => ({
	category: one(outpatientTemplateCategories, {
		fields: [outpatientTemplates.categoryId],
		references: [outpatientTemplateCategories.id],
	}),
}));

export const outpatientVerificationsRelations = relations(outpatientVerifications, ({ one }) => ({
	organization: one(organizations, {
		fields: [outpatientVerifications.organizationId],
		references: [organizations.id],
	}),
	visit: one(visits, {
		fields: [outpatientVerifications.visitId],
		references: [visits.id],
	}),
	patient: one(patients, {
		fields: [outpatientVerifications.patientId],
		references: [patients.id],
	}),
	doctor: one(users, {
		fields: [outpatientVerifications.doctorId],
		references: [users.id],
	}),
	cmoUser: one(users, {
		fields: [outpatientVerifications.cmoUserId],
		references: [users.id],
	}),
}));
