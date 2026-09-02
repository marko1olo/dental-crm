import type {
	DenteTelegramVisualCardUrls,
} from "@dental/shared";
import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
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
	communicationDirection,
	communicationIntent,
	communicationOutboxStatus,
	communicationPriority,
	communicationStatus,
	denteTelegramBotMode,
	denteTelegramChatLinkStatus,
	denteTelegramLinkCodeStatus,
	denteTelegramOutboxSendStatus,
	denteTelegramPrivacyMode,
	denteTelegramSubjectType,
	denteTelegramUpdateKind,
	denteTelegramWebhookStatus,
} from "./_common.js";
import { clinics, organizations, users } from "./auth.js";
import { generatedDocuments, services, visits } from "./clinical.js";
import { attachments } from "./imaging.js";
import { patients } from "./patients.js";
import { appointments } from "./schedule.js";

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

export const communicationEvents = pgTable(
	"communication_events",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		botConfigId: text("bot_config_id").notNull().default("default"),
		taskId: uuid("task_id").references(() => communicationTasks.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		actorUserId: uuid("actor_user_id").references(() => users.id),
		channel: communicationChannel("channel").notNull(),
		direction: communicationDirection("direction").notNull(),
		status: communicationStatus("status").notNull(),
		message: text("message").notNull(),
		recordingUrl: text("recording_url"),
		durationSeconds: integer("duration_seconds"),
		audioFormat: text("audio_format").default("audio/mpeg"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("communication_events_organization_id_idx").on(
			t.organizationId,
		),
		clinicIdIdx: index("communication_events_clinic_id_idx").on(t.clinicId),
		taskIdIdx: index("communication_events_task_id_idx").on(t.taskId),
		patientIdIdx: index("communication_events_patient_id_idx").on(t.patientId),
		actorUserIdIdx: index("communication_events_actor_user_id_idx").on(
			t.actorUserId,
		),
	}),
);

export const denteTelegramBotConfigs = pgTable(
	"dente_telegram_bot_configs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		botConfigId: text("bot_config_id").notNull().default("default"),
		mode: denteTelegramBotMode("mode").notNull().default("disabled"),
		botUsername: text("bot_username"),
		ownBotUsername: text("own_bot_username"),
		tokenSecretRef: text("token_secret_ref"),
		webhookSecretRef: text("webhook_secret_ref"),
		webhookBaseUrl: text("webhook_base_url"),
		patientPortalBaseUrl: text("patient_portal_base_url"),
		welcomeImageUrl: text("welcome_image_url"),
		visualCardUrls: jsonb(
			"visual_card_urls",
		).$type<DenteTelegramVisualCardUrls | null>(),
		clinicReviewUrl: text("clinic_review_url"),
		clinicMapsUrl: text("clinic_maps_url"),
		enabledFeaturesJson: text("enabled_features_json").notNull().default("[]"),
		patientLinkTokenTtlMinutes: integer("patient_link_token_ttl_minutes")
			.notNull()
			.default(120),
		appointmentReminderLeadTimesHoursJson: text(
			"appointment_reminder_lead_times_hours_json",
		)
			.notNull()
			.default("[24]"),
		reviewRequestDelayHours: integer("review_request_delay_hours")
			.notNull()
			.default(2),
		postVisitCheckupDelayHoursJson: text("post_visit_checkup_delay_hours_json")
			.notNull()
			.default(
				'{"extraction":24,"implantation":24,"filling_restoration":48,"endo":48,"surgery":24,"local_anesthesia":24,"hygiene":72,"prosthetics":48,"orthodontics":72,"periodontology":72,"other":48}',
			),
		allowVoiceIntake: boolean("allow_voice_intake").notNull().default(false),
		staffEscalationChannel: text("staff_escalation_channel"),
		privacyMode: denteTelegramPrivacyMode("privacy_mode")
			.notNull()
			.default("no_phi_by_default"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			denteTelegramBotConfigUnique: unique(
				"dente_telegram_bot_configs_org_clinic_config_unique",
			).on(table.organizationId, table.clinicId, table.botConfigId),
		};
	},
);

