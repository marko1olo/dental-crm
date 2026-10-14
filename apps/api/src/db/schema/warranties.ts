import { sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./auth.js";
import { patients } from "./patientsSchema/patientCore.js";
import { visits } from "./clinical/visitsSchema.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ГАРАНТИЙНЫЕ ПАСПОРТА И СЕРТИФИКАТЫ СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ
 * Честная таблица warranty_certificates в PostgreSQL
 * СтАР, Закон РФ № 2300-1 «О защите прав потребителей» (ст. 29), Мандаты 8e, 8k
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const warrantyCertificates = pgTable(
	"warranty_certificates",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		certificateNumber: text("certificate_number").notNull().unique(),
		status: text("status").notNull().default("active"), // "active" | "conditional" | "voided"
		itemsJson: jsonb("items_json").notNull(), // зубы, материалы, ЗТЛ, цвет VITA, окклюзия
		warrantyMonths: integer("warranty_months").notNull(),
		serviceLifeMonths: integer("service_life_months").notNull(),
		issuedAt: timestamp("issued_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		nextRecallDate: timestamp("next_recall_date", { withTimezone: true }),
		integritySha256: text("integrity_sha256").notNull(),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("idx_warranty_certificates_org_patient").on(
			t.organizationId,
			t.patientId,
		),
		certNumIdx: index("idx_warranty_certificates_cert_num").on(
			t.certificateNumber,
		),
		statusIdx: index("idx_warranty_certificates_status").on(
			t.organizationId,
			t.status,
		),
	}),
);

export type WarrantyCertificate = typeof warrantyCertificates.$inferSelect;
export type NewWarrantyCertificate = typeof warrantyCertificates.$inferInsert;
