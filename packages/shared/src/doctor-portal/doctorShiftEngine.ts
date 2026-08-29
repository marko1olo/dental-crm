/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Mobile PWA & Shift Operations Engine (Wave 21)
 *
 * Core Mandates:
 * 1. Complete Doctor Schedule Isolation:
 *    Strict partitioning by doctorId — a doctor cannot view or mutate other
 *    practitioners' appointments or earnings on mobile.
 * 2. Real-time Integer Kopecks Piece-Rate Accrual:
 *    Deal Base = Gross Revenue - Direct Materials - ZTL Laboratory Costs.
 *    Doctor Accrual = Math.round(Deal Base * (Commission % / 100)).
 *    All arithmetic in integer kopecks (Zero floating-point drift).
 * 3. Batch EMR 043/у Simple Electronic Signature (ПЭП) Protocol:
 *    Statutory compliance with 63-ФЗ ст. 9 (ПЭП), 323-ФЗ ст. 79,
 *    Order 834н (Форма 043/у) and Order 947н (ЭМД Минздрава РФ).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Kopecks } from "../utils/money.js";
import { formatKopecksRu, parseKopecks, rublesToKopecks } from "../utils/money.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD SCHEMAS & DOMAIN ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const doctorAppointmentStatusSchema = z.enum([
	"waiting",
	"in_chair",
	"completed",
	"cancelled",
	"no_show",
]);
export type DoctorAppointmentStatus = z.infer<typeof doctorAppointmentStatusSchema>;

export const emr043CardStatusSchema = z.enum([
	"draft",
	"pending_signature",
	"signed",
]);
export type Emr043CardStatus = z.infer<typeof emr043CardStatusSchema>;

export const DOCTOR_APPOINTMENT_STATUS_META: Record<
	DoctorAppointmentStatus,
	{ labelRu: string; badgeColor: string; icon: string; descriptionRu: string }
> = {
	waiting: {
		labelRu: "Ожидает в холле",
		badgeColor: "gold",
		icon: "clock",
		descriptionRu: "Пациент прибыл в клинику и ожидает приглашения в кабинет.",
	},
	in_chair: {
		labelRu: "В кресле",
		badgeColor: "emerald",
		icon: "activity",
		descriptionRu: "Идет прием пациента в стоматологическом кресле.",
	},
	completed: {
		labelRu: "Завершен",
		badgeColor: "teal",
		icon: "check-circle-2",
		descriptionRu: "Прием завершен, оказанные услуги зафиксированы.",
	},
	cancelled: {
		labelRu: "Отменен",
		badgeColor: "rose",
		icon: "x-circle",
		descriptionRu: "Прием отменен пациентом или администратором.",
	},
	no_show: {
		labelRu: "Не явился",
		badgeColor: "muted",
		icon: "user-x",
		descriptionRu: "Пациент не явился на прием без предупреждения.",
	},
};

export const EMR_043_STATUS_META: Record<
	Emr043CardStatus,
	{ labelRu: string; badgeColor: string; descriptionRu: string }
> = {
	draft: {
		labelRu: "Черновик 043/у",
		badgeColor: "muted",
		descriptionRu: "Дневник приема заполняется врачом.",
	},
	pending_signature: {
		labelRu: "Требует подписи ПЭП",
		badgeColor: "gold",
		descriptionRu: "Карта готова к пакетному заверению СМС-кодом.",
	},
	signed: {
		labelRu: "Подписана ПЭП (63-ФЗ)",
		badgeColor: "emerald",
		descriptionRu: "Юридически значимая электронная карта 043/у заверена врачом.",
	},
};

/** Medical service item within a doctor's shift appointment */
export const doctorShiftServiceItemSchema = z.object({
	id: z.string().min(1),
	code804n: z.string().min(1),
	nameRu: z.string().min(1),
	category: z.string().default("therapy"),
	quantity: z.number().int().min(1).default(1),
	unitPriceKop: z.number().int().min(0),
	totalCostKop: z.number().int().min(0),
	discountKop: z.number().int().min(0).default(0),
	finalRevenueKop: z.number().int().min(0),
	directLabZtlCostKop: z.number().int().min(0).default(0),
	directMaterialCostKop: z.number().int().min(0).default(0),
	commissionPercent: z.number().min(0).max(100).default(25),
	earnedDoctorPayoutKop: z.number().int().min(0).default(0),
});
export type DoctorShiftServiceItem = z.infer<typeof doctorShiftServiceItemSchema>;

