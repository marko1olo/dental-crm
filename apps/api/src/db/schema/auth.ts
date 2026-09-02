import type {
	ClinicMode,
} from "@dental/shared";
import { sql, relations } from "drizzle-orm";
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
import { DEFAULT_CLINIC_MODE } from "./_common.js";
import { patients } from "./patients.js";
import { appointments, chairs } from "./schedule.js";

export const organizations = pgTable("organizations", {
	id: uuid("id").primaryKey().default(sql`uuidv7()`),
	name: text("name").notNull(),
	loginId: text("login_id"),
	passwordHash: text("password_hash"),
	inn: text("inn"),
	kpp: text("kpp"),
	ogrn: text("ogrn"),
	legalAddress: text("legal_address"),
	medicalLicenseNumber: text("medical_license_number"),
	medicalLicenseIssuedAt: text("medical_license_issued_at"),
	medicalLicenseIssuer: text("medical_license_issuer"),
	email: text("email"),
	website: text("website"),
	bankDetails: text("bank_details"),
	signatoryName: text("signatory_name"),
	signatoryTitle: text("signatory_title"),
	/*
	 * Режим клиники: solo_doctor | one_chair | small_clinic | network_clinic.
	 * Словарь один, и он живёт в clinicModeSchema (packages/shared) — здесь его
	 * копии нет намеренно. Ограничение organizations_clinic_mode_known (миграция
	 * 0140) не даёт базе хранить ничего другого.
	 *
	 * Тип колонки остаётся text, а не `$type<ClinicMode>()`: приведение типа
	 * убедило бы читателя, что проверять прочитанное не нужно, а именно доверие к
	 * этой колонке без проверки и спрятало дефект. Проверка на границе чтения
	 * обязательна (db/domainStateHydration.ts, db/settingsQuery.ts).
	 */
	clinicMode: text("clinic_mode").notNull().default(DEFAULT_CLINIC_MODE),
	clinicSchedule: jsonb("clinic_schedule"),
	/*
	 * Какие модули включены у этой клиники.
	 *
	 * До миграции 0139 набора не существовало на сервере вовсе: GET
	 * /api/workspace/profile отдавал жёстко прописанную константу со всеми
	 * признаками true, а POST разбирал семнадцать признаков и не писал ни одного.
	 * Выбор жил только в localStorage браузера, поэтому на втором устройстве и у
	 * второго сотрудника клиника снова получала все модули включёнными.
	 *
	 * Одна колонка jsonb, а не девятнадцать boolean: набор признаков растёт вместе
	 * с продуктом, читается и пишется целиком, поиска и сортировки по нему нет.
	 * Пустое значение означает «клиника ещё не настраивалась».
	 */
	workspaceFeatureFlags: jsonb("workspace_feature_flags"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const clinics = pgTable(
	"clinics",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		name: text("name").notNull(),
		address: text("address"),
		phone: text("phone"),
		timezone: text("timezone").notNull().default("Europe/Samara"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("clinics_organization_id_idx").on(
			t.organizationId,
		),
	}),
);

export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		fullName: text("full_name").notNull(),
		role: text("role").notNull(),
		phone: text("phone"),
		email: text("email"),
		snils: text("snils"),
		passwordHash: text("password_hash"),
		pinCodeHash: text("pin_code_hash"),
		isActive: boolean("is_active").notNull().default(true),
		/**
		 * ПОЛНОМОЧИЯ, КОТОРЫЕ БАЗА ХРАНИТ ПОФАМИЛЬНО.
		 *
		 * Все ТРИ колонки созданы миграцией 0000 (строки 1078-1080) как
		 * `boolean DEFAULT false NOT NULL`. Форма проверена на живой базе, а не по
		 * файлу миграции (`information_schema.columns`, 2026-07-29): три boolean,
		 * `is_nullable = NO`, `column_default = false`, и во всех живых строках
		 * (7 сотрудников, две организации) лежит `false`.
		 *
		 * ЗДЕСЬ БЫЛИ ОБЪЯВЛЕНЫ ДВЕ ИЗ ТРЁХ, и это ломало запись целиком:
		 * `can_manage_imports` не объявлен — значит drizzle его не видит, и ни
		 * прочитать, ни записать его было нельзя, сколько бы полей ни принимал
		 * маршрут. Третья колонка добавлена, набор снова совпадает с таблицей.
		 *
		 * ЧТО ЭТИ КОЛОНКИ ЗНАЧАТ, И ЧЕГО ОНИ НЕ ЗНАЧАТ. Читают полномочия сейчас НЕ
		 * отсюда: и `db/settingsQuery.ts`, и `db/domainStateHydration.ts` выводят их
		 * из роли через `security/permissions.ts: staffAuthorityFlags`, то есть из той
		 * же матрицы `ROLE_PERMISSIONS`, по которой `requirePermission` отказывает на
		 * маршруте. Причина в данных: значение по умолчанию `false` и все живые строки
		 * `false`, поэтому «честное» чтение колонок сняло бы право подписи ЭМК со всех
		 * четырёх врачей И с владельца одновременно.
		 *
		 * Поэтому колонка — НАДБАВКА К РОЛИ, а не полное значение полномочия:
		 * `true` добавляет право, которого роль не даёт, `false` означает «надбавки
		 * нет, действует роль», и НЕ означает запрета. Иначе прочитать существующие
		 * строки было бы нельзя вовсе: в базе `false` стоит и у владельца, который
		 * может всё. Единственный писатель — `db/staffAuthorityQuery.ts`
		 * (маршрут PUT /api/settings/staff/:staffId/authority).
		 *
		 * `.default(false)` повторяет базу дословно и обязателен по второй причине:
		 * без него drizzle потребовал бы все три поля в каждом `insert` в users, а
		 * таких мест в маршрутах и тестах десятки.
		 */
		canSignMedicalRecords: boolean("can_sign_medical_records")
			.notNull()
			.default(false),
		canManageMoney: boolean("can_manage_money").notNull().default(false),
		canManageImports: boolean("can_manage_imports").notNull().default(false),
		specialties: jsonb("specialties"),
		uiPreferences: jsonb("ui_preferences"),
		workingHours: jsonb("working_hours"),
		currentSessionId: text("current_session_id"),
		yandexCalendarId: text("yandex_calendar_id"),
		yandexCalendarToken: jsonb("yandex_calendar_token"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("users_organization_id_idx").on(t.organizationId),
	}),
);

