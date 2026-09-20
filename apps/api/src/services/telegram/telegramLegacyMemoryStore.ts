/**
 * telegramLegacyMemoryStore.ts
 *
 * Изолированное in-memory хранилище и логика Telegram-бота (control plane / webhook / outbox).
 * Полностью отвязано от sampleData.ts для устранения утечки 13k-строчного мок-монстра в боевой server.ts.
 */

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	createHmac,
	randomBytes,
	randomUUID,
	timingSafeEqual,
} from "node:crypto";
import type {
	Appointment,
	AppointmentStatus,
	AuditEvent,
	Chair,
	ClinicProfile,
	ClinicScheduleDefaults,
	CommunicationEvent,
	CommunicationTask,
	CommunicationTaskOutcome,
	CommunicationTemplate,
	CompleteCommunicationTaskInput,
	CreateDenteTelegramLinkCodeInput,
	DenteTelegramBotSettings,
	DenteTelegramChatLink,
	DenteTelegramChatLinkListResponse,
	DenteTelegramChatLinkStatus,
	DenteTelegramLinkCode,
	DenteTelegramLinkCodeCreated,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramLinkCodeStatus,
	DenteTelegramMessagePreview,
	DenteTelegramMessagePreviewRequest,
	DenteTelegramOutboxDeliveryReceipt,
	DenteTelegramOutboxDeliveryStatus,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
	DenteTelegramTemplateKind,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
	DenteTelegramWebhookEvent,
	DocumentKind,
	GeneratedDocument,
	Patient,
	Payment,
	PostVisitCareTopic,
	StaffMember,
	StaffRole,
	TreatmentPlanItem,
	UpdateDenteTelegramBotSettingsInput,
	Visit,
} from "@dental/shared";
import {
	denteTelegramChatLinkListResponseSchema,
	denteTelegramChatLinkPublicSchema,
	denteTelegramLinkCodeCreatedSchema,
	denteTelegramLinkCodeListResponseSchema,
	denteTelegramMessagePreviewSchema,
	denteTelegramOutboxResponseSchema,
} from "@dental/shared";
import {
	buildPatientLedger,
	debtNumericText,
	type Kopecks,
	MoneyPrecisionError,
	patientAccountBalanceKopecks,
	patientOwesClinicKopecks,
	QuantityContractError,
} from "../../money/patientDebt.js";
import { createTelegramQrSvg } from "../../telegramQr.js";
import {
	repairMojibakeDeep,
	repairMojibakeText,
} from "../../text/repairMojibake.js";
import type { DomainState } from "../../types/domainState.js";
export type { DomainState };

const nowIso = new Date().toISOString();
const organizationId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const doctorUserId = "8356141b-7cfa-4221-95f7-70f47e7344b1";
const marinaPatientId = "3ebb4567-7777-4f19-8c23-2a78c9962796";
const defaultClinicTimezone = "Europe/Samara";
const appointmentReminderDispatchGraceMs = 2 * 60 * 60 * 1000;
const defaultClinicScheduleDefaults: ClinicScheduleDefaults = {
	workdayStart: "09:00",
	workdayEnd: "18:00",
	workingDays: [1, 2, 3, 4, 5],
	appointmentBufferMinutes: 10,
};

const defaultPostVisitCheckupDelayHoursByTopic = {
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
};

export const inMemoryPatients: Patient[] = [
	{
		id: "3ebb4567-7777-4f19-8c23-2a78c9962796",
		organizationId,
		status: "active",
		fullName: "Иванова Марина Сергеевна",
		birthDate: "1988-04-21",
		gender: "female",
		phone: "+7 927 111-22-33",
		email: null,
		notes: "",
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: null,
		balanceRub: 0,
		createdAt: "2026-03-01T00:00:00.000Z",
		updatedAt: "2026-03-01T00:00:00.000Z",
	},
];
export const inMemoryAppointments: Appointment[] = [];
export const inMemoryChairs: Chair[] = [];
export const inMemoryStaffMembers: StaffMember[] = [];
export const inMemoryTreatmentPlanItems: TreatmentPlanItem[] = [];
export const inMemoryPayments: Payment[] = [];
export const inMemoryDocuments: GeneratedDocument[] = [];
export const inMemoryCommunicationTasks: CommunicationTask[] = [];
export const inMemoryCommunicationEvents: CommunicationEvent[] = [];
export const inMemoryAuditEvents: AuditEvent[] = [];

export const inMemoryClinicProfile: ClinicProfile = {
	organizationId,
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
	updatedAt: nowIso,
};

export const inMemoryActiveVisit: Visit = {
	id: "00000000-0000-0000-0000-000000000000",
	organizationId,
	patientId: "00000000-0000-0000-0000-000000000000",
	appointmentId: "00000000-0000-0000-0000-000000000000",
	status: "draft",
	revision: 1,
	complaint: null,
	anamnesis: null,
	objectiveStatus: null,
	diagnosis: null,
	treatmentPlan: null,
	doctorSummary: null,
	createdAt: nowIso,
	updatedAt: nowIso,
};

export const inMemoryDomainState: DomainState = {
	clinicProfile: inMemoryClinicProfile,
	staffMembers: inMemoryStaffMembers,
	chairs: inMemoryChairs,
	patients: inMemoryPatients,
	appointments: inMemoryAppointments,
	activeVisit: inMemoryActiveVisit,
	documents: inMemoryDocuments,
	serviceCatalog: [],
	treatmentPlanItems: inMemoryTreatmentPlanItems,
	treatmentPlanScenarios: [],
	clinicalRules: [],
	payments: inMemoryPayments,
	communicationTemplates: [],
	communicationTasks: inMemoryCommunicationTasks,
	communicationEvents: inMemoryCommunicationEvents,
	imagingStudies: [],
	aiRecognitionJobs: [],
	importBatches: [],
	protocolTemplates: [],
	auditEvents: inMemoryAuditEvents,
	unavailableSlices: [],
};

const patients = inMemoryPatients;
const appointments = inMemoryAppointments;
const staffMembers = inMemoryStaffMembers;
const clinicProfile = inMemoryClinicProfile;
const documents = inMemoryDocuments;
const communicationTasks = inMemoryCommunicationTasks;
const communicationEvents = inMemoryCommunicationEvents;
const auditEvents = inMemoryAuditEvents;
const activeVisit = inMemoryActiveVisit;

function persistMutableState(): void {
	// In-memory legacy store: no persistent disk mutations
}

const appointmentTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function getAppointmentTimeFormatter(timeZone: string): Intl.DateTimeFormat {
	const cached = appointmentTimeFormatters.get(timeZone);
	if (cached) return cached;
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
	appointmentTimeFormatters.set(timeZone, formatter);
	return formatter;
}

export function validScheduleTimeZone(value: string | null | undefined): string {
	const timeZone = value?.trim() || defaultClinicTimezone;
	try {
		getAppointmentTimeFormatter(timeZone);
		return timeZone;
	} catch {
		return defaultClinicTimezone;
	}
}

function appointmentClinicDateKey(
	value: string,
	sourceTimeZone?: string,
	state: DomainState = inMemoryDomainState,
): string {
	sourceTimeZone ??= state.clinicProfile.timezone;
	const date = new Date(value);
	const fallbackDateKey = value.slice(0, 10) || nowIso.slice(0, 10);
	if (Number.isNaN(date.getTime())) return fallbackDateKey;

	const timeZone = validScheduleTimeZone(sourceTimeZone);
	const formatter = getAppointmentTimeFormatter(timeZone);
	const parts = formatter.formatToParts(date);
	const year = parts.find((part) => part.type === "year")?.value;
	const month = parts.find((part) => part.type === "month")?.value;
	const day = parts.find((part) => part.type === "day")?.value;
	if (year && month && day) {
		return `${year}-${month}-${day}`;
	}
	return fallbackDateKey;
}

function getServiceCatalogItem(
	serviceId: string,
	state: DomainState = inMemoryDomainState,
) {
	return state.serviceCatalog.find((item) => item.id === serviceId);
}

function findVisitById(visitId: string): Visit | null {
	return inMemoryActiveVisit.id === visitId ? inMemoryActiveVisit : null;
}

function isOpenCommunicationTask(task: CommunicationTask): boolean {
	return !["completed", "failed", "skipped"].includes(task.status);
}

function uniqueStrings(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean)));
}

function recordAuditEvent(input: {
	organizationId?: string | null | undefined;
	actorUserId?: string | null | undefined;
	entityType: string;
	entityId: string;
	action: string;
	reason?: string | null | undefined;
}) {
	inMemoryAuditEvents.unshift({
		id: randomUUID(),
		organizationId: input.organizationId?.trim() || organizationId,
		actorUserId: input.actorUserId ?? null,
		entityType: input.entityType,
		entityId: input.entityId,
		action: input.action,
		reason: input.reason ?? null,
		createdAt: new Date().toISOString(),
	});
}

function normalizePostVisitCheckupDelayHoursByTopic(
	input: unknown,
): DenteTelegramBotSettings["postVisitCheckupDelayHoursByTopic"] {
	const source =
		input && typeof input === "object" && !Array.isArray(input)
			? (input as Partial<
					Record<keyof typeof defaultPostVisitCheckupDelayHoursByTopic, unknown>
				>)
			: {};
	const normalized = { ...defaultPostVisitCheckupDelayHoursByTopic };
	for (const key of Object.keys(
		defaultPostVisitCheckupDelayHoursByTopic,
	) as Array<keyof typeof defaultPostVisitCheckupDelayHoursByTopic>) {
		const parsed =
			typeof source[key] === "number"
				? source[key]
				: typeof source[key] === "string"
					? Number.parseInt(source[key], 10)
					: Number.NaN;
		if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 168) {
			normalized[key] = Math.floor(parsed);
		}
	}
	return normalized;
}


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
	},
	allowVoiceIntake: false,
	staffEscalationChannel: null,
	privacyMode: "no_phi_by_default",
	updatedAt: nowIso,
};

export const denteTelegramWebhookEvents: DenteTelegramWebhookEvent[] = [];

export const denteTelegramOutboxDeliveryReceipts: DenteTelegramOutboxDeliveryReceipt[] =
	[];

export const denteTelegramOutboxDeliveryReceiptsMap = new Map<
	string,
	DenteTelegramOutboxDeliveryReceipt
>();

export function syncDenteTelegramOutboxDeliveryReceiptsMap(): void {
	denteTelegramOutboxDeliveryReceiptsMap.clear();
	for (let i = denteTelegramOutboxDeliveryReceipts.length - 1; i >= 0; i--) {
		const receipt = denteTelegramOutboxDeliveryReceipts[i];
		if (receipt?.clientMutationId) {
			denteTelegramOutboxDeliveryReceiptsMap.set(
				`${receipt.outboxItemId}:${receipt.clientMutationId}`,
				receipt,
			);
		}
	}
}

export const denteTelegramLinkCodes: DenteTelegramLinkCode[] = [];

export const denteTelegramChatLinks: DenteTelegramChatLink[] = [];

export function getDenteTelegramBotSettings(): DenteTelegramBotSettings {
	return denteTelegramBotSettings;
}

function normalizeAppointmentReminderLeadTimes(
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

const telegramPublicUrlSensitiveQueryKeys = new Set([
	"patient",
	"patientid",
	"patient_id",
	"pid",
	"fio",
	"name",
	"phone",
	"tel",
	"email",
	"inn",
	"snils",
	"passport",
	"visit",
	"visitid",
	"visit_id",
	"appointment",
	"appointmentid",
	"appointment_id",
	"document",
	"documentid",
	"document_id",
	"doc",
	"diagnosis",
	"tooth",
	"treatment",
	"payment",
	"receipt",
	"order",
	"token",
	"code",
]);

const telegramPublicUrlSensitivePathSegments = new Set([
	"patient",
	"patients",
	"person",
	"people",
	"visit",
	"visits",
	"appointment",
	"appointments",
	"document",
	"documents",
	"medical-record",
	"medical-records",
	"record",
	"records",
	"tax",
	"payment",
	"payments",
	"receipt",
	"receipts",
	"order",
	"orders",
	"token",
	"code",
	"passport",
	"snils",
	"inn",
]);

function assertTelegramPublicUrlPathIsSafe(
	fieldName: string,
	parsed: URL,
): void {
	const segments = parsed.pathname
		.split("/")
		.map((segment) => {
			try {
				return decodeURIComponent(segment).trim().toLowerCase();
			} catch {
				throw new Error(`${fieldName}: invalid_path_encoding`);
			}
		})
		.filter(Boolean);
	for (const segment of segments) {
		const compactDigits = segment.replace(/\D/g, "");
		if (telegramPublicUrlSensitivePathSegments.has(segment)) {
			throw new Error(
				`${fieldName}: patient_identifying_path_not_allowed:${segment}`,
			);
		}
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				segment,
			)
		) {
			throw new Error(
				`${fieldName}: patient_identifying_path_value_not_allowed`,
			);
		}
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(segment)) {
			throw new Error(
				`${fieldName}: patient_identifying_path_value_not_allowed`,
			);
		}
	}
}

function normalizeTelegramBotUsername(
	value: string | null | undefined,
): string | null {
	const normalized = value?.trim().replace(/^@/, "") ?? "";
	if (!normalized) return null;
	if (!/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)) {
		throw new Error(
			"Имя Telegram-бота должно содержать 5-32 символа: буквы, цифры, подчёркивания и окончание bot.",
		);
	}
	return normalized;
}

function safeTelegramBotUsername(
	value: string | null | undefined,
): string | null {
	try {
		return normalizeTelegramBotUsername(value);
	} catch {
		return null;
	}
}

function normalizeTelegramPublicHttpsUrl(
	fieldName: string,
	value: string | null | undefined,
): string | null {
	const raw = value?.trim();
	if (!raw) return null;

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error(`${fieldName}: invalid_url`);
	}

	if (parsed.protocol !== "https:") {
		throw new Error(`${fieldName}: https_required`);
	}
	if (parsed.username || parsed.password) {
		throw new Error(`${fieldName}: credentials_not_allowed`);
	}

	assertTelegramPublicUrlPathIsSafe(fieldName, parsed);

	const sensitiveKeys = Array.from(parsed.searchParams.keys()).filter((key) =>
		telegramPublicUrlSensitiveQueryKeys.has(key.trim().toLowerCase()),
	);
	if (sensitiveKeys.length) {
		throw new Error(
			`${fieldName}: patient_identifying_query_not_allowed:${sensitiveKeys.join(",")}`,
		);
	}

	for (const valuePart of parsed.searchParams.values()) {
		const compact = valuePart.replace(/\D/g, "");
		if (compact.length >= 10 || /\b\d{12}\b/.test(valuePart)) {
			throw new Error(
				`${fieldName}: patient_identifying_query_value_not_allowed`,
			);
		}
	}

	parsed.hash = "";
	return parsed.toString();
}

export function safeDenteTelegramPublicHttpsUrl(
	fieldName: string,
	value: string | null | undefined,
): string | null {
	try {
		return normalizeTelegramPublicHttpsUrl(fieldName, value);
	} catch {
		return null;
	}
}

const defaultDenteTelegramVisualCardUrls: DenteTelegramVisualCardUrls = {
	mainMenu: null,
	appointment: null,
	documents: null,
	tax: null,
	billing: null,
	care: null,
	review: null,
	staff: null,
};

function normalizeDenteTelegramVisualCardUrls(
	input: unknown,
): DenteTelegramVisualCardUrls {
	const source =
		input && typeof input === "object" && !Array.isArray(input)
			? (input as Partial<Record<DenteTelegramVisualCardKey, unknown>>)
			: {};
	return {
		mainMenu: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.mainMenu",
			typeof source.mainMenu === "string" ? source.mainMenu : null,
		),
		appointment: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.appointment",
			typeof source.appointment === "string" ? source.appointment : null,
		),
		documents: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.documents",
			typeof source.documents === "string" ? source.documents : null,
		),
		tax: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.tax",
			typeof source.tax === "string" ? source.tax : null,
		),
		billing: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.billing",
			typeof source.billing === "string" ? source.billing : null,
		),
		care: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.care",
			typeof source.care === "string" ? source.care : null,
		),
		review: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.review",
			typeof source.review === "string" ? source.review : null,
		),
		staff: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.staff",
			typeof source.staff === "string" ? source.staff : null,
		),
	};
}

