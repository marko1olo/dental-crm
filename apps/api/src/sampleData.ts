import {
	createCipheriv,
	createDecipheriv,
	createHash,
	createHmac,
	randomBytes,
	randomUUID,
	timingSafeEqual,
} from "node:crypto";
import {
	copyFileSync,
	mkdirSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import type {
	AcceptVisitDraftInput,
	AcceptVisitDraftResponse,
	AiRecognitionJob,
	Appointment,
	AppointmentReadiness,
	AppointmentStatus,
	AuditEvent,
	BillingSummary,
	Chair,
	ClinicalRule,
	ClinicalRuleEvaluation,
	ClinicalRuleEvaluationInput,
	ClinicalRuleEvaluationResponse,
	ClinicalRuleSummary,
	ClinicMode,
	ClinicProfile,
	ClinicScheduleDefaults,
	ClinicSettings,
	ClinicWorkspaceProfile,
	CommunicationEvent,
	CommunicationSummary,
	CommunicationTask,
	CommunicationTaskOutcome,
	CommunicationTemplate,
	CompleteCommunicationTaskInput,
	CreateAiRecognitionJobInput,
	CreateAppointmentInput,
	CreateChairInput,
	CreateClinicalRuleInput,
	CreateDenteTelegramLinkCodeInput,
	CreatePaymentInput,
	CreateStaffMemberInput,
	Dashboard,
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
	DicomViewerWorkbenchManifestResponse,
	DicomWorkbenchBundle,
	DocumentChainSummary,
	DocumentIssueSignatureAttestation,
	DocumentKind,
	DocumentPayload,
	DocumentReleaseJournalEntry,
	DocumentVoidAttestation,
	GeneratedDocument,
	ImagingSourceKind,
	ImagingStudy,
	ImagingStudyKind,
	ImagingViewerAnnotation,
	ImagingViewerMode,
	ImagingViewerSession,
	ImagingViewerSessionState,
	ImportBatch,
	IntegrationPreset,
	Patient,
	PatientAdministrativeProfile,
	PatientInsight,
	Payment,
	PostVisitCareTopic,
	ProtocolTemplate,
	RecommendedAction,
	ResourceLoad,
	RoleAccessPolicy,
	RoleQueue,
	SaveDicomWorkbenchBundleRequest,
	SaveImagingViewerSessionRequest,
	ScheduleSuggestion,
	ScheduleWarning,
	ServiceCatalogItem,
	ShiftIntelligence,
	SpeechProvider,
	SpeechRecordingAssembly,
	SpeechRecordingRecoveryItem,
	SpeechRecordingRecoveryList,
	SpeechTranscriptionChunk,
	SpeechTranscriptionQuality,
	StaffMember,
	StaffRole,
	StaffWorkingHours,
	TaxPaymentSnapshot,
	TaxXmlSnapshot,
	TaxXmlSourceSnapshot,
	TreatmentPlanItem,
	TreatmentPlanScenario,
	UiPreferences,
	UiPreferencesInput,
	UpdateAppointmentInput,
	UpdateChairWorkingHoursInput,
	UpdateClinicalRuleInput,
	UpdateClinicProfileInput,
	UpdateDenteTelegramBotSettingsInput,
	UpdatePatientAdministrativeProfileInput,
	UpdatePatientInput,
	UpdateStaffWorkingHoursInput,
	Visit,
	VisitDraftAutosave,
	VisitDraftAutosaveRequest,
	VisitSaveReceipt,
} from "@dental/shared";
import {
	createAiRecognitionJobSchema,
	createClinicalRuleSchema,
	denteTelegramChatLinkListResponseSchema,
	denteTelegramChatLinkPublicSchema,
	denteTelegramLinkCodeCreatedSchema,
	denteTelegramLinkCodeListResponseSchema,
	denteTelegramMessagePreviewSchema,
	denteTelegramOutboxResponseSchema,
	documentKindMetadata,
	uiPreferencesSchema,
} from "@dental/shared";
import {
	buildPatientLedger,
	buildVisitLedger,
	debtNumericText,
	type Kopecks,
	MoneyPrecisionError,
	patientOwesClinicKopecks,
	QuantityContractError,
	rublesFromKopecks,
	type VisitLedger,
	visitOutstandingKopecks,
	visitOverpaidKopecks,
} from "./money/patientDebt.js";
import {
	type DentalMutableState,
	loadPersistentState,
	savePersistentState,
} from "./persistentState.js";
import { createTelegramQrSvg } from "./telegramQr.js";
import {
	repairMojibakeDeep,
	repairMojibakeText,
} from "./text/repairMojibake.js";
import {
	buildVisitCloseChecklist,
	type VisitCloseChecklistFacts,
} from "./visitCloseChecklist.js";
import type { DomainState } from "./types/domainState.js";
export type { DomainState };

type PatientAdministrativeProfilePatch = {
	[K in keyof PatientAdministrativeProfile]?:
		| PatientAdministrativeProfile[K]
		| undefined;
};

const organizationId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const doctorUserId = "8356141b-7cfa-4221-95f7-70f47e7344b1";
const assistantUserId = "f365da0c-7094-4f80-b52d-59b7b1254791";
const chairId = "b5450677-b0fc-4228-9672-56b27062783f";
const marinaPatientId = "3ebb4567-7777-4f19-8c23-2a78c9962796";
const alexeyPatientId = "fe736762-aef9-46c2-94d8-0ba5ea1bd11a";
const elmiraPatientId = "46c7b2cb-f4db-49e8-ac4e-ad6b1ecdf1ba";
const activeAppointmentId = "b82038a1-a97f-4f67-8450-c109562f0fd8";
const activeVisitId = "af94df45-a669-4cae-b400-6e4f020f9120";

const nowIso = new Date().toISOString();
const appointmentReminderDispatchGraceMs = 2 * 60 * 60 * 1000;
const defaultClinicTimezone = "Europe/Samara";
const defaultClinicScheduleDefaults: ClinicScheduleDefaults = {
	workdayStart: "09:00",
	workdayEnd: "18:00",
	workingDays: [1, 2, 3, 4, 5],
	appointmentBufferMinutes: 10,
};

import {
	denteTelegramBotSettings,
	denteTelegramWebhookEvents,
	denteTelegramOutboxDeliveryReceipts,
	denteTelegramOutboxDeliveryReceiptsMap,
	syncDenteTelegramOutboxDeliveryReceiptsMap,
	denteTelegramLinkCodes,
	denteTelegramChatLinks,
	normalizeExistingDenteTelegramVisualCardUrls,
	normalizeReviewRequestDelayHours,
	normalizeDenteTelegramBotScopedLedgers,
} from "./services/telegram/telegramLegacyMemoryStore.js";
export * from "./services/telegram/telegramLegacyMemoryStore.js";

const clinicProfile: ClinicProfile = {
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
	currency: "₽",
	themeColor: "teal",
	logoUrl: null,
	stampUrl: null,
	hasAssistants: true,
	hasMultipleChairs: true,
	hasDentalLab: true,
	hasInsuranceCoPay: true,
	hasInstallments: true,
	hasOrthodontics: true,
	hasGnathology: false,
	hasCsoScanner: false,
	hasLeadsKanban: false,
	hasOmnichannel: false,
	hasTasks: true,
	hasReclamations: true,
	workspacePreset: "enterprise",
	onboardingCompleted: false,
	hasPediatricMode: false,
	isOmniRole: false,
	hasPayrollModule: true,
	hasMarketingModule: true,
	hasAnalyticsModule: true,
	hasInventoryModule: true,
	aiEnableTreatmentPlan: true,
	aiEnableRecommendations: true,
	aiEnableDocuments: true,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
} as any;

const staffMembers: StaffMember[] = [
	{
		id: "e44d32ca-7777-4c00-a001-c88f01b92e21",
		organizationId,
		fullName: "Петров Иван Иванович",
		role: "owner",
		specialties: [],
		phone: "+7 927 555-55-55",
		email: "owner@example.com",
		active: true,
		canSignMedicalRecords: false,
		canManageMoney: true,
		canManageImports: true,
		color: "#1e293b",
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: doctorUserId,
		organizationId,
		fullName: "Иванова Марина Сергеевна",
		role: "doctor",
		specialties: ["therapist", "orthopedist"],
		phone: "+7 927 111-22-33",
		email: "doctor@example.com",
		active: true,
		canSignMedicalRecords: true,
		canManageMoney: false,
		canManageImports: false,
		color: "#0f766e",
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: "93bca14f-a11d-4088-9b48-cb7a0fd4c9ef",
		organizationId,
		fullName: "Кузнецова Анна",
		role: "administrator",
		specialties: ["universal"],
		phone: "+7 927 222-10-10",
		email: "admin@example.com",
		active: true,
		canSignMedicalRecords: false,
		canManageMoney: true,
		canManageImports: true,
		color: "#b8781f",
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: assistantUserId,
		organizationId,
		fullName: "Садыкова Эльмира",
		role: "assistant",
		specialties: ["therapist", "surgeon"],
		phone: "+7 927 900-77-10",
		email: null,
		active: true,
		canSignMedicalRecords: false,
		canManageMoney: false,
		canManageImports: false,
		color: "#a34f32",
		createdAt: nowIso,
		updatedAt: nowIso,
	},
];

const chairs: Chair[] = [
	{
		id: chairId,
		organizationId,
		name: "Кресло 1",
		room: "Кабинет 1",
		specialization: "therapist",
		active: true,
		hasXraySensor: true,
		hasMicroscope: false,
		hasSurgeryKit: false,
		notes: "Основное терапевтическое кресло, RVG рядом.",
		workingHours: null,
	},
];

export const patients: Patient[] = [
	{
		id: marinaPatientId,
		organizationId,
		status: "active",
		fullName: "Иванова Марина Сергеевна",
		birthDate: "1988-04-21",
		gender: "female",
		phone: "+7 927 111-22-33",
		email: null,
		notes: "Боится анестезии, предпочитает утренние приемы.",
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: null,
		balanceRub: 0,
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: alexeyPatientId,
		organizationId,
		status: "active",
		fullName: "Петров Алексей Николаевич",
		birthDate: "1979-11-03",
		gender: "male",
		phone: "+7 927 555-19-40",
		email: "petrov@example.com",
		notes: "Нужны документы для налогового вычета.",
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: null,
		balanceRub: 0,
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: elmiraPatientId,
		organizationId,
		status: "active",
		fullName: "Садыкова Эльмира Рустамовна",
		birthDate: null,
		gender: "female",
		phone: "+7 927 900-77-10",
		email: null,
		notes: null,
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: null,
		balanceRub: 0,
		createdAt: nowIso,
		updatedAt: nowIso,
	},
];

export const appointments: Appointment[] = [
	{
		id: activeAppointmentId,
		organizationId,
		patientId: marinaPatientId,
		doctorUserId,
		assistantUserId,
		chairId,
		status: "confirmed",
		startsAt: "2026-05-12T09:00:00+04:00",
		endsAt: "2026-05-12T10:00:00+04:00",
		reason: "Лечение 36",
		comment: "Подготовить согласие и акт.",
	},
	{
		id: "59d16574-5f6e-4cc7-9f49-2da2f126e11d",
		organizationId,
		patientId: alexeyPatientId,
		doctorUserId,
		assistantUserId,
		chairId,
		status: "planned",
		startsAt: "2026-05-12T10:30:00+04:00",
		endsAt: "2026-05-12T11:15:00+04:00",
		reason: "Профгигиена",
		comment: "После оплаты выдать справку для вычета.",
	},
	{
		id: "286c0899-f2cc-4e72-833d-a1e89036e319",
		organizationId,
		patientId: elmiraPatientId,
		doctorUserId,
		assistantUserId: null,
		chairId,
		status: "planned",
		startsAt: "2026-05-12T12:00:00+04:00",
		endsAt: "2026-05-12T12:30:00+04:00",
		reason: "Первичная консультация",
		comment: null,
	},
];

export const activeVisit: Visit = {
	id: activeVisitId,
	organizationId,
	patientId: marinaPatientId,
	appointmentId: activeAppointmentId,
	status: "draft",
	revision: 1,
	complaint: "Периодическая боль при накусывании в области 36.",
	anamnesis: "Со слов пациента, боль появилась около недели назад.",
	objectiveStatus: "36: кариозная полость, реакция на холод кратковременная.",
	diagnosis: "K02.1 кариес дентина, предварительно.",
	treatmentPlan:
		"Анестезия, изоляция, препарирование, восстановление композитом.",
	doctorSummary:
		"AI-диктовка должна попадать сюда как черновик, не как подписанный диагноз.",
	createdAt: nowIso,
	updatedAt: nowIso,
};

/** Пустой идентификатор заготовки приёма из гидратации базы. */
const NIL_VISIT_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Приём открыт, только если он настоящий: есть свой идентификатор и пациент,
 * которого видно в списке.
 *
 * Гидратация подставляет в `activeVisit` заготовку с нулевым UUID, когда
 * черновиков нет вовсе. Без этой проверки заготовка считалась неподписанным
 * приёмом, и клиника с нулём приёмов видела сразу три выдумки: срочное дело
 * «Закрыть медицинскую запись» на несуществующего пациента, предупреждение
 * смены «Прием не подписан» и единицу в очереди врача.
 */
function hasUnsignedActiveVisit(
	state: DomainState = inMemoryDomainState,
): boolean {
	const { activeVisit, patients } = state;
	if (activeVisit.status !== "draft") return false;
	if (activeVisit.id === NIL_VISIT_UUID) return false;
	if (activeVisit.patientId === NIL_VISIT_UUID) return false;
	return patients.some((patient) => patient.id === activeVisit.patientId);
}

export const documents: GeneratedDocument[] = [
	{
		id: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "paid_medical_services_contract",
		title: "Договор платных медицинских услуг",
		status: "draft",
		issuedAt: null,
		totalAmountRub: 6800,
	},
	{
		id: "59b724c7-c988-45a7-91d8-1ad11a6e74c7",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "completed_works_act",
		title: "Акт выполненных работ",
		status: "draft",
		issuedAt: null,
		totalAmountRub: 6800,
	},
	{
		id: "b77b8720-7ffd-453a-9db4-54637ef292a7",
		organizationId,
		patientId: alexeyPatientId,
		visitId: null,
		kind: "tax_deduction_certificate",
		title: "Черновик данных для справки КНД 1151156 за 2026 год",
		status: "draft",
		issuedAt: null,
		totalAmountRub: 4500,
		taxYear: 2026,
	},
];

export const serviceCatalogMap = new Map<string, ServiceCatalogItem>();

/**
 * Услуга по идентификатору. Обращения к прайсу шли то через индекс, то линейным
 * поиском по массиву — из-за этого одна и та же услуга в разных местах могла
 * находиться и не находиться. Здесь единая точка: индекс, а при промахе —
 * поиск по массиву с достройкой индекса.
 */
function getServiceCatalogItem(
	serviceId: string,
	state: DomainState = inMemoryDomainState,
): ServiceCatalogItem | undefined {
	/*
	 * ПАМЯТЬ ПОИСКА — ТОЛЬКО ДЛЯ ОБЩЕГО СРЕЗА.
	 *
	 * `serviceCatalogMap` общий на процесс. Для среза конкретной клиники он
	 * непригоден: услуга с тем же идентификатором из ДРУГОЙ клиники осталась бы в
	 * памяти и вернулась сюда — это межарендная утечка в чистом виде. Поэтому по
	 * срезу базы ищем в его собственном списке и ничего не запоминаем.
	 */
	if (state !== inMemoryDomainState) {
		return state.serviceCatalog.find(
			(catalogItem) => catalogItem.id === serviceId,
		);
	}
	const indexed = serviceCatalogMap.get(serviceId);
	if (indexed !== undefined) return indexed;
	const found = serviceCatalog.find(
		(catalogItem) => catalogItem.id === serviceId,
	);
	if (found) serviceCatalogMap.set(serviceId, found);
	return found;
}

export const serviceCatalog: ServiceCatalogItem[] = [
	{
		id: "svc-consult-primary",
		organizationId,
		code: "A01.07.001",
		title: "Первичная консультация стоматолога",
		aliases: [],
		category: "consultation",
		specialty: "universal",
		basePriceRub: 1200,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-therapy-caries",
		organizationId,
		code: "A16.07.002",
		title: "Лечение кариеса с восстановлением",
		aliases: [],
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 6800,
		durationMinutes: 60,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-therapy-cofferdam",
		organizationId,
		code: "A16.07.093",
		title: "Изоляция коффердамом",
		aliases: [],
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 1500,
		durationMinutes: 10,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-hygiene-pro",
		organizationId,
		code: "A16.07.051",
		title: "Профессиональная гигиена",
		aliases: [],
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 4500,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-imaging-opg",
		organizationId,
		code: "A06.07.004",
		title: "ОПТГ",
		aliases: [],
		category: "imaging",
		specialty: "radiologist",
		basePriceRub: 1800,
		durationMinutes: 15,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-surgery-extraction",
		organizationId,
		code: "A16.07.001",
		title: "Удаление зуба",
		aliases: [],
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 5200,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-prosthetics-crown",
		organizationId,
		code: "A16.07.006",
		title: "Коронка керамическая",
		aliases: [],
		category: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 26000,
		durationMinutes: 75,
		taxDeductible: true,
		active: true,
	},
];

export const treatmentPlanItems: TreatmentPlanItem[] = [
	{
		id: "113ac908-cbbe-4c6a-82de-65eec9b65311",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		serviceId: "svc-therapy-caries",
		snapshotServiceName: "Legacy Snapshot",
		snapshotServiceCategory: null,
		toothCode: "36",
		quantity: 1,
		unitPriceRub: 6800,
		discountRub: 0,
		status: "in_progress",
		plannedDoctorUserId: doctorUserId,
		plannedChairId: chairId,
		notes: "Текущий прием, восстановление после снимка.",
	},
	{
		id: "b0fa4a35-c2f9-4890-aeb7-87f19f904f46",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		serviceId: "svc-imaging-opg",
		snapshotServiceName: "Legacy Snapshot",
		snapshotServiceCategory: null,
		toothCode: null,
		quantity: 1,
		unitPriceRub: 1800,
		discountRub: 0,
		status: "completed",
		plannedDoctorUserId: doctorUserId,
		plannedChairId: chairId,
		notes: "Панорамный контроль перед лечением.",
	},
	{
		id: "b3c6ed4b-8fb7-4ee0-9dc1-24798f82a7d9",
		organizationId,
		patientId: alexeyPatientId,
		visitId: null,
		serviceId: "svc-hygiene-pro",
		snapshotServiceName: "Legacy Snapshot",
		snapshotServiceCategory: null,
		toothCode: null,
		quantity: 1,
		unitPriceRub: 4500,
		discountRub: 0,
		status: "approved",
		plannedDoctorUserId: doctorUserId,
		plannedChairId: chairId,
		notes: "Подготовить справку для налогового вычета после оплаты.",
	},
];

const treatmentPlanScenarios: TreatmentPlanScenario[] = [
	{
		id: "scenario-urgent-marina",
		organizationId,
		patientId: marinaPatientId,
		title: "Снять боль и закрыть острые риски",
		strategy: "urgent",
		priority: "budget",
		totalRub: 8600,
		durationMonths: 0,
		visitCount: 1,
		includedServiceIds: ["svc-therapy-caries", "svc-imaging-opg"],
		phases: [
			{
				title: "Сегодня",
				window: "1 визит",
				amountRub: 8600,
				focus: "Снимок, лечение 36, контроль боли",
			},
		],
		pros: [
			"Самый быстрый вход в лечение",
			"Пациент понимает минимальный платеж",
		],
		tradeoffs: [
			"Не закрывает профилактику",
			"Не формирует долгий план удержания результата",
		],
		clinicalWarnings: [
			"Нельзя отключать снимок: без него врач не подтверждает глубину поражения.",
		],
		active: true,
	},
	{
		id: "scenario-standard-marina",
		organizationId,
		patientId: marinaPatientId,
		title: "Стандартная санация без перегруза бюджета",
		strategy: "standard",
		priority: "balanced",
		totalRub: 13100,
		durationMonths: 1,
		visitCount: 2,
		includedServiceIds: [
			"svc-therapy-caries",
			"svc-imaging-opg",
			"svc-hygiene-pro",
		],
		phases: [
			{
				title: "Фаза 1",
				window: "сегодня",
				amountRub: 8600,
				focus: "Снимок и терапия активного очага",
			},
			{
				title: "Фаза 2",
				window: "через 2-3 недели",
				amountRub: 4500,
				focus: "Гигиена и профилактический контроль",
			},
		],
		pros: [
			"Закрывает клинический минимум",
			"Легко объясняется пациенту и администратору",
		],
		tradeoffs: ["Эстетика и расширенная ортопедия остаются отдельным решением"],
		clinicalWarnings: [
			"После лечения каналов или глубокой реставрации нужен контрольный осмотр.",
		],
		active: true,
	},
	{
		id: "scenario-optimal-marina",
		organizationId,
		patientId: marinaPatientId,
		title: "Оптимальный восстановительный план",
		strategy: "optimal",
		priority: "clinical",
		totalRub: 39100,
		durationMonths: 3,
		visitCount: 4,
		includedServiceIds: [
			"svc-therapy-caries",
			"svc-imaging-opg",
			"svc-hygiene-pro",
			"svc-prosthetics-crown",
		],
		phases: [
			{
				title: "Год 1 / старт",
				window: "0-1 месяц",
				amountRub: 13100,
				focus: "Санация, снимки, гигиена",
			},
			{
				title: "Восстановление",
				window: "2-3 месяц",
				amountRub: 26000,
				focus: "Ортопедическая защита ослабленного зуба",
			},
		],
		pros: [
			"Снижает риск повторного перелечивания",
			"Создает понятную дорожную карту для пациента",
		],
		tradeoffs: ["Выше стартовый чек", "Нужна координация терапевта и ортопеда"],
		clinicalWarnings: [
			"Если пациент откладывает коронку, администратор должен поставить recall.",
		],
		active: true,
	},
	{
		id: "scenario-maintenance-marina",
		organizationId,
		patientId: marinaPatientId,
		title: "Поддержание результата после лечения",
		strategy: "maintenance",
		priority: "balanced",
		totalRub: 9000,
		durationMonths: 12,
		visitCount: 2,
		includedServiceIds: ["svc-hygiene-pro"],
		phases: [
			{
				title: "Контроль 1",
				window: "через 6 месяцев",
				amountRub: 4500,
				focus: "Гигиена и раннее выявление новых очагов",
			},
			{
				title: "Контроль 2",
				window: "через 12 месяцев",
				amountRub: 4500,
				focus: "Повторная гигиена, снимок по показаниям",
			},
		],
		pros: [
			"Превращает лечение в долгий план наблюдения",
			"Дает администратору понятные будущие касания",
		],
		tradeoffs: ["Не заменяет отдельные лечебные назначения при новой боли"],
		clinicalWarnings: [
			"Если пациент пропускает профилактику, гарантийный риск растет.",
		],
		active: false,
	},
];

serviceCatalog.forEach((s) => {
	serviceCatalogMap.set(s.id, s);
});

export const clinicalRules: ClinicalRule[] = [
	{
		id: "rule-caries-requires-image",
		organizationId,
		title: "Снимок перед лечением глубокого кариеса",
		category: "imaging",
		specialty: "therapist",
		action: "add_required_service",
		severity: "info",
		ownerRole: "doctor",
		triggerServiceIds: ["svc-therapy-caries"],
		requiredServiceIds: [],
		requiresCompletedServiceIds: [],
		blockedServiceIds: [],
		condition:
			"При глубоком кариесе рекомендуется прицельный снимок или визиография.",
		warningText:
			"Рекомендуется рентген-контроль глубины поражения твердых тканей.",
		patientText:
			"Снимок помогает врачу оценить состояние корня и исключить скрытые очаги.",
		active: true,
	},
	{
		id: "rule-caries-requires-cofferdam",
		organizationId,
		title: "Изоляция при терапевтическом лечении",
		category: "therapy",
		specialty: "therapist",
		action: "add_required_service",
		severity: "warning",
		ownerRole: "assistant",
		triggerServiceIds: ["svc-therapy-caries"],
		requiredServiceIds: ["svc-therapy-cofferdam"],
		requiresCompletedServiceIds: [],
		blockedServiceIds: [],
		condition:
			"Кариес, эндодонтия и адгезивные реставрации требуют сухого поля.",
		warningText:
			"Добавьте коффердам или зафиксируйте клиническую причину отказа.",
		patientText:
			"Изоляция повышает качество пломбы и снижает риск повторного лечения.",
		active: true,
	},
	{
		id: "rule-crown-after-therapy",
		organizationId,
		title: "Ортопедия только после закрытия активной терапии",
		category: "prosthetics",
		specialty: "orthopedist",
		action: "schedule_followup",
		severity: "warning",
		ownerRole: "doctor",
		triggerServiceIds: ["svc-prosthetics-crown"],
		requiredServiceIds: [],
		requiresCompletedServiceIds: ["svc-therapy-caries"],
		blockedServiceIds: [],
		condition:
			"Коронка в плане допустима только после закрытия активного очага и снимка.",
		warningText:
			"Рекомендуется завершить терапию опорного зуба перед постоянным протезированием.",
		patientText:
			"Сначала нужно убрать воспаление и восстановить основание, потом защищать зуб коронкой.",
		active: true,
	},
	{
		id: "rule-maintenance-after-hygiene",
		organizationId,
		title: "Recall после гигиены",
		category: "hygiene",
		specialty: "hygienist",
		action: "schedule_followup",
		severity: "info",
		ownerRole: "administrator",
		triggerServiceIds: ["svc-hygiene-pro"],
		requiredServiceIds: [],
		requiresCompletedServiceIds: [],
		blockedServiceIds: [],
		condition:
			"После гигиены пациент должен получить повторный контакт через 6 месяцев.",
		warningText:
			"Поставьте recall-задачу, чтобы удержать профилактику и гарантийный контроль.",
		patientText:
			"Профилактический контроль дешевле повторного лечения и помогает сохранить результат.",
		active: true,
	},
];

export const payments: Payment[] = [
	{
		id: "baf18e54-608e-4bc5-9f20-57df0f742795",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		documentId: "59b724c7-c988-45a7-91d8-1ad11a6e74c7",
		amountRub: 3000,
		method: "card",
		status: "paid",
		paidAt: "2026-05-12T10:05:00+04:00",
		createdAt: nowIso,
		fiscalReceiptNumber: "FN-2026-000001",
		fiscalReceiptIssuedAt: "2026-05-12T10:05:00+04:00",
		fiscalReceiptUrl: "https://example.com/fiscal/FN-2026-000001",
		fiscalReceipt: {
			fn: "9287440300000001",
			fd: "123456",
			fpd: "9876543210",
			cashierName: "Администратор DENTE",
			receiptUrl: "https://example.com/fiscal/FN-2026-000001",
			operationType: "income",
		},
		payerFullName: "Иванова Марина Сергеевна",
		payerInn: "123456789012",
		payerBirthDate: "1988-04-21",
		payerIdentityDocument: "паспорт РФ 3600 000000, выдан 01.01.2018",
		payerRelationship: "пациент",
		taxDeductionCode: "1",
		note: "Частичная оплата лечения 36.",
	},
];

let uiPreferences: UiPreferences | null = null;

const communicationTemplates: CommunicationTemplate[] = [
	{
		id: "tpl-appointment-confirm",
		organizationId,
		title: "Подтверждение приема",
		channel: "whatsapp",
		intent: "appointment_confirmation",
		audienceRole: "administrator",
		body: "Здравствуйте, {patient}. Подтвердите, пожалуйста, прием {date} в {time}.",
		variables: ["patient", "date", "time"],
		active: true,
	},
	{
		id: "tpl-payment-reminder",
		organizationId,
		title: "Напоминание об оплате",
		channel: "sms",
		intent: "payment_reminder",
		audienceRole: "administrator",
		body: "{patient}, остаток по лечению составляет {amount}. Администратор клиники поможет закрыть оплату и документы.",
		variables: ["patient", "amount"],
		active: true,
	},
	{
		id: "tpl-post-visit",
		organizationId,
		title: "DENTE: ссылка на памятку после приема",
		channel: "telegram",
		intent: "post_visit_instruction",
		audienceRole: "assistant",
		body: "DENTE: памятка после приема готова в защищенном портале клиники. В Telegram не передаются диагнозы, план лечения и медицинские файлы.",
		variables: [],
		active: true,
	},
	{
		id: "tpl-recall",
		organizationId,
		title: "Повторный визит",
		channel: "phone",
		intent: "recall",
		audienceRole: "administrator",
		body: "Позвонить пациенту {patient} и согласовать контрольный визит.",
		variables: ["patient"],
		active: true,
	},
];

const communicationTasks: CommunicationTask[] = [
	{
		id: "7195a20f-0aa8-4f0a-8d33-8db69fbb3d91",
		organizationId,
		patientId: marinaPatientId,
		appointmentId: activeAppointmentId,
		visitId: activeVisitId,
		documentId: null,
		assignedRole: "assistant",
		channel: "telegram",
		intent: "post_visit_instruction",
		status: "queued",
		priority: "high",
		dueAt: "2026-05-12T10:20:00+04:00",
		title: "Отправить ссылку на памятку после приема",
		body: "Памятка после приема готова в защищенном портале клиники. Не включать диагноз, номера зубов, снимки и детали лечения в Telegram.",
		lastEventAt: null,
		createdAt: nowIso,
	},
	{
		id: "31ba633f-64e3-4a50-8a10-dc3d44f81a5a",
		organizationId,
		patientId: marinaPatientId,
		appointmentId: activeAppointmentId,
		visitId: activeVisitId,
		documentId: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
		assignedRole: "administrator",
		channel: "sms",
		intent: "payment_reminder",
		status: "needs_call",
		priority: "urgent",
		dueAt: "2026-05-12T10:30:00+04:00",
		title: "Закрыть остаток оплаты и документы",
		body: "Связать оплату с договором/актом, затем подготовить пакет документов.",
		lastEventAt: null,
		createdAt: nowIso,
	},
	{
		id: "16f19699-5b11-45fa-a329-5c53567b7f28",
		organizationId,
		patientId: alexeyPatientId,
		appointmentId: "59d16574-5f6e-4cc7-9f49-2da2f126e11d",
		visitId: null,
		documentId: "b77b8720-7ffd-453a-9db4-54637ef292a7",
		assignedRole: "administrator",
		channel: "phone",
		intent: "document_ready",
		status: "scheduled",
		priority: "normal",
		dueAt: "2026-05-12T09:30:00+04:00",
		title: "Предупредить о справке для вычета",
		body: "После оплаты выдать справку КНД 1151156 и проверить ФИО/ИНН.",
		lastEventAt: null,
		createdAt: nowIso,
	},
	{
		id: "b896a902-665d-4b33-9851-53822a04c12a",
		organizationId,
		patientId: elmiraPatientId,
		appointmentId: "286c0899-f2cc-4e72-833d-a1e89036e319",
		visitId: null,
		documentId: null,
		assignedRole: "administrator",
		channel: "whatsapp",
		intent: "appointment_confirmation",
		status: "queued",
		priority: "normal",
		dueAt: "2026-05-12T08:30:00+04:00",
		title: "Подтвердить первичную консультацию",
		body: "Уточнить жалобу, предупредить взять паспорт и старые снимки.",
		lastEventAt: null,
		createdAt: nowIso,
	},
	{
		id: "d144ac6c-c570-4d0c-b6a6-dc0154130cd6",
		organizationId,
		patientId: marinaPatientId,
		appointmentId: activeAppointmentId,
		visitId: activeVisitId,
		documentId: null,
		assignedRole: "doctor",
		channel: "in_person",
		intent: "imaging_review",
		status: "needs_call",
		priority: "high",
		dueAt: "2026-05-12T09:45:00+04:00",
		title: "Обсудить ОПТГ контроль",
		body: "Пояснить пациенту, что AI-описание не является диагнозом, врач проверяет снимок.",
		lastEventAt: null,
		createdAt: nowIso,
	},
];

const communicationEvents: CommunicationEvent[] = [
	{
		id: "88ff10d9-e50a-4a67-8500-f1dfeff6b92c",
		organizationId,
		taskId: "b896a902-665d-4b33-9851-53822a04c12a",
		patientId: elmiraPatientId,
		actorUserId: "93bca14f-a11d-4088-9b48-cb7a0fd4c9ef",
		channel: "whatsapp",
		direction: "outbound",
		status: "sent",
		message: "Отправлено подтверждение первичной консультации.",
		createdAt: "2026-05-12T08:10:00+04:00",
	},
];

const imagingStudies: ImagingStudy[] = [
	{
		id: "fbe3704c-9b37-4149-ae4b-e99e46d7599f",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "periapical",
		title: "Прицельный 36",
		toothCode: "36",
		region: "нижняя челюсть слева",
		capturedAt: "2026-05-12T08:42:00+04:00",
		sourceKind: "sensor_bridge",
		sourceName: "RVG-датчик",
		status: "available",
		aiSummary:
			"Черновик: область 36, контроль кариозной полости. Требует проверки врача.",
		previewUrl:
			"/api/imaging/studies/fbe3704c-9b37-4149-ae4b-e99e46d7599f/preview.svg",
		viewerUrl:
			"/api/imaging/studies/fbe3704c-9b37-4149-ae4b-e99e46d7599f/preview.svg",
	},
	{
		id: "b0b5961f-4d64-45a6-88e9-a77e87d7ec51",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "opg",
		title: "ОПТГ контроль",
		toothCode: null,
		region: "обе челюсти",
		capturedAt: "2026-05-10T15:20:00+04:00",
		sourceKind: "dicom_file",
		sourceName: "Импорт ОПТГ/снимков",
		status: "needs_review",
		aiSummary:
			"Черновик: панорамный обзор, проверить 36/46 и ретинированные восьмые зубы.",
		previewUrl:
			"/api/imaging/studies/b0b5961f-4d64-45a6-88e9-a77e87d7ec51/preview.svg",
		viewerUrl:
			"/api/imaging/studies/b0b5961f-4d64-45a6-88e9-a77e87d7ec51/preview.svg",
	},
	{
		id: "e0d93a8c-5f3b-49d6-bc21-0b5ab45eb6fa",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "ceph",
		title: "ТРГ боковая",
		toothCode: null,
		region: "профиль черепа",
		capturedAt: "2026-05-10T15:24:00+04:00",
		sourceKind: "dicom_file",
		sourceName: "Импорт ТРГ/снимков",
		status: "needs_review",
		aiSummary:
			"Черновик: телерентгенограмма добавлена для ортодонтического анализа. Разметку и вывод проверяет врач.",
		previewUrl:
			"/api/imaging/studies/e0d93a8c-5f3b-49d6-bc21-0b5ab45eb6fa/preview.svg",
		viewerUrl:
			"/api/imaging/studies/e0d93a8c-5f3b-49d6-bc21-0b5ab45eb6fa/preview.svg",
	},
	{
		id: "eb7bc26d-70df-4996-89db-ccbb910f82d0",
		organizationId,
		patientId: alexeyPatientId,
		visitId: null,
		kind: "cbct",
		title: "КТ имплантация 46",
		toothCode: "46",
		region: "нижняя челюсть справа",
		capturedAt: "2026-05-09T11:30:00+04:00",
		sourceKind: "pacs",
		sourceName: "Архив снимков клиники",
		status: "available",
		aiSummary:
			"Черновик: КЛКТ/КТ-серия подключена, полноценный 3D-просмотрщик будет отдельным модулем.",
		previewUrl:
			"/api/imaging/studies/eb7bc26d-70df-4996-89db-ccbb910f82d0/preview.svg",
		viewerUrl:
			"/api/imaging/studies/eb7bc26d-70df-4996-89db-ccbb910f82d0/preview.svg",
	},
];

const importBatches: ImportBatch[] = [];

const aiRecognitionJobs: AiRecognitionJob[] = [];
const imagingViewerSessions: ImagingViewerSession[] = [];
const dicomWorkbenchBundles: DicomWorkbenchBundle[] = [];
const speechTranscriptionChunks: SpeechTranscriptionChunk[] = [];

class SpeechChunkIdentityConflictError extends Error {
	statusCode = 409;

	constructor() {
		super(
			"Speech chunk retry identity mismatch; audio remains recoverable in the local queue.",
		);
		this.name = "SpeechChunkIdentityConflictError";
	}
}
const visitSaveReceipts: VisitSaveReceipt[] = [];
const visitDraftAutosaves: VisitDraftAutosave[] = [];

function findVisitById(visitId: string): Visit | null {
	return activeVisit.id === visitId ? activeVisit : null;
}

/*
 * Округление до копейки, а не до рубля.
 *
 * Цены позиций плана и суммы платежей приходят из numeric(12, 2), то есть с
 * копейками. Умножение на количество и сложение в плавающей точке оставляют
 * хвост (1500.10 * 3 = 4500.299999999999), а сводка проходит через
 * dashboardSchema.parse в apps/api/src/routes/schedule.ts — там исключение
 * означает 500 на расписании. Тот же приём применяется в
 * apps/api/src/documents/guards.ts и в веб-расчёте той же сводки, поэтому обе
 * стороны считают строку одинаково и итог РАВЕН сумме частей.
 */
function roundToKopecks(value: number): number {
	return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function treatmentLineTotal(item: TreatmentPlanItem): number {
	return Math.max(
		0,
		roundToKopecks(item.unitPriceRub * item.quantity - item.discountRub),
	);
}

export function buildBillingSummary(
	state: DomainState = inMemoryDomainState,
): BillingSummary {
	const { treatmentPlanItems, payments, documents } = state;
	let totalPlannedRub = 0;
	let totalDiscountRub = 0;
	let taxDeductionEligibleRub = 0;
	let openTreatmentItems = 0;

	for (let i = 0; i < treatmentPlanItems.length; i++) {
		const item = treatmentPlanItems[i];
		if (!item || item.status === "cancelled") continue;

		const lineTotal = treatmentLineTotal(item);
		totalPlannedRub += lineTotal;
		totalDiscountRub += item.discountRub;

		const service = getServiceCatalogItem(item.serviceId, state);
		if (service?.taxDeductible) {
			taxDeductionEligibleRub += lineTotal;
		}

		if (item.status !== "completed") {
			openTreatmentItems += 1;
		}
	}

	let totalPaidRub = 0;
	const paidDocumentIds = new Set<string>();
	for (let i = 0; i < payments.length; i++) {
		const payment = payments[i];
		if (!payment) continue;

		if (payment.status === "paid") {
			totalPaidRub += payment.amountRub;
			if (payment.documentId) {
				paidDocumentIds.add(payment.documentId);
			}
		}
	}

	let draftDocumentAmountRub = 0;
	let unpaidDocuments = 0;
	for (let i = 0; i < documents.length; i++) {
		const document = documents[i];
		if (!document) continue;

		if (document.status === "draft") {
			const amount = document.totalAmountRub ?? 0;
			draftDocumentAmountRub += amount;

			if (amount > 0 && !paidDocumentIds.has(document.id)) {
				unpaidDocuments += 1;
			}
		}
	}

	return {
		totalPlannedRub: roundToKopecks(totalPlannedRub),
		totalDiscountRub: roundToKopecks(totalDiscountRub),
		totalPaidRub: roundToKopecks(totalPaidRub),
		totalDueRub: Math.max(0, roundToKopecks(totalPlannedRub - totalPaidRub)),
		taxDeductionEligibleRub: roundToKopecks(taxDeductionEligibleRub),
		draftDocumentAmountRub: roundToKopecks(draftDocumentAmountRub),
		openTreatmentItems,
		unpaidDocuments,
	};
}

/**
 * Деньги ЭТОГО приёма для карточки закрытия — через единый дом формулы долга.
 *
 * ЧТО БЫЛО НЕ ТАК. Здесь стояло `billing: buildBillingSummary()`. Эта функция не
 * принимает аргументов и складывает ВСЕ позиции лечения и ВСЕ платежи клиники,
 * вычитая одно из другого одним действием (`:1349`, `totalDueRub`). Приём в
 * расчёт не входил вообще, поэтому карточка любого приёма показывала одно и то же
 * число — нетто по клинике. Замер на живой базе 2026-07-29: 51 400,00 ₽ во всех
 * десяти приёмах клиники `d0000000-…-d001`, включая приём `…-000000000401`, где
 * получено 5 400,00 из 5 400,00. Разбор величины и приговор ей —
 * `.agents/lead/recon-debt-formula-sprawl.md` (место #3, «иная семантика: нетто
 * по клинике, а не долг пациента»).
 *
 * ШЕСТОЙ ФОРМУЛЫ ЗДЕСЬ НЕ ЗАВЕДЕНО. Сальдо приёма считает
 * `money/patientDebt.ts` (`buildVisitLedger`) — тот же дом, что отвечает на
 * вопросы про пациента и клинику, и та же первичная величина
 * `назначено − оплачено`. В этом файле осталась только пересадка полей
 * коллекций в строки модуля.
 *
 * ПОЧЕМУ ОТКАЗ МОДУЛЯ ЛОВИТСЯ, А НЕ ЛЕТИТ НАВЕРХ. Модуль отвергает суммы,
 * потерявшие точность, и нецелое количество — это правильно для расчёта, но эти
 * факты собираются в том числе на пути ПОДПИСАНИЯ приёма, где исключение
 * означает HTTP 500 на уже подписанной карте (ровно тот дефект, из-за которого
 * появился `visitCloseChecklist.ts`; см. `db/visitsQuery.ts`,
 * `VisitSignedResponseIncompleteError`). Врач теряет подтверждение подписи из-за
 * испорченной цены в чужой позиции — цена несоразмерная. Поэтому отказ
 * превращается в честное «остаток по приёму не рассчитан» С ПРИЧИНОЙ: галочка
 * остаётся незакрытой, число не выдумывается, а причина уходит на экран
 * администратору. Любая ДРУГАЯ ошибка летит наверх как раньше.
 */
function visitBillingChecklistFacts(
	visit: Visit,
	state: DomainState = inMemoryDomainState,
): VisitCloseChecklistFacts["billing"] {
	const { treatmentPlanItems, payments } = state;
	let ledger: VisitLedger;
	try {
		ledger = buildVisitLedger(visit.id, treatmentPlanItems, payments);
	} catch (error) {
		if (
			error instanceof MoneyPrecisionError ||
			error instanceof QuantityContractError
		) {
			return { known: false, reason: error.message };
		}
		throw error;
	}

	const outstandingKopecks = visitOutstandingKopecks(ledger);
	const overpaidKopecks = visitOverpaidKopecks(ledger);
	if (outstandingKopecks === null || overpaidKopecks === null) {
		// «Ноль» и «неизвестно» — разные ответы, и второй обязан выглядеть иначе.
		return {
			known: false,
			reason:
				"по приёму не заведено ни одной позиции лечения и ни одной оплаты. " +
				"Свяжите позиции плана и платежи с этим приёмом, иначе закрывать оплату нечем.",
		};
	}

	return {
		known: true,
		outstandingKopecks,
		overpaidKopecks,
		billedLineCount: ledger.billedLineCount,
		paidPaymentCount: ledger.paidPaymentCount,
	};
}

/**
 * Факты для карточки закрытия КОНКРЕТНОГО приёма.
 *
 * Сам расчёт переехал в visitCloseChecklist.ts и он один на весь проект. Здесь
 * остался только сбор данных из доменных коллекций — тех же, что читались
 * раньше, поэтому главный экран собирается прежним. Разница в одном: приём
 * передаётся аргументом, а не берётся из общей переменной `activeVisit`.
 *
 * Почему это важно: слой доступа к базе (db/visitsQuery.ts) подписывает
 * КОНКРЕТНЫЙ приём и обязан отдать карточку именно по нему. Пока приём брался из
 * общего состояния, воспользоваться этим расчётом он не мог — и врач на
 * подписании карты получал HTTP 500 при уже подписанном приёме.
 *
 * ЭКСПОРТИРУЕТСЯ РАДИ ЕДИНСТВЕННОГО СБОРЩИКА ФАКТОВ. Слой доступа собирал этот
 * же объект своим литералом (`db/visitsQuery.ts`), то есть сборка фактов
 * существовала в двух копиях при одном расчёте. Пока в фактах были только
 * коллекции, копии совпадали; с появлением денег ПО ПРИЁМУ вторая копия стала бы
 * тем самым местом, куда правку не внесли. Теперь обе стороны зовут одну функцию.
 */
export function visitCloseChecklistFactsFor(
	visit: Visit,
	state: DomainState = inMemoryDomainState,
): VisitCloseChecklistFacts {
	const { imagingStudies, documents, aiRecognitionJobs, communicationTasks } =
		state;
	return {
		visit,
		imagingStudies,
		documents,
		aiRecognitionJobs,
		communicationTasks,
		clinical: buildClinicalRuleSummary(visit.patientId, state),
		billing: visitBillingChecklistFacts(visit, state),
	};
}

function summarizeClinicalEvaluations(
	evaluations: ClinicalRuleEvaluation[],
	state: DomainState = inMemoryDomainState,
): ClinicalRuleSummary {
	const { clinicalRules } = state;
	const unresolved = evaluations.filter((evaluation) => !evaluation.resolved);
	const requiredServiceIds = new Set(
		unresolved.flatMap((evaluation) => evaluation.missingRequiredServiceIds),
	);

	return {
		activeRules: clinicalRules.filter((rule) => rule.active).length,
		evaluatedRules: evaluations.length,
		unresolved: unresolved.length,
		blockers: unresolved.filter(
			(evaluation) => evaluation.severity === "blocker",
		).length,
		warnings: unresolved.filter(
			(evaluation) => evaluation.severity === "warning",
		).length,
		requiredServices: requiredServiceIds.size,
		coveredRules: evaluations.filter((evaluation) => evaluation.resolved)
			.length,
	};
}

export function evaluateClinicalRules(
	input: ClinicalRuleEvaluationInput,
	state: DomainState = inMemoryDomainState,
): ClinicalRuleEvaluationResponse {
	const { clinicalRules } = state;
	const serviceIds = new Set(input.serviceIds);
	const completedServiceIds = new Set(input.completedServiceIds);
	const evaluations = clinicalRules.flatMap(
		(rule): ClinicalRuleEvaluation[] => {
			if (!rule.active) return [];

			const triggeredByServiceIds = rule.triggerServiceIds.filter((serviceId) =>
				serviceIds.has(serviceId),
			);
			if (!triggeredByServiceIds.length) return [];

			const missingRequiredServiceIds = rule.requiredServiceIds.filter(
				(serviceId) => !serviceIds.has(serviceId),
			);
			const missingCompletedServiceIds =
				rule.requiresCompletedServiceIds.filter(
					(serviceId) => !completedServiceIds.has(serviceId),
				);
			const blockedServiceIds = rule.blockedServiceIds.filter((serviceId) =>
				serviceIds.has(serviceId),
			);

			let resolved =
				missingRequiredServiceIds.length === 0 &&
				missingCompletedServiceIds.length === 0;
			let activeBlockedServiceIds = blockedServiceIds;

			if (rule.action === "block_service") {
				const hasBlockingCondition =
					missingCompletedServiceIds.length > 0 ||
					(rule.requiresCompletedServiceIds.length === 0 &&
						blockedServiceIds.length > 0);
				resolved = !hasBlockingCondition;
				activeBlockedServiceIds = hasBlockingCondition ? blockedServiceIds : [];
			}

			if (
				rule.action === "show_warning" ||
				rule.action === "schedule_followup"
			) {
				resolved = false;
			}

			return [
				{
					id: `${input.scenarioId ?? "plan"}-${rule.id}`,
					ruleId: rule.id,
					organizationId: rule.organizationId,
					patientId: input.patientId,
					scenarioId: input.scenarioId ?? null,
					title: rule.title,
					action: rule.action,
					severity: rule.severity,
					ownerRole: rule.ownerRole,
					triggeredByServiceIds,
					missingRequiredServiceIds,
					missingCompletedServiceIds,
					blockedServiceIds: activeBlockedServiceIds,
					message: rule.warningText,
					patientMessage: rule.patientText,
					resolved,
				},
			];
		},
	);

	return {
		evaluations,
		summary: summarizeClinicalEvaluations(evaluations),
	};
}

/**
 * Клинические правила считаются по ПАЦИЕНТУ, поэтому пациент — аргумент.
 *
 * БЫЛО: `activeVisit.patientId` прямо внутри. Из-за этого правила нельзя было
 * посчитать ни для одного приёма, кроме «последнего черновика клиники»: карточка
 * закрытия конкретного приёма получала предупреждения ЧУЖОГО пациента.
 */
function buildClinicalRuleEvaluations(
	patientId: string,
	state: DomainState = inMemoryDomainState,
): ClinicalRuleEvaluation[] {
	const { treatmentPlanItems, treatmentPlanScenarios } = state;
	const patientPlanItems = treatmentPlanItems.filter(
		(item) => item.patientId === patientId && item.status !== "cancelled",
	);
	const completedServiceIds = patientPlanItems
		.filter((item) => item.status === "completed")
		.map((item) => item.serviceId);
	const activeScenarioServiceIds = treatmentPlanScenarios
		.filter((scenario) => scenario.patientId === patientId && scenario.active)
		.flatMap((scenario) => scenario.includedServiceIds);
	const serviceIds = Array.from(
		new Set([
			...patientPlanItems.map((item) => item.serviceId),
			...activeScenarioServiceIds,
		]),
	);

	return evaluateClinicalRules(
		{
			patientId,
			serviceIds,
			completedServiceIds,
		},
		state,
	).evaluations;
}

function buildClinicalRuleSummary(
	patientId: string,
	state: DomainState = inMemoryDomainState,
): ClinicalRuleSummary {
	return summarizeClinicalEvaluations(
		buildClinicalRuleEvaluations(patientId, state),
	);
}

function normalizedClinicalRuleServiceIds(values: string[]): string[] {
	return Array.from(
		new Set(values.map((value) => value.trim()).filter(Boolean)),
	).slice(0, 80);
}

export function createClinicalRule(
	input: CreateClinicalRuleInput,
): ClinicalRule {
	const normalizedInput = createClinicalRuleSchema.parse(input);
	const rule: ClinicalRule = {
		id: `rule-${randomUUID()}`,
		organizationId,
		title: normalizedInput.title,
		category: normalizedInput.category,
		specialty: normalizedInput.specialty,
		action: normalizedInput.action,
		severity: normalizedInput.severity,
		ownerRole: normalizedInput.ownerRole,
		triggerServiceIds: normalizedClinicalRuleServiceIds(
			normalizedInput.triggerServiceIds,
		),
		requiredServiceIds: normalizedClinicalRuleServiceIds(
			normalizedInput.requiredServiceIds,
		),
		requiresCompletedServiceIds: normalizedClinicalRuleServiceIds(
			normalizedInput.requiresCompletedServiceIds,
		),
		blockedServiceIds: normalizedClinicalRuleServiceIds(
			normalizedInput.blockedServiceIds,
		),
		condition: nullableTrimmed(normalizedInput.condition),
		warningText: normalizedInput.warningText,
		patientText: normalizedInput.patientText,
		active: normalizedInput.active,
	};

	clinicalRules.unshift(rule);
	recordAuditEvent({
		entityType: "clinical_rule",
		entityId: rule.id,
		action: "clinical_rule_created",
		reason: `${rule.title} добавлено в библиотеку клинических правил.`,
	});
	return rule;
}

export function updateClinicalRule(
	input: UpdateClinicalRuleInput,
): ClinicalRule {
	const rule = clinicalRules.find((item) => item.id === input.id);
	if (!rule) {
		throw new Error("Клиническое правило не найдено");
	}

	const normalizedInput = createClinicalRuleSchema.parse({
		title: input.title ?? rule.title,
		category: input.category ?? rule.category,
		specialty: input.specialty ?? rule.specialty,
		action: input.action ?? rule.action,
		severity: input.severity ?? rule.severity,
		ownerRole: input.ownerRole ?? rule.ownerRole,
		triggerServiceIds: input.triggerServiceIds ?? rule.triggerServiceIds,
		requiredServiceIds: input.requiredServiceIds ?? rule.requiredServiceIds,
		requiresCompletedServiceIds:
			input.requiresCompletedServiceIds ?? rule.requiresCompletedServiceIds,
		blockedServiceIds: input.blockedServiceIds ?? rule.blockedServiceIds,
		condition: input.condition !== undefined ? input.condition : rule.condition,
		warningText: input.warningText ?? rule.warningText,
		patientText: input.patientText ?? rule.patientText,
		active: input.active ?? rule.active,
	});

	rule.title = normalizedInput.title;
	rule.category = normalizedInput.category;
	rule.specialty = normalizedInput.specialty;
	rule.action = normalizedInput.action;
	rule.severity = normalizedInput.severity;
	rule.ownerRole = normalizedInput.ownerRole;
	rule.triggerServiceIds = normalizedClinicalRuleServiceIds(
		normalizedInput.triggerServiceIds,
	);
	rule.requiredServiceIds = normalizedClinicalRuleServiceIds(
		normalizedInput.requiredServiceIds,
	);
	rule.requiresCompletedServiceIds = normalizedClinicalRuleServiceIds(
		normalizedInput.requiresCompletedServiceIds,
	);
	rule.blockedServiceIds = normalizedClinicalRuleServiceIds(
		normalizedInput.blockedServiceIds,
	);
	rule.condition = nullableTrimmed(normalizedInput.condition);
	rule.warningText = normalizedInput.warningText;
	rule.patientText = normalizedInput.patientText;
	rule.active = normalizedInput.active;

	recordAuditEvent({
		entityType: "clinical_rule",
		entityId: rule.id,
		action: "clinical_rule_updated",
		reason: `${rule.title} изменено в настройках клиники.`,
	});
	return rule;
}

function isOpenCommunicationTask(task: CommunicationTask): boolean {
	return !["completed", "failed", "skipped"].includes(task.status);
}

function buildCommunicationSummary(
	state: DomainState = inMemoryDomainState,
): CommunicationSummary {
	const { communicationTasks } = state;
	const todayPrefix = "2026-05-12";
	const openTasks = communicationTasks.filter(isOpenCommunicationTask);

	return {
		openTasks: openTasks.length,
		urgentTasks: openTasks.filter((task) => task.priority === "urgent").length,
		dueToday: openTasks.filter((task) => task.dueAt.startsWith(todayPrefix))
			.length,
		overdue: openTasks.filter(
			(task) => task.dueAt < `${todayPrefix}T12:00:00+04:00`,
		).length,
		completedToday: communicationTasks.filter(
			(task) =>
				task.status === "completed" &&
				task.lastEventAt?.startsWith(todayPrefix),
		).length,
		appointmentConfirmations: openTasks.filter(
			(task) => task.intent === "appointment_confirmation",
		).length,
		paymentReminders: openTasks.filter(
			(task) => task.intent === "payment_reminder",
		).length,
		postVisitInstructions: openTasks.filter(
			(task) => task.intent === "post_visit_instruction",
		).length,
	};
}

/**
 * Группировка строк по пациенту за один проход. Используется там, где раньше
 * для каждого пациента заново фильтровался весь массив.
 */
function groupByPatientId<T extends { patientId?: string | null }>(
	rows: readonly T[],
): Map<string, T[]> {
	const grouped = new Map<string, T[]>();
	for (const row of rows) {
		const patientId = row.patientId;
		if (!patientId) continue;
		const bucket = grouped.get(patientId);
		if (bucket) bucket.push(row);
		else grouped.set(patientId, [row]);
	}
	return grouped;
}

/**
 * ДОЛГ ПАЦИЕНТА ДЛЯ ПОДСКАЗКИ АДМИНИСТРАТОРУ — ИЗ ЕДИНОГО ДОМА ФОРМУЛЫ.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Здесь стояла своя копия формулы долга, и позиции
 * для неё группировались БЕЗ фильтра `status !== "cancelled"`
 * (`groupByPatientId(treatmentPlanItems)`), тогда как все остальные расчёты
 * денег отменённое лечение исключают. То есть отменённый план продолжал висеть
 * на пациенте долгом ровно там, где администратор читает сумму перед звонком:
 * чип суммы в строке пациента (`PatientsView.tsx`) и «💰 Долг …» в смене
 * (`ShiftView.tsx`). Пациенту звонили и требовали денег за лечение, которое
 * клиника сама отменила.
 *
 * ЗАМЕР БОЕВЫМ МАРШРУТОМ `GET /api/dashboard` на своей клинике (2026-07-29):
 * пациент с 10 000,00 активного лечения и 5 000,00 отменённого показывал
 * 15 000,00 ₽; пациент с полностью отменённым планом на 26 500,00 — 26 500,00 ₽.
 * Стало 10 000,00 ₽ и 0,00 ₽. На демонстрационной клинике `d0000000-…-d001`
 * расхождение равно нулю, потому что отменённых позиций там нет ни одной, —
 * именно поэтому дефект и жил.
 *
 * ДЕСЯТОЙ ФОРМУЛЫ НЕ ЗАВЕДЕНО: считает `money/patientDebt.ts`
 * (`buildPatientLedger` + `patientOwesClinicKopecks`) — тот же дом, что отвечает
 * на вопросы карточки, приёма и клиники. Отмену отбрасывает модуль, поэтому
 * второго фильтра статуса здесь нет: два фильтра в двух местах — ровно тот
 * способ, которым они однажды разойдутся. Разбор девяти прежних расчётов —
 * `.agents/lead/recon-debt-formula-sprawl.md`.
 *
 * `Math.max(0, …)` внутри `patientOwesClinicKopecks` здесь на месте: контракт
 * требует неотрицательного долга (`patientInsight.balanceDueRub` —
 * `nonNegativeMoneyRubSchema`). Цена — переплата в этом ответе безымянна, и это
 * не оговорка, а известная граница: «0» означает и «рассчитался ровно», и
 * «переплатил». Отдельное имя для переплаты в модуле есть
 * (`clinicOwesPatientKopecks`), но в контракте подсказки поля под неё нет.
 *
 * ПОЧЕМУ ОТКАЗ МОДУЛЯ НЕ ЛЕТИТ НАВЕРХ. Подсказки собираются внутри
 * `buildDashboard()`, то есть исключение здесь означает HTTP 500 на ГЛАВНОМ
 * экране клиники: смена не открывается вовсе. Поэтому отказ превращается в
 * `null`-долг с причиной, и причина уходит в подсказку администратору отдельной
 * строкой — «остаток не рассчитан». Ноль в этом поле молча выглядел бы как
 * «пациент ничего не должен», а это неправда: сумма НЕИЗВЕСТНА.
 */
function patientInsightDebt(
	patientId: string,
	planItems: readonly TreatmentPlanItem[],
	paidPayments: readonly Payment[],
): { balanceDueRub: number; balanceUnknownReason: string | null } {
	try {
		const ledger = buildPatientLedger(patientId, planItems, paidPayments);
		return {
			balanceDueRub: rublesFromKopecks(patientOwesClinicKopecks(ledger)),
			balanceUnknownReason: null,
		};
	} catch (error) {
		if (
			error instanceof MoneyPrecisionError ||
			error instanceof QuantityContractError
		) {
			console.error(
				`[Dashboard] Долг пациента ${patientId} для подсказки администратору не рассчитан: ${error.message}`,
			);
			return {
				balanceDueRub: 0,
				balanceUnknownReason:
					"остаток не рассчитан: в позициях лечения или оплатах этого пациента есть сумма, " +
					"которую нельзя представить в копейках. Не звоните по нулю — сумма неизвестна.",
			};
		}
		throw error;
	}
}

function buildPatientInsights(
	state: DomainState = inMemoryDomainState,
): PatientInsight[] {
	const {
		activeVisit,
		appointments,
		communicationTasks,
		documents,
		imagingStudies,
		patients,
		payments,
		treatmentPlanItems,
	} = state;
	const requiredDocuments: Array<
		PatientInsight["missingDocumentKinds"][number]
	> = [
		"paid_medical_services_contract",
		"informed_consent",
		"completed_works_act",
	];

	// БЫЛО: на каждого пациента выполнялось шесть полных проходов по всем
	// документам, задачам, снимкам, платежам, позициям плана и записям — то есть
	// O(пациенты × записи). На демо-базе это незаметно, на клинике с несколькими
	// тысячами пациентов главный экран считался секундами. Группируем один раз.
	const documentsByPatient = groupByPatientId(documents);
	const tasksByPatient = groupByPatientId(
		communicationTasks.filter(isOpenCommunicationTask),
	);
	const imagesByPatient = groupByPatientId(imagingStudies);
	const paymentsByPatient = groupByPatientId(
		payments.filter((payment) => payment.status === "paid"),
	);
	const planItemsByPatient = groupByPatientId(treatmentPlanItems);
	const appointmentsByPatient = groupByPatientId(appointments);

	return patients.map((patient) => {
		const patientDocuments = documentsByPatient.get(patient.id) ?? [];
		const patientTasks = tasksByPatient.get(patient.id) ?? [];
		const patientImages = imagesByPatient.get(patient.id) ?? [];
		const patientPayments = paymentsByPatient.get(patient.id) ?? [];
		const patientPlanItems = planItemsByPatient.get(patient.id) ?? [];
		const patientAppointments = appointmentsByPatient.get(patient.id) ?? [];
		const draftVisit =
			activeVisit.patientId === patient.id && activeVisit.status === "draft";
		const missingDocumentKinds = requiredDocuments.filter(
			(kind) =>
				!patientDocuments.some(
					(document) => document.kind === kind && document.status !== "voided",
				),
		);
		const { balanceDueRub, balanceUnknownReason } = patientInsightDebt(
			patient.id,
			patientPlanItems,
			patientPayments,
		);
		const recallTask = patientTasks
			.filter((task) => task.intent === "recall")
			.sort((left, right) => left.dueAt.localeCompare(right.dueAt))[0];
		const overdueTasks = patientTasks.filter(
			(task) => task.dueAt < "2026-05-12T12:00:00+04:00",
		);
		const needsImageReview = patientImages.some(
			(study) => study.status === "needs_review",
		);
		const clinicalFlags = [
			...(draftVisit ? ["ЭМК не подписана"] : []),
			...(needsImageReview ? ["снимок требует проверки"] : []),
			...(patient.notes ? [patient.notes] : []),
			...(patientPlanItems.some((item) => item.status === "in_progress")
				? ["есть активный этап лечения"]
				: []),
		];
		const adminFlags = [
			/* «Остаток не рассчитан» стоит ПЕРВЫМ и вместо суммы: ноль в этом поле
			   администратор прочитал бы как «пациент ничего не должен», а это
			   неправда — сумма неизвестна. Молчаливый ноль на деньгах и есть тот
			   класс дефекта, из-за которого весь этот переезд затеян. */
			...(balanceUnknownReason ? [balanceUnknownReason] : []),
			...(balanceDueRub > 0
				? [`остаток ${balanceDueRub.toLocaleString("ru-RU")} ₽`]
				: []),
			...(missingDocumentKinds.length
				? [`документы: ${missingDocumentKinds.length}`]
				: []),
			...(patientTasks.length ? [`связь: ${patientTasks.length}`] : []),
			...(overdueTasks.length ? [`просрочено: ${overdueTasks.length}`] : []),
		];
		const riskReasons = [
			...clinicalFlags.slice(0, 2),
			...adminFlags.slice(0, 2),
		];
		const riskLevel: PatientInsight["riskLevel"] =
			draftVisit ||
			needsImageReview ||
			overdueTasks.length > 0 ||
			balanceDueRub >= 10000
				? "high"
				: balanceDueRub > 0 ||
						patientTasks.length > 0 ||
						missingDocumentKinds.length > 0
					? "watch"
					: "low";
		const latestActivity =
			[
				...patientAppointments.map((appointment) => appointment.endsAt),
				...patientDocuments.map((document) => document.issuedAt ?? nowIso),
				...patientTasks.map((task) => task.lastEventAt ?? task.createdAt),
				...patientImages.map((study) => study.capturedAt),
			].sort((left, right) => right.localeCompare(left))[0] ?? null;
		const nextBestAction = draftVisit
			? "Проверить и подписать ЭМК"
			: needsImageReview
				? "Проверить снимок перед переносом в ЭМК"
				: balanceDueRub > 0
					? "Связать оплату, акт и документы"
					: recallTask
						? "Подтвердить повторный визит"
						: missingDocumentKinds.length
							? "Закрыть недостающие документы"
							: "План без срочных действий";

		return {
			patientId: patient.id,
			riskLevel,
			riskReasons: riskReasons.length ? riskReasons : ["нет срочных рисков"],
			nextBestAction,
			recallDueAt: recallTask?.dueAt ?? null,
			balanceDueRub,
			openTasks: patientTasks.length,
			missingDocumentKinds,
			clinicalFlags,
			adminFlags,
			lastActivityAt: latestActivity,
		};
	});
}

function rub(value: number): string {
	return `${value.toLocaleString("ru-RU")} ₽`;
}

function isClockTime(value: unknown): value is string {
	return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clockToMinutes(value: string): number {
	const [hours = "0", minutes = "0"] = value.split(":");
	return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

function normalizeWorkingDays(value: unknown): number[] {
	const rawDays = Array.isArray(value)
		? value
		: defaultClinicScheduleDefaults.workingDays;
	const days = Array.from(
		new Set(
			rawDays
				.filter(
					(day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
				)
				.sort((left, right) => left - right),
		),
	);
	return days.length ? days : defaultClinicScheduleDefaults.workingDays;
}

function normalizeOptionalWeekdays(value: unknown): number[] {
	const rawDays = Array.isArray(value) ? value : [];
	return Array.from(
		new Set(
			rawDays
				.filter(
					(day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
				)
				.sort((left, right) => left - right),
		),
	);
}

function normalizeClinicScheduleDefaults(
	input?: Partial<ClinicScheduleDefaults> | null,
): ClinicScheduleDefaults {
	const workdayStart = isClockTime(input?.workdayStart)
		? input.workdayStart
		: defaultClinicScheduleDefaults.workdayStart;
	const requestedEnd = isClockTime(input?.workdayEnd)
		? input.workdayEnd
		: defaultClinicScheduleDefaults.workdayEnd;
	const workdayEnd =
		clockToMinutes(requestedEnd) > clockToMinutes(workdayStart)
			? requestedEnd
			: defaultClinicScheduleDefaults.workdayEnd;
	const requestedBuffer = input?.appointmentBufferMinutes;
	const buffer =
		typeof requestedBuffer === "number" &&
		Number.isInteger(requestedBuffer) &&
		requestedBuffer >= 0
			? Math.min(requestedBuffer, 180)
			: defaultClinicScheduleDefaults.appointmentBufferMinutes;

	return {
		workdayStart,
		workdayEnd,
		workingDays: normalizeWorkingDays(input?.workingDays),
		appointmentBufferMinutes: buffer,
	};
}

function defaultStaffWorkingHours(): StaffWorkingHours {
	return Array.from({ length: 7 }, (_, weekday) => ({
		weekday,
		enabled: defaultClinicScheduleDefaults.workingDays.includes(weekday),
		start: defaultClinicScheduleDefaults.workdayStart,
		end: defaultClinicScheduleDefaults.workdayEnd,
	}));
}

function normalizeStaffWorkingHours(
	input?: StaffWorkingHours | null,
): StaffWorkingHours {
	const byWeekday = new Map<number, StaffWorkingHours[number]>();
	if (Array.isArray(input)) {
		input.forEach((day) => {
			if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6)
				return;
			const start = isClockTime(day.start)
				? day.start
				: defaultClinicScheduleDefaults.workdayStart;
			const requestedEnd = isClockTime(day.end)
				? day.end
				: defaultClinicScheduleDefaults.workdayEnd;
			const end =
				clockToMinutes(requestedEnd) > clockToMinutes(start)
					? requestedEnd
					: defaultClinicScheduleDefaults.workdayEnd;
			byWeekday.set(day.weekday, {
				weekday: day.weekday,
				enabled: Boolean(day.enabled),
				start,
				end,
			});
		});
	}
	return defaultStaffWorkingHours().map(
		(fallback) => byWeekday.get(fallback.weekday) ?? fallback,
	);
}

function normalizeMutableScheduleState(): void {
	clinicProfile.scheduleDefaults = normalizeClinicScheduleDefaults(
		clinicProfile.scheduleDefaults,
	);
	staffMembers.forEach((member) => {
		member.workingHours = normalizeStaffWorkingHours(
			member.workingHours ?? null,
		);
	});
	chairs.forEach((chair) => {
		chair.workingHours = normalizeStaffWorkingHours(chair.workingHours ?? null);
	});
	if (uiPreferences) {
		uiPreferences = uiPreferencesSchema.parse({
			...uiPreferences,
			savedAt: uiPreferences.savedAt || new Date().toISOString(),
		});
	}
}

const appointmentTimeFormatters = new Map<string, Intl.DateTimeFormat>();

export function validScheduleTimeZone(
	value: string | null | undefined,
): string {
	const timeZone = value?.trim() || defaultClinicTimezone;
	try {
		getAppointmentTimeFormatter(timeZone);
		return timeZone;
	} catch {
		return defaultClinicTimezone;
	}
}

/**
 * Сегодняшняя дата в часовом поясе клиники (YYYY-MM-DD).
 *
 * БЫЛО: buildDashboard() возвращал жёстко зашитое "2026-05-12". От этого
 * значения считается вся вкладка «Смена»: какие приёмы показать как сегодняшние,
 * что просрочено, что закрывать. То есть расписание всегда показывало «сегодня»
 * 12 мая 2026 года независимо от реальной даты.
 *
 * Дата берётся именно в часовом поясе клиники, а не сервера: в Самаре рабочий
 * день начинается на три часа раньше UTC, и по UTC-дате утренние приёмы
 * попадали бы во «вчера».
 */
function clinicTodayIso(timeZone: string = clinicProfile.timezone): string {
	const zone = validScheduleTimeZone(timeZone);
	try {
		const parts = new Map(
			getAppointmentTimeFormatter(zone)
				.formatToParts(new Date())
				.map((part) => [part.type, part.value]),
		);
		const year = parts.get("year");
		const month = parts.get("month");
		const day = parts.get("day");
		if (year && month && day) return `${year}-${month}-${day}`;
	} catch {
		// Ниже — запасной вариант по UTC.
	}
	return new Date().toISOString().slice(0, 10);
}

function assertValidScheduleTimeZone(value: string): void {
	try {
		getAppointmentTimeFormatter(value);
	} catch {
		throw new Error(
			"Укажите реальный часовой пояс клиники, например Europe/Samara или Europe/Moscow.",
		);
	}
}

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

function appointmentClinicTimeParts(
	value: string,
	sourceTimeZone?: string,
	state: DomainState = inMemoryDomainState,
): { weekday: number; minute: number; timeZone: string } {
	sourceTimeZone ??= state.clinicProfile.timezone;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return {
			weekday: 0,
			minute: 0,
			timeZone: validScheduleTimeZone(sourceTimeZone),
		};
	}
	const timeZone = validScheduleTimeZone(sourceTimeZone);
	const formatter = getAppointmentTimeFormatter(timeZone);
	const parts = new Map(
		formatter.formatToParts(date).map((part) => [part.type, part.value]),
	);
	const year = Number.parseInt(parts.get("year") ?? "", 10);
	const month = Number.parseInt(parts.get("month") ?? "", 10);
	const day = Number.parseInt(parts.get("day") ?? "", 10);
	const hour = Number.parseInt(parts.get("hour") ?? "", 10);
	const minute = Number.parseInt(parts.get("minute") ?? "", 10);

	if (![year, month, day, hour, minute].every(Number.isFinite)) {
		return {
			weekday: date.getDay(),
			minute: date.getHours() * 60 + date.getMinutes(),
			timeZone,
		};
	}

	return {
		weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
		minute: (hour % 24) * 60 + minute,
		timeZone,
	};
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
	const parts = new Map(
		formatter.formatToParts(date).map((part) => [part.type, part.value]),
	);
	const year = parts.get("year");
	const month = parts.get("month");
	const day = parts.get("day");

	return year && month && day ? `${year}-${month}-${day}` : fallbackDateKey;
}

function appointmentsShareClinicDate(
	left: Appointment,
	right: Appointment,
): boolean {
	return (
		appointmentClinicDateKey(left.startsAt) ===
		appointmentClinicDateKey(right.startsAt)
	);
}

function appointmentWeekday(
	appointment: Appointment,
	timeZone?: string,
	state: DomainState = inMemoryDomainState,
): number {
	return appointmentClinicTimeParts(appointment.startsAt, timeZone, state)
		.weekday;
}

function appointmentStartMinute(
	appointment: Appointment,
	timeZone?: string,
	state: DomainState = inMemoryDomainState,
): number {
	return appointmentClinicTimeParts(appointment.startsAt, timeZone, state)
		.minute;
}

function appointmentEndMinute(
	appointment: Appointment,
	timeZone?: string,
	state: DomainState = inMemoryDomainState,
): number {
	return appointmentClinicTimeParts(appointment.endsAt, timeZone, state).minute;
}

function appointmentWithinClinicScheduleDefaults(
	appointment: Appointment,
	scheduleDefaults: ClinicProfile["scheduleDefaults"],
	timezone: string,
): { ready: boolean; detail: string } {
	const schedule = normalizeClinicScheduleDefaults(scheduleDefaults);
	const timeZone = validScheduleTimeZone(timezone);
	const weekday = appointmentWeekday(appointment, timeZone);
	const start = appointmentStartMinute(appointment, timeZone);
	const end = appointmentEndMinute(appointment, timeZone);
	const opensAt = clockToMinutes(schedule.workdayStart);
	const closesAt = clockToMinutes(schedule.workdayEnd);
	if (!schedule.workingDays.includes(weekday)) {
		return {
			ready: false,
			detail: `прием стоит на нерабочий день клиники (${timeZone})`,
		};
	}
	if (start < opensAt || end > closesAt) {
		return {
			ready: false,
			detail: `прием вне окна клиники ${schedule.workdayStart}-${schedule.workdayEnd} (${timeZone})`,
		};
	}
	return {
		ready: true,
		detail: `окно клиники ${schedule.workdayStart}-${schedule.workdayEnd} (${timeZone})`,
	};
}

function appointmentWithinClinicSchedule(
	appointment: Appointment,
	state: DomainState = inMemoryDomainState,
): {
	ready: boolean;
	detail: string;
} {
	const { clinicProfile } = state;
	return appointmentWithinClinicScheduleDefaults(
		appointment,
		clinicProfile.scheduleDefaults,
		clinicProfile.timezone,
	);
}

function appointmentWithinStaffSchedule(
	appointment: Appointment,
	staff: StaffMember | undefined | null,
	label = "врач",
	state: DomainState = inMemoryDomainState,
): { ready: boolean; detail: string } {
	const { clinicProfile } = state;
	if (!staff)
		return { ready: false, detail: `нет ${label} для проверки расписания` };
	const timeZone = validScheduleTimeZone(clinicProfile.timezone);
	const workingHours = normalizeStaffWorkingHours(staff.workingHours ?? null);
	const weekday = appointmentWeekday(appointment);
	const workingDay = workingHours.find((day) => day.weekday === weekday);
	if (!workingDay?.enabled)
		return {
			ready: false,
			detail: `${label} не работает в этот день (${timeZone})`,
		};
	const start = appointmentStartMinute(appointment);
	const end = appointmentEndMinute(appointment);
	const opensAt = clockToMinutes(workingDay.start);
	const closesAt = clockToMinutes(workingDay.end);
	if (start < opensAt || end > closesAt) {
		return {
			ready: false,
			detail: `прием вне окна ${label} ${workingDay.start}-${workingDay.end} (${timeZone})`,
		};
	}
	return {
		ready: true,
		detail: `окно ${label} ${workingDay.start}-${workingDay.end} (${timeZone})`,
	};
}

function appointmentWithinChairSchedule(
	appointment: Appointment,
	chair: Chair | undefined | null,
	state: DomainState = inMemoryDomainState,
): { ready: boolean; detail: string } {
	const { clinicProfile } = state;
	if (!chair)
		return { ready: false, detail: "нет кресла для проверки расписания" };
	const timeZone = validScheduleTimeZone(clinicProfile.timezone);
	const workingHours = normalizeStaffWorkingHours(chair.workingHours ?? null);
	const weekday = appointmentWeekday(appointment);
	const workingDay = workingHours.find((day) => day.weekday === weekday);
	if (!workingDay?.enabled)
		return {
			ready: false,
			detail: `кресло не работает в этот день (${timeZone})`,
		};
	const start = appointmentStartMinute(appointment);
	const end = appointmentEndMinute(appointment);
	const opensAt = clockToMinutes(workingDay.start);
	const closesAt = clockToMinutes(workingDay.end);
	if (start < opensAt || end > closesAt) {
		return {
			ready: false,
			detail: `прием вне окна кресла ${workingDay.start}-${workingDay.end} (${timeZone})`,
		};
	}
	return {
		ready: true,
		detail: `окно кресла ${workingDay.start}-${workingDay.end} (${timeZone})`,
	};
}

function appointmentWithinPatientPreference(
	appointment: Appointment,
	patient: Patient | undefined | null,
	state: DomainState = inMemoryDomainState,
): { ready: boolean; detail: string } {
	const { clinicProfile } = state;
	const preference = patient?.administrativeProfile;
	if (!preference)
		return {
			ready: true,
			detail: "предпочтения пациента по времени не заданы",
		};
	const weekdays = preference.preferredAppointmentWeekdays ?? [];
	const weekday = appointmentWeekday(appointment);
	const timeZone = validScheduleTimeZone(clinicProfile.timezone);
	if (weekdays.length && !weekdays.includes(weekday)) {
		return {
			ready: false,
			detail: `пациент предпочитает другие дни записи (${timeZone})`,
		};
	}
	if (
		preference.preferredAppointmentStart &&
		preference.preferredAppointmentEnd
	) {
		const start = appointmentStartMinute(appointment);
		const end = appointmentEndMinute(appointment);
		const opensAt = clockToMinutes(preference.preferredAppointmentStart);
		const closesAt = clockToMinutes(preference.preferredAppointmentEnd);
		if (start < opensAt || end > closesAt) {
			return {
				ready: false,
				detail: `прием вне удобного окна пациента ${preference.preferredAppointmentStart}-${preference.preferredAppointmentEnd} (${timeZone})`,
			};
		}
		return {
			ready: true,
			detail: `окно пациента ${preference.preferredAppointmentStart}-${preference.preferredAppointmentEnd} (${timeZone})`,
		};
	}
	return weekdays.length
		? {
				ready: true,
				detail: `день подходит под предпочтения пациента (${timeZone})`,
			}
		: {
				ready: true,
				detail: "предпочтения пациента по времени не ограничивают запись",
			};
}

function clinicDailyCapacityMinutes(
	state: DomainState = inMemoryDomainState,
): number {
	const schedule = normalizeClinicScheduleDefaults(
		state.clinicProfile.scheduleDefaults,
	);
	return Math.max(
		60,
		clockToMinutes(schedule.workdayEnd) - clockToMinutes(schedule.workdayStart),
	);
}

function workingHoursDailyCapacityMinutes(
	workingHoursInput?: StaffWorkingHours | null,
): number {
	const workingHours = normalizeStaffWorkingHours(
		workingHoursInput ?? null,
	).filter((day) => day.enabled);
	if (!workingHours.length) return clinicDailyCapacityMinutes();
	const total = workingHours.reduce(
		(sum, day) =>
			sum + Math.max(0, clockToMinutes(day.end) - clockToMinutes(day.start)),
		0,
	);
	return Math.max(60, Math.round(total / workingHours.length));
}

function staffDailyCapacityMinutes(staff: StaffMember): number {
	return workingHoursDailyCapacityMinutes(staff.workingHours ?? null);
}

function buildAppointmentReadiness(
	patientInsights?: PatientInsight[],
	domainState: DomainState = inMemoryDomainState,
): AppointmentReadiness[] {
	const {
		appointments,
		patients,
		staffMembers,
		chairs,
		communicationTasks,
		documents,
		imagingStudies,
		clinicProfile,
	} = domainState;
	patientInsights ??= buildPatientInsights(domainState);
	const patientsById = new Map(patients.map((p) => [p.id, p]));
	const activeStaffById = new Map(
		staffMembers.filter((m) => m.active).map((m) => [m.id, m]),
	);
	const activeChairsById = new Map(
		chairs.filter((c) => c.active).map((c) => [c.id, c]),
	);
	const patientInsightsByPatientId = new Map(
		patientInsights.map((i) => [i.patientId, i]),
	);

	const documentsByPatientId = new Map<string, typeof documents>();
	for (const doc of documents) {
		if (doc.status !== "voided") {
			if (!documentsByPatientId.has(doc.patientId))
				documentsByPatientId.set(doc.patientId, []);
			documentsByPatientId.get(doc.patientId)?.push(doc);
		}
	}

	const imagesByPatientId = new Map<string, typeof imagingStudies>();
	for (const study of imagingStudies) {
		if (!imagesByPatientId.has(study.patientId))
			imagesByPatientId.set(study.patientId, []);
		imagesByPatientId.get(study.patientId)?.push(study);
	}

	const tasksByAppointmentId = new Map<string, typeof communicationTasks>();
	for (const task of communicationTasks) {
		if (isOpenCommunicationTask(task) && task.appointmentId !== null) {
			if (!tasksByAppointmentId.has(task.appointmentId))
				tasksByAppointmentId.set(task.appointmentId, []);
			tasksByAppointmentId.get(task.appointmentId)?.push(task);
		}
	}

	return appointments.map((appointment) => {
		const patientId = appointment.patientId || "";
		const doctorUserId = appointment.doctorUserId || "";
		const chairId = appointment.chairId || "";

		const patient = patientsById.get(patientId);
		const doctor = activeStaffById.get(doctorUserId);
		const assistant = appointment.assistantUserId
			? (activeStaffById.get(appointment.assistantUserId) ?? null)
			: null;

		// Check if the assistant role matches, since the old code did `&& member.role === "assistant"`
		const finalAssistant =
			assistant && assistant.role === "assistant" ? assistant : null;

		const chair = activeChairsById.get(chairId);
		const patientDocuments = documentsByPatientId.get(patientId) ?? [];
		const patientImages = imagesByPatientId.get(patientId) ?? [];
		const insight = patientInsightsByPatientId.get(patientId);
		const appointmentTasks = tasksByAppointmentId.get(appointment.id) ?? [];
		const hasContract = patientDocuments.some(
			(document) => document.kind === "paid_medical_services_contract",
		);
		const hasConsent = patientDocuments.some(
			(document) => document.kind === "informed_consent",
		);
		const hasImageForTreatment = patientImages.some(
			(study) => study.status !== "failed",
		);
		const hasImageReviewBlocker = patientImages.some(
			(study) => study.status === "needs_review",
		);
		const hasBalance = (insight?.balanceDueRub ?? 0) > 0;
		const clinicScheduleCheck = appointmentWithinClinicSchedule(
			appointment,
			domainState,
		);
		const patientScheduleCheck = appointmentWithinPatientPreference(
			appointment,
			patient,
			domainState,
		);
		const doctorScheduleCheck = appointmentWithinStaffSchedule(
			appointment,
			doctor,
			"врача",
			domainState,
		);
		const assistantRequired = clinicProfile.mode !== "solo_doctor";
		const assistantScheduleCheck = assistantRequired
			? appointmentWithinStaffSchedule(
					appointment,
					finalAssistant,
					"ассистента",
					domainState,
				)
			: { ready: true, detail: "ассистент не требуется для режима клиники" };
		const chairScheduleCheck = appointmentWithinChairSchedule(
			appointment,
			chair,
			domainState,
		);
		const patientPreferenceWarnings = patientScheduleCheck.ready
			? []
			: [`Вне удобного окна пациента: ${patientScheduleCheck.detail}`];
		const hasScheduleBlocker =
			!clinicScheduleCheck.ready ||
			!doctorScheduleCheck.ready ||
			(assistantRequired && !assistantScheduleCheck.ready) ||
			!chairScheduleCheck.ready;
		const checks: AppointmentReadiness["checks"] = [
			{
				key: "patient",
				title: "Пациент",
				ready: Boolean(patient),
				detail: patient ? "карточка найдена" : "нет карточки пациента",
			},
			{
				key: "team",
				title: "Команда",
				ready: Boolean(doctor && chair && (!assistantRequired || assistant)),
				detail: `${doctor ? "врач есть" : "нет врача"} · ${chair ? chair.name : "нет кресла"} · ${
					assistant
						? `ассистент ${assistant.fullName.split(" ")[0]}`
						: assistantRequired
							? "ассистент не назначен"
							: "ассистент не требуется"
				}`,
			},
			{
				key: "schedule",
				title: "Расписание",
				ready:
					clinicScheduleCheck.ready &&
					patientScheduleCheck.ready &&
					doctorScheduleCheck.ready &&
					(!assistantRequired || assistantScheduleCheck.ready) &&
					chairScheduleCheck.ready,
				detail: clinicScheduleCheck.ready
					? doctorScheduleCheck.ready
						? assistantScheduleCheck.ready
							? chairScheduleCheck.detail
							: assistantScheduleCheck.detail
						: doctorScheduleCheck.detail
					: clinicScheduleCheck.detail,
			},
			{
				key: "documents",
				title: "Документы",
				ready: hasContract && hasConsent,
				detail:
					hasContract && hasConsent
						? "договор и согласие готовы"
						: "нужны договор/согласие",
			},
			{
				key: "imaging",
				title: "Снимки",
				ready: hasImageForTreatment && !hasImageReviewBlocker,
				detail: hasImageReviewBlocker
					? "снимок требует проверки"
					: hasImageForTreatment
						? "снимки доступны"
						: "снимков нет",
			},
			{
				key: "communication",
				title: "Связь",
				ready: appointmentTasks.length === 0,
				detail: appointmentTasks.length
					? `${appointmentTasks.length} задач связи`
					: "нет открытых задач",
			},
			{
				key: "finance",
				title: "Оплата",
				ready: !hasBalance,
				detail: hasBalance
					? `остаток ${rub(insight?.balanceDueRub ?? 0)}`
					: "без открытого остатка",
			},
		];
		const blockers = checks
			.filter((check) => !check.ready)
			.map((check) => check.detail);
		const warnings = patientPreferenceWarnings;
		const score = Math.round(
			(checks.filter((check) => check.ready).length / checks.length) * 100,
		);

		let state: AppointmentReadiness["state"];
		if (
			!patient ||
			!doctor ||
			!chair ||
			hasImageReviewBlocker ||
			hasScheduleBlocker
		) {
			state = "blocked";
		} else if (warnings.length || score < 84) {
			state = "needs_attention";
		} else {
			state = "ready";
		}

		let ownerRole: AppointmentReadiness["ownerRole"];
		if (hasScheduleBlocker || warnings.length) {
			ownerRole = "administrator";
		} else if (!doctor || hasImageReviewBlocker) {
			ownerRole = "doctor";
		} else if (!chair || (assistantRequired && !assistant)) {
			ownerRole = "assistant";
		} else if (
			!hasContract ||
			!hasConsent ||
			hasBalance ||
			appointmentTasks.length > 0
		) {
			ownerRole = "administrator";
		} else {
			ownerRole = "assistant";
		}

		let nextAction: string;
		if (state === "ready") {
			nextAction = "Можно принимать пациента";
		} else if (!patient) {
			nextAction = "Создать карточку пациента";
		} else if (!doctor) {
			nextAction = "Назначить врача";
		} else if (!chair) {
			nextAction = "Назначить кресло";
		} else if (assistantRequired && !assistant) {
			nextAction = "Назначить ассистента";
		} else if (hasScheduleBlocker) {
			nextAction = "Согласовать время приема";
		} else if (warnings.length) {
			nextAction = "Подтвердить время с пациентом";
		} else if (hasImageReviewBlocker) {
			nextAction = "Проверить снимок";
		} else if (!hasContract || !hasConsent) {
			nextAction = "Подготовить документы";
		} else if (hasBalance) {
			nextAction = "Уточнить оплату";
		} else if (appointmentTasks.length > 0) {
			nextAction = "Закрыть связь с пациентом";
		} else {
			nextAction = "Проверить подготовку";
		}

		return {
			appointmentId: appointment.id,
			patientId: appointment.patientId,
			state,
			score,
			ownerRole,
			nextAction,
			blockers,
			warnings,
			checks,
		};
	});
}

function buildRecommendedActions(
	patientInsights?: PatientInsight[],
	state: DomainState = inMemoryDomainState,
): RecommendedAction[] {
	const {
		activeVisit,
		appointments,
		auditEvents,
		communicationTasks,
		documents,
		imagingStudies,
		importBatches,
		patients,
	} = state;
	patientInsights ??= buildPatientInsights(state);
	const actions: RecommendedAction[] = [];
	const activeInsight = patientInsights.find(
		(insight) => insight.patientId === activeVisit.patientId,
	);
	const activePatient = patients.find(
		(patient) => patient.id === activeVisit.patientId,
	);
	const reviewImage = imagingStudies.find(
		(study) => study.status === "needs_review",
	);
	const taxDraft = documents.find(
		(document) =>
			document.kind === "tax_deduction_certificate" &&
			document.status === "draft",
	);
	const urgentTask = communicationTasks
		.filter(isOpenCommunicationTask)
		.sort((left, right) => {
			const priority = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
			return (
				priority[left.priority] - priority[right.priority] ||
				left.dueAt.localeCompare(right.dueAt)
			);
		})[0];
	const incompleteImport = importBatches.find(
		(batch) => batch.status !== "completed",
	);
	const modeFit = buildModeFit();

	const add = (action: RecommendedAction) => actions.push(action);

	if (hasUnsignedActiveVisit(state)) {
		add({
			id: "action-sign-active-visit",
			role: "doctor",
			priority: "urgent",
			section: "visit",
			patientId: activeVisit.patientId,
			title: "Закрыть медицинскую запись",
			detail: activePatient
				? `${activePatient.fullName}: жалобы, диагноз и план требуют проверки врача.`
				: "Активная ЭМК требует проверки врача.",
			metricLabel: "ЭМК",
			actionLabel: "Открыть прием",
			source: "visit.status",
		});
	}

	if (reviewImage) {
		add({
			id: "action-review-image",
			role: "doctor",
			priority: "urgent",
			section: "visit",
			patientId: reviewImage.patientId,
			title: "Проверить снимок",
			detail: `${reviewImage.title}: AI-описание остается черновиком до врачебной проверки.`,
			metricLabel: "снимок",
			actionLabel: "Открыть снимки",
			source: "imaging.status",
		});
	}

	if (activeInsight && activeInsight.balanceDueRub > 0) {
		add({
			id: "action-close-balance",
			role: "administrator",
			priority: activeInsight.balanceDueRub >= 10000 ? "urgent" : "important",
			section: "finance",
			patientId: activeInsight.patientId,
			title: "Связать оплату с документами",
			detail:
				"Проверить остаток, акт, договор и справку для налогового вычета до выдачи пациенту.",
			metricLabel: rub(activeInsight.balanceDueRub),
			actionLabel: "Открыть оплаты",
			source: "patientInsight.balance",
		});
	}

	if (taxDraft) {
		add({
			id: "action-tax-document",
			role: "administrator",
			priority: "important",
			section: "documents",
			patientId: taxDraft.patientId,
			title: "Подготовить справку для вычета",
			detail: `${taxDraft.title}: сверить пациента, оплату и сумму перед выдачей.`,
			metricLabel: "вычет",
			actionLabel: "Открыть документы",
			source: "document.taxDraft",
		});
	}

	if (urgentTask) {
		add({
			id: "action-communication",
			role: urgentTask.assignedRole,
			priority: urgentTask.priority === "urgent" ? "urgent" : "important",
			section: "communications",
			patientId: urgentTask.patientId,
			title: urgentTask.title,
			detail: urgentTask.body,
			metricLabel: urgentTask.channel,
			actionLabel: "Открыть связь",
			source: "communication.task",
		});
	}

	const confirmedAppointment = appointments.find(
		(appointment) => appointment.status === "confirmed",
	);
	if (confirmedAppointment) {
		add({
			id: "action-prepare-chair",
			role: "assistant",
			priority: "important",
			section: "shift",
			patientId: confirmedAppointment.patientId,
			title: "Подготовить кабинет",
			detail:
				"Проверить кресло, согласия, снимки и расходники до посадки пациента.",
			metricLabel: "кресло",
			actionLabel: "Открыть смену",
			source: "appointment.confirmed",
		});
	}

	if (incompleteImport) {
		add({
			id: "action-import-review",
			role: "manager",
			priority: "important",
			section: "settings",
			patientId: null,
			title: "Проверить импорт данных",
			detail: `${incompleteImport.sourceName}: ${incompleteImport.warningRows} строк с предупреждениями, ${incompleteImport.blockedRows} заблокировано.`,
			metricLabel: "импорт",
			actionLabel: "Открыть импорт",
			source: "import.batch",
		});
	} else {
		add({
			id: "action-manager-audit",
			role: "manager",
			priority: "routine",
			section: "settings",
			patientId: null,
			title: "Проверить аудит и качество данных",
			detail: `Импортов: ${importBatches.length}. Последних событий аудита: ${auditEvents.length}.`,
			metricLabel: "аудит",
			actionLabel: "Открыть аудит",
			source: "audit.summary",
		});
	}

	if (modeFit.blockers.length > 0) {
		add({
			id: "action-mode-fit",
			role: "owner",
			priority: "important",
			section: "settings",
			patientId: null,
			title: "Донастроить режим клиники",
			detail: modeFit.blockers[0] ?? modeFit.lowFrictionNextStep,
			metricLabel: `${modeFit.fitScore}%`,
			actionLabel: "Открыть настройки",
			source: "clinic.modeFit",
		});
	} else {
		add({
			id: "action-owner-mode-health",
			role: "owner",
			priority: "routine",
			section: "settings",
			patientId: null,
			title: "Проверить готовность режима",
			detail: modeFit.lowFrictionNextStep,
			metricLabel: `${modeFit.fitScore}%`,
			actionLabel: "Открыть доступы",
			source: "clinic.modeFit",
		});
	}

	const priorityRank: Record<RecommendedAction["priority"], number> = {
		urgent: 0,
		important: 1,
		routine: 2,
	};
	return actions
		.sort(
			(left, right) =>
				priorityRank[left.priority] - priorityRank[right.priority],
		)
		.slice(0, 10);
}

function buildScheduleSuggestions(
	readiness?: AppointmentReadiness[],
	state: DomainState = inMemoryDomainState,
): ScheduleSuggestion[] {
	const { appointments, clinicProfile, patients } = state;
	readiness ??= buildAppointmentReadiness(undefined, state);
	const suggestions: ScheduleSuggestion[] = [];
	const priorityRank: Record<ScheduleSuggestion["priority"], number> = {
		urgent: 0,
		important: 1,
		routine: 2,
	};
	const add = (suggestion: ScheduleSuggestion) => suggestions.push(suggestion);

	const appointmentsById = new Map(appointments.map((a) => [a.id, a]));
	const patientsById = new Map(patients.map((p) => [p.id, p]));

	readiness.forEach((item) => {
		const appointment = appointmentsById.get(item.appointmentId);
		const patient = item.patientId
			? patientsById.get(item.patientId)
			: undefined;
		if (!appointment) return;

		if (item.state === "blocked") {
			add({
				id: `schedule-blocked-${item.appointmentId}`,
				priority: "urgent",
				ownerRole: item.ownerRole,
				appointmentId: item.appointmentId,
				section: item.ownerRole === "doctor" ? "visit" : "schedule",
				title: "Перед посадкой нужна быстрая проверка",
				detail: `${patient?.fullName ?? "Пациент"} · ${item.nextAction}`,
				actionLabel:
					item.ownerRole === "doctor" ? "Открыть прием" : "Открыть запись",
				reason: item.blockers[0] ?? "есть предупреждение готовности",
			});
			return;
		}

		if (item.state === "needs_attention") {
			add({
				id: `schedule-attention-${item.appointmentId}`,
				priority: "important",
				ownerRole: item.ownerRole,
				appointmentId: item.appointmentId,
				section: "schedule",
				title: "Довести запись до готовности",
				detail: `${patient?.fullName ?? "Пациент"} · ${item.score}% готовности`,
				actionLabel: "Проверить подготовку",
				reason: item.blockers.slice(0, 2).join(" · ") || item.nextAction,
			});
		}
	});

	const sorted = appointments
		.slice()
		.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
	for (let index = 0; index < sorted.length - 1; index += 1) {
		const current = sorted[index];
		const next = sorted[index + 1];
		if (!current || !next) continue;
		if (!appointmentsShareClinicDate(current, next)) continue;
		const gapMinutes = Math.round(
			(new Date(next.startsAt).getTime() - new Date(current.endsAt).getTime()) /
				60000,
		);
		const sameAssistant = Boolean(
			current.assistantUserId &&
				current.assistantUserId === next.assistantUserId,
		);
		const sameResource =
			current.doctorUserId === next.doctorUserId ||
			sameAssistant ||
			current.chairId === next.chairId;
		const bufferMinutes = normalizeClinicScheduleDefaults(
			clinicProfile.scheduleDefaults,
		).appointmentBufferMinutes;
		if (sameResource && gapMinutes < bufferMinutes) {
			add({
				id: `schedule-buffer-${current.id}-${next.id}`,
				priority: "urgent",
				ownerRole: "administrator",
				appointmentId: next.id,
				section: "schedule",
				title: "Недостаточный буфер между приемами",
				detail:
					gapMinutes < 0
						? "Приемы пересекаются по врачу, ассистенту или креслу."
						: `${gapMinutes} мин между приемами при настроенном буфере ${bufferMinutes} мин.`,
				actionLabel: "Разнести приемы",
				reason:
					"настройка расписания требует буфер перед посадкой следующего пациента",
			});
		} else if (sameResource && gapMinutes >= 45) {
			add({
				id: `schedule-gap-${current.id}-${next.id}`,
				priority: "routine",
				ownerRole: "administrator",
				appointmentId: next.id,
				section: "schedule",
				title: "Есть окно в расписании",
				detail: `${gapMinutes} мин между приемами: можно поставить срочную консультацию или документы.`,
				actionLabel: "Открыть расписание",
				reason: "свободное окно без перегруза кресла",
			});
		}
	}

	const overbooked = [
		...buildDoctorLoads(),
		...buildAssistantLoads(),
		...buildChairLoads(),
	].find((load) => load.state === "overbooked");
	if (overbooked) {
		add({
			id: `schedule-overbooked-${overbooked.id}`,
			priority: "urgent",
			ownerRole:
				overbooked.kind === "doctor"
					? "doctor"
					: overbooked.kind === "assistant"
						? "assistant"
						: "administrator",
			appointmentId: null,
			section: "schedule",
			title: "Перегруз ресурса",
			detail: `${overbooked.title}: ${overbooked.utilizationPercent}% загрузки.`,
			actionLabel: "Разгрузить смену",
			reason: overbooked.flags[0] ?? "ресурс перегружен",
		});
	}

	return suggestions
		.sort(
			(left, right) =>
				priorityRank[left.priority] - priorityRank[right.priority],
		)
		.slice(0, 6);
}

function appointmentDurationMinutes(appointment: Appointment): number {
	const startsAt = new Date(appointment.startsAt).getTime();
	const endsAt = new Date(appointment.endsAt).getTime();
	return Math.max(0, Math.round((endsAt - startsAt) / 60000));
}

function activeShiftDateKey(state: DomainState = inMemoryDomainState): string {
	const { appointments, activeVisit } = state;
	const activeAppointment = appointments.find(
		(appointment) => appointment.id === activeVisit.appointmentId,
	);
	return appointmentClinicDateKey(
		activeAppointment?.startsAt ?? nowIso,
		undefined,
		state,
	);
}

function appointmentBelongsToShiftDate(
	appointment: Appointment,
	shiftDate: string,
): boolean {
	return appointmentClinicDateKey(appointment.startsAt) === shiftDate;
}

function workloadState(
	utilizationPercent: number,
	appointmentCount: number,
): ResourceLoad["state"] {
	if (appointmentCount === 0) return "idle";
	if (utilizationPercent >= 96) return "overbooked";
	if (utilizationPercent >= 72) return "tight";
	return "healthy";
}

function buildResourceLoad(input: {
	id: string;
	kind: ResourceLoad["kind"];
	title: string;
	subtitle: string;
	appointments: Appointment[];
	capacityMinutes: number;
	flags: string[];
}): ResourceLoad {
	const bookedMinutes = input.appointments.reduce(
		(total, appointment) => total + appointmentDurationMinutes(appointment),
		0,
	);
	const rawUtilizationPercent =
		input.capacityMinutes > 0
			? Math.round((bookedMinutes / input.capacityMinutes) * 100)
			: 0;
	const utilizationPercent = Math.min(200, rawUtilizationPercent);
	const lastAppointment = input.appointments
		.slice()
		.sort((left, right) => right.endsAt.localeCompare(left.endsAt))[0];
	const state = workloadState(rawUtilizationPercent, input.appointments.length);
	const flags = [...input.flags];

	if (state === "idle") flags.push("Нет записей на смену");
	if (state === "tight")
		flags.push("Плотная смена: оставлять буфер на документы");
	if (state === "overbooked")
		flags.push("Перегруз: нужна переноска или второй ресурс");
	if (rawUtilizationPercent > utilizationPercent)
		flags.push(
			`Фактическая загрузка ${rawUtilizationPercent}%, шкала ограничена 200%`,
		);

	return {
		id: input.id,
		kind: input.kind,
		title: input.title,
		subtitle: input.subtitle,
		bookedMinutes,
		appointmentCount: input.appointments.length,
		utilizationPercent,
		nextFreeAt: lastAppointment?.endsAt ?? null,
		state,
		flags,
	};
}

function buildDoctorLoads(
	state: DomainState = inMemoryDomainState,
): ResourceLoad[] {
	const { staffMembers, appointments } = state;
	const activeDoctors = staffMembers.filter(
		(member) =>
			member.active && (member.role === "doctor" || member.role === "owner"),
	);
	const shiftDate = activeShiftDateKey(state);

	return activeDoctors.map((doctor) => {
		const doctorAppointments = appointments.filter(
			(appointment) =>
				appointment.doctorUserId === doctor.id &&
				appointmentBelongsToShiftDate(appointment, shiftDate),
		);
		return buildResourceLoad({
			id: doctor.id,
			kind: "doctor",
			title: doctor.fullName,
			subtitle: doctor.specialties.map((specialty) => specialty).join(", "),
			appointments: doctorAppointments,
			capacityMinutes: staffDailyCapacityMinutes(doctor),
			flags: [
				...(doctor.canSignMedicalRecords ? [] : ["Нет права подписи ЭМК"]),
				...(doctor.specialties.includes("universal")
					? ["Специальность не уточнена"]
					: []),
			],
		});
	});
}

function buildAssistantLoads(
	state: DomainState = inMemoryDomainState,
): ResourceLoad[] {
	const { staffMembers, appointments } = state;
	const activeAssistants = staffMembers.filter(
		(member) => member.active && member.role === "assistant",
	);
	const shiftDate = activeShiftDateKey(state);

	return activeAssistants.map((assistant) => {
		const assistantAppointments = appointments.filter(
			(appointment) =>
				appointment.assistantUserId === assistant.id &&
				appointmentBelongsToShiftDate(appointment, shiftDate),
		);
		return buildResourceLoad({
			id: assistant.id,
			kind: "assistant",
			title: assistant.fullName,
			subtitle: assistant.specialties.map((specialty) => specialty).join(", "),
			appointments: assistantAppointments,
			capacityMinutes: staffDailyCapacityMinutes(assistant),
			flags: [
				...(assistant.specialties.length
					? [`Профили: ${assistant.specialties.join(", ")}`]
					: ["Профиль ассистента не задан"]),
				...(assistantAppointments.length ? [] : ["нет назначенных приемов"]),
			],
		});
	});
}

function buildChairLoads(
	state: DomainState = inMemoryDomainState,
): ResourceLoad[] {
	const { chairs, appointments } = state;
	const shiftDate = activeShiftDateKey(state);
	return chairs
		.filter((chair) => chair.active)
		.map((chair) => {
			const chairAppointments = appointments.filter(
				(appointment) =>
					appointment.chairId === chair.id &&
					appointmentBelongsToShiftDate(appointment, shiftDate),
			);
			return buildResourceLoad({
				id: chair.id,
				kind: "chair",
				title: chair.name,
				subtitle:
					[chair.room, chair.specialization].filter(Boolean).join(" · ") ||
					"универсальное кресло",
				appointments: chairAppointments,
				capacityMinutes: workingHoursDailyCapacityMinutes(
					chair.workingHours ?? null,
				),
				flags: [
					...(chair.hasXraySensor ? ["RVG рядом"] : ["Нет RVG в кресле"]),
					...(chair.hasMicroscope ? ["Микроскоп"] : []),
					...(chair.hasSurgeryKit ? ["Хирургический набор"] : []),
				],
			});
		});
}

function buildRoleQueues(
	state: DomainState = inMemoryDomainState,
): RoleQueue[] {
	const {
		appointments,
		clinicProfile,
		documents,
		imagingStudies,
		importBatches,
		staffMembers,
	} = state;
	const billing = buildBillingSummary(state);
	const communication = buildCommunicationSummary(state);
	const draftDocuments = documents.filter(
		(document) => document.status === "draft",
	).length;
	const unsignedVisits = hasUnsignedActiveVisit(state) ? 1 : 0;
	const plannedAppointments = appointments.filter(
		(appointment) => appointment.status === "planned",
	).length;
	const reviewImages = imagingStudies.filter(
		(study) => study.status === "needs_review",
	).length;
	const incompleteImports = importBatches.filter(
		(batch) => batch.status !== "completed",
	).length;
	const hasAdmin = staffMembers.some(
		(member) => member.active && member.role === "administrator",
	);
	const hasAssistant = staffMembers.some(
		(member) => member.active && member.role === "assistant",
	);
	const hasManager = staffMembers.some(
		(member) =>
			member.active && (member.role === "manager" || member.role === "owner"),
	);

	return [
		{
			role: "doctor",
			title: "Клиническое закрытие",
			ownerLabel: "Врач",
			openItems: unsignedVisits + reviewImages,
			nextAction:
				reviewImages > 0
					? "Проверить снимки и AI-описания"
					: "Проверить и подписать ЭМК",
			automationHint: "AI готовит черновик, подпись остается ручной.",
			blockedBy: unsignedVisits > 0 ? ["Есть неподписанный прием"] : [],
		},
		{
			role: "administrator",
			title: "Администраторская очередь",
			ownerLabel: hasAdmin ? "Администратор" : "Врач или владелец",
			openItems:
				plannedAppointments +
				draftDocuments +
				billing.unpaidDocuments +
				communication.paymentReminders,
			nextAction:
				billing.totalDueRub > 0
					? "Закрыть оплату, документы и связь с пациентом"
					: "Подтвердить будущие записи",
			automationHint: "Документы создаются в один клик из приема или карточки.",
			blockedBy: hasAdmin ? [] : ["Нет отдельного администратора"],
		},
		{
			role: "assistant",
			title: "Подготовка кабинета",
			ownerLabel: hasAssistant ? "Ассистент" : "Врач",
			openItems:
				appointments.filter((appointment) => appointment.status === "confirmed")
					.length + communication.postVisitInstructions,
			nextAction: "Подготовить кресло, согласия, снимки и расходники",
			automationHint:
				"Кресло показывает RVG/микроскоп/хирургический набор до приема.",
			blockedBy: hasAssistant ? [] : ["Нет ассистента в смене"],
		},
		{
			role: "manager",
			title: "Управление и перенос данных",
			ownerLabel: hasManager ? "Управляющий" : "Владелец",
			openItems:
				incompleteImports + (clinicProfile.mode === "network_clinic" ? 1 : 0),
			nextAction:
				clinicProfile.mode === "network_clinic"
					? "Проверить сетевые права и филиалы"
					: "Следить за импортом и аудитом",
			automationHint: "Все переносы идут через preview, batch и аудит.",
			blockedBy: hasManager
				? []
				: ["Нет выделенного управляющего/владельца в ролях"],
		},
	];
}

function buildScheduleWarnings(
	state: DomainState = inMemoryDomainState,
): ScheduleWarning[] {
	const {
		activeVisit,
		appointments,
		clinicProfile,
		documents,
		imagingStudies,
		staffMembers,
	} = state;
	const warnings: ScheduleWarning[] = [];
	const billing = buildBillingSummary(state);
	const communication = buildCommunicationSummary(state);
	const clinical = buildClinicalRuleSummary(activeVisit.patientId, state);
	const activeAppointment = appointments.find(
		(appointment) => appointment.id === activeAppointmentId,
	);
	const reviewImage = imagingStudies.find(
		(study) => study.status === "needs_review",
	);
	const taxDocument = documents.find(
		(document) =>
			document.kind === "tax_deduction_certificate" &&
			document.status === "draft",
	);

	if (hasUnsignedActiveVisit(state)) {
		warnings.push({
			id: "unsigned-active-visit",
			severity: "warning",
			title: "Прием не подписан",
			detail:
				"ЭМК остается черновиком: диагноз и план лечения требуют проверки врача.",
			ownerRole: "doctor",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Открыть прием",
		});
	}

	if (reviewImage) {
		warnings.push({
			id: "image-needs-review",
			severity: "warning",
			title: "Снимок требует проверки",
			detail: `${reviewImage.title}: AI-описание нельзя переносить в ЭМК без врача.`,
			ownerRole: "doctor",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Проверить снимок",
		});
	}

	if (taxDocument) {
		warnings.push({
			id: "tax-document-draft",
			severity: "info",
			title: "Справка для вычета в очереди",
			detail:
				"Администратор должен связать справку с оплатой и пациентом до выдачи.",
			ownerRole: "administrator",
			relatedAppointmentId: null,
			actionLabel: "Открыть документы",
		});
	}

	if (billing.totalDueRub > 0) {
		warnings.push({
			id: "billing-due",
			severity: billing.totalDueRub > 10000 ? "critical" : "warning",
			title: "Есть неоплаченный план лечения",
			detail: `К оплате осталось ${billing.totalDueRub.toLocaleString("ru-RU")} ₽. Документы и вычет должны ссылаться на оплату.`,
			ownerRole: "administrator",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Открыть оплаты",
		});
	}

	if (communication.urgentTasks > 0 || communication.overdue > 0) {
		warnings.push({
			id: "communications-urgent",
			severity: communication.urgentTasks > 0 ? "critical" : "warning",
			title: "Есть срочная связь с пациентом",
			detail: `Открытых задач: ${communication.openTasks}. Срочных: ${communication.urgentTasks}. Просроченных: ${communication.overdue}.`,
			ownerRole: "administrator",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Открыть связь",
		});
	}

	if (clinical.unresolved > 0) {
		warnings.push({
			id: "clinical-rules-unresolved",
			severity: clinical.blockers > 0 ? "critical" : "warning",
			title: "Клинические правила требуют проверки",
			detail: `Нерешенных правил: ${clinical.unresolved}. Важных предупреждений: ${clinical.blockers}. Обязательных услуг к добавлению: ${clinical.requiredServices}.`,
			ownerRole: clinical.blockers > 0 ? "doctor" : "assistant",
			relatedAppointmentId: activeAppointment?.id ?? null,
			actionLabel: "Открыть прием",
		});
	}

	appointments.forEach((appointment) => {
		if (!appointment.patientId) {
			warnings.push({
				id: `appointment-no-patient-${appointment.id}`,
				severity: "critical",
				title: "Запись без пациента",
				detail:
					"Нельзя готовить документы и уведомления без карточки пациента.",
				ownerRole: "administrator",
				relatedAppointmentId: appointment.id,
				actionLabel: "Создать пациента",
			});
		}
	});

	if (
		clinicProfile.mode === "network_clinic" &&
		!staffMembers.some(
			(member) => member.role === "manager" || member.role === "owner",
		)
	) {
		warnings.push({
			id: "network-no-manager",
			severity: "critical",
			title: "Сетевой режим без управляющего",
			detail:
				"Для сети нужны права управляющего/владельца, иначе импорт, аудит и шаблоны некому контролировать.",
			ownerRole: "owner",
			relatedAppointmentId: null,
			actionLabel: "Добавить роль",
		});
	}

	return warnings;
}

const modeTitles: Record<ClinicMode, string> = {
	solo_doctor: "Отдельный врач",
	one_chair: "1 кабинет",
	small_clinic: "Малая клиника",
	network_clinic: "Сеть",
};

function buildModeFit(
	state: DomainState = inMemoryDomainState,
): ShiftIntelligence["modeFit"] {
	const { staffMembers, chairs, clinicProfile } = state;
	const doctors = staffMembers.filter(
		(member) => member.active && member.role === "doctor",
	).length;
	const admins = staffMembers.filter(
		(member) => member.active && member.role === "administrator",
	).length;
	const assistants = staffMembers.filter(
		(member) => member.active && member.role === "assistant",
	).length;
	const managers = staffMembers.filter(
		(member) =>
			member.active && (member.role === "manager" || member.role === "owner"),
	).length;
	const activeChairs = chairs.filter((chair) => chair.active).length;
	const blockers: string[] = [];
	const upgrades: string[] = [];

	if (clinicProfile.mode === "solo_doctor") {
		if (doctors > 1 || activeChairs > 1)
			blockers.push("Режим слишком узкий для нескольких врачей или кресел");
		upgrades.push(
			"Оставить быстрый прием, документы и диктовку на первом экране",
		);
	}

	if (clinicProfile.mode === "one_chair") {
		if (activeChairs !== 1)
			blockers.push(
				"Для режима 1 кабинета должно быть ровно одно активное кресло",
			);
		if (doctors > 1)
			upgrades.push(
				"Если врачи работают параллельно, включить режим малой клиники",
			);
		upgrades.push(
			"Держать расписание как одну очередь смены без филиальной аналитики",
		);
	}

	if (clinicProfile.mode === "small_clinic") {
		if (doctors < 2)
			blockers.push(
				"Малой клинике нужен минимум второй врач или внешний специалист",
			);
		if (activeChairs < 2)
			blockers.push(
				"Нужно минимум два кресла/кабинета для реального распределения",
			);
		if (admins < 1)
			blockers.push("Нужен администратор для документов, звонков и оплаты");
		if (assistants < 1)
			blockers.push("Нужен ассистент для подготовки кабинетов");
		upgrades.push("Включить распределение по врачам, креслам и ролям");
	}

	if (clinicProfile.mode === "network_clinic") {
		if (!clinicProfile.networkEnabled) blockers.push("Сетевой флаг не включен");
		if (managers < 1) blockers.push("Нужен управляющий или владелец");
		if (doctors < 2)
			blockers.push("Сеть без нескольких врачей не дает операционного смысла");
		if (activeChairs < 2) blockers.push("Нужны кабинеты/кресла по филиалам");
		upgrades.push(
			"Добавить филиалы, централизованные шаблоны, аудит и импорт по источникам",
		);
	}

	const fitScore = Math.max(
		35,
		100 -
			blockers.length * 18 -
			(clinicProfile.mode === "network_clinic" ? 8 : 0),
	);

	return {
		mode: clinicProfile.mode,
		title: modeTitles[clinicProfile.mode],
		fitScore,
		blockers,
		upgrades,
		lowFrictionNextStep:
			blockers[0] ??
			(clinicProfile.mode === "one_chair"
				? "Продолжать вести смену как одну очередь: врач, кресло, документы, снимки."
				: "Дальше наращивать роли, ресурсы и шаблоны без перегруза рабочего экрана."),
	};
}

function buildShiftIntelligence(
	state: DomainState = inMemoryDomainState,
): ShiftIntelligence {
	return {
		modeFit: buildModeFit(state),
		doctorLoads: buildDoctorLoads(state),
		assistantLoads: buildAssistantLoads(state),
		chairLoads: buildChairLoads(state),
		roleQueues: buildRoleQueues(state),
		scheduleWarnings: buildScheduleWarnings(state),
	};
}

const protocolTemplateSeeds: Array<Omit<ProtocolTemplate, "updatedAt">> = [
	{
		id: "protocol-universal-exam",
		organizationId,
		specialty: "universal",
		title: "Осмотр: первичный / контрольный",
		visitReason: "Осмотр и план",
		defaultDurationMinutes: 30,
		complaintPrompt:
			"Основная причина визита, ожидания пациента, срочные жалобы, страхи, ограничения по бюджету и срокам.",
		objectiveTemplate:
			"Осмотр слизистой, гигиены, прикуса, зубов по квадрантам, имеющихся снимков и ортопедических конструкций.",
		diagnosisHints: [
			"Z01.2 стоматологический осмотр",
			"K02 кариес",
			"K05 болезни десен",
			"K08 нарушения зубов и опорных тканей",
		],
		treatmentPlanTemplate:
			"Сформировать маршрут: диагностика, срочные проблемы, санация, профильная консультация, документы и следующий визит.",
		requiredDocuments: ["paid_medical_services_contract", "treatment_plan"],
		suggestedImaging: ["opg", "photo"],
		safetyWarnings: [
			"Осмотр не заменяет профильную диагностику.",
			"План лечения подписывается после объяснения вариантов пациенту.",
		],
	},
	{
		id: "protocol-therapy-caries",
		organizationId,
		specialty: "therapist",
		title: "Терапия: кариес / реставрация",
		visitReason: "Лечение кариеса",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Боль/чувствительность, длительность, реакция на холод/сладкое, жалобы при накусывании.",
		objectiveTemplate:
			"Зуб __: кариозная полость __ класса, зондирование __, перкуссия __, слизистая без особенностей.",
		diagnosisHints: [
			"K02.1 кариес дентина",
			"K04.0 пульпит, если есть признаки",
			"K03.6 отложения на зубах",
		],
		treatmentPlanTemplate:
			"Анестезия, изоляция, препарирование, медикаментозная обработка, восстановление композитом, контроль окклюзии.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"informed_consent",
			"completed_works_act",
		],
		suggestedImaging: ["periapical", "bitewing"],
		safetyWarnings: [
			"Диагноз подтвердить врачом после осмотра и снимка.",
			"AI не подписывает ЭМК.",
		],
	},
	{
		id: "protocol-ortho-crown",
		organizationId,
		specialty: "orthopedist",
		title: "Ортопедия: коронка / вкладка",
		visitReason: "Ортопедическая консультация",
		defaultDurationMinutes: 75,
		complaintPrompt:
			"Жалобы на разрушение, эстетику, жевание, старую конструкцию, сроки протезирования.",
		objectiveTemplate:
			"Зуб __: степень разрушения __, прикус __, пародонт __, соседние зубы __, снимок оценен.",
		diagnosisHints: [
			"K08.5 неудовлетворительное восстановление",
			"K02.9 кариес неуточненный",
			"Z46.3 примерка зубного протеза",
		],
		treatmentPlanTemplate:
			"Диагностика, санация, препарирование, скан/слепок, временная конструкция, примерка, фиксация.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"treatment_plan",
			"completed_works_act",
		],
		suggestedImaging: ["periapical", "opg"],
		safetyWarnings: [
			"Сроки и гарантийные условия должны попасть в план лечения.",
			"Проверить согласие на ортопедическое лечение.",
		],
	},
	{
		id: "protocol-surgery-extraction",
		organizationId,
		specialty: "surgeon",
		title: "Хирургия: удаление",
		visitReason: "Удаление зуба",
		defaultDurationMinutes: 45,
		complaintPrompt:
			"Боль, отек, температура, открывание рта, аллергии, антикоагулянты, беременность.",
		objectiveTemplate:
			"Область __: слизистая __, подвижность __, перкуссия __, снимок __, риски операции проговорены.",
		diagnosisHints: [
			"K04.5 хронический апикальный периодонтит",
			"K01.1 ретинированный зуб",
			"K08.1 потеря зубов",
		],
		treatmentPlanTemplate:
			"Анестезия, удаление, кюретаж при необходимости, гемостаз, рекомендации, контроль.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"informed_consent",
			"completed_works_act",
		],
		suggestedImaging: ["periapical", "opg", "cbct"],
		safetyWarnings: [
			"Проверить препараты крови/антикоагулянты.",
			"Послеоперационные рекомендации обязательны.",
		],
	},
	{
		id: "protocol-orthodontic-start",
		organizationId,
		specialty: "orthodontist",
		title: "Ортодонтия: первичная диагностика",
		visitReason: "Ортодонтическая консультация",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Прикус, скученность, эстетика, дыхание, ВНЧС, ранее проведенное лечение.",
		objectiveTemplate:
			"Прикус __, класс по Энглю __, скученность __, профиль __, гигиена __, снимки/фото назначены.",
		diagnosisHints: [
			"K07.2 аномалии соотношения зубных дуг",
			"K07.3 аномалии положения зубов",
		],
		treatmentPlanTemplate:
			"Фотопротокол, ОПТГ/ТРГ/КТ по показаниям, расчет, обсуждение аппарата/элайнеров/брекетов.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"treatment_plan",
			"informed_consent",
		],
		suggestedImaging: ["opg", "cbct", "photo"],
		safetyWarnings: [
			"План лечения подписывается после диагностики и расчета.",
			"Фотопротокол хранить в карте пациента.",
		],
	},
	{
		id: "protocol-perio",
		organizationId,
		specialty: "periodontist",
		title: "Пародонтология: карта пародонта",
		visitReason: "Пародонтологический прием",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Кровоточивость, подвижность, запах, чувствительность, курение, диабет, домашняя гигиена.",
		objectiveTemplate:
			"Индексы гигиены __, карманы __ мм, рецессии __, подвижность __, кровоточивость __.",
		diagnosisHints: [
			"K05.1 хронический гингивит",
			"K05.3 хронический пародонтит",
		],
		treatmentPlanTemplate:
			"Пародонтальная карта, профгигиена, обучение, закрытый кюретаж/поддержка по показаниям, контроль.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"informed_consent",
			"completed_works_act",
		],
		suggestedImaging: ["opg", "periapical"],
		safetyWarnings: [
			"Нужна периодическая переоценка индексов.",
			"Системные факторы риска фиксировать явно.",
		],
	},
	{
		id: "protocol-hygiene",
		organizationId,
		specialty: "hygienist",
		title: "Гигиена: профчистка",
		visitReason: "Профессиональная гигиена",
		defaultDurationMinutes: 45,
		complaintPrompt:
			"Кровоточивость, налет, камень, чувствительность, дата последней гигиены.",
		objectiveTemplate:
			"Налет __, камень __, пигментация __, десна __, индексы гигиены __.",
		diagnosisHints: ["K03.6 отложения на зубах", "K05.1 гингивит"],
		treatmentPlanTemplate:
			"УЗ-скейлинг, AirFlow/полировка, реминерализация по показаниям, обучение гигиене.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"completed_works_act",
		],
		suggestedImaging: ["photo"],
		safetyWarnings: [
			"При выраженном воспалении направить к врачу.",
			"Рекомендации по домашней гигиене фиксировать.",
		],
	},
	{
		id: "protocol-pediatric",
		organizationId,
		specialty: "pediatric",
		title: "Детский прием",
		visitReason: "Детская стоматология",
		defaultDurationMinutes: 45,
		complaintPrompt:
			"Возраст, жалобы родителя, сон/еда, травма, страх, согласие законного представителя.",
		objectiveTemplate:
			"Поведение __, зуб __, кариес/пломба __, слизистая __, прикус __, гигиена __.",
		diagnosisHints: [
			"K02.1 кариес дентина",
			"K04.0 пульпит",
			"Z01.2 стоматологическое обследование",
		],
		treatmentPlanTemplate:
			"Адаптация, лечение по показаниям, профилактика, рекомендации родителю, контроль.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"informed_consent",
			"completed_works_act",
		],
		suggestedImaging: ["periapical", "bitewing", "photo"],
		safetyWarnings: [
			"Проверить законного представителя.",
			"Дозировки и анестезия по возрасту/весу.",
		],
	},
	{
		id: "protocol-implant",
		organizationId,
		specialty: "implantologist",
		title: "Имплантология: планирование",
		visitReason: "Имплантация",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Отсутствующие зубы, ожидания, курение, диабет, лекарства, предыдущие операции.",
		objectiveTemplate:
			"Область __, объем кости по КТ __, слизистая __, соседние зубы __, окклюзия __.",
		diagnosisHints: ["K08.1 потеря зубов", "Z46.3 примерка/подбор протеза"],
		treatmentPlanTemplate:
			"КТ-анализ, план имплантации, шаблон/навигация по показаниям, этапы хирургии и протезирования.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"treatment_plan",
			"informed_consent",
		],
		suggestedImaging: ["cbct", "opg", "photo"],
		safetyWarnings: [
			"Без КТ план имплантации не финализировать.",
			"Риски и альтернативы должны быть в согласии.",
		],
	},
	{
		id: "protocol-radiology",
		organizationId,
		specialty: "radiologist",
		title: "Рентгенология: описание снимка",
		visitReason: "Описание исследования",
		defaultDurationMinutes: 20,
		complaintPrompt:
			"Тип исследования, область, причина направления, клинический вопрос.",
		objectiveTemplate:
			"Исследование __, качество __, область __, находки __, ограничения метода __.",
		diagnosisHints: ["Описание не является самостоятельным планом лечения"],
		treatmentPlanTemplate:
			"Передать врачу как описание/черновик, отметить ограничения и необходимость клинической корреляции.",
		requiredDocuments: ["completed_works_act"],
		suggestedImaging: ["periapical", "opg", "cbct"],
		safetyWarnings: [
			"AI-описание снимка не равно диагнозу.",
			"КЛКТ/КТ-серии требуют просмотрщик и метаданные.",
		],
	},
];

