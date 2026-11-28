import type {
	ClinicProfile,
	ClinicScheduleDefaults,
	DenteTelegramBotSettings,
	DenteTelegramChatLink,
	DenteTelegramLinkCode,
	DenteTelegramOutboxDeliveryReceipt,
	DenteTelegramWebhookEvent,
	UpdateDenteTelegramBotSettingsInput,
	Visit,
} from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
import { BoundedTtlMap } from "../../../lib/boundedTtlMap.js";
import {
	normalizeDenteTelegramVisualCardUrls,
	normalizeExistingDenteTelegramVisualCardUrls,
	normalizeTelegramBotUsername,
	normalizeTelegramPublicHttpsUrl,
	safeTelegramBotUsername,
} from "../telegramUrlHelpers.js";

export type { DomainState };

export const defaultClinicTimezone = "Europe/Samara";

const UNCONFIGURED_PLACEHOLDER_ORG_ID = "00000000-0000-0000-0000-000000000000";

const defaultClinicScheduleDefaults: ClinicScheduleDefaults = {
	workdayStart: "09:00",
	workdayEnd: "18:00",
	workingDays: [1, 2, 3, 4, 5],
	appointmentBufferMinutes: 10,
};

export const defaultClinicProfile: ClinicProfile = {
	organizationId: UNCONFIGURED_PLACEHOLDER_ORG_ID,
	clinicName: "Стоматология, 1 кабинет",
	legalName: "ИП Иванова М.С.",
	inn: "631234567890",
	kpp: null,
	ogrn: "318631300000000",
	address: "Самара, ул. Демонстрационная, 12",
	phone: "+7 927 111-22-33",
	email: "clinic@example.com",
	website: "https://example.com",
	medicalLicenseNumber: "Л041-01184-63/00000000",
	medicalLicenseIssuedAt: "2024-01-15",
	medicalLicenseIssuer: "Министерство здравоохранения Самарской области",
	bankDetails: "р/с 40702810000000000000, БИК 043601000, банк ООО «Демо Банк»",
	signatoryName: "Иванова Марина Сергеевна",
	signatoryTitle: "индивидуальный предприниматель",
	mode: "one_chair",
	timezone: defaultClinicTimezone,
	defaultVisitMinutes: 45,
	scheduleDefaults: defaultClinicScheduleDefaults,
	networkEnabled: false,
	egiszEnabled: false,
	updatedAt: new Date().toISOString(),
};

export const denteTelegramBotSettings: DenteTelegramBotSettings = {
	version: 1,
	organizationId:
		process.env.DENTE_TELEGRAM_ORGANIZATION_ID?.trim() ||
		UNCONFIGURED_PLACEHOLDER_ORG_ID,
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
	updatedAt: new Date().toISOString(),
};

export const denteTelegramLinkCodes: DenteTelegramLinkCode[] = [];
export const denteTelegramChatLinks: DenteTelegramChatLink[] = [];
export const denteTelegramOutboxDeliveryReceipts: DenteTelegramOutboxDeliveryReceipt[] = [];
export const denteTelegramWebhookEvents: DenteTelegramWebhookEvent[] = [];
export const denteTelegramOutboxDeliveryReceiptsMap = new BoundedTtlMap<
	string,
	DenteTelegramOutboxDeliveryReceipt
>({
	maxEntries: 5000,
	ttlMs: 24 * 60 * 60_000,
});