export function normalizeExistingDenteTelegramVisualCardUrls(
	input: unknown,
): DenteTelegramVisualCardUrls {
	try {
		return normalizeDenteTelegramVisualCardUrls(input);
	} catch {
		return defaultDenteTelegramVisualCardUrls;
	}
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

function configuredTelegramBotConfigId(): string {
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

function safeHttpsUrl(value: string | null | undefined): string | null {
	try {
		return normalizeTelegramPublicHttpsUrl("telegramPublicUrl", value);
	} catch {
		return null;
	}
}

export function denteTelegramVisualCardUrlFor(
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	cardKey: DenteTelegramVisualCardKey = "mainMenu",
): string | null {
	return (
		safeHttpsUrl(settings.visualCardUrls?.[cardKey]) ??
		safeHttpsUrl(settings.welcomeImageUrl)
	);
}

function denteTelegramVisualCardKeyForTemplate(
	templateKind: DenteTelegramTemplateKind,
): DenteTelegramVisualCardKey {
	if (
		templateKind === "appointment_reminder" ||
		templateKind === "appointment_confirmation"
	)
		return "appointment";
	if (templateKind === "document_ready_notice") return "documents";
	if (templateKind === "tax_document_request_status") return "tax";
	if (templateKind === "payment_reminder_notice") return "billing";
	if (
		templateKind === "post_visit_instruction_link" ||
		templateKind === "post_visit_checkup"
	)
		return "care";
	if (templateKind === "recall_notice") return "care";
	if (templateKind === "review_request") return "review";
	if (templateKind === "staff_daily_digest") return "staff";
	return "mainMenu";
}

function denteTelegramVisualCardUrlForTemplate(
	templateKind: DenteTelegramTemplateKind,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string | null {
	return denteTelegramVisualCardUrlFor(
		settings,
		denteTelegramVisualCardKeyForTemplate(templateKind),
	);
}

type DenteTelegramPortalSection =
	| "home"
	| "documents"
	| "tax"
	| "care"
	| "schedule"
	| "billing";

export type DenteTelegramOutboxRuntimeScope = {
	settings: DenteTelegramBotSettings;
	botTokenConfigured?: boolean;
	botConfigId?: string | null;
	clinicId?: string | null;
};

type ResolvedDenteTelegramOutboxRuntimeScope = {
	settings: DenteTelegramBotSettings;
	botTokenConfigured: boolean;
	botConfigId: string;
	clinicId: string;
};

function resolveDenteTelegramOutboxRuntimeScope(
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

function denteTelegramPortalSectionForTemplate(
	templateKind: DenteTelegramTemplateKind,
): DenteTelegramPortalSection {
	if (templateKind === "document_ready_notice") return "documents";
	if (templateKind === "tax_document_request_status") return "tax";
	if (templateKind === "payment_reminder_notice") return "billing";
	if (
		templateKind === "post_visit_instruction_link" ||
		templateKind === "post_visit_checkup"
	)
		return "care";
	if (
		templateKind === "recall_notice" ||
		templateKind === "appointment_reminder" ||
		templateKind === "appointment_confirmation"
	)
		return "schedule";
	return "home";
}

function denteTelegramPortalUrlForSection(
	section: DenteTelegramPortalSection,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string | null {
	const portal = safeHttpsUrl(settings.patientPortalBaseUrl);
	if (!portal) return null;
	try {
		const url = new URL(portal);
		url.search = "";
		url.searchParams.set("dente_source", "telegram");
		url.searchParams.set("dente_section", section);
		url.hash = "";
		return url.toString();
	} catch {
		return null;
	}
}

function denteTelegramPortalUrlForTemplate(
	templateKind: DenteTelegramTemplateKind,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string | null {
	return denteTelegramPortalUrlForSection(
		denteTelegramPortalSectionForTemplate(templateKind),
		settings,
	);
}

function denteTelegramPortalRowForTemplate(
	templateKind: DenteTelegramTemplateKind,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): Array<{ text: string; url: string }> {
	const portal = denteTelegramPortalUrlForTemplate(templateKind, settings);
	return portal ? [{ text: "Открыть DENTE", url: portal }] : [];
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

function telegramChatEncryptionKey(): Buffer | null {
	const raw = process.env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY?.trim();
	if (!raw) return null;
	const base64Candidate = /^[A-Za-z0-9+/=]{43,88}$/.test(raw)
		? Buffer.from(raw, "base64")
		: null;
	if (base64Candidate?.length === 32) return base64Candidate;
	const hexCandidate = /^[a-fA-F0-9]{64}$/.test(raw)
		? Buffer.from(raw, "hex")
		: null;
	if (hexCandidate?.length === 32) return hexCandidate;
	return createHash("sha256").update(raw).digest();
}

function encryptTelegramChatId(chatId: string | null): string | null {
	if (!chatId) return null;
	const key = telegramChatEncryptionKey();
	if (!key) return null;
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([
		cipher.update(chatId, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptTelegramChatTransportRef(
	chatTransportRef: string | null | undefined,
): string | null {
	if (!chatTransportRef) return null;
	const key = telegramChatEncryptionKey();
	if (!key) return null;
	const [version, ivRaw, tagRaw, encryptedRaw] = chatTransportRef.split(".");
	if (version !== "v1" || !ivRaw || !tagRaw || !encryptedRaw) return null;
	try {
		const decipher = createDecipheriv(
			"aes-256-gcm",
			key,
			Buffer.from(ivRaw, "base64url"),
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			{ authTagLength: 16 } as any,
		);
		decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
		return Buffer.concat([
			decipher.update(Buffer.from(encryptedRaw, "base64url")),
			decipher.final(),
		]).toString("utf8");
	} catch {
		return null;
	}
}

function telegramChatEncryptionReady(): boolean {
	return Boolean(telegramChatEncryptionKey());
}

function chatIdLast4(chatId: string | null): string | null {
	const normalized = chatId?.trim();
	return normalized ? normalized.slice(-4) : null;
}

function normalizeDenteTelegramLinkCode(code: string): string {
	return code.trim().toUpperCase().replace(/\s+/g, "");
}

function fingerprintDenteTelegramLinkCode(code: string): string {
	const salt =
		process.env.DENTE_TELEGRAM_LINK_CODE_SALT?.trim() ||
		denteTelegramBotSettings.organizationId;
	return createHash("sha256")
		.update(`${salt}:${normalizeDenteTelegramLinkCode(code)}`)
		.digest("hex");
}

function expireStaleDenteTelegramLinkCodes(now = new Date()): void {
	let changed = false;
	for (const code of denteTelegramLinkCodes) {
		if (
			code.status === "pending" &&
			Date.parse(code.expiresAt) <= now.getTime()
		) {
			code.status = "expired";
			changed = true;
		}
	}
	if (changed) persistMutableState();
}

function validateDenteTelegramSubject(
	subjectType: "patient" | "staff",
	subjectId: string,
	organizationScope: string,
): void {
	const subject =
		subjectType === "patient"
			? patients.find(
					(patient) =>
						patient.organizationId === organizationScope &&
						patient.id === subjectId,
				)
			: staffMembers.find(
					(staff) =>
						staff.organizationId === organizationScope &&
						staff.id === subjectId,
				);
	if (!subject) {
		throw new Error(`Субъект привязки Telegram не найден: ${subjectType}.`);
	}
	if (
		subjectType === "patient" &&
		"status" in subject &&
		subject.status !== "active"
	) {
		throw new Error("Telegram можно привязать только к активному пациенту.");
	}
	if (subjectType === "staff" && "active" in subject && !subject.active) {
		throw new Error(
			"Telegram можно привязать только к активному сотруднику клиники.",
		);
	}
}

function resolveDenteTelegramClinicId(
	inputClinicId: string | null | undefined,
	organizationScope: string,
): string {
	return (
		inputClinicId?.trim() ||
		(organizationScope === clinicProfile.organizationId
			? clinicProfile.organizationId
			: organizationScope)
	);
}

function publicDenteTelegramLinkCode(
	code: DenteTelegramLinkCode,
): Omit<DenteTelegramLinkCode, "codeFingerprint"> {
	const { codeFingerprint: _codeFingerprint, ...publicCode } = code;
	return publicCode;
}

export function extractDenteTelegramLinkCode(
	text: string | null,
): string | null {
	if (!text) return null;
	const match = text
		.toUpperCase()
		.match(/\bDENTE-(?:[A-F0-9]{24}|[A-F0-9]{8})\b/);
	return match ? normalizeDenteTelegramLinkCode(match[0]) : null;
}

export type DenteTelegramLinkCodeListStatusFilter =
	| DenteTelegramLinkCodeStatus
	| "all";

export type DenteTelegramChatLinkListStatusFilter =
	| DenteTelegramChatLinkStatus
	| "all";

export type BuildDenteTelegramLinkCodeListOptions = {
	limit?: number;
	cursor?: string | null;
	status?: DenteTelegramLinkCodeListStatusFilter;
	subjectType?: "patient" | "staff" | "all";
	subjectId?: string | null;
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
};

export type BuildDenteTelegramChatLinkListOptions = {
	limit?: number;
	cursor?: string | null;
	status?: DenteTelegramChatLinkListStatusFilter;
	subjectType?: "patient" | "staff" | "all";
	subjectId?: string | null;
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
};

type NormalizedDenteTelegramLedgerOptions<TStatus extends string> = {
	limit: number;
	cursor: string;
	status: TStatus;
	subjectType: "patient" | "staff" | "all";
	subjectId: string | null;
	organizationId: string;
	clinicId: string;
	botConfigId: string;
};

function normalizeDenteTelegramLedgerOptions<TStatus extends string>(
	input:
		| number
		| {
				limit?: number;
				cursor?: string | null;
				status?: TStatus;
				subjectType?: "patient" | "staff" | "all";
				subjectId?: string | null;
				organizationId?: string | null;
				clinicId?: string | null;
				botConfigId?: string | null;
		  },
	fallbackStatus: TStatus,
): NormalizedDenteTelegramLedgerOptions<TStatus> {
	const source = typeof input === "number" ? { limit: input } : input;
	const parsedLimit = Number(source.limit ?? 50);
	const limit = Number.isFinite(parsedLimit)
		? Math.max(1, Math.min(200, Math.trunc(parsedLimit)))
		: 50;
	const parsedCursor = Number.parseInt(source.cursor ?? "0", 10);
	const cursor = String(
		Math.max(0, Number.isFinite(parsedCursor) ? parsedCursor : 0),
	);
	return {
		limit,
		cursor,
		status: source.status ?? fallbackStatus,
		subjectType: source.subjectType ?? "all",
		subjectId: source.subjectId?.trim() || null,
		organizationId:
			source.organizationId?.trim() || denteTelegramBotSettings.organizationId,
		clinicId: source.clinicId?.trim() || clinicProfile.organizationId,
		botConfigId: source.botConfigId?.trim() || configuredTelegramBotConfigId(),
	};
}

export function createDenteTelegramLinkCode(
	input: CreateDenteTelegramLinkCodeInput & { botUsername?: string | null },
): DenteTelegramLinkCodeCreated {
	if (!telegramChatEncryptionReady()) {
		throw new Error(
			"Защищенная связка Telegram-чата не настроена; одноразовые коды Telegram нельзя выпускать.",
		);
	}
	const organizationId =
		input.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	validateDenteTelegramSubject(
		input.subjectType,
		input.subjectId,
		organizationId,
	);
	const botConfigId =
		input.botConfigId?.trim() || configuredTelegramBotConfigId();
	const clinicId = resolveDenteTelegramClinicId(input.clinicId, organizationId);
	expireStaleDenteTelegramLinkCodes();

	const now = new Date();
	const ttlMinutes =
		input.ttlMinutes ?? denteTelegramBotSettings.patientLinkTokenTtlMinutes;
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
	persistMutableState();

	const botUsername =
		safeTelegramBotUsername(input.botUsername) ??
		configuredTelegramBotUsername();
	const deepLink = botUsername
		? `https://t.me/${botUsername}?start=${code}`
		: null;
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
) {
	expireStaleDenteTelegramLinkCodes();
	const organizationId =
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const clinicId = scope.clinicId?.trim() || clinicProfile.organizationId;
	const botConfigId =
		scope.botConfigId?.trim() || configuredTelegramBotConfigId();
	if (!chatFingerprintValue) {
		return {
			ok: false,
			reason: "missing_chat_fingerprint",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}
	if (!telegramChatEncryptionReady()) {
		return {
			ok: false,
			reason: "chat_encryption_key_missing",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}
	if (!chatId) {
		return {
			ok: false,
			reason: "missing_chat_transport",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}

	const fingerprint = fingerprintDenteTelegramLinkCode(code);
	const linkCode = denteTelegramLinkCodes.find(
		(candidate) =>
			candidate.organizationId === organizationId &&
			candidate.botConfigId === botConfigId &&
			candidate.codeFingerprint === fingerprint,
	);

	if (!linkCode) {
		return {
			ok: false,
			reason: "not_found",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}
	if (linkCode.clinicId && linkCode.clinicId !== clinicId) {
		return {
			ok: false,
			reason: "not_found",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}
	if (linkCode.status !== "pending") {
		return {
			ok: false,
			reason: linkCode.status,
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		} as const;
	}
	if (Date.parse(linkCode.expiresAt) <= Date.now()) {
		linkCode.status = "expired";
		persistMutableState();
		return {
			ok: false,
			reason: "expired",
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		} as const;
	}

	const now = new Date().toISOString();
	const encryptedChatRef = encryptTelegramChatId(chatId);
	if (!encryptedChatRef) {
		return {
			ok: false,
			reason: "chat_encryption_failed",
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		} as const;
	}
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

	for (const candidate of denteTelegramChatLinks) {
		if (
			candidate.organizationId === organizationId &&
			candidate.botConfigId === botConfigId &&
			candidate.subjectType === linkCode.subjectType &&
			candidate.subjectId === linkCode.subjectId &&
			candidate.status === "active" &&
			candidate.chatFingerprint !== chatFingerprintValue
		) {
			candidate.status = "revoked";
			candidate.revokedAt = now;
			candidate.lastUpdateAt = now;
		}
	}

	if (chatLink) {
		chatLink.status = "active";
		chatLink.clinicId = linkCode.clinicId ?? chatLink.clinicId ?? clinicId;
		chatLink.botConfigId = botConfigId;
		chatLink.chatTransportRef =
			encryptedChatRef ?? chatLink.chatTransportRef ?? null;
		chatLink.chatIdLast4 = chatIdLast4(chatId) ?? chatLink.chatIdLast4 ?? null;
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
			chatIdLast4: chatIdLast4(chatId),
			status: "active",
			linkedAt: now,
			revokedAt: null,
			lastUpdateAt: now,
		};
		denteTelegramChatLinks.unshift(chatLink);
		denteTelegramChatLinks.splice(200);
	}

	persistMutableState();
	return {
		ok: true,
		reason: null,
		chatLink,
		subjectType: linkCode.subjectType,
		subjectId: linkCode.subjectId,
	} as const;
}

export function listDenteTelegramLinkCodes(
	limit = 50,
): Array<Omit<DenteTelegramLinkCode, "codeFingerprint">> {
	expireStaleDenteTelegramLinkCodes();
	const currentClinicId = clinicProfile.organizationId;
	const botConfigId = configuredTelegramBotConfigId();
	return denteTelegramLinkCodes
		.filter(
			(linkCode) =>
				linkCode.organizationId === denteTelegramBotSettings.organizationId &&
				linkCode.botConfigId === botConfigId &&
				(linkCode.clinicId === currentClinicId || linkCode.clinicId === null),
		)
		.slice(0, Math.max(0, Math.min(100, limit)))
		.map((linkCode) => publicDenteTelegramLinkCode(linkCode));
}

export function buildDenteTelegramLinkCodeList(
	input: number | BuildDenteTelegramLinkCodeListOptions = 50,
): DenteTelegramLinkCodeListResponse {
	expireStaleDenteTelegramLinkCodes();
	const options =
		normalizeDenteTelegramLedgerOptions<DenteTelegramLinkCodeListStatusFilter>(
			input,
			"all",
		);
	const currentClinicId = options.clinicId;
	const visibleCodes = denteTelegramLinkCodes.filter(
		(linkCode) =>
			linkCode.organizationId === options.organizationId &&
			linkCode.botConfigId === options.botConfigId &&
			(linkCode.clinicId === currentClinicId || linkCode.clinicId === null),
	);
	const filteredCodes = visibleCodes.filter((linkCode) => {
		if (options.status !== "all" && linkCode.status !== options.status)
			return false;
		if (
			options.subjectType !== "all" &&
			linkCode.subjectType !== options.subjectType
		)
			return false;
		if (options.subjectId && linkCode.subjectId !== options.subjectId)
			return false;
		return true;
	});
	const offset = Number.parseInt(options.cursor, 10);
	const start = Math.max(0, Number.isFinite(offset) ? offset : 0);
	const items = filteredCodes
		.slice(start, start + options.limit)
		.map((linkCode) => publicDenteTelegramLinkCode(linkCode));
	const nextOffset = start + items.length;
	return denteTelegramLinkCodeListResponseSchema.parse({
		totalCount: visibleCodes.length,
		filteredCount: filteredCodes.length,
		limit: options.limit,
		cursor: options.cursor === "0" ? null : options.cursor,
		nextCursor: nextOffset < filteredCodes.length ? String(nextOffset) : null,
		pendingCount: visibleCodes.filter(
			(linkCode) => linkCode.status === "pending",
		).length,
		usedCount: visibleCodes.filter((linkCode) => linkCode.status === "used")
			.length,
		expiredCount: visibleCodes.filter(
			(linkCode) => linkCode.status === "expired",
		).length,
		revokedCount: visibleCodes.filter(
			(linkCode) => linkCode.status === "revoked",
		).length,
		linkCodes: items,
	});
}

function _listDenteTelegramChatLinks(limit = 50): DenteTelegramChatLink[] {
	const currentClinicId = clinicProfile.organizationId;
	const botConfigId = configuredTelegramBotConfigId();
	return denteTelegramChatLinks
		.filter(
			(link) =>
				link.organizationId === denteTelegramBotSettings.organizationId &&
				link.botConfigId === botConfigId &&
				(link.clinicId === currentClinicId || link.clinicId === null),
		)
		.slice(0, Math.max(0, Math.min(100, limit)));
}

function _buildDenteTelegramChatLinkList(
	input: number | BuildDenteTelegramChatLinkListOptions = 50,
): DenteTelegramChatLinkListResponse {
	const options =
		normalizeDenteTelegramLedgerOptions<DenteTelegramChatLinkListStatusFilter>(
			input,
			"all",
		);
	const currentClinicId = options.clinicId;
	const visibleLinks = denteTelegramChatLinks.filter(
		(link) =>
			link.organizationId === options.organizationId &&
			link.botConfigId === options.botConfigId &&
			(link.clinicId === currentClinicId || link.clinicId === null),
	);
	const filteredLinks = visibleLinks.filter((link) => {
		if (options.status !== "all" && link.status !== options.status)
			return false;
		if (
			options.subjectType !== "all" &&
			link.subjectType !== options.subjectType
		)
			return false;
		if (options.subjectId && link.subjectId !== options.subjectId) return false;
		return true;
	});
	const offset = Number.parseInt(options.cursor, 10);
	const start = Math.max(0, Number.isFinite(offset) ? offset : 0);
	const items = filteredLinks
		.slice(start, start + options.limit)
		.map((link) => denteTelegramChatLinkPublicSchema.parse(link));
	const nextOffset = start + items.length;
	return denteTelegramChatLinkListResponseSchema.parse({
		totalCount: visibleLinks.length,
		filteredCount: filteredLinks.length,
		limit: options.limit,
		cursor: options.cursor === "0" ? null : options.cursor,
		nextCursor: nextOffset < filteredLinks.length ? String(nextOffset) : null,
		activeCount: visibleLinks.filter((link) => link.status === "active").length,
		revokedCount: visibleLinks.filter((link) => link.status === "revoked")
			.length,
		chatLinks: items,
	});
}

export function revokeDenteTelegramChatLink(
	linkId: string,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
): DenteTelegramChatLink | null {
	const currentClinicId =
		scope.clinicId?.trim() || clinicProfile.organizationId;
	const organizationId =
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const botConfigId =
		scope.botConfigId?.trim() || configuredTelegramBotConfigId();
	const chatLink =
		denteTelegramChatLinks.find(
			(link) =>
				link.id === linkId &&
				link.status === "active" &&
				link.organizationId === organizationId &&
				link.botConfigId === botConfigId &&
				(link.clinicId === currentClinicId || link.clinicId === null),
		) ?? null;
	if (!chatLink) return null;
	chatLink.status = "revoked";
	chatLink.revokedAt = new Date().toISOString();
	chatLink.lastUpdateAt = chatLink.revokedAt;
	persistMutableState();
	return chatLink;
}

function telegramAppointmentTimeLabel(appointment: Appointment): string {
	const date = new Date(appointment.startsAt);
	if (Number.isNaN(date.getTime())) return "в согласованное время";
	const timeZone = validScheduleTimeZone(clinicProfile.timezone);
	return getAppointmentTimeFormatter(timeZone).format(date).replace(",", "");
}

const staffDigestVisibleAppointmentStatuses = new Set<AppointmentStatus>([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
]);

const staffDigestClinicWideRoles = new Set<StaffRole>([
	"owner",
	"manager",
	"administrator",
]);

function staffRoleLabelForTelegramDigest(role: StaffRole): string {
	const labels: Record<StaffRole, string> = {
		owner: "владелец",
		doctor: "врач",
		administrator: "администратор",
		assistant: "ассистент",
		manager: "управляющий",
		curator: "куратор",
	};
	return labels[role];
}

function staffCanSeeTelegramDigestAppointment(
	staff: StaffMember,
	appointment: Appointment,
): boolean {
	if (staffDigestClinicWideRoles.has(staff.role)) return true;
	if (staff.role === "doctor") return appointment.doctorUserId === staff.id;
	if (staff.role === "assistant")
		return appointment.assistantUserId === staff.id;
	return false;
}

function staffCanSeeTelegramDigestTask(
	staff: StaffMember,
	task: CommunicationTask,
): boolean {
	if (staffDigestClinicWideRoles.has(staff.role)) return true;
	return task.assignedRole === staff.role;
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
		case "document_ready_notice":
			return {
				templateKind: "document_ready_notice",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: документ клиники готов. Открывайте его только в защищенном портале: ${context.portalUrl}`,
				variablesUsed: ["patientPortalBaseUrl"],
				warnings: [
					baseWarning,
					"Telegram передает только уведомление о готовности и ссылку на портал.",
				],
				blockedReason: null,
			};
		case "tax_document_request_status":
			return {
				templateKind: "tax_document_request_status",
				classification: "no_phi",
				allowedByDefault: true,
				text: context.portalUrl
					? `DENTE: статус запроса налоговых документов обновлен. Откройте налоговый раздел защищенного портала: ${context.portalUrl}`
					: "DENTE: статус запроса налоговых документов обновлен. Файлы готовятся внутри DENTE или защищенного портала.",
				variablesUsed: context.portalUrl ? ["patientPortalBaseUrl"] : [],
				warnings: [
					baseWarning,
					"Файл налоговой справки не отправляется через Telegram.",
				],
				blockedReason: null,
			};
		case "callback_request_received":
			return {
				templateKind: "callback_request_received",
				classification: "no_phi",
				allowedByDefault: true,
				text: "DENTE: запрос обратного звонка получен. Администратор клиники свяжется с вами.",
				variablesUsed: [],
				warnings: [baseWarning],
				blockedReason: null,
			};
		case "post_visit_instruction_link":
			return {
				templateKind: "post_visit_instruction_link",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: памятка после приема готова в защищенном портале клиники: ${context.portalUrl}`,
				variablesUsed: ["patientPortalBaseUrl"],
				warnings: [baseWarning, "Текст памятки не встраивается в Telegram."],
				blockedReason: null,
			};
		case "post_visit_checkup":
			return {
				templateKind: "post_visit_checkup",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: проверьте памятку после приема в защищенном портале: ${context.portalUrl}. Если есть вопросы или самочувствие ухудшается, свяжитесь с клиникой.`,
				variablesUsed: ["patientPortalBaseUrl"],
				warnings: [
					baseWarning,
					"Контрольное сообщение не раскрывает процедуру, зуб, диагноз, назначения и текст памятки.",
				],
				blockedReason: null,
			};
		case "recall_notice":
			return {
				templateKind: "recall_notice",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: ${context.clinicName} приглашает вас на профилактический контроль. Запишитесь через защищенный портал: ${context.portalUrl}`,
				variablesUsed: ["clinicName", "patientPortalBaseUrl"],
				warnings: [
					baseWarning,
					"Сообщение не раскрывает проведенную процедуру и причину приглашения.",
				],
				blockedReason: null,
			};
		case "review_request":
			return {
				templateKind: "review_request",
				classification: "no_phi",
				allowedByDefault: true,
				text: `DENTE: спасибо за визит в ${context.clinicName}. Ниже ссылка, чтобы оценить клинику.`,
				variablesUsed: [
					"clinicName",
					...(context.reviewUrl ? ["clinicReviewUrl"] : []),
					...(context.mapsUrl ? ["clinicMapsUrl"] : []),
				],
				warnings: [
					baseWarning,
					"Ссылки для отзывов должны быть общими HTTPS-ссылками клиники без пациента, приема, диагноза и идентификаторов лечения.",
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
	}
}

export interface TelegramMessageContext {
	clinicName: string;
	appointmentTime?: string;
	hasAppointment: boolean;
	portalUrl: string | null;
	reviewUrl: string | null;
	mapsUrl: string | null;
	staffRoleLabel?: string;
	appointmentCount?: number;
	openTaskCount?: number;
	urgentTaskCount?: number;
}

export function renderDenteTelegramMessagePreview(
	input: DenteTelegramMessagePreviewRequest,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	state: DomainState = inMemoryDomainState,
): DenteTelegramMessagePreview {
	const portal = denteTelegramPortalUrlForTemplate(
		input.templateKind,
		settings,
	);
	const reviewUrl = safeHttpsUrl(settings.clinicReviewUrl);
	const mapsUrl = safeHttpsUrl(settings.clinicMapsUrl);
	const visualCardUrl = denteTelegramVisualCardUrlForTemplate(
		input.templateKind,
		settings,
	);
	const clinicName = repairMojibakeText(
		state.clinicProfile?.clinicName || clinicProfile.clinicName || "клиника DENTE",
	);
	const appointment = input.appointmentId
		? (state.appointments.find((item) => item.id === input.appointmentId) ?? null)
		: null;
	const appointmentTime = appointment
		? telegramAppointmentTimeLabel(appointment)
		: "в согласованное время";
	const patientVisualTemplateKinds: DenteTelegramTemplateKind[] = [
		"appointment_reminder",
		"appointment_confirmation",
		"payment_reminder_notice",
		"document_ready_notice",
		"tax_document_request_status",
		"callback_request_received",
		"post_visit_instruction_link",
		"post_visit_checkup",
		"recall_notice",
		"review_request",
	];
	const staffVisualTemplateKinds: DenteTelegramTemplateKind[] = [
		"staff_daily_digest",
	];
	const photoUrl =
		visualCardUrl &&
		(patientVisualTemplateKinds.includes(input.templateKind) ||
			staffVisualTemplateKinds.includes(input.templateKind))
			? visualCardUrl
			: null;

	if (input.includePhi) {
		return denteTelegramMessagePreviewSchema.parse({
			templateKind: input.templateKind,
			classification: "phi_requires_consent",
			allowedByDefault: false,
			text: "",
			replyMarkup: null,
			photoUrl: null,
			variablesUsed: [],
			warnings: [
				"Текст с медицинскими данными отключен до внедрения согласий, авторизации, шифрования и политики клиники.",
			],
			blockedReason: "phi_requires_consent",
		});
	}

	if (
		input.patientId &&
		!state.patients.some((patient) => patient.id === input.patientId)
	) {
		throw new Error("Пациент для предпросмотра Telegram не найден.");
	}
	if (input.appointmentId && !appointment) {
		throw new Error("Запись для предпросмотра Telegram не найдена.");
	}
	if (
		input.documentId &&
		!state.documents.some((document) => document.id === input.documentId)
	) {
		throw new Error("Документ для предпросмотра Telegram не найден.");
	}
	if (
		input.taskId &&
		!state.communicationTasks.some((task) => task.id === input.taskId)
	) {
		throw new Error(
			"Задача коммуникации для предпросмотра Telegram не найдена.",
		);
	}

	const portalRequired =
		input.templateKind === "document_ready_notice" ||
		input.templateKind === "post_visit_instruction_link" ||
		input.templateKind === "post_visit_checkup" ||
		input.templateKind === "recall_notice";
	if (portalRequired && !portal) {
		return denteTelegramMessagePreviewSchema.parse({
			templateKind: input.templateKind,
			classification: "limited_admin",
			allowedByDefault: false,
			text: "",
			replyMarkup: null,
			photoUrl: null,
			variablesUsed: ["patientPortalBaseUrl"],
			warnings: [
				"Укажите patientPortalBaseUrl перед отправкой Telegram-уведомлений со ссылкой на защищенный портал.",
			],
			blockedReason: "missing_patient_portal_base_url",
		});
	}

	if (input.templateKind === "review_request" && !reviewUrl && !mapsUrl) {
		return denteTelegramMessagePreviewSchema.parse({
			templateKind: input.templateKind,
			classification: "no_phi",
			allowedByDefault: false,
			text: "",
			replyMarkup: null,
			photoUrl: null,
			variablesUsed: ["clinicReviewUrl", "clinicMapsUrl"],
			warnings: [
				"Укажите HTTPS-ссылку clinicReviewUrl или clinicMapsUrl перед просьбой оставить отзыв.",
			],
			blockedReason: "missing_clinic_review_url",
		});
	}

	const baseWarning =
		"В Telegram не включаются диагнозы, номера зубов, план лечения, снимки, налоговые PDF, детализация оплаты и копии меддокументов.";
	const context: TelegramMessageContext = {
		clinicName,
		appointmentTime,
		hasAppointment: !!appointment,
		portalUrl: portal,
		reviewUrl,
		mapsUrl,
	};

	if (input.templateKind === "staff_daily_digest") {
		const staff = input.staffId
			? (state.staffMembers.find(
					(member) =>
						member.id === input.staffId &&
						member.organizationId === settings.organizationId &&
						member.active,
				) ?? null)
			: null;
		if (input.staffId && !staff) {
			throw new Error("Сотрудник для предпросмотра Telegram не найден.");
		}
		const clinicDateKey = appointmentClinicDateKey(new Date().toISOString());
		const scopedAppointments = state.appointments.filter(
			(appointment) =>
				appointment.organizationId === settings.organizationId &&
				staffDigestVisibleAppointmentStatuses.has(appointment.status) &&
				appointmentClinicDateKey(appointment.startsAt) === clinicDateKey &&
				(!staff || staffCanSeeTelegramDigestAppointment(staff, appointment)),
		);
		const scopedTasks = state.communicationTasks.filter(
			(task) =>
				task.organizationId === settings.organizationId &&
				isOpenCommunicationTask(task) &&
				(!staff || staffCanSeeTelegramDigestTask(staff, task)),
		);
		const urgentTaskCount = scopedTasks.filter(
			(task) => task.priority === "urgent" || task.priority === "high",
		).length;

		context.staffRoleLabel = staff
			? staffRoleLabelForTelegramDigest(staff.role)
			: "команда клиники";
		context.appointmentCount = scopedAppointments.length;
		context.openTaskCount = scopedTasks.length;
		context.urgentTaskCount = urgentTaskCount;
	}

	const preview = buildDenteTelegramMessagePreviewData(
		input.templateKind,
		context,
		baseWarning,
	);
	const appointmentCallbackUnavailable =
		(input.templateKind === "appointment_reminder" ||
			input.templateKind === "appointment_confirmation") &&
		Boolean(input.appointmentId) &&
		!denteTelegramAppointmentCallbacksReady();
	return denteTelegramMessagePreviewSchema.parse({
		...preview,
		warnings: appointmentCallbackUnavailable
			? [
					...preview.warnings,
					"Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.",
				]
			: preview.warnings,
		replyMarkup: preview.allowedByDefault
			? telegramReplyMarkupFor(
					input.templateKind,
					input.appointmentId ?? null,
					settings,
				)
			: null,
		photoUrl: preview.allowedByDefault ? photoUrl : null,
	});
}

function telegramTemplateKindForTask(
	task: CommunicationTask,
): DenteTelegramTemplateKind {
	if (task.intent === "appointment_confirmation")
		return "appointment_confirmation";
	if (task.intent === "payment_reminder") return "payment_reminder_notice";
	if (task.intent === "document_ready") return "document_ready_notice";
	if (task.intent === "recall") return "recall_notice";
	if (task.intent === "post_visit_instruction")
		return "post_visit_instruction_link";
	return "callback_request_received";
}

type DenteTelegramAppointmentCallbackAction =
	| "confirm"
	| "reschedule"
	| "call_request";

type DenteTelegramAppointmentCallbackScope = {
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
};

const denteTelegramAppointmentCallbackCodes: Record<
	DenteTelegramAppointmentCallbackAction,
	string
> = {
	confirm: "c",
	reschedule: "r",
	call_request: "p",
};

const denteTelegramAppointmentCallbackActions: Record<
	string,
	DenteTelegramAppointmentCallbackAction
> = {
	c: "confirm",
	r: "reschedule",
	p: "call_request",
};

function denteTelegramCallbackSecret(): string | null {
	return (
		process.env.DENTE_TELEGRAM_CALLBACK_SECRET?.trim() ||
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET?.trim() ||
		null
	);
}

function denteTelegramAppointmentCallbacksReady(): boolean {
	return Boolean(denteTelegramCallbackSecret());
}

function normalizeDenteTelegramAppointmentCallbackScope(
	scope: DenteTelegramAppointmentCallbackScope | undefined,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): { organizationId: string; clinicId: string; botConfigId: string } {
	const organizationId =
		scope?.organizationId?.trim() ||
		settings.organizationId ||
		denteTelegramBotSettings.organizationId;
	const clinicId = scope?.clinicId?.trim() || organizationId;
	const settingsBotUsername = safeTelegramBotUsername(
		settings.mode === "clinic_owned_bot"
			? settings.ownBotUsername
			: settings.botUsername,
	);
	const botConfigId =
		scope?.botConfigId?.trim() ||
		denteTelegramBotConfigIdForSettings(settings, settingsBotUsername);
	return { organizationId, clinicId, botConfigId };
}

function denteTelegramAppointmentCallbackSignature(
	action: DenteTelegramAppointmentCallbackAction,
	appointmentId: string,
	expiresAtSecondsBase36: string,
	scope: DenteTelegramAppointmentCallbackScope | undefined,
): string {
	const secret = denteTelegramCallbackSecret();
	if (!secret) {
		throw new Error(
			"Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.",
		);
	}
	const scoped = normalizeDenteTelegramAppointmentCallbackScope(scope);
	return createHmac("sha256", secret)
		.update(
			`${scoped.organizationId}:${scoped.clinicId}:${scoped.botConfigId}:${appointmentId}:${action}:${expiresAtSecondsBase36}`,
		)
		.digest("base64url")
		.slice(0, 10);
}

function denteTelegramSignatureEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	return (
		leftBuffer.length === rightBuffer.length &&
		timingSafeEqual(leftBuffer, rightBuffer)
	);
}

function appointmentCallbackExpiryBase36(
	appointmentId: string | null | undefined,
): string {
	const appointment = appointmentId
		? (appointments.find((candidate) => candidate.id === appointmentId) ?? null)
		: null;
	const startsAtMs = appointment ? Date.parse(appointment.startsAt) : NaN;
	const fallbackMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
	return Math.floor(
		(Number.isFinite(startsAtMs) ? startsAtMs : fallbackMs) / 1000,
	).toString(36);
}

function buildDenteTelegramAppointmentCallbackData(
	action: DenteTelegramAppointmentCallbackAction,
	appointmentId: string,
	scope?: DenteTelegramAppointmentCallbackScope,
): string {
	if (!denteTelegramAppointmentCallbacksReady()) {
		throw new Error(
			"Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.",
		);
	}
	const actionCode = denteTelegramAppointmentCallbackCodes[action];
	const compactAppointmentId = appointmentId.replace(/-/g, "").toLowerCase();
	const expiresAtSecondsBase36 = appointmentCallbackExpiryBase36(appointmentId);
	return `d1.${actionCode}.${compactAppointmentId}.${expiresAtSecondsBase36}.${denteTelegramAppointmentCallbackSignature(
		action,
		appointmentId,
		expiresAtSecondsBase36,
		scope,
	)}`;
}

function dashedUuidFromCompact(value: string): string | null {
	const normalized = value.toLowerCase();
	if (!/^[0-9a-f]{32}$/.test(normalized)) return null;
	return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(
		16,
		20,
	)}-${normalized.slice(20)}`;
}

function parseDenteTelegramAppointmentCallbackData(
	callbackData: string | null | undefined,
	scope: DenteTelegramAppointmentCallbackScope,
): {
	action: DenteTelegramAppointmentCallbackAction;
	appointmentId: string;
	expiresAtSeconds: number;
} | null {
	const match = callbackData?.match(
		/^d1\.([crp])\.([0-9a-f]{32})\.([0-9a-z]{1,8})\.([A-Za-z0-9_-]{10})$/,
	);
	if (!match) return null;
	const action = denteTelegramAppointmentCallbackActions[match[1] ?? ""];
	const appointmentId = dashedUuidFromCompact(match[2] ?? "");
	const expiresAtSeconds = Number.parseInt(match[3] ?? "", 36);
	const signature = match[4] ?? "";
	if (!action || !appointmentId || !Number.isFinite(expiresAtSeconds))
		return null;
	if (!denteTelegramAppointmentCallbacksReady()) return null;
	const expectedSignature = denteTelegramAppointmentCallbackSignature(
		action,
		appointmentId,
		match[3] ?? "",
		scope,
	);
	if (!denteTelegramSignatureEqual(signature, expectedSignature)) return null;
	return { action, appointmentId, expiresAtSeconds };
}

function appointmentCallbackActionLabel(
	action: DenteTelegramAppointmentCallbackAction,
): string {
	if (action === "confirm") return "подтверждение приема";
	if (action === "reschedule") return "запрос переноса приема";
	return "просьба перезвонить";
}

function appointmentStatusLabelForTelegram(status: AppointmentStatus): string {
	const labels: Record<AppointmentStatus, string> = {
		planned: "запланирован",
		confirmed: "подтвержден",
		arrived: "пациент прибыл",
		in_treatment: "идет прием",
		completed: "завершен",
		cancelled: "отменен",
		no_show: "неявка",
	};
	return labels[status];
}

function appointmentCallbackStatusAllowed(
	action: DenteTelegramAppointmentCallbackAction,
	status: AppointmentStatus,
): boolean {
	if (action === "confirm") return status === "planned";
	return status === "planned" || status === "confirmed";
}

function findExistingTelegramCallbackTask(
	appointment: Appointment,
	action: Exclude<DenteTelegramAppointmentCallbackAction, "confirm">,
): CommunicationTask | null {
	const title =
		action === "reschedule"
			? "Пациент просит перенести прием"
			: "Пациент просит перезвонить";
	const workflowCode =
		action === "reschedule"
			? "telegram_appointment_reschedule_request"
			: "telegram_appointment_call_request";
	return (
		communicationTasks.find(
			(task) =>
				task.organizationId === appointment.organizationId &&
				task.appointmentId === appointment.id &&
				task.patientId === appointment.patientId &&
				(task.workflowCode === workflowCode ||
					(!task.workflowCode && task.title === title)) &&
				task.status === "needs_call",
		) ?? null
	);
}

function ensureTelegramCallbackCommunicationTask(input: {
	appointment: Appointment;
	action: Exclude<DenteTelegramAppointmentCallbackAction, "confirm">;
	now: string;
}): CommunicationTask {
	const existing = findExistingTelegramCallbackTask(
		input.appointment,
		input.action,
	);
	if (existing) {
		existing.lastEventAt = input.now;
		existing.dueAt = input.now;
		return existing;
	}
	const task: CommunicationTask = {
		id: randomUUID(),
		organizationId: input.appointment.organizationId,
		patientId: input.appointment.patientId ?? marinaPatientId,
		appointmentId: input.appointment.id,
		visitId: null,
		documentId: null,
		assignedRole: "administrator",
		channel: "phone",
		intent:
			input.action === "reschedule" ? "appointment_confirmation" : "general",
		status: "needs_call",
		priority: input.action === "reschedule" ? "high" : "normal",
		dueAt: input.now,
		title:
			input.action === "reschedule"
				? "Пациент просит перенести прием"
				: "Пациент просит перезвонить",
		body:
			input.action === "reschedule"
				? "Пациент нажал кнопку переноса в Telegram. Свяжитесь с пациентом и предложите новое время без передачи медданных в Telegram."
				: "Пациент нажал кнопку обратного звонка в Telegram. Свяжитесь с пациентом через канал клиники.",
		workflowCode:
			input.action === "reschedule"
				? "telegram_appointment_reschedule_request"
				: "telegram_appointment_call_request",
		lastEventAt: input.now,
		createdAt: input.now,
	};
	communicationTasks.unshift(task);
	communicationTasks.splice(300);
	return task;
}

export function handleDenteTelegramAppointmentCallback(input: {
	callbackData: string | null | undefined;
	chatFingerprint: string | null;
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
	state?: DomainState;
}): {
	handled: boolean;
	ok: boolean;
	action: string;
	appointmentId: string | null;
	taskId: string | null;
	eventId: string | null;
	suggestedReply: string | null;
	callbackAnswerText: string;
	warnings: string[];
} {
	if (!input.callbackData?.startsWith("d1.")) {
		return {
			handled: false,
			ok: false,
			action: "not_appointment_callback",
			appointmentId: null,
			taskId: null,
			eventId: null,
			suggestedReply: null,
			callbackAnswerText: "DENTE",
			warnings: [],
		};
	}
	const organizationId =
		input.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const clinicId = input.clinicId?.trim() || organizationId;
	const botConfigId =
		input.botConfigId?.trim() || configuredTelegramBotConfigId();
	const callbackScope = { organizationId, clinicId, botConfigId };
	const parsed = parseDenteTelegramAppointmentCallbackData(
		input.callbackData,
		callbackScope,
	);
	if (!parsed) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: null,
			taskId: null,
			eventId: null,
			suggestedReply:
				"Кнопка устарела или повреждена. Откройте последнее сообщение от клиники или свяжитесь с администратором.",
			callbackAnswerText: "Кнопка DENTE не принята",
			warnings: ["Подпись Telegram-кнопки приема недействительна."],
		};
	}
	const targetAppointments = input.state?.appointments ?? appointments;
	const appointment = targetAppointments.find(
		(candidate) =>
			candidate.id === parsed.appointmentId &&
			candidate.organizationId === organizationId,
	);
	if (!appointment?.patientId) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: parsed.appointmentId,
			taskId: null,
			eventId: null,
			suggestedReply:
				"Запись не найдена или уже недоступна. Свяжитесь с клиникой.",
			callbackAnswerText: "Запись не найдена",
			warnings: ["Telegram-кнопка ссылается на несуществующую запись."],
		};
	}
	if (parsed.expiresAtSeconds * 1000 <= Date.now()) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: appointment.id,
			taskId: null,
			eventId: null,
			suggestedReply:
				"Запись уже прошла или кнопка устарела. Свяжитесь с клиникой для уточнения.",
			callbackAnswerText: "Кнопка устарела",
			warnings: ["Telegram-кнопка приема устарела."],
		};
	}
	const chatLink = denteTelegramChatLinks.find(
		(link) =>
			link.organizationId === organizationId &&
			link.botConfigId === botConfigId &&
			link.subjectType === "patient" &&
			link.subjectId === appointment.patientId &&
			link.chatFingerprint === input.chatFingerprint &&
			link.status === "active",
	);
	if (!chatLink) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: appointment.id,
			taskId: null,
			eventId: null,
			suggestedReply:
				"Сначала привяжите этот Telegram-чат к пациенту через одноразовый код клиники.",
			callbackAnswerText: "Чат не привязан",
			warnings: [
				"Telegram-кнопка приема нажата из чата без активной привязки пациента.",
			],
		};
	}
	if (!appointmentCallbackStatusAllowed(parsed.action, appointment.status)) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: appointment.id,
			taskId: null,
			eventId: null,
			suggestedReply: `Запись сейчас в статусе '${appointmentStatusLabelForTelegram(
				appointment.status,
			)}'. Кнопка не применена. Свяжитесь с клиникой для уточнения.`,
			callbackAnswerText: "Кнопка уже неактуальна",
			warnings: [
				`Telegram-кнопка приема отклонена из-за статуса записи: ${appointment.status}.`,
			],
		};
	}

	const now = new Date().toISOString();
	let task: CommunicationTask | null = null;
	if (parsed.action === "confirm") {
		if (appointment.status === "planned") {
			appointment.status = "confirmed";
		}
	} else {
		task = ensureTelegramCallbackCommunicationTask({
			appointment,
			action: parsed.action,
			now,
		});
	}

	const event: CommunicationEvent = {
		id: randomUUID(),
		organizationId: appointment.organizationId,
		taskId: task?.id ?? null,
		patientId: appointment.patientId,
		actorUserId: null,
		channel: "telegram",
		direction: "inbound",
		status: parsed.action === "confirm" ? "completed" : "needs_call",
		message: `Telegram: ${appointmentCallbackActionLabel(parsed.action)}.`,
		createdAt: now,
	};
	communicationEvents.unshift(event);
	communicationEvents.splice(500);
	recordAuditEvent({
		entityType: "appointment",
		entityId: appointment.id,
		action:
			parsed.action === "confirm"
				? "telegram_appointment_confirmed"
				: parsed.action === "reschedule"
					? "telegram_appointment_reschedule_requested"
					: "telegram_callback_requested",
		reason:
			parsed.action === "confirm"
				? "Пациент подтвердил прием через подписанную Telegram-кнопку DENTE."
				: `Пациент отправил через Telegram действие: ${appointmentCallbackActionLabel(parsed.action)}.`,
	});
	persistMutableState();

	if (parsed.action === "confirm") {
		return {
			handled: true,
			ok: true,
			action: "telegram_appointment_confirmed",
			appointmentId: appointment.id,
			taskId: null,
			eventId: event.id,
			suggestedReply:
				"Прием подтвержден. Если планы изменятся, свяжитесь с клиникой.",
			callbackAnswerText: "Прием подтвержден",
			warnings: [],
		};
	}
	if (parsed.action === "reschedule") {
		return {
			handled: true,
			ok: true,
			action: "telegram_appointment_reschedule_requested",
			appointmentId: appointment.id,
			taskId: task?.id ?? null,
			eventId: event.id,
			suggestedReply:
				"Запрос на перенос принят. Администратор клиники свяжется с вами и предложит новое время.",
			callbackAnswerText: "Запрос на перенос принят",
			warnings: [],
		};
	}
	return {
		handled: true,
		ok: true,
		action: "telegram_callback_requested",
		appointmentId: appointment.id,
		taskId: task?.id ?? null,
		eventId: event.id,
		suggestedReply: "Запрос звонка принят. Клиника свяжется с вами.",
		callbackAnswerText: "Запрос звонка принят",
		warnings: [],
	};
}

function telegramFeatureForTemplate(templateKind: DenteTelegramTemplateKind) {
	const map: Partial<
		Record<
			DenteTelegramTemplateKind,
			DenteTelegramBotSettings["enabledFeatures"][number]
		>
	> = {
		appointment_reminder: "appointment_reminders",
		appointment_confirmation: "appointment_confirmation",
		payment_reminder_notice: "payment_reminders",
		document_ready_notice: "document_ready_notice",
		tax_document_request_status: "tax_document_request",
		callback_request_received: "callback_requests",
		post_visit_instruction_link: "post_visit_instructions",
		post_visit_checkup: "post_visit_instructions",
		recall_notice: "recalls",
		review_request: "review_requests",
		staff_daily_digest: "staff_daily_digest",
	};
	return map[templateKind] ?? null;
}

function activeTelegramChatLinkFor(
	subjectType: "patient" | "staff",
	subjectId: string,
	organizationScope = denteTelegramBotSettings.organizationId,
	botConfigId = configuredTelegramBotConfigId(),
): DenteTelegramChatLink | null {
	return (
		denteTelegramChatLinks.find(
			(link) =>
				link.organizationId === organizationScope &&
				link.botConfigId === botConfigId &&
				link.subjectType === subjectType &&
				link.subjectId === subjectId &&
				link.status === "active",
		) ?? null
	);
}

const telegramScheduleVisibleStatuses = new Set<AppointmentStatus>([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
]);

function activeTelegramChatLinkByFingerprint(
	chatFingerprintValue: string | null,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
): DenteTelegramChatLink | null {
	if (!chatFingerprintValue) return null;
	const organizationId =
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const currentClinicId =
		scope.clinicId?.trim() || clinicProfile.organizationId;
	const botConfigId =
		scope.botConfigId?.trim() || configuredTelegramBotConfigId();
	return (
		denteTelegramChatLinks.find(
			(link) =>
				link.organizationId === organizationId &&
				link.botConfigId === botConfigId &&
				(link.clinicId === currentClinicId || link.clinicId === null) &&
				link.chatFingerprint === chatFingerprintValue &&
				link.status === "active",
		) ?? null
	);
}

type DenteTelegramDocumentRequestTopic =
	| "tax"
	| "billing"
	| "medical"
	| "patientForms";

const denteTelegramDocumentRequestTopics: Record<
	DenteTelegramDocumentRequestTopic,
	{
		workflowCode: NonNullable<CommunicationTask["workflowCode"]>;
		taskTitle: string;
		taskBody: string;
		inboundCreatedMessage: string;
		inboundRepeatedMessage: string;
		responseCreatedText: string;
		responseRepeatedText: string;
		priority: CommunicationTask["priority"];
		auditCreatedAction: string;
		auditRepeatedAction: string;
	}
> = {
	tax: {
		workflowCode: "telegram_tax_document_request",
		taskTitle: "Пациент запросил налоговые документы",
		taskBody:
			"Пациент запросил налоговые документы в Telegram. В DENTE проверьте плательщика, фискальные чеки, периоды 2021-2023 и данные для КНД 1151156. Готовые PDF выдавайте только через защищенный портал.",
		inboundCreatedMessage: "Telegram: пациент запросил налоговые документы.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил налоговые документы.",
		responseCreatedText:
			"Запрос передан администратору DENTE. Клиника проверит платежи, плательщика и подготовит налоговые документы в защищенном портале.",
		responseRepeatedText:
			"Запрос на налоговые документы уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу для администратора.",
		priority: "high",
		auditCreatedAction: "telegram_tax_document_request_created",
		auditRepeatedAction: "telegram_tax_document_request_repeated",
	},
	billing: {
		workflowCode: "telegram_billing_document_request",
		taskTitle: "Пациент запросил финансовые документы",
		taskBody:
			"Пациент запросил финансовые документы в Telegram. В DENTE проверьте счет, чек, акт, возврат, рассрочку или историю оплат. Документы и суммы выдавайте только через защищенный портал.",
		inboundCreatedMessage: "Telegram: пациент запросил финансовые документы.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил финансовые документы.",
		responseCreatedText:
			"Запрос передан администратору DENTE. Клиника проверит счета, чеки, акты или возвраты и откроет документы в защищенном портале.",
		responseRepeatedText:
			"Запрос на финансовые документы уже есть в очереди DENTE. Мы обновили время обращения для администратора.",
		priority: "normal",
		auditCreatedAction: "telegram_billing_document_request_created",
		auditRepeatedAction: "telegram_billing_document_request_repeated",
	},
	medical: {
		workflowCode: "telegram_medical_document_request",
		taskTitle: "Пациент запросил медицинские документы",
		taskBody:
			"Пациент запросил медицинские документы в Telegram. В DENTE проверьте личность, полномочия получателя и подготовьте выписку, копии, расписку выдачи или КТ/снимки без передачи медданных в Telegram.",
		inboundCreatedMessage: "Telegram: пациент запросил медицинские документы.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил медицинские документы.",
		responseCreatedText:
			"Запрос передан администратору DENTE. Медицинские документы подготовят после проверки личности и выдадут через защищенный портал.",
		responseRepeatedText:
			"Запрос на медицинские документы уже есть в очереди DENTE. Мы обновили время обращения для администратора.",
		priority: "normal",
		auditCreatedAction: "telegram_medical_document_request_created",
		auditRepeatedAction: "telegram_medical_document_request_repeated",
	},
	patientForms: {
		workflowCode: "telegram_patient_forms_request",
		taskTitle: "Пациент запросил формы и согласия",
		taskBody:
			"Пациент запросил формы пациента в Telegram. В DENTE подготовьте анкету, согласия, ПДн, представителя, отказ или фото/видео-согласие по ситуации следующего визита.",
		inboundCreatedMessage: "Telegram: пациент запросил формы и согласия.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил формы и согласия.",
		responseCreatedText:
			"Запрос передан администратору DENTE. Формы, согласия и анкеты подготовят в приложении и откроют в защищенном портале.",
		responseRepeatedText:
			"Запрос на формы уже есть в очереди DENTE. Мы обновили время обращения для администратора.",
		priority: "normal",
		auditCreatedAction: "telegram_patient_forms_request_created",
		auditRepeatedAction: "telegram_patient_forms_request_repeated",
	},
};

function findExistingTelegramDocumentRequestTask(
	organizationScope: string,
	patientId: string,
	topic: DenteTelegramDocumentRequestTopic,
): CommunicationTask | null {
	const requestTopic = denteTelegramDocumentRequestTopics[topic];
	return (
		communicationTasks.find(
			(task) =>
				task.organizationId === organizationScope &&
				task.patientId === patientId &&
				task.appointmentId === null &&
				task.documentId === null &&
				(task.workflowCode === requestTopic.workflowCode ||
					(!task.workflowCode && task.title === requestTopic.taskTitle)) &&
				isOpenCommunicationTask(task),
		) ?? null
	);
}

export function createDenteTelegramDocumentRequest(
	chatFingerprintValue: string | null,
	topic: DenteTelegramDocumentRequestTopic,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
): {
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	taskId: string | null;
	eventId: string | null;
	duplicate: boolean;
	blockedReason: string | null;
} {
	const chatLink = activeTelegramChatLinkByFingerprint(
		chatFingerprintValue,
		scope,
	);
	if (!chatLink) {
		return {
			text: "DENTE: запрос документов доступен после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	if (chatLink.subjectType !== "patient") {
		return {
			text: "DENTE: вы подключены как сотрудник клиники. Запросы документов от пациентов доступны в рабочем приложении DENTE.",
			linked: true,
			subjectType: "staff",
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "staff_chat_no_patient_task",
		};
	}

	const organizationScope = chatLink.organizationId;
	const patient = patients.find(
		(candidate) =>
			candidate.organizationId === organizationScope &&
			candidate.id === chatLink.subjectId,
	);
	if (!patient) {
		return {
			text: "DENTE: привязка Telegram найдена, но пациент недоступен. Попросите администратора клиники обновить привязку.",
			linked: false,
			subjectType: "patient",
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_patient_not_found",
		};
	}

	const requestTopic = denteTelegramDocumentRequestTopics[topic];
	const now = new Date().toISOString();
	let duplicate = true;
	let task = findExistingTelegramDocumentRequestTask(
		organizationScope,
		patient.id,
		topic,
	);
	if (task) {
		task.dueAt = now;
		task.lastEventAt = now;
	} else {
		duplicate = false;
		task = {
			id: randomUUID(),
			organizationId: organizationScope,
			patientId: patient.id,
			appointmentId: null,
			visitId: null,
			documentId: null,
			assignedRole: "administrator",
			channel: "phone",
			intent: "general",
			status: "needs_call",
			priority: requestTopic.priority,
			dueAt: now,
			title: requestTopic.taskTitle,
			body: requestTopic.taskBody,
			workflowCode: requestTopic.workflowCode,
			lastEventAt: now,
			createdAt: now,
		};
		communicationTasks.unshift(task);
		communicationTasks.splice(300);
	}

	const event: CommunicationEvent = {
		id: randomUUID(),
		organizationId: organizationScope,
		taskId: task.id,
		patientId: patient.id,
		actorUserId: null,
		channel: "telegram",
		direction: "inbound",
		status: "needs_call",
		message: duplicate
			? requestTopic.inboundRepeatedMessage
			: requestTopic.inboundCreatedMessage,
		createdAt: now,
	};
	communicationEvents.unshift(event);
	communicationEvents.splice(500);
	recordAuditEvent({
		organizationId: organizationScope,
		entityType: "patient",
		entityId: patient.id,
		action: duplicate
			? requestTopic.auditRepeatedAction
			: requestTopic.auditCreatedAction,
		reason: duplicate
			? "Пациент повторно отправил запрос документов в Telegram."
			: "Пациент отправил запрос документов в Telegram.",
	});
	persistMutableState();

	return {
		text: duplicate
			? requestTopic.responseRepeatedText
			: requestTopic.responseCreatedText,
		linked: true,
		subjectType: "patient",
		taskId: task.id,
		eventId: event.id,
		duplicate,
		blockedReason: null,
	};
}

type DenteTelegramCareRequestTopic =
	| "extraction"
	| "implant"
	| "filling"
	| "endo"
	| "surgery"
	| "anesthesia"
	| "hygiene"
	| "prosthetics"
	| "orthodontics"
	| "periodontology";

const denteTelegramCareRequestTopics: Record<
	DenteTelegramCareRequestTopic,
	{
		workflowCode: NonNullable<CommunicationTask["workflowCode"]>;
		careTopic: PostVisitCareTopic;
		taskTitle: string;
		taskBody: string;
		inboundCreatedMessage: string;
		inboundRepeatedMessage: string;
		responseCreatedText: string;
		responseRepeatedText: string;
		responseIssuedText: string;
		priority: CommunicationTask["priority"];
		auditCreatedAction: string;
		auditRepeatedAction: string;
		auditIssuedAction: string;
	}
> = {
	extraction: {
		workflowCode: "telegram_care_extraction_request",
		careTopic: "extraction",
		taskTitle: "Пациент запросил памятку после удаления",
		taskBody:
			"Пациент нажал кнопку памятки после удаления в Telegram. Врач должен проверить карту, назначение, осложнения и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после удаления.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после удаления.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит карту и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после удаления уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
		responseIssuedText:
			"Персональная памятка после удаления уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если состояние ухудшается.",
		priority: "high",
		auditCreatedAction: "telegram_care_extraction_request_created",
		auditRepeatedAction: "telegram_care_extraction_request_repeated",
		auditIssuedAction: "telegram_care_extraction_request_already_issued",
	},
	implant: {
		workflowCode: "telegram_care_implant_request",
		careTopic: "implantation",
		taskTitle: "Пациент запросил памятку после имплантации",
		taskBody:
			"Пациент нажал кнопку памятки после имплантации в Telegram. Врач должен проверить операцию, назначения, ограничения, контрольный визит и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после имплантации.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после имплантации.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит операцию, назначения и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после имплантации уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
		responseIssuedText:
			"Персональная памятка после имплантации уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если нужна связь с клиникой.",
		priority: "high",
		auditCreatedAction: "telegram_care_implant_request_created",
		auditRepeatedAction: "telegram_care_implant_request_repeated",
		auditIssuedAction: "telegram_care_implant_request_already_issued",
	},
	filling: {
		workflowCode: "telegram_care_filling_request",
		careTopic: "filling_restoration",
		taskTitle: "Пациент запросил памятку после пломбы",
		taskBody:
			"Пациент нажал кнопку памятки после пломбы в Telegram. Врач должен проверить карту, окклюзию, анестезию, ограничения и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после пломбы.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после пломбы.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит карту и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после пломбы уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после пломбы уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если нужна связь с клиникой.",
		priority: "normal",
		auditCreatedAction: "telegram_care_filling_request_created",
		auditRepeatedAction: "telegram_care_filling_request_repeated",
		auditIssuedAction: "telegram_care_filling_request_already_issued",
	},
	endo: {
		workflowCode: "telegram_care_endo_request",
		careTopic: "endo",
		taskTitle: "Пациент запросил памятку после эндодонтии",
		taskBody:
			"Пациент нажал кнопку памятки после лечения каналов в Telegram. Врач должен проверить зуб, этап эндодонтии, временную или постоянную реставрацию, назначения и контрольный визит перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после эндодонтии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после эндодонтии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит лечение каналов, реставрацию и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после эндодонтии уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
		responseIssuedText:
			"Персональная памятка после эндодонтии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если боль усиливается.",
		priority: "high",
		auditCreatedAction: "telegram_care_endo_request_created",
		auditRepeatedAction: "telegram_care_endo_request_repeated",
		auditIssuedAction: "telegram_care_endo_request_already_issued",
	},
	surgery: {
		workflowCode: "telegram_care_surgery_request",
		careTopic: "surgery",
		taskTitle: "Пациент запросил памятку после хирургии",
		taskBody:
			"Пациент нажал кнопку памятки после хирургического вмешательства в Telegram. Врач должен проверить операцию, швы, гемостаз, назначения, ограничения и план контрольного осмотра перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после хирургии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после хирургии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит операцию, назначения и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после хирургии уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
		responseIssuedText:
			"Персональная памятка после хирургии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора при кровотечении, отеке или температуре.",
		priority: "high",
		auditCreatedAction: "telegram_care_surgery_request_created",
		auditRepeatedAction: "telegram_care_surgery_request_repeated",
		auditIssuedAction: "telegram_care_surgery_request_already_issued",
	},
	anesthesia: {
		workflowCode: "telegram_care_anesthesia_request",
		careTopic: "local_anesthesia",
		taskTitle: "Пациент запросил памятку после анестезии",
		taskBody:
			"Пациент нажал кнопку памятки после местной анестезии в Telegram. Врач должен проверить проведенный прием, препарат, ожидаемое онемение, ограничения по еде и признаки, при которых нужна связь с клиникой.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после анестезии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после анестезии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит прием, анестезию и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после анестезии уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после анестезии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если онемение или боль беспокоят.",
		priority: "normal",
		auditCreatedAction: "telegram_care_anesthesia_request_created",
		auditRepeatedAction: "telegram_care_anesthesia_request_repeated",
		auditIssuedAction: "telegram_care_anesthesia_request_already_issued",
	},
	hygiene: {
		workflowCode: "telegram_care_hygiene_request",
		careTopic: "hygiene",
		taskTitle: "Пациент запросил памятку после гигиены",
		taskBody:
			"Пациент нажал кнопку памятки после профгигиены в Telegram. Врач или гигиенист должен проверить карту, рекомендации по уходу, ограничения и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после гигиены.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после гигиены.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Клиника проверит карту и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после гигиены уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после гигиены уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если нужна связь с клиникой.",
		priority: "normal",
		auditCreatedAction: "telegram_care_hygiene_request_created",
		auditRepeatedAction: "telegram_care_hygiene_request_repeated",
		auditIssuedAction: "telegram_care_hygiene_request_already_issued",
	},
	prosthetics: {
		workflowCode: "telegram_care_prosthetics_request",
		careTopic: "prosthetics",
		taskTitle: "Пациент запросил памятку после протезирования",
		taskBody:
			"Пациент нажал кнопку памятки после протезирования в Telegram. Врач должен проверить конструкцию, адаптацию, временный цемент или постоянную фиксацию, ограничения и гарантийные условия перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после протезирования.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после протезирования.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит конструкцию, фиксацию и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после протезирования уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после протезирования уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если конструкция мешает.",
		priority: "normal",
		auditCreatedAction: "telegram_care_prosthetics_request_created",
		auditRepeatedAction: "telegram_care_prosthetics_request_repeated",
		auditIssuedAction: "telegram_care_prosthetics_request_already_issued",
	},
	orthodontics: {
		workflowCode: "telegram_care_orthodontics_request",
		careTopic: "orthodontics",
		taskTitle: "Пациент запросил памятку после ортодонтии",
		taskBody:
			"Пациент нажал кнопку памятки после ортодонтического приема в Telegram. Врач должен проверить аппарат, элайнеры или брекеты, режим ношения, уход, ограничения и дату контроля перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после ортодонтии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после ортодонтии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит аппарат, режим ношения и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после ортодонтии уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после ортодонтии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если аппарат натирает или отклеился.",
		priority: "normal",
		auditCreatedAction: "telegram_care_orthodontics_request_created",
		auditRepeatedAction: "telegram_care_orthodontics_request_repeated",
		auditIssuedAction: "telegram_care_orthodontics_request_already_issued",
	},
	periodontology: {
		workflowCode: "telegram_care_periodontology_request",
		careTopic: "periodontology",
		taskTitle: "Пациент запросил памятку после пародонтологии",
		taskBody:
			"Пациент нажал кнопку памятки после пародонтологического приема в Telegram. Врач должен проверить десны, кровоточивость, назначенный уход, ограничения и сроки контроля перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после пародонтологии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после пародонтологии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит десны, уход и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после пародонтологии уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после пародонтологии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если кровоточивость или боль усиливаются.",
		priority: "normal",
		auditCreatedAction: "telegram_care_periodontology_request_created",
		auditRepeatedAction: "telegram_care_periodontology_request_repeated",
		auditIssuedAction: "telegram_care_periodontology_request_already_issued",
	},
};

function findIssuedTelegramCareDocument(
	organizationScope: string,
	patientId: string,
	topic: DenteTelegramCareRequestTopic,
): GeneratedDocument | null {
	const requestTopic = denteTelegramCareRequestTopics[topic];
	return (
		documents.find(
			(document) =>
				document.organizationId === organizationScope &&
				document.patientId === patientId &&
				document.kind === "post_visit_recommendations" &&
				document.status === "issued" &&
				document.payload?.postVisitRecommendations?.safeForTelegramSending ===
					true &&
				document.payload.postVisitRecommendations.careTopic ===
					requestTopic.careTopic,
		) ?? null
	);
}

function findExistingTelegramCareRequestTask(
	organizationScope: string,
	patientId: string,
	topic: DenteTelegramCareRequestTopic,
): CommunicationTask | null {
	const requestTopic = denteTelegramCareRequestTopics[topic];
	return (
		communicationTasks.find(
			(task) =>
				task.organizationId === organizationScope &&
				task.patientId === patientId &&
				task.appointmentId === null &&
				task.documentId === null &&
				(task.workflowCode === requestTopic.workflowCode ||
					(!task.workflowCode && task.title === requestTopic.taskTitle)) &&
				isOpenCommunicationTask(task),
		) ?? null
	);
}

export function createDenteTelegramCareRequest(
	chatFingerprintValue: string | null,
	topic: DenteTelegramCareRequestTopic,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
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
	const chatLink = activeTelegramChatLinkByFingerprint(
		chatFingerprintValue,
		scope,
	);
	if (!chatLink) {
		return {
			text: "DENTE: персональные памятки доступны после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			alreadyIssued: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	if (chatLink.subjectType !== "patient") {
		return {
			text: "DENTE: вы подключены как сотрудник клиники. Выдача персональных памяток доступна в рабочем приложении DENTE.",
			linked: true,
			subjectType: "staff",
			taskId: null,
			eventId: null,
			duplicate: false,
			alreadyIssued: false,
			blockedReason: "staff_chat_no_patient_task",
		};
	}

	const organizationScope = chatLink.organizationId;
	const patient = patients.find(
		(candidate) =>
			candidate.organizationId === organizationScope &&
			candidate.id === chatLink.subjectId,
	);
	if (!patient) {
		return {
			text: "DENTE: привязка Telegram найдена, но пациент недоступен. Попросите администратора клиники обновить привязку.",
			linked: false,
			subjectType: "patient",
			taskId: null,
			eventId: null,
			duplicate: false,
			alreadyIssued: false,
			blockedReason: "telegram_patient_not_found",
		};
	}

	const requestTopic = denteTelegramCareRequestTopics[topic];
	const issuedDocument = findIssuedTelegramCareDocument(
		organizationScope,
		patient.id,
		topic,
	);
	if (issuedDocument) {
		recordAuditEvent({
			organizationId: organizationScope,
			entityType: "document",
			entityId: issuedDocument.id,
			action: requestTopic.auditIssuedAction,
			reason:
				"Пациент нажал кнопку памятки в Telegram, но персональная памятка уже выпущена в DENTE.",
		});
		persistMutableState();
		return {
			text: requestTopic.responseIssuedText,
			linked: true,
			subjectType: "patient",
			taskId: null,
			eventId: null,
			duplicate: false,
			alreadyIssued: true,
			blockedReason: null,
		};
	}

	const now = new Date().toISOString();
	let duplicate = true;
	let task = findExistingTelegramCareRequestTask(
		organizationScope,
		patient.id,
		topic,
	);
	if (task) {
		task.dueAt = now;
		task.lastEventAt = now;
	} else {
		duplicate = false;
		task = {
			id: randomUUID(),
			organizationId: organizationScope,
			patientId: patient.id,
			appointmentId: null,
			visitId: null,
			documentId: null,
			assignedRole: "doctor",
			channel: "phone",
			intent: "post_visit_instruction",
			status: "needs_call",
			priority: requestTopic.priority,
			dueAt: now,
			title: requestTopic.taskTitle,
			body: requestTopic.taskBody,
			workflowCode: requestTopic.workflowCode,
			lastEventAt: now,
			createdAt: now,
		};
		communicationTasks.unshift(task);
		communicationTasks.splice(300);
	}

	const event: CommunicationEvent = {
		id: randomUUID(),
		organizationId: organizationScope,
		taskId: task.id,
		patientId: patient.id,
		actorUserId: null,
		channel: "telegram",
		direction: "inbound",
		status: "needs_call",
		message: duplicate
			? requestTopic.inboundRepeatedMessage
			: requestTopic.inboundCreatedMessage,
		createdAt: now,
	};
	communicationEvents.unshift(event);
	communicationEvents.splice(500);
	recordAuditEvent({
		organizationId: organizationScope,
		entityType: "patient",
		entityId: patient.id,
		action: duplicate
			? requestTopic.auditRepeatedAction
			: requestTopic.auditCreatedAction,
		reason: duplicate
			? "Пациент повторно нажал кнопку персональной памятки в Telegram."
			: "Пациент нажал кнопку персональной памятки в Telegram.",
	});
	persistMutableState();

	return {
		text: duplicate
			? requestTopic.responseRepeatedText
			: requestTopic.responseCreatedText,
		linked: true,
		subjectType: "patient",
		taskId: task.id,
		eventId: event.id,
		duplicate,
		alreadyIssued: false,
		blockedReason: null,
	};
}

function telegramScheduleLine(
	index: number,
	appointment: Appointment,
	roleLabel: string | null = null,
): string {
	const prefix = `${index + 1}. ${telegramAppointmentTimeLabel(appointment)}`;
	const role = roleLabel ? `, роль: ${roleLabel}` : "";
	return `${prefix}${role}, статус: ${appointmentStatusLabelForTelegram(appointment.status)}.`;
}

function telegramScheduleRoleForStaff(
	appointment: Appointment,
	staffId: string,
): string | null {
	const isDoctor = appointment.doctorUserId === staffId;
	const isAssistant = appointment.assistantUserId === staffId;
	if (isDoctor && isAssistant) return "врач и ассистент";
	if (isDoctor) return "врач";
	if (isAssistant) return "ассистент";
	return null;
}

function visibleTelegramScheduleAppointments(
	organizationScope = denteTelegramBotSettings.organizationId,
	sourceAppointments: readonly Appointment[] = appointments,
): Appointment[] {
	const nowMs = Date.now();
	const graceMs = 15 * 60 * 1000;
	return (sourceAppointments as Appointment[])
		.filter((appointment) => {
			const endsAtMs = Date.parse(appointment.endsAt);
			return (
				appointment.organizationId === organizationScope &&
				telegramScheduleVisibleStatuses.has(appointment.status) &&
				Number.isFinite(endsAtMs) &&
				endsAtMs >= nowMs - graceMs
			);
		})
		.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
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
	const chatLink = activeTelegramChatLinkByFingerprint(
		chatFingerprintValue,
		scope,
	);
	if (!chatLink) {
		return {
			text: "DENTE: расписание доступно только после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
			linked: false,
			subjectType: null,
			appointmentCount: 0,
			blockedReason: "telegram_chat_not_linked",
			replyMarkup: null,
		};
	}

	const appointmentList =
		scope.state?.appointments ?? scope.appointments ?? appointments;
	const visibleAppointments = visibleTelegramScheduleAppointments(
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId,
		appointmentList,
	);
	const linkedAppointments =
		chatLink.subjectType === "patient"
			? visibleAppointments
					.filter((appointment) => appointment.patientId === chatLink.subjectId)
					.slice(0, 3)
			: visibleAppointments
					.filter((appointment) =>
						Boolean(
							telegramScheduleRoleForStaff(appointment, chatLink.subjectId),
						),
					)
					.slice(0, 5);

	if (!linkedAppointments.length) {
		return {
			text: "DENTE: активных записей сейчас нет. Для деталей откройте защищенный портал или свяжитесь с администратором клиники.",
			linked: true,
			subjectType: chatLink.subjectType,
			appointmentCount: 0,
			blockedReason: null,
			replyMarkup:
				chatLink.subjectType === "staff"
					? telegramReplyMarkupFor("staff_daily_digest", null, settings, scope)
					: null,
		};
	}

	if (chatLink.subjectType === "patient") {
		const nearestAppointment = linkedAppointments[0] ?? null;
		return {
			text: [
				"DENTE: ближайшие записи в клинике:",
				...linkedAppointments.map((appointment, index) =>
					telegramScheduleLine(index, appointment),
				),
				"",
				"Подробности, документы и оплата доступны только в DENTE.",
			].join("\n"),
			linked: true,
			subjectType: "patient",
			appointmentCount: linkedAppointments.length,
			blockedReason: null,
			replyMarkup: nearestAppointment
				? telegramScheduleReplyMarkupForPatientAppointment(
						nearestAppointment.id,
						scope,
					)
				: null,
		};
	}

	return {
		text: [
			"DENTE: ваше расписание в клинике:",
			...linkedAppointments.map((appointment, index) =>
				telegramScheduleLine(
					index,
					appointment,
					telegramScheduleRoleForStaff(appointment, chatLink.subjectId),
				),
			),
			"",
			"ФИО пациентов и детали приема доступны только в DENTE.",
		].join("\n"),
		linked: true,
		subjectType: "staff",
		appointmentCount: linkedAppointments.length,
		blockedReason: null,
		replyMarkup: telegramReplyMarkupFor(
			"staff_daily_digest",
			null,
			settings,
			scope,
		),
	};
}

function findExistingTelegramContactRequestTask(
	organizationScope: string,
	patientId: string,
): CommunicationTask | null {
	return (
		communicationTasks.find(
			(task) =>
				task.organizationId === organizationScope &&
				task.patientId === patientId &&
				task.appointmentId === null &&
				task.documentId === null &&
				(task.workflowCode === "telegram_contact_request" ||
					(!task.workflowCode && task.title === "Пациент просит связаться")) &&
				isOpenCommunicationTask(task),
		) ?? null
	);
}

export function createDenteTelegramContactRequest(
	chatFingerprintValue: string | null,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
): {
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	taskId: string | null;
	eventId: string | null;
	duplicate: boolean;
	blockedReason: string | null;
} {
	const chatLink = activeTelegramChatLinkByFingerprint(
		chatFingerprintValue,
		scope,
	);
	if (!chatLink) {
		return {
			text: "DENTE: запрос связи доступен после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	if (chatLink.subjectType !== "patient") {
		return {
			text: "DENTE: вы подключены как сотрудник клиники. Запросы пациентов и очередь администратора доступны в рабочем приложении DENTE.",
			linked: true,
			subjectType: "staff",
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "staff_chat_no_patient_task",
		};
	}

	const organizationScope = chatLink.organizationId;
	const patient = patients.find(
		(candidate) =>
			candidate.organizationId === organizationScope &&
			candidate.id === chatLink.subjectId,
	);
	if (!patient) {
		return {
			text: "DENTE: привязка Telegram найдена, но пациент недоступен. Попросите администратора клиники обновить привязку.",
			linked: false,
			subjectType: "patient",
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_patient_not_found",
		};
	}

	const now = new Date().toISOString();
	let duplicate = true;
	let task = findExistingTelegramContactRequestTask(
		organizationScope,
		patient.id,
	);
	if (task) {
		task.dueAt = now;
		task.lastEventAt = now;
	} else {
		duplicate = false;
		task = {
			id: randomUUID(),
			organizationId: organizationScope,
			patientId: patient.id,
			appointmentId: null,
			visitId: null,
			documentId: null,
			assignedRole: "administrator",
			channel: "phone",
			intent: "general",
			status: "needs_call",
			priority: "normal",
			dueAt: now,
			title: "Пациент просит связаться",
			body: "Пациент нажал кнопку связи в Telegram. Свяжитесь через канал клиники, не передавайте медданные в Telegram.",
			workflowCode: "telegram_contact_request",
			lastEventAt: now,
			createdAt: now,
		};
		communicationTasks.unshift(task);
		communicationTasks.splice(300);
	}

	const event: CommunicationEvent = {
		id: randomUUID(),
		organizationId: organizationScope,
		taskId: task.id,
		patientId: patient.id,
		actorUserId: null,
		channel: "telegram",
		direction: "inbound",
		status: "needs_call",
		message: duplicate
			? "Telegram: пациент повторно нажал кнопку связи."
			: "Telegram: пациент просит связаться с администратором.",
		createdAt: now,
	};
	communicationEvents.unshift(event);
	communicationEvents.splice(500);
	recordAuditEvent({
		organizationId: organizationScope,
		entityType: "patient",
		entityId: patient.id,
		action: duplicate
			? "telegram_contact_request_repeated"
			: "telegram_contact_request_created",
		reason: duplicate
			? "Пациент повторно нажал кнопку связи в Telegram."
			: "Пациент нажал кнопку связи в Telegram.",
	});
	persistMutableState();

	return {
		text: duplicate
			? "Запрос уже есть в очереди администратора DENTE. Мы подняли его наверх и обновили время обращения."
			: "Запрос принят. Администратор клиники увидит задачу в DENTE и свяжется с вами через канал клиники.",
		linked: true,
		subjectType: "patient",
		taskId: task.id,
		eventId: event.id,
		duplicate,
		blockedReason: null,
	};
}

function telegramOutboxSafeTitle(
	templateKind: DenteTelegramTemplateKind,
	subjectType: "patient" | "staff",
): string {
	if (subjectType === "staff") return "Ежедневная сводка DENTE";
	const titles: Record<DenteTelegramTemplateKind, string> = {
		appointment_reminder: "Напоминание о приеме",
		appointment_confirmation: "Подтверждение приема",
		payment_reminder_notice: "Напоминание об оплате",
		document_ready_notice: "Документ готов",
		tax_document_request_status: "Статус налоговых документов",
		callback_request_received: "Запрос обратного звонка",
		post_visit_instruction_link: "Памятка после приема",
		post_visit_checkup: "Контроль после приема",
		recall_notice: "Профилактическое напоминание",
		review_request: "Просьба оценить визит",
		staff_daily_digest: "Ежедневная сводка DENTE",
	};
	return titles[templateKind];
}

function issuedPostVisitRecommendationExists(
	input: {
		patientId: string;
		visitId?: string | null;
		documentId?: string | null;
	},
	organizationScope = denteTelegramBotSettings.organizationId,
): boolean {
	if (!input.visitId && !input.documentId) return false;
	return documents.some((document) => {
		if (document.organizationId !== organizationScope) return false;
		if (document.patientId !== input.patientId) return false;
		if (document.kind !== "post_visit_recommendations") return false;
		if (document.status !== "issued") return false;
		if (!document.payload?.postVisitRecommendations?.safeForTelegramSending)
			return false;
		if (input.documentId && document.id !== input.documentId) return false;
		if (input.visitId && document.visitId !== input.visitId) return false;
		return true;
	});
}

function buildDenteTelegramOutboxItem(
	input: {
		id: string;
		task: CommunicationTask | null;
		subjectType: "patient" | "staff";
		subjectId: string;
		appointmentId?: string | null;
		visitId?: string | null;
		documentId?: string | null;
		templateKind: DenteTelegramTemplateKind;
		scheduledAt: string;
		source:
			| "communication_task"
			| "staff_digest"
			| "document_ready"
			| "payment_reminder"
			| "review_request"
			| "post_visit_instruction"
			| "post_visit_checkup"
			| "recall"
			| "appointment_reminder"
			| "tax_document_request";
	},
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
) {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const { settings } = runtime;
	const feature = telegramFeatureForTemplate(input.templateKind);
	const chatLink = activeTelegramChatLinkFor(
		input.subjectType,
		input.subjectId,
		settings.organizationId,
		runtime.botConfigId,
	);
	const preview =
		input.task && input.subjectType === "patient"
			? renderDenteTelegramMessagePreview(
					{
						templateKind: input.templateKind,
						patientId: input.task.patientId,
						appointmentId: input.task.appointmentId ?? undefined,
						documentId: input.task.documentId ?? undefined,
						taskId: input.task.id,
						includePhi: false,
					},
					settings,
					state,
				)
			: renderDenteTelegramMessagePreview(
					{
						templateKind: input.templateKind,
						patientId:
							input.subjectType === "patient" ? input.subjectId : undefined,
						staffId:
							input.subjectType === "staff" ? input.subjectId : undefined,
						appointmentId: input.appointmentId ?? undefined,
						documentId: input.documentId ?? undefined,
						includePhi: false,
					},
					settings,
					state,
				);
	const warnings = [...preview.warnings];
	const replyMarkup = preview.allowedByDefault
		? telegramReplyMarkupFor(
				input.templateKind,
				input.appointmentId ?? input.task?.appointmentId ?? null,
				settings,
				{
					organizationId: settings.organizationId,
					clinicId: runtime.clinicId,
					botConfigId: runtime.botConfigId,
				},
			)
		: null;
	const transportReady =
		settings.mode !== "disabled" && runtime.botTokenConfigured;
	const chatTransportReady = Boolean(
		chatLink?.chatTransportRef &&
			decryptTelegramChatTransportRef(chatLink.chatTransportRef),
	);
	let deliveryStatus: DenteTelegramOutboxResponse["items"][number]["deliveryStatus"] =
		"ready";
	let blockedReason: string | null = null;

	if (settings.mode === "disabled") {
		deliveryStatus = "disabled";
		blockedReason = "telegram_bot_disabled";
	} else if (feature && !settings.enabledFeatures.includes(feature)) {
		deliveryStatus = "disabled";
		blockedReason = `feature_disabled:${feature}`;
	} else if (!preview.allowedByDefault) {
		deliveryStatus = "blocked_by_policy";
		blockedReason = preview.blockedReason ?? "blocked_by_policy";
	} else if (!chatLink) {
		deliveryStatus = "needs_chat_link";
		blockedReason = "patient_or_staff_not_linked_to_telegram";
	} else if (!transportReady || !chatTransportReady) {
		deliveryStatus = "transport_not_ready";
		blockedReason = !transportReady
			? "telegram_bot_token_missing"
			: "encrypted_chat_transport_missing_or_unreadable";
	} else if (
		input.templateKind === "post_visit_instruction_link" &&
		input.subjectType === "patient" &&
		!issuedPostVisitRecommendationExists(
			{
				patientId: input.subjectId,
				visitId: input.visitId ?? input.task?.visitId ?? null,
				documentId: input.task?.documentId ?? null,
			},
			settings.organizationId,
		)
	) {
		deliveryStatus = "blocked_by_policy";
		blockedReason = "post_visit_recommendation_document_not_issued";
	}

	if (!chatTransportReady && chatLink) {
		warnings.push(
			"Чат привязан, но отправка недоступна до настройки защищенной серверной связки и повторной привязки пользователя.",
		);
	}
	if (blockedReason === "post_visit_recommendation_document_not_issued") {
		warnings.push(
			"Сначала выпустите документ 'Рекомендации после приема' с Telegram-текстом, затем отправляйте памятку пациенту.",
		);
	}

	return {
		id: input.id,
		organizationId: settings.organizationId,
		taskId: input.task?.id ?? null,
		patientId: input.subjectType === "patient" ? input.subjectId : null,
		appointmentId: input.appointmentId ?? input.task?.appointmentId ?? null,
		subjectType: input.subjectType,
		subjectId: input.subjectId,
		chatLinkId: chatLink?.id ?? null,
		templateKind: input.templateKind,
		deliveryStatus,
		scheduledAt: input.scheduledAt,
		title: telegramOutboxSafeTitle(input.templateKind, input.subjectType),
		previewText: preview.text,
		replyMarkup,
		photoUrl: preview.photoUrl,
		warnings,
		blockedReason,
		source: input.source,
	};
}

function paymentReminderOutboxId(
	patientId: string,
	balanceDueKopecks: Kopecks,
): string {
	return `payment-reminder:${patientId}:${debtNumericText(Math.max(0, balanceDueKopecks))}`;
}

function paymentReminderAlreadyCovered(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}

function patientPaymentDebtKopecks(
	patientId: string,
	organizationScope = denteTelegramBotSettings.organizationId,
	state: DomainState = inMemoryDomainState,
): Kopecks {
	const ledger = buildPatientLedger(
		patientId,
		state.treatmentPlanItems.filter(
			(item) => item.organizationId === organizationScope,
		),
		state.payments.filter((payment) => payment.organizationId === organizationScope),
	);
	return patientOwesClinicKopecks(ledger);
}

function patientPaymentReminderScheduledAt(
	patientId: string,
	organizationScope = denteTelegramBotSettings.organizationId,
	state: DomainState = inMemoryDomainState,
): string {
	const latestPaidAtMs = state.payments
		.filter(
			(payment) =>
				payment.organizationId === organizationScope &&
				payment.patientId === patientId &&
				payment.status === "paid",
		)
		.reduce((latest, payment) => {
			const paidAtMs = Date.parse(payment.paidAt ?? payment.createdAt);
			return Number.isFinite(paidAtMs) ? Math.max(latest, paidAtMs) : latest;
		}, 0);
	const baseMs = latestPaidAtMs || Date.now();
	return new Date(baseMs + 30 * 60 * 1000).toISOString();
}

function buildDenteTelegramPaymentReminderItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	return state.patients.flatMap((patient) => {
		if (patient.organizationId !== organizationScope) return [];
		if (patient.status !== "active") return [];

		/*
		 * Отказ модуля ловится, а не летит наверх. Модуль отвергает суммы,
		 * потерявшие точность, и количество вне общего контракта; одна такая
		 * строка у одного пациента не должна ронять ВСЮ очередь отправок клиники
		 * пятисоткой — иначе из-за одной испорченной цены не уйдёт ни одно
		 * напоминание, ни одно подтверждение записи, ни одна памятка. Цена этой
		 * ветки названа прямо: напоминание этому пациенту не уйдёт, и причина
		 * обязана быть в журнале целиком, иначе потерянные деньги никто не найдёт.
		 */
		let balanceDueKopecks: Kopecks;
		try {
			balanceDueKopecks = patientPaymentDebtKopecks(
				patient.id,
				organizationScope,
				state,
			);
		} catch (error) {
			if (
				error instanceof MoneyPrecisionError ||
				error instanceof QuantityContractError
			) {
				console.error(
					`[Telegram] Напоминание об оплате пациенту ${patient.id} не построено: ${error.message} ` +
						"Долг не рассчитан, поэтому напоминание не уйдёт — почините строку денег, названную в причине.",
				);
				return [];
			}
			throw error;
		}
		if (balanceDueKopecks <= 0) return [];

		const itemId = paymentReminderOutboxId(patient.id, balanceDueKopecks);
		if (paymentReminderAlreadyCovered(itemId)) return [];

		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: patient.id,
					templateKind: "payment_reminder_notice",
					scheduledAt: patientPaymentReminderScheduledAt(
						patient.id,
						organizationScope,
						state,
					),
					source: "payment_reminder",
				},
				runtime,
				state,
			),
		];
	});
}

function recallOutboxId(item: TreatmentPlanItem): string {
	return `recall:${item.visitId ?? item.id}:${item.patientId}`;
}

function recallAlreadyCovered(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}

function treatmentPlanItemAppointment(
	item: TreatmentPlanItem,
): Appointment | null {
	if (!item.visitId) return null;
	const visit = findVisitById(item.visitId);
	return visit
		? (appointments.find(
				(appointment) => appointment.id === visit.appointmentId,
			) ?? null)
		: null;
}

function recallScheduledAt(item: TreatmentPlanItem): string {
	const appointment = treatmentPlanItemAppointment(item);
	const appointmentEndMs = appointment ? Date.parse(appointment.endsAt) : NaN;
	const base = new Date(
		Number.isFinite(appointmentEndMs) ? appointmentEndMs : Date.now(),
	);
	base.setUTCMonth(base.getUTCMonth() + 6);
	return base.toISOString();
}

function buildDenteTelegramRecallItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const activePatientsMap = new Map(
		state.patients.filter((p) => p.status === "active").map((p) => [p.id, p]),
	);
	return state.treatmentPlanItems.flatMap((item) => {
		if (item.organizationId !== organizationScope) return [];
		if (item.status !== "completed") return [];

		// БЫЛО: только индекс, без запасного поиска по прайсу. Услуга, добавленная
		// после построения индекса, не находилась, и напоминание о гигиене
		// пациенту не уходило вовсе.
		const service = getServiceCatalogItem(item.serviceId, state);
		if (service?.category !== "hygiene") return [];

		const patient = activePatientsMap.get(item.patientId);
		if (!patient) return [];

		const itemId = recallOutboxId(item);
		if (recallAlreadyCovered(itemId)) return [];

		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: item.patientId,
					visitId: item.visitId,
					templateKind: "recall_notice",
					scheduledAt: recallScheduledAt(item),
					source: "recall",
				},
				runtime,
				state,
			),
		];
	});
}

export function findDenteTelegramOutboxDeliveryReceipt(
	outboxItemId: string,
	clientMutationId: string | null | undefined,
): DenteTelegramOutboxDeliveryReceipt | null {
	if (!clientMutationId) return null;
	return (
		denteTelegramOutboxDeliveryReceiptsMap.get(
			`${outboxItemId}:${clientMutationId}`,
		) ?? null
	);
}

export function claimDenteTelegramOutboxDeliveryReceipt(
	item: DenteTelegramOutboxItem,
	clientMutationId: string,
	warnings: string[],
): DenteTelegramOutboxDeliveryReceipt | null {
	const existing = findDenteTelegramOutboxDeliveryReceipt(
		item.id,
		clientMutationId,
	);
	if (existing?.status === "failed" && clientMutationId.startsWith("due-"))
		return null;
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
	denteTelegramOutboxDeliveryReceiptsMap.set(
		`${receipt.outboxItemId}:${receipt.clientMutationId}`,
		receipt,
	);
	const removed = denteTelegramOutboxDeliveryReceipts.splice(200);
	for (const r of removed) {
		denteTelegramOutboxDeliveryReceiptsMap.delete(
			`${r.outboxItemId}:${r.clientMutationId}`,
		);
	}
	persistMutableState();
	return null;
}

function reviewRequestOutboxIdForVisit(
	visitId: string,
	patientId: string,
): string {
	return `review:${visitId}:${patientId}`;
}

function reviewRequestScheduledAtFromBase(
	baseAt: string | null | undefined,
	fallbackAt = nowIso,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string {
	const baseMs = Date.parse(baseAt ?? "");
	if (!Number.isFinite(baseMs)) return fallbackAt;
	return new Date(
		baseMs +
			normalizeReviewRequestDelayHours(settings.reviewRequestDelayHours) *
				60 *
				60 *
				1000,
	).toISOString();
}

function reviewRequestScheduledAt(
	payment: Payment,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string {
	return reviewRequestScheduledAtFromBase(
		payment.paidAt ?? payment.createdAt,
		payment.createdAt,
		settings,
	);
}

function reviewRequestScheduledAtForVisit(
	visit: Visit,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string {
	const appointment =
		appointments.find((item) => item.id === visit.appointmentId) ?? null;
	return reviewRequestScheduledAtFromBase(
		appointment?.endsAt ?? visit.updatedAt ?? visit.createdAt,
		visit.updatedAt ?? visit.createdAt,
		settings,
	);
}

function reviewRequestAlreadySent(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}

function telegramOutboxItemAlreadySent(outboxItemId: string): boolean {
	return auditEvents.some(
		(event) =>
			event.entityType === "telegram_outbox" &&
			event.entityId === outboxItemId &&
			event.action === "telegram_outbound_sent",
	);
}

function postVisitInstructionOutboxId(
	visitId: string,
	patientId: string,
): string {
	return `post-visit:${visitId}:${patientId}`;
}

function postVisitInstructionScheduledAt(visitId: string): string {
	const appointment =
		activeVisit.id === visitId
			? (appointments.find((item) => item.id === activeVisit.appointmentId) ??
				null)
			: null;
	if (!appointment?.endsAt) return nowIso;
	const baseMs = Date.parse(appointment.endsAt);
	if (!Number.isFinite(baseMs)) return nowIso;
	return new Date(baseMs + 15 * 60 * 1000).toISOString();
}

function postVisitInstructionTaskKeepsOutboxClaim(
	task: CommunicationTask,
): boolean {
	if (["sent", "delivered", "completed"].includes(task.status)) return true;
	return task.channel === "telegram" && isOpenCommunicationTask(task);
}

function postVisitInstructionAlreadyCovered(
	visitId: string,
	patientId: string,
	outboxItemId: string,
): boolean {
	const hasTask = communicationTasks.some(
		(task) =>
			task.patientId === patientId &&
			task.visitId === visitId &&
			task.intent === "post_visit_instruction" &&
			postVisitInstructionTaskKeepsOutboxClaim(task),
	);
	if (hasTask) return true;
	return auditEvents.some(
		(event) =>
			event.entityType === "telegram_outbox" &&
			event.entityId === outboxItemId &&
			event.action === "telegram_outbound_sent",
	);
}

function appointmentReminderOutboxId(
	appointment: Appointment,
	leadTimeHours: number,
): string {
	return `appointment-reminder:${appointment.id}:${leadTimeHours}h:${appointment.patientId ?? "unknown"}`;
}

function appointmentReminderScheduledAt(
	appointment: Appointment,
	leadTimeHours: number,
): string {
	const startsAtMs = Date.parse(appointment.startsAt);
	if (!Number.isFinite(startsAtMs)) return nowIso;
	return new Date(startsAtMs - leadTimeHours * 60 * 60 * 1000).toISOString();
}

function appointmentReminderInsideDispatchWindow(
	appointment: Appointment,
	leadTimeHours: number,
	nowMs: number,
): boolean {
	const startsAtMs = Date.parse(appointment.startsAt);
	if (!Number.isFinite(startsAtMs) || startsAtMs <= nowMs) return false;
	const scheduledAtMs = startsAtMs - leadTimeHours * 60 * 60 * 1000;
	if (!Number.isFinite(scheduledAtMs) || scheduledAtMs >= startsAtMs)
		return false;
	return (
		scheduledAtMs >= nowMs ||
		nowMs - scheduledAtMs <= appointmentReminderDispatchGraceMs
	);
}

function appointmentReminderAlreadySent(outboxItemId: string): boolean {
	return auditEvents.some(
		(event) =>
			event.entityType === "telegram_outbox" &&
			event.entityId === outboxItemId &&
			event.action === "telegram_outbound_sent",
	);
}

function taxDocumentRequestOutboxId(document: GeneratedDocument): string {
	return `tax-request:${document.id}:${document.patientId}`;
}

function taxDocumentRequestAlreadySent(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}

function taxApplicationScheduledAt(document: GeneratedDocument): string {
	const requestedAt =
		document.payload?.taxDeductionApplication?.requestedAt ??
		document.issuedAt ??
		nowIso;
	const requestedAtMs = Date.parse(requestedAt);
	if (!Number.isFinite(requestedAtMs)) return nowIso;
	return new Date(requestedAtMs + 15 * 60 * 1000).toISOString();
}

function taxApplicationSlaWarning(document: GeneratedDocument): string | null {
	const requestedAt =
		document.payload?.taxDeductionApplication?.requestedAt ?? document.issuedAt;
	const requestedAtMs = Date.parse(requestedAt ?? "");
	if (!Number.isFinite(requestedAtMs)) return null;
	const ageDays = Math.floor(
		(Date.now() - requestedAtMs) / (24 * 60 * 60 * 1000),
	);
	if (ageDays >= 30) {
		return "Заявление на налоговую справку старше 30 дней. Если клиника отправляет сведения в ФНС электронно, проверьте ТКС/КЭП и корректировку вручную.";
	}
	if (ageDays >= 25) {
		return "До 30-дневного срока по электронному направлению сведений в ФНС осталось меньше недели. Проверьте готовность справки и ТКС-выгрузки.";
	}
	return null;
}

function buildDenteTelegramTaxDocumentRequestItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	// Один индекс активных пациентов вместо линейного поиска на каждый документ.
	const activePatientIds = new Set(
		state.patients
			.filter((candidate) => candidate.status === "active")
			.map((candidate) => candidate.id),
	);
	return state.documents.flatMap((document) => {
		if (document.organizationId !== organizationScope) return [];
		if (document.kind !== "tax_deduction_application") return [];
		if (document.status !== "issued") return [];
		if (!document.payload?.taxDeductionApplication) return [];
		if (!document.patientId) return [];
		if (!activePatientIds.has(document.patientId)) return [];

		const itemId = taxDocumentRequestOutboxId(document);
		if (taxDocumentRequestAlreadySent(itemId)) return [];

		const item = buildDenteTelegramOutboxItem(
			{
				id: itemId,
				task: null,
				subjectType: "patient",
				subjectId: document.patientId,
				documentId: document.id,
				templateKind: "tax_document_request_status",
				scheduledAt: taxApplicationScheduledAt(document),
				source: "tax_document_request",
			},
			runtime,
			state,
		);
		const warning = taxApplicationSlaWarning(document);
		return warning
			? [{ ...item, warnings: uniqueStrings([...item.warnings, warning]) }]
			: [item];
	});
}

const documentReadyNoticeExcludedKinds = new Set<DocumentKind>([
	"tax_deduction_application",
	"post_visit_recommendations",
]);

function documentReadyOutboxId(document: GeneratedDocument): string {
	return `document-ready:${document.id}:${document.patientId}`;
}

function documentReadyScheduledAt(document: GeneratedDocument): string {
	const issuedAtMs = Date.parse(document.issuedAt ?? "");
	if (!Number.isFinite(issuedAtMs)) return nowIso;
	return new Date(issuedAtMs + 5 * 60 * 1000).toISOString();
}

function documentReadyTaskKeepsOutboxClaim(task: CommunicationTask): boolean {
	if (["sent", "delivered", "completed"].includes(task.status)) return true;
	return task.channel === "telegram" && isOpenCommunicationTask(task);
}

function documentReadyAlreadyCovered(
	document: GeneratedDocument,
	outboxItemId: string,
): boolean {
	const hasTask = communicationTasks.some(
		(task) =>
			task.patientId === document.patientId &&
			task.documentId === document.id &&
			task.intent === "document_ready" &&
			task.channel === "telegram" &&
			documentReadyTaskKeepsOutboxClaim(task),
	);
	return hasTask || telegramOutboxItemAlreadySent(outboxItemId);
}

function buildDenteTelegramDocumentReadyItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;

	const activePatients = new Map<string, Patient>();
	for (const p of state.patients) {
		if (p.status === "active") {
			activePatients.set(p.id, p);
		}
	}

	return state.documents.flatMap((document) => {
		if (document.organizationId !== organizationScope) return [];
		if (document.status !== "issued") return [];
		if (documentReadyNoticeExcludedKinds.has(document.kind)) return [];
		const patient = activePatients.get(document.patientId);
		if (!patient) return [];

		const itemId = documentReadyOutboxId(document);
		if (documentReadyAlreadyCovered(document, itemId)) return [];

		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: document.patientId,
					documentId: document.id,
					templateKind: "document_ready_notice",
					scheduledAt: documentReadyScheduledAt(document),
					source: "document_ready",
				},
				runtime,
				state,
			),
		];
	});
}

function staffDailyDigestOutboxId(staffId: string, now = new Date()): string {
	return `staff-digest:${appointmentClinicDateKey(now.toISOString())}:${staffId}`;
}

function staffDailyDigestAlreadySent(outboxItemId: string): boolean {
	return auditEvents.some(
		(event) =>
			event.entityType === "telegram_outbox" &&
			event.entityId === outboxItemId &&
			event.action === "telegram_outbound_sent",
	);
}

function buildDenteTelegramAppointmentReminderItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const { settings } = runtime;
	const nowMs = Date.now();
	const activePatientsMap = new Map(
		state.patients.filter((p) => p.status === "active").map((p) => [p.id, p]),
	);
	return state.appointments.flatMap((appointment) => {
		if (appointment.organizationId !== settings.organizationId) return [];
		if (!appointment.patientId) return [];
		const patientId = appointment.patientId;
		if (!["planned", "confirmed"].includes(appointment.status)) return [];
		const startsAtMs = Date.parse(appointment.startsAt);
		if (!Number.isFinite(startsAtMs) || startsAtMs <= nowMs) return [];
		const patient = activePatientsMap.get(patientId);
		if (!patient) return [];
		return normalizeAppointmentReminderLeadTimes(
			settings.appointmentReminderLeadTimesHours,
		).flatMap((leadTimeHours) => {
			const itemId = appointmentReminderOutboxId(appointment, leadTimeHours);
			if (appointmentReminderAlreadySent(itemId)) return [];
			if (
				!appointmentReminderInsideDispatchWindow(
					appointment,
					leadTimeHours,
					nowMs,
				)
			)
				return [];

			return [
				buildDenteTelegramOutboxItem(
					{
						id: itemId,
						task: null,
						subjectType: "patient",
						subjectId: patientId,
						appointmentId: appointment.id,
						templateKind: "appointment_reminder",
						scheduledAt: appointmentReminderScheduledAt(
							appointment,
							leadTimeHours,
						),
						source: "appointment_reminder",
					},
					runtime,
					state,
				),
			];
		});
	});
}

function buildDenteTelegramPostVisitInstructionItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const visitPatientPairs = new Map<
		string,
		{ visitId: string; patientId: string }
	>();
	const activePatientsMap = new Map(
		state.patients.filter((p) => p.status === "active").map((p) => [p.id, p]),
	);
	for (const item of state.treatmentPlanItems) {
		if (!item.visitId || item.organizationId !== organizationScope) continue;
		if (item.status !== "completed" && item.status !== "in_progress") continue;
		const patient = activePatientsMap.get(item.patientId);
		if (!patient) continue;
		visitPatientPairs.set(`${item.visitId}:${item.patientId}`, {
			visitId: item.visitId,
			patientId: item.patientId,
		});
	}
	for (const document of state.documents) {
		if (document.organizationId !== organizationScope) continue;
		if (document.kind !== "post_visit_recommendations") continue;
		if (document.status !== "issued") continue;
		if (
			!document.visitId ||
			!document.payload?.postVisitRecommendations?.safeForTelegramSending
		)
			continue;
		const patient = activePatientsMap.get(document.patientId);
		if (!patient) continue;
		visitPatientPairs.set(`${document.visitId}:${document.patientId}`, {
			visitId: document.visitId,
			patientId: document.patientId,
		});
	}

	return [...visitPatientPairs.values()].flatMap(({ visitId, patientId }) => {
		const itemId = postVisitInstructionOutboxId(visitId, patientId);
		if (postVisitInstructionAlreadyCovered(visitId, patientId, itemId))
			return [];
		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: patientId,
					visitId,
					templateKind: "post_visit_instruction_link",
					scheduledAt: postVisitInstructionScheduledAt(visitId),
					source: "post_visit_instruction",
				},
				runtime,
				state,
			),
		];
	});
}