const protocolTemplates: ProtocolTemplate[] = protocolTemplateSeeds.map(
	(template) => ({ ...template, updatedAt: nowIso }),
);

export const auditEvents: AuditEvent[] = [
	{
		id: "cdac781e-6a56-4bbb-a4bd-1e2da6efc047",
		organizationId,
		actorUserId: doctorUserId,
		entityType: "visit",
		entityId: activeVisitId,
		action: "visit_opened",
		reason: "Смена открыта, карта пациента доступна врачу.",
		createdAt: nowIso,
	},
	{
		id: "5caa31eb-f50e-4d85-aa5e-c328d8d08229",
		organizationId,
		actorUserId: doctorUserId,
		entityType: "document",
		entityId: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
		action: "document_prepared",
		reason: "Договор создан как черновик перед приемом.",
		createdAt: nowIso,
	},
];

/**
 * СРЕЗ ДАННЫХ ОДНОЙ КЛИНИКИ — ЯВНЫЙ ПАРАМЕТР ВМЕСТО ОБЩИХ НА ПРОЦЕСС МАССИВОВ.
 *
 * ЗАЧЕМ. Раньше `db/domainStateHydration.ts` читал строки клиники из базы и
 * перезаписывал ими объявленные выше массивы (`replaceAll`, 13 вызовов). Массивы
 * общие на процесс, поэтому параллельный запрос ДРУГОЙ клиники видел чужие
 * данные, и автор защищался глобальной промис-очередью, сериализовавшей запросы
 * всех клиник разом. Под RLS каждый маршрут работает в транзакции, а пул
 * ограничен десятью соединениями: запрос, ждущий своей очереди, держит
 * транзакцию открытой, и на этом проект уже горел — десять занятых клиентов
 * давали таймаут 8012 мс на любом обращении к базе.
 *
 * СТАЛО. Гидратация возвращает ЭТУ структуру, а расчёт принимает её параметром.
 * Общие массивы на пути базы не участвуют вовсе, очередь не нужна: у каждого
 * запроса свой срез, и пересечься им негде.
 *
 * ПОЧЕМУ ПАРАМЕТР НЕОБЯЗАТЕЛЬНЫЙ. Значение по умолчанию — `inMemoryDomainState`,
 * то есть те же общие массивы. Это сохраняет поведение режима без базы
 * (`DENTAL_STATE_PERSISTENCE=off`) и всех существующих вызовов из маршрутов и
 * смоук-скриптов, которые правят массивы на месте и зовут расчёт без аргументов.
 */

