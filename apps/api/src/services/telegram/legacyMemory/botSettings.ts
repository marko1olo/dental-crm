/**
 * botSettings.ts
 *
 * Telegram bot settings management, env configuration parsing and runtime scope resolution.
 */

import type {
	DenteTelegramBotSettings,
	UpdateDenteTelegramBotSettingsInput,
} from "@dental/shared";
import type {
	DenteTelegramOutboxRuntimeScope,
	ResolvedDenteTelegramOutboxRuntimeScope,
} from "./types.js";
import {
	organizationId,
	nowIso,
	clinicProfile,
	persistMutableState,
	denteTelegramLinkCodes,
	denteTelegramChatLinks,
	denteTelegramOutboxDeliveryReceipts,
	denteTelegramWebhookEvents,
	syncDenteTelegramOutboxDeliveryReceiptsMap,
	normalizePostVisitCheckupDelayHoursByTopic,
} from "./storeState.js";
import {
	normalizeDenteTelegramVisualCardUrls,
	normalizeExistingDenteTelegramVisualCardUrls,
	normalizeTelegramBotUsername,
	safeTelegramBotUsername,
	safeHttpsUrl,
	normalizeTelegramPublicHttpsUrl,
	safeDenteTelegramPublicHttpsUrl,
} from "./botUrlHelpers.js";

export const denteTelegramBotSettings: DenteTelegramBotSettings = {
	version: 1,
	organizationId,
	mode: "shared_dente_bot",
	botUsername: "dentecrm_bot",
	ownBotUsername: null,
	webhookBaseUrl: null,
	patientPortalBaseUrl: null,
	welcomeImageUrl: null,
	visualCardUrls: {
		mainMenu: null,
		appointment: null,
		documents: null,
		tax: null,
		billing: null,
		care: null,
		review: null,
		staff: null,
	},
	clinicReviewUrl: null,
	clinicMapsUrl: null,
	enabledFeatures: [
		"patient_linking",
		"appointment_reminders",
		"appointment_confirmation",
		"document_ready_notice",
		"tax_document_request",
		"post_visit_instructions",
		"recalls",
		"review_requests",
		"staff_task_alerts",
		"secure_portal_links",
	],
	patientLinkTokenTtlMinutes: 15,
	appointmentReminderLeadTimesHours: [24],
	reviewRequestDelayHours: 2,
	postVisitCheckupDelayHoursByTopic: {
		extraction: 24,
		implantation: 24,
		filling_restoration: 48,
		endo: 48,
		surgery: 24,
		local_anesthesia: 24,
		hygiene: 72,
		prosthetics: 48,
		orthodontics: 72,
		periodontology: 72,
		other: 48,
		surgery_aftercare: 24,
		fixation_aftercare: 48,
	},
	allowVoiceIntake: false,
	staffEscalationChannel: null,
	privacyMode: "no_phi_by_default",
	updatedAt: nowIso,
};


export function getDenteTelegramBotSettings(): DenteTelegramBotSettings {
	return denteTelegramBotSettings;
}

export function normalizeAppointmentReminderLeadTimes(
	values: readonly number[] | null | undefined,
): number[] {
	const normalized = [
		...new Set(
			(values ?? [])
				.map((value) => Math.floor(value))
				.filter((value) => value >= 1 && value <= 168),
		),
	].sort((left, right) => right - left);
	return normalized.length ? normalized.slice(0, 6) : [24];
}

export function normalizeReviewRequestDelayHours(value: unknown): number {
	const parsed =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number.parseInt(value, 10)
				: NaN;
	return Number.isFinite(parsed)
		? Math.max(1, Math.min(720, Math.floor(parsed)))
		: 2;
}


