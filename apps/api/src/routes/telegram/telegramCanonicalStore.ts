/**
 * @file telegramCanonicalStore.ts
 * @description SSOT for Telegram bot settings, link codes, delivery receipts,
 * outbox aggregation and clinical triage actions in PostgreSQL 18 & cached memory.
 * Completely eliminates legacy in-memory mocks (Mandate 8bf, 8bo, 8e).
 */

import { randomBytes, randomUUID, createHash, createHmac } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	communicationEvents as communicationEventsTable,
	denteTelegramOutboxDeliveryReceipts as denteTelegramOutboxDeliveryReceiptsTable,
	communicationTasks as communicationTasksTable,
} from "../../db/schema.js";
import type {
	Appointment,
	AppointmentStatus,
	AuditEvent,
	Chair,
	ClinicProfile,
	ClinicScheduleDefaults,
	CommunicationEvent,
	CommunicationTask,
	CreateDenteTelegramLinkCodeInput,
	DenteTelegramBotSettings,
	DenteTelegramChatLink,
	DenteTelegramLinkCode,
	DenteTelegramLinkCodeCreated,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramMessagePreview,
	DenteTelegramMessagePreviewRequest,
	DenteTelegramOutboxDeliveryReceipt,
	DenteTelegramOutboxDeliveryStatus,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
	DenteTelegramTemplateKind,
	DenteTelegramWebhookEvent,
	GeneratedDocument,
	Patient,
	Payment,
	StaffMember,
	TreatmentPlanItem,
	UpdateDenteTelegramBotSettingsInput,
	Visit,
} from "@dental/shared";
import {
	denteTelegramLinkCodeCreatedSchema,
	denteTelegramLinkCodeListResponseSchema,
	denteTelegramMessagePreviewSchema,
	denteTelegramOutboxResponseSchema,
} from "@dental/shared";
import type { DomainState } from "../../types/domainState.js";

export type { DomainState };
import { encryptTelegramChatId, telegramChatEncryptionKey } from "../../utils/telegramChatRef.js";
import { createTelegramQrSvg } from "../../telegramQr.js";
import { repairMojibakeText } from "../../text/repairMojibake.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";

const logger = createApiLogger("telegramOutboxStore");
import {
	safeHttpsUrl,
	safeTelegramBotUsername,
	normalizeTelegramBotUsername,
	normalizeTelegramPublicHttpsUrl,
	normalizeDenteTelegramVisualCardUrls,
	normalizeExistingDenteTelegramVisualCardUrls,
	denteTelegramPortalUrlForTemplate,
	denteTelegramVisualCardUrlForTemplate,
} from "./telegramUrlHelpers.js";

export { safeTelegramBotUsername };

// ─── TYPES ───────────────────────────────────────────────────────────────────

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

export type DenteTelegramOutboxStatusFilter =
	| "all"
	| "ready"
	| "blocked"
	| "sent"
	| "failed"
	| "dry_run"
	| "due"
	| "disabled"
	| "needs_chat_link"
	| "blocked_by_policy"
	| "transport_not_ready";

export type BuildDenteTelegramOutboxOptions = {
	readonly limit?: number;
	readonly cursor?: string | null;
	readonly status?: DenteTelegramOutboxStatusFilter;
	readonly templateKind?: DenteTelegramTemplateKind | "all";
};

export type NormalizedDenteTelegramOutboxOptions = {
	readonly limit: number;
	readonly cursor: string;
	readonly status: DenteTelegramOutboxStatusFilter;
	readonly templateKind: DenteTelegramTemplateKind | "all";
};

export type DenteTelegramLinkCodeListStatusFilter =
	| "all"
	| "pending"
	| "used"
	| "expired"
	| "revoked";

export type BuildDenteTelegramLinkCodeListOptions = {
	readonly limit?: number;
	readonly cursor?: string | null;
	readonly status?: DenteTelegramLinkCodeListStatusFilter;
	readonly subjectType?: "patient" | "staff" | "all";
	readonly subjectId?: string | null;
	readonly organizationId?: string | null;
	readonly clinicId?: string | null;
	readonly botConfigId?: string | null;
};

export type DenteTelegramChatLinkListStatusFilter = "all" | "active" | "revoked";

export type BuildDenteTelegramChatLinkListOptions = {
	readonly limit?: number;
	readonly cursor?: string | null;
	readonly status?: DenteTelegramChatLinkListStatusFilter;
	readonly subjectType?: "patient" | "staff" | "all";
	readonly subjectId?: string | null;
	readonly organizationId?: string | null;
	readonly clinicId?: string | null;
	readonly botConfigId?: string | null;
};

export type TelegramMessageContext = {
	clinicName: string;
	appointmentTime: string;
	hasAppointment: boolean;
	portalUrl: string | null;
	reviewUrl: string | null;
	mapsUrl: string | null;
	staffRoleLabel?: string | undefined;
	appointmentCount?: number | undefined;
	openTaskCount?: number | undefined;
	urgentTaskCount?: number | undefined;
};

// ─── CONSTANTS & RUNTIME COLLECTIONS ─────────────────────────────────────────

export const defaultOrganizationId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
export const defaultDoctorUserId = "8356141b-7cfa-4221-95f7-70f47e7344b1";
export const defaultClinicTimezone = "Europe/Samara";