export const denteTelegramLinkCodes = pgTable(
	"dente_telegram_link_codes",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		botConfigId: text("bot_config_id").notNull().default("default"),
		subjectType: denteTelegramSubjectType("subject_type").notNull(),
		subjectId: uuid("subject_id").notNull(),
		codeFingerprint: text("code_fingerprint").notNull(),
		codeLast4: text("code_last4").notNull(),
		status: denteTelegramLinkCodeStatus("status").notNull().default("pending"),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		usedAt: timestamp("used_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdByUserId: uuid("created_by_user_id").references(() => users.id),
	},
	(table) => {
		return {
			denteTelegramLinkCodeFingerprintUnique: unique(
				"dente_telegram_link_codes_org_config_fingerprint_unique",
			).on(table.organizationId, table.botConfigId, table.codeFingerprint),
			clinicIdIdx: index("dente_telegram_link_codes_clinicId_idx").on(
				table.clinicId,
			),
			createdByUserIdIdx: index(
				"dente_telegram_link_codes_createdByUserId_idx",
			).on(table.createdByUserId),
		};
	},
);

export const denteTelegramChatLinks = pgTable(
	"dente_telegram_chat_links",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		botConfigId: text("bot_config_id").notNull().default("default"),
		subjectType: denteTelegramSubjectType("subject_type").notNull(),
		subjectId: uuid("subject_id").notNull(),
		chatFingerprint: text("chat_fingerprint").notNull(),
		chatTransportRef: text("chat_transport_ref"),
		chatIdLast4: text("chat_id_last4"),
		status: denteTelegramChatLinkStatus("status").notNull().default("active"),
		linkedAt: timestamp("linked_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		lastUpdateAt: timestamp("last_update_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			denteTelegramChatFingerprintUnique: unique(
				"dente_telegram_chat_links_org_config_chat_unique",
			).on(table.organizationId, table.botConfigId, table.chatFingerprint),
			clinicIdIdx: index("dente_telegram_chat_links_clinicId_idx").on(
				table.clinicId,
			),
		};
	},
);

export const denteTelegramWebhookEvents = pgTable(
	"dente_telegram_webhook_events",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		updateId: integer("update_id").notNull(),
		botConfigId: text("bot_config_id").notNull().default("default"),
		chatFingerprint: text("chat_fingerprint"),
		updateKind: denteTelegramUpdateKind("update_kind").notNull(),
		command: text("command"),
		status: denteTelegramWebhookStatus("status").notNull(),
		action: text("action").notNull(),
		warningsJson: text("warnings_json").notNull().default("[]"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			denteTelegramWebhookUpdateUnique: unique(
				"dente_telegram_webhook_events_org_config_update_unique",
			).on(table.organizationId, table.botConfigId, table.updateId),
			clinicIdIdx: index("dente_telegram_webhook_events_clinicId_idx").on(
				table.clinicId,
			),
		};
	},
);

export const denteTelegramOutboxDeliveryReceipts = pgTable(
	"dente_telegram_outbox_delivery_receipts",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		botConfigId: text("bot_config_id").notNull().default("default"),
		outboxItemId: text("outbox_item_id").notNull(),
		status: denteTelegramOutboxSendStatus("status").notNull(),
		outboxItemJson: text("outbox_item_json"),
		taskId: uuid("task_id").references(() => communicationTasks.id),
		eventId: uuid("event_id").references(() => communicationEvents.id),
		telegramMessageId: integer("telegram_message_id"),
		clientMutationId: text("client_mutation_id").notNull().default(""),
		warningsJson: text("warnings_json").notNull().default("[]"),
		blockedReason: text("blocked_reason"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			denteTelegramOutboxMutationUnique: unique(
				"dente_telegram_outbox_receipts_org_item_mutation_unique",
			).on(
				table.organizationId,
				table.botConfigId,
				table.outboxItemId,
				table.clientMutationId,
			),
			clinicIdIdx: index(
				"dente_telegram_outbox_delivery_receipts_clinicId_idx",
			).on(table.clinicId),
			taskIdIdx: index("dente_telegram_outbox_delivery_receipts_taskId_idx").on(
				table.taskId,
			),
			eventIdIdx: index(
				"dente_telegram_outbox_delivery_receipts_eventId_idx",
			).on(table.eventId),
		};
	},
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