export const userInvitations = pgTable(
	"user_invitations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		email: text("email").notNull(),
		role: text("role").notNull(),
		inviteToken: text("invite_token").notNull().unique(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		status: text("status").notNull().default("pending"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("user_invitations_organization_id_idx").on(
			t.organizationId,
		),
	}),
);

/**
 * Одноразовые коды входа в личный кабинет пациента (drizzle/0133).
 *
 * Раньше кода входа не существовало как данных: routes/portal.ts сверял ввод с
 * одной строкой из окружения, а при NODE_ENV != "production" — с литералом
 * "0000". Один секрет на всех пациентов сразу, без срока годности и без
 * ограничения числа попыток.
 *
 * Хранится только PBKDF2-хеш («соль:хеш» из utils/cryptoHelper.ts). Номер
 * телефона намеренно не дублируется: он уже есть в patients.phone, а частота
 * выдачи считается по patientId — код заводится лишь тогда, когда телефон
 * однозначно сопоставлен ровно одному пациенту.
 */
export const portalOtpCodes = pgTable(
	"portal_otp_codes",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		codeHash: text("code_hash").notNull(),
		/** "sms" — реальная отправка шлюзом; "developer_log" — только вне production. */
		channel: text("channel").notNull(),
		/** pending -> sent | failed. Проверке подлежат только строки "sent". */
		deliveryStatus: text("delivery_status").notNull().default("pending"),
		deliveryErrorClass: text("delivery_error_class"),
		attemptCount: integer("attempt_count").notNull().default(0),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		consumedAt: timestamp("consumed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			idxPortalOtpPatient: index("portal_otp_codes_patient_idx").on(
				table.organizationId,
				table.patientId,
				table.createdAt,
			),
			idxPortalOtpExpires: index("portal_otp_codes_expires_idx").on(
				table.expiresAt,
			),
		};
	},
);

export const clinicWorkflows = pgTable(
	"clinic_workflows",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 255 }).notNull(),
		trigger: varchar("trigger", { length: 255 }).notNull(),
		definition: jsonb("definition").notNull(),
		active: boolean("active").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("clinic_workflows_org_idx").on(table.organizationId)],
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
	users: many(users),
	clinics: many(clinics),
	chairs: many(chairs),
	patients: many(patients),
	appointments: many(appointments),
}));

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [clinics.organizationId],
		references: [organizations.id],
	}),
	chairs: many(chairs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.id],
	}),
	appointmentsAsDoctor: many(appointments, {
		relationName: "doctorAppointments",
	}),
	appointmentsAsAssistant: many(appointments, {
		relationName: "assistantAppointments",
	}),
}));