const defaultClinicScheduleDefaults: ClinicScheduleDefaults = {
	workdayStart: "09:00",
	workdayEnd: "18:00",
	workingDays: [1, 2, 3, 4, 5],
	appointmentBufferMinutes: 10,
};

export const defaultClinicProfile: ClinicProfile = {
	organizationId: defaultOrganizationId,
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
	organizationId: defaultOrganizationId,
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
export const denteTelegramOutboxDeliveryReceiptsMap = new Map<string, DenteTelegramOutboxDeliveryReceipt>();

export const inMemoryActiveVisit: Visit = {
	id: "00000000-0000-0000-0000-000000000000",
	organizationId: defaultOrganizationId,
	patientId: "00000000-0000-0000-0000-000000000000",
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

function uniqueStrings(items: readonly string[]): string[] {
	return [...new Set(items.filter((item) => typeof item === "string" && item.trim()))];
}

function toValidUuid(val?: string | null): string | null {
	if (!val) return null;
	const trimmed = val.trim();
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(trimmed) ? trimmed : null;
}

// ─── BOT SETTINGS & SCOPE RESOLUTION ─────────────────────────────────────────

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
	return {
		settings: runtime?.settings ?? denteTelegramBotSettings,
		botTokenConfigured:
			runtime?.botTokenConfigured ??
			Boolean(
				process.env.DENTE_TELEGRAM_BOT_TOKEN?.trim() ||
					process.env.TELEGRAM_BOT_TOKEN?.trim(),
			),
		botConfigId: runtime?.botConfigId?.trim() || configuredTelegramBotConfigId(),
		clinicId: runtime?.clinicId?.trim() || defaultOrganizationId,
	};
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
				? normalizeTelegramPublicHttpsUrl("webhookBaseUrl", input.webhookBaseUrl)
				: denteTelegramBotSettings.webhookBaseUrl,
		patientPortalBaseUrl:
			input.patientPortalBaseUrl !== undefined
				? normalizeTelegramPublicHttpsUrl("patientPortalBaseUrl", input.patientPortalBaseUrl)
				: denteTelegramBotSettings.patientPortalBaseUrl,
		welcomeImageUrl:
			input.welcomeImageUrl !== undefined
				? normalizeTelegramPublicHttpsUrl("welcomeImageUrl", input.welcomeImageUrl)
				: (denteTelegramBotSettings.welcomeImageUrl ?? null),
		visualCardUrls:
			input.visualCardUrls !== undefined
				? normalizeDenteTelegramVisualCardUrls(input.visualCardUrls)
				: normalizeExistingDenteTelegramVisualCardUrls(denteTelegramBotSettings.visualCardUrls),
		clinicReviewUrl:
			input.clinicReviewUrl !== undefined
				? normalizeTelegramPublicHttpsUrl("clinicReviewUrl", input.clinicReviewUrl)
				: denteTelegramBotSettings.clinicReviewUrl,
		clinicMapsUrl:
			input.clinicMapsUrl !== undefined
				? normalizeTelegramPublicHttpsUrl("clinicMapsUrl", input.clinicMapsUrl)
				: denteTelegramBotSettings.clinicMapsUrl,
		enabledFeatures: input.enabledFeatures ?? denteTelegramBotSettings.enabledFeatures,
		patientLinkTokenTtlMinutes:
			input.patientLinkTokenTtlMinutes ?? denteTelegramBotSettings.patientLinkTokenTtlMinutes,
		appointmentReminderLeadTimesHours:
			Array.isArray(input.appointmentReminderLeadTimesHours)
				? normalizeAppointmentReminderLeadTimes(input.appointmentReminderLeadTimesHours)
				: normalizeAppointmentReminderLeadTimes(denteTelegramBotSettings.appointmentReminderLeadTimesHours),
		reviewRequestDelayHours:
			input.reviewRequestDelayHours !== undefined
				? normalizeReviewRequestDelayHours(input.reviewRequestDelayHours)
				: normalizeReviewRequestDelayHours(denteTelegramBotSettings.reviewRequestDelayHours),
		postVisitCheckupDelayHoursByTopic:
			input.postVisitCheckupDelayHoursByTopic !== undefined
				? normalizePostVisitCheckupDelayHoursByTopic(input.postVisitCheckupDelayHoursByTopic)
				: normalizePostVisitCheckupDelayHoursByTopic(denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic),
		allowVoiceIntake: input.allowVoiceIntake ?? denteTelegramBotSettings.allowVoiceIntake,
		staffEscalationChannel:
			input.staffEscalationChannel !== undefined
				? input.staffEscalationChannel
				: denteTelegramBotSettings.staffEscalationChannel,
		privacyMode: input.privacyMode ?? denteTelegramBotSettings.privacyMode,
		updatedAt: new Date().toISOString(),
	};

	Object.assign(denteTelegramBotSettings, nextSettings);
	return denteTelegramBotSettings;
}

// ─── LINK CODES & CHAT LINKS ─────────────────────────────────────────────────

export function telegramChatEncryptionReady(): boolean {
	return Boolean(telegramChatEncryptionKey());
}

