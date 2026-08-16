import { sql, relations } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { appointmentStatus } from "./_common.js";
import { clinics, organizations, users } from "./auth.js";
import { visits } from "./clinical.js";
import { patients } from "./patients.js";

export const chairs = pgTable(
	"chairs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id")
			.notNull()
			.references(() => clinics.id),
		name: text("name").notNull(),
		isActive: boolean("is_active").notNull().default(true),
		equipment: text("equipment"),
		specializations: text("specializations"),
		workingHours: jsonb("working_hours"),
	},
	(t) => ({
		organizationIdIdx: index("chairs_organization_id_idx").on(t.organizationId),
		clinicIdIdx: index("chairs_clinic_id_idx").on(t.clinicId),
	}),
);

export const appointments = pgTable(
	"appointments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").references(() => patients.id),
		doctorUserId: uuid("doctor_user_id").references(() => users.id),
		assistantUserId: uuid("assistant_user_id").references(() => users.id),
		chairId: uuid("chair_id").references(() => chairs.id),
		status: appointmentStatus("status").notNull().default("planned"),
		startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
		endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
		reason: text("reason"),
		comment: text("comment"),
	},
	(table) => {
		return {
			idxAppointmentsOrgTime: index("idx_appointments_org_time").on(
				table.organizationId,
				table.startsAt,
				table.endsAt,
			),
			patientIdIdx: index("appointments_patient_id_idx").on(table.patientId),
			doctorUserIdIdx: index("appointments_doctor_user_id_idx").on(
				table.doctorUserId,
			),
			assistantUserIdIdx: index("appointments_assistant_user_id_idx").on(
				table.assistantUserId,
			),
			chairIdIdx: index("appointments_chair_id_idx").on(table.chairId),
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
	}),
);

// #21 — расписание::виджет_срочные_обращения_под_календарем
export const urgentScheduleRequests = pgTable(
	"urgent_schedule_requests",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		requestType: text("request_type").notNull(),
		urgencyLevel: text("urgency_level").default("high").notNull(),
		doctorName: text("doctor_name").notNull(),
		preferredSlotTime: text("preferred_slot_time").notNull(),
		isResolved: boolean("is_resolved").default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("urgent_schedule_requests_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// #23 — аналитика::отчет_эффективность_подтверждения_приемов
export const confirmationPerformanceReports = pgTable(
	"confirmation_performance_reports",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		staffName: text("staff_name").notNull(),
		totalCallsMade: integer("total_calls_made").default(0).notNull(),
		confirmedAppointmentsCount: integer("confirmed_appointments_count")
			.default(0)
			.notNull(),
		rescheduledCount: integer("rescheduled_count").default(0).notNull(),
		conversionRatePercent: numeric("conversion_rate_percent", {
			precision: 5,
			scale: 2,
		})
			.default("0.00")
			.notNull(),
		reportPeriod: text("report_period").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"confirmation_performance_reports_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #48 — расписание::буфер_обмена_в_расписании_для_быстрого_переноса

export const scheduleClipboardItems = pgTable(
	"schedule_clipboard_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		appointmentId: uuid("appointment_id").notNull(),
		patientName: text("patient_name").notNull(),
		doctorName: text("doctor_name").notNull(),
		serviceTitle: text("service_title").notNull(),
		durationMinutes: integer("duration_minutes").default(30).notNull(),
		clipboardStatus: text("clipboard_status").default("copied").notNull(),
		copiedAt: timestamp("copied_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("schedule_clipboard_items_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// #37 — расписание::резервирование_времени_в_сетке
export const scheduleTimeReservations = pgTable(
	"schedule_time_reservations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		chairName: text("chair_name").notNull(),
		reservationType: text("reservation_type").default("maintenance").notNull(),
		startTime: text("start_time").notNull(),
		endTime: text("end_time").notNull(),
		bookingLocked: boolean("booking_locked").default(true).notNull(),
		hatchingStyle: text("hatching_style").default("diagonal_red").notNull(),
		note: text("note").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"schedule_time_reservations_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #61 — кадры::зачисление_повторной_записи_врачу_или_администратору
export const rebookingConversionRules = pgTable(
	"rebooking_conversion_rules",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		rebookedBy: text("rebooked_by").notNull(),
		timeDeltaMinutes: integer("time_delta_minutes").notNull(),
		creditedRole: text("credited_role").notNull(),
		appointmentDate: text("appointment_date").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"rebooking_conversion_rules_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #56 — система::запрет_одновременной_авторизации_под_одной_учеткой
export const singleSessionEnforcements = pgTable(
	"single_session_enforcements",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		userId: uuid("user_id").notNull(),
		userLogin: text("user_login").notNull(),
		activeSessionToken: text("active_session_token").notNull(),
		clientIp: text("client_ip").notNull(),
		userAgent: text("user_agent").notNull(),
		ejectedPreviousSession: boolean("ejected_previous_session")
			.default(false)
			.notNull(),
		lastActiveAt: timestamp("last_active_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"single_session_enforcements_organizationId_idx",
		).on(t.organizationId),
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
	}),
);

// clinic chairs (treatment chairs / workstations)
export const clinicChairs = pgTable(
	"clinic_chairs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		name: text("name").notNull(),
		color: text("color"),
		isActive: boolean("is_active").notNull().default(true),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("clinic_chairs_organizationId_idx").on(
			t.organizationId,
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

// external schedule action logs (Zabota2.0 / LoyalMed AI booking)
export const externalScheduleActionLogs = pgTable(
	"external_schedule_action_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		externalProvider: text("external_provider").notNull(),
		actionType: text("action_type").notNull(),
		patientName: text("patient_name").notNull(),
		appointmentSlot: text("appointment_slot").notNull(),
		status: text("status").notNull().default("success"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"external_schedule_action_logs_organizationId_idx",
		).on(t.organizationId),
	}),
);

// Yandex calendar syncs (Yandex Calendar integration)
export const yandexCalendarSyncs = pgTable(
	"yandex_calendar_syncs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		doctorId: uuid("doctor_id").notNull(),
		yandexCalendarId: text("yandex_calendar_id"),
		currentSessionId: uuid("current_session_id"),
		lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
		syncStatus: text("sync_status").notNull().default("pending"),
		errorMessage: text("error_message"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("yandex_calendar_syncs_organizationId_idx").on(
			t.organizationId,
		),
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

export const chairsRelations = relations(chairs, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [chairs.organizationId],
		references: [organizations.id],
	}),
	clinic: one(clinics, {
		fields: [chairs.clinicId],
		references: [clinics.id],
	}),
	appointments: many(appointments),
}));

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
