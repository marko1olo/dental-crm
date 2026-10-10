import { sql } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";
import {
	communicationChannel,
	communicationConsentScope,
	communicationConsentState,
	communicationIntent,
	communicationOutboxStatus,
	communicationPriority,
	communicationStatus,
} from "../_common.js";
import { clinics, organizations, users } from "../auth.js";
import { generatedDocuments, visits } from "../clinical.js";
import { patients } from "../patients.js";
import { appointments } from "../schedule.js";

export const communicationTemplates = pgTable(
	"communication_templates",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		title: text("title").notNull(),
		channel: communicationChannel("channel").notNull(),
		intent: communicationIntent("intent").notNull(),
		audienceRole: text("audience_role").notNull(),
		body: text("body").notNull(),
		variablesJson: text("variables_json").notNull().default("[]"),
		isActive: boolean("is_active").notNull().default(true),
	},
	(t) => ({
		organizationIdIdx: index("communication_templates_organization_id_idx").on(
			t.organizationId,
		),
		clinicIdIdx: index("communication_templates_clinic_id_idx").on(t.clinicId),
	}),
);

export const communicationTasks = pgTable(
	"communication_tasks",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		botConfigId: text("bot_config_id").notNull().default("default"),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		appointmentId: uuid("appointment_id").references(() => appointments.id),
		visitId: uuid("visit_id").references(() => visits.id),
		documentId: uuid("document_id").references(() => generatedDocuments.id),
		assignedRole: text("assigned_role").notNull(),
		channel: communicationChannel("channel").notNull(),
		intent: communicationIntent("intent").notNull(),
		status: communicationStatus("status").notNull().default("queued"),
		priority: communicationPriority("priority").notNull().default("normal"),
		dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
		title: text("title").notNull(),
		body: text("body").notNull(),
		workflowCode: text("workflow_code"),
		lastEventAt: timestamp("last_event_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("communication_tasks_organization_id_idx").on(
			t.organizationId,
		),
		clinicIdIdx: index("communication_tasks_clinic_id_idx").on(t.clinicId),
		patientIdIdx: index("communication_tasks_patient_id_idx").on(t.patientId),
		appointmentIdIdx: index("communication_tasks_appointment_id_idx").on(
			t.appointmentId,
		),
		visitIdIdx: index("communication_tasks_visit_id_idx").on(t.visitId),
		documentIdIdx: index("communication_tasks_document_id_idx").on(
			t.documentId,
		),
	}),
);