/**
 * Срез по умолчанию: те самые общие на процесс массивы.
 *
 * Ссылки, а не копии — смоук-скрипты и режим без базы правят коллекции на месте
 * (`push`, `splice`, `Object.assign`), и расчёт обязан видеть их правки. Все
 * коллекции объявлены через `const`, поэтому переприсвоить их нельзя и ссылки
 * не устаревают.
 */
export const inMemoryDomainState: DomainState = {
	get clinicProfile() {
		return clinicProfile;
	},
	staffMembers,
	chairs,
	patients,
	appointments,
	get activeVisit() {
		return activeVisit;
	},
	documents,
	serviceCatalog,
	treatmentPlanItems,
	treatmentPlanScenarios,
	clinicalRules,
	payments,
	communicationTemplates,
	communicationTasks,
	communicationEvents,
	imagingStudies,
	aiRecognitionJobs,
	importBatches,
	get protocolTemplates() {
		return protocolTemplates;
	},
	auditEvents,
	unavailableSlices: [],
};

const integrationPresets: IntegrationPreset[] = [
	{
		id: "preset-32top",
		title: "32top / МИС 32top",
		vendor: "32top",
		category: "dental_mis",
		status: "needs_mapping",
		supportedInputs: [
			"CSV",
			"Excel",
			"копипаст таблицы",
			"текст из отчета",
			"папка снимков рядом",
		],
		capabilities: [
			"patients",
			"appointments",
			"visits",
			"documents",
			"services",
			"payments",
			"imaging",
		],
		migrationNotes: [
			"Сначала preview пациентов и дублей, затем отдельная привязка снимков по ФИО, телефону, дате и пути к файлу.",
			"Готовые протоколы и услуги должны идти через таблицу соответствий, без слепой записи в ЭМК.",
		],
		riskLevel: "medium",
	},
	{
		id: "preset-ident",
		title: "IDENT / крупная МИС",
		vendor: "IDENT",
		category: "dental_mis",
		status: "needs_mapping",
		supportedInputs: [
			"CSV",
			"Excel",
			"SQL export через промежуточный CSV",
			"документы HTML/PDF",
		],
		capabilities: [
			"patients",
			"appointments",
			"visits",
			"documents",
			"services",
			"payments",
			"audit",
		],
		migrationNotes: [
			"Для сетевых клиник обязательны филиал, врач, кресло и источник каждой строки.",
			"Медицинские записи импортируются как архив/черновик до проверки врача или ответственного администратора.",
		],
		riskLevel: "high",
	},
	{
		id: "preset-cliniccards",
		title: "Cliniccards / облачный экспорт",
		vendor: "Cliniccards",
		category: "dental_mis",
		status: "needs_mapping",
		supportedInputs: ["CSV", "Excel", "zip экспорт", "список файлов"],
		capabilities: [
			"patients",
			"appointments",
			"visits",
			"documents",
			"imaging",
		],
		migrationNotes: [
			"Облачный экспорт часто смешивает пациентов, приемы и файлы, поэтому используется smart parser с классификацией строк.",
			"Перед commit нужна сводка пропусков и CSV-отчет для владельца.",
		],
		riskLevel: "medium",
	},
	{
		id: "preset-opendental",
		title: "Open Dental / зарубежная база",
		vendor: "Open Dental",
		category: "dental_mis",
		status: "planned_connector",
		supportedInputs: [
			"CSV",
			"выгрузка базы через адаптер",
			"список папки снимков",
		],
		capabilities: [
			"patients",
			"appointments",
			"visits",
			"services",
			"payments",
			"imaging",
		],
		migrationNotes: [
			"Требуется нормализация терминов, кодов услуг и русских документов.",
			"Подходит как будущий адаптер для open-source сценариев.",
		],
		riskLevel: "high",
	},
	{
		id: "preset-excel",
		title: "Excel / Google Sheets / LibreOffice",
		vendor: "Spreadsheet",
		category: "spreadsheet",
		status: "usable_now",
		supportedInputs: ["CSV", "TSV", "точка с запятой", "копипаст диапазона"],
		capabilities: ["patients", "appointments", "services", "payments"],
		migrationNotes: [
			"Колонки распознаются по русским и английским заголовкам, затем показываются дубли и предупреждения.",
			"Это самый простой старт для маленького кабинета без старой МИС.",
		],
		riskLevel: "low",
	},
	{
		id: "preset-paper-ocr",
		title: "Фото журнала / бумажный архив",
		vendor: "OCR + vision",
		category: "paper_archive",
		status: "planned_connector",
		supportedInputs: [
			"фото журнала",
			"скан PDF",
			"распознанный текст",
			"диктовка администратора",
		],
		capabilities: ["patients", "appointments", "documents"],
		migrationNotes: [
			"Vision/OCR должен отдавать только preview, потому что бумажные журналы дают ошибки ФИО и телефонов.",
			"Система обязана подсвечивать низкую уверенность и просить ручное подтверждение.",
		],
		riskLevel: "high",
	},
	{
		id: "preset-imaging-folder",
		title: "RVG / ОПТГ / КТ папка обмена",
		vendor: "папка КТ/JPG/PNG",
		category: "imaging_system",
		status: "usable_now",
		supportedInputs: [
			"КТ/серии",
			"JPG",
			"PNG",
			"TIFF",
			"BMP",
			"CSV список",
			"серверная папка",
		],
		capabilities: ["imaging", "patients", "audit"],
		migrationNotes: [
			"Сканирование папки идет только на чтение: файлы сначала превращаются в проверяемые строки, затем привязываются к пациентам.",
			"Пути с пробелами и Windows-диски сохраняются без разрезания строки.",
		],
		riskLevel: "low",
	},
	{
		id: "preset-pacs-dicomweb",
		title: "Архив снимков клиники",
		vendor: "сервер снимков",
		category: "imaging_system",
		status: "planned_connector",
		supportedInputs: [
			"адрес архива снимков",
			"поиск серий",
			"код исследования",
			"код серии",
		],
		capabilities: ["imaging", "patients", "audit"],
		migrationNotes: [
			"Будущий коннектор должен забирать исследования по пациенту без копирования файлов руками.",
			"КЛКТ/КТ и серии нельзя превращать в одну картинку: нужен просмотрщик, метаданные и врачебная проверка.",
		],
		riskLevel: "medium",
	},
	{
		id: "preset-accounting",
		title: "Касса / 1C / налоговый вычет",
		vendor: "Accounting export",
		category: "accounting",
		status: "planned_connector",
		supportedInputs: [
			"CSV оплат",
			"Excel услуг",
			"акт",
			"договор",
			"справка для вычета",
		],
		capabilities: ["payments", "documents", "tax_documents", "audit"],
		migrationNotes: [
			"Платежи должны связываться с актами, договором и справкой для вычета, а не жить отдельной таблицей.",
			"Для продажи клиникам потребуется отдельная юридическая проверка шаблонов.",
		],
		riskLevel: "medium",
	},
];

