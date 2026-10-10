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
	denteTelegramBotMode,
	denteTelegramChatLinkStatus,
	denteTelegramLinkCodeStatus,
	denteTelegramPrivacyMode,
	denteTelegramSubjectType,
	denteTelegramUpdateKind,
	denteTelegramWebhookStatus,
} from "../_common.js";
import { clinics, organizations, users } from "../auth.js";

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
			organizationIdIdx: index(
				"dente_telegram_bot_configs_organization_id_idx",
			).on(table.organizationId),
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
			organizationIdIdx: index(
				"dente_telegram_link_codes_organization_id_idx",
			).on(table.organizationId),
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
			organizationIdIdx: index(
				"dente_telegram_chat_links_organization_id_idx",
			).on(table.organizationId),
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
			organizationIdIdx: index(
				"dente_telegram_webhook_events_organization_id_idx",
			).on(table.organizationId),
			clinicIdIdx: index("dente_telegram_webhook_events_clinicId_idx").on(
				table.clinicId,
			),
		};
	},
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

// Dente VK Community bot configs
export const denteVkBotConfigs = pgTable(
	"dente_vk_bot_configs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		botConfigId: text("bot_config_id").notNull().default("default"),
		groupId: text("group_id"),
		groupToken: text("group_token"),
		tokenSecretRef: text("token_secret_ref"),
		secretKey: text("secret_key"),
		confirmationCode: text("confirmation_code"),
		webhookUrl: text("webhook_url"),
		isEnabled: boolean("is_enabled").notNull().default(false),
		isActive: boolean("is_active").notNull().default(false),
		enabledFeaturesJson: jsonb("enabled_features_json"),
		staffRoutingJson: jsonb("staff_routing_json"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("dente_vk_bot_configs_organizationId_idx").on(
			t.organizationId,
		),
		uniqueOrgBotConfig: unique("dente_vk_bot_configs_org_config_unique").on(
			t.organizationId,
			t.botConfigId,
		),
	}),
);

// Dente VK Doctor / Staff Personal User Accounts
export const denteVkUserAccounts = pgTable(
	"dente_vk_user_accounts",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		userId: uuid("user_id").references(() => users.id),
		vkUserId: text("vk_user_id").notNull(),
		accessToken: text("access_token"),
		tokenSecretRef: text("token_secret_ref"),
		firstName: text("first_name"),
		lastName: text("last_name"),
		screenName: text("screen_name"),
		photoUrl: text("photo_url"),
		status: text("status").notNull().default("connected"),
		isActive: boolean("is_active").notNull().default(true),
		lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("dente_vk_user_accounts_organizationId_idx").on(
			t.organizationId,
		),
		userIdIdx: index("dente_vk_user_accounts_userId_idx").on(t.userId),
		vkUserIdIdx: index("dente_vk_user_accounts_vkUserId_idx").on(t.vkUserId),
		uniqueOrgVkUser: unique("dente_vk_user_accounts_org_vk_user_unique").on(
			t.organizationId,
			t.vkUserId,
		),
	}),
);

// Dente Telegram Doctor / Staff Personal MTProto Accounts
export const denteTelegramAccountConfigs = pgTable(
	"dente_telegram_account_configs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		userId: uuid("user_id").references(() => users.id),
		phone: text("phone").notNull(),
		sessionStringEncrypted: text("session_string_encrypted"),
		tokenSecretRef: text("token_secret_ref"),
		firstName: text("first_name"),
		lastName: text("last_name"),
		username: text("username"),
		avatarUrl: text("avatar_url"),
		status: text("status").notNull().default("connected"),
		is2faEnabled: boolean("is_2fa_enabled").notNull().default(false),
		connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
		lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
		isActive: boolean("is_active").notNull().default(true),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"dente_telegram_account_configs_organizationId_idx",
		).on(t.organizationId),
		clinicIdIdx: index("dente_telegram_account_configs_clinicId_idx").on(
			t.clinicId,
		),
		userIdIdx: index("dente_telegram_account_configs_userId_idx").on(t.userId),
		phoneIdx: index("dente_telegram_account_configs_phone_idx").on(t.phone),
		uniqueOrgPhone: unique(
			"dente_telegram_account_configs_org_phone_unique",
		).on(t.organizationId, t.phone),
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
		provider: text("provider").notNull().default("cloud_api"),
		greenApiInstanceId: text("green_api_instance_id"),
		greenApiToken: text("green_api_token"),
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
