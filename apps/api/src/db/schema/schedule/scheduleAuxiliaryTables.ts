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
import { organizations } from "../auth.js";

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
		appointmentIdIdx: index("schedule_clipboard_items_appointment_id_idx").on(
			t.appointmentId,
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

// external schedule action logs (external booking integration)
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
		doctorIdIdx: index("yandex_calendar_syncs_doctor_id_idx").on(t.doctorId),
		orgDoctorIdx: index("yandex_calendar_syncs_org_doctor_idx").on(
			t.organizationId,
			t.doctorId,
		),
	}),
);

export const doctorShiftRosters = pgTable(
	"doctor_shift_rosters",
	{
		id: text("id").primaryKey(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		doctorId: text("doctor_id").notNull(),
		doctorName: text("doctor_name").notNull(),
		cabinetId: text("cabinet_id"),
		chairId: text("chair_id"),
		dateIso: text("date_iso").notNull(),
		startTime: text("start_time").notNull(),
		endTime: text("end_time").notNull(),
		role: text("role"),
		specialty: text("specialty"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("idx_doctor_shift_rosters_org").on(t.organizationId),
		orgDateIdx: index("idx_doctor_shift_rosters_org_date").on(t.organizationId, t.dateIso),
		orgDoctorIdx: index("idx_doctor_shift_rosters_org_doc").on(t.organizationId, t.doctorId),
	}),
);
