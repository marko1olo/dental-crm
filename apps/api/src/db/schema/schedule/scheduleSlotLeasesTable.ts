import { sql, relations } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../auth.js";
import { patients } from "../patients.js";
import { chairs } from "./chairsTable.js";

export const scheduleSlotLeases = pgTable(
	"schedule_slot_leases",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		chairId: uuid("chair_id").references(() => chairs.id, {
			onDelete: "set null",
		}),
		doctorUserId: uuid("doctor_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		patientId: uuid("patient_id").references(() => patients.id, {
			onDelete: "set null",
		}),
		startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
		endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
		leaseToken: varchar("lease_token", { length: 128 }).notNull().unique(),
		holderUserId: uuid("holder_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		holderSessionId: text("holder_session_id").notNull(),
		source: text("source").notNull().default("dnd"),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		idxScheduleSlotLeasesActive: index("idx_schedule_slot_leases_active").on(
			table.organizationId,
			table.chairId,
			table.startsAt,
			table.endsAt,
			table.expiresAt,
		),
		idxScheduleSlotLeasesDoctorActive: index(
			"idx_schedule_slot_leases_doctor_active",
		).on(
			table.organizationId,
			table.doctorUserId,
			table.startsAt,
			table.endsAt,
			table.expiresAt,
		),
		idxScheduleSlotLeasesToken: index("idx_schedule_slot_leases_token").on(
			table.leaseToken,
		),
		idxScheduleSlotLeasesExpires: index("idx_schedule_slot_leases_expires").on(
			table.expiresAt,
		),
	}),
);

export const scheduleSlotLeasesRelations = relations(
	scheduleSlotLeases,
	({ one }) => ({
		organization: one(organizations, {
			fields: [scheduleSlotLeases.organizationId],
			references: [organizations.id],
		}),
		chair: one(chairs, {
			fields: [scheduleSlotLeases.chairId],
			references: [chairs.id],
		}),
		doctor: one(users, {
			fields: [scheduleSlotLeases.doctorUserId],
			references: [users.id],
			relationName: "doctorSlotLeases",
		}),
		patient: one(patients, {
			fields: [scheduleSlotLeases.patientId],
			references: [patients.id],
		}),
		holderUser: one(users, {
			fields: [scheduleSlotLeases.holderUserId],
			references: [users.id],
			relationName: "holderUserSlotLeases",
		}),
	}),
);

export type ScheduleSlotLease = typeof scheduleSlotLeases.$inferSelect;
export type NewScheduleSlotLease = typeof scheduleSlotLeases.$inferInsert;