function postVisitCheckupOutboxId(document: GeneratedDocument): string {
	return `post-visit-checkup:${document.visitId ?? document.id}:${document.patientId}`;
}

function postVisitCheckupDelayHours(
	careTopic: PostVisitCareTopic,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): number {
	const delays = normalizePostVisitCheckupDelayHoursByTopic(
		settings.postVisitCheckupDelayHoursByTopic,
	);
	return delays[careTopic] ?? delays.other;
}

function postVisitCheckupScheduledAt(
	document: GeneratedDocument,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string {
	const issuedAtMs = Date.parse(document.issuedAt ?? "");
	const baseMs = Number.isFinite(issuedAtMs) ? issuedAtMs : Date.now();
	const careTopic =
		document.payload?.postVisitRecommendations?.careTopic ?? "other";
	return new Date(
		baseMs + postVisitCheckupDelayHours(careTopic, settings) * 60 * 60 * 1000,
	).toISOString();
}

function postVisitCheckupAlreadyCovered(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}

function buildDenteTelegramPostVisitCheckupItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	return state.documents.flatMap((document) => {
		if (document.organizationId !== organizationScope) return [];
		if (document.kind !== "post_visit_recommendations") return [];
		if (document.status !== "issued") return [];
		if (!document.visitId) return [];
		if (!document.payload?.postVisitRecommendations?.safeForTelegramSending)
			return [];
		const patient = state.patients.find(
			(candidate) =>
				candidate.id === document.patientId && candidate.status === "active",
		);
		if (!patient) return [];

		const itemId = postVisitCheckupOutboxId(document);
		if (postVisitCheckupAlreadyCovered(itemId)) return [];

		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: document.patientId,
					visitId: document.visitId,
					documentId: document.id,
					templateKind: "post_visit_checkup",
					scheduledAt: postVisitCheckupScheduledAt(document, runtime.settings),
					source: "post_visit_checkup",
				},
				runtime,
				state,
			),
		];
	});
}