const speechProviders: SpeechProvider[] = [
	{
		id: "browser_speech",
		title: "Браузерная диктовка",
		status: "usable_without_key",
		mode: "browser_live",
		recommendedFor: [
			"быстрый старт",
			"нулевая нагрузка на сервер",
			"черновик администратора",
		],
		strengths: [
			"не требует серверного подключения",
			"может подставлять текст сразу в черновик",
			"подходит как первый слой, если браузер поддерживает ru-RU",
		],
		limits: [
			"поддержка зависит от браузера и политики устройства",
			"нельзя считать медицински надежным единственным источником",
			"в офлайне работает только при наличии локальной поддержки браузера",
		],
		costNote:
			"Без серверного подключения и оплаты сервера; фактическая доступность зависит от браузера.",
		setupSettingsCount: 0,
		sourceUrl: "https://developer.mozilla.org/docs/Web/API/Web_Speech_API",
	},
	{
		id: "groq_whisper",
		title: "Groq Whisper",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"первое облачное распознавание",
			"быстрая диктовка врача",
			"русский и смешанная речь",
		],
		strengths: [
			"совместимый серверный прием аудиофрагментов",
			"быстрые Whisper large-v3 / large-v3-turbo модели",
			"поддерживает word/segment timestamps для контроля качества",
		],
		limits: [
			"серверный доступ должен оставаться только на сервере клиники",
			"аудио уходит во внешний серверный контур",
			"длинные записи нужно резать на короткие фрагменты",
		],
		costNote:
			"Есть бесплатный старт GroqCloud; официальные документы указывают лимит загрузки 25MB на бесплатном уровне для распознавания речи.",
		setupSettingsCount: 3,
		sourceUrl: "https://console.groq.com/docs/speech-to-text",
	},
	{
		id: "openai_transcribe",
		title: "OpenAI Transcribe",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"качественная транскрибация",
			"аккуратная пунктуация",
			"осторожная полировка текста",
		],
		strengths: [
			"модели gpt-4o-transcribe и gpt-4o-mini-transcribe",
			"можно использовать тот же серверный контур, что и для draft-polish",
			"есть diarize-вариант для разделения говорящих",
		],
		limits: [
			"ключ и лимиты только на сервере",
			"LLM-полировка не имеет права добавлять факты",
			"raw transcript должен храниться рядом с правленным черновиком",
		],
		costNote:
			"Не бесплатный основной контур; полезен, если OpenAI worker уже используется для аккуратной правки.",
		setupSettingsCount: 3,
		sourceUrl: "https://platform.openai.com/docs/guides/speech-to-text",
	},
	{
		id: "deepgram_streaming",
		title: "Deepgram Streaming",
		status: "needs_server_key",
		mode: "server_streaming",
		recommendedFor: ["почти realtime", "помощник у кресла", "сетевые клиники"],
		strengths: [
			"есть потоковое распознавание и обработка готовых записей",
			"подходит для живых подсказок и агентских сценариев",
			"поддерживает функции вроде smart formatting и diarization",
		],
		limits: [
			"для русского нужно сверять актуальную модель и язык",
			"сложнее первого запуска, чем отправка короткими фрагментами",
			"нужен отдельный контроль соединений и ретраев",
		],
		costNote:
			"Официальная pricing-страница показывает free credit для старта, затем pay-as-you-go.",
		setupSettingsCount: 3,
		sourceUrl: "https://developers.deepgram.com/docs/stt/getting-started",
	},
	{
		id: "assemblyai_async",
		title: "AssemblyAI Async / Streaming",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"длинные записи",
			"расшифровка после приема",
			"аудио-архив",
		],
		strengths: [
			"REST async и отдельный streaming API",
			"есть бесплатный стартовый кредит",
			"удобен для фоновой обработки длинных аудио",
		],
		limits: [
			"добавляет задержку для async-сценария",
			"не должен становиться единственным путем диктовки",
			"медицинская приватность требует отдельного договора и настроек",
		],
		costNote:
			"Есть free/start credits по официальным страницам; перед продакшеном проверить текущие лимиты аккаунта.",
		setupSettingsCount: 3,
		sourceUrl: "https://www.assemblyai.com/docs/",
	},
	{
		id: "cloudflare_whisper",
		title: "Cloudflare Workers AI Whisper",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"легкий пограничный шлюз",
			"легкий сервер",
			"экспериментальный дешёвый контур",
		],
		strengths: [
			"Whisper доступен как Workers AI model",
			"можно вынести распознавание ближе к пользователю",
			"подходит для отдельного edge-шлюза без нагрузки на основной API",
		],
		limits: [
			"нужны Cloudflare account id и token",
			"важно проверить юридическую модель хранения и региона",
			"не заменяет локальный офлайн-контур",
		],
		costNote:
			"Стоимость и квоты зависят от Cloudflare Workers AI аккаунта; выгодно как edge-шлюз, не как офлайн.",
		setupSettingsCount: 4,
		sourceUrl: "https://developers.cloudflare.com/workers-ai/models/whisper",
	},
	{
		id: "azure_speech",
		title: "Azure AI Speech",
		status: "needs_server_key",
		mode: "server_streaming",
		recommendedFor: [
			"free-tier проверка",
			"enterprise-клиники",
			"realtime и batch",
		],
		strengths: [
			"официальный облачный Speech-to-Text с realtime и batch сценариями",
			"есть бесплатные часы на F0/Free tier по официальным страницам Azure",
			"подходит сетевым клиникам, где уже есть Microsoft/Azure контур",
		],
		limits: [
			"нужны Azure Speech resource, регион, ключ и юридическая проверка обработки медданных",
			"прямое подключение не включено в текущий шлюз, сначала используем каталог и правила выбора",
			"для врача не должен появляться отдельный выбор Azure на приеме",
		],
		costNote:
			"Microsoft указывает free audio hours для Speech-to-Text; перед production нужно проверить регион, F0 quotas и договор.",
		setupSettingsCount: 4,
		sourceUrl:
			"https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/",
	},
	{
		id: "google_speech",
		title: "Google Cloud Speech-to-Text",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"free quota проверка",
			"Google Workspace клиники",
			"длинная дорожная карта",
		],
		strengths: [
			"официальный API распознавания речи с большим количеством языков и моделей",
			"документация указывает бесплатную квоту при включенном billing",
			"может быть полезен для клиник, уже сидящих на Google Cloud",
		],
		limits: [
			"нужен billing/project/service account, ключи не должны попадать в клиент",
			"прямое подключение не включено в текущий шлюз",
			"медицинская приватность и регион обработки требуют отдельного решения",
		],
		costNote:
			"Google pricing показывает free quota для начальных минут, затем поминутную оплату и возможные доп. расходы GCS.",
		setupSettingsCount: 4,
		sourceUrl: "https://cloud.google.com/speech-to-text/pricing",
	},
	{
		id: "huggingface_asr",
		title: "Hugging Face ASR / Inference Providers",
		status: "needs_server_key",
		mode: "server_upload",
		recommendedFor: [
			"эксперименты",
			"open-source модели",
			"быстрое сравнение распознавания",
		],
		strengths: [
			"единый доступ к множеству моделей распознавания речи и вычислительных контуров",
			"удобно сравнивать open-source распознавание без собственного GPU на старте",
			"может стать research-контуром для выбора локальной модели",
		],
		limits: [
			"качество, лимиты и стоимость зависят от выбранного вычислительного контура",
			"не медицинский контур по умолчанию, нужна проверка приватности и хранения",
			"для production лучше вынести в отдельный server worker с явными лимитами",
		],
		costNote:
			"Есть бесплатные/community пути и платные вычислительные контуры; использовать как research, не как единственный медицинский контур распознавания.",
		setupSettingsCount: 4,
		sourceUrl: "https://huggingface.co/docs/inference-providers/index",
	},
	{
		id: "mobile_native_speech",
		title: "iOS/Android Native Speech",
		status: "planned_local",
		mode: "local_worker",
		recommendedFor: [
			"мобильное приложение",
			"минимум нагрузки на сервер",
			"быстрая диктовка у кресла",
		],
		strengths: [
			"может дать живую диктовку без нагрузки на наш API при наличии поддержки устройства",
			"хорошо подходит будущему mobile shell как первый zero-server слой",
			"результат можно отправлять как localTranscript без raw audio",
		],
		limits: [
			"поведение офлайна и приватность зависят от ОС, языка, устройства и установленных моделей",
			"нужна отдельная мобильная реализация, браузерный прототип ее не заменяет",
			"для ЭМК все равно нужен deterministic parser, raw transcript и врачебная проверка",
		],
		costNote:
			"Без нашего API-счета распознавания; реальная доступность зависит от iOS/Android и политики устройства.",
		setupSettingsCount: 0,
		sourceUrl:
			"https://developer.android.com/reference/android/speech/SpeechRecognizer",
	},
	{
		id: "local_whisper",
		title: "Local Whisper.cpp",
		status: "planned_local",
		mode: "local_worker",
		recommendedFor: [
			"офлайн-кабинет",
			"настольное или мобильное приложение",
			"максимальная приватность",
		],
		strengths: [
			"работает локально без отправки аудио в облако",
			"есть tiny/base/small/medium/large модели под разные устройства",
			"подходит для будущего настольного или мобильного модуля",
		],
		limits: [
			"для чистого браузерного прототипа тяжелее по памяти и установке",
			"качество зависит от модели и железа",
			"нужен отдельный installer/model manager",
		],
		costNote:
			"Open-source без API-оплаты; платим установкой, моделью, CPU/GPU и поддержкой локального модуля.",
		setupSettingsCount: 0,
		sourceUrl: "https://github.com/ggml-org/whisper.cpp",
	},
	{
		id: "vosk_local",
		title: "Vosk Local",
		status: "planned_local",
		mode: "local_worker",
		recommendedFor: [
			"офлайн-команды",
			"дешевые устройства",
			"локальный сервер клиники",
		],
		strengths: [
			"offline toolkit с Node/Python/Java/C# bindings",
			"малые модели и потоковый API",
			"подходит для команд и регулярных фраз без облака",
		],
		limits: [
			"качество свободной диктовки обычно ниже сильных Whisper-моделей",
			"нужно управлять моделями и словарями",
			"медицинские термины требуют кастомного словаря",
		],
		costNote:
			"Open-source/offline без API-оплаты; хорош для команд и дешевого локального сервера.",
		setupSettingsCount: 0,
		sourceUrl: "https://github.com/alphacep/vosk-api",
	},
];