export function updateDenteTelegramBotSettings(
	input: UpdateDenteTelegramBotSettingsInput,
): DenteTelegramBotSettings {
	if (
		input.organizationId &&
		input.organizationId !== denteTelegramBotSettings.organizationId
	) {
		throw new Error("Настройки Telegram относятся к другой организации.");
	}

	const nextSettings: DenteTelegramBotSettings = {
		...denteTelegramBotSettings,
		...input,
		version: 1,
		organizationId: denteTelegramBotSettings.organizationId,
		mode: input.mode ?? denteTelegramBotSettings.mode,
		botUsername:
			input.botUsername !== undefined
				? normalizeTelegramBotUsername(input.botUsername)
				: normalizeTelegramBotUsername(denteTelegramBotSettings.botUsername),
		ownBotUsername:
			input.ownBotUsername !== undefined
				? normalizeTelegramBotUsername(input.ownBotUsername)
				: normalizeTelegramBotUsername(denteTelegramBotSettings.ownBotUsername),
		webhookBaseUrl:
			input.webhookBaseUrl !== undefined
				? normalizeTelegramPublicHttpsUrl(
						"webhookBaseUrl",
						input.webhookBaseUrl,
					)
				: denteTelegramBotSettings.webhookBaseUrl,
		patientPortalBaseUrl:
			input.patientPortalBaseUrl !== undefined
				? normalizeTelegramPublicHttpsUrl(
						"patientPortalBaseUrl",
						input.patientPortalBaseUrl,
					)
				: denteTelegramBotSettings.patientPortalBaseUrl,
		welcomeImageUrl:
			input.welcomeImageUrl !== undefined
				? normalizeTelegramPublicHttpsUrl(
						"welcomeImageUrl",
						input.welcomeImageUrl,
					)
				: (denteTelegramBotSettings.welcomeImageUrl ?? null),
		visualCardUrls:
			input.visualCardUrls !== undefined
				? normalizeDenteTelegramVisualCardUrls(input.visualCardUrls)
				: normalizeExistingDenteTelegramVisualCardUrls(
						denteTelegramBotSettings.visualCardUrls,
					),
		clinicReviewUrl:
			input.clinicReviewUrl !== undefined
				? normalizeTelegramPublicHttpsUrl(
						"clinicReviewUrl",
						input.clinicReviewUrl,
					)
				: denteTelegramBotSettings.clinicReviewUrl,
		clinicMapsUrl:
			input.clinicMapsUrl !== undefined
				? normalizeTelegramPublicHttpsUrl("clinicMapsUrl", input.clinicMapsUrl)
				: denteTelegramBotSettings.clinicMapsUrl,
		enabledFeatures:
			input.enabledFeatures ?? denteTelegramBotSettings.enabledFeatures,
		patientLinkTokenTtlMinutes:
			input.patientLinkTokenTtlMinutes ??
			denteTelegramBotSettings.patientLinkTokenTtlMinutes,
		appointmentReminderLeadTimesHours:
			input.appointmentReminderLeadTimesHours !== undefined
				? normalizeAppointmentReminderLeadTimes(
						input.appointmentReminderLeadTimesHours,
					)
				: normalizeAppointmentReminderLeadTimes(
						denteTelegramBotSettings.appointmentReminderLeadTimesHours,
					),
		reviewRequestDelayHours:
			input.reviewRequestDelayHours !== undefined
				? normalizeReviewRequestDelayHours(input.reviewRequestDelayHours)
				: normalizeReviewRequestDelayHours(
						denteTelegramBotSettings.reviewRequestDelayHours,
					),
		postVisitCheckupDelayHoursByTopic:
			input.postVisitCheckupDelayHoursByTopic !== undefined
				? normalizePostVisitCheckupDelayHoursByTopic(
						input.postVisitCheckupDelayHoursByTopic,
					)
				: normalizePostVisitCheckupDelayHoursByTopic(
						denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic,
					),
		allowVoiceIntake:
			input.allowVoiceIntake ?? denteTelegramBotSettings.allowVoiceIntake,
		staffEscalationChannel:
			input.staffEscalationChannel !== undefined
				? input.staffEscalationChannel
				: denteTelegramBotSettings.staffEscalationChannel,
		privacyMode: input.privacyMode ?? denteTelegramBotSettings.privacyMode,
		updatedAt: new Date().toISOString(),
	};

	Object.assign(denteTelegramBotSettings, nextSettings);
	persistMutableState();
	return denteTelegramBotSettings;
}

function telegramEnvRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function telegramEnvString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function denteTelegramBotConfigIdForSettings(
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	botUsername: string | null = null,
): string {
	if (settings.mode === "clinic_owned_bot") {
		return `clinic_owned_bot:${settings.organizationId}:${(botUsername ?? "unconfigured").toLowerCase()}`;
	}
	if (settings.mode === "disabled")
		return `disabled:${settings.organizationId}`;
	return `shared_dente_bot:${settings.organizationId}`;
}

function configuredClinicTelegramBotFromJson(): {
	botConfigId: string | null;
	botUsername: string | null;
	botToken: string | null;
} | null {
	const raw = process.env.DENTE_TELEGRAM_CLINIC_BOTS_JSON?.trim();
	if (!raw) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	const records: unknown[] = Array.isArray(parsed)
		? parsed
		: telegramEnvRecord(parsed)
			? Object.entries(parsed).map(([key, value]) =>
					telegramEnvRecord(value) ? { organizationId: key, ...value } : null,
				)
			: [];

	const match = records.filter(telegramEnvRecord).find((record) => {
		const organizationId =
			telegramEnvString(record.organizationId) ??
			telegramEnvString(record.orgId);
		const clinicId = telegramEnvString(record.clinicId);
		return (
			organizationId === denteTelegramBotSettings.organizationId ||
			clinicId === denteTelegramBotSettings.organizationId
		);
	});
	if (!match) return null;
	return {
		botConfigId:
			telegramEnvString(match.botConfigId) ?? telegramEnvString(match.configId),
		botUsername: safeTelegramBotUsername(
			telegramEnvString(match.botUsername) ?? telegramEnvString(match.username),
		),
		botToken:
			telegramEnvString(match.botToken) ?? telegramEnvString(match.token),
	};
}

function configuredTelegramBotUsername(): string | null {
	const sharedConfigured = process.env.DENTE_TELEGRAM_BOT_USERNAME?.trim();
	const clinicJson = configuredClinicTelegramBotFromJson();
	const clinicConfigured =
		clinicJson?.botUsername ||
		process.env.DENTE_TELEGRAM_OWN_BOT_USERNAME?.trim() ||
		process.env.DENTE_TELEGRAM_CLINIC_BOT_USERNAME?.trim();
	const selected =
		denteTelegramBotSettings.mode === "clinic_owned_bot"
			? clinicConfigured || denteTelegramBotSettings.ownBotUsername
			: sharedConfigured || denteTelegramBotSettings.botUsername;
	return safeTelegramBotUsername(selected);
}

export function configuredTelegramBotConfigId(): string {
	const clinicJson = configuredClinicTelegramBotFromJson();
	if (
		denteTelegramBotSettings.mode === "clinic_owned_bot" &&
		clinicJson?.botConfigId
	)
		return clinicJson.botConfigId;
	return denteTelegramBotConfigIdForSettings(
		denteTelegramBotSettings,
		configuredTelegramBotUsername(),
	);
}