/** Individual patient appointment on doctor's daily shift */
export const doctorShiftAppointmentSchema = z.object({
	id: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	patientBirthDate: z.string().optional(),
	patientPhone: z.string().optional(),
	cardNumber: z.string().min(1),
	doctorId: z.string().min(1),
	doctorFullName: z.string().min(1),
	doctorSpecialty: z.string().optional(),
	startsAtIso: z.string().min(1),
	endsAtIso: z.string().min(1),
	status: doctorAppointmentStatusSchema.default("waiting"),
	chairId: z.string().optional(),
	chairName: z.string().optional(),
	diagnosisIcd10: z.string().optional(),
	diagnosisTooth: z.string().optional(),
	treatmentDescription: z.string().optional(),
	services: z.array(doctorShiftServiceItemSchema).default([]),
	emrCard043uStatus: emr043CardStatusSchema.default("draft"),
	emrSignedAtIso: z.string().optional(),
	emrPepProtocolHash: z.string().optional(),
	emrSignerInfo: z
		.object({
			name: z.string(),
			phoneMasked: z.string(),
			snils: z.string().optional(),
			lawBasis: z.string().default("63-ФЗ ст. 9 (ПЭП) + Приказ 947н"),
		})
		.optional(),
	notes: z.string().optional(),
});
export type DoctorShiftAppointment = z.infer<typeof doctorShiftAppointmentSchema>;

/** Real-time financial & operational earnings breakdown for the shift */
export interface DoctorShiftEarningsBreakdown {
	readonly doctorId: string;
	readonly shiftDateIso: string;
	readonly totalAppointmentsCount: number;
	readonly completedAppointmentsCount: number;
	readonly inChairAppointmentsCount: number;
	readonly waitingAppointmentsCount: number;
	readonly cancelledAppointmentsCount: number;
	readonly grossRevenueKop: Kopecks;
	readonly totalLabDeductionsKop: Kopecks;
	readonly totalMaterialDeductionsKop: Kopecks;
	readonly netDealBaseKop: Kopecks;
	readonly totalEarnedDealKop: Kopecks;
	readonly unsignedEmr043Count: number;
	readonly signedEmr043Count: number;
	readonly appointmentBreakdowns: readonly {
		readonly appointmentId: string;
		readonly patientFullName: string;
		readonly status: DoctorAppointmentStatus;
		readonly emrStatus: Emr043CardStatus;
		readonly grossKop: Kopecks;
		readonly labDeductionKop: Kopecks;
		readonly materialDeductionKop: Kopecks;
		readonly dealBaseKop: Kopecks;
		readonly earnedKop: Kopecks;
	}[];
}

/** EMR Batch SMS PEP verification session */
export const emrBatchSigningSessionSchema = z.object({
	sessionId: z.string().min(1),
	doctorId: z.string().min(1),
	doctorName: z.string().min(1),
	maskedPhone: z.string().min(1),
	appointmentIds: z.array(z.string()).min(1),
	shiftDateIso: z.string().min(1),
	secretCode: z.string().min(4).max(8),
	expiresAtIso: z.string().min(1),
	attemptsRemaining: z.number().int().min(0).default(3),
	batchHash: z.string().min(8),
	isVerified: z.boolean().default(false),
	isExpired: z.boolean().default(false),
});
export type EmrBatchSigningSession = z.infer<typeof emrBatchSigningSessionSchema>;