const modeHints: Record<ClinicMode, string[]> = {
	solo_doctor: [
		"Один врач: скрываем лишнюю сетевую аналитику, усиливаем быстрый прием, документы и диктовку.",
		"Админские действия доступны врачу, но критичные подписи остаются с аудитом.",
	],
	one_chair: [
		"Один кабинет: главный фокус на смене, пациенте, документах, снимках и налоговом вычете.",
		"Расписание можно вести без сложного распределения по филиалам.",
	],
	small_clinic: [
		"Малая клиника: несколько врачей, кресел, администратор, ассистенты и распределение задач.",
		"Нужны роли, права на кассу, импорт, документы и расписание.",
	],
	network_clinic: [
		"Сеть: филиалы, сквозная аналитика, централизованные шаблоны, раздельные права и аудит.",
		"Импорт и интеграции должны учитывать филиал, кресло, врача и источник данных.",
	],
};

const workspaceProfiles: ClinicWorkspaceProfile[] = [
	{
		id: "workspace-solo-doctor",
		mode: "solo_doctor",
		title: "Личный кабинет врача",
		description:
			"Один специалист ведет прием, запись, документы и оплату без отдельной админ-команды.",
		scope: "personal",
		primaryRoles: ["owner", "doctor"],
		defaultSection: "visit",
		visibleSections: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
		],
		compactNavigation: true,
		requiredCapabilities: [
			"подпись ЭМК",
			"быстрые документы",
			"диктовка",
			"минимальная касса",
		],
		automations: [
			"автосбор документов из приема",
			"напоминание о неподписанной ЭМК",
			"черновик записи из диктовки",
		],
		safeguards: [
			"AI не подписывает диагноз",
			"оплаты и документы остаются в аудите",
			"настройки не мешают врачу на приеме",
		],
	},
	{
		id: "workspace-one-chair",
		mode: "one_chair",
		title: "Один кабинет",
		description:
			"Смена вращается вокруг одного кресла: врач, пациент, снимки, документы, оплата и связь.",
		scope: "clinic",
		primaryRoles: ["doctor", "administrator", "assistant"],
		defaultSection: "shift",
		visibleSections: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		compactNavigation: true,
		requiredCapabilities: [
			"кресло",
			"RVG",
			"админская очередь",
			"налоговый вычет",
		],
		automations: [
			"очередь подтверждений",
			"проверка снимков перед ЭМК",
			"закрытие акта и оплаты после приема",
		],
		safeguards: [
			"кресло не перегружается параллельными потоками",
			"документы создаются только через preview",
			"пациентская связь фиксируется событием",
		],
	},
	{
		id: "workspace-small-clinic",
		mode: "small_clinic",
		title: "Малая клиника",
		description:
			"Несколько врачей и кресел требуют распределения задач, ролей, кабинетов и клинических правил.",
		scope: "clinic",
		primaryRoles: ["doctor", "administrator", "assistant", "manager"],
		defaultSection: "shift",
		visibleSections: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		compactNavigation: false,
		requiredCapabilities: [
			"права по ролям",
			"нагрузка врачей",
			"нагрузка кресел",
			"правила главврача",
		],
		automations: [
			"балансировка загрузки",
			"роль-очереди",
			"шаблоны по специальностям",
			"клинические предупреждения",
		],
		safeguards: [
			"касса отделена от подписи ЭМК",
			"импорт доступен только ответственным",
			"важные предупреждения видны до закрытия приема",
		],
	},
	{
		id: "workspace-network-clinic",
		mode: "network_clinic",
		title: "Сеть и филиалы",
		description:
			"Сквозная клиническая политика, централизованные шаблоны, филиальные права и миграции данных.",
		scope: "network",
		primaryRoles: ["owner", "manager", "doctor", "administrator"],
		defaultSection: "settings",
		visibleSections: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		compactNavigation: false,
		requiredCapabilities: [
			"центральные шаблоны",
			"сквозной аудит",
			"филиальные права",
			"массовые импорты",
		],
		automations: [
			"проверка филиального источника данных",
			"единые протоколы",
			"аудит критичных операций",
			"сетевые очереди менеджера",
		],
		safeguards: [
			"филиал не меняет центральные правила без владельца",
			"миграции идут через batch и rollback-план",
			"доступ ограничен областью филиала",
		],
	},
];

const roleAccessPolicies: RoleAccessPolicy[] = [
	{
		role: "owner",
		title: "Владелец клиники",
		scope: "network",
		defaultSection: "settings",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		canWrite: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		restricted: [],
		requiresApprovalFor: [
			"массовый импорт",
			"изменение юридических шаблонов",
			"сетевое изменение прав",
		],
		auditEvents: [
			"settings.update",
			"roles.update",
			"import.commit",
			"document.template.update",
		],
	},
	{
		role: "doctor",
		title: "Врач",
		scope: "clinic",
		defaultSection: "visit",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"communications",
		],
		canWrite: ["imaging", "visit", "documents", "communications"],
		restricted: ["finance", "settings"],
		requiresApprovalFor: [
			"подпись ЭМК",
			"изменение диагноза после закрытия",
			"игнор клинического предупреждения",
		],
		auditEvents: ["visit.sign", "clinical.override", "document.create"],
	},
	{
		role: "administrator",
		title: "Администратор",
		scope: "clinic",
		defaultSection: "schedule",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"documents",
			"finance",
			"communications",
		],
		canWrite: [
			"schedule",
			"patients",
			"imaging",
			"documents",
			"finance",
			"communications",
		],
		restricted: ["visit", "settings"],
		requiresApprovalFor: [
			"выдача медицинского документа",
			"возврат оплаты",
			"изменение персональных данных без контакта",
		],
		auditEvents: [
			"appointment.update",
			"payment.create",
			"communication.complete",
			"patient.update",
		],
	},
	{
		role: "assistant",
		title: "Ассистент",
		scope: "clinic",
		defaultSection: "shift",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"communications",
		],
		canWrite: ["shift", "imaging", "communications"],
		restricted: ["documents", "finance", "settings"],
		requiresApprovalFor: [
			"медицинская запись",
			"финансовое действие",
			"выдача документа пациенту",
		],
		auditEvents: ["chair.prepare", "communication.complete", "imaging.attach"],
	},
	{
		role: "manager",
		title: "Управляющий",
		scope: "branch",
		defaultSection: "settings",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		canWrite: [
			"schedule",
			"patients",
			"imaging",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		restricted: ["visit"],
		requiresApprovalFor: [
			"клиническое правило",
			"изменение подписанной ЭМК",
			"центральный шаблон сети",
		],
		auditEvents: [
			"import.commit",
			"rule.update",
			"staff.create",
			"chair.create",
		],
	},
];

function replaceCollection<T>(target: T[], source: T[] | undefined): void {
	if (!source) return;
	target.splice(0, target.length, ...source);
}

function shortHash(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function isLocalDicomPath(value: string): boolean {
	return (
		/^[A-Za-z]:[\\/]/.test(value) ||
		value.startsWith("\\\\") ||
		value.startsWith("/") ||
		value.includes("::") ||
		/[\\/]/.test(value)
	);
}

function redactLocalDicomPath(value: string | null): string | null {
	if (!value) return null;
	if (!isLocalDicomPath(value)) return value;
	return `redacted-local-dicom-path:${shortHash(value)}`;
}

function redactDicomReferenceId(value: string | null): string | null {
	if (!value) return null;
	const prefix = "dicomfile:";
	if (value.toLowerCase().startsWith(prefix)) {
		return `${prefix}${redactLocalDicomPath(value.slice(prefix.length))}`;
	}
	return isLocalDicomPath(value) ? redactLocalDicomPath(value) : value;
}

function redactLocalDicomPathsInText(value: string): string {
	return value
		.replace(
			/[A-Za-z]:[\\/][^\r\n]*(?=:\s|$)/g,
			(match) => redactLocalDicomPath(match) ?? match,
		)
		.replace(
			/\\\\[^\r\n]*(?=:\s|$)/g,
			(match) => redactLocalDicomPath(match) ?? match,
		)
		.replace(
			/dicomfile:([A-Za-z]:[\\/][^\s\r\n]+)/gi,
			(_match, filePath: string) =>
				`dicomfile:${redactLocalDicomPath(filePath) ?? filePath}`,
		);
}

function redactDicomWarningList(warnings: string[]): string[] {
	return uniqueStrings(
		warnings
			.map((warning) => redactLocalDicomPathsInText(warning))
			.filter((warning) => warning.trim()),
	);
}

function cloneDicomWorkbenchManifestForServerStorage(
	manifest: DicomViewerWorkbenchManifestResponse,
): DicomViewerWorkbenchManifestResponse {
	const clone = JSON.parse(
		JSON.stringify(manifest),
	) as DicomViewerWorkbenchManifestResponse;
	clone.toolStateBundle.seriesRef.firstFilePath = redactLocalDicomPath(
		clone.toolStateBundle.seriesRef.firstFilePath,
	);
	clone.toolStateBundle.viewports = clone.toolStateBundle.viewports.map(
		(viewport) => ({
			...viewport,
			referencedImageId: redactDicomReferenceId(viewport.referencedImageId),
		}),
	);
	if (
		clone.launchManifest.viewerUrl &&
		isLocalDicomPath(clone.launchManifest.viewerUrl)
	) {
		clone.launchManifest.viewerUrl = redactLocalDicomPath(
			clone.launchManifest.viewerUrl,
		);
	}
	clone.warnings = redactDicomWarningList(clone.warnings);
	clone.readiness.warnings = redactDicomWarningList(clone.readiness.warnings);
	clone.renderCachePlan.warnings = redactDicomWarningList(
		clone.renderCachePlan.warnings,
	);
	clone.launchManifest.warnings = redactDicomWarningList(
		clone.launchManifest.warnings,
	);
	clone.toolStateBundle.warnings = redactDicomWarningList(
		clone.toolStateBundle.warnings,
	);
	clone.toolStateBundle.annotations = clone.toolStateBundle.annotations.map(
		(annotation) => ({
			...annotation,
			referencedImageId: redactDicomReferenceId(annotation.referencedImageId),
			warnings: redactDicomWarningList(annotation.warnings),
		}),
	);
	return clone;
}

function sanitizeDicomWorkbenchBundleForServerStorage(
	bundle: DicomWorkbenchBundle,
): DicomWorkbenchBundle {
	const manifest = cloneDicomWorkbenchManifestForServerStorage(bundle.manifest);
	const seriesKey = dicomWorkbenchSeriesKeyFromManifest(manifest);
	return {
		...bundle,
		seriesKey,
		manifest,
		pixelPolicy: "metadata_and_tool_state_only_no_pixels",
		warnings: Array.from(
			new Set([
				...redactDicomWarningList(bundle.warnings),
				"Серверный пакет скрывает локальные пути снимков; перед загрузкой пикселей переподключите папку или устройство на рабочей станции.",
			]),
		).slice(0, 16),
	};
}

function mutableStateSnapshot(): DentalMutableState {
	return {
		clinicProfile,
		staffMembers,
		chairs,
		appointments,
		patients,
		documents,
		clinicalRules,
		payments,
		communicationTasks,
		communicationEvents,
		imagingStudies,
		imagingViewerSessions,
		dicomWorkbenchBundles,
		importBatches,
		auditEvents,
		aiRecognitionJobs,
		speechTranscriptionChunks,
		visitDraftAutosaves,
		visitSaveReceipts,
		denteTelegramBotSettings,
		denteTelegramLinkCodes,
		denteTelegramChatLinks,
		denteTelegramWebhookEvents,
		denteTelegramOutboxDeliveryReceipts,
		uiPreferences,
		activeVisit,
	};
}

/**
 * Сохранение снимка состояния: одна запись на пачку изменений, а не на каждое.
 *
 * БЫЛО. persistMutableState() из 31 места вызывал savePersistentState()
 * синхронно, прямо в обработчике запроса. Одна такая запись — это два полных
 * JSON.stringify всего состояния (первый ради контрольной суммы, второй ради
 * файла), копия предыдущего файла в каталог резервных копий, чтение этого
 * каталога, удаление устаревших копий, запись и переименование. Замерено на
 * этом репозитории (медиана из 10 прогонов, повтор алгоритма
 * persistentState.ts:242 в каталог вне репозитория):
 *   • 3 пациента, файл 236 648 Б      → 4,61 мс на один вызов;
 *   • 10 000 пациентов, 5 803 929 Б   → 49,54 мс на один вызов и 11,6 МБ
 *     дискового ввода-вывода (сам файл плюс его резервная копия).
 * Один вебхук Telegram или одно сохранение приёма дают три-пять таких вызовов
 * подряд, и каждый блокировал цикл событий до ответа клиенту.
 *
 * СТАЛО. Вызов помечает состояние изменённым и заводит один таймер. Все
 * вызовы, пришедшие до его срабатывания, сливаются в одну запись, и запись
 * происходит уже после ответа клиенту. Окно фиксированное, а не продлеваемое
 * при каждом изменении: устаревание снимка ограничено сверху окном при любой
 * нагрузке, тогда как продлеваемое окно при непрерывном потоке изменений не
 * записало бы файл вообще никогда.
 *
 * Окно по умолчанию — 250 мс, то есть пятикратная стоимость одной записи на
 * клинике в 10 000 пациентов по замеру выше: даже при непрерывных изменениях
 * на сохранение состояния уходит не больше пятой части времени цикла
 * событий. Переопределяется DENTAL_STATE_FLUSH_DELAY_MS, значение 0
 * возвращает синхронную запись на каждое изменение.
 */
const defaultStateFlushDelayMs = 250;

function stateFlushDelayMs(): number {
	const raw = process.env.DENTAL_STATE_FLUSH_DELAY_MS?.trim();
	if (!raw) return defaultStateFlushDelayMs;
	const parsed = Number(raw);
	// Мусор в переменной окружения не должен молча превращаться в ноль: это
	// вернуло бы синхронную запись на каждое действие, и никто бы не заметил.
	if (!Number.isFinite(parsed) || parsed < 0) return defaultStateFlushDelayMs;
	return Math.floor(parsed);
}

let pendingStateFlushTimer: NodeJS.Timeout | null = null;
let mutableStateDirty = false;

/**
 * Немедленно записать отложенный снимок, если он есть.
 *
 * Нужен на завершении процесса: gracefulShutdown в server.ts:531 доходит до
 * process.exit(0), поэтому обработчик exit ниже дописывает последние
 * изменения, и корректная остановка сервера ничего не теряет.
 */
export function flushPersistentStateNow(): void {
	if (pendingStateFlushTimer) {
		clearTimeout(pendingStateFlushTimer);
		pendingStateFlushTimer = null;
	}
	if (!mutableStateDirty) return;
	mutableStateDirty = false;
	savePersistentState(mutableStateSnapshot());
}

function persistMutableState(): void {
	mutableStateDirty = true;
	const delayMs = stateFlushDelayMs();
	if (delayMs === 0) {
		flushPersistentStateNow();
		return;
	}
	if (pendingStateFlushTimer) return;
	pendingStateFlushTimer = setTimeout(() => {
		pendingStateFlushTimer = null;
		if (mutableStateDirty) {
			mutableStateDirty = false;
			savePersistentState(mutableStateSnapshot());
		}
	}, delayMs);
	// Таймер не удерживает процесс: одноразовые скрипты и тесты должны
	// завершаться сразу, а несохранённое допишет обработчик exit.
	pendingStateFlushTimer.unref();
}

process.on("exit", flushPersistentStateNow);

const defaultPostVisitCheckupDelayHoursByTopic: DenteTelegramBotSettings["postVisitCheckupDelayHoursByTopic"] =
	{
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
		const value =
			typeof source[key] === "number"
				? source[key]
				: typeof source[key] === "string"
					? Number.parseInt(source[key], 10)
					: NaN;
		if (Number.isFinite(value)) {
			normalized[key] = Math.max(1, Math.min(720, Math.floor(value)));
		}
	}
	return normalized;
}

