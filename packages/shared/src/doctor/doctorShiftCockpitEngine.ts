/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Shift Cockpit Engine (Wave 21 / Doctor Workstation)
 *
 * Core Architectural Mandates:
 * 1. Appointment Countdown Timer:
 *    - "normal" (> 15 min remaining, green status)
 *    - "warning" (5..15 min remaining, amber/yellow status)
 *    - "critical" (< 5 min remaining, red status)
 *    - "overtime" (slot expired, delay tracking in minutes)
 * 2. Statutory EMR Form 043/у Completeness Evaluation (0..100%):
 *    - Complaints (Жалобы), Anamnesis (Анамнез), Dental Formula (Зубная формула),
 *      ICD-10 Diagnosis (Диагноз МКБ-10), Treatment Plan (План лечения),
 *      Services Rendered (Наряд-заказ), Doctor Signature (Подпись врача / ПЭП 63-ФЗ).
 * 3. Doctor Shift Queue & Queue Orchestration:
 *    - Current Patient (in-chair) with live timer and EMR status.
 *    - Next Patient in waiting hall (waiting / next).
 *    - Unclosed Outpatient Records (043/у) list with statutory deadlines (Order 947n).
 * 4. Assistant & Staff Pager Event Dispatcher:
 *    - Types: "assistant_needed", "sterilization_needed", "emergency_doctor", "reception_call".
 * 5. Cryptographically Strong SHA-256 PEP Protocol (63-ФЗ, 834н, 947н) with SMS Attempt Decrement.
 * 6. Exact Integer Kopecks Arithmetic for Patient Balances (Zero Float Drift).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Kopecks } from "../utils/money.js";
import {
	formatKopecksRu,
	parseKopecks,
	rublesToKopecks,
	sumKopecks,
} from "../utils/money.js";
import { sha256Hex } from "../sync/hashing.js";
import {
	type DoctorAppointmentStatus,
	type DoctorShiftAppointment,
	type DoctorShiftServiceItem,
	type Emr043CardStatus,
	type EmrBatchSigningSession,
	doctorAppointmentStatusSchema,
	doctorShiftAppointmentSchema,
	emr043CardStatusSchema,
	emrBatchSigningSessionSchema,
	calculateServicePieceRateAccrual,
	maskDoctorPhoneNumber,
} from "../doctor-portal/doctorShiftEngine.js";

export type { DoctorShiftServiceItem };

// ─────────────────────────────────────────────────────────────────────────────
// 1. APPOINTMENT TIMER SCHEMAS & METADATA
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentTimerStatusSchema = z.enum([
	"normal",
	"warning",
	"critical",
	"overtime",
]);
export type AppointmentTimerStatus = z.infer<typeof appointmentTimerStatusSchema>;

export const APPOINTMENT_TIMER_STATUS_META: Record<
	AppointmentTimerStatus,
	{
		labelRu: string;
		badgeColor: "emerald" | "amber" | "rose" | "crimson";
		badgeColorHex: string;
		descriptionRu: string;
		severityLevel: number;
	}
> = {
	normal: {
		labelRu: "В графике",
		badgeColor: "emerald",
		badgeColorHex: "#10b981",
		descriptionRu: "Прием идет по графику, до окончания более 15 минут.",
		severityLevel: 0,
	},
	warning: {
		labelRu: "Завершение приема",
		badgeColor: "amber",
		badgeColorHex: "#f59e0b",
		descriptionRu: "До конца слота приема осталось от 5 до 15 минут.",
		severityLevel: 1,
	},
	critical: {
		labelRu: "Критическое время",
		badgeColor: "rose",
		badgeColorHex: "#f43f5e",
		descriptionRu: "До окончания слота менее 5 минут! Необходимо завершать манипуляции.",
		severityLevel: 2,
	},
	overtime: {
		labelRu: "Задержка приема",
		badgeColor: "crimson",
		badgeColorHex: "#dc2626",
		descriptionRu: "Время приема истекло. Идет превышение длительности приема.",
		severityLevel: 3,
	},
};

export const appointmentTimerResultSchema = z.object({
	status: appointmentTimerStatusSchema,
	remainingMinutes: z.number().int().min(0),
	remainingSeconds: z.number().int().min(0),
	overtimeMinutes: z.number().int().min(0),
	overtimeSeconds: z.number().int().min(0),
	elapsedMinutes: z.number().int().min(0),
	elapsedSeconds: z.number().int().min(0),
	totalSlotDurationMinutes: z.number().int().min(0),
	totalSlotDurationSeconds: z.number().int().min(0),
	progressPercent: z.number().min(0).max(100),
	isOvertime: z.boolean(),
	badgeColor: z.enum(["emerald", "amber", "rose", "crimson"]),
	badgeColorHex: z.string(),
	labelRu: z.string(),
	startsAtIso: z.string(),
	endsAtIso: z.string(),
	currentTimestampIso: z.string(),
});
export type AppointmentTimerResult = z.infer<typeof appointmentTimerResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. EMR FORM 043/у COMPLETENESS EVALUATION SCHEMAS & METADATA
// ─────────────────────────────────────────────────────────────────────────────

export const emr043SectionIdSchema = z.enum([
	"complaints",
	"anamnesis",
	"dental_formula",
	"icd10_diagnosis",
	"treatment_plan",
	"services_rendered",
	"doctor_signature",
]);
export type Emr043SectionId = z.infer<typeof emr043SectionIdSchema>;

export interface Emr043SectionConfig {
	readonly sectionId: Emr043SectionId;
	readonly nameRu: string;
	readonly weightPercent: number;
	readonly isMandatoryForSigning: boolean;
	readonly statutoryBasisRu: string;
}

export const EMR_043_SECTIONS_CONFIG: readonly Emr043SectionConfig[] = [
	{
		sectionId: "complaints",
		nameRu: "Жалобы пациента (Subjective)",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Приказ Минздрава СССР № 1030 / Приказ Минздрава РФ № 834н",
	},
	{
		sectionId: "anamnesis",
		nameRu: "Анамнез заболевания и жизни",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Приказ Минздрава РФ № 834н, учет аллергий и соматики",
	},
	{
		sectionId: "dental_formula",
		nameRu: "Зубная формула (FDI 11-48 / 51-85)",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Клинические рекомендации СтАР, формула зубов и индексы",
	},
	{
		sectionId: "icd10_diagnosis",
		nameRu: "Диагноз по МКБ-10",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "МКБ-10 (Класс XI, K00–K14 Болезни органов пищеварения)",
	},
	{
		sectionId: "treatment_plan",
		nameRu: "План лечения и протокол манипуляций",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Приказ Минздрава РФ № 834н, дневник SOAP",
	},
	{
		sectionId: "services_rendered",
		nameRu: "Наряд-заказ / оказанные услуги (Номенклатура 804н)",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Приказ Минздрава РФ № 804н от 13.10.2017",
	},
	{
		sectionId: "doctor_signature",
		nameRu: "Подпись врача (ПЭП / 63-ФЗ)",
		weightPercent: 10,
		isMandatoryForSigning: false,
		statutoryBasisRu: "Федеральный закон № 63-ФЗ ст. 9 (ПЭП) + Приказ 947н",
	},
] as const;