// #59 — коммуникации::мультимессенджер_uis_omni
export const uisOmniMessengerQueues = pgTable(
	"uis_omni_messenger_queues",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		channelProvider: text("channel_provider")
			.default("whatsapp_waba")
			.notNull(),
		messageBody: text("message_body").notNull(),
		dispatchStatus: text("dispatch_status").default("queued").notNull(),
		scheduledDelaySeconds: integer("scheduled_delay_seconds")
			.default(60)
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("uis_omni_messenger_queues_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// #61 — интеграции::конструктор_лендингов_flexbe_и_сопоставление_полей
export const landingFieldMappings = pgTable(
	"landing_field_mappings",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		landingProvider: text("landing_provider").default("flexbe").notNull(),
		formName: text("form_name").notNull(),
		incomingFieldKey: text("incoming_field_key").notNull(),
		mappedCrmTarget: text("mapped_crm_target").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("landing_field_mappings_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// CRM leads (incoming lead tracking)
export const crmLeads = pgTable(
	"crm_leads",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		// alias — some routes call it name, some patientName
		name: text("name"),
		patientName: text("patient_name"),
		phone: text("phone"),
		source: text("source"),
		status: text("status").notNull().default("new"),
		assignedDoctorId: uuid("assigned_doctor_id"),
		notes: text("notes"),
		/**
		 * ОЖИДАЕМАЯ ВЫРУЧКА ПО ЛИДУ — принималась маршрутом и терялась молча.
		 *
		 * Колонка создана миграцией 0000 (строка 293) как `numeric(12, 2)`, а
		 * объявления здесь не было. При этом `POST /api/leads` принимает
		 * `expectedRevenue` в своей схеме разбора и пишет лид через
		 * `db.insert(crmLeads).values({ ...data, organizationId })`: ключа, которого
		 * нет в форме таблицы, drizzle в запрос не переносит. Сумма, введённая
		 * администратором, не доходила до базы, а `GET /api/leads` возвращает
		 * `select()` по тем же объявлениям — то есть не вернул бы её и оттуда.
		 * Канбан лидов (apps/web/src/components/leads/LeadsKanbanView.tsx) показывал
		 * поле, которое нечем заполнить.
		 *
		 * Объявлено БЕЗ `mode: "number"` намеренно: маршрут разбирает это поле как
		 * `z.string()`, и строковый тип drizzle совпадает с его контрактом.
		 */
		expectedRevenue: numeric("expected_revenue", { precision: 12, scale: 2 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("crm_leads_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// chat message dispatch statuses (outbound message delivery)
export const chatMessageDispatchStatuses = pgTable(
	"chat_message_dispatch_statuses",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		chatId: uuid("chat_id"),
		messageId: text("message_id"),
		channel: text("channel").notNull().default("telegram"),
		status: text("status").notNull().default("sent"),
		deliveredAt: timestamp("delivered_at", { withTimezone: true }),
		failReason: text("fail_reason"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"chat_message_dispatch_statuses_organizationId_idx",
		).on(t.organizationId),
	}),
);

// collaborative chat processing states (concurrent agent sync)
export const collaborativeChatProcessingStates = pgTable(
	"collaborative_chat_processing_states",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		chatId: uuid("chat_id").notNull(),
		processingAgent: text("processing_agent"),
		lockAcquiredAt: timestamp("lock_acquired_at", { withTimezone: true }),
		lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),
		lastProcessedAt: timestamp("last_processed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"collaborative_chat_processing_states_organizationId_idx",
		).on(t.organizationId),
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


// messenger file attachments (files sent through chat)
export const messengerFileAttachments = pgTable(
	"messenger_file_attachments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		chatId: uuid("chat_id"),
		fileUrl: text("file_url").notNull(),
		fileType: text("file_type").notNull().default("document"),
		fileSizeBytes: integer("file_size_bytes"),
		uploadedBy: uuid("uploaded_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"messenger_file_attachments_organizationId_idx",
		).on(t.organizationId),
	}),
);

// messenger inbound events (raw incoming webhook events)
/**
 * Очередь входящих сообщений из мессенджеров.
 *
 * ВНИМАНИЕ НА NOT NULL. В живой базе external_chat_id и event_kind объявлены
 * NOT NULL, а здесь стояли необязательными — расхождение того же рода, что
 * разбиралось в первом заходе по рантайм-DDL. Вставка без этих полей
 * компилировалась и падала уже в Postgres, на живом вебхуке. Оба вызывающих
 * места (routes/whatsapp.ts, routes/max.ts) их заполняют, поэтому объявление
 * приведено к базе, а не наоборот: ослаблять ограничение в базе значит
 * разрешить событие без канала-источника, которое потом нечем разобрать.
 */
export const messengerInboundEvents = pgTable(
	"messenger_inbound_events",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		channel: text("channel").notNull().default("telegram"),
		externalId: text("external_id"),
		externalChatId: text("external_chat_id").notNull(),
		chatId: uuid("chat_id"),
		patientId: uuid("patient_id"),
		messageText: text("message_text"),
		/** message | status | command — вид события у провайдера. */
		eventKind: text("event_kind").notNull(),
		rawPayload: jsonb("raw_payload"),
		processedAt: timestamp("processed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("messenger_inbound_events_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// patient communication timelines (full comm history per patient)
// ВНИМАНИЕ: определение приведено к физической таблице из миграции
// drizzle/0102_add_patient_communication_timelines.sql. БЫЛО: здесь описывались
// колонки patient_id/channel/direction/intent/message/status/operator_id, которых
// в базе нет. Любой db.select().from(...) по этой таблице падал на уровне SQL, и
// роут молча отдавал заглушку. Фронтенд (PatientCommunicationTimelinesWidget)
// тоже читает именно эти поля: patientName/eventType/statusColor/audioRecordingUrl.
export const patientCommunicationTimelines = pgTable(
	"patient_communication_timelines",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		eventType: text("event_type").notNull().default("call"),
		statusColor: text("status_color").notNull().default("green"),
		audioRecordingUrl: text("audio_recording_url"),
		comment: text("comment").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"patient_communication_timelines_organizationId_idx",
		).on(t.organizationId),
	}),
);

// previous chat dialog histories (chat context for AI)
export const previousChatDialogHistories = pgTable(
	"previous_chat_dialog_histories",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		chatId: uuid("chat_id").notNull(),
		role: text("role").notNull().default("user"),
		content: text("content").notNull(),
		tokensUsed: integer("tokens_used"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"previous_chat_dialog_histories_organizationId_idx",
		).on(t.organizationId),
	}),
);

// UIS call speech transcripts (telephony / callcenter transcripts)
export const uisCallSpeechTranscripts = pgTable(
	"uis_call_speech_transcripts",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		callId: text("call_id").notNull(),
		patientPhone: text("patient_phone"),
		durationSeconds: integer("duration_seconds"),
		transcript: text("transcript"),
		sentiment: text("sentiment"),
		aiSummary: text("ai_summary"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"uis_call_speech_transcripts_organizationId_idx",
		).on(t.organizationId),
	}),
);