const originalDemoData = JSON.parse(JSON.stringify(mutableStateSnapshot()));

function _resetToDemo(): void {
	replaceCollection(patients, originalDemoData.patients);
	replaceCollection(appointments, originalDemoData.appointments);
	replaceCollection(payments, originalDemoData.payments);
	replaceCollection(documents, originalDemoData.documents);
	replaceCollection(clinicalRules, originalDemoData.clinicalRules);
	replaceCollection(imagingStudies, originalDemoData.imagingStudies);
	replaceCollection(importBatches, originalDemoData.importBatches);
	replaceCollection(aiRecognitionJobs, originalDemoData.aiRecognitionJobs);
	replaceCollection(
		imagingViewerSessions,
		originalDemoData.imagingViewerSessions,
	);
	replaceCollection(
		dicomWorkbenchBundles,
		originalDemoData.dicomWorkbenchBundles,
	);
	replaceCollection(
		speechTranscriptionChunks,
		originalDemoData.speechTranscriptionChunks,
	);
	replaceCollection(visitSaveReceipts, originalDemoData.visitSaveReceipts);
	replaceCollection(visitDraftAutosaves, originalDemoData.visitDraftAutosaves);
	replaceCollection(communicationTasks, originalDemoData.communicationTasks);
	replaceCollection(communicationEvents, originalDemoData.communicationEvents);
	replaceCollection(chairs, originalDemoData.chairs);
	replaceCollection(staffMembers, originalDemoData.staffMembers);
	replaceCollection(
		denteTelegramLinkCodes,
		originalDemoData.denteTelegramLinkCodes,
	);
	replaceCollection(
		denteTelegramChatLinks,
		originalDemoData.denteTelegramChatLinks,
	);
	replaceCollection(
		denteTelegramWebhookEvents,
		originalDemoData.denteTelegramWebhookEvents,
	);
	replaceCollection(
		denteTelegramOutboxDeliveryReceipts,
		originalDemoData.denteTelegramOutboxDeliveryReceipts,
	);
	syncDenteTelegramOutboxDeliveryReceiptsMap();
	Object.assign(clinicProfile, originalDemoData.clinicProfile);
	Object.assign(activeVisit, originalDemoData.activeVisit);
	Object.assign(
		denteTelegramBotSettings,
		originalDemoData.denteTelegramBotSettings,
	);
	persistMutableState();
}

function _resetToZeroMode(role: StaffRole): void {
	patients.length = 0;
	appointments.length = 0;
	payments.length = 0;
	documents.length = 0;
	clinicalRules.length = 0;
	imagingStudies.length = 0;
	importBatches.length = 0;
	aiRecognitionJobs.length = 0;
	imagingViewerSessions.length = 0;
	dicomWorkbenchBundles.length = 0;
	speechTranscriptionChunks.length = 0;
	visitSaveReceipts.length = 0;
	visitDraftAutosaves.length = 0;
	communicationTasks.length = 0;
	communicationEvents.length = 0;
	chairs.length = 0;
	denteTelegramLinkCodes.length = 0;
	denteTelegramChatLinks.length = 0;
	denteTelegramWebhookEvents.length = 0;
	denteTelegramOutboxDeliveryReceipts.length = 0;
	syncDenteTelegramOutboxDeliveryReceiptsMap();

	Object.assign(clinicProfile, {
		organizationId,
		clinicName: "",
		legalName: null,
		inn: null,
		kpp: null,
		ogrn: null,
		address: null,
		phone: null,
		email: null,
		website: null,
		medicalLicenseNumber: null,
		medicalLicenseIssuedAt: null,
		medicalLicenseIssuer: null,
		bankDetails: null,
		signatoryName: null,
		signatoryTitle: null,
		mode: "solo_doctor",
		timezone: "Europe/Moscow",
		defaultVisitMinutes: 45,
		scheduleDefaults: defaultClinicScheduleDefaults,
		networkEnabled: false,
		egiszEnabled: false,
		updatedAt: new Date().toISOString(),
	});

	staffMembers.length = 0;
	const defaultMember: StaffMember = {
		id: doctorUserId,
		organizationId,
		fullName: role === "doctor" ? "Врач-Организатор" : "Администратор",
		role: role,
		specialties: role === "doctor" ? ["therapist"] : [],
		phone: "+79999999999",
		email: "clinic@example.com",
		active: true,
		canSignMedicalRecords: true,
		canManageMoney:
			role === "owner" || role === "manager" || role === "administrator",
		canManageImports:
			role === "owner" || role === "manager" || role === "administrator",
		color: "#0f766e",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	staffMembers.push(defaultMember);

	Object.assign(activeVisit, {
		id: activeVisitId,
		organizationId,
		patientId: marinaPatientId,
		appointmentId: null,
		doctorId: doctorUserId,
		chairId: null,
		status: "draft",
		diagnoses: [],
		complaints: "",
		anamnesis: "",
		objectiveStatus: "",
		treatmentDone: "",
		toothCardState: "{}",
		protocolText: "",
		revision: 1,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	});

	persistMutableState();
}

function applyPersistentState(): void {
	const state = loadPersistentState();
	if (!state) return;

	if (state.clinicProfile) {
		Object.assign(clinicProfile, state.clinicProfile);
	}
	replaceCollection(staffMembers, state.staffMembers);
	replaceCollection(chairs, state.chairs);
	replaceCollection(appointments, state.appointments);
	replaceCollection(patients, state.patients);
	normalizePatientAdministrativeProfiles();
	replaceCollection(documents, state.documents);
	replaceCollection(clinicalRules, state.clinicalRules);
	replaceCollection(payments, state.payments);
	replaceCollection(communicationTasks, state.communicationTasks);
	replaceCollection(communicationEvents, state.communicationEvents);
	replaceCollection(imagingStudies, state.imagingStudies);
	replaceCollection(imagingViewerSessions, state.imagingViewerSessions);
	replaceCollection(
		dicomWorkbenchBundles,
		state.dicomWorkbenchBundles?.map(
			sanitizeDicomWorkbenchBundleForServerStorage,
		),
	);
	replaceCollection(importBatches, state.importBatches);
	replaceCollection(auditEvents, state.auditEvents);
	replaceCollection(aiRecognitionJobs, state.aiRecognitionJobs);
	replaceCollection(speechTranscriptionChunks, state.speechTranscriptionChunks);
	replaceCollection(visitDraftAutosaves, state.visitDraftAutosaves);
	replaceCollection(visitSaveReceipts, state.visitSaveReceipts);
	if (state.denteTelegramBotSettings) {
		Object.assign(denteTelegramBotSettings, state.denteTelegramBotSettings);
		denteTelegramBotSettings.visualCardUrls =
			normalizeExistingDenteTelegramVisualCardUrls(
				denteTelegramBotSettings.visualCardUrls,
			);
		if (!denteTelegramBotSettings.appointmentReminderLeadTimesHours?.length) {
			denteTelegramBotSettings.appointmentReminderLeadTimesHours = [24];
		}
		denteTelegramBotSettings.reviewRequestDelayHours =
			normalizeReviewRequestDelayHours(
				denteTelegramBotSettings.reviewRequestDelayHours,
			);
		denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic =
			normalizePostVisitCheckupDelayHoursByTopic(
				denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic,
			);
	}
	replaceCollection(denteTelegramLinkCodes, state.denteTelegramLinkCodes);
	replaceCollection(denteTelegramChatLinks, state.denteTelegramChatLinks);
	normalizeDenteTelegramBotScopedLedgers();
	replaceCollection(
		denteTelegramWebhookEvents,
		state.denteTelegramWebhookEvents,
	);
	replaceCollection(
		denteTelegramOutboxDeliveryReceipts,
		state.denteTelegramOutboxDeliveryReceipts,
	);
	syncDenteTelegramOutboxDeliveryReceiptsMap();
	uiPreferences = state.uiPreferences ?? null;
	if (state.activeVisit) {
		Object.assign(activeVisit, state.activeVisit);
		activeVisit.revision = activeVisit.revision ?? 1;
	}
	normalizeMutableScheduleState();
}

applyPersistentState();
normalizeMutableScheduleState();

export function buildClinicSettings(
	state: DomainState = inMemoryDomainState,
): ClinicSettings {
	const { clinicProfile, staffMembers, chairs } = state;
	return {
		profile: repairMojibakeDeep(clinicProfile),
		staff: repairMojibakeDeep(staffMembers),
		chairs: repairMojibakeDeep(chairs),
		integrationPresets: repairMojibakeDeep(integrationPresets),
		workspaceProfiles: repairMojibakeDeep(workspaceProfiles),
		roleAccessPolicies: repairMojibakeDeep(roleAccessPolicies),
		modeHints: repairMojibakeDeep(modeHints[clinicProfile.mode]),
	};
}

export function getUiPreferences(): UiPreferences | null {
	return uiPreferences;
}

export function saveUiPreferences(input: UiPreferencesInput): UiPreferences {
	const incomingSavedAt =
		input.savedAt && Number.isFinite(Date.parse(input.savedAt))
			? input.savedAt
			: new Date().toISOString();
	if (
		uiPreferences?.savedAt &&
		input.savedAt &&
		Number.isFinite(Date.parse(uiPreferences.savedAt)) &&
		Date.parse(incomingSavedAt) < Date.parse(uiPreferences.savedAt)
	) {
		return uiPreferences;
	}
	const saved: UiPreferences = {
		...input,
		uiLanguage: input.uiLanguage ?? "ru",
		version: 1,
		savedAt: incomingSavedAt,
	};
	uiPreferences = saved;
	persistMutableState();
	return saved;
}

function buildDocumentChainSummary(
	document: GeneratedDocument,
): DocumentChainSummary | null {
	const paidContract = document.payload?.paidMedicalServicesContract;
	if (paidContract) {
		return {
			paidMedicalServicesContract: {
				contractNumber: paidContract.contractNumber,
				contractDate: paidContract.contractDate,
			},
		};
	}

	const copyRequest = document.payload?.medicalRecordCopyRequest;
	if (copyRequest) {
		return {
			medicalRecordCopyRequest: {
				requestedDocumentTypes: copyRequest.requestedDocumentTypes,
				periodStart: copyRequest.periodStart ?? null,
				periodEnd: copyRequest.periodEnd ?? null,
				requestedFormat: copyRequest.requestedFormat,
				recipientFullName: copyRequest.recipientFullName,
				recipientIdentityDocument: copyRequest.recipientIdentityDocument,
				recipientAuthority: copyRequest.recipientAuthority,
				representativeAuthorityDocument:
					copyRequest.representativeAuthorityDocument ?? null,
			},
		};
	}

	return null;
}

function buildDashboardDocuments(state: DomainState = inMemoryDomainState) {
	return state.documents.map((document) => ({
		...document,
		chainSummary: buildDocumentChainSummary(document),
	}));
}

export function buildDashboard(
	state: DomainState = inMemoryDomainState,
): Dashboard {
	const {
		clinicProfile,
		patients,
		appointments,
		activeVisit,
		imagingStudies,
		protocolTemplates,
		serviceCatalog,
		treatmentPlanItems,
		treatmentPlanScenarios,
		clinicalRules,
		payments,
		communicationTemplates,
		communicationTasks,
		communicationEvents,
		importBatches,
		auditEvents,
	} = state;
	const patientInsights = buildPatientInsights(state);
	const appointmentReadiness = buildAppointmentReadiness(
		patientInsights,
		state,
	);

	return {
		clinicName: repairMojibakeText(clinicProfile.clinicName),
		// БЫЛО: "2026-05-12" — жёстко зашитая дата. Вкладка «Смена» всегда
		// показывала приёмы за 12 мая 2026 года, а реальный день был пуст.
		todayIso: clinicTodayIso(clinicProfile.timezone),
		clinicSettings: buildClinicSettings(state),
		shiftIntelligence: repairMojibakeDeep(buildShiftIntelligence(state)),
		patients: repairMojibakeDeep(patients),
		patientInsights: repairMojibakeDeep(patientInsights),
		recommendedActions: repairMojibakeDeep(
			buildRecommendedActions(patientInsights, state),
		),
		appointments: repairMojibakeDeep(appointments),
		appointmentReadiness: repairMojibakeDeep(appointmentReadiness),
		scheduleSuggestions: repairMojibakeDeep(
			buildScheduleSuggestions(appointmentReadiness, state),
		),
		/*
		 * ОТКРЫТОГО ПРИЁМА НЕТ — ТАК И СКАЗАНО, `null`, А НЕ НУЛЕВОЙ УУИД.
		 *
		 * `activeVisit` — общий на процесс объект, и гидратация базы кладёт в него
		 * заготовку с `id = NIL_VISIT_UUID`, когда у клиники нет ни одного приёма
		 * (`db/domainStateHydration.ts`, noVisitSkeleton). До этой строки заготовка
		 * уходила в ответ как есть, и главный экран называл администратору
		 * идентификатор приёма, строки которого в базе нет ни одной — замерено на
		 * четырёх клиниках с нулём визитов.
		 *
		 * Нулевой ууид — НЕПУСТАЯ строка, то есть правдивая в булевом смысле, и
		 * клиентские сторожа вида `if (!dashboard?.activeVisit?.id) return;` её
		 * пропускали. Цена записана рядом с каждой заплаткой на клиенте: касса
		 * отвечала «Прием для оплаты не найден» на нажатие «Принять оплату», а лента
		 * снимков была пуста ВСЕГДА, пока приём не начат.
		 *
		 * Почему `null`, а не отсутствие поля: `null` — это утверждение «открытого
		 * приёма нет», а отсутствие поля — молчание, которое не отличить от «сервер
		 * не считал». Поле остаётся обязательным (`visitSchema.nullable()`).
		 *
		 * Охраняется `tests/routes/dashboardActiveVisitIsNotFabricated.test.ts`.
		 * Остальные поля сводки ниже по-прежнему считаются от общего объекта: они
		 * читают пациента заготовки и дают пустые наборы, это прежнее поведение и
		 * оно правильное.
		 */
		activeVisit:
			activeVisit.id === NIL_VISIT_UUID
				? null
				: repairMojibakeDeep(activeVisit),
		visitCloseChecklist: repairMojibakeDeep(
			buildVisitCloseChecklist(visitCloseChecklistFactsFor(activeVisit, state)),
		),
		documents: repairMojibakeDeep(buildDashboardDocuments(state)),
		imagingStudies: repairMojibakeDeep(imagingStudies),
		protocolTemplates: repairMojibakeDeep(protocolTemplates),
		serviceCatalog: repairMojibakeDeep(serviceCatalog),
		treatmentPlanItems: repairMojibakeDeep(treatmentPlanItems),
		treatmentPlanScenarios: repairMojibakeDeep(treatmentPlanScenarios),
		clinicalRules: repairMojibakeDeep(clinicalRules),
		clinicalRuleEvaluations: repairMojibakeDeep(
			buildClinicalRuleEvaluations(activeVisit.patientId, state),
		),
		clinicalRuleSummary: repairMojibakeDeep(
			buildClinicalRuleSummary(activeVisit.patientId, state),
		),
		payments: repairMojibakeDeep(payments),
		billingSummary: repairMojibakeDeep(buildBillingSummary(state)),
		communicationTemplates: repairMojibakeDeep(communicationTemplates),
		communicationTasks: repairMojibakeDeep(communicationTasks),
		communicationEvents: repairMojibakeDeep(communicationEvents.slice(0, 20)),
		communicationSummary: repairMojibakeDeep(buildCommunicationSummary(state)),
		importBatches: repairMojibakeDeep(importBatches),
		speechProviders: repairMojibakeDeep(speechProviders),
		auditEvents: repairMojibakeDeep(auditEvents.slice(0, 12)),
		complianceWarnings: repairMojibakeDeep([
			"AI-ответы являются черновиками и требуют подтверждения врача.",
			"Медицинские данные требуют 152-ФЗ, врачебной тайны и аудита доступа.",
			"Для продажи клиникам нужен отдельный EGISZ-адаптер и юридическая проверка шаблонов.",
		]),
	};
}

import { normalizePatientAdministrativeProfile } from "./utils/patientAdministrativeProfile.js";
export { normalizePatientAdministrativeProfile };

function normalizePatientAdministrativeProfiles(): void {
	for (const patient of patients) {
		patient.administrativeProfile = normalizePatientAdministrativeProfile(
			patient.administrativeProfile,
		);
	}
}

export function createPatient(input: {
	fullName: string;
	birthDate?: string | null | undefined;
	gender?: "male" | "female" | "other" | null | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
	notes?: string | null | undefined;
	weightKg?: number | null | undefined;
	administrativeProfile?: PatientAdministrativeProfilePatch | null | undefined;
}): Patient {
	const createdAt = new Date().toISOString();
	const activeVisitPatientExists = patients.some(
		(candidate) =>
			candidate.id === activeVisit.patientId && candidate.status === "active",
	);
	const fullName = input.fullName.trim();
	if (!fullName) {
		throw new Error("ФИО пациента обязательно");
	}
	const birthDate = normalizeDateOnlyInput(
		input.birthDate,
		"Дата рождения пациента",
	);
	const patient: Patient = {
		id: randomUUID(),
		organizationId,
		status: "active",
		fullName,
		birthDate,
		gender: input.gender ?? null,
		phone: nullableTrimmed(input.phone),
		email: nullableTrimmed(input.email),
		notes: nullableTrimmed(input.notes),
		weightKg: input.weightKg ?? null,
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: normalizePatientAdministrativeProfile(
			input.administrativeProfile,
		),
		balanceRub: 0,
		createdAt,
		updatedAt: createdAt,
	};
	patients.unshift(patient);
	if (!activeVisitPatientExists) {
		activeVisit.patientId = patient.id;
		activeVisit.updatedAt = createdAt;
		const activeAppointment = appointments.find(
			(appointment) => appointment.id === activeVisit.appointmentId,
		);
		if (activeAppointment) activeAppointment.patientId = patient.id;
	}
	recordAuditEvent({
		entityType: "patient",
		entityId: patient.id,
		action: "patient_created",
		reason: `${patient.fullName} добавлен из рабочего экрана.`,
	});
	return patient;
}

export function updatePatient(
	patientId: string,
	input: UpdatePatientInput,
): Patient {
	const patient = patients.find((candidate) => candidate.id === patientId);
	if (!patient) {
		throw new Error("Пациент не найден");
	}
	const fullName = input.fullName?.trim();
	if (input.fullName !== undefined && !fullName) {
		throw new Error("ФИО пациента обязательно");
	}
	if (fullName !== undefined) patient.fullName = fullName;
	if (input.birthDate !== undefined)
		patient.birthDate = normalizeDateOnlyInput(
			input.birthDate,
			"Дата рождения пациента",
		);
	if (input.phone !== undefined) patient.phone = nullableTrimmed(input.phone);
	if (input.email !== undefined) patient.email = nullableTrimmed(input.email);
	if (input.notes !== undefined) patient.notes = nullableTrimmed(input.notes);
	if (input.weightKg !== undefined) patient.weightKg = input.weightKg ?? null;
	/*
	 * Привязка к семейной группе (общий кошелёк).
	 * БЫЛО: поле игнорировалось — UI слал familyGroupId, ответ 200, а в памяти
	 * patients.familyGroupId не менялся. Семья создавалась пустой; оплата с
	 * семейного счёта отказывала «пациент не в группе».
	 * СТАЛО: null — отвязать; UUID — привязать (проверка существования группы
	 * в org-режиме БД; в in-memory одна организация процесса).
	 */
	if (input.familyGroupId !== undefined) {
		(patient as { familyGroupId?: string | null }).familyGroupId =
			input.familyGroupId;
	}
	patient.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "patient",
		entityId: patient.id,
		action: "patient_core_updated",
		reason:
			"Core patient identity and contact facts updated for scheduling, documents, tax, and communication.",
	});
	return patient;
}

export function updatePatientAdministrativeProfile(
	patientId: string,
	input: UpdatePatientAdministrativeProfileInput,
): Patient {
	const patient = patients.find((candidate) => candidate.id === patientId);
	if (!patient) {
		throw new Error("Пациент не найден");
	}
	const updatedAt = new Date().toISOString();
	patient.administrativeProfile = normalizePatientAdministrativeProfile({
		...(patient.administrativeProfile ?? {}),
		...input,
	});
	patient.updatedAt = updatedAt;
	recordAuditEvent({
		entityType: "patient",
		entityId: patient.id,
		action: "patient_administrative_profile_updated",
		reason:
			"Administrative identity, address, representative, and document-recipient facts updated for legal forms.",
	});
	return patient;
}

function assertAppointmentReferenceExists(input: UpdateAppointmentInput): void {
	if (input.patientId !== undefined && input.patientId !== null) {
		const patient = patients.find(
			(candidate) =>
				candidate.id === input.patientId && candidate.status === "active",
		);
		if (!patient)
			throw new Error("Пациент для записи не найден или не активен");
	}
	if (input.doctorUserId !== undefined && input.doctorUserId !== null) {
		const doctor = staffMembers.find(
			(member) =>
				member.id === input.doctorUserId &&
				member.active &&
				(member.role === "doctor" || member.role === "owner"),
		);
		if (!doctor) throw new Error("Врач для записи не найден или не активен");
	}
	if (input.assistantUserId !== undefined && input.assistantUserId !== null) {
		const assistant = staffMembers.find(
			(member) =>
				member.id === input.assistantUserId &&
				member.active &&
				member.role === "assistant",
		);
		if (!assistant)
			throw new Error("Ассистент для записи не найден или не активен");
	}
	if (input.chairId !== undefined && input.chairId !== null) {
		const chair = chairs.find(
			(candidate) => candidate.id === input.chairId && candidate.active,
		);
		if (!chair) throw new Error("Кресло для записи не найдено или не активно");
	}
}

function mergedAppointmentTimes(
	appointment: Appointment,
	input: UpdateAppointmentInput,
): { startsAt: string; endsAt: string } {
	const startsAt = input.startsAt ?? appointment.startsAt;
	const endsAt = input.endsAt ?? appointment.endsAt;
	const startsAtMs = Date.parse(startsAt);
	const endsAtMs = Date.parse(endsAt);
	if (
		!Number.isFinite(startsAtMs) ||
		!Number.isFinite(endsAtMs) ||
		endsAtMs <= startsAtMs
	) {
		throw new Error("Время окончания записи должно быть позже времени начала");
	}
	return { startsAt, endsAt };
}

const scheduleBlockingAppointmentStatuses = new Set<Appointment["status"]>([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
]);
const terminalAppointmentStatuses = new Set<Appointment["status"]>([
	"completed",
	"cancelled",
	"no_show",
]);

function assertActiveVisitAppointmentStatusChangeIsSafe(
	appointment: Appointment,
	input: UpdateAppointmentInput,
): void {
	if (
		activeVisit.appointmentId !== appointment.id ||
		activeVisit.status !== "draft"
	)
		return;
	if (input.status === undefined || input.status === appointment.status) return;
	if (!terminalAppointmentStatuses.has(input.status)) return;
	throw new Error(
		"Нельзя закрыть, отменить или отметить неявку записи, пока связанный прием открыт как черновик",
	);
}

function appointmentRequiresHardScheduleValidation(
	appointment: Appointment,
): boolean {
	const endsAtMs = Date.parse(appointment.endsAt);
	return (
		scheduleBlockingAppointmentStatuses.has(appointment.status) &&
		Number.isFinite(endsAtMs) &&
		endsAtMs >= Date.now()
	);
}

function appointmentIntervalsOverlap(
	left: Appointment,
	right: Appointment,
): boolean {
	const leftStart = Date.parse(left.startsAt);
	const leftEnd = Date.parse(left.endsAt);
	const rightStart = Date.parse(right.startsAt);
	const rightEnd = Date.parse(right.endsAt);
	return (
		Number.isFinite(leftStart) &&
		Number.isFinite(leftEnd) &&
		Number.isFinite(rightStart) &&
		Number.isFinite(rightEnd) &&
		leftStart < rightEnd &&
		rightStart < leftEnd
	);
}

function assertNoAppointmentResourceOverlap(candidate: Appointment): void {
	if (!appointmentRequiresHardScheduleValidation(candidate)) return;
	const overlapping = appointments.find(
		(appointment) =>
			appointment.id !== candidate.id &&
			appointment.organizationId === candidate.organizationId &&
			appointmentRequiresHardScheduleValidation(appointment) &&
			appointmentIntervalsOverlap(candidate, appointment) &&
			((candidate.patientId && appointment.patientId === candidate.patientId) ||
				(candidate.doctorUserId &&
					appointment.doctorUserId === candidate.doctorUserId) ||
				(candidate.assistantUserId &&
					appointment.assistantUserId === candidate.assistantUserId) ||
				(candidate.chairId && appointment.chairId === candidate.chairId)),
	);
	if (!overlapping) return;
	if (candidate.patientId && overlapping.patientId === candidate.patientId) {
		throw new Error("У пациента уже есть запись в это время");
	}
	if (
		candidate.doctorUserId &&
		overlapping.doctorUserId === candidate.doctorUserId
	) {
		throw new Error("У врача уже есть запись в это время");
	}
	if (
		candidate.assistantUserId &&
		overlapping.assistantUserId === candidate.assistantUserId
	) {
		throw new Error("У ассистента уже есть запись в это время");
	}
	throw new Error("Кресло уже занято другой записью в это время");
}

function assertAppointmentWithinOperationalHours(candidate: Appointment): void {
	if (!appointmentRequiresHardScheduleValidation(candidate)) return;
	const isTechnicalBreak =
		/служебный перерыв|технический перерыв|служебная бронь|санобработка|обед|консилиум/i.test(
			candidate.reason || "",
		) ||
		/служебная бронь/i.test(candidate.comment || "");
	if (!candidate.patientId && !isTechnicalBreak) {
		throw new Error("Для активной будущей записи нужно выбрать пациента");
	}
	if (!candidate.doctorUserId) {
		throw new Error("Для активной будущей записи нужно выбрать врача");
	}
	if (!candidate.chairId) {
		throw new Error("Для активной будущей записи нужно выбрать кресло");
	}
	const patient = candidate.patientId
		? patients.find(
				(item) => item.id === candidate.patientId && item.status === "active",
			)
		: null;
	if (!patient && !isTechnicalBreak) {
		throw new Error("Для активной будущей записи нужен активный пациент");
	}
	const clinicScheduleCheck = appointmentWithinClinicSchedule(candidate);
	if (!clinicScheduleCheck.ready) {
		throw new Error(
			`Запись вне расписания клиники: ${clinicScheduleCheck.detail}`,
		);
	}
	const doctor = candidate.doctorUserId
		? staffMembers.find(
				(member) => member.id === candidate.doctorUserId && member.active,
			)
		: null;
	if (doctor) {
		const doctorScheduleCheck = appointmentWithinStaffSchedule(
			candidate,
			doctor,
			"врача",
		);
		if (!doctorScheduleCheck.ready) {
			throw new Error(
				`Запись вне расписания врача: ${doctorScheduleCheck.detail}`,
			);
		}
	}
	const assistant = candidate.assistantUserId
		? staffMembers.find(
				(member) =>
					member.id === candidate.assistantUserId &&
					member.active &&
					member.role === "assistant",
			)
		: null;
	if (assistant) {
		const assistantScheduleCheck = appointmentWithinStaffSchedule(
			candidate,
			assistant,
			"ассистента",
		);
		if (!assistantScheduleCheck.ready) {
			throw new Error(
				`Запись вне расписания ассистента: ${assistantScheduleCheck.detail}`,
			);
		}
	}
	const chair = candidate.chairId
		? chairs.find((item) => item.id === candidate.chairId && item.active)
		: null;
	const chairScheduleCheck = appointmentWithinChairSchedule(candidate, chair);
	if (!chairScheduleCheck.ready) {
		throw new Error(
			`Запись вне расписания кресла: ${chairScheduleCheck.detail}`,
		);
	}
}

function assertAppointmentCanBeScheduled(candidate: Appointment): void {
	assertAppointmentWithinOperationalHours(candidate);
	assertNoAppointmentResourceOverlap(candidate);
}

function assertStaffWorkingHoursCoverExistingAppointments(
	member: StaffMember,
	workingHours: StaffWorkingHours,
): void {
	const candidateStaff: StaffMember = { ...member, workingHours };
	const blockingAppointment = appointments.find(
		(appointment) =>
			scheduleBlockingAppointmentStatuses.has(appointment.status) &&
			appointmentRequiresHardScheduleValidation(appointment) &&
			(appointment.doctorUserId === member.id ||
				appointment.assistantUserId === member.id) &&
			!appointmentWithinStaffSchedule(
				appointment,
				candidateStaff,
				member.role === "assistant" ? "ассистента" : "врача",
			).ready,
	);
	if (blockingAppointment) {
		throw new Error(
			"Нельзя сократить рабочие часы: есть активная запись за пределами нового расписания",
		);
	}
}

function assertChairWorkingHoursCoverExistingAppointments(
	chair: Chair,
	workingHours: StaffWorkingHours,
): void {
	const candidateChair: Chair = { ...chair, workingHours };
	const blockingAppointment = appointments.find(
		(appointment) =>
			scheduleBlockingAppointmentStatuses.has(appointment.status) &&
			appointmentRequiresHardScheduleValidation(appointment) &&
			appointment.chairId === chair.id &&
			!appointmentWithinChairSchedule(appointment, candidateChair).ready,
	);
	if (blockingAppointment) {
		throw new Error(
			"Нельзя сократить рабочие часы кресла: есть активная запись за пределами нового расписания",
		);
	}
}

function assertClinicScheduleDefaultsCoverExistingAppointments(
	scheduleDefaults: ClinicScheduleDefaults,
	timezone: string,
): void {
	const blockingAppointment = appointments.find(
		(appointment) =>
			appointment.organizationId === organizationId &&
			appointmentRequiresHardScheduleValidation(appointment) &&
			!appointmentWithinClinicScheduleDefaults(
				appointment,
				scheduleDefaults,
				timezone,
			).ready,
	);
	if (blockingAppointment) {
		throw new Error(
			`Нельзя сократить расписание клиники: активная запись ${blockingAppointment.id} выходит за пределы нового окна или рабочих дней`,
		);
	}
}

export function updateAppointment(
	appointmentId: string,
	input: UpdateAppointmentInput,
): Appointment {
	const appointment = appointments.find(
		(candidate) => candidate.id === appointmentId,
	);
	if (!appointment) {
		throw new Error("Запись не найдена");
	}
	if (
		input.patientId !== undefined &&
		input.patientId !== appointment.patientId &&
		activeVisit.appointmentId === appointment.id
	) {
		throw new Error(
			"Нельзя менять пациента у записи, к которой уже привязан текущий прием",
		);
	}
	assertActiveVisitAppointmentStatusChangeIsSafe(appointment, input);

	assertAppointmentReferenceExists(input);
	const { startsAt, endsAt } = mergedAppointmentTimes(appointment, input);
	const candidate: Appointment = {
		...appointment,
		patientId:
			input.patientId !== undefined ? input.patientId : appointment.patientId,
		doctorUserId:
			input.doctorUserId !== undefined
				? input.doctorUserId
				: appointment.doctorUserId,
		assistantUserId:
			input.assistantUserId !== undefined
				? input.assistantUserId
				: appointment.assistantUserId,
		chairId: input.chairId !== undefined ? input.chairId : appointment.chairId,
		status: input.status !== undefined ? input.status : appointment.status,
		startsAt,
		endsAt,
	};
	assertAppointmentCanBeScheduled(candidate);
	if (input.patientId !== undefined) appointment.patientId = input.patientId;
	if (input.doctorUserId !== undefined)
		appointment.doctorUserId = input.doctorUserId;
	if (input.assistantUserId !== undefined)
		appointment.assistantUserId = input.assistantUserId;
	if (input.chairId !== undefined) appointment.chairId = input.chairId;
	if (input.status !== undefined) appointment.status = input.status;
	if (input.reason !== undefined)
		appointment.reason = nullableTrimmed(input.reason);
	if (input.comment !== undefined)
		appointment.comment = nullableTrimmed(input.comment);
	appointment.startsAt = startsAt;
	appointment.endsAt = endsAt;

	recordAuditEvent({
		entityType: "appointment",
		entityId: appointment.id,
		action: "appointment_updated",
		reason:
			"Запись обновлена из расписания: время, пациент, врач, ассистент, кресло или статус.",
	});
	return appointment;
}