export const inMemoryActiveVisit: Visit = {
	id: UNCONFIGURED_PLACEHOLDER_ORG_ID,
	organizationId: UNCONFIGURED_PLACEHOLDER_ORG_ID,
	patientId: UNCONFIGURED_PLACEHOLDER_ORG_ID,
	appointmentId: null,
	status: "draft",
	revision: 1,
	complaint: null,
	anamnesis: null,
	objectiveStatus: null,
	diagnosis: null,
	treatmentPlan: null,
	doctorSummary: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

export const inMemoryDomainState: DomainState = {
	clinicProfile: defaultClinicProfile,
	staffMembers: [],
	chairs: [],
	patients: [],
	appointments: [],
	activeVisit: inMemoryActiveVisit,
	documents: [],
	serviceCatalog: [],
	treatmentPlanItems: [],
	treatmentPlanScenarios: [],
	clinicalRules: [],
	payments: [],
	communicationTemplates: [],
	communicationTasks: [],
	communicationEvents: [],
	imagingStudies: [],
	aiRecognitionJobs: [],
	importBatches: [],
	protocolTemplates: [],
	auditEvents: [],
	unavailableSlices: [],
};

export type DenteTelegramOutboxRuntimeScope = {
	readonly settings?: DenteTelegramBotSettings;
	readonly botTokenConfigured?: boolean;
	readonly botConfigId?: string | null;
	readonly clinicId?: string | null;
};

export type ResolvedDenteTelegramOutboxRuntimeScope = {
	readonly settings: DenteTelegramBotSettings;
	readonly botTokenConfigured: boolean;
	readonly botConfigId: string;
	readonly clinicId: string;
};

export function uniqueStrings(items: readonly string[]): string[] {
	return [...new Set(items.filter((item) => typeof item === "string" && item.trim()))];
}

export function toValidUuid(val?: string | null): string | null {
	if (!val) return null;
	const trimmed = val.trim();
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(trimmed) ? trimmed : null;
}

const telegramSettingsByOrganizationId = new BoundedTtlMap<string, DenteTelegramBotSettings>({
	maxEntries: 2000,
	ttlMs: 6 * 60 * 60_000,
});

export function getDenteTelegramBotSettings(
	organizationId?: string | null,
): DenteTelegramBotSettings {
	const trimmedOrgId = organizationId?.trim();
	if (trimmedOrgId) {
		const scoped = telegramSettingsByOrganizationId.get(trimmedOrgId);
		if (scoped) {
			return scoped;
		}
	}
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

export function normalizePostVisitCheckupDelayHoursByTopic(
	values: Record<string, number> | null | undefined,
): DenteTelegramBotSettings["postVisitCheckupDelayHoursByTopic"] {
	const defaults: DenteTelegramBotSettings["postVisitCheckupDelayHoursByTopic"] = {
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
	};
	if (!values) return defaults;
	const result = { ...defaults };
	for (const key of Object.keys(defaults) as Array<keyof typeof defaults>) {
		const val = values[key];
		if (typeof val === "number" && Number.isFinite(val) && val >= 1 && val <= 720) {
			result[key] = Math.floor(val);
		}
	}
	return result;
}

export function denteTelegramBotConfigIdForSettings(
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	botUsername: string | null = null,
): string {
	if (settings.mode === "clinic_owned_bot") {
		return `clinic_owned_bot:${settings.organizationId}:${(botUsername ?? "unconfigured").toLowerCase()}`;
	}
	if (settings.mode === "disabled") return `disabled:${settings.organizationId}`;
	return `shared_dente_bot:${settings.organizationId}`;
}

export function configuredTelegramBotUsername(): string | null {
	const shared = process.env.DENTE_TELEGRAM_BOT_USERNAME?.trim();
	const selected =
		denteTelegramBotSettings.mode === "clinic_owned_bot"
			? denteTelegramBotSettings.ownBotUsername
			: shared || denteTelegramBotSettings.botUsername;
	return safeTelegramBotUsername(selected);
}

export function configuredTelegramBotConfigId(): string {
	return denteTelegramBotConfigIdForSettings(
		denteTelegramBotSettings,
		configuredTelegramBotUsername(),
	);
}

export function normalizeDenteTelegramBotScopedLedgers(): void {
	const fallbackBotConfigId = configuredTelegramBotConfigId();
	for (const linkCode of denteTelegramLinkCodes as Array<
		DenteTelegramLinkCode & { botConfigId?: string | null }
	>) {
		linkCode.botConfigId = linkCode.botConfigId ?? fallbackBotConfigId;
	}
	for (const chatLink of denteTelegramChatLinks as Array<
		DenteTelegramChatLink & { botConfigId?: string | null }
	>) {
		chatLink.botConfigId = chatLink.botConfigId ?? fallbackBotConfigId;
	}
}

export function resolveDenteTelegramOutboxRuntimeScope(
	runtime?: DenteTelegramOutboxRuntimeScope,
): ResolvedDenteTelegramOutboxRuntimeScope {
	const settings = runtime?.settings ?? denteTelegramBotSettings;
	return {
		settings,
		botTokenConfigured:
			runtime?.botTokenConfigured ??
			Boolean(
				process.env.DENTE_TELEGRAM_BOT_TOKEN?.trim() ||
					process.env.TELEGRAM_BOT_TOKEN?.trim(),
			),
		botConfigId: runtime?.botConfigId?.trim() || configuredTelegramBotConfigId(),
		clinicId: runtime?.clinicId?.trim() || settings.organizationId || "",
	};
}

export function applyLoadedTelegramBotSettings(
	loaded: DenteTelegramBotSettings,
): DenteTelegramBotSettings {
	const cloned: DenteTelegramBotSettings = { ...loaded };
	telegramSettingsByOrganizationId.set(loaded.organizationId, cloned);
	if (loaded.organizationId === denteTelegramBotSettings.organizationId) {
		Object.assign(denteTelegramBotSettings, cloned);
	}
	return cloned;
}

export function updateDenteTelegramBotSettings(
	input: UpdateDenteTelegramBotSettingsInput,
): DenteTelegramBotSettings {
	const targetOrgId =
		input.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const baseSettings = getDenteTelegramBotSettings(targetOrgId);
	const currentSettings: DenteTelegramBotSettings =
		baseSettings.organizationId === targetOrgId
			? baseSettings
			: { ...baseSettings, organizationId: targetOrgId };

	const nextSettings: DenteTelegramBotSettings = {
		...currentSettings,
		...input,
		version: 1,
		organizationId: targetOrgId,
		mode: input.mode ?? currentSettings.mode,
		botUsername:
			input.botUsername !== undefined
				? normalizeTelegramBotUsername(input.botUsername)
				: normalizeTelegramBotUsername(currentSettings.botUsername),
		ownBotUsername:
			input.ownBotUsername !== undefined
				? normalizeTelegramBotUsername(input.ownBotUsername)
				: normalizeTelegramBotUsername(currentSettings.ownBotUsername),
		webhookBaseUrl:
			input.webhookBaseUrl !== undefined
				? normalizeTelegramPublicHttpsUrl("webhookBaseUrl", input.webhookBaseUrl)
				: currentSettings.webhookBaseUrl,
		patientPortalBaseUrl:
			input.patientPortalBaseUrl !== undefined
				? normalizeTelegramPublicHttpsUrl(
						"patientPortalBaseUrl",
						input.patientPortalBaseUrl,
					)
				: currentSettings.patientPortalBaseUrl,
		welcomeImageUrl:
			input.welcomeImageUrl !== undefined
				? normalizeTelegramPublicHttpsUrl("welcomeImageUrl", input.welcomeImageUrl)
				: (currentSettings.welcomeImageUrl ?? null),
		visualCardUrls:
			input.visualCardUrls !== undefined
				? normalizeDenteTelegramVisualCardUrls(input.visualCardUrls)
				: normalizeExistingDenteTelegramVisualCardUrls(currentSettings.visualCardUrls),
		clinicReviewUrl:
			input.clinicReviewUrl !== undefined
				? normalizeTelegramPublicHttpsUrl("clinicReviewUrl", input.clinicReviewUrl)
				: currentSettings.clinicReviewUrl,
		clinicMapsUrl:
			input.clinicMapsUrl !== undefined
				? normalizeTelegramPublicHttpsUrl("clinicMapsUrl", input.clinicMapsUrl)
				: currentSettings.clinicMapsUrl,
		enabledFeatures: input.enabledFeatures ?? currentSettings.enabledFeatures,
		patientLinkTokenTtlMinutes:
			input.patientLinkTokenTtlMinutes ?? currentSettings.patientLinkTokenTtlMinutes,
		appointmentReminderLeadTimesHours: Array.isArray(
			input.appointmentReminderLeadTimesHours,
		)
			? normalizeAppointmentReminderLeadTimes(input.appointmentReminderLeadTimesHours)
			: normalizeAppointmentReminderLeadTimes(
					currentSettings.appointmentReminderLeadTimesHours,
				),
		reviewRequestDelayHours:
			input.reviewRequestDelayHours !== undefined
				? normalizeReviewRequestDelayHours(input.reviewRequestDelayHours)
				: normalizeReviewRequestDelayHours(currentSettings.reviewRequestDelayHours),
		postVisitCheckupDelayHoursByTopic:
			input.postVisitCheckupDelayHoursByTopic !== undefined
				? normalizePostVisitCheckupDelayHoursByTopic(
						input.postVisitCheckupDelayHoursByTopic,
					)
				: normalizePostVisitCheckupDelayHoursByTopic(
						currentSettings.postVisitCheckupDelayHoursByTopic,
					),
		allowVoiceIntake: input.allowVoiceIntake ?? currentSettings.allowVoiceIntake,
		staffEscalationChannel:
			input.staffEscalationChannel !== undefined
				? input.staffEscalationChannel
				: currentSettings.staffEscalationChannel,
		privacyMode: input.privacyMode ?? currentSettings.privacyMode,
		updatedAt: new Date().toISOString(),
	};

	telegramSettingsByOrganizationId.set(nextSettings.organizationId, nextSettings);
	if (
		!input.organizationId ||
		input.organizationId === denteTelegramBotSettings.organizationId
	) {
		Object.assign(denteTelegramBotSettings, nextSettings);
	}
	return nextSettings;
}
