/**
 * storeState.ts
 *
 * In-memory state collections, domain state and basic lookup helpers.
 */

import { randomUUID } from "node:crypto";
import type {
	Appointment,
	AuditEvent,
	Chair,
	ClinicProfile,
	ClinicScheduleDefaults,
	CommunicationEvent,
	CommunicationTask,
	DenteTelegramBotSettings,
	DenteTelegramChatLink,
	DenteTelegramLinkCode,
	DenteTelegramOutboxDeliveryReceipt,
	DenteTelegramWebhookEvent,
	GeneratedDocument,
	Patient,
	Payment,
	StaffMember,
	TreatmentPlanItem,
	Visit,
} from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";

export const nowIso = new Date().toISOString();
export const organizationId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
export const doctorUserId = "8356141b-7cfa-4221-95f7-70f47e7344b1";
export const marinaPatientId = "3ebb4567-7777-4f19-8c23-2a78c9962796";
export const defaultClinicTimezone = "Europe/Samara";
export const appointmentReminderDispatchGraceMs = 2 * 60 * 60 * 1000;
const defaultClinicScheduleDefaults: ClinicScheduleDefaults = {
	workdayStart: "09:00",
	workdayEnd: "18:00",
	workingDays: [1, 2, 3, 4, 5],
	appointmentBufferMinutes: 10,
};

export const defaultPostVisitCheckupDelayHoursByTopic = {
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

export const patients = inMemoryPatients;
export const appointments = inMemoryAppointments;
export const staffMembers = inMemoryStaffMembers;
export const clinicProfile = inMemoryClinicProfile;
export const documents = inMemoryDocuments;
export const communicationTasks = inMemoryCommunicationTasks;
export const communicationEvents = inMemoryCommunicationEvents;
export const auditEvents = inMemoryAuditEvents;
export const activeVisit = inMemoryActiveVisit;

export function persistMutableState(): void {
	// In-memory legacy store: no persistent disk mutations
}

const appointmentTimeFormatters = new Map<string, Intl.DateTimeFormat>();

export function getAppointmentTimeFormatter(timeZone: string): Intl.DateTimeFormat {
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

export function appointmentClinicDateKey(
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

export function getServiceCatalogItem(
	serviceId: string,
	state: DomainState = inMemoryDomainState,
) {
	return state.serviceCatalog.find((item) => item.id === serviceId);
}

export function findVisitById(visitId: string): Visit | null {
	return inMemoryActiveVisit.id === visitId ? inMemoryActiveVisit : null;
}

export function isOpenCommunicationTask(task: CommunicationTask): boolean {
	return !["completed", "failed", "skipped"].includes(task.status);
}

export function uniqueStrings(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean)));
}

export function recordAuditEvent(input: {
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

export function normalizePostVisitCheckupDelayHoursByTopic(
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