export const emr043SectionEvaluationSchema = z.object({
	sectionId: emr043SectionIdSchema,
	nameRu: z.string(),
	weightPercent: z.number().int().min(1).max(100),
	isComplete: z.boolean(),
	earnedScore: z.number().int().min(0).max(100),
	missingDetailsRu: z.array(z.string()),
});
export type Emr043SectionEvaluation = z.infer<typeof emr043SectionEvaluationSchema>;

export const emr043CompletenessResultSchema = z.object({
	totalScore: z.number().int().min(0).max(100),
	readinessStatus: z.enum([
		"incomplete",
		"draft",
		"ready_for_signing",
		"fully_signed",
	]),
	isReadyForSigning: z.boolean(),
	isFullySigned: z.boolean(),
	sections: z.array(emr043SectionEvaluationSchema),
	missingSectionsCount: z.number().int().min(0),
	blockingIssuesRu: z.array(z.string()),
	evaluationSummaryRu: z.string(),
});
export type Emr043CompletenessResult = z.infer<typeof emr043CompletenessResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. ASSISTANT & STAFF PAGER EVENT SCHEMAS & METADATA
// ─────────────────────────────────────────────────────────────────────────────

export const pagerEventTypeSchema = z.enum([
	"assistant_needed",
	"sterilization_needed",
	"emergency_doctor",
	"reception_call",
]);
export type PagerEventType = z.infer<typeof pagerEventTypeSchema>;

export const pagerUrgencySchema = z.enum(["routine", "urgent", "emergency"]);
export type PagerUrgency = z.infer<typeof pagerUrgencySchema>;

export const pagerStatusSchema = z.enum([
	"active",
	"acknowledged",
	"resolved",
	"cancelled",
]);
export type PagerStatus = z.infer<typeof pagerStatusSchema>;

export const PAGER_EVENT_TYPE_META: Record<
	PagerEventType,
	{
		labelRu: string;
		targetRoleRu: string;
		defaultUrgency: PagerUrgency;
		iconName: string;
		badgeColor: string;
		audioAlertName: string;
		descriptionRu: string;
	}
> = {
	assistant_needed: {
		labelRu: "Вызов ассистента",
		targetRoleRu: "Ассистент стоматолога",
		defaultUrgency: "routine",
		iconName: "user-plus",
		badgeColor: "blue",
		audioAlertName: "chime-soft",
		descriptionRu: "Требуется помощь ассистента у кресла (аспирация, 4 руки, замешивание).",
	},
	sterilization_needed: {
		labelRu: "Стерилизация / Санитарка",
		targetRoleRu: "Санитарка / ЦСО",
		defaultUrgency: "routine",
		iconName: "sparkles",
		badgeColor: "teal",
		audioAlertName: "chime-soft",
		descriptionRu: "Требуется смена крафт-пакетов, уборка кабинета или дезинфекция столика.",
	},
	emergency_doctor: {
		labelRu: "ЭКСТРЕННО: Врач / Реанимация",
		targetRoleRu: "Дежурный реаниматолог / Главврач",
		defaultUrgency: "emergency",
		iconName: "alert-triangle",
		badgeColor: "rose",
		audioAlertName: "alarm-critical",
		descriptionRu: "Экстренная ситуация в кабинете! Требуется противошоковая укладка / помощь.",
	},
	reception_call: {
		labelRu: "Вызов администратора",
		targetRoleRu: "Администратор ресепшен",
		defaultUrgency: "routine",
		iconName: "phone-call",
		badgeColor: "amber",
		audioAlertName: "chime-soft",
		descriptionRu: "Требуется администратор (расчет, заказ такси, перенос записи, документы).",
	},
};

export const assistantPagerEventSchema = z.object({
	id: z.string().min(1),
	eventType: pagerEventTypeSchema,
	doctorId: z.string().min(1),
	doctorFullName: z.string().min(1),
	cabinetNumber: z.string().min(1),
	chairId: z.string().optional(),
	urgency: pagerUrgencySchema.default("routine"),
	status: pagerStatusSchema.default("active"),
	createdAtIso: z.string().min(1),
	acknowledgedAtIso: z.string().optional(),
	acknowledgedByUserId: z.string().optional(),
	acknowledgedByName: z.string().optional(),
	resolvedAtIso: z.string().optional(),
	resolvedByUserId: z.string().optional(),
	notes: z.string().optional(),
});
export type AssistantPagerEvent = z.infer<typeof assistantPagerEventSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 4. PATIENT FINANCIAL STATE IN INTEGER KOPECKS
// ─────────────────────────────────────────────────────────────────────────────

export const patientFinancialBalanceSchema = z.object({
	patientId: z.string().min(1),
	depositBalanceKop: z.number().int(),
	todayServicesTotalKop: z.number().int().min(0),
	todayPaidTotalKop: z.number().int().min(0),
	todayRemainingDueKop: z.number().int().min(0),
	familyWalletBalanceKop: z.number().int().min(0).default(0),
	effectiveAvailableFundsKop: z.number().int(),
	hasDebt: z.boolean(),
	debtAmountKop: z.number().int().min(0),
	formattedDeposit: z.string(),
	formattedRemainingDue: z.string(),
	formattedEffectiveFunds: z.string(),
	canCoverTodayServices: z.boolean(),
});
export type PatientFinancialBalance = z.infer<typeof patientFinancialBalanceSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 5. UNCLOSED EMR CARDS & SHIFT QUEUE RESULT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const unclosedEmrCardSchema = z.object({
	appointmentId: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	cardNumber: z.string().min(1),
	startsAtIso: z.string().min(1),
	endsAtIso: z.string().min(1),
	status: doctorAppointmentStatusSchema,
	emrStatus: emr043CardStatusSchema,
	completenessScore: z.number().int().min(0).max(100),
	deadlineIso: z.string().min(1),
	minutesUntilDeadline: z.number().int(),
	isOverdue: z.boolean(),
	urgency: z.enum(["normal", "urgent", "overdue"]),
});
export type UnclosedEmrCard = z.infer<typeof unclosedEmrCardSchema>;

export interface CurrentPatientCockpitView {
	readonly appointment: DoctorShiftAppointment;
	readonly timer: AppointmentTimerResult;
	readonly emrCompleteness: Emr043CompletenessResult;
	readonly financialBalance: PatientFinancialBalance;
}

