/**
 * crm_leak_detector.ts — PostgreSQL Schema for CRM Leak Detector & Smart Patient Reactivation Leads.
 *
 * КЛИНИЧЕСКИЙ РЕГЛАМЕНТ (ПОРОГ 210 ДНЕЙ / 7 МЕСЯЦЕВ):
 * • 180 дней (6 мес): окончание полугодовой гарантии на терапию.
 * • 210 дней (7 мес): угасание эффекта профгигиены, образование поддесневого камня, риск кариеса.
 * • Исключение: пациенты с будущими запланированными визитами или активным листом ожидания.
 */

import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";
import { patients } from "./patients.js";
import { appointments } from "./schedule.js";

export const crmLeakDetectorLeads = pgTable(
	"crm_leak_detector_leads",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),

		// Клиническая телеметрия оттока
		daysSinceLastVisit: integer("days_since_last_visit").notNull(),
		lastVisitDate: timestamp("last_visit_date", { withTimezone: true }),
		lastDoctorId: uuid("last_doctor_id").references(() => users.id),
		lastDoctorName: text("last_doctor_name"),
		lastSpecialty: text("last_specialty"), // "therapy", "orthopedics", "surgery", "orthodontics", "hygiene"
		uncompletedPlanSumRub: numeric("uncompleted_plan_sum_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull().default(0),
		hasUncompletedPlan: boolean("has_uncompleted_plan").notNull().default(false),
		clinicalRiskReason: text("clinical_risk_reason").notNull(),

		// Статус обработки в CRM воронке
		leadStatus: text("lead_status").notNull().default("new"), // "new", "in_progress", "contacted", "rebooked", "declined", "archived"
		assignedAdminUserId: uuid("assigned_admin_user_id").references(() => users.id),
		assignedAdminName: text("assigned_admin_name"),

		// Результаты контактов
		contactAttemptsCount: integer("contact_attempts_count").notNull().default(0),
		lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
		lastContactChannel: text("last_contact_channel"), // "call", "whatsapp", "telegram", "sms"
		lastContactNotes: text("last_contact_notes"),

		// Успешная конверсия
		rebookedAppointmentId: uuid("rebooked_appointment_id").references(() => appointments.id),
		rebookedDate: timestamp("rebooked_date", { withTimezone: true }),

		// Причина отказа
		declineReason: text("decline_reason"), // "too_expensive", "moved_away", "treated_elsewhere", etc.
		declineComment: text("decline_comment"),

		// Персонализированный скрипт реактивации
		aiReactivationSuggestion: text("ai_reactivation_suggestion"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgStatusIdx: index("idx_crm_leak_leads_org_status").on(t.organizationId, t.leadStatus),
		orgPatientIdx: index("idx_crm_leak_leads_org_patient").on(t.organizationId, t.patientId),
		orgDaysIdx: index("idx_crm_leak_leads_org_days").on(t.organizationId, t.daysSinceLastVisit),
	}),
);