function reviewRequestVisitIsClosedByVisit(visit: Visit): boolean {
	if (visit.status === "signed") return true;
	const appointment =
		appointments.find((item) => item.id === visit.appointmentId) ?? null;
	return appointment?.status === "completed";
}

function reviewRequestClosedVisitCandidates(
	organizationScope = denteTelegramBotSettings.organizationId,
): Visit[] {
	return [activeVisit].filter((visit) => {
		if (visit.organizationId !== organizationScope) return false;
		const patient =
			patients.find(
				(candidate) =>
					candidate.id === visit.patientId && candidate.status === "active",
			) ?? null;
		return Boolean(patient && reviewRequestVisitIsClosedByVisit(visit));
	});
}

function buildDenteTelegramReviewRequestItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const seenSubjects = new Set<string>();
	const items: DenteTelegramOutboxItem[] = [];
	const pushReviewRequest = (input: {
		patientId: string;
		visitId: string | null;
		appointmentId?: string | null;
		paymentId?: string | null;
		scheduledAt: string;
	}) => {
		const sourceId = input.visitId ?? input.paymentId;
		if (!sourceId) return;
		const subjectKey = `${sourceId}:${input.patientId}`;
		if (seenSubjects.has(subjectKey)) return;
		const itemId = input.visitId
			? reviewRequestOutboxIdForVisit(input.visitId, input.patientId)
			: `review:${sourceId}:${input.patientId}`;
		if (reviewRequestAlreadySent(itemId)) return;
		seenSubjects.add(subjectKey);
		items.push(
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: input.patientId,
					appointmentId: input.appointmentId ?? null,
					visitId: input.visitId,
					templateKind: "review_request",
					scheduledAt: input.scheduledAt,
					source: "review_request",
				},
				runtime,
				state,
			),
		);
	};

	const closedVisits = reviewRequestClosedVisitCandidates(
		organizationScope,
	).sort((left, right) =>
		(right.updatedAt ?? right.createdAt).localeCompare(
			left.updatedAt ?? left.createdAt,
		),
	);
	for (const visit of closedVisits) {
		pushReviewRequest({
			patientId: visit.patientId,
			visitId: visit.id,
			appointmentId: visit.appointmentId,
			scheduledAt: reviewRequestScheduledAtForVisit(visit, runtime.settings),
		});
	}

	const paidMilestones = [...state.payments]
		.filter(
			(payment) =>
				payment.organizationId === organizationScope &&
				payment.status === "paid",
		)
		.sort((left, right) =>
			(right.paidAt ?? right.createdAt).localeCompare(
				left.paidAt ?? left.createdAt,
			),
		);

	const activePatientsById = new Map(
		state.patients.filter((p) => p.status === "active").map((p) => [p.id, p]),
	);

	for (const payment of paidMilestones) {
		const patient = activePatientsById.get(payment.patientId) ?? null;
		if (!patient || !reviewRequestVisitIsClosed(payment)) continue;
		const visit = payment.visitId ? findVisitById(payment.visitId) : null;
		pushReviewRequest({
			patientId: payment.patientId,
			visitId: payment.visitId ?? null,
			appointmentId: visit?.appointmentId ?? null,
			paymentId: payment.id,
			scheduledAt: reviewRequestScheduledAt(payment, runtime.settings),
		});
	}

	return items;
}