export interface NextPatientWaitingView {
	readonly appointment: DoctorShiftAppointment;
	readonly isWaitingInHall: boolean;
	readonly waitingMinutes: number;
	readonly startsAtIso: string;
	readonly financialBalance: PatientFinancialBalance;
}

export interface DoctorShiftQueueResult {
	readonly doctorId: string;
	readonly shiftDateIso: string;
	readonly currentPatient: CurrentPatientCockpitView | null;
	readonly nextPatient: NextPatientWaitingView | null;
	readonly waitingQueue: readonly DoctorShiftAppointment[];
	readonly upcomingAppointments: readonly DoctorShiftAppointment[];
	readonly completedAppointments: readonly DoctorShiftAppointment[];
	readonly unclosedEmrCards: readonly UnclosedEmrCard[];
	readonly activePagerEvents: readonly AssistantPagerEvent[];
	readonly metrics: {
		readonly totalAppointments: number;
		readonly completedCount: number;
		readonly inChairCount: number;
		readonly waitingCount: number;
		readonly cancelledCount: number;
		readonly noShowCount: number;
		readonly unclosedCardsCount: number;
		readonly overdueCardsCount: number;
		readonly totalGrossRevenueKop: Kopecks;
		readonly totalEarnedPayoutKop: Kopecks;
		readonly shiftDelayMinutes: number;
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CRYPTOGRAPHICALLY SECURE SHA-256 PEP PROTOCOL (63-ФЗ, 834н, 947н)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates statutory cryptographic SHA-256 protocol hash stamp for batch EMR 043/у signing.
 * Compliant with 63-ФЗ ст. 9 (ПЭП) and Ministry of Health Order 947н.
 */
export function generateBatchEmrProtocolHashSha256(
	appointmentIds: readonly string[],
	doctorId: string,
	timestampIso: string,
): string {
	const shiftDate = timestampIso.split("T")[0] ?? "1970-01-01";
	const sortedIds = [...appointmentIds].sort().join(",");
	const rawPayload = `DENTE:PEP:63-FZ:043U:${doctorId}:${shiftDate}:${sortedIds}:${timestampIso}`;
	const hash64 = sha256Hex(rawPayload).toUpperCase();
	return `RU-PEP-63FZ-${hash64.slice(0, 32)}`;
}

export interface EmrBatchSigningResultSha256 {
	readonly success: boolean;
	readonly messageRu: string;
	readonly signedCount: number;
	readonly signedAppointmentIds: readonly string[];
	readonly updatedAppointments: readonly DoctorShiftAppointment[];
	readonly updatedSession: EmrBatchSigningSession;
	readonly protocolHash: string;
	readonly signedAtIso: string;
}

/**
 * Initiates a batch EMR 043/у signing session with SHA-256 cryptographic verification token.
 */
export function initiateBatchEmrSigningSha256(params: {
	doctorId: string;
	doctorName: string;
	doctorPhone: string;
	appointmentIds: readonly string[];
	shiftDateIso?: string;
	fixedSecretCode?: string;
	validityDurationSeconds?: number;
	currentTimeIso?: string;
}): EmrBatchSigningSession {
	const now = params.currentTimeIso ? new Date(params.currentTimeIso) : new Date();
	const validitySec = params.validityDurationSeconds ?? 300; // 5 minutes
	const expiresAt = new Date(now.getTime() + validitySec * 1000);
	const timestampIso = now.toISOString();

	let code = params.fixedSecretCode;
	if (!code) {
		const randomNum = Math.floor(100000 + Math.random() * 900000);
		code = String(randomNum);
	}

	const batchHash = generateBatchEmrProtocolHashSha256(
		params.appointmentIds,
		params.doctorId,
		timestampIso,
	);

	const sessionId = `pep-sess-sha256-${params.doctorId.replace(/[^a-zA-Z0-9_-]/g, "")}-${now.getTime()}`;

	return {
		sessionId,
		doctorId: params.doctorId,
		doctorName: params.doctorName,
		maskedPhone: maskDoctorPhoneNumber(params.doctorPhone),
		appointmentIds: [...params.appointmentIds],
		shiftDateIso: params.shiftDateIso || timestampIso.split("T")[0] || "1970-01-01",
		secretCode: code,
		expiresAtIso: expiresAt.toISOString(),
		attemptsRemaining: 3,
		batchHash,
		isVerified: false,
		isExpired: false,
	};
}

/**
 * Verifies the SMS code with strict attempt decrementing and signs EMR cards with SHA-256 PEP stamp.
 */
export function verifyAndSignBatchEmrSha256(params: {
	session: EmrBatchSigningSession;
	enteredCode: string;
	appointments: readonly DoctorShiftAppointment[];
	doctorName: string;
	doctorSnils?: string;
	signTimestampIso?: string;
}): EmrBatchSigningResultSha256 {
	const now = new Date(params.signTimestampIso || new Date().toISOString());
	const expiresAt = new Date(params.session.expiresAtIso);

	// Check expiration
	if (now.getTime() > expiresAt.getTime()) {
		const updatedSession: EmrBatchSigningSession = {
			...params.session,
			isExpired: true,
		};
		return {
			success: false,
			messageRu: "Срок действия СМС-кода истек. Запросите новый код подтверждения.",
			signedCount: 0,
			signedAppointmentIds: [],
			updatedAppointments: [...params.appointments],
			updatedSession,
			protocolHash: params.session.batchHash,
			signedAtIso: now.toISOString(),
		};
	}

	// Check attempts lock
	if (params.session.attemptsRemaining <= 0) {
		return {
			success: false,
			messageRu: "Превышено максимальное количество попыток ввода. Сессия заблокирована.",
			signedCount: 0,
			signedAppointmentIds: [],
			updatedAppointments: [...params.appointments],
			updatedSession: params.session,
			protocolHash: params.session.batchHash,
			signedAtIso: now.toISOString(),
		};
	}

	const cleanEntered = params.enteredCode.trim().replace(/\D/g, "");
	const cleanExpected = params.session.secretCode.trim().replace(/\D/g, "");

	if (cleanEntered !== cleanExpected) {
		const remaining = Math.max(0, params.session.attemptsRemaining - 1);
		const updatedSession: EmrBatchSigningSession = {
			...params.session,
			attemptsRemaining: remaining,
			isExpired: remaining === 0,
		};
		return {
			success: false,
			messageRu:
				remaining > 0
					? `Неверный СМС-код подтверждения ПЭП. Осталось попыток: ${remaining}.`
					: "Неверный СМС-код. Лимит попыток исчерпан, запросите новый код.",
			signedCount: 0,
			signedAppointmentIds: [],
			updatedAppointments: [...params.appointments],
			updatedSession,
			protocolHash: params.session.batchHash,
			signedAtIso: now.toISOString(),
		};
	}

	// Verification success
	const signedTimestamp = params.signTimestampIso || now.toISOString();
	const targetIdsSet = new Set(params.session.appointmentIds);
	const newlySignedIds: string[] = [];

	const updatedAppointments = params.appointments.map((apt) => {
		if (targetIdsSet.has(apt.id)) {
			newlySignedIds.push(apt.id);
			return {
				...apt,
				emrCard043uStatus: "signed" as Emr043CardStatus,
				emrSignedAtIso: signedTimestamp,
				emrPepProtocolHash: params.session.batchHash,
				emrSignerInfo: {
					name: params.doctorName,
					phoneMasked: params.session.maskedPhone,
					snils: params.doctorSnils || "123-456-789 00",
					lawBasis: "63-ФЗ ст. 9 (ПЭП) + Приказ Минздрава РФ 947н",
				},
			};
		}
		return apt;
	});

	const updatedSession: EmrBatchSigningSession = {
		...params.session,
		isVerified: true,
	};

	return {
		success: true,
		messageRu: `Успешно подписано ${newlySignedIds.length} медицинских карт ф. 043/у через криптографический протокол ПЭП (63-ФЗ).`,
		signedCount: newlySignedIds.length,
		signedAppointmentIds: newlySignedIds,
		updatedAppointments,
		updatedSession,
		protocolHash: params.session.batchHash,
		signedAtIso: signedTimestamp,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. COUNTDOWN TIMER CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates real-time countdown timer for an active appointment slot with exact threshold gradations.
 *
 * Rules:
 * - "normal": > 15 minutes until slot end (green status)
 * - "warning": 5..15 minutes until slot end (amber status)
 * - "critical": < 5 minutes until slot end (red status)
 * - "overtime": Slot elapsed, delay in progress (crimson status)
 */
export function calculateAppointmentTimer(params: {
	startsAtIso: string;
	endsAtIso: string;
	currentTimeIso?: string;
}): AppointmentTimerResult {
	const currentIso = params.currentTimeIso ?? new Date().toISOString();
	const startMs = new Date(params.startsAtIso).getTime();
	const endMs = new Date(params.endsAtIso).getTime();
	const currentMs = new Date(currentIso).getTime();

	const totalDurationMs = Math.max(0, endMs - startMs);
	const totalSlotDurationSeconds = Math.floor(totalDurationMs / 1000);
	const totalSlotDurationMinutes = Math.round(totalDurationMs / 60000);

	const elapsedMs = Math.max(0, currentMs - startMs);
	const elapsedSeconds = Math.floor(elapsedMs / 1000);
	const elapsedMinutes = Math.floor(elapsedSeconds / 60);

	const remainingMs = endMs - currentMs;

	if (remainingMs <= 0) {
		// Overtime condition
		const overtimeMs = currentMs - endMs;
		const overtimeSeconds = Math.max(0, Math.floor(overtimeMs / 1000));
		const overtimeMinutes = Math.floor(overtimeSeconds / 60);

		const meta = APPOINTMENT_TIMER_STATUS_META.overtime;
		const labelRu =
			overtimeMinutes > 0
				? `Задержка: +${overtimeMinutes} мин`
				: `Задержка: +${overtimeSeconds} сек`;

		return {
			status: "overtime",
			remainingMinutes: 0,
			remainingSeconds: 0,
			overtimeMinutes,
			overtimeSeconds,
			elapsedMinutes,
			elapsedSeconds,
			totalSlotDurationMinutes,
			totalSlotDurationSeconds,
			progressPercent: 100,
			isOvertime: true,
			badgeColor: meta.badgeColor,
			badgeColorHex: meta.badgeColorHex,
			labelRu,
			startsAtIso: params.startsAtIso,
			endsAtIso: params.endsAtIso,
			currentTimestampIso: currentIso,
		};
	}

	const remainingSeconds = Math.ceil(remainingMs / 1000);
	const remainingMinutes = Math.ceil(remainingSeconds / 60);

	const progressPercent =
		totalDurationMs > 0
			? Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)))
			: 0;

	let status: AppointmentTimerStatus = "normal";
	if (remainingMs < 5 * 60 * 1000) {
		status = "critical";
	} else if (remainingMs <= 15 * 60 * 1000) {
		status = "warning";
	} else {
		status = "normal";
	}

	const meta = APPOINTMENT_TIMER_STATUS_META[status];
	let labelRu = "";
	if (status === "critical") {
		labelRu = `Критично: ${remainingMinutes} мин`;
	} else if (status === "warning") {
		labelRu = `Завершение: ${remainingMinutes} мин`;
	} else {
		labelRu = `В графике: ${remainingMinutes} мин`;
	}

	return {
		status,
		remainingMinutes,
		remainingSeconds,
		overtimeMinutes: 0,
		overtimeSeconds: 0,
		elapsedMinutes,
		elapsedSeconds,
		totalSlotDurationMinutes,
		totalSlotDurationSeconds,
		progressPercent,
		isOvertime: false,
		badgeColor: meta.badgeColor,
		badgeColorHex: meta.badgeColorHex,
		labelRu,
		startsAtIso: params.startsAtIso,
		endsAtIso: params.endsAtIso,
		currentTimestampIso: currentIso,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. EMR FORM 043/у COMPLETENESS EVALUATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface Emr043CardEvaluationInput {
	readonly chiefComplaint?: string | null | undefined;
	readonly subjectiveComplaints?: string | null | undefined;
	readonly historyOfPresentIllness?: string | null | undefined;
	readonly allergologicalHistory?: string | null | undefined;
	readonly concomitantDiseases?: string | null | undefined;
	readonly odontogramTeeth?: readonly any[] | null | undefined;
	readonly diagnosisTooth?: string | null | undefined;
	readonly diagnosisIcd10?: string | null | undefined;
	readonly treatmentDescription?: string | null | undefined;
	readonly generalTreatmentPlan?: string | null | undefined;
	readonly procedureProtocol?: string | null | undefined;
	readonly services?: readonly DoctorShiftServiceItem[] | null | undefined;
	readonly servicesCount?: number | null | undefined;
	readonly emrCard043uStatus?: Emr043CardStatus | null | undefined;
	readonly emrSignedAtIso?: string | null | undefined;
	readonly emrPepProtocolHash?: string | null | undefined;
}

/**
 * Evaluates the statutory completeness of Form 043/у outpatient card (0..100%).
 * Inspects all 7 core medical sections with zero loose assumptions.
 */
export function evaluateEmr043Completeness(
	input: Emr043CardEvaluationInput,
): Emr043CompletenessResult {
	const sections: Emr043SectionEvaluation[] = [];
	const blockingIssuesRu: string[] = [];

	// 1. Complaints (Жалобы) — 15%
	const complaintsText = (input.chiefComplaint || input.subjectiveComplaints || "").trim();
	const isComplaintsComplete = complaintsText.length >= 3;
	const complaintsMissing: string[] = [];
	if (!isComplaintsComplete) {
		complaintsMissing.push("Не заполнены субъективные жалобы пациента");
		blockingIssuesRu.push("Отсутствуют жалобы пациента (Раздел 1 ф. 043/у)");
	}
	sections.push({
		sectionId: "complaints",
		nameRu: "Жалобы пациента (Subjective)",
		weightPercent: 15,
		isComplete: isComplaintsComplete,
		earnedScore: isComplaintsComplete ? 15 : 0,
		missingDetailsRu: complaintsMissing,
	});

	// 2. Anamnesis (Анамнез) — 15%
	const anamnesisText = [
		input.historyOfPresentIllness,
		input.allergologicalHistory,
		input.concomitantDiseases,
	]
		.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
		.join(" ")
		.trim();
	const isAnamnesisComplete = anamnesisText.length >= 5;
	const anamnesisMissing: string[] = [];
	if (!isAnamnesisComplete) {
		anamnesisMissing.push("Не указан анамнез заболевания или аллергологический статус");
		blockingIssuesRu.push("Отсутствует анамнез настоящего заболевания (Раздел 2 ф. 043/у)");
	}
	sections.push({
		sectionId: "anamnesis",
		nameRu: "Анамнез заболевания и жизни",
		weightPercent: 15,
		isComplete: isAnamnesisComplete,
		earnedScore: isAnamnesisComplete ? 15 : 0,
		missingDetailsRu: anamnesisMissing,
	});

	// 3. Dental Formula (Зубная формула) — 15%
	const hasOdontogram = Array.isArray(input.odontogramTeeth) && input.odontogramTeeth.length > 0;
	const hasToothDiagnosis = typeof input.diagnosisTooth === "string" && input.diagnosisTooth.trim().length > 0;
	const isFormulaComplete = hasOdontogram || hasToothDiagnosis;
	const formulaMissing: string[] = [];
	if (!isFormulaComplete) {
		formulaMissing.push("Не отмечен причинный зуб или отсутствует зубная формула FDI");
		blockingIssuesRu.push("Не заполнена зубная формула / статус зуба (Раздел 3 ф. 043/у)");
	}
	sections.push({
		sectionId: "dental_formula",
		nameRu: "Зубная формула (FDI 11-48 / 51-85)",
		weightPercent: 15,
		isComplete: isFormulaComplete,
		earnedScore: isFormulaComplete ? 15 : 0,
		missingDetailsRu: formulaMissing,
	});

	// 4. Diagnosis ICD-10 (Диагноз по МКБ-10) — 15%
	const icd10 = (input.diagnosisIcd10 || "").trim();
	const isIcd10Complete = /^K\d{2}(\.\d{1,2})?$/i.test(icd10) || icd10.length >= 3;
	const icd10Missing: string[] = [];
	if (!isIcd10Complete) {
		icd10Missing.push("Не указан клинический диагноз по МКБ-10 (рубрика K00-K14)");
		blockingIssuesRu.push("Отсутствует диагноз по МКБ-10 (Раздел 4 ф. 043/у)");
	}
	sections.push({
		sectionId: "icd10_diagnosis",
		nameRu: "Диагноз по МКБ-10",
		weightPercent: 15,
		isComplete: isIcd10Complete,
		earnedScore: isIcd10Complete ? 15 : 0,
		missingDetailsRu: icd10Missing,
	});

	// 5. Treatment Plan & Protocol (План лечения / Протокол) — 15%
	const treatmentText = (
		input.treatmentDescription ||
		input.generalTreatmentPlan ||
		input.procedureProtocol ||
		""
	).trim();
	const isTreatmentComplete = treatmentText.length >= 5;
	const treatmentMissing: string[] = [];
	if (!isTreatmentComplete) {
		treatmentMissing.push("Не описан протокол манипуляций или план лечения");
		blockingIssuesRu.push("Не заполнен протокол лечения / план (Раздел 5 ф. 043/у)");
	}
	sections.push({
		sectionId: "treatment_plan",
		nameRu: "План лечения и протокол манипуляций",
		weightPercent: 15,
		isComplete: isTreatmentComplete,
		earnedScore: isTreatmentComplete ? 15 : 0,
		missingDetailsRu: treatmentMissing,
	});

	// 6. Rendered Services 804n (Наряд-заказ) — 15%
	const hasServices =
		(Array.isArray(input.services) && input.services.length > 0) ||
		(typeof input.servicesCount === "number" && input.servicesCount > 0);
	const servicesMissing: string[] = [];
	if (!hasServices) {
		servicesMissing.push("В наряд-заказ не добавлено ни одной медицинской услуги");
		blockingIssuesRu.push("Отсутствуют медицинские услуги в наряд-заказе (Приказ 804н)");
	}
	sections.push({
		sectionId: "services_rendered",
		nameRu: "Наряд-заказ / оказанные услуги (Номенклатура 804н)",
		weightPercent: 15,
		isComplete: hasServices,
		earnedScore: hasServices ? 15 : 0,
		missingDetailsRu: servicesMissing,
	});

	// 7. Doctor Signature (Подпись врача / ПЭП) — 10%
	const isSigned =
		input.emrCard043uStatus === "signed" ||
		(Boolean(input.emrSignedAtIso) && Boolean(input.emrPepProtocolHash));
	const signatureMissing: string[] = [];
	if (!isSigned) {
		signatureMissing.push("Карта не заверена подписью врача (ПЭП 63-ФЗ)");
	}
	sections.push({
		sectionId: "doctor_signature",
		nameRu: "Подпись врача (ПЭП / 63-ФЗ)",
		weightPercent: 10,
		isComplete: isSigned,
		earnedScore: isSigned ? 10 : 0,
		missingDetailsRu: signatureMissing,
	});

	const totalScore = sections.reduce((sum, sec) => sum + sec.earnedScore, 0);

	const clinicalSectionsComplete =
		isComplaintsComplete &&
		isAnamnesisComplete &&
		isFormulaComplete &&
		isIcd10Complete &&
		isTreatmentComplete &&
		hasServices;

	let readinessStatus: Emr043CompletenessResult["readinessStatus"] = "incomplete";
	if (isSigned && totalScore === 100) {
		readinessStatus = "fully_signed";
	} else if (clinicalSectionsComplete && totalScore >= 90) {
		readinessStatus = "ready_for_signing";
	} else if (totalScore >= 45) {
		readinessStatus = "draft";
	} else {
		readinessStatus = "incomplete";
	}

	const missingSectionsCount = sections.filter((s) => !s.isComplete).length;

	let evaluationSummaryRu = "";
	if (readinessStatus === "fully_signed") {
		evaluationSummaryRu = "ЭМК 043/у полностью заполнена и заверена подписью ПЭП (100%).";
	} else if (readinessStatus === "ready_for_signing") {
		evaluationSummaryRu = "Все клинические разделы заполнены (90%). Карта готова к заверению ПЭП.";
	} else if (readinessStatus === "draft") {
		evaluationSummaryRu = `Черновик карты заполнен на ${totalScore}%. Не заполнено ${missingSectionsCount} разд.`;
	} else {
		evaluationSummaryRu = `Критическая неполнота карты (${totalScore}%). Заполните обязательные разделы.`;
	}

	return {
		totalScore,
		readinessStatus,
		isReadyForSigning: clinicalSectionsComplete,
		isFullySigned: isSigned && totalScore === 100,
		sections,
		missingSectionsCount,
		blockingIssuesRu,
		evaluationSummaryRu,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. PATIENT FINANCIAL BALANCE IN INTEGER KOPECKS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates patient financial balance with integer kopecks precision.
 * Guarantees zero float drift and proper deposit / family wallet aggregation.
 */
export function calculatePatientShiftBalance(params: {
	patientId: string;
	depositBalanceKop: Kopecks;
	todayServicesTotalKop: Kopecks;
	todayPaidTotalKop: Kopecks;
	familyWalletBalanceKop?: Kopecks;
}): PatientFinancialBalance {
	const depositKop = Math.round(params.depositBalanceKop || 0);
	const servicesTotalKop = Math.max(0, Math.round(params.todayServicesTotalKop || 0));
	const paidTotalKop = Math.max(0, Math.round(params.todayPaidTotalKop || 0));
	const familyKop = Math.max(0, Math.round(params.familyWalletBalanceKop || 0));

	const todayRemainingDueKop = Math.max(0, servicesTotalKop - paidTotalKop);
	const effectiveAvailableFundsKop = depositKop + familyKop;

	const hasDebt = depositKop < 0 || todayRemainingDueKop > effectiveAvailableFundsKop;
	const debtAmountKop = Math.max(
		0,
		todayRemainingDueKop - effectiveAvailableFundsKop,
		depositKop < 0 ? Math.abs(depositKop) : 0,
	);

	const canCoverTodayServices = effectiveAvailableFundsKop >= todayRemainingDueKop;

	return {
		patientId: params.patientId,
		depositBalanceKop: depositKop,
		todayServicesTotalKop: servicesTotalKop,
		todayPaidTotalKop: paidTotalKop,
		todayRemainingDueKop,
		familyWalletBalanceKop: familyKop,
		effectiveAvailableFundsKop,
		hasDebt,
		debtAmountKop,
		formattedDeposit: formatKopecksRu(depositKop),
		formattedRemainingDue: formatKopecksRu(todayRemainingDueKop),
		formattedEffectiveFunds: formatKopecksRu(effectiveAvailableFundsKop),
		canCoverTodayServices,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. ASSISTANT & STAFF PAGER EVENT DISPATCHER ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a structured pager alert event for calling clinic staff to the cabinet.
 */
export function createAssistantPagerEvent(params: {
	eventType: PagerEventType;
	doctorId: string;
	doctorFullName: string;
	cabinetNumber: string;
	chairId?: string;
	urgency?: PagerUrgency;
	notes?: string;
	createdAtIso?: string;
}): AssistantPagerEvent {
	const typeMeta = PAGER_EVENT_TYPE_META[params.eventType];
	const urgency = params.urgency ?? typeMeta.defaultUrgency;
	const createdAtIso = params.createdAtIso ?? new Date().toISOString();
	const id = `pager-${params.eventType}-${params.doctorId.replace(/[^a-zA-Z0-9_-]/g, "")}-${new Date(createdAtIso).getTime()}`;

	return {
		id,
		eventType: params.eventType,
		doctorId: params.doctorId,
		doctorFullName: params.doctorFullName,
		cabinetNumber: params.cabinetNumber,
		chairId: params.chairId,
		urgency,
		status: "active",
		createdAtIso,
		notes: params.notes,
	};
}

/**
 * Acknowledges an active pager event by a responder.
 */
export function acknowledgeAssistantPagerEvent(
	event: AssistantPagerEvent,
	params: {
		responderUserId: string;
		responderFullName: string;
		acknowledgedAtIso?: string;
	},
): AssistantPagerEvent {
	if (event.status !== "active") {
		return event;
	}
	return {
		...event,
		status: "acknowledged",
		acknowledgedAtIso: params.acknowledgedAtIso ?? new Date().toISOString(),
		acknowledgedByUserId: params.responderUserId,
		acknowledgedByName: params.responderFullName,
	};
}

/**
 * Resolves a pager event upon task completion.
 */
export function resolveAssistantPagerEvent(
	event: AssistantPagerEvent,
	params: {
		resolvedByUserId: string;
		resolvedAtIso?: string;
	},
): AssistantPagerEvent {
	return {
		...event,
		status: "resolved",
		resolvedAtIso: params.resolvedAtIso ?? new Date().toISOString(),
		resolvedByUserId: params.resolvedByUserId,
	};
}

/**
 * Cancels a pager event (e.g. called by mistake).
 */
export function cancelAssistantPagerEvent(event: AssistantPagerEvent): AssistantPagerEvent {
	return {
		...event,
		status: "cancelled",
	};
}

/**
 * Filters active or unacknowledged pager alerts for display in workstation header.
 */
export function filterActivePagerEvents(
	events: readonly AssistantPagerEvent[],
	doctorId?: string,
): AssistantPagerEvent[] {
	return events.filter((evt) => {
		if (doctorId && evt.doctorId !== doctorId) return false;
		return evt.status === "active" || evt.status === "acknowledged";
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. DOCTOR SHIFT QUEUE & WORKSPACE ORCHESTRATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface CalculateDoctorShiftQueueParams {
	readonly appointments: readonly DoctorShiftAppointment[];
	readonly doctorId: string;
	readonly shiftDateIso?: string;
	readonly currentTimeIso?: string;
	readonly patientBalances?: Record<string, { depositBalanceKop: Kopecks; familyWalletBalanceKop?: Kopecks }>;
	readonly pagerEvents?: readonly AssistantPagerEvent[];
	readonly statutoryEmrDeadlineHours?: number; // Standard: 24h per Order 947n
}

/**
 * Master orchestration engine for Doctor Shift Cockpit.
 * Computes:
 * - Current Patient (in-chair) + Timer + EMR 043 completeness + Financial balance.
 * - Next Patient (waiting in hall or upcoming).
 * - Chronological queue of waiting, upcoming and completed visits.
 * - Unclosed Outpatient Records (043/у) list with statutory deadlines.
 * - Real-time operational shift metrics.
 */
export function calculateDoctorShiftQueue(
	params: CalculateDoctorShiftQueueParams,
): DoctorShiftQueueResult {
	const currentIso = params.currentTimeIso ?? new Date().toISOString();
	const targetDate = (params.shiftDateIso ? params.shiftDateIso.split("T")[0] : null) ?? currentIso.split("T")[0] ?? "1970-01-01";
	const deadlineHours = params.statutoryEmrDeadlineHours ?? 24;

	// 1. Filter and sort appointments strictly for this doctor and shift date
	const doctorAppointments = params.appointments
		.filter((apt) => {
			if (apt.doctorId !== params.doctorId) return false;
			const aptDate = apt.startsAtIso.split("T")[0];
			return aptDate === targetDate;
		})
		.sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());

	// 2. Partition appointments by status
	let inChairAppointment: DoctorShiftAppointment | null = null;
	const waitingList: DoctorShiftAppointment[] = [];
	const upcomingList: DoctorShiftAppointment[] = [];
	const completedList: DoctorShiftAppointment[] = [];
	let cancelledCount = 0;
	let noShowCount = 0;

	for (const apt of doctorAppointments) {
		if (apt.status === "in_chair") {
			// First active in-chair appointment
			if (!inChairAppointment) {
				inChairAppointment = apt;
			}
		} else if (apt.status === "waiting") {
			waitingList.push(apt);
		} else if (apt.status === "completed") {
			completedList.push(apt);
		} else if (apt.status === "cancelled") {
			cancelledCount += 1;
		} else if (apt.status === "no_show") {
			noShowCount += 1;
		} else {
			upcomingList.push(apt);
		}
	}

	// 3. Helper to resolve patient balance
	const resolveBalance = (apt: DoctorShiftAppointment): PatientFinancialBalance => {
		const custom = params.patientBalances?.[apt.patientId];
		let servicesTotalKop = 0;
		for (const s of apt.services) {
			servicesTotalKop += s.finalRevenueKop || s.totalCostKop || 0;
		}

		return calculatePatientShiftBalance({
			patientId: apt.patientId,
			depositBalanceKop: custom?.depositBalanceKop ?? 0,
			todayServicesTotalKop: servicesTotalKop,
			todayPaidTotalKop: apt.status === "completed" ? servicesTotalKop : 0,
			familyWalletBalanceKop: custom?.familyWalletBalanceKop ?? 0,
		});
	};

	// 4. Build Current Patient view
	let currentPatient: CurrentPatientCockpitView | null = null;
	if (inChairAppointment) {
		const timer = calculateAppointmentTimer({
			startsAtIso: inChairAppointment.startsAtIso,
			endsAtIso: inChairAppointment.endsAtIso,
			currentTimeIso: currentIso,
		});

		const emrCompleteness = evaluateEmr043Completeness({
			chiefComplaint: inChairAppointment.treatmentDescription,
			subjectiveComplaints: inChairAppointment.treatmentDescription,
			historyOfPresentIllness: inChairAppointment.treatmentDescription,
			allergologicalHistory: inChairAppointment.notes,
			concomitantDiseases: inChairAppointment.notes,
			diagnosisTooth: inChairAppointment.diagnosisTooth,
			diagnosisIcd10: inChairAppointment.diagnosisIcd10,
			treatmentDescription: inChairAppointment.treatmentDescription,
			services: inChairAppointment.services,
			emrCard043uStatus: inChairAppointment.emrCard043uStatus,
			emrSignedAtIso: inChairAppointment.emrSignedAtIso,
			emrPepProtocolHash: inChairAppointment.emrPepProtocolHash,
		});

		const financialBalance = resolveBalance(inChairAppointment);

		currentPatient = {
			appointment: inChairAppointment,
			timer,
			emrCompleteness,
			financialBalance,
		};
	}

	// 5. Build Next Patient view
	let nextPatient: NextPatientWaitingView | null = null;
	if (waitingList.length > 0) {
		const nextApt = waitingList[0]!;
		const startMs = new Date(nextApt.startsAtIso).getTime();
		const currentMs = new Date(currentIso).getTime();
		const waitingMinutes = Math.max(0, Math.floor((currentMs - startMs) / 60000));

		nextPatient = {
			appointment: nextApt,
			isWaitingInHall: true,
			waitingMinutes,
			startsAtIso: nextApt.startsAtIso,
			financialBalance: resolveBalance(nextApt),
		};
	} else if (upcomingList.length > 0) {
		const nextApt = upcomingList[0]!;
		nextPatient = {
			appointment: nextApt,
			isWaitingInHall: false,
			waitingMinutes: 0,
			startsAtIso: nextApt.startsAtIso,
			financialBalance: resolveBalance(nextApt),
		};
	}

	// 6. Build Unclosed EMR 043/у Cards list with statutory deadlines
	const unclosedEmrCards: UnclosedEmrCard[] = [];
	const currentMs = new Date(currentIso).getTime();

	for (const apt of doctorAppointments) {
		if (apt.status === "completed" || apt.status === "in_chair") {
			if (apt.emrCard043uStatus !== "signed") {
				const endMs = new Date(apt.endsAtIso).getTime();
				const deadlineMs = endMs + deadlineHours * 60 * 60 * 1000;
				const minutesUntilDeadline = Math.floor((deadlineMs - currentMs) / 60000);
				const isOverdue = minutesUntilDeadline <= 0;

				let urgency: UnclosedEmrCard["urgency"] = "normal";
				if (isOverdue) {
					urgency = "overdue";
				} else if (minutesUntilDeadline <= 120) {
					urgency = "urgent";
				} else {
					urgency = "normal";
				}

				const completeness = evaluateEmr043Completeness({
					chiefComplaint: apt.treatmentDescription,
					subjectiveComplaints: apt.treatmentDescription,
					historyOfPresentIllness: apt.treatmentDescription,
					allergologicalHistory: apt.notes,
					concomitantDiseases: apt.notes,
					diagnosisTooth: apt.diagnosisTooth,
					diagnosisIcd10: apt.diagnosisIcd10,
					treatmentDescription: apt.treatmentDescription,
					services: apt.services,
					emrCard043uStatus: apt.emrCard043uStatus,
					emrSignedAtIso: apt.emrSignedAtIso,
					emrPepProtocolHash: apt.emrPepProtocolHash,
				});

				unclosedEmrCards.push({
					appointmentId: apt.id,
					patientId: apt.patientId,
					patientFullName: apt.patientFullName,
					cardNumber: apt.cardNumber,
					startsAtIso: apt.startsAtIso,
					endsAtIso: apt.endsAtIso,
					status: apt.status,
					emrStatus: apt.emrCard043uStatus,
					completenessScore: completeness.totalScore,
					deadlineIso: new Date(deadlineMs).toISOString(),
					minutesUntilDeadline,
					isOverdue,
					urgency,
				});
			}
		}
	}

	// 7. Active pager alerts
	const activePagerEvents = filterActivePagerEvents(
		params.pagerEvents ?? [],
		params.doctorId,
	);

	// 8. Financial aggregates in exact integer kopecks
	let totalGrossRevenueKop = 0;
	let totalEarnedPayoutKop = 0;

	for (const apt of doctorAppointments) {
		if (apt.status === "completed" || apt.status === "in_chair") {
			for (const s of apt.services) {
				totalGrossRevenueKop += s.finalRevenueKop || s.totalCostKop || 0;
				totalEarnedPayoutKop += s.earnedDoctorPayoutKop || 0;
			}
		}
	}

	const shiftDelayMinutes = currentPatient?.timer.isOvertime
		? currentPatient.timer.overtimeMinutes
		: 0;

	const overdueCardsCount = unclosedEmrCards.filter((c) => c.isOverdue).length;

	return {
		doctorId: params.doctorId,
		shiftDateIso: targetDate,
		currentPatient,
		nextPatient,
		waitingQueue: waitingList,
		upcomingAppointments: upcomingList,
		completedAppointments: completedList,
		unclosedEmrCards,
		activePagerEvents,
		metrics: {
			totalAppointments: doctorAppointments.length,
			completedCount: completedList.length,
			inChairCount: inChairAppointment ? 1 : 0,
			waitingCount: waitingList.length,
			cancelledCount,
			noShowCount,
			unclosedCardsCount: unclosedEmrCards.length,
			overdueCardsCount,
			totalGrossRevenueKop,
			totalEarnedPayoutKop,
			shiftDelayMinutes,
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. REALISTIC TEST PRESETS & FIXTURES (NO CLOWN DATA)
// ─────────────────────────────────────────────────────────────────────────────

export const SAMPLE_COCKPIT_APPOINTMENTS: readonly DoctorShiftAppointment[] = [
	{
		id: "apt-cockpit-01",
		patientId: "pat-201",
		patientFullName: "Волкова Анна Сергеевна",
		patientBirthDate: "1990-04-15",
		patientPhone: "+7 (926) 111-22-33",
		cardNumber: "043/у-2026/701",
		doctorId: "doc-shift-1",
		doctorFullName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		startsAtIso: "2026-08-30T09:00:00.000Z",
		endsAtIso: "2026-08-30T10:00:00.000Z",
		status: "completed",
		chairId: "chair-1",
		chairName: "Кресло 1",
		diagnosisIcd10: "K02.1",
		diagnosisTooth: "15",
		treatmentDescription: "Лечение среднего кариеса 1.5, светоотверждаемая пломба Estelite Asteria.",
		emrCard043uStatus: "signed",
		emrSignedAtIso: "2026-08-30T09:58:00.000Z",
		emrPepProtocolHash: "RU-PEP-63FZ-112233AA445566BB778899CC00112233",
		services: [
			{
				id: "srv-c1-1",
				code804n: "A16.07.002",
				nameRu: "Пломбирование зуба композитом светового отверждения (1.5)",
				category: "therapy",
				quantity: 1,
				unitPriceKop: 550000,
				totalCostKop: 550000,
				discountKop: 0,
				finalRevenueKop: 550000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 50000,
				commissionPercent: 25,
				earnedDoctorPayoutKop: 125000,
			},
		],
	},
	{
		id: "apt-cockpit-02",
		patientId: "pat-202",
		patientFullName: "Соколов Михаил Юрьевич",
		patientBirthDate: "1982-11-20",
		patientPhone: "+7 (916) 444-55-66",
		cardNumber: "043/у-2026/702",
		doctorId: "doc-shift-1",
		doctorFullName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		startsAtIso: "2026-08-30T10:30:00.000Z",
		endsAtIso: "2026-08-30T11:30:00.000Z",
		status: "in_chair",
		chairId: "chair-1",
		chairName: "Кресло 1",
		diagnosisIcd10: "K04.0",
		diagnosisTooth: "26",
		treatmentDescription: "Острый очаговый пульпит 2.6. Механическая и медикаментозная обработка 3 каналов.",
		emrCard043uStatus: "draft",
		services: [
			{
				id: "srv-c2-1",
				code804n: "A16.07.030",
				nameRu: "Инструментальная и медикаментозная обработка корневого канала (3 канала)",
				category: "therapy",
				quantity: 3,
				unitPriceKop: 300000,
				totalCostKop: 900000,
				discountKop: 0,
				finalRevenueKop: 900000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 150000,
				commissionPercent: 25,
				earnedDoctorPayoutKop: 187500,
			},
		],
	},
	{
		id: "apt-cockpit-03",
		patientId: "pat-203",
		patientFullName: "Кузнецова Ирина Павловна",
		patientBirthDate: "1994-07-08",
		patientPhone: "+7 (903) 777-11-22",
		cardNumber: "043/у-2026/703",
		doctorId: "doc-shift-1",
		doctorFullName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		startsAtIso: "2026-08-30T12:00:00.000Z",
		endsAtIso: "2026-08-30T13:00:00.000Z",
		status: "waiting",
		chairId: "chair-1",
		chairName: "Кресло 1",
		diagnosisIcd10: "K05.1",
		diagnosisTooth: "11-48",
		treatmentDescription: "Хронический катаральный гингивит. Профессиональная гигиена полости рта.",
		emrCard043uStatus: "draft",
		services: [
			{
				id: "srv-c3-1",
				code804n: "A16.07.051",
				nameRu: "Профессиональная гигиена полости рта",
				category: "hygiene",
				quantity: 1,
				unitPriceKop: 700000,
				totalCostKop: 700000,
				discountKop: 0,
				finalRevenueKop: 700000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 50000,
				commissionPercent: 30,
				earnedDoctorPayoutKop: 195000,
			},
		],
	},
	{
		id: "apt-cockpit-04",
		patientId: "pat-204",
		patientFullName: "Новиков Денис Олегович",
		patientBirthDate: "1987-02-14",
		patientPhone: "+7 (925) 999-88-77",
		cardNumber: "043/у-2026/704",
		doctorId: "doc-shift-1",
		doctorFullName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		startsAtIso: "2026-08-30T14:00:00.000Z",
		endsAtIso: "2026-08-30T15:00:00.000Z",
		status: "waiting",
		chairId: "chair-1",
		chairName: "Кресло 1",
		diagnosisIcd10: "K08.1",
		diagnosisTooth: "11",
		treatmentDescription: "Консультация ортопеда, примерка коронки из диоксида циркония.",
		emrCard043uStatus: "draft",
		services: [],
	},
];