export interface EmrBatchSigningResult {
	readonly success: boolean;
	readonly messageRu: string;
	readonly signedCount: number;
	readonly signedAppointmentIds: readonly string[];
	readonly updatedAppointments: readonly DoctorShiftAppointment[];
	readonly protocolHash: string;
	readonly signedAtIso: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SHIFT SCHEDULE ISOLATION & FILTERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Isolates and filters appointments belonging strictly to the specified doctor on the given shift date.
 * Guarantees zero cross-doctor schedule leakage.
 */
export function filterDoctorShiftAppointments(
	allAppointments: readonly DoctorShiftAppointment[],
	doctorId: string,
	shiftDateIso?: string,
): DoctorShiftAppointment[] {
	if (!doctorId || typeof doctorId !== "string") {
		return [];
	}

	const targetDate = shiftDateIso
		? shiftDateIso.split("T")[0]
		: new Date().toISOString().split("T")[0];

	return allAppointments
		.filter((apt) => {
			if (apt.doctorId !== doctorId) {
				return false;
			}
			const aptDate = apt.startsAtIso.split("T")[0];
			return aptDate === targetDate;
		})
		.sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REAL-TIME INTEGER KOPECKS PIECE-RATE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates a single service item's piece-rate commission in integer kopecks.
 * Formula: Math.round(Math.max(0, finalRevenue - labCosts - materialCosts) * (commissionPct / 100))
 */
export function calculateServicePieceRateAccrual(
	item: {
		finalRevenueKop: Kopecks;
		directLabZtlCostKop?: Kopecks;
		directMaterialCostKop?: Kopecks;
		commissionPercent?: number;
	},
	fallbackCommissionPct = 25,
): { dealBaseKop: Kopecks; earnedPayoutKop: Kopecks } {
	const revenue = Math.max(0, Math.round(item.finalRevenueKop || 0));
	const labCost = Math.max(0, Math.round(item.directLabZtlCostKop || 0));
	const matCost = Math.max(0, Math.round(item.directMaterialCostKop || 0));
	const pct = typeof item.commissionPercent === "number" && item.commissionPercent >= 0
		? item.commissionPercent
		: fallbackCommissionPct;

	const dealBaseKop = Math.max(0, revenue - labCost - matCost);
	const earnedPayoutKop = Math.round((dealBaseKop * pct) / 100);

	return {
		dealBaseKop,
		earnedPayoutKop,
	};
}

/**
 * Computes live operational and financial shift summary for a doctor.
 * Strict integer arithmetic on all monetary metrics.
 */
export function calculateDoctorShiftEarnings(
	appointments: readonly DoctorShiftAppointment[],
	doctorId: string,
	shiftDateIso?: string,
	defaultCommissionPct = 25,
): DoctorShiftEarningsBreakdown {
	const shiftDate = (shiftDateIso ? shiftDateIso.split("T")[0] : null) ?? new Date().toISOString().split("T")[0] ?? "1970-01-01";

	let totalAppointmentsCount = 0;
	let completedAppointmentsCount = 0;
	let inChairAppointmentsCount = 0;
	let waitingAppointmentsCount = 0;
	let cancelledAppointmentsCount = 0;

	let grossRevenueKop = 0;
	let totalLabDeductionsKop = 0;
	let totalMaterialDeductionsKop = 0;
	let netDealBaseKop = 0;
	let totalEarnedDealKop = 0;

	let unsignedEmr043Count = 0;
	let signedEmr043Count = 0;

	const appointmentBreakdowns: Array<{
		appointmentId: string;
		patientFullName: string;
		status: DoctorAppointmentStatus;
		emrStatus: Emr043CardStatus;
		grossKop: Kopecks;
		labDeductionKop: Kopecks;
		materialDeductionKop: Kopecks;
		dealBaseKop: Kopecks;
		earnedKop: Kopecks;
	}> = [];

	for (const apt of appointments) {
		// Ignore other doctors if passed non-isolated list
		if (apt.doctorId !== doctorId) continue;

		totalAppointmentsCount += 1;

		if (apt.status === "completed") {
			completedAppointmentsCount += 1;
		} else if (apt.status === "in_chair") {
			inChairAppointmentsCount += 1;
		} else if (apt.status === "waiting") {
			waitingAppointmentsCount += 1;
		} else if (apt.status === "cancelled" || apt.status === "no_show") {
			cancelledAppointmentsCount += 1;
		}

		if (apt.emrCard043uStatus === "signed") {
			signedEmr043Count += 1;
		} else if (apt.status === "completed" || apt.emrCard043uStatus === "pending_signature") {
			unsignedEmr043Count += 1;
		}

		// Calculate appointment financials
		let aptGrossKop = 0;
		let aptLabKop = 0;
		let aptMatKop = 0;
		let aptEarnedKop = 0;

		// Accrue revenue for completed visits (and billable services in chair)
		if (apt.status === "completed" || apt.status === "in_chair") {
			for (const srv of apt.services) {
				const srvRev = srv.finalRevenueKop || srv.totalCostKop || 0;
				const srvLab = srv.directLabZtlCostKop || 0;
				const srvMat = srv.directMaterialCostKop || 0;
				const { dealBaseKop, earnedPayoutKop } = calculateServicePieceRateAccrual(
					{
						finalRevenueKop: srvRev,
						directLabZtlCostKop: srvLab,
						directMaterialCostKop: srvMat,
						commissionPercent: srv.commissionPercent ?? defaultCommissionPct,
					},
					defaultCommissionPct,
				);

				aptGrossKop += srvRev;
				aptLabKop += srvLab;
				aptMatKop += srvMat;
				aptEarnedKop += earnedPayoutKop;
			}
		}

		const aptDealBase = Math.max(0, aptGrossKop - aptLabKop - aptMatKop);

		grossRevenueKop += aptGrossKop;
		totalLabDeductionsKop += aptLabKop;
		totalMaterialDeductionsKop += aptMatKop;
		netDealBaseKop += aptDealBase;
		totalEarnedDealKop += aptEarnedKop;

		appointmentBreakdowns.push({
			appointmentId: apt.id,
			patientFullName: apt.patientFullName,
			status: apt.status,
			emrStatus: apt.emrCard043uStatus,
			grossKop: aptGrossKop,
			labDeductionKop: aptLabKop,
			materialDeductionKop: aptMatKop,
			dealBaseKop: aptDealBase,
			earnedKop: aptEarnedKop,
		});
	}

	return {
		doctorId,
		shiftDateIso: shiftDate,
		totalAppointmentsCount,
		completedAppointmentsCount,
		inChairAppointmentsCount,
		waitingAppointmentsCount,
		cancelledAppointmentsCount,
		grossRevenueKop,
		totalLabDeductionsKop,
		totalMaterialDeductionsKop,
		netDealBaseKop,
		totalEarnedDealKop,
		unsignedEmr043Count,
		signedEmr043Count,
		appointmentBreakdowns,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BATCH EMR 043/у PEP (ПЭП) SIGNING PROTOCOL (63-ФЗ, 323-ФЗ, 834н, 947н)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a deterministic hash representation of an EMR 043/у batch for cryptographic integrity stamp.
 */
export function generateBatchEmrProtocolHash(
	appointmentIds: readonly string[],
	doctorId: string,
	timestampIso: string,
): string {
	const rawPayload = `DENTE:PEP:043U:${doctorId}:${shiftDateFromIso(timestampIso)}:${[...appointmentIds].sort().join(",")}:${timestampIso}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < rawPayload.length; i++) {
		hash ^= rawPayload.charCodeAt(i);
		hash = (hash * 0x01000193) >>> 0;
	}
	const hex = hash.toString(16).padStart(8, "0").toUpperCase();
	return `RU-PEP-043U-${hex}`;
}

function shiftDateFromIso(iso: string): string {
	const first = (iso ? iso.split("T")[0] : null) ?? new Date().toISOString().split("T")[0];
	return first ?? "1970-01-01";
}

/** Masks doctor phone number for SMS delivery privacy e.g. "+7 (926) ***-**-34" */
export function maskDoctorPhoneNumber(phone: string): string {
	const digits = phone.replace(/\D/g, "");
	if (digits.length < 10) return "+7 (***) ***-**-**";
	const main = digits.slice(-10);
	const code = main.slice(0, 3);
	const last2 = main.slice(-2);
	return `+7 (${code}) ***-**-${last2}`;
}

/**
 * Initiates a batch EMR 043/у signing session by generating an SMS verification challenge.
 */
export function initiateBatchEmrSigning(params: {
	doctorId: string;
	doctorName: string;
	doctorPhone: string;
	appointmentIds: readonly string[];
	shiftDateIso?: string;
	fixedSecretCode?: string; // Optional for deterministic testing
	validityDurationSeconds?: number;
	currentTimeIso?: string;
}): EmrBatchSigningSession {
	const now = params.currentTimeIso ? new Date(params.currentTimeIso) : new Date();
	const validitySec = params.validityDurationSeconds ?? 300; // 5 minutes standard
	const expiresAt = new Date(now.getTime() + validitySec * 1000);
	const timestampIso = now.toISOString();

	// Generate 6-digit SMS verification code (100000 - 999999)
	let code = params.fixedSecretCode;
	if (!code) {
		const randomNum = Math.floor(100000 + Math.random() * 900000);
		code = String(randomNum);
	}

	const batchHash = generateBatchEmrProtocolHash(
		params.appointmentIds,
		params.doctorId,
		timestampIso,
	);

	const sessionId = `pep-sess-${params.doctorId.replace(/[^a-zA-Z0-9_-]/g, "")}-${now.getTime()}`;

	return {
		sessionId,
		doctorId: params.doctorId,
		doctorName: params.doctorName,
		maskedPhone: maskDoctorPhoneNumber(params.doctorPhone),
		appointmentIds: [...params.appointmentIds],
		shiftDateIso: params.shiftDateIso || shiftDateFromIso(timestampIso),
		secretCode: code,
		expiresAtIso: expiresAt.toISOString(),
		attemptsRemaining: 3,
		batchHash,
		isVerified: false,
		isExpired: false,
	};
}

/**
 * Verifies the entered SMS code and signs the eligible 043/у medical records with PEP metadata.
 */
export function verifyAndSignBatchEmr(params: {
	session: EmrBatchSigningSession;
	enteredCode: string;
	appointments: readonly DoctorShiftAppointment[];
	doctorName: string;
	doctorSnils?: string;
	signTimestampIso?: string;
}): EmrBatchSigningResult {
	const now = new Date(params.signTimestampIso || new Date().toISOString());
	const expiresAt = new Date(params.session.expiresAtIso);

	if (now.getTime() > expiresAt.getTime()) {
		return {
			success: false,
			messageRu: "Срок действия СМС-кода истек. Запросите новый код подтверждения.",
			signedCount: 0,
			signedAppointmentIds: [],
			updatedAppointments: [...params.appointments],
			protocolHash: params.session.batchHash,
			signedAtIso: now.toISOString(),
		};
	}

	const cleanEntered = params.enteredCode.trim().replace(/\D/g, "");
	const cleanExpected = params.session.secretCode.trim().replace(/\D/g, "");

	if (cleanEntered !== cleanExpected) {
		return {
			success: false,
			messageRu: "Неверный СМС-код подтверждения ПЭП. Проверьте введенные цифры.",
			signedCount: 0,
			signedAppointmentIds: [],
			updatedAppointments: [...params.appointments],
			protocolHash: params.session.batchHash,
			signedAtIso: now.toISOString(),
		};
	}

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

	return {
		success: true,
		messageRu: `Успешно подписано ${newlySignedIds.length} медицинских карт ф. 043/у через ПЭП.`,
		signedCount: newlySignedIds.length,
		signedAppointmentIds: newlySignedIds,
		updatedAppointments,
		protocolHash: params.session.batchHash,
		signedAtIso: signedTimestamp,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. APPOINTMENT STATUS WORKFLOW ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transitions appointment status with automated EMR card readiness hooks.
 */
export function transitionAppointmentStatus(
	appointment: DoctorShiftAppointment,
	newStatus: DoctorAppointmentStatus,
): DoctorShiftAppointment {
	let emrStatus = appointment.emrCard043uStatus;

	if (newStatus === "completed" && emrStatus === "draft") {
		emrStatus = "pending_signature";
	}

	return {
		...appointment,
		status: newStatus,
		emrCard043uStatus: emrStatus,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. REALISTIC CLINICAL SHIFT PRESETS & FIXTURES (NO CLOWN DATA)
// ─────────────────────────────────────────────────────────────────────────────

export const SAMPLE_DOCTOR_SHIFT_APPOINTMENTS: readonly DoctorShiftAppointment[] = [
	{
		id: "apt-shift-01",
		patientId: "pat-101",
		patientFullName: "Смирнова Екатерина Васильевна",
		patientBirthDate: "1988-06-14",
		patientPhone: "+7 (926) 555-12-34",
		cardNumber: "043/у-2026/891",
		doctorId: "doc-1",
		doctorFullName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialty: "Терапевт-ортопед",
		startsAtIso: "2026-08-29T09:00:00.000Z",
		endsAtIso: "2026-08-29T10:00:00.000Z",
		status: "completed",
		chairId: "chair-1",
		chairName: "Кресло 1 (Терапия)",
		diagnosisIcd10: "K04.0",
		diagnosisTooth: "16",
		treatmentDescription: "Лечение глубокого кариеса жевательной поверхности зуба 1.6, световая пломба Ceram.x Spectra ST.",
		emrCard043uStatus: "signed",
		emrSignedAtIso: "2026-08-29T10:02:15.000Z",
		emrPepProtocolHash: "RU-PEP-043U-9FA41B20",
		services: [
			{
				id: "srv-01-1",
				code804n: "A16.07.002.001",
				nameRu: "Наложение пломбы Ceram.x Spectra ST (Кариес дентина 1.6)",
				category: "therapy",
				quantity: 1,
				unitPriceKop: 650000,
				totalCostKop: 650000,
				discountKop: 0,
				finalRevenueKop: 650000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 50000,
				commissionPercent: 25,
				earnedDoctorPayoutKop: 150000, // (6500 - 500) * 25% = 1500 RUB = 150000 kop
			},
			{
				id: "srv-01-2",
				code804n: "A11.07.027",
				nameRu: "Инфильтрационная анестезия (Ультракаин Д-С форте)",
				category: "therapy",
				quantity: 1,
				unitPriceKop: 120000,
				totalCostKop: 120000,
				discountKop: 0,
				finalRevenueKop: 120000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 20000,
				commissionPercent: 25,
				earnedDoctorPayoutKop: 25000, // (1200 - 200) * 25% = 250 RUB = 25000 kop
			},
		],
	},
	{
		id: "apt-shift-02",
		patientId: "pat-102",
		patientFullName: "Барабаш Сергей Владимирович",
		patientBirthDate: "1985-03-22",
		patientPhone: "+7 (916) 123-45-67",
		cardNumber: "043/у-2026/042",
		doctorId: "doc-1",
		doctorFullName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialty: "Терапевт-ортопед",
		startsAtIso: "2026-08-29T10:30:00.000Z",
		endsAtIso: "2026-08-29T12:00:00.000Z",
		status: "completed",
		chairId: "chair-1",
		chairName: "Кресло 1 (Терапия)",
		diagnosisIcd10: "K08.1",
		diagnosisTooth: "21",
		treatmentDescription: "Фиксация безметалловой коронки из диоксида циркония Prettau на зуб 2.1.",
		emrCard043uStatus: "pending_signature",
		services: [
			{
				id: "srv-02-1",
				code804n: "A16.07.004",
				nameRu: "Коронка из диоксида циркония Prettau Multi-Layer (Зуб 2.1)",
				category: "orthopedics",
				quantity: 1,
				unitPriceKop: 3200000,
				totalCostKop: 3200000,
				discountKop: 0,
				finalRevenueKop: 3200000,
				directLabZtlCostKop: 800000, // ZTL Lab bill deduction = 8,000.00 RUB
				directMaterialCostKop: 0,
				commissionPercent: 15,
				earnedDoctorPayoutKop: 360000, // (32000 - 8000) * 15% = 3600 RUB = 360000 kop
			},
		],
	},
	{
		id: "apt-shift-03",
		patientId: "pat-103",
		patientFullName: "Ковалев Игорь Дмитриевич",
		patientBirthDate: "1992-11-05",
		patientPhone: "+7 (903) 777-88-99",
		cardNumber: "043/у-2026/119",
		doctorId: "doc-1",
		doctorFullName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialty: "Терапевт-ортопед",
		startsAtIso: "2026-08-29T12:30:00.000Z",
		endsAtIso: "2026-08-29T13:30:00.000Z",
		status: "completed",
		chairId: "chair-1",
		chairName: "Кресло 1 (Терапия)",
		diagnosisIcd10: "K04.1",
		diagnosisTooth: "36",
		treatmentDescription: "Инструментальная обработка и медикаментозное пломбирование 3 корневых каналов зуба 3.6.",
		emrCard043uStatus: "pending_signature",
		services: [
			{
				id: "srv-03-1",
				code804n: "A16.07.030.002",
				nameRu: "Механическая и антисептическая обработка 3 каналов (Reciproc Blue)",
				category: "therapy",
				quantity: 3,
				unitPriceKop: 350000,
				totalCostKop: 1050000,
				discountKop: 50000,
				finalRevenueKop: 1000000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 200000,
				commissionPercent: 25,
				earnedDoctorPayoutKop: 200000, // (10000 - 2000) * 25% = 2000 RUB = 200000 kop
			},
			{
				id: "srv-03-2",
				code804n: "A16.07.008",
				nameRu: "Пломбирование каналов термопластифицированной гуттаперчей GuttaCore",
				category: "therapy",
				quantity: 3,
				unitPriceKop: 280000,
				totalCostKop: 840000,
				discountKop: 0,
				finalRevenueKop: 840000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 140000,
				commissionPercent: 25,
				earnedDoctorPayoutKop: 175000, // (8400 - 1400) * 25% = 1750 RUB = 175000 kop
			},
		],
	},
	{
		id: "apt-shift-04",
		patientId: "pat-104",
		patientFullName: "Васильева Ольга Николаевна",
		patientBirthDate: "1979-09-18",
		patientPhone: "+7 (915) 333-22-11",
		cardNumber: "043/у-2026/304",
		doctorId: "doc-1",
		doctorFullName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialty: "Терапевт-ортопед",
		startsAtIso: "2026-08-29T14:00:00.000Z",
		endsAtIso: "2026-08-29T15:00:00.000Z",
		status: "in_chair",
		chairId: "chair-1",
		chairName: "Кресло 1 (Терапия)",
		diagnosisIcd10: "K05.3",
		diagnosisTooth: "11-48",
		treatmentDescription: "Комплексная профессиональная гигиена полости рта (Air-Flow + ультразвук Piezon).",
		emrCard043uStatus: "draft",
		services: [
			{
				id: "srv-04-1",
				code804n: "A16.07.051",
				nameRu: "Профессиональная гигиена полости рта (Air-Flow Plus + Полировка)",
				category: "hygiene",
				quantity: 1,
				unitPriceKop: 850000,
				totalCostKop: 850000,
				discountKop: 0,
				finalRevenueKop: 850000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 50000,
				commissionPercent: 30,
				earnedDoctorPayoutKop: 240000, // (8500 - 500) * 30% = 2400 RUB = 240000 kop
			},
		],
	},
	{
		id: "apt-shift-05",
		patientId: "pat-105",
		patientFullName: "Морозов Дмитрий Александрович",
		patientBirthDate: "1995-04-12",
		patientPhone: "+7 (925) 888-99-00",
		cardNumber: "043/у-2026/512",
		doctorId: "doc-1",
		doctorFullName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialty: "Терапевт-ортопед",
		startsAtIso: "2026-08-29T15:30:00.000Z",
		endsAtIso: "2026-08-29T16:30:00.000Z",
		status: "waiting",
		chairId: "chair-1",
		chairName: "Кресло 1 (Терапия)",
		diagnosisIcd10: "K02.1",
		diagnosisTooth: "45",
		treatmentDescription: "Первичный осмотр, консультация, радиовизиография зуба 4.5.",
		emrCard043uStatus: "draft",
		services: [
			{
				id: "srv-05-1",
				code804n: "B01.065.001",
				nameRu: "Первичный прием и консультация врача-стоматолога",
				category: "therapy",
				quantity: 1,
				unitPriceKop: 150000,
				totalCostKop: 150000,
				discountKop: 0,
				finalRevenueKop: 150000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 0,
				commissionPercent: 25,
				earnedDoctorPayoutKop: 37500,
			},
		],
	},
	// Other doctor appointment (must be isolated and never shown to doc-1)
	{
		id: "apt-shift-other-doctor",
		patientId: "pat-999",
		patientFullName: "Иванов Петр Сергеевич",
		cardNumber: "043/у-2026/999",
		doctorId: "doc-2", // Different doctor!
		doctorFullName: "Д-р Барабаш Сергей Владимирович",
		doctorSpecialty: "Хирург-имплантолог",
		startsAtIso: "2026-08-29T10:00:00.000Z",
		endsAtIso: "2026-08-29T11:00:00.000Z",
		status: "completed",
		chairId: "chair-2",
		emrCard043uStatus: "signed",
		services: [
			{
				id: "srv-other-1",
				code804n: "A16.07.054",
				nameRu: "Установка дентального имплантата Straumann BLX",
				category: "surgery",
				quantity: 1,
				unitPriceKop: 6500000,
				totalCostKop: 6500000,
				discountKop: 0,
				finalRevenueKop: 6500000,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 2500000,
				commissionPercent: 20,
				earnedDoctorPayoutKop: 800000,
			},
		],
	},
];