function reviewRequestVisitIsClosed(payment: Payment): boolean {
	if (!payment.visitId) return false;
	const visit = findVisitById(payment.visitId);
	if (!visit) return false;
	return reviewRequestVisitIsClosedByVisit(visit);
}

function denteTelegramMainMenuRow(): Array<{
	text: string;
	callback_data: string;
}> {
	return [{ text: "Главное меню", callback_data: "dente:start" }];
}

function telegramReplyMarkupForReviewRequest(
	settings: DenteTelegramBotSettings,
): Record<string, unknown> | null {
	const reviewUrl = safeHttpsUrl(settings.clinicReviewUrl);
	const mapsUrl = safeHttpsUrl(settings.clinicMapsUrl);
	const buttons: Array<{ text: string; url: string }> = [];
	if (reviewUrl) buttons.push({ text: "Оценить клинику", url: reviewUrl });
	if (mapsUrl) buttons.push({ text: "Открыть карту", url: mapsUrl });
	return buttons.length
		? { inline_keyboard: [buttons, denteTelegramMainMenuRow()] }
		: null;
}

function telegramReplyMarkupForAppointment(
	appointmentId: string | null,
	signedAppointmentCallbackScope: Record<string, unknown>,
): Record<string, unknown> | null {
	if (appointmentId) {
		if (!denteTelegramAppointmentCallbacksReady()) {
			return {
				inline_keyboard: [
					[
						{ text: "Связаться с клиникой", callback_data: "dente:contact" },
						{ text: "Конфиденциальность", callback_data: "dente:privacy" },
					],
					denteTelegramMainMenuRow(),
				],
			};
		}
		return {
			inline_keyboard: [
				[
					{
						text: "Подтвердить",
						callback_data: buildDenteTelegramAppointmentCallbackData(
							"confirm",
							appointmentId,
							signedAppointmentCallbackScope,
						),
					},
					{
						text: "Перенести",
						callback_data: buildDenteTelegramAppointmentCallbackData(
							"reschedule",
							appointmentId,
							signedAppointmentCallbackScope,
						),
					},
				],
				[
					{
						text: "Позвоните мне",
						callback_data: buildDenteTelegramAppointmentCallbackData(
							"call_request",
							appointmentId,
							signedAppointmentCallbackScope,
						),
					},
					{ text: "Конфиденциальность", callback_data: "dente:privacy" },
				],
				denteTelegramMainMenuRow(),
			],
		};
	}

	return {
		inline_keyboard: [
			[
				{ text: "Связаться с клиникой", callback_data: "dente:contact" },
				{ text: "Конфиденциальность", callback_data: "dente:privacy" },
			],
			denteTelegramMainMenuRow(),
		],
	};
}

