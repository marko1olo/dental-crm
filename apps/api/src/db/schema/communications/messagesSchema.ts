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
	communicationDirection,
	communicationStatus,
	denteTelegramOutboxSendStatus,
} from "../_common.js";
import { clinics, organizations, users } from "../auth.js";
import { patients } from "../patients.js";
import { communicationTasks } from "./campaignsSchema.js";

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
			organizationIdIdx: index(
				"dente_telegram_outbox_delivery_receipts_organization_id_idx",
			).on(table.organizationId),
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
		stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
		priority: text("priority").notNull().default("normal"),
		clinicalTags: jsonb("clinical_tags")
			.$type<string[]>()
			.default(sql`'[]'::jsonb`),
		audioRecordUrl: text("audio_record_url"),
		transcriptionSnippet: text("transcription_snippet"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("crm_leads_organizationId_idx").on(
			t.organizationId,
		),
		statusIdx: index("crm_leads_status_idx").on(t.status),
		stageEnteredAtIdx: index("crm_leads_stage_entered_at_idx").on(
			t.stageEnteredAt,
		),
	}),
);

// CRM lead stage transition audit history
export const crmLeadStageHistory = pgTable(
	"crm_lead_stage_history",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		leadId: uuid("lead_id")
			.notNull()
			.references(() => crmLeads.id, { onDelete: "cascade" }),
		fromStage: text("from_stage"),
		toStage: text("to_stage").notNull(),
		changedByUserId: uuid("changed_by_user_id").references(() => users.id),
		durationSeconds: integer("duration_seconds"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("crm_lead_stage_history_organization_id_idx").on(
			t.organizationId,
		),
		leadIdIdx: index("crm_lead_stage_history_lead_id_idx").on(t.leadId),
		createdAtIdx: index("crm_lead_stage_history_created_at_idx").on(
			t.createdAt,
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