// UIS SMS chat quotas (SMS quota management)
export const uisSmsChatQuotas = pgTable(
	"uis_sms_chat_quotas",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		monthYear: text("month_year").notNull(),
		smsSentCount: integer("sms_sent_count").notNull().default(0),
		smsQuotaLimit: integer("sms_quota_limit").notNull().default(1000),
		costRub: numeric("cost_rub", { precision: 10, scale: 2 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("uis_sms_chat_quotas_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// Dente Max bot configs (MAX messenger bot settings)
export const denteMaxBotConfigs = pgTable(
	"dente_max_bot_configs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		botId: text("bot_id"),
		maxBotToken: text("max_bot_token"),
		tokenSecretRef: text("token_secret_ref"),
		webhookUrl: text("webhook_url"),
		enabledFeaturesJson: jsonb("enabled_features_json"),
		staffRoutingJson: jsonb("staff_routing_json"),
		isEnabled: boolean("is_enabled").notNull().default(false),
		isActive: boolean("is_active").notNull().default(false),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("dente_max_bot_configs_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// Dente WhatsApp bot configs (WABA / WhatsApp settings)
export const denteWhatsappBotConfigs = pgTable(
	"dente_whatsapp_bot_configs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		wabaAccountId: text("waba_account_id"),
		phoneNumberId: text("phone_number_id"),
		accessToken: text("access_token"),
		// Secret ref used for token rotation (Vault / env var name)
		tokenSecretRef: text("token_secret_ref"),
		// Webhook verification token for Meta WABA challenge
		webhookVerifyToken: text("webhook_verify_token"),
		isEnabled: boolean("is_enabled").notNull().default(false),
		// Alias — some routes use isActive instead of isEnabled
		isActive: boolean("is_active").notNull().default(false),
		enabledFeaturesJson: jsonb("enabled_features_json"),
		staffRoutingJson: jsonb("staff_routing_json"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"dente_whatsapp_bot_configs_organizationId_idx",
		).on(t.organizationId),
	}),
);

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
export const outgoingNotifications = pgTable("outgoing_notifications", {
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
});

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
			decidedByUserIdIdx: index(
				"patient_communication_consents_decidedByUserId_idx",
			).on(table.decidedByUserId),
		};
	},
);

export const communicationSettings = pgTable(
	"communication_settings",
	{
		organizationId: uuid("organization_id")
			.primaryKey()
			.references(() => organizations.id),
		timezone: text("timezone").notNull().default("Europe/Moscow"),
		/** Минуты от полуночи. По умолчанию 21:00–09:00. */
		quietHoursStartMinute: integer("quiet_hours_start_minute")
			.notNull()
			.default(1260),
		quietHoursEndMinute: integer("quiet_hours_end_minute")
			.notNull()
			.default(540),
		/** Сервисное в тихие часы откладывается до утра, а не отменяется. */
		deferServiceInQuietHours: boolean("defer_service_in_quiet_hours")
			.notNull()
			.default(true),
		blockMarketingInQuietHours: boolean("block_marketing_in_quiet_hours")
			.notNull()
			.default(true),
		dailyLimitPerPatient: integer("daily_limit_per_patient")
			.notNull()
			.default(3),
		maxAttempts: integer("max_attempts").notNull().default(5),
		retryBaseSeconds: integer("retry_base_seconds").notNull().default(60),
		retryMaxSeconds: integer("retry_max_seconds").notNull().default(3600),
		channelFallbackJson: text("channel_fallback_json")
			.notNull()
			.default('["telegram","whatsapp","sms","email"]'),
		/**
		 * Автоматические напоминания о приёме (миграция 0124). Выключены по
		 * умолчанию: включать рассылку пациентам без ведома клиники нельзя.
		 */
		appointmentReminderEnabled: boolean("appointment_reminder_enabled")
			.notNull()
			.default(false),
		/** Часы до приёма: несколько значений — несколько напоминаний. */
		appointmentReminderLeadHoursJson: text(
			"appointment_reminder_lead_hours_json",
		)
			.notNull()
			.default("[24]"),
		/** Окно поиска, чтобы перезапуск не разослал напоминания о вчерашних приёмах. */
		appointmentReminderWindowMinutes: integer(
			"appointment_reminder_window_minutes",
		)
			.notNull()
			.default(90),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("communication_settings_organizationId_idx").on(
			t.organizationId,
		),
	}),
);