function telegramReplyMarkupForDocumentReadyNotice(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Документы", callback_data: "dente:documents" },
			{ text: "Связаться", callback_data: "dente:contact" },
		],
		[{ text: "Конфиденциальность", callback_data: "dente:privacy" }],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

function telegramReplyMarkupForTaxDocumentRequestStatus(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Налоговая", callback_data: "dente:tax" },
			{ text: "Документы", callback_data: "dente:documents" },
		],
		[
			{ text: "Связаться", callback_data: "dente:contact" },
			{ text: "Конфиденциальность", callback_data: "dente:privacy" },
		],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

function telegramReplyMarkupForPaymentReminderNotice(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Оплата и чеки", callback_data: "dente:billing" },
			{ text: "Документы", callback_data: "dente:documents" },
		],
		[
			{ text: "Связаться", callback_data: "dente:contact" },
			{ text: "Конфиденциальность", callback_data: "dente:privacy" },
		],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

function telegramReplyMarkupForPostVisit(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Памятки", callback_data: "dente:care" },
			{ text: "Связаться", callback_data: "dente:contact" },
		],
		[{ text: "Конфиденциальность", callback_data: "dente:privacy" }],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

function telegramReplyMarkupForRecallNotice(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Расписание", callback_data: "dente:schedule" },
			{ text: "Связаться", callback_data: "dente:contact" },
		],
		[{ text: "Конфиденциальность", callback_data: "dente:privacy" }],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

