import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../auth.js";
import { appointments } from "../schedule.js";
import { patients } from "./patientCore.js";

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

export const patientRecalls = pgTable(
	"patient_recalls",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		doctorId: uuid("doctor_id").references(() => users.id),
		appointmentId: uuid("appointment_id").references(() => appointments.id),
		scheduledAppointmentId: uuid("scheduled_appointment_id").references(() => appointments.id),
		reason: text("reason").notNull().default("Плановый профилактический осмотр и гигиена"),
		cohortType: text("cohort_type").notNull().default("hygiene_therapy"),
		status: text("status").notNull().default("pending"),
		dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		channel: text("channel"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("idx_patient_recalls_org_patient").on(t.organizationId, t.patientId),
		statusIdx: index("idx_patient_recalls_status").on(t.organizationId, t.status),
		dueDateIdx: index("idx_patient_recalls_due_date").on(t.organizationId, t.dueDate),
	}),
);
