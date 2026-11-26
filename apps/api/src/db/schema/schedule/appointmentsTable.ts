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
	varchar,
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		rebookingSourceVisitId: uuid("rebooking_source_visit_id").references(
			() => visits.id,
			{ onDelete: "set null" },
		),
		rebookingDeltaMinutes: integer("rebooking_delta_minutes"),
		attributedRole: varchar("attributed_role", { length: 32 }),
		attributedUserId: uuid("attributed_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		attributionReason: text("attribution_reason"),
		treatmentPlanId: uuid("treatment_plan_id"),
		stageId: uuid("stage_id"),
	},
	(table) => {
		return {
			idxAppointmentsAttribution: index("idx_appointments_attribution").on(
				table.organizationId,
				table.attributedRole,
				table.attributedUserId,
			),
			idxAppointmentsCreatedAt: index("idx_appointments_created_at").on(
				table.organizationId,
				table.createdAt,
			),
			idxAppointmentsOrgTime: index("idx_appointments_org_time").on(
				table.organizationId,
				table.startsAt,
				table.endsAt,
			),
			idxAppointmentsOrgStartsAt: index("idx_appointments_org_starts_at").on(
				table.organizationId,
				table.startsAt,
			),
			idxAppointmentsOrgChairStartsAt: index("idx_appointments_org_chair_starts_at").on(
				table.organizationId,
				table.chairId,
				table.startsAt,
			),
			idxAppointmentsOrgPatientStartsAt: index("idx_appointments_org_patient_starts_at").on(
				table.organizationId,
				table.patientId,
				table.startsAt,
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
			treatmentPlanIdIdx: index(
				"appointments_treatment_plan_id_idx",
			).on(table.treatmentPlanId),
			stageIdIdx: index(
				"appointments_stage_id_idx",
			).on(table.stageId),
			timeOrderCheck: check(
				"appointments_time_order_check",
				sql`${table.startsAt} < ${table.endsAt}`,
			),
			// Note: 4D PostgreSQL GIST exclusion constraints managed in migrations (0154, 0170, 0255):
			// - appointments_doctor_overlap_excl (doctor_user_id, is_overbooking = false)
			// - appointments_chair_overlap_excl (chair_id, is_overbooking = false)
			// - appointments_assistant_overlap_excl (assistant_user_id, is_overbooking = false)
			// - appointments_patient_overlap_excl (patient_id, is_overbooking = false)
		};
	},
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
		attributedUser: one(users, {
			fields: [appointments.attributedUserId],
			references: [users.id],
			relationName: "attributedAppointments",
		}),
		rebookingSourceVisit: one(visits, {
			fields: [appointments.rebookingSourceVisitId],
			references: [visits.id],
			relationName: "rebookingAppointments",
		}),
		visits: many(visits),
	}),
);