function normalizeDenteTelegramBotConfigId(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeDenteTelegramBotScopedLedgers(): void {
	const fallbackBotConfigId = configuredTelegramBotConfigId();
	for (const linkCode of denteTelegramLinkCodes as Array<
		DenteTelegramLinkCode & { botConfigId?: string | null }
	>) {
		linkCode.botConfigId =
			normalizeDenteTelegramBotConfigId(linkCode.botConfigId) ??
			fallbackBotConfigId;
	}
	for (const chatLink of denteTelegramChatLinks as Array<
		DenteTelegramChatLink & { botConfigId?: string | null }
	>) {
		chatLink.botConfigId =
			normalizeDenteTelegramBotConfigId(chatLink.botConfigId) ??
			fallbackBotConfigId;
	}
}

function configuredTelegramBotToken(): string | null {
	if (denteTelegramBotSettings.mode === "clinic_owned_bot") {
		return (
			configuredClinicTelegramBotFromJson()?.botToken ||
			process.env.DENTE_TELEGRAM_OWN_BOT_TOKEN?.trim() ||
			process.env.DENTE_TELEGRAM_CLINIC_BOT_TOKEN?.trim() ||
			null
		);
	}
	return (
		process.env.DENTE_TELEGRAM_BOT_TOKEN?.trim() ||
		process.env.TELEGRAM_BOT_TOKEN?.trim() ||
		null
	);
}


type ResolvedDenteTelegramOutboxRuntimeScope = {
	settings: DenteTelegramBotSettings;
	botTokenConfigured: boolean;
	botConfigId: string;
	clinicId: string;
};

export function resolveDenteTelegramOutboxRuntimeScope(
	runtime?: DenteTelegramOutboxRuntimeScope,
): ResolvedDenteTelegramOutboxRuntimeScope {
	return {
		settings: runtime?.settings ?? denteTelegramBotSettings,
		botTokenConfigured:
			runtime?.botTokenConfigured ?? Boolean(configuredTelegramBotToken()),
		botConfigId:
			runtime?.botConfigId?.trim() || configuredTelegramBotConfigId(),
		clinicId: runtime?.clinicId?.trim() || clinicProfile.organizationId,
	};
}


function sanitizeDenteTelegramBotSettingsInPlace(): void {
	const envWelcomeImageUrl =
		process.env.DENTE_TELEGRAM_WELCOME_IMAGE_URL?.trim() || null;
	const sanitized = {
		botUsername: safeTelegramBotUsername(denteTelegramBotSettings.botUsername),
		ownBotUsername: safeTelegramBotUsername(
			denteTelegramBotSettings.ownBotUsername,
		),
		webhookBaseUrl: safeHttpsUrl(denteTelegramBotSettings.webhookBaseUrl),
		patientPortalBaseUrl: safeHttpsUrl(
			denteTelegramBotSettings.patientPortalBaseUrl,
		),
		welcomeImageUrl:
			safeHttpsUrl(denteTelegramBotSettings.welcomeImageUrl) ??
			safeHttpsUrl(envWelcomeImageUrl),
		clinicReviewUrl: safeHttpsUrl(denteTelegramBotSettings.clinicReviewUrl),
		clinicMapsUrl: safeHttpsUrl(denteTelegramBotSettings.clinicMapsUrl),
		appointmentReminderLeadTimesHours: normalizeAppointmentReminderLeadTimes(
			denteTelegramBotSettings.appointmentReminderLeadTimesHours,
		),
		reviewRequestDelayHours: normalizeReviewRequestDelayHours(
			denteTelegramBotSettings.reviewRequestDelayHours,
		),
		postVisitCheckupDelayHoursByTopic:
			normalizePostVisitCheckupDelayHoursByTopic(
				denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic,
			),
	};
	const changed =
		denteTelegramBotSettings.webhookBaseUrl !== sanitized.webhookBaseUrl ||
		denteTelegramBotSettings.botUsername !== sanitized.botUsername ||
		denteTelegramBotSettings.ownBotUsername !== sanitized.ownBotUsername ||
		denteTelegramBotSettings.patientPortalBaseUrl !==
			sanitized.patientPortalBaseUrl ||
		denteTelegramBotSettings.welcomeImageUrl !== sanitized.welcomeImageUrl ||
		denteTelegramBotSettings.clinicReviewUrl !== sanitized.clinicReviewUrl ||
		denteTelegramBotSettings.clinicMapsUrl !== sanitized.clinicMapsUrl ||
		denteTelegramBotSettings.appointmentReminderLeadTimesHours.join(",") !==
			sanitized.appointmentReminderLeadTimesHours.join(",") ||
		denteTelegramBotSettings.reviewRequestDelayHours !==
			sanitized.reviewRequestDelayHours ||
		JSON.stringify(
			denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic,
		) !== JSON.stringify(sanitized.postVisitCheckupDelayHoursByTopic);
	Object.assign(denteTelegramBotSettings, sanitized);
	if (changed) persistMutableState();
}

sanitizeDenteTelegramBotSettingsInPlace();