// #47 — crm::конструктор_типов_задач_без_привязки_к_визиту
export const customCrmTaskTypes = pgTable(
	"custom_crm_task_types",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		typeCode: text("type_code").notNull(),
		typeLabel: text("type_label").notNull(),
		colorHex: text("color_hex").default("#3b82f6").notNull(),
		requiresPatientBinding: boolean("requires_patient_binding")
			.default(true)
			.notNull(),
		defaultSlaHours: integer("default_sla_hours").default(24).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("custom_crm_task_types_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// #50 — crm::прямая_отправка_планов_лечения_и_счетов_на_email
export const crmEmailDispatchLogs = pgTable(
	"crm_email_dispatch_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		recipientEmail: text("recipient_email").notNull(),
		documentType: text("document_type").notNull(),
		documentTitle: text("document_title").notNull(),
		dispatchStatus: text("dispatch_status").default("sent").notNull(),
		sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("crm_email_dispatch_logs_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// message template catalogs (reusable SMS/Telegram templates)
export const messageTemplateCatalogs = pgTable(
	"message_template_catalogs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		title: text("title").notNull(),
		channel: text("channel").notNull().default("telegram"),
		intent: text("intent").notNull().default("general"),
		templateText: text("template_text").notNull(),
		variables: jsonb("variables"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("message_template_catalogs_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

export const messageTemplates = messageTemplateCatalogs;

/**
 * Очередь исходящих уведомлений пациентам.
 *
 * ЗАЧЕМ ОБЪЯВЛЕНИЕ ПОЯВИЛОСЬ: таблица создана ещё миграцией 0000, но в модель не
 * попала. services/notificationWorker.ts и services/postOpCareTrigger.ts
 * импортируют `outgoingNotifications` отсюда, и оба модуля падали при загрузке с
 * «does not provide an export named 'outgoingNotifications'» — напоминания и
 * контроль самочувствия после приёма не работали вообще. Поломку не было видно,
 * потому что tsconfig исключал src/services из проверки типов.
 */
export const outgoingNotifications = pgTable(
	"outgoing_notifications",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id").notNull(),
		patientId: uuid("patient_id").notNull(),
		type: text("type").notNull(),
		payload: jsonb("payload").notNull(),
		status: text("status").notNull().default("pending"),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		sentAt: timestamp("sent_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		organizationIdIdx: index("outgoing_notifications_organization_id_idx").on(
			table.organizationId,
		),
		patientIdIdx: index("outgoing_notifications_patient_id_idx").on(
			table.patientId,
		),
		statusIdx: index("outgoing_notifications_status_idx").on(table.status),
		scheduledAtIdx: index("outgoing_notifications_scheduled_at_idx").on(
			table.scheduledAt,
		),
	}),
);

export const communicationOutbox = pgTable(
	"communication_outbox",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		patientId: uuid("patient_id").references(() => patients.id),
		taskId: uuid("task_id").references(() => communicationTasks.id),
		templateId: uuid("template_id").references(() => communicationTemplates.id),
		campaignId: uuid("campaign_id"),
		channel: communicationChannel("channel").notNull(),
		intent: communicationIntent("intent").notNull(),
		scope: communicationConsentScope("scope").notNull().default("service"),
		/** Номер, адрес почты или идентификатор чата, приведённый к формату канала. */
		recipientAddress: text("recipient_address").notNull(),
		subject: text("subject"),
		body: text("body").notNull(),
		status: communicationOutboxStatus("status").notNull().default("queued"),
		attempts: integer("attempts").notNull().default(0),
		maxAttempts: integer("max_attempts").notNull().default(5),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		/** Захват строки обработчиком; по locked_at возвращаются зависшие отправки. */
		lockedAt: timestamp("locked_at", { withTimezone: true }),
		lockedBy: text("locked_by"),
		sentAt: timestamp("sent_at", { withTimezone: true }),
		lastErrorClass: text("last_error_class"),
		lastErrorMessage: text("last_error_message"),
		providerMessageId: text("provider_message_id"),
		segments: integer("segments"),
		/**
		 * Квитанция о доставке (миграция 0126). `sent` означает «шлюз принял», а не
		 * «пациент получил»: SMS на выключенный телефон шлюз принимает и берёт за неё
		 * деньги. Для напоминания о приёме разница решающая.
		 */
		deliveredAt: timestamp("delivered_at", { withTimezone: true }),
		/** Что именно сказал провайдер — код и расшифровка, для разбора споров. */
		receiptDetail: text("receipt_detail"),
		/** Одно и то же напоминание не ставится в очередь дважды. */
		dedupeKey: text("dedupe_key").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			outboxOrgDedupeUnique: unique(
				"communication_outbox_org_dedupe_unique",
			).on(table.organizationId, table.dedupeKey),
			outboxOrgCreatedIdx: index("communication_outbox_org_created_idx").on(
				table.organizationId,
				table.createdAt,
			),
			clinicIdIdx: index("communication_outbox_clinicId_idx").on(
				table.clinicId,
			),
			patientIdIdx: index("communication_outbox_patientId_idx").on(
				table.patientId,
			),
			taskIdIdx: index("communication_outbox_taskId_idx").on(table.taskId),
			templateIdIdx: index("communication_outbox_templateId_idx").on(
				table.templateId,
			),
		};
	},
);

export const patientCommunicationConsents = pgTable(
	"patient_communication_consents",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		channel: communicationChannel("channel").notNull(),
		scope: communicationConsentScope("scope").notNull(),
		state: communicationConsentState("state").notNull(),
		/** Договор, портал пациента, слова администратора, ответ «СТОП» во входящем. */
		source: text("source").notNull(),
		evidence: text("evidence"),
		decidedAt: timestamp("decided_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			consentUnique: unique("patient_communication_consents_unique").on(
				table.organizationId,
				table.patientId,
				table.channel,
				table.scope,
			),
			organizationIdIdx: index(
				"patient_communication_consents_organization_id_idx",
			).on(table.organizationId),
			patientIdIdx: index(
				"patient_communication_consents_patient_id_idx",
			).on(table.patientId),
			decidedByUserIdIdx: index(
				"patient_communication_consents_decidedByUserId_idx",
			).on(table.decidedByUserId),
		};
	},
);