function telegramReplyMarkupForStaffDailyDigest(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Расписание", callback_data: "dente:schedule" },
			{ text: "Связь", callback_data: "dente:contact" },
		],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

function telegramReplyMarkupFor(
	templateKind: DenteTelegramTemplateKind,
	appointmentId: string | null = null,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	appointmentCallbackScope: DenteTelegramAppointmentCallbackScope = {},
): Record<string, unknown> | null {
	const portalRow = denteTelegramPortalRowForTemplate(templateKind, settings);
	const signedAppointmentCallbackScope =
		normalizeDenteTelegramAppointmentCallbackScope(
			appointmentCallbackScope,
			settings,
		);

	switch (templateKind) {
		case "review_request":
			return telegramReplyMarkupForReviewRequest(settings);
		case "appointment_reminder":
		case "appointment_confirmation":
			return telegramReplyMarkupForAppointment(
				appointmentId,
				signedAppointmentCallbackScope,
			);
		case "document_ready_notice":
			return telegramReplyMarkupForDocumentReadyNotice(portalRow);
		case "tax_document_request_status":
			return telegramReplyMarkupForTaxDocumentRequestStatus(portalRow);
		case "payment_reminder_notice":
			return telegramReplyMarkupForPaymentReminderNotice(portalRow);
		case "post_visit_instruction_link":
		case "post_visit_checkup":
			return telegramReplyMarkupForPostVisit(portalRow);
		case "recall_notice":
			return telegramReplyMarkupForRecallNotice(portalRow);
		case "staff_daily_digest":
			return telegramReplyMarkupForStaffDailyDigest(portalRow);
		default:
			return null;
	}
}

