/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Shift Operations & Mobile PWA (Layer 0: Types)
 *
 * Strict domain types, Zod contracts, status dictionaries and realistic fixtures.
 * Zero runtime business logic dependencies.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Kopecks } from "../../utils/money.js";

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
	commissionPercent: z.number().min(0).max(100).optional(),
	earnedDoctorPayoutKop: z.number().int().min(0).optional(),
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
	actualStartsAtIso: z.string().optional(),
	actualEndsAtIso: z.string().optional(),
	actualDurationMinutes: z.number().int().min(0).optional(),
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

export const doctorShiftBreakTypeSchema = z.enum([
	"doctor_meal",
	"doctor_rest",
	"cabinet_sterilization",
	"airing_sanpin",
	"technical",
]);
export type DoctorShiftBreakType = z.infer<typeof doctorShiftBreakTypeSchema>;

export const doctorShiftBreakIntervalSchema = z.object({
	id: z.string().min(1),
	type: doctorShiftBreakTypeSchema,
	nameRu: z.string().min(1),
	startsAtIso: z.string().min(1),
	endsAtIso: z.string().min(1),
	durationMinutes: z.number().int().min(0),
	notes: z.string().optional(),
});
export type DoctorShiftBreakInterval = z.infer<typeof doctorShiftBreakIntervalSchema>;

export const doctorShiftRecordSchema = z.object({
	id: z.string().min(1),
	shiftNumber: z.string().min(1),
	doctorId: z.string().min(1),
	doctorFullName: z.string().min(1),
	doctorSpecialty: z.string().optional(),
	shiftDateIso: z.string().min(1),
	plannedStartsAtIso: z.string().min(1),
	plannedEndsAtIso: z.string().min(1),
	actualStartsAtIso: z.string().optional(),
	actualEndsAtIso: z.string().optional(),
	status: z.enum(["planned", "in_progress", "completed", "closed"]).default("planned"),
	chairId: z.string().optional(),
	chairName: z.string().optional(),
	cabinetNumber: z.string().optional(),
	breaks: z.array(doctorShiftBreakIntervalSchema).default([]),
	notes: z.string().optional(),
});
export type DoctorShiftRecord = z.infer<typeof doctorShiftRecordSchema>;

/** Real-time financial & operational earnings breakdown for the shift */
export interface DoctorShiftEarningsBreakdown {
	readonly doctorId: string;
	readonly shiftDateIso: string;
	readonly shiftNumber?: string;
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
	readonly actualWorkMinutes?: number;
	readonly totalSterilizationMinutes?: number;
	readonly totalBreakMinutes?: number;
	readonly chairUtilizationPercent?: number;
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

export const DEFAULT_CATEGORY_COMMISSION_PERCENT: Record<string, number> = {
	therapy: 25,
	orthopedics: 25,
	surgery: 20,
	orthodontics: 25,
	hygiene: 30,
	retail_hygiene: 10,
	pediatric: 25,
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXTENDED COLLISION & SCHEDULE VALIDATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ShiftTimeInterval {
	readonly startsAtIso: string;
	readonly endsAtIso: string;
}

export interface ChairShiftConflict {
	readonly chairId: string;
	readonly chairName?: string;
	readonly dateIso: string;
	readonly overlappingShifts: readonly {
		readonly shiftId: string;
		readonly doctorId: string;
		readonly doctorFullName: string;
		readonly startsAtIso: string;
		readonly endsAtIso: string;
	}[];
	readonly overlapMinutes: number;
}

export interface DoctorShiftCollision {
	readonly doctorId: string;
	readonly doctorFullName: string;
	readonly dateIso: string;
	readonly conflictingShifts: readonly {
		readonly shiftId: string;
		readonly startsAtIso: string;
		readonly endsAtIso: string;
		readonly chairId?: string;
	}[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REALISTIC CLINICAL SHIFT PRESETS & FIXTURES (NO CLOWN DATA)
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