export function createAppointment(input: CreateAppointmentInput): Appointment {
	assertAppointmentReferenceExists(input);
	const startsAtMs = Date.parse(input.startsAt);
	const endsAtMs = Date.parse(input.endsAt);
	if (
		!Number.isFinite(startsAtMs) ||
		!Number.isFinite(endsAtMs) ||
		endsAtMs <= startsAtMs
	) {
		throw new Error("Время окончания записи должно быть позже времени начала");
	}
	const appointment: Appointment = {
		id: randomUUID(),
		organizationId,
		patientId: input.patientId ?? null,
		doctorUserId: input.doctorUserId,
		assistantUserId: input.assistantUserId ?? null,
		chairId: input.chairId,
		status: input.status,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		reason: nullableTrimmed(input.reason),
		comment: nullableTrimmed(input.comment),
	};
	assertAppointmentCanBeScheduled(appointment);
	appointments.push(appointment);
	recordAuditEvent({
		entityType: "appointment",
		entityId: appointment.id,
		action: "appointment_created",
		reason:
			"Запись создана из расписания: пациент, врач, ассистент, кресло и время прошли проверку доступности.",
	});
	return appointment;
}

function permissionsForRole(role: StaffMember["role"]) {
	return {
		canSignMedicalRecords: role === "doctor" || role === "owner",
		canManageMoney:
			role === "administrator" || role === "manager" || role === "owner",
		canManageImports:
			role === "administrator" || role === "manager" || role === "owner",
	};
}

function nullableTrimmed(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
	const parsed = new Date(Date.UTC(year, month - 1, day));
	return (
		parsed.getUTCFullYear() === year &&
		parsed.getUTCMonth() === month - 1 &&
		parsed.getUTCDate() === day
	);
}

function todayLocalIsoDateOnly(): string {
	const now = new Date();
	const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}

function normalizeDateOnlyInput(
	value: string | null | undefined,
	fieldLabel: string,
): string | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	const today = todayLocalIsoDateOnly();

	const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	const normalized = iso
		? isValidDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))
			? `${iso[1]}-${iso[2]}-${iso[3]}`
			: null
		: null;
	if (normalized) {
		if (normalized > today) {
			throw new Error(`${fieldLabel} не может быть позже сегодняшнего дня`);
		}
		return normalized;
	}

	const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
	if (ru && isValidDateParts(Number(ru[3]), Number(ru[2]), Number(ru[1]))) {
		const ruNormalized = `${ru[3]}-${ru[2]}-${ru[1]}`;
		if (ruNormalized > today) {
			throw new Error(`${fieldLabel} не может быть позже сегодняшнего дня`);
		}
		return ruNormalized;
	}

	throw new Error(
		`${fieldLabel} должна быть реальной датой в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ`,
	);
}

export function updateClinicMode(mode: ClinicMode): ClinicSettings {
	const currentModePreset =
		clinicProfile.mode === "solo_doctor"
			? 60
			: clinicProfile.mode === "network_clinic"
				? 30
				: 45;
	const nextModePreset =
		mode === "solo_doctor" ? 60 : mode === "network_clinic" ? 30 : 45;
	const shouldApplyModePreset =
		clinicProfile.defaultVisitMinutes === currentModePreset;
	clinicProfile.mode = mode;
	clinicProfile.networkEnabled = mode === "network_clinic";
	if (shouldApplyModePreset) clinicProfile.defaultVisitMinutes = nextModePreset;
	clinicProfile.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "clinic_profile",
		entityId: organizationId,
		action: "clinic_mode_updated",
		reason: `Режим клиники изменен на ${mode}.`,
	});
	return buildClinicSettings();
}

export function updateClinicProfile(
	input: UpdateClinicProfileInput,
): ClinicSettings {
	const nextTimezone =
		input.timezone !== undefined
			? input.timezone.trim()
			: clinicProfile.timezone;
	if (input.timezone !== undefined) assertValidScheduleTimeZone(nextTimezone);
	if (input.scheduleDefaults !== undefined || input.timezone !== undefined) {
		assertClinicScheduleDefaultsCoverExistingAppointments(
			normalizeClinicScheduleDefaults(
				input.scheduleDefaults ?? clinicProfile.scheduleDefaults,
			),
			nextTimezone,
		);
	}
	if (input.clinicName !== undefined)
		clinicProfile.clinicName = input.clinicName.trim();
	if (input.legalName !== undefined)
		clinicProfile.legalName = nullableTrimmed(input.legalName);
	if (input.inn !== undefined) clinicProfile.inn = nullableTrimmed(input.inn);
	if (input.kpp !== undefined) clinicProfile.kpp = nullableTrimmed(input.kpp);
	if (input.ogrn !== undefined)
		clinicProfile.ogrn = nullableTrimmed(input.ogrn);
	if (input.address !== undefined)
		clinicProfile.address = nullableTrimmed(input.address);
	if (input.phone !== undefined)
		clinicProfile.phone = nullableTrimmed(input.phone);
	if (input.email !== undefined)
		clinicProfile.email = nullableTrimmed(input.email);
	if (input.website !== undefined)
		clinicProfile.website = nullableTrimmed(input.website);
	if (input.medicalLicenseNumber !== undefined) {
		clinicProfile.medicalLicenseNumber = nullableTrimmed(
			input.medicalLicenseNumber,
		);
	}
	if (input.medicalLicenseIssuedAt !== undefined) {
		clinicProfile.medicalLicenseIssuedAt = nullableTrimmed(
			input.medicalLicenseIssuedAt,
		);
	}
	if (input.medicalLicenseIssuer !== undefined) {
		clinicProfile.medicalLicenseIssuer = nullableTrimmed(
			input.medicalLicenseIssuer,
		);
	}
	if (input.bankDetails !== undefined)
		clinicProfile.bankDetails = nullableTrimmed(input.bankDetails);
	if (input.signatoryName !== undefined)
		clinicProfile.signatoryName = nullableTrimmed(input.signatoryName);
	if (input.signatoryTitle !== undefined)
		clinicProfile.signatoryTitle = nullableTrimmed(input.signatoryTitle);
	if (input.timezone !== undefined) clinicProfile.timezone = nextTimezone;
	if (input.defaultVisitMinutes !== undefined)
		clinicProfile.defaultVisitMinutes = input.defaultVisitMinutes;
	if (input.scheduleDefaults !== undefined)
		clinicProfile.scheduleDefaults = normalizeClinicScheduleDefaults(
			input.scheduleDefaults,
		);
	if (input.egiszEnabled !== undefined)
		clinicProfile.egiszEnabled = input.egiszEnabled;
	clinicProfile.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "clinic_profile",
		entityId: organizationId,
		action: "clinic_profile_updated",
		reason:
			"Юридические, контактные и профильные поля клиники обновлены из настройки первого запуска.",
	});
	return buildClinicSettings();
}

export function createStaffMember(input: CreateStaffMemberInput): StaffMember {
	const createdAt = new Date().toISOString();
	const permissions = permissionsForRole(input.role);
	const member: StaffMember = {
		id: randomUUID(),
		organizationId,
		fullName: input.fullName.trim(),
		role: input.role,
		specialties: input.specialties.length ? input.specialties : ["universal"],
		phone: nullableTrimmed(input.phone),
		email: nullableTrimmed(input.email),
		active: true,
		...permissions,
		color:
			input.role === "doctor"
				? "#0f766e"
				: input.role === "assistant"
					? "#a34f32"
					: "#b8781f",
		workingHours: normalizeStaffWorkingHours(input.workingHours ?? null),
		createdAt,
		updatedAt: createdAt,
	};
	staffMembers.unshift(member);
	recordAuditEvent({
		entityType: "staff_member",
		entityId: member.id,
		action: "staff_created",
		reason: `${member.fullName} добавлен как ${member.role}.`,
	});
	return member;
}

export function updateStaffWorkingHours(
	staffId: string,
	input: UpdateStaffWorkingHoursInput,
): StaffMember {
	const member = staffMembers.find((item) => item.id === staffId);
	if (!member) {
		throw new Error("Сотрудник не найден.");
	}
	const workingHours = normalizeStaffWorkingHours(input.workingHours);
	assertStaffWorkingHoursCoverExistingAppointments(member, workingHours);
	member.workingHours = workingHours;
	member.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "staff_member",
		entityId: member.id,
		action: "staff_working_hours_updated",
		reason: `${member.fullName}: рабочее расписание обновлено.`,
	});
	return member;
}

export function createChair(input: CreateChairInput): Chair {
	const chair: Chair = {
		id: randomUUID(),
		organizationId,
		name: input.name.trim(),
		room: nullableTrimmed(input.room),
		specialization: input.specialization ?? null,
		active: true,
		hasXraySensor: input.hasXraySensor,
		hasMicroscope: input.hasMicroscope,
		hasSurgeryKit: input.hasSurgeryKit,
		notes: nullableTrimmed(input.notes),
		workingHours: normalizeStaffWorkingHours(input.workingHours ?? null),
	};
	chairs.unshift(chair);
	recordAuditEvent({
		entityType: "chair",
		entityId: chair.id,
		action: "chair_created",
		reason: `${chair.name} добавлено в конфигурацию клиники.`,
	});
	return chair;
}

export function updateChairWorkingHours(
	chairId: string,
	input: UpdateChairWorkingHoursInput,
): Chair {
	const chair = chairs.find((item) => item.id === chairId);
	if (!chair) {
		throw new Error("Кресло не найдено.");
	}
	const workingHours = normalizeStaffWorkingHours(input.workingHours);
	assertChairWorkingHoursCoverExistingAppointments(chair, workingHours);
	chair.workingHours = workingHours;
	recordAuditEvent({
		entityType: "chair",
		entityId: chair.id,
		action: "chair_working_hours_updated",
		reason: `${chair.name}: рабочее расписание кабинета обновлено.`,
	});
	return chair;
}

/**
 * Поля карточки сотрудника, которые правит адрес PUT /api/settings/staff/:staffId.
 *
 * Расписание сюда намеренно не входит: у него отдельный адрес
 * /api/settings/staff/:staffId/working-hours, и только там есть проверка на
 * активные записи за пределами нового графика. Приняв расписание здесь, мы
 * обошли бы эту проверку и оставили приемы вне рабочего окна врача.
 */
export type UpdateStaffMemberProfileInput = {
	fullName?: string | undefined;
	role?: StaffMember["role"] | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
	active?: boolean | undefined;
};

/**
 * Поля кресла, которые правит адрес PUT /api/settings/chairs/:chairId.
 *
 * Только название и признак активности: в таблице chairs больше ничего из
 * карточки кресла не хранится, а кабинет, специализация и оснащение читаются
 * из базы как пустые значения. Принимать их значило бы молча терять ввод.
 */
export type UpdateChairProfileInput = {
	name?: string | undefined;
	active?: boolean | undefined;
};

export function updateStaffMemberProfile(
	staffId: string,
	input: UpdateStaffMemberProfileInput,
): StaffMember {
	const member = staffMembers.find((item) => item.id === staffId);
	if (!member) {
		throw new Error("Сотрудник не найден.");
	}
	if (input.fullName !== undefined) member.fullName = input.fullName.trim();
	if (input.role !== undefined) {
		member.role = input.role;
		// Права привязаны к роли. Смена роли без пересчета прав оставила бы
		// бывшему администратору доступ к кассе и импортам.
		const permissions = permissionsForRole(input.role);
		member.canSignMedicalRecords = permissions.canSignMedicalRecords;
		member.canManageMoney = permissions.canManageMoney;
		member.canManageImports = permissions.canManageImports;
	}
	if (input.phone !== undefined) member.phone = nullableTrimmed(input.phone);
	if (input.email !== undefined) member.email = nullableTrimmed(input.email);
	if (input.active !== undefined) member.active = input.active;
	member.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "staff_member",
		entityId: member.id,
		action: "staff_profile_updated",
		reason: `${member.fullName}: карточка сотрудника обновлена.`,
	});
	return member;
}

/**
 * Мягкое отключение сотрудника вместо физического удаления: на строку в users
 * ссылаются приемы (doctor_user_id, assistant_user_id) и медицинские записи.
 * Удаление строки либо упало бы на внешнем ключе, либо обезличило историю
 * лечения — это медицинские данные, их нельзя терять.
 */
export function deactivateStaffMember(staffId: string): StaffMember {
	const member = staffMembers.find((item) => item.id === staffId);
	if (!member) {
		throw new Error("Сотрудник не найден.");
	}
	member.active = false;
	member.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "staff_member",
		entityId: member.id,
		action: "staff_deactivated",
		reason: `${member.fullName}: сотрудник отключен, приемы и медицинские записи сохранены.`,
	});
	return member;
}

export function updateChairProfile(
	chairId: string,
	input: UpdateChairProfileInput,
): Chair {
	const chair = chairs.find((item) => item.id === chairId);
	if (!chair) {
		throw new Error("Кресло не найдено.");
	}
	if (input.name !== undefined) chair.name = input.name.trim();
	if (input.active !== undefined) chair.active = input.active;
	recordAuditEvent({
		entityType: "chair",
		entityId: chair.id,
		action: "chair_profile_updated",
		reason: `${chair.name}: карточка кресла обновлена.`,
	});
	return chair;
}

/**
 * Мягкое отключение кресла: на chairs.id ссылаются приемы (appointments.chair_id),
 * поэтому строка не удаляется, а перестает быть активной. Уже назначенные
 * приемы остаются на месте и не теряют привязку к кабинету.
 */
export function deactivateChair(chairId: string): Chair {
	const chair = chairs.find((item) => item.id === chairId);
	if (!chair) {
		throw new Error("Кресло не найдено.");
	}
	chair.active = false;
	recordAuditEvent({
		entityType: "chair",
		entityId: chair.id,
		action: "chair_deactivated",
		reason: `${chair.name}: кресло отключено, существующие приемы сохранены.`,
	});
	return chair;
}

function buildRecognitionOutput(input: CreateAiRecognitionJobInput) {
	const normalized = input.inputText
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+/g, " ")
		.trim();
	const hasPhone =
		/(?:\+7|8)\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/.test(normalized);
	const hasDate = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(normalized);

	if (input.target === "patient_import" || input.kind === "paper_ocr") {
		const resultText = normalized.includes(";")
			? normalized
			: `ФИО;Телефон;Комментарий\n${normalized}`;
		return {
			resultText,
			confidence: hasPhone ? 0.82 : 0.48,
			warnings: [
				"OCR/диктовка не пишет в базу напрямую: сначала preview, дубли и ручное подтверждение.",
				...(hasPhone
					? []
					: [
							"Телефон не найден уверенно, строка должна попасть в предупреждения импорта.",
						]),
			],
			suggestedNextStep:
				"Отправить результат в мастер переноса пациентов или smart parser.",
		};
	}

	if (input.target === "imaging_summary" || input.kind === "image_summary") {
		return {
			resultText: `Черновик описания снимка: ${normalized}. Проверить врачом, связать с зубом/областью и только потом переносить в ЭМК.`,
			confidence: hasDate ? 0.68 : 0.58,
			warnings: [
				"AI не ставит диагноз по снимку и не заменяет врача.",
				"Для КЛКТ/КТ-серий нужен просмотрщик и метаданные, а не только текстовое описание.",
			],
			suggestedNextStep:
				"Прикрепить как черновик описания снимка и запросить проверку врача.",
		};
	}

	if (input.target === "document_draft" || input.kind === "document_draft") {
		return {
			resultText: `Черновик документа: ${normalized}`,
			confidence: 0.64,
			warnings: [
				"Юридические документы требуют шаблона клиники и проверки перед выдачей пациенту.",
			],
			suggestedNextStep:
				"Открыть документ как черновик, не выдавать без проверки.",
		};
	}

	return {
		resultText: `Транскрипт/черновик приема: ${normalized}`,
		confidence: 0.72,
		warnings: [
			"Диктовка врача остается черновиком до подтверждения.",
			"Диагноз и план лечения нельзя подписывать автоматически.",
		],
		suggestedNextStep:
			"Преобразовать в структурированный черновик ЭМК и показать врачу.",
	};
}

function _listAiRecognitionJobs(): AiRecognitionJob[] {
	return aiRecognitionJobs.slice(0, 20);
}

function _createAiRecognitionJob(
	input: CreateAiRecognitionJobInput,
): AiRecognitionJob {
	const normalizedInput = createAiRecognitionJobSchema.parse(input);
	const createdAt = new Date().toISOString();
	const output = buildRecognitionOutput(normalizedInput);
	const job: AiRecognitionJob = {
		id: randomUUID(),
		organizationId,
		patientId: normalizedInput.patientId ?? null,
		imagingStudyId: normalizedInput.imagingStudyId ?? null,
		kind: normalizedInput.kind,
		target: normalizedInput.target,
		status: "needs_review",
		sourceLabel: normalizedInput.sourceLabel,
		inputText: normalizedInput.inputText,
		resultText: output.resultText,
		confidence: output.confidence,
		warnings: output.warnings,
		suggestedNextStep: output.suggestedNextStep,
		createdAt,
		updatedAt: createdAt,
	};
	aiRecognitionJobs.unshift(job);
	recordAuditEvent({
		entityType: "ai_job",
		entityId: job.id,
		action: "ai_recognition_prepared",
		reason: `${job.kind} подготовлен как черновик для ${job.target}.`,
	});
	return job;
}

type SpeechRecordingScope = {
	patientId?: string | null;
	visitId?: string | null;
	source?: SpeechTranscriptionChunk["source"] | null;
};

function speechChunkMatchesScope(
	chunk: SpeechTranscriptionChunk,
	scope: SpeechRecordingScope = {},
): boolean {
	if (scope.patientId !== undefined && chunk.patientId !== scope.patientId)
		return false;
	if (scope.visitId !== undefined && chunk.visitId !== scope.visitId)
		return false;
	if (scope.source !== undefined && chunk.source !== scope.source) return false;
	return true;
}

function listSpeechTranscriptionChunks(
	recordingId: string,
	scope: SpeechRecordingScope = {},
): SpeechTranscriptionChunk[] {
	const chunks = speechTranscriptionChunks.filter(
		(chunk) =>
			chunk.recordingId === recordingId &&
			speechChunkMatchesScope(chunk, scope),
	);
	const sortedChunks = chunks
		.slice()
		.sort(
			(left, right) =>
				left.chunkIndex - right.chunkIndex ||
				left.createdAt.localeCompare(right.createdAt),
		);
	return sortedChunks;
}

function uniqueStrings(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean)));
}

type SpeechQualityCounts = SpeechRecordingAssembly["qualityCounts"];

function countSpeechWords(text: string): number {
	return (
		text.match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)*/g)?.length ??
		0
	);
}

function speechChunkQuality(
	chunk: SpeechTranscriptionChunk,
): SpeechTranscriptionQuality {
	const existingQuality = (chunk as Partial<SpeechTranscriptionChunk>).quality;
	if (existingQuality) return existingQuality;

	const transcript = chunk.transcript.replace(/\s+/g, " ").trim();
	const level: SpeechTranscriptionQuality["level"] =
		chunk.status === "failed" ? "failed" : transcript ? "review" : "empty";
	return {
		level,
		confidence: chunk.confidence,
		wordCount: countSpeechWords(transcript),
		charCount: transcript.length,
		durationMs: chunk.durationMs,
		bytesPerSecond: chunk.durationMs
			? Math.round((chunk.byteLength / (chunk.durationMs / 1000)) * 10) / 10
			: null,
		providerWarnings: chunk.warnings.slice(0, 8),
		signals: ["legacy_chunk"],
		nextAction:
			"Проверьте старый фрагмент распознавания: он сохранен до появления метаданных качества.",
	};
}

function countSpeechQualities(
	chunks: SpeechTranscriptionChunk[],
): SpeechQualityCounts {
	const counts: SpeechQualityCounts = {
		clear: 0,
		review: 0,
		empty: 0,
		failed: 0,
	};
	for (const chunk of chunks) {
		counts[speechChunkQuality(chunk).level] += 1;
	}
	return counts;
}

function speechRecordingRecoveryFromChunks(
	recordingId: string,
	chunks: SpeechTranscriptionChunk[],
): SpeechRecordingRecoveryItem {
	const sortedChunks = chunks
		.slice()
		.sort(
			(left, right) =>
				left.chunkIndex - right.chunkIndex ||
				left.createdAt.localeCompare(right.createdAt),
		);
	const assembly = assembleSpeechRecordingFromChunks(recordingId, sortedChunks);
	// БЫЛО: семь отдельных проходов по массиву фрагментов. Считаем за один.
	const statusCounts = {
		transcribed: 0,
		fallback_text: 0,
		needs_provider_key: 0,
		failed: 0,
	};
	let hasKnownDuration = false;
	let durationSumMs = 0;
	let totalBytes = 0;
	for (const chunk of sortedChunks) {
		if (chunk.status === "transcribed") statusCounts.transcribed += 1;
		else if (chunk.status === "fallback_text") statusCounts.fallback_text += 1;
		else if (chunk.status === "needs_provider_key")
			statusCounts.needs_provider_key += 1;
		else if (chunk.status === "failed") statusCounts.failed += 1;

		if (chunk.durationMs !== null) {
			hasKnownDuration = true;
			durationSumMs += chunk.durationMs;
		}
		totalBytes += chunk.byteLength;
	}
	const totalDurationMs = hasKnownDuration ? durationSumMs : null;
	const qualityCounts = countSpeechQualities(sortedChunks);
	const transcriptPreview = assembly.transcript
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 220);
	const recoveryState =
		assembly.missingChunkIndexes.length > 0
			? "missing_chunks"
			: statusCounts.failed > 0
				? "failed_chunks"
				: assembly.transcript.trim()
					? qualityCounts.review || qualityCounts.empty || qualityCounts.failed
						? "quality_review"
						: "complete"
					: "transcript_empty";
	const nextAction =
		recoveryState === "complete"
			? "Соберите фрагменты в текст визита или оставьте их как источник аудита."
			: recoveryState === "quality_review"
				? "Текст пригоден, но перед подписанием записи проверьте отмеченные фрагменты."
				: recoveryState === "missing_chunks"
					? "Выгрузите локальную очередь речи из IndexedDB, затем соберите запись повторно."
					: recoveryState === "failed_chunks"
						? "Повторите распознавание неудачных фрагментов или сохраните локальный текст как резерв."
						: "Используйте браузерный/локальный текст и детерминированный разбор; в аудио пока нет пригодного текста.";

	return {
		recordingId,
		source: sortedChunks[0]?.source ?? "visit",
		patientId: sortedChunks[0]?.patientId ?? null,
		visitId: sortedChunks[0]?.visitId ?? null,
		chunkCount: sortedChunks.length,
		receivedChunkIndexes: assembly.receivedChunkIndexes,
		missingChunkIndexes: assembly.missingChunkIndexes,
		statusCounts,
		qualityCounts,
		providerLabels: assembly.providerLabels,
		transcriptPreview,
		transcriptCharCount: assembly.transcript.length,
		totalDurationMs,
		totalBytes,
		firstChunkAt: assembly.firstChunkAt,
		lastChunkAt: assembly.lastChunkAt,
		recoveryState,
		nextAction,
		warnings: assembly.warnings,
	};
}

function _listSpeechRecordingRecoveries(
	input: {
		visitId?: string | null;
		patientId?: string | null;
		limit?: number | null;
	} = {},
): SpeechRecordingRecoveryList {
	const grouped = new Map<string, SpeechTranscriptionChunk[]>();
	for (const chunk of speechTranscriptionChunks) {
		if (input.visitId && chunk.visitId !== input.visitId) continue;
		if (input.patientId && chunk.patientId !== input.patientId) continue;
		const chunks = grouped.get(chunk.recordingId) ?? [];
		chunks.push(chunk);
		grouped.set(chunk.recordingId, chunks);
	}

	const recordings = Array.from(grouped.entries())
		.map(([recordingId, chunks]) =>
			speechRecordingRecoveryFromChunks(recordingId, chunks),
		)
		.sort((left, right) =>
			(right.lastChunkAt ?? "").localeCompare(left.lastChunkAt ?? ""),
		)
		.slice(0, Math.max(1, Math.min(input.limit ?? 50, 200)));

	return {
		recordings,
		totalRecordings: grouped.size,
		generatedAt: new Date().toISOString(),
	};
}

function assembleSpeechRecordingFromChunks(
	recordingId: string,
	chunks: SpeechTranscriptionChunk[],
): SpeechRecordingAssembly {
	const receivedChunkIndexes = chunks.map((chunk) => chunk.chunkIndex);
	const maxChunkIndex = receivedChunkIndexes.length
		? Math.max(...receivedChunkIndexes)
		: -1;
	const received = new Set(receivedChunkIndexes);
	const missingChunkIndexes =
		maxChunkIndex >= 0
			? Array.from({ length: maxChunkIndex + 1 }, (_, index) => index).filter(
					(index) => !received.has(index),
				)
			: [];
	const transcript = chunks
		.map((chunk) => chunk.transcript.trim())
		.filter(Boolean)
		.join("\n")
		.trim();
	const providerLabels = uniqueStrings(
		chunks.map((chunk) => chunk.providerLabel),
	);
	const statuses = Array.from(new Set(chunks.map((chunk) => chunk.status)));
	const qualityCounts = countSpeechQualities(chunks);
	const qualityWarnings = chunks
		.map((chunk) => {
			const quality = speechChunkQuality(chunk);
			return quality.level === "clear"
				? ""
				: `Фрагмент ${chunk.chunkIndex + 1}: качество ${quality.level}, ${quality.nextAction}`;
		})
		.filter(Boolean);
	const warnings = [
		...chunks.flatMap((chunk) => chunk.warnings),
		...qualityWarnings,
		chunks.length ? "" : "У записи пока нет серверных фрагментов.",
		missingChunkIndexes.length
			? `Нет фрагментов с индексами: ${missingChunkIndexes.join(", ")}.`
			: "",
		chunks.some((chunk) => chunk.status === "failed")
			? "Минимум один фрагмент не распознан."
			: "",
		transcript
			? ""
			: "Текст расшифровки еще не собран; локальный черновик браузера может содержать несинхронизированный текст.",
	].filter(Boolean);

	return {
		recordingId,
		chunkCount: chunks.length,
		receivedChunkIndexes,
		missingChunkIndexes,
		providerLabels,
		statuses,
		qualityCounts,
		transcript,
		warnings: uniqueStrings(warnings).slice(0, 12),
		firstChunkAt: chunks[0]?.createdAt ?? null,
		lastChunkAt: chunks.at(-1)?.createdAt ?? null,
		assembledAt: new Date().toISOString(),
	};
}

function _assembleSpeechRecording(
	recordingId: string,
	scope: SpeechRecordingScope = {},
): SpeechRecordingAssembly {
	return assembleSpeechRecordingFromChunks(
		recordingId,
		listSpeechTranscriptionChunks(recordingId, scope),
	);
}

function speechTranscriptionStatusRank(
	status: SpeechTranscriptionChunk["status"],
): number {
	switch (status) {
		case "transcribed":
			return 4;
		case "fallback_text":
			return 3;
		case "needs_provider_key":
			return 2;
		case "failed":
			return 1;
	}
}

function speechQualityRank(quality: SpeechTranscriptionQuality): number {
	switch (quality.level) {
		case "clear":
			return 4;
		case "review":
			return 3;
		case "empty":
			return 2;
		case "failed":
			return 1;
	}
}

function shouldReplaceSpeechTranscriptionChunk(
	existing: SpeechTranscriptionChunk,
	next: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">,
): boolean {
	const existingTranscript = existing.transcript.trim();
	const nextTranscript = next.transcript.trim();
	if (!existingTranscript && nextTranscript) return true;
	if (existingTranscript && !nextTranscript) return false;

	const existingStatusRank = speechTranscriptionStatusRank(existing.status);
	const nextStatusRank = speechTranscriptionStatusRank(next.status);
	if (nextStatusRank !== existingStatusRank)
		return nextStatusRank > existingStatusRank;

	const existingQualityRank = speechQualityRank(speechChunkQuality(existing));
	const nextQualityRank = speechQualityRank(next.quality);
	if (nextQualityRank !== existingQualityRank)
		return nextQualityRank > existingQualityRank;

	return (
		nextTranscript.length > existingTranscript.length &&
		next.status !== "failed"
	);
}

function speechChunkRetryIdentityMatches(
	existing: SpeechTranscriptionChunk,
	next: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">,
): boolean {
	return (
		existing.source === next.source &&
		existing.patientId === next.patientId &&
		existing.visitId === next.visitId &&
		existing.language === next.language
	);
}

function trimSpeechTranscriptionChunkRetention(): void {
	const maxChunksPerRecording = 600;
	const maxRecordingCount = 80;
	const recordingIds = Array.from(
		new Set(speechTranscriptionChunks.map((chunk) => chunk.recordingId)),
	).slice(0, maxRecordingCount);
	const allowedRecordings = new Set(recordingIds);
	const keptPerRecording = new Map<string, number>();
	const keptChunks: SpeechTranscriptionChunk[] = [];
	for (const chunk of speechTranscriptionChunks) {
		if (!allowedRecordings.has(chunk.recordingId)) {
			continue;
		}
		const count = keptPerRecording.get(chunk.recordingId) ?? 0;
		if (count >= maxChunksPerRecording) {
			continue;
		}
		keptPerRecording.set(chunk.recordingId, count + 1);
		keptChunks.push(chunk);
	}
	speechTranscriptionChunks.splice(
		0,
		speechTranscriptionChunks.length,
		...keptChunks,
	);
}

function _recordSpeechTranscriptionChunk(
	input: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">,
): SpeechTranscriptionChunk {
	const identityConflict = speechTranscriptionChunks.find(
		(chunk) =>
			chunk.recordingId === input.recordingId &&
			!speechChunkRetryIdentityMatches(chunk, input),
	);
	if (identityConflict) {
		throw new SpeechChunkIdentityConflictError();
	}
	const existingIndex = speechTranscriptionChunks.findIndex(
		(chunk) =>
			chunk.recordingId === input.recordingId &&
			chunk.chunkIndex === input.chunkIndex,
	);
	if (existingIndex >= 0) {
		const existing = speechTranscriptionChunks[existingIndex];
		if (existing && !speechChunkRetryIdentityMatches(existing, input)) {
			throw new SpeechChunkIdentityConflictError();
		}
		if (existing && !shouldReplaceSpeechTranscriptionChunk(existing, input))
			return existing;
		if (existing) {
			const chunk: SpeechTranscriptionChunk = {
				...existing,
				...input,
				id: existing.id,
				organizationId: existing.organizationId,
				createdAt: existing.createdAt,
				warnings: uniqueStrings([
					...input.warnings,
					`Повторное распознавание улучшило аудиофрагмент: ${existing.status}/${speechChunkQuality(existing).level} -> ${input.status}/${input.quality.level}.`,
				]).slice(0, 12),
			};
			speechTranscriptionChunks.splice(existingIndex, 1, chunk);
			persistMutableState();
			return chunk;
		}
	}

	const chunk: SpeechTranscriptionChunk = {
		id: randomUUID(),
		organizationId,
		createdAt: new Date().toISOString(),
		...input,
	};
	speechTranscriptionChunks.unshift(chunk);
	trimSpeechTranscriptionChunkRetention();
	persistMutableState();
	return chunk;
}

function _recordImportBatch(input: {
	sourceName: string;
	totalRows: number;
	importedRows: number;
	skippedRows: number;
	warningRows: number;
	blockedRows: number;
}): ImportBatch {
	const batch: ImportBatch = {
		id: randomUUID(),
		organizationId,
		sourceName: input.sourceName,
		status: input.skippedRows > 0 ? "completed_with_skips" : "completed",
		totalRows: input.totalRows,
		importedRows: input.importedRows,
		skippedRows: input.skippedRows,
		warningRows: input.warningRows,
		blockedRows: input.blockedRows,
		createdAt: new Date().toISOString(),
	};
	importBatches.unshift(batch);
	persistMutableState();
	return batch;
}

function currentVisitRevision(): number {
	const revision = Number.isFinite(activeVisit.revision)
		? activeVisit.revision
		: 1;
	activeVisit.revision = revision;
	return revision;
}