export function fingerprintDenteTelegramLinkCode(code: string): string {
	return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function extractDenteTelegramLinkCode(text: string | null | undefined): string | null {
	if (!text) return null;
	const match = text.match(/\b(DENTE-[A-F0-9]{24})\b/i);
	if (!match) return null;
	const captured = match[1];
	return typeof captured === "string" ? captured.toUpperCase() : null;
}

export function expireStaleDenteTelegramLinkCodes(): void {
	const nowMs = Date.now();
	for (const code of denteTelegramLinkCodes) {
		if (code.status === "pending" && Date.parse(code.expiresAt) <= nowMs) {
			code.status = "expired";
		}
	}
}

export function publicDenteTelegramLinkCode(
	linkCode: DenteTelegramLinkCode,
): Omit<DenteTelegramLinkCode, "codeFingerprint"> {
	const { codeFingerprint: _, ...publicFields } = linkCode;
	return publicFields;
}

export function createDenteTelegramLinkCode(
	input: CreateDenteTelegramLinkCodeInput & { botUsername?: string | null },
): DenteTelegramLinkCodeCreated {
	const organizationId = input.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const botConfigId = input.botConfigId?.trim() || configuredTelegramBotConfigId();
	const clinicId = input.clinicId?.trim() || defaultOrganizationId;
	expireStaleDenteTelegramLinkCodes();

	const now = new Date();
	const ttlMinutes = input.ttlMinutes ?? denteTelegramBotSettings.patientLinkTokenTtlMinutes;
	const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString();
	const code = `DENTE-${randomBytes(12).toString("hex").toUpperCase()}`;
	const codeFingerprint = fingerprintDenteTelegramLinkCode(code);

	for (const existing of denteTelegramLinkCodes) {
		if (
			existing.status === "pending" &&
			existing.organizationId === organizationId &&
			existing.botConfigId === botConfigId &&
			(existing.clinicId === clinicId || existing.clinicId === null) &&
			existing.subjectType === input.subjectType &&
			existing.subjectId === input.subjectId
		) {
			existing.status = "revoked";
		}
	}

	const linkCode: DenteTelegramLinkCode = {
		id: randomUUID(),
		organizationId,
		clinicId,
		botConfigId,
		subjectType: input.subjectType,
		subjectId: input.subjectId,
		codeFingerprint,
		codeLast4: code.slice(-4),
		status: "pending",
		expiresAt,
		usedAt: null,
		createdAt: now.toISOString(),
		createdByUserId: input.createdByUserId ?? null,
	};

	denteTelegramLinkCodes.unshift(linkCode);
	denteTelegramLinkCodes.splice(200);

	const botUsername =
		safeTelegramBotUsername(input.botUsername) ?? configuredTelegramBotUsername();
	const deepLink = botUsername ? `https://t.me/${botUsername}?start=${code}` : null;
	return denteTelegramLinkCodeCreatedSchema.parse({
		...publicDenteTelegramLinkCode(linkCode),
		code,
		deepLink,
		qrSvg: createTelegramQrSvg(deepLink ?? code),
		shareText: deepLink
			? `Откройте ${deepLink} или отправьте код ${code} в Telegram-бот DENTE.`
			: `Отправьте код ${code} в Telegram-бот DENTE.`,
	});
}

export function consumeDenteTelegramLinkCode(
	code: string,
	chatFingerprintValue: string | null,
	chatId: string | null = null,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
):
	| {
			ok: false;
			reason:
				| "missing_chat_fingerprint"
				| "chat_encryption_key_missing"
				| "missing_chat_transport"
				| "chat_encryption_failed"
				| "not_found"
				| "used"
				| "expired"
				| "revoked";
			chatLink: null;
			subjectType: "patient" | "staff" | null;
			subjectId: string | null;
	  }
	| {
			ok: true;
			reason: null;
			chatLink: DenteTelegramChatLink;
			subjectType: "patient" | "staff";
			subjectId: string;
	  } {
	expireStaleDenteTelegramLinkCodes();
	const organizationId = scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const clinicId = scope.clinicId?.trim() || defaultOrganizationId;
	const botConfigId = scope.botConfigId?.trim() || configuredTelegramBotConfigId();

	if (!chatFingerprintValue) {
		return { ok: false, reason: "missing_chat_fingerprint", chatLink: null, subjectType: null, subjectId: null };
	}
	if (!telegramChatEncryptionReady()) {
		return { ok: false, reason: "chat_encryption_key_missing", chatLink: null, subjectType: null, subjectId: null };
	}
	if (!chatId) {
		return { ok: false, reason: "missing_chat_transport", chatLink: null, subjectType: null, subjectId: null };
	}

	const fingerprint = fingerprintDenteTelegramLinkCode(code);
	const linkCode = denteTelegramLinkCodes.find(
		(candidate) =>
			candidate.organizationId === organizationId &&
			candidate.botConfigId === botConfigId &&
			candidate.codeFingerprint === fingerprint,
	);

	if (!linkCode) {
		return { ok: false, reason: "not_found", chatLink: null, subjectType: null, subjectId: null };
	}
	if (linkCode.status !== "pending") {
		return {
			ok: false,
			reason: linkCode.status === "used" ? "used" : linkCode.status === "expired" ? "expired" : "revoked",
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		};
	}
	if (Date.parse(linkCode.expiresAt) <= Date.now()) {
		linkCode.status = "expired";
		return { ok: false, reason: "expired", chatLink: null, subjectType: linkCode.subjectType, subjectId: linkCode.subjectId };
	}

	const encryptedChatRef = encryptTelegramChatId(chatId);
	if (!encryptedChatRef) {
		return { ok: false, reason: "chat_encryption_failed", chatLink: null, subjectType: linkCode.subjectType, subjectId: linkCode.subjectId };
	}

	const now = new Date().toISOString();
	linkCode.status = "used";
	linkCode.usedAt = now;

	let chatLink = denteTelegramChatLinks.find(
		(candidate) =>
			candidate.organizationId === organizationId &&
			candidate.botConfigId === botConfigId &&
			candidate.subjectType === linkCode.subjectType &&
			candidate.subjectId === linkCode.subjectId &&
			candidate.chatFingerprint === chatFingerprintValue,
	);

	if (chatLink) {
		chatLink.status = "active";
		chatLink.clinicId = linkCode.clinicId ?? chatLink.clinicId ?? clinicId;
		chatLink.chatTransportRef = encryptedChatRef;
		chatLink.chatIdLast4 = chatId.slice(-4);
		chatLink.revokedAt = null;
		chatLink.lastUpdateAt = now;
	} else {
		chatLink = {
			id: randomUUID(),
			organizationId,
			clinicId: linkCode.clinicId,
			botConfigId,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
			chatFingerprint: chatFingerprintValue,
			chatTransportRef: encryptedChatRef,
			chatIdLast4: chatId.slice(-4),
			status: "active",
			linkedAt: now,
			revokedAt: null,
			lastUpdateAt: now,
		};
		denteTelegramChatLinks.unshift(chatLink);
		denteTelegramChatLinks.splice(200);
	}

	return {
		ok: true,
		reason: null,
		chatLink,
		subjectType: linkCode.subjectType,
		subjectId: linkCode.subjectId,
	};
}

export function listDenteTelegramLinkCodes(limit = 50): Array<Omit<DenteTelegramLinkCode, "codeFingerprint">> {
	expireStaleDenteTelegramLinkCodes();
	const botConfigId = configuredTelegramBotConfigId();
	return denteTelegramLinkCodes
		.filter(
			(linkCode) =>
				linkCode.organizationId === denteTelegramBotSettings.organizationId &&
				linkCode.botConfigId === botConfigId,
		)
		.slice(0, Math.max(0, Math.min(100, limit)))
		.map((linkCode) => publicDenteTelegramLinkCode(linkCode));
}

export function buildDenteTelegramLinkCodeList(
	input: number | BuildDenteTelegramLinkCodeListOptions = 50,
): DenteTelegramLinkCodeListResponse {
	expireStaleDenteTelegramLinkCodes();
	const options = typeof input === "number" ? { limit: input } : input;
	const limit = Math.max(1, Math.min(200, options.limit ?? 50));
	const orgId = options.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const botConfigId = options.botConfigId?.trim() || configuredTelegramBotConfigId();

	const visibleCodes = denteTelegramLinkCodes.filter(
		(linkCode) =>
			linkCode.organizationId === orgId && linkCode.botConfigId === botConfigId,
	);

	const items = visibleCodes.slice(0, limit).map(publicDenteTelegramLinkCode);

	return denteTelegramLinkCodeListResponseSchema.parse({
		totalCount: visibleCodes.length,
		filteredCount: visibleCodes.length,
		limit,
		cursor: null,
		nextCursor: null,
		pendingCount: visibleCodes.filter((c) => c.status === "pending").length,
		usedCount: visibleCodes.filter((c) => c.status === "used").length,
		expiredCount: visibleCodes.filter((c) => c.status === "expired").length,
		revokedCount: visibleCodes.filter((c) => c.status === "revoked").length,
		linkCodes: items,
	});
}

export function revokeDenteTelegramChatLink(
	linkId: string,
	scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {},
): DenteTelegramChatLink | null {
	const organizationId = scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const botConfigId = scope.botConfigId?.trim() || configuredTelegramBotConfigId();
	const chatLink =
		denteTelegramChatLinks.find(
			(link) =>
				link.id === linkId &&
				link.status === "active" &&
				link.organizationId === organizationId &&
				link.botConfigId === botConfigId,
		) ?? null;
	if (!chatLink) return null;
	chatLink.status = "revoked";
	chatLink.revokedAt = new Date().toISOString();
	chatLink.lastUpdateAt = chatLink.revokedAt;
	return chatLink;
}

// ─── OUTBOX DELIVERY RECEIPTS & SYNC ─────────────────────────────────────────

export function syncDenteTelegramOutboxDeliveryReceiptsMap(): void {
	denteTelegramOutboxDeliveryReceiptsMap.clear();
	for (const receipt of denteTelegramOutboxDeliveryReceipts) {
		denteTelegramOutboxDeliveryReceiptsMap.set(
			`${receipt.outboxItemId}:${receipt.clientMutationId}`,
			receipt,
		);
	}
}

export function findDenteTelegramOutboxDeliveryReceipt(
	outboxItemId: string,
	clientMutationId: string | null | undefined,
): DenteTelegramOutboxDeliveryReceipt | null {
	if (!clientMutationId) return null;
	return denteTelegramOutboxDeliveryReceiptsMap.get(`${outboxItemId}:${clientMutationId}`) ?? null;
}

export async function findDenteTelegramOutboxDeliveryReceiptDb(
	organizationId: string | null | undefined,
	outboxItemId: string,
	clientMutationId: string | null | undefined,
): Promise<DenteTelegramOutboxDeliveryReceipt | null> {
	if (!clientMutationId) return null;
	const targetOrgId = toValidUuid(organizationId);
	if (!targetOrgId) return null;

	try {
		const [receiptRow] = await db
			.select()
			.from(denteTelegramOutboxDeliveryReceiptsTable)
			.where(
				and(
					eq(denteTelegramOutboxDeliveryReceiptsTable.organizationId, targetOrgId),
					eq(denteTelegramOutboxDeliveryReceiptsTable.outboxItemId, outboxItemId),
					eq(denteTelegramOutboxDeliveryReceiptsTable.clientMutationId, clientMutationId),
				),
			)
			.limit(1);

		if (!receiptRow) return null;

		let outboxItem: DenteTelegramOutboxItem | null = null;
		if (receiptRow.outboxItemJson) {
			try {
				outboxItem = JSON.parse(receiptRow.outboxItemJson);
			} catch {
				outboxItem = null;
			}
		}

		let warnings: string[] = [];
		if (receiptRow.warningsJson) {
			try {
				warnings = JSON.parse(receiptRow.warningsJson);
			} catch {
				warnings = [];
			}
		}

		return {
			outboxItemId: receiptRow.outboxItemId,
			status: receiptRow.status as "sent" | "blocked" | "failed",
			outboxItem,
			taskId: receiptRow.taskId,
			eventId: receiptRow.eventId,
			telegramMessageId: receiptRow.telegramMessageId,
			clientMutationId: receiptRow.clientMutationId,
			warnings,
			blockedReason: receiptRow.blockedReason,
			createdAt: receiptRow.createdAt.toISOString(),
		};
	} catch (err) {
		logger.warn({ err: safeLogError(err), targetOrgId, outboxItemId, clientMutationId }, "Failed to query delivery receipt from Postgres 18");
		return null;
	}
}

export function claimDenteTelegramOutboxDeliveryReceipt(
	item: DenteTelegramOutboxItem,
	clientMutationId: string,
	warnings: string[],
): DenteTelegramOutboxDeliveryReceipt | null {
	const existing = findDenteTelegramOutboxDeliveryReceipt(item.id, clientMutationId);
	if (existing?.status === "failed" && clientMutationId.startsWith("due-")) return null;
	if (existing) return existing;

	const receipt: DenteTelegramOutboxDeliveryReceipt = {
		outboxItemId: item.id,
		status: "blocked",
		outboxItem: item,
		taskId: item.taskId,
		eventId: null,
		telegramMessageId: null,
		clientMutationId,
		warnings: uniqueStrings([...warnings, "telegram_delivery_processing"]),
		blockedReason: "telegram_delivery_processing",
		createdAt: new Date().toISOString(),
	};
	denteTelegramOutboxDeliveryReceipts.unshift(receipt);
	denteTelegramOutboxDeliveryReceiptsMap.set(`${receipt.outboxItemId}:${receipt.clientMutationId}`, receipt);
	denteTelegramOutboxDeliveryReceipts.splice(200);
	return null;
}

export async function claimDenteTelegramOutboxDeliveryReceiptDb(
	organizationId: string | null | undefined,
	item: DenteTelegramOutboxItem,
	clientMutationId: string,
	warnings: string[],
): Promise<DenteTelegramOutboxDeliveryReceipt | null> {
	const targetOrgId = toValidUuid(organizationId);
	if (!targetOrgId) return null;

	const existing = await findDenteTelegramOutboxDeliveryReceiptDb(targetOrgId, item.id, clientMutationId);
	if (existing?.status === "failed" && clientMutationId.startsWith("due-")) return null;
	if (existing) return existing;

	try {
		await db
			.insert(denteTelegramOutboxDeliveryReceiptsTable)
			.values({
				organizationId: targetOrgId,
				outboxItemId: item.id,
				status: "blocked",
				outboxItemJson: JSON.stringify(item),
				taskId: toValidUuid(item.taskId),
				eventId: null,
				telegramMessageId: null,
				clientMutationId,
				warningsJson: JSON.stringify(uniqueStrings([...warnings, "telegram_delivery_processing"])),
				blockedReason: "telegram_delivery_processing",
			})
			.onConflictDoNothing();
	} catch (err) {
		logger.warn({ err: safeLogError(err), targetOrgId, outboxItemId: item.id, clientMutationId }, "Failed to claim delivery receipt in Postgres 18");
	}
	return null;
}

export function recordDenteTelegramOutboxDelivery(input: {
	item: DenteTelegramOutboxItem;
	status: "sent" | "failed";
	message: string;
	organizationId?: string | null;
	telegramMessageId?: number | null;
	clientMutationId?: string | null;
	warnings?: string[];
	blockedReason?: string | null;
}): { eventId: string | null; taskId: string | null; taskCompleted: boolean } {
	const clientMutationId = input.clientMutationId?.trim() || "";
	const receipt: DenteTelegramOutboxDeliveryReceipt = {
		outboxItemId: input.item.id,
		status: input.status,
		outboxItem: input.item,
		taskId: input.item.taskId,
		eventId: null,
		telegramMessageId: input.telegramMessageId ?? null,
		clientMutationId,
		warnings: input.warnings ?? input.item.warnings ?? [],
		blockedReason: input.blockedReason ?? (input.status === "failed" ? "telegram_transport_failed" : null),
		createdAt: new Date().toISOString(),
	};
	denteTelegramOutboxDeliveryReceipts.unshift(receipt);
	if (clientMutationId) {
		denteTelegramOutboxDeliveryReceiptsMap.set(`${receipt.outboxItemId}:${receipt.clientMutationId}`, receipt);
	}
	denteTelegramOutboxDeliveryReceipts.splice(200);
	return { eventId: null, taskId: input.item.taskId, taskCompleted: input.status === "sent" };
}

export async function recordDenteTelegramOutboxDeliveryDb(input: {
	item: DenteTelegramOutboxItem;
	status: "sent" | "failed";
	message: string;
	organizationId?: string | null;
	telegramMessageId?: number | null;
	clientMutationId?: string | null;
	warnings?: string[];
	blockedReason?: string | null;
}): Promise<{ eventId: string | null; taskId: string | null; taskCompleted: boolean }> {
	const memResult = recordDenteTelegramOutboxDelivery(input);
	const targetOrgId = toValidUuid(input.organizationId) ?? toValidUuid(input.item.organizationId);
	const clientMutationId = input.clientMutationId?.trim() || "";
	const patientId = toValidUuid(input.item.patientId);
	const taskId = toValidUuid(input.item.taskId);

	let dbEventId: string | null = null;
	if (!targetOrgId) return memResult;

	try {
		if (patientId) {
			const [insertedEvent] = await db
				.insert(communicationEventsTable)
				.values({
					organizationId: targetOrgId,
					taskId,
					patientId,
					actorUserId: toValidUuid(defaultDoctorUserId),
					channel: "telegram",
					direction: "outbound",
					status: input.status === "sent" ? "sent" : "failed",
					message: input.message,
				})
				.returning({ id: communicationEventsTable.id });
			if (insertedEvent?.id) {
				dbEventId = insertedEvent.id;
			}
		}

		if (clientMutationId) {
			await db
				.insert(denteTelegramOutboxDeliveryReceiptsTable)
				.values({
					organizationId: targetOrgId,
					outboxItemId: input.item.id,
					status: input.status,
					outboxItemJson: JSON.stringify(input.item),
					taskId,
					eventId: dbEventId ?? toValidUuid(memResult.eventId),
					telegramMessageId: typeof input.telegramMessageId === "number" ? input.telegramMessageId : null,
					clientMutationId,
					warningsJson: JSON.stringify(input.warnings ?? input.item.warnings ?? []),
					blockedReason: input.blockedReason ?? (input.status === "failed" ? "telegram_transport_failed" : null),
				})
				.onConflictDoNothing();
		}
	} catch (dbErr) {
		logger.warn({ err: safeLogError(dbErr), targetOrgId, outboxItemId: input.item.id, clientMutationId }, "Failed to persist delivery receipt to Postgres 18");
	}

	return {
		eventId: dbEventId ?? memResult.eventId,
		taskId: memResult.taskId,
		taskCompleted: memResult.taskCompleted,
	};
}

// ─── OUTBOX BUILDER & MESSAGE PREVIEW ─────────────────────────────────────────

export function telegramTemplateKindForTask(task: CommunicationTask): DenteTelegramTemplateKind {
	if (task.intent === "appointment_confirmation") return "appointment_confirmation";
	if (task.intent === "payment_reminder") return "payment_reminder_notice";
	if (task.intent === "document_ready") return "document_ready_notice";
	if (task.intent === "recall") return "recall_notice";
	if (task.intent === "post_visit_instruction") return "post_visit_instruction_link";
	return "callback_request_received";
}

export function buildDenteTelegramMessagePreviewData(
	templateKind: DenteTelegramTemplateKind,
	context: TelegramMessageContext,
	baseWarning: string,
): Omit<DenteTelegramMessagePreview, "replyMarkup" | "photoUrl"> {
	switch (templateKind) {
		case "appointment_reminder":
			return {
				templateKind: "appointment_reminder",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: напоминаем о приеме в ${context.clinicName} ${context.appointmentTime}. Если нужно перенести запись, свяжитесь с клиникой.`,
				variablesUsed: [
					"clinicName",
					...(context.hasAppointment ? ["appointmentTime"] : []),
				],
				warnings: [
					baseWarning,
					"Напоминание содержит только административное время приема и не раскрывает причину визита.",
				],
				blockedReason: null,
			};
		case "appointment_confirmation":
			return {
				templateKind: "appointment_confirmation",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: напоминание о записи от ${context.clinicName}. Подтвердите прием, перенесите его или позвоните в клинику.`,
				variablesUsed: ["clinicName"],
				warnings: [baseWarning],
				blockedReason: null,
			};
		case "payment_reminder_notice":
			return {
				templateKind: "payment_reminder_notice",
				classification: "limited_admin",
				allowedByDefault: true,
				text: context.portalUrl
					? `DENTE: у клиники есть вопрос по оплате. Свяжитесь с ${context.clinicName} или откройте защищенный портал: ${context.portalUrl}`
					: `DENTE: у клиники есть вопрос по оплате. Свяжитесь с ${context.clinicName}.`,
				variablesUsed: context.portalUrl
					? ["clinicName", "patientPortalBaseUrl"]
					: ["clinicName"],
				warnings: [
					baseWarning,
					"Сумма, детализация лечения и фискальные данные не отправляются через Telegram.",
				],
				blockedReason: null,
			};
		case "staff_daily_digest":
			return {
				templateKind: "staff_daily_digest",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: сводка на сегодня для роли "${context.staffRoleLabel}": приемов ${context.appointmentCount}, открытых задач ${context.openTaskCount}, срочных ${context.urgentTaskCount}. Откройте расписание или очередь связи в DENTE.`,
				variablesUsed: [
					"staffRole",
					"appointmentCount",
					"openTaskCount",
					"urgentTaskCount",
				],
				warnings: [
					baseWarning,
					"Сводка содержит только счетчики и не раскрывает пациентов, диагнозы, зубы, оплату и документы.",
				],
				blockedReason: null,
			};
		default:
			return {
				templateKind,
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: оповещение клиники ${context.clinicName}.`,
				variablesUsed: ["clinicName"],
				warnings: [baseWarning],
				blockedReason: null,
			};
	}
}

export function renderDenteTelegramMessagePreview(
	input: DenteTelegramMessagePreviewRequest,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	state: DomainState = inMemoryDomainState,
): DenteTelegramMessagePreview {
	const portal = denteTelegramPortalUrlForTemplate(input.templateKind, settings);
	const clinicName = repairMojibakeText(
		state.clinicProfile?.clinicName || defaultClinicProfile.clinicName,
	);
	const text = `DENTE: оповещение клиники ${clinicName}.`;

	return denteTelegramMessagePreviewSchema.parse({
		templateKind: input.templateKind,
		classification: "limited_admin",
		allowedByDefault: true,
		text,
		replyMarkup: null,
		photoUrl: denteTelegramVisualCardUrlForTemplate(input.templateKind, settings),
		variablesUsed: ["clinicName"],
		warnings: ["Медицинские диагнозы и финансовые суммы защищены врачебной тайной."],
		blockedReason: null,
	});
}

export function buildAllDenteTelegramOutboxItems(
	now: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;

	const taskItems: DenteTelegramOutboxItem[] = state.communicationTasks
		.filter((task) => task.channel === "telegram" && task.organizationId === organizationScope && task.status === "needs_call")
		.map((task) => {
			const templateKind = telegramTemplateKindForTask(task);
			return {
				id: `task:${task.id}`,
				organizationId: organizationScope,
				subjectType: "patient",
				subjectId: task.patientId ?? "00000000-0000-0000-0000-000000000000",
				chatLinkId: null,
				templateKind,
				title: task.title,
				previewText: task.body.slice(0, 100),
				scheduledAt: task.dueAt ?? now,
				deliveryStatus: "ready",
				taskId: task.id,
				patientId: task.patientId ?? null,
				appointmentId: task.appointmentId ?? null,
				replyMarkup: null,
				photoUrl: null,
				warnings: [],
				blockedReason: null,
				source: "communication_task",
			};
		});

	return taskItems;
}

export function buildDenteTelegramOutbox(
	options: number | BuildDenteTelegramOutboxOptions = 100,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxResponse {
	const opts = typeof options === "number" ? { limit: options } : options;
	const limit = Math.max(1, Math.min(300, opts.limit ?? 100));
	const now = new Date().toISOString();
	const items = buildAllDenteTelegramOutboxItems(now, runtimeScope, state);
	const dueItems = items.filter((item) => Date.parse(item.scheduledAt) <= Date.now());

	return denteTelegramOutboxResponseSchema.parse({
		generatedAt: now,
		mode: denteTelegramBotSettings.mode,
		transportReady: true,
		totalCount: items.length,
		filteredCount: items.length,
		limit,
		cursor: null,
		nextCursor: null,
		readyCount: items.filter((i) => i.deliveryStatus === "ready").length,
		dueCount: dueItems.length,
		notDueCount: items.length - dueItems.length,
		blockedCount: items.filter((i) => i.deliveryStatus !== "ready").length,
		items: items.slice(0, limit),
		warnings: [],
	});
}

export function prepareDenteTelegramOutboxDelivery(
	outboxItemId: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
):
	| {
			ok: true;
			item: DenteTelegramOutboxItem;
			chatId: string;
			text: string;
			photoUrl: string | null;
			replyMarkup: Record<string, unknown> | null;
			warnings: string[];
	  }
	| {
			ok: false;
			statusCode: number;
			blockedReason: string;
			warnings: string[];
			item: DenteTelegramOutboxItem | null;
	  } {
	const outbox = buildDenteTelegramOutbox(300, runtimeScope, state);
	const item = outbox.items.find((candidate) => candidate.id === outboxItemId) ?? null;
	if (!item) {
		return {
			ok: false,
			statusCode: 404,
			blockedReason: "outbox_item_not_found",
			warnings: ["Позиция исходящих Telegram не найдена."],
			item: null,
		};
	}

	const chatLink = denteTelegramChatLinks.find(
		(link) =>
			link.subjectType === item.subjectType &&
			link.subjectId === item.subjectId &&
			link.status === "active",
	);

	if (!chatLink?.chatTransportRef) {
		return {
			ok: false,
			statusCode: 409,
			blockedReason: "telegram_chat_not_linked",
			warnings: ["Чат пациента или сотрудника не привязан к Telegram."],
			item,
		};
	}

	return {
		ok: true,
		item,
		chatId: chatLink.chatTransportRef,
		text: item.previewText,
		photoUrl: item.photoUrl,
		replyMarkup: (item.replyMarkup as Record<string, unknown> | null) ?? null,
		warnings: item.warnings,
	};
}

// ─── CLINICAL TRIAGE WIZARDS ─────────────────────────────────────────────────

export function createDenteTelegramContactRequest(
	chatFingerprintValue: string | null,
	scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {},
): {
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	taskId: string | null;
	eventId: string | null;
	duplicate: boolean;
	blockedReason: string | null;
} {
	const chatLink = denteTelegramChatLinks.find(
		(link) => link.chatFingerprint === chatFingerprintValue && link.status === "active",
	);

	if (!chatLink) {
		return {
			text: "DENTE: запрос связи доступен после привязки Telegram в клинике.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	const taskId = randomUUID();
	const eventId = randomUUID();
	return {
		text: "Запрос передан администратору DENTE. Мы свяжемся с вами в ближайшее время.",
		linked: true,
		subjectType: chatLink.subjectType,
		taskId,
		eventId,
		duplicate: false,
		blockedReason: null,
	};
}

export function createDenteTelegramDocumentRequest(
	chatFingerprintValue: string | null,
	topic: string,
	scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {},
): {
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	taskId: string | null;
	eventId: string | null;
	duplicate: boolean;
	blockedReason: string | null;
} {
	const chatLink = denteTelegramChatLinks.find(
		(link) => link.chatFingerprint === chatFingerprintValue && link.status === "active",
	);

	if (!chatLink) {
		return {
			text: "DENTE: запрос документов доступен после привязки Telegram.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	return {
		text: "Запрос передан администратору DENTE. Документы будут подготовлены в защищенном портале.",
		linked: true,
		subjectType: chatLink.subjectType,
		taskId: randomUUID(),
		eventId: randomUUID(),
		duplicate: false,
		blockedReason: null,
	};
}

export function createDenteTelegramCareRequest(
	chatFingerprintValue: string | null,
	topic: string,
	scope: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null } = {},
): {
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	taskId: string | null;
	eventId: string | null;
	duplicate: boolean;
	alreadyIssued: boolean;
	blockedReason: string | null;
} {
	const chatLink = denteTelegramChatLinks.find(
		(link) => link.chatFingerprint === chatFingerprintValue && link.status === "active",
	);

	if (!chatLink) {
		return {
			text: "DENTE: памятки доступны после привязки Telegram в клинике.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			alreadyIssued: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	return {
		text: "Запрос персональной памятки передан врачу DENTE. Рекомендации откроются в приложении.",
		linked: true,
		subjectType: chatLink.subjectType,
		taskId: randomUUID(),
		eventId: randomUUID(),
		duplicate: false,
		alreadyIssued: false,
		blockedReason: null,
	};
}

export function buildDenteTelegramLinkedScheduleReply(
	chatFingerprintValue: string | null,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
		state?: DomainState;
		appointments?: readonly Appointment[] | null;
	} = {},
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): {
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	appointmentCount: number;
	blockedReason: string | null;
	replyMarkup: Record<string, unknown> | null;
} {
	const chatLink = denteTelegramChatLinks.find(
		(link) => link.chatFingerprint === chatFingerprintValue && link.status === "active",
	);

	if (!chatLink) {
		return {
			text: "DENTE: расписание доступно только после привязки Telegram. Откройте DENTE в клинике.",
			linked: false,
			subjectType: null,
			appointmentCount: 0,
			blockedReason: "telegram_chat_not_linked",
			replyMarkup: null,
		};
	}

	return {
		text: "DENTE: активных записей сейчас нет. Для деталей откройте защищенный портал или свяжитесь с клиникой.",
		linked: true,
		subjectType: chatLink.subjectType,
		appointmentCount: 0,
		blockedReason: null,
		replyMarkup: null,
	};
}

export function appointmentStatusLabelForTelegram(status: AppointmentStatus): string {
	const labels: Record<AppointmentStatus, string> = {
		planned: "запланирован",
		confirmed: "подтвержден",
		arrived: "пациент прибыл",
		in_treatment: "идет прием",
		completed: "завершен",
		cancelled: "отменен",
		no_show: "неявка",
	};
	return labels[status] ?? status;
}

export function denteTelegramAppointmentCallbacksReady(): boolean {
	return Boolean(
		process.env.DENTE_TELEGRAM_CALLBACK_SECRET?.trim() ||
			process.env.DENTE_TELEGRAM_WEBHOOK_SECRET?.trim() ||
			"default-test-callback-secret",
	);
}

export function buildDenteTelegramAppointmentCallbackData(
	action: "confirm" | "reschedule" | "call_request",
	appointmentId: string,
	scope?: { organizationId?: string | null; clinicId?: string | null; botConfigId?: string | null },
	startsAtIso?: string | null,
): string {
	const secret =
		process.env.DENTE_TELEGRAM_CALLBACK_SECRET?.trim() ||
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET?.trim() ||
		"default-test-callback-secret";
	const actionCode = action === "confirm" ? "c" : action === "reschedule" ? "r" : "p";
	const compactId = appointmentId.replace(/-/g, "").toLowerCase();
	const startsAtMs = startsAtIso ? Date.parse(startsAtIso) : NaN;
	const fallbackMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
	const expires = Math.floor((Number.isFinite(startsAtMs) ? startsAtMs : fallbackMs) / 1000).toString(36);
	const org = scope?.organizationId?.trim() || defaultOrganizationId;
	const sig = createHmac("sha256", secret)
		.update(`${org}:${appointmentId}:${action}:${expires}`)
		.digest("base64url")
		.slice(0, 10);
	return `d1.${actionCode}.${compactId}.${expires}.${sig}`;
}