function telegramScheduleReplyMarkupForPatientAppointment(
	appointmentId: string,
	scope: DenteTelegramAppointmentCallbackScope = {},
): Record<string, unknown> {
	const appointmentMarkup = telegramReplyMarkupFor(
		"appointment_confirmation",
		appointmentId,
		denteTelegramBotSettings,
		scope,
	);
	const appointmentRows = Array.isArray(appointmentMarkup?.inline_keyboard)
		? appointmentMarkup.inline_keyboard
		: [];
	return {
		inline_keyboard: [
			...appointmentRows,
			[
				{ text: "Расписание", callback_data: "dente:schedule" },
				{ text: "Документы", callback_data: "dente:documents" },
			],
		],
	};
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
			item: DenteTelegramOutboxItem | null;
			blockedReason: string;
			warnings: string[];
	  } {
	const item = findDenteTelegramOutboxItem(outboxItemId, runtimeScope, state);
	if (!item) {
		return {
			ok: false,
			statusCode: 404,
			item: null,
			blockedReason: "telegram_outbox_item_not_found_or_no_longer_open",
			warnings: [],
		};
	}

	if (telegramOutboxItemAlreadySent(item.id)) {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: "telegram_outbox_already_sent",
			warnings: [
				...item.warnings,
				"Это сообщение уже было отправлено. Обновите очередь перед повторной рассылкой.",
			],
		};
	}

	const scheduledAtMs = Date.parse(item.scheduledAt);
	if (Number.isFinite(scheduledAtMs) && scheduledAtMs > Date.now()) {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: "telegram_outbox_not_due_yet",
			warnings: [
				...item.warnings,
				"Запланированное время отправки еще не наступило.",
			],
		};
	}

	if (item.deliveryStatus !== "ready") {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: item.blockedReason ?? item.deliveryStatus,
			warnings: item.warnings,
		};
	}

	const chatLink = item.chatLinkId
		? (denteTelegramChatLinks.find(
				(link) => link.id === item.chatLinkId && link.status === "active",
			) ?? null)
		: null;
	const chatId = decryptTelegramChatTransportRef(chatLink?.chatTransportRef);
	if (!chatId) {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: "encrypted_chat_transport_missing_or_unreadable",
			warnings: [
				...item.warnings,
				"Повторно привяжите чат после настройки защищенной серверной связки.",
			],
		};
	}

	if (!item.previewText.trim()) {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: "telegram_outbox_preview_empty",
			warnings: item.warnings,
		};
	}

	return {
		ok: true,
		item,
		chatId,
		text: item.previewText,
		photoUrl: item.photoUrl,
		replyMarkup: item.replyMarkup,
		warnings: item.warnings,
	};
}

export function recordDenteTelegramOutboxDelivery(input: {
	item: DenteTelegramOutboxItem;
	status: "sent" | "failed";
	message: string;
	telegramMessageId?: number | null;
	clientMutationId?: string | null;
	warnings?: string[];
	blockedReason?: string | null;
}): { eventId: string | null; taskId: string | null; taskCompleted: boolean } {
	const now = new Date().toISOString();
	const task = input.item.taskId
		? (communicationTasks.find(
				(candidate) => candidate.id === input.item.taskId,
			) ?? null)
		: null;
	const patientId = input.item.patientId ?? task?.patientId ?? null;
	let eventId: string | null = null;
	const clientMutationId = input.clientMutationId?.trim() || null;

	if (patientId) {
		const event: CommunicationEvent = {
			id: randomUUID(),
			organizationId,
			taskId: input.item.taskId,
			patientId,
			actorUserId: doctorUserId,
			channel: "telegram",
			direction: "outbound",
			status: input.status === "sent" ? "sent" : "failed",
			message: input.message,
			createdAt: now,
		};
		communicationEvents.unshift(event);
		eventId = event.id;
	}

	let taskCompleted = false;
	if (task && input.status === "sent") {
		task.status = "completed";
		task.lastEventAt = now;
		taskCompleted = true;
	} else if (
		task &&
		input.status === "failed" &&
		!["completed", "skipped"].includes(task.status)
	) {
		task.lastEventAt = now;
	}

	recordAuditEvent({
		entityType: "telegram_outbox",
		entityId: input.item.id,
		action:
			input.status === "sent"
				? "telegram_outbound_sent"
				: "telegram_outbound_failed",
		reason:
			input.status === "sent"
				? `Telegram safe template ${input.item.templateKind} sent; message id ${input.telegramMessageId ?? "unknown"}.${
						clientMutationId ? ` clientMutationId=${clientMutationId}.` : ""
					}`
				: `Telegram safe template ${input.item.templateKind} failed: ${input.message}${clientMutationId ? `; clientMutationId=${clientMutationId}` : ""}`,
	});

	if (clientMutationId) {
		const receipt: DenteTelegramOutboxDeliveryReceipt = {
			outboxItemId: input.item.id,
			status: input.status,
			outboxItem: input.item,
			taskId: task?.id ?? input.item.taskId,
			eventId,
			telegramMessageId: input.telegramMessageId ?? null,
			clientMutationId,
			warnings: input.warnings ?? input.item.warnings,
			blockedReason:
				input.blockedReason ??
				(input.status === "failed" ? "telegram_transport_failed" : null),
			createdAt: now,
		};
		const existing = denteTelegramOutboxDeliveryReceiptsMap.get(
			`${receipt.outboxItemId}:${receipt.clientMutationId}`,
		);
		if (existing) {
			Object.assign(existing, receipt);
		} else {
			denteTelegramOutboxDeliveryReceipts.unshift(receipt);
			denteTelegramOutboxDeliveryReceiptsMap.set(
				`${receipt.outboxItemId}:${receipt.clientMutationId}`,
				receipt,
			);
			const removed = denteTelegramOutboxDeliveryReceipts.splice(200);
			for (const r of removed) {
				denteTelegramOutboxDeliveryReceiptsMap.delete(
					`${r.outboxItemId}:${r.clientMutationId}`,
				);
			}
		}
	}

	persistMutableState();
	return { eventId, taskId: task?.id ?? input.item.taskId, taskCompleted };
}

export type DenteTelegramOutboxStatusFilter =
	| DenteTelegramOutboxDeliveryStatus
	| "all"
	| "due";

export type BuildDenteTelegramOutboxOptions = {
	limit?: number;
	cursor?: string | null;
	status?: DenteTelegramOutboxStatusFilter;
	templateKind?: DenteTelegramTemplateKind | "all";
};

type NormalizedDenteTelegramOutboxOptions = {
	limit: number;
	cursor: string;
	status: DenteTelegramOutboxStatusFilter;
	templateKind: DenteTelegramTemplateKind | "all";
};

function normalizeDenteTelegramOutboxOptions(
	input: number | BuildDenteTelegramOutboxOptions = 100,
): NormalizedDenteTelegramOutboxOptions {
	const source = typeof input === "number" ? { limit: input } : input;
	const parsedLimit = Number(source.limit ?? 100);
	const limit = Number.isFinite(parsedLimit)
		? Math.max(1, Math.min(300, Math.trunc(parsedLimit)))
		: 100;
	const parsedCursor = Number.parseInt(source.cursor ?? "0", 10);
	const cursor = String(
		Math.max(0, Number.isFinite(parsedCursor) ? parsedCursor : 0),
	);
	return {
		limit,
		cursor,
		status: source.status ?? "all",
		templateKind: source.templateKind ?? "all",
	};
}

function denteTelegramOutboxItemMatchesStatus(
	item: DenteTelegramOutboxItem,
	status: DenteTelegramOutboxStatusFilter,
	nowMs: number,
): boolean {
	if (status === "all") return true;
	if (status === "due") {
		if (item.deliveryStatus !== "ready") return false;
		const scheduledAtMs = Date.parse(item.scheduledAt);
		return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
	}
	return item.deliveryStatus === status;
}

function buildAllDenteTelegramOutboxItems(
	now: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const taskItems = communicationTasks
		.filter(isOpenCommunicationTask)
		.filter((task) => task.channel === "telegram")
		.filter((task) => task.organizationId === organizationScope)
		.map((task) =>
			buildDenteTelegramOutboxItem(
				{
					id: `task:${task.id}`,
					task,
					subjectType: "patient",
					subjectId: task.patientId,
					visitId: task.visitId,
					templateKind: telegramTemplateKindForTask(task),
					scheduledAt: task.dueAt,
					source: "communication_task",
				},
				runtime,
			),
		);
	const staffDigestItems = denteTelegramChatLinks
		.filter(
			(link) =>
				link.organizationId === organizationScope &&
				link.botConfigId === runtime.botConfigId &&
				link.subjectType === "staff" &&
				link.status === "active",
		)
		.flatMap((link) => {
			const itemId = staffDailyDigestOutboxId(link.subjectId);
			if (staffDailyDigestAlreadySent(itemId)) return [];
			return [
				buildDenteTelegramOutboxItem(
					{
						id: itemId,
						task: null,
						subjectType: "staff",
						subjectId: link.subjectId,
						templateKind: "staff_daily_digest",
						scheduledAt: now,
						source: "staff_digest",
					},
					runtime,
				),
			];
		});
	const paymentReminderItems = buildDenteTelegramPaymentReminderItems(
		runtime,
		state,
	);
	const appointmentReminderItems =
		buildDenteTelegramAppointmentReminderItems(runtime, state);
	const postVisitInstructionItems =
		buildDenteTelegramPostVisitInstructionItems(runtime, state);
	const postVisitCheckupItems =
		buildDenteTelegramPostVisitCheckupItems(runtime, state);
	const recallItems = buildDenteTelegramRecallItems(runtime, state);
	const taxDocumentRequestItems =
		buildDenteTelegramTaxDocumentRequestItems(runtime, state);
	const documentReadyItems = buildDenteTelegramDocumentReadyItems(
		runtime,
		state,
	);
	const reviewRequestItems = buildDenteTelegramReviewRequestItems(
		runtime,
		state,
	);
	const allItems = [
		...taskItems,
		...paymentReminderItems,
		...appointmentReminderItems,
		...postVisitInstructionItems,
		...postVisitCheckupItems,
		...recallItems,
		...taxDocumentRequestItems,
		...documentReadyItems,
		...reviewRequestItems,
		...staffDigestItems,
	].sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
	return allItems;
}

function findDenteTelegramOutboxItem(
	outboxItemId: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem | null {
	return (
		buildAllDenteTelegramOutboxItems(
			new Date().toISOString(),
			runtimeScope,
			state,
		).find((item) => item.id === outboxItemId) ?? null
	);
}

export function buildDenteTelegramOutbox(
	input: number | BuildDenteTelegramOutboxOptions = 100,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxResponse {
	const options = normalizeDenteTelegramOutboxOptions(input);
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const { settings } = runtime;
	const now = new Date().toISOString();
	const allItems = buildAllDenteTelegramOutboxItems(now, runtime, state);
	const warnings: string[] = [];
	const nowMs = Date.now();
	const readyItems = allItems.filter((item) => item.deliveryStatus === "ready");
	const dueCount = readyItems.filter((item) => {
		const scheduledAtMs = Date.parse(item.scheduledAt);
		return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
	}).length;
	const filteredItems = allItems.filter((item) => {
		if (!denteTelegramOutboxItemMatchesStatus(item, options.status, nowMs))
			return false;
		if (
			options.templateKind !== "all" &&
			item.templateKind !== options.templateKind
		)
			return false;
		return true;
	});
	const offset = Number.parseInt(options.cursor, 10);
	const safeOffset = Math.max(0, Number.isFinite(offset) ? offset : 0);
	const items = filteredItems.slice(safeOffset, safeOffset + options.limit);
	const nextOffset = safeOffset + items.length;
	const nextCursor =
		nextOffset < filteredItems.length ? String(nextOffset) : null;

	if (!runtime.botTokenConfigured)
		warnings.push(
			"Подключите бота Telegram в серверных настройках для реальной отправки сообщений.",
		);
	if (!telegramChatEncryptionKey()) {
		warnings.push(
			"Настройте защищенную серверную связку перед хранением обратимых ссылок на Telegram-чат.",
		);
	}
	if (!settings.patientPortalBaseUrl) {
		warnings.push(
			"patientPortalBaseUrl нужен для ссылок на готовые документы, памятки после приема и профилактические приглашения.",
		);
	}

	return denteTelegramOutboxResponseSchema.parse({
		generatedAt: now,
		mode: settings.mode,
		transportReady: settings.mode !== "disabled" && runtime.botTokenConfigured,
		totalCount: allItems.length,
		filteredCount: filteredItems.length,
		limit: options.limit,
		cursor: options.cursor,
		nextCursor,
		readyCount: readyItems.length,
		dueCount,
		notDueCount: readyItems.length - dueCount,
		blockedCount: allItems.filter((item) => item.deliveryStatus !== "ready")
			.length,
		items,
		warnings,
	});
}

export function listDenteTelegramWebhookEvents(
	limit = 20,
	organizationScope = denteTelegramBotSettings.organizationId,
	botConfigId?: string,
): DenteTelegramWebhookEvent[] {
	return denteTelegramWebhookEvents
		.filter(
			(event) =>
				event.organizationId === organizationScope &&
				(!botConfigId || event.botConfigId === botConfigId),
		)
		.slice(0, Math.max(0, Math.min(200, limit)));
}

function findDenteTelegramWebhookUpdate(
	updateId: number,
	organizationScope = denteTelegramBotSettings.organizationId,
	botConfigId?: string,
): DenteTelegramWebhookEvent | null {
	return (
		denteTelegramWebhookEvents.find(
			(event) =>
				event.organizationId === organizationScope &&
				event.updateId === updateId &&
				(!botConfigId || event.botConfigId === botConfigId),
		) ?? null
	);
}

export function hasDenteTelegramWebhookUpdate(
	updateId: number,
	organizationScope = denteTelegramBotSettings.organizationId,
	botConfigId?: string,
): boolean {
	const existing = findDenteTelegramWebhookUpdate(
		updateId,
		organizationScope,
		botConfigId,
	);
	return Boolean(existing && existing.status !== "processing");
}

export function claimDenteTelegramWebhookUpdate(
	input: Pick<
		DenteTelegramWebhookEvent,
		"updateId" | "botConfigId" | "chatFingerprint" | "updateKind" | "command"
	> & { organizationId?: string },
):
	| { claimed: true; event: DenteTelegramWebhookEvent }
	| { claimed: false; event: DenteTelegramWebhookEvent } {
	const organizationScope =
		input.organizationId ?? denteTelegramBotSettings.organizationId;
	const existing = findDenteTelegramWebhookUpdate(
		input.updateId,
		organizationScope,
		input.botConfigId,
	);
	if (existing) {
		if (existing.status !== "processing")
			return { claimed: false, event: existing };
		const createdAtMs = new Date(existing.createdAt).getTime();
		const isStale =
			Number.isNaN(createdAtMs) || Date.now() - createdAtMs > 120_000;
		if (!isStale) return { claimed: false, event: existing };

		const retryEvent: DenteTelegramWebhookEvent = {
			...existing,
			...input,
			organizationId: organizationScope,
			action: "processing_webhook_update_retry",
			warnings: [
				...existing.warnings.filter(
					(warning) => warning !== "stale_processing_retry",
				),
				"stale_processing_retry",
			],
			createdAt: new Date().toISOString(),
		};
		const existingIndex = denteTelegramWebhookEvents.findIndex(
			(event) => event.id === existing.id,
		);
		if (existingIndex >= 0)
			denteTelegramWebhookEvents[existingIndex] = retryEvent;
		persistMutableState();
		return { claimed: true, event: retryEvent };
	}

	const event: DenteTelegramWebhookEvent = {
		...input,
		id: randomUUID(),
		organizationId: organizationScope,
		status: "processing",
		action: "processing_webhook_update",
		warnings: [],
		createdAt: new Date().toISOString(),
	};
	denteTelegramWebhookEvents.unshift(event);
	denteTelegramWebhookEvents.splice(300);
	persistMutableState();
	return { claimed: true, event };
}

export function recordDenteTelegramWebhookEvent(
	input: Omit<DenteTelegramWebhookEvent, "id" | "createdAt"> & {
		organizationId?: string;
	},
): DenteTelegramWebhookEvent {
	const organizationScope =
		input.organizationId ?? denteTelegramBotSettings.organizationId;
	const existingIndex = denteTelegramWebhookEvents.findIndex(
		(event) =>
			event.organizationId === organizationScope &&
			event.updateId === input.updateId &&
			event.botConfigId === input.botConfigId,
	);
	const existing =
		existingIndex >= 0 ? denteTelegramWebhookEvents[existingIndex] : null;
	const event: DenteTelegramWebhookEvent = {
		...input,
		id: existing?.id ?? randomUUID(),
		organizationId: organizationScope,
		createdAt: existing?.createdAt ?? new Date().toISOString(),
	};
	if (existingIndex >= 0) {
		denteTelegramWebhookEvents[existingIndex] = event;
	} else {
		denteTelegramWebhookEvents.unshift(event);
	}
	denteTelegramWebhookEvents.splice(300);
	persistMutableState();
	return event;
}
