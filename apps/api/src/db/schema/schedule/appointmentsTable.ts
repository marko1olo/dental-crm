import { sql, relations } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { appointmentStatus } from "../_common.js";
import { organizations, users } from "../auth.js";
import { visits } from "../clinical.js";
import { patients } from "../patients.js";
import { chairs } from "./chairsTable.js";

export const appointments = pgTable(
	"appointments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").references(() => patients.id, {
			onDelete: "set null",
		}),
		doctorUserId: uuid("doctor_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		assistantUserId: uuid("assistant_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		chairId: uuid("chair_id").references(() => chairs.id, {
			onDelete: "set null",
		}),
		status: appointmentStatus("status").notNull().default("planned"),
		startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
		endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
		reason: text("reason"),
		comment: text("comment"),
		parentAppointmentId: uuid("parent_appointment_id"),
		stageIndex: integer("stage_index").default(1),
		clinicalStage: text("clinical_stage"),
		toothNumber: integer("tooth_number"),
		diagnosisMkb10: text("diagnosis_mkb10"),
		isOverbooking: boolean("is_overbooking").notNull().default(false),
	},
	(table) => {
		return {
			idxAppointmentsOrgTime: index("idx_appointments_org_time").on(
				table.organizationId,
				table.startsAt,
				table.endsAt,
			),
			idxAppointmentsOrgDoctorTime: index("idx_appointments_org_doctor_time").on(
				table.organizationId,
				table.doctorUserId,
				table.startsAt,
			),
			idxAppointmentsOrgStatus: index("idx_appointments_org_status").on(
				table.organizationId,
				table.status,
			),
			idxAppointmentsOrgPatient: index("idx_appointments_org_patient").on(
				table.organizationId,
				table.patientId,
			),
			patientIdIdx: index("appointments_patient_id_idx").on(table.patientId),
			doctorUserIdIdx: index("appointments_doctor_user_id_idx").on(
				table.doctorUserId,
			),
			assistantUserIdIdx: index("appointments_assistant_user_id_idx").on(
				table.assistantUserId,
			),
			chairIdIdx: index("appointments_chair_id_idx").on(table.chairId),
			parentAppointmentIdIdx: index(
				"appointments_parent_appointment_id_idx",
			).on(table.parentAppointmentId),
			timeOrderCheck: check(
				"appointments_time_order_check",
				sql`${table.startsAt} < ${table.endsAt}`,
			),
			// Note: 4D PostgreSQL GIST exclusion constraints managed in migrations (0154, 0170):
			// - appointments_doctor_overlap_excl (doctor_user_id)
			// - appointments_chair_overlap_excl (chair_id)
			// - appointments_assistant_overlap_excl (assistant_user_id)
			// - appointments_patient_overlap_excl (patient_id)
		};
	},
);

// #56 — пациенты::целевые_причины_отмены_приемов_клиника_vs_пациент
export const cancellationReasonsTwoLevel = pgTable(
	"cancellation_reasons_two_level",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		category: text("category").notNull(),
		reasonCode: text("reason_code").notNull(),
		reasonTitle: text("reason_title").notNull(),
		requiresNote: boolean("requires_note").default(false).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"cancellation_reasons_two_level_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #9 — коммуникации::подтверждение_приема_при_обработке_обращения
export const quickAppointmentConfirmations = pgTable(
	"quick_appointment_confirmations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		appointmentId: uuid("appointment_id").notNull(),
		confirmedByStaffName: text("confirmed_by_staff_name").notNull(),
		channelUsed: text("channel_used").default("call").notNull(),
		confirmedAt: timestamp("confirmed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"quick_appointment_confirmations_organizationId_idx",
		).on(t.organizationId),
		appointmentIdIdx: index(
			"quick_appointment_confirmations_appointment_id_idx",
		).on(t.appointmentId),
		orgCreatedIdx: index(
			"quick_appointment_confirmations_org_created_idx",
		).on(t.organizationId, t.confirmedAt),
	}),
);

// appointment waitlists (patient waiting queue)
export const appointmentWaitlists = pgTable(
	"appointment_waitlists",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		patientName: text("patient_name"),
		patientPhone: text("patient_phone"),
		preferredDoctorId: uuid("preferred_doctor_id"),
		preferredDoctorName: text("preferred_doctor_name"),
		priorityLevel: text("priority_level").notNull().default("medium"),
		preferredTimeRanges: jsonb("preferred_time_ranges"),
		status: text("status").notNull().default("waiting"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("appointment_waitlists_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("appointment_waitlists_patientId_idx").on(t.patientId),
		preferredDoctorIdx: index(
			"appointment_waitlists_preferred_doctor_idx",
		).on(t.preferredDoctorId),
		orgStatusIdx: index("appointment_waitlists_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		orgCreatedIdx: index("appointment_waitlists_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
	}),
);

// appointment channel inheritances (messenger channel routing)
export const appointmentChannelInheritances = pgTable(
	"appointment_channel_inheritances",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		chatId: uuid("chat_id").notNull(),
		patientName: text("patient_name").notNull(),
		inheritedChannel: text("inherited_channel").notNull().default("whatsapp"),
		isAutoApplied: boolean("is_auto_applied").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"appointment_channel_inheritances_organizationId_idx",
		).on(t.organizationId),
	}),
);

// UIS mass appointment confirmations (bulk SMS confirmation campaigns)
export const uisMassAppointmentConfirmations = pgTable(
	"uis_mass_appointment_confirmations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		targetDate: text("target_date").notNull(),
		totalAppointmentsCount: integer("total_appointments_count")
			.notNull()
			.default(0),
		confirmedViaSmsCount: integer("confirmed_via_sms_count")
			.notNull()
			.default(0),
		dispatchChannel: text("dispatch_channel").notNull().default("uis_sms"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"uis_mass_appointment_confirmations_organizationId_idx",
		).on(t.organizationId),
	}),
);

export const appointmentsRelations = relations(
	appointments,
	({ one, many }) => ({
		organization: one(organizations, {
			fields: [appointments.organizationId],
			references: [organizations.id],
		}),
		patient: one(patients, {
			fields: [appointments.patientId],
			references: [patients.id],
		}),
		doctor: one(users, {
			fields: [appointments.doctorUserId],
			references: [users.id],
			relationName: "doctorAppointments",
		}),
		assistant: one(users, {
			fields: [appointments.assistantUserId],
			references: [users.id],
			relationName: "assistantAppointments",
		}),
		chair: one(chairs, {
			fields: [appointments.chairId],
			references: [chairs.id],
		}),
		visits: many(visits),
	}),
);