function hashTranscript(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function assertActiveVisitDraftMutationAllowed(): void {
	if (activeVisit.status !== "draft") {
		throw new Error("Прием уже закрыт или аннулирован");
	}
}

function _getVisitDraftAutosave(visitId: string): VisitDraftAutosave | null {
	if (visitId !== activeVisit.id) return null;
	if (activeVisit.status !== "draft") return null;
	return visitDraftAutosaves.find((draft) => draft.visitId === visitId) ?? null;
}

function _upsertVisitDraftAutosave(
	input: VisitDraftAutosaveRequest,
): VisitDraftAutosave {
	if (
		input.visitId !== activeVisit.id ||
		input.patientId !== activeVisit.patientId
	) {
		throw new Error("Визит не найден");
	}
	assertActiveVisitDraftMutationAllowed();

	const serverDraft: VisitDraftAutosave = {
		visitId: input.visitId,
		patientId: input.patientId,
		selectedSpecialty: input.selectedSpecialty,
		transcript: input.transcript,
		draft: input.draft,
		baseRevision: input.baseRevision ?? null,
		clientDraftId: input.clientDraftId?.trim() || null,
		clientSavedAt: input.clientSavedAt ?? null,
		serverSavedAt: new Date().toISOString(),
		transcriptHash: hashTranscript(
			[
				input.transcript,
				input.draft.complaint,
				input.draft.anamnesis,
				input.draft.objectiveStatus,
				input.draft.diagnosis,
				input.draft.treatmentPlan,
			]
				.filter(Boolean)
				.join("\n"),
		),
	};

	const existingIndex = visitDraftAutosaves.findIndex(
		(draft) => draft.visitId === input.visitId,
	);
	if (existingIndex >= 0) {
		visitDraftAutosaves[existingIndex] = serverDraft;
	} else {
		visitDraftAutosaves.unshift(serverDraft);
	}
	visitDraftAutosaves.splice(100);
	persistMutableState();
	return serverDraft;
}

function _acceptVisitDraft(
	input: AcceptVisitDraftInput,
): AcceptVisitDraftResponse {
	if (input.visitId !== activeVisit.id) {
		throw new Error("Визит не найден");
	}
	assertActiveVisitDraftMutationAllowed();

	const clientMutationId = input.clientMutationId?.trim() || null;
	const duplicateReceipt = clientMutationId
		? visitSaveReceipts.find(
				(receipt) =>
					receipt.visitId === input.visitId &&
					receipt.clientMutationId === clientMutationId,
			)
		: null;
	if (duplicateReceipt) {
		return {
			visit: activeVisit,
			visitCloseChecklist: buildVisitCloseChecklist(
				visitCloseChecklistFactsFor(activeVisit),
			),
			saveReceipt: {
				...duplicateReceipt,
				status: "duplicate",
				serverRevision: currentVisitRevision(),
			},
		};
	}

	const baseRevision = input.baseRevision ?? null;
	const previousRevision = currentVisitRevision();
	const conflictWarning =
		baseRevision !== null && baseRevision < previousRevision
			? `На сервере уже была ревизия ${previousRevision}, сохранение пришло с ревизии ${baseRevision}. Правки врача приняты, конфликт отмечен в аудите.`
			: null;

	activeVisit.complaint = input.draft.complaint ?? activeVisit.complaint;
	activeVisit.anamnesis = input.draft.anamnesis ?? activeVisit.anamnesis;
	activeVisit.objectiveStatus =
		input.draft.objectiveStatus ?? activeVisit.objectiveStatus;
	activeVisit.diagnosis = input.draft.diagnosis ?? activeVisit.diagnosis;
	activeVisit.treatmentPlan =
		input.draft.treatmentPlan ?? activeVisit.treatmentPlan;
	const summary = input.doctorSummary ?? input.draft.warnings.join(" ");
	activeVisit.doctorSummary = summary || "Черновик ЭМК принят врачом.";
	activeVisit.revision = previousRevision + 1;
	activeVisit.updatedAt = new Date().toISOString();

	const saveReceipt: VisitSaveReceipt = {
		visitId: activeVisit.id,
		clientMutationId,
		status: conflictWarning ? "conflict_accepted" : "accepted",
		serverRevision: activeVisit.revision,
		savedAt: activeVisit.updatedAt,
		warning: conflictWarning,
	};
	visitSaveReceipts.unshift(saveReceipt);
	visitSaveReceipts.splice(200);

	recordAuditEvent({
		entityType: "visit",
		entityId: activeVisit.id,
		action: "visit_draft_accepted",
		reason: [
			"Врач принял AI/диктовочный черновик в ЭМК. Подпись приема остается отдельным действием.",
			`Ревизия ${previousRevision} -> ${activeVisit.revision}.`,
			clientMutationId ? `Клиентская операция ${clientMutationId}.` : null,
			conflictWarning,
		]
			.filter(Boolean)
			.join(" "),
	});

	return {
		visit: activeVisit,
		visitCloseChecklist: buildVisitCloseChecklist(
			visitCloseChecklistFactsFor(activeVisit),
		),
		saveReceipt,
	};
}

/**
 * Журнал аудита пути БЕЗ базы (память процесса + снимок состояния на диске).
 *
 * АВТОР БОЛЬШЕ НЕ ПОДДЕЛЫВАЕТСЯ. Было: `actorUserId: doctorUserId`, где
 * `doctorUserId` — модульная константа демо-врача `8356141b-...`
 * (`sampleData.ts:184`). Параметра для автора в сигнатуре не было вовсе,
 * поэтому подделка была не риском, а свойством конструкции: кто бы ни выполнил
 * действие — регистратор, администратор, телеграм-бот от имени пациента — в
 * журнале оказывался один и тот же врач. Событие журнала, которое отвечает на
 * вопрос «кто» одинаково для всех, хуже отсутствующего: отсутствующее видно,
 * а это выглядит как полноценная запись и вводит в заблуждение при разборе.
 *
 * СТАЛО: автор берётся из аргумента, а если вызывающий его не передал — `null`,
 * то есть честное «неизвестен». Это уже принятый в дереве способ: боевой путь
 * подписания приёма пишет ровно `actorUserId: null` и поясняет причину в тексте
 * события (`db/visitsQuery.ts:373-374` и строка причины `:365`).
 *
 * ОБЪЁМ ИЗМЕНЕНИЯ ПОВЕДЕНИЯ — НАЗЫВАЮ ЧЕСТНО. Сигнатура расширена
 * необязательным полем, поэтому ни одно из 34 мест вызова внутри этого файла
 * не правится и не ломается. Но значение по умолчанию изменилось с выдуманного
 * врача на `null`, и это видно в двух местах:
 *   • витрина дашборда — `sampleData.ts:10503` отдаёт 12 верхних событий в UI;
 *     `apps/web/src/AuditLogsPanel.tsx:278` уже написан под nullable
 *     (`event.actorUserId ? ... : ничего`), поэтому подпись «сотрудник 8356141b…»
 *     просто исчезнет вместо того, чтобы врать;
 *   • снимок состояния `.data/dental-crm-state.json`.
 * Логику это не задевает: все четыре чтения журнала в этом файле
 * (`:9031, :9078, :9119, :9285`) фильтруют по `entityType`/`entityId`/`action`
 * и `actorUserId` не смотрят. Ни один тест значение автора не проверяет.
 */
export function recordAuditEvent(input: {
	organizationId?: string | null | undefined;
	actorUserId?: string | null | undefined;
	entityType: string;
	entityId: string;
	action: string;
	reason?: string | null | undefined;
}): AuditEvent {
	const event: AuditEvent = {
		id: randomUUID(),
		organizationId: input.organizationId?.trim() || organizationId,
		actorUserId: input.actorUserId ?? null,
		entityType: input.entityType,
		entityId: input.entityId,
		action: input.action,
		reason: input.reason ?? null,
		createdAt: new Date().toISOString(),
	};
	auditEvents.unshift(event);
	persistMutableState();
	return event;
}

const documentTitles = Object.fromEntries(
	Object.entries(documentKindMetadata).map(([kind, metadata]) => [
		kind,
		metadata.title,
	]),
) as Record<DocumentKind, string>;

function documentSnapshotDirectoryPath(): string {
	return (
		process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR ??
		path.resolve(process.cwd(), ".data", "document-snapshots")
	);
}

function documentSnapshotPath(documentId: string): string {
	return path.join(documentSnapshotDirectoryPath(), `${documentId}.html`);
}

function sleepSync(milliseconds: number): void {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function moveSnapshotTempFile(tempPath: string, snapshotPath: string): void {
	let lastError: unknown = null;
	for (const delayMs of [0, 20, 60, 140, 300]) {
		if (delayMs > 0) sleepSync(delayMs);
		try {
			renameSync(tempPath, snapshotPath);
			return;
		} catch (error) {
			lastError = error;
		}
	}

	try {
		copyFileSync(tempPath, snapshotPath);
		try {
			unlinkSync(tempPath);
		} catch {
			// A stale temp file is less dangerous than losing an issued document snapshot.
		}
		return;
	} catch {
		throw lastError instanceof Error
			? lastError
			: new Error("Failed to store issued document snapshot.");
	}
}

function writeIssuedDocumentSnapshot(
	documentId: string,
	html: string,
): { snapshotPath: string; sha256: string; createdAt: string } {
	const snapshotPath = documentSnapshotPath(documentId);
	mkdirSync(path.dirname(snapshotPath), { recursive: true });
	const tempPath = `${snapshotPath}.tmp`;
	writeFileSync(tempPath, html, "utf8");
	moveSnapshotTempFile(tempPath, snapshotPath);
	return {
		snapshotPath,
		sha256: createHash("sha256").update(html, "utf8").digest("hex"),
		createdAt: new Date().toISOString(),
	};
}

function _storeIssuedDocumentSnapshot(
	documentId: string,
	html: string,
): GeneratedDocument | null {
	const document = documents.find((candidate) => candidate.id === documentId);
	if (document?.status !== "issued") return null;

	const snapshot = writeIssuedDocumentSnapshot(document.id, html);
	document.storagePath = snapshot.snapshotPath;
	document.issuedSnapshotSha256 = snapshot.sha256;
	document.issuedSnapshotCreatedAt = snapshot.createdAt;
	document.issuedByUserId = doctorUserId;
	persistMutableState();
	return document;
}

function _createGeneratedDocument(input: {
	patientId: string;
	visitId?: string | null | undefined;
	kind: DocumentKind;
	title?: string | undefined;
	totalAmountRub?: number | null | undefined;
	taxYear?: number | null | undefined;
	taxPayerInn?: string | null | undefined;
	payload?: DocumentPayload | null | undefined;
}): GeneratedDocument {
	const title = input.title?.trim() || documentTitles[input.kind];
	const document: GeneratedDocument = {
		id: randomUUID(),
		organizationId,
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		kind: input.kind,
		title: title.length > 240 ? title.slice(0, 240) : title,
		status: "draft",
		issuedAt: null,
		totalAmountRub: input.totalAmountRub ?? null,
		taxYear: input.taxYear ?? null,
		taxPayerInn: input.taxPayerInn?.trim() || null,
		payload: input.payload ?? null,
	};
	documents.unshift(document);
	recordAuditEvent({
		entityType: "document",
		entityId: document.id,
		action: "document_created",
		reason: `${document.title} создан из рабочего экрана.`,
	});
	return document;
}

function _issueGeneratedDocument(
	documentId: string,
	options: {
		issuedAt?: string;
		releaseJournalEntry?: DocumentReleaseJournalEntry | null;
		snapshotHtml?: string;
		signatureAttestation?: DocumentIssueSignatureAttestation;
		taxPaymentSnapshot?: TaxPaymentSnapshot | null;
		taxXmlSourceSnapshot?: TaxXmlSourceSnapshot | null;
		totalAmountRub?: number | null;
	} = {},
): GeneratedDocument | null {
	const document = documents.find((candidate) => candidate.id === documentId);
	if (!document || document.status === "voided") {
		return null;
	}
	if (document.status === "issued") {
		return document;
	}

	const snapshot = options.snapshotHtml
		? writeIssuedDocumentSnapshot(document.id, options.snapshotHtml)
		: null;
	document.status = "issued";
	document.issuedAt = options.issuedAt ?? new Date().toISOString();
	document.issuedByUserId = doctorUserId;
	document.signatureAttestation = options.signatureAttestation ?? null;
	document.releaseJournalEntry = options.releaseJournalEntry
		? {
				...options.releaseJournalEntry,
				createdByUserId:
					options.releaseJournalEntry.createdByUserId ?? doctorUserId,
				sourceSnapshotSha256:
					options.releaseJournalEntry.sourceSnapshotSha256 ??
					snapshot?.sha256 ??
					document.issuedSnapshotSha256 ??
					null,
			}
		: null;
	if (options.totalAmountRub !== undefined) {
		document.totalAmountRub = options.totalAmountRub;
	}
	if (options.taxPaymentSnapshot !== undefined) {
		document.taxPaymentSnapshot = options.taxPaymentSnapshot;
	}
	if (options.taxXmlSourceSnapshot !== undefined) {
		document.taxXmlSourceSnapshot = options.taxXmlSourceSnapshot;
	}
	if (snapshot) {
		document.storagePath = snapshot.snapshotPath;
		document.issuedSnapshotSha256 = snapshot.sha256;
		document.issuedSnapshotCreatedAt = snapshot.createdAt;
	}
	recordAuditEvent({
		entityType: "document",
		entityId: document.id,
		action: "document_issued",
		reason: `${document.title} выдан пациенту или законному получателю.`,
	});
	persistMutableState();
	return document;
}

function _storeTaxXmlSnapshot(
	documentId: string,
	input: Omit<TaxXmlSnapshot, "sha256" | "createdAt">,
): GeneratedDocument | null {
	const document = documents.find((candidate) => candidate.id === documentId);
	if (document?.status !== "issued") return null;

	document.taxXmlSnapshot = {
		...input,
		sha256: createHash("sha256").update(input.xml, "utf8").digest("hex"),
		createdAt: new Date().toISOString(),
	};
	recordAuditEvent({
		entityType: "document",
		entityId: document.id,
		action: "tax_xml_snapshot_created",
		reason:
			"XML КНД сохранен как неизменяемый снимок первой успешной выгрузки.",
	});
	persistMutableState();
	return document;
}

function _voidGeneratedDocument(
	documentId: string,
	options: {
		voidedAt?: string;
		voidAttestation?: DocumentVoidAttestation;
	} = {},
): GeneratedDocument | null {
	const document = documents.find((candidate) => candidate.id === documentId);
	if (!document) {
		return null;
	}
	if (document.status === "voided") {
		return document;
	}

	const voidedAt = options.voidedAt ?? new Date().toISOString();
	const voidAttestation = options.voidAttestation ?? null;
	document.status = "voided";
	document.voidedAt = voidedAt;
	document.voidedByUserId = doctorUserId;
	document.voidAttestation = voidAttestation;
	recordAuditEvent({
		entityType: "document",
		entityId: document.id,
		action: "document_voided",
		reason: voidAttestation
			? `${document.title} аннулирован без удаления записи. Причина: ${voidAttestation.reasonText}. Ответственный: ${voidAttestation.staffRole} ${voidAttestation.staffFullName}.`
			: `${document.title} аннулирован без удаления записи.`,
	});
	persistMutableState();
	return document;
}

function cleanNullableText(value: string | null | undefined): string | null {
	const clean = value?.trim();
	return clean ? clean : null;
}

function normalizeFiscalReceiptDetails(
	input: CreatePaymentInput["fiscalReceipt"],
): Payment["fiscalReceipt"] {
	if (!input) return null;
	const fn = cleanNullableText(input.fn);
	const fd = cleanNullableText(input.fd);
	const fpd = cleanNullableText(input.fpd);
	const cashierName = cleanNullableText(input.cashierName);
	const receiptUrl = cleanNullableText(input.receiptUrl);
	if (!fn && !fd && !fpd && !cashierName && !receiptUrl) return null;
	const fiscalReceipt = {
		fn,
		fd,
		fpd,
		cashierName,
		receiptUrl,
		operationType: input.operationType ?? "income",
	};
	return fiscalReceipt;
}

function fiscalReceiptLabel(
	fiscalReceipt: Payment["fiscalReceipt"],
): string | null {
	if (!fiscalReceipt) return null;
	const parts = [
		fiscalReceipt.fn ? `ФН ${fiscalReceipt.fn}` : null,
		fiscalReceipt.fd ? `ФД ${fiscalReceipt.fd}` : null,
		fiscalReceipt.fpd ? `ФПД ${fiscalReceipt.fpd}` : null,
	].filter(Boolean);
	return parts.length ? parts.join("; ") : null;
}

function assertPaidPaymentFiscalReceiptOperation(
	input: CreatePaymentInput,
): void {
	if (input.fiscalReceipt?.operationType === "income_return") {
		throw new Error(
			"Возвратный фискальный чек нельзя записывать как новую оплату",
		);
	}
}

function _findPaymentByClientMutationId(
	clientMutationId: string | null | undefined,
): Payment | null {
	const normalizedClientMutationId = clientMutationId?.trim();
	if (!normalizedClientMutationId) return null;
	return (
		payments.find(
			(payment) => payment.clientMutationId === normalizedClientMutationId,
		) ?? null
	);
}

function _createPayment(input: CreatePaymentInput): Payment {
	const createdAt = new Date().toISOString();
	assertPaidPaymentFiscalReceiptOperation(input);
	const fiscalReceipt = normalizeFiscalReceiptDetails(input.fiscalReceipt);
	const clientMutationId = input.clientMutationId?.trim() || null;
	const payment: Payment = {
		id: randomUUID(),
		organizationId,
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		documentId: input.documentId ?? null,
		amountRub: input.amountRub,
		method: input.method,
		status: "paid",
		paidAt: createdAt,
		createdAt,
		fiscalReceiptNumber:
			input.fiscalReceiptNumber?.trim() ||
			fiscalReceiptLabel(fiscalReceipt) ||
			null,
		fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt?.trim() || null,
		fiscalReceiptUrl:
			input.fiscalReceiptUrl?.trim() ||
			fiscalReceipt?.receiptUrl?.trim() ||
			null,
		fiscalReceipt,
		clientMutationId,
		payerFullName: input.payerFullName?.trim() || null,
		payerInn: input.payerInn?.trim() || null,
		payerBirthDate: normalizeDateOnlyInput(
			input.payerBirthDate,
			"Дата рождения плательщика",
		),
		payerIdentityDocument: input.payerIdentityDocument?.trim() || null,
		payerRelationship: input.payerRelationship?.trim() || null,
		taxDeductionCode: input.taxDeductionCode ?? null,
		note: input.note ?? null,
	};
	payments.unshift(payment);
	recordAuditEvent({
		entityType: "payment",
		entityId: payment.id,
		action: "payment_recorded",
		reason: [
			`Оплата ${payment.amountRub.toLocaleString("ru-RU")} ₽ записана из рабочего экрана.`,
			clientMutationId ? `Клиентская операция ${clientMutationId}.` : null,
		]
			.filter(Boolean)
			.join(" "),
	});
	return payment;
}

const communicationTaskOutcomeLabels: Record<CommunicationTaskOutcome, string> =
	{
		no_answer: "нет ответа",
		callback_requested: "нужен обратный звонок",
		reschedule_requested: "нужен перенос записи",
		promised_payment: "пациент обещал оплату",
		document_pickup: "документы готовы к выдаче/получению",
	};

function _completeCommunicationTask(
	input: CompleteCommunicationTaskInput,
): CommunicationTask {
	const task = communicationTasks.find((item) => item.id === input.taskId);
	if (!task) {
		throw new Error("Задача коммуникации не найдена");
	}
	if (task.status === "completed") {
		return task;
	}
	const completedAt = new Date().toISOString();
	const outcomeLabel = input.outcome
		? communicationTaskOutcomeLabels[input.outcome]
		: null;
	const completionMessage = input.note ?? `Задача связи закрыта: ${task.title}`;
	const eventMessage = outcomeLabel
		? `Исход: ${outcomeLabel}. ${completionMessage}`
		: completionMessage;
	task.status = "completed";
	task.lastOutcome = input.outcome ?? null;
	task.lastEventAt = completedAt;
	communicationEvents.unshift({
		id: randomUUID(),
		organizationId,
		taskId: task.id,
		patientId: task.patientId,
		actorUserId: doctorUserId,
		channel: task.channel,
		direction: "outbound",
		status: "completed",
		message: eventMessage,
		createdAt: completedAt,
	});
	recordAuditEvent({
		entityType: "communication_task",
		entityId: task.id,
		action: "communication_completed",
		reason: outcomeLabel
			? `${outcomeLabel}: ${input.note ?? task.title}`
			: (input.note ?? task.title),
	});
	return task;
}

const imagingKindTitles: Record<ImagingStudyKind, string> = {
	periapical: "Прицельный снимок",
	bitewing: "Интерпроксимальный снимок",
	opg: "ОПТГ",
	ceph: "ТРГ / цефалометрия",
	cbct: "КЛКТ / КТ",
	photo: "Фото",
	other: "Снимок",
};

function viewerModeForImagingKind(kind: ImagingStudyKind): ImagingViewerMode {
	if (kind === "cbct") return "mpr";
	if (kind === "photo") return "photo";
	return "two_d";
}

function defaultViewerStateForStudy(
	study: ImagingStudy,
): ImagingViewerSessionState {
	return {
		mode: viewerModeForImagingKind(study.kind),
		activeTool: "window_level",
		activeQuickActionId: null,
		windowPreset:
			study.kind === "cbct"
				? "bone"
				: study.kind === "photo"
					? "photo"
					: "endo",
		windowCenter: null,
		windowWidth: null,
		brightness: 1,
		contrast: study.kind === "photo" ? 1 : 1.08,
		inverted: false,
		rotationDeg: 0,
		flipHorizontal: false,
		zoom: 1,
		panX: 0,
		panY: 0,
		sliceIndex: null,
		projection: study.kind === "cbct" ? "axial" : null,
		axisDeg: 0,
		slabMm: 1,
		crosshair: study.kind === "cbct",
		linkedPlanes: study.kind === "cbct",
		implantPlan: null,
	};
}

function normalizeViewerAnnotations(
	annotations: ImagingViewerAnnotation[],
): ImagingViewerAnnotation[] {
	const now = new Date().toISOString();
	return annotations.slice(0, 200).map((annotation) => ({
		...annotation,
		id: annotation.id || randomUUID(),
		label: annotation.label.trim(),
		toothCode: annotation.toothCode?.trim() || null,
		note: annotation.note?.trim() || null,
		createdByUserId: annotation.createdByUserId ?? doctorUserId,
		createdAt: annotation.createdAt || now,
		updatedAt: annotation.updatedAt || now,
	}));
}

function _getOrCreateImagingViewerSession(
	study: ImagingStudy,
): ImagingViewerSession {
	const existing = imagingViewerSessions.find(
		(session) => session.studyId === study.id,
	);
	if (existing) return existing;

	const now = new Date().toISOString();
	const session: ImagingViewerSession = {
		id: randomUUID(),
		organizationId,
		studyId: study.id,
		patientId: study.patientId,
		visitId: study.visitId,
		state: defaultViewerStateForStudy(study),
		annotations: [],
		clientSavedAt: null,
		serverSavedAt: now,
		createdAt: now,
		updatedAt: now,
		warnings: [
			"Состояние просмотра сохраняется отдельно от исходного снимка; исходный снимок не изменяется.",
			study.kind === "cbct"
				? "Настройки КЛКТ/КТ-срезов являются навигацией врача, а не подписанным рентгенологическим заключением."
				: "2D-измерения требуют калибровки сенсора перед клиническим применением.",
		],
	};
	imagingViewerSessions.unshift(session);
	persistMutableState();
	return session;
}

function _saveImagingViewerSession(
	studyId: string,
	input: SaveImagingViewerSessionRequest,
): ImagingViewerSession {
	const study = imagingStudies.find((candidate) => candidate.id === studyId);
	if (!study) throw new Error("Исследование не найдено");
	if (study.patientId !== input.patientId)
		throw new Error("Пациент в просмотре не совпадает с пациентом снимка");

	const now = new Date().toISOString();
	const existingIndex = imagingViewerSessions.findIndex(
		(session) => session.studyId === study.id,
	);
	const previous =
		existingIndex >= 0 ? imagingViewerSessions[existingIndex] : null;
	const annotations = normalizeViewerAnnotations(input.annotations ?? []);
	const warnings = [
		"Состояние просмотра сохраняется отдельно от исходного снимка; исходный снимок не изменяется.",
		study.kind === "cbct"
			? "Настройки КЛКТ/КТ-срезов являются навигацией врача, а не подписанным рентгенологическим заключением."
			: "2D-измерения требуют калибровки сенсора перед клиническим применением.",
		input.state.mode === "mpr" && study.kind !== "cbct"
			? "КТ-срезы доступны только для КЛКТ/КТ-серий; это исследование остается 2D-просмотром."
			: null,
		annotations.length >= 200
			? "Достигнут лимит разметки; архивируйте старые отметки перед добавлением новых."
			: null,
	].filter((warning): warning is string => Boolean(warning));
	const session: ImagingViewerSession = {
		id: previous?.id ?? randomUUID(),
		organizationId,
		studyId: study.id,
		patientId: study.patientId,
		visitId: input.visitId ?? study.visitId,
		state: input.state,
		annotations,
		clientSavedAt: input.clientSavedAt ?? null,
		serverSavedAt: now,
		createdAt: previous?.createdAt ?? now,
		updatedAt: now,
		warnings,
	};

	if (existingIndex >= 0)
		imagingViewerSessions.splice(existingIndex, 1, session);
	else imagingViewerSessions.unshift(session);

	if (!previous || previous.annotations.length !== annotations.length) {
		recordAuditEvent({
			entityType: "imaging_viewer_session",
			entityId: session.id,
			action: previous
				? "imaging_viewer_annotations_saved"
				: "imaging_viewer_session_created",
			reason: `${study.title}: ${annotations.length} saved annotation(s), mode ${input.state.mode}.`,
		});
	} else {
		persistMutableState();
	}

	return session;
}

function dicomWorkbenchSeriesKeyFromManifest(
	manifest: DicomViewerWorkbenchManifestResponse,
): string {
	const ref = manifest.toolStateBundle.seriesRef;
	const sourceIdentity = ref.firstFilePath
		? `file:${shortHash(ref.firstFilePath)}`
		: `${ref.sourceKind}:${shortHash(ref.sourceName)}`;
	return [
		ref.studyInstanceUid ??
			manifest.launchManifest.studyInstanceUid ??
			"no-study",
		ref.seriesInstanceUid ??
			manifest.launchManifest.seriesInstanceUid ??
			"no-series",
		ref.sourceKind,
		ref.sourceName,
		sourceIdentity,
	].join("|");
}

function dicomWorkbenchWarnings(
	manifest: DicomViewerWorkbenchManifestResponse,
): string[] {
	return uniqueStrings([
		"Серверный пакет хранит только метаданные, состояние просмотрщика, разметку и план запуска/предварительной подготовки; исходные снимки остаются в архиве снимков, локальной папке или устройстве.",
		"Серверный пакет скрывает локальные пути снимков; перед открытием серии переподключите папку или устройство на рабочей станции.",
		"Пакет КЛКТ/КТ-срезов является восстанавливаемым состоянием рабочего места, а не подписанным заключением рентгенолога.",
		manifest.readiness.shouldUseExternalViewer
			? "Тяжелую КЛКТ/КТ-серию на этой станции нужно передать во внешний или настольный КТ-просмотрщик; CRM хранит восстанавливаемое состояние."
			: "",
		manifest.readiness.canOpenInBrowser
			? ""
			: "Браузер пока не может открыть всю серию целиком; сохраните метаданные и используйте внешний просмотр.",
		...manifest.warnings,
	]).slice(0, 16);
}

const dicomRenderTextureStrategyAuditLabels: Record<
	DicomViewerWorkbenchManifestResponse["renderCachePlan"]["textureStrategy"],
	string
> = {
	metadata_only: "только список серии",
	stack_2d_textures: "послойный 2D-просмотр",
	single_3d_texture: "объемный просмотр",
	bricked_3d_textures: "объемный просмотр по частям",
	external_viewer: "внешний просмотр",
};

function _saveDicomWorkbenchBundle(
	input: SaveDicomWorkbenchBundleRequest,
): DicomWorkbenchBundle {
	const now = new Date().toISOString();
	const manifest = cloneDicomWorkbenchManifestForServerStorage(input.manifest);
	const ref = manifest.toolStateBundle.seriesRef;
	const seriesKey =
		input.seriesKey?.trim() || dicomWorkbenchSeriesKeyFromManifest(manifest);
	const existingIndex = dicomWorkbenchBundles.findIndex(
		(bundle) => bundle.seriesKey === seriesKey,
	);
	const previous =
		existingIndex >= 0 ? dicomWorkbenchBundles[existingIndex] : null;
	const bundle: DicomWorkbenchBundle = {
		id: previous?.id ?? randomUUID(),
		organizationId,
		seriesKey,
		patientId: null,
		studyInstanceUid:
			ref.studyInstanceUid ?? manifest.launchManifest.studyInstanceUid,
		seriesInstanceUid:
			ref.seriesInstanceUid ?? manifest.launchManifest.seriesInstanceUid,
		sourceName: ref.sourceName,
		sourceKind: ref.sourceKind,
		pixelPolicy: "metadata_and_tool_state_only_no_pixels",
		manifest,
		clientSavedAt: input.clientSavedAt ?? null,
		serverSavedAt: now,
		createdAt: previous?.createdAt ?? now,
		updatedAt: now,
		warnings: dicomWorkbenchWarnings(manifest),
	};

	if (existingIndex >= 0)
		dicomWorkbenchBundles.splice(existingIndex, 1, bundle);
	else dicomWorkbenchBundles.unshift(bundle);
	dicomWorkbenchBundles.splice(30);

	recordAuditEvent({
		entityType: "dicom_workbench_bundle",
		entityId: bundle.id,
		action: previous
			? "dicom_workbench_bundle_updated"
			: "dicom_workbench_bundle_saved",
		reason: `${bundle.sourceName}: готовность ${manifest.readiness.readinessScore}%, режим ${dicomRenderTextureStrategyAuditLabels[manifest.renderCachePlan.textureStrategy]}, снимки не копировались в пакет.`,
	});
	return bundle;
}

function _listDicomWorkbenchBundles(limit = 8): DicomWorkbenchBundle[] {
	const normalizedLimit = Math.max(1, Math.min(limit, 30));
	return dicomWorkbenchBundles
		.slice()
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
		.slice(0, normalizedLimit);
}

function _createImagingStudy(input: {
	patientId: string;
	visitId?: string | null | undefined;
	kind: ImagingStudyKind;
	title: string;
	toothCode?: string | null | undefined;
	region?: string | null | undefined;
	sourceKind: ImagingSourceKind;
	sourceName: string;
	storagePath?: string | null | undefined;
	dicomStudyUid?: string | null | undefined;
	capturedAt?: string | undefined;
	aiSummary?: string | null | undefined;
}): ImagingStudy {
	const id = randomUUID();
	const title = input.title.trim() || imagingKindTitles[input.kind];
	const sourceName = input.sourceName.trim() || "manual";
	const study: ImagingStudy = {
		id,
		organizationId,
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		kind: input.kind,
		title: title.length > 180 ? title.slice(0, 180) : title,
		toothCode: nullableTrimmed(input.toothCode),
		region: nullableTrimmed(input.region),
		capturedAt: input.capturedAt ?? new Date().toISOString(),
		sourceKind: input.sourceKind,
		sourceName: sourceName.length > 160 ? sourceName.slice(0, 160) : sourceName,
		storagePath: nullableTrimmed(input.storagePath),
		dicomStudyUid: nullableTrimmed(input.dicomStudyUid),
		status: "needs_review",
		aiSummary:
			nullableTrimmed(input.aiSummary) ??
			"Черновик: снимок добавлен, требуется проверка врача.",
		previewUrl: `/api/imaging/studies/${id}/preview.svg`,
		viewerUrl: `/api/imaging/studies/${id}/preview.svg`,
	};
	imagingStudies.unshift(study);
	recordAuditEvent({
		entityType: "imaging_study",
		entityId: study.id,
		action: "imaging_created",
		reason: `${study.title} добавлен в карту пациента.`,
	});
	return study;
}
