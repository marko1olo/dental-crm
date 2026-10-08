/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Shift Queue & Workspace Orchestration (Layer 2)
 *
 * Master orchestration engine for Doctor Shift Cockpit:
 * - Current Patient (in-chair) + Timer + EMR 043 completeness + Financial balance.
 * - Next Patient (waiting in hall or upcoming).
 * - Chronological queue of waiting, upcoming and completed visits.
 * - Unclosed Outpatient Records (043/у) list with statutory deadlines (Order 947n).
 * - Real-time operational shift metrics, break and sterilization tracking.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Kopecks } from "../../utils/money.js";
import { generateDoctorShiftNumber } from "../../utils/idGenerators.js";
import {
	type DoctorShiftAppointment,
	type DoctorShiftServiceItem,
	type DoctorShiftBreakInterval,
	doctorAppointmentStatusSchema,
	emr043CardStatusSchema,
} from "../../doctor-portal/doctorShiftEngine.js";

import {
	calculateAppointmentTimer,
	type AppointmentTimerResult,
} from "./timer.js";
import {
	evaluateEmr043Completeness,
	type Emr043CompletenessResult,
} from "./emrCompleteness.js";
import {
	calculatePatientShiftBalance,
	type PatientFinancialBalance,
} from "./patientBalance.js";
import {
	filterActivePagerEvents,
	type AssistantPagerEvent,
} from "./pager.js";

export type { DoctorShiftServiceItem };

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
	readonly shiftNumber: string;
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
		readonly actualWorkMinutes: number;
		readonly totalSterilizationMinutes: number;
		readonly totalBreakMinutes: number;
		readonly chairUtilizationPercent: number;
	};
}

export interface CalculateDoctorShiftQueueParams {
	readonly appointments: readonly DoctorShiftAppointment[];
	readonly doctorId: string;
	readonly shiftDateIso?: string;
	readonly currentTimeIso?: string;
	readonly patientBalances?: Record<string, { depositBalanceKop: Kopecks; familyWalletBalanceKop?: Kopecks }>;
	readonly pagerEvents?: readonly AssistantPagerEvent[];
	readonly statutoryEmrDeadlineHours?: number; // Standard: 24h per Order 947n
	readonly breaks?: readonly DoctorShiftBreakInterval[];
	readonly defaultSterilizationMinutesPerVisit?: number; // Standard: 10 min per SanPiN 3.3686-21
	readonly plannedShiftHours?: number; // Standard: 6.0 hours
	readonly customShiftNumber?: string;
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

	// 9. Honest Clinical Time, Breaks & Sterilization Tracking (Mandate 8e, SanPiN 3.3686-21)
	let actualWorkMinutes = 0;
	for (const apt of doctorAppointments) {
		const startMs = new Date(apt.startsAtIso).getTime();
		const endMs = new Date(apt.endsAtIso).getTime();
		const slotDuration = Math.max(0, Math.round((endMs - startMs) / 60000));

		if (apt.status === "completed") {
			if (typeof apt.actualDurationMinutes === "number" && apt.actualDurationMinutes > 0) {
				actualWorkMinutes += apt.actualDurationMinutes;
			} else if (apt.actualStartsAtIso && apt.actualEndsAtIso) {
				const aStart = new Date(apt.actualStartsAtIso).getTime();
				const aEnd = new Date(apt.actualEndsAtIso).getTime();
				actualWorkMinutes += Math.max(1, Math.round((aEnd - aStart) / 60000));
			} else {
				actualWorkMinutes += slotDuration;
			}
		} else if (apt.status === "in_chair") {
			if (currentPatient) {
				actualWorkMinutes += currentPatient.timer.elapsedMinutes;
			} else if (apt.actualStartsAtIso) {
				const aStart = new Date(apt.actualStartsAtIso).getTime();
				const nowMs = new Date(currentIso).getTime();
				actualWorkMinutes += Math.max(1, Math.round((nowMs - aStart) / 60000));
			} else {
				actualWorkMinutes += Math.round(slotDuration / 2);
			}
		}
	}

	const explicitBreaks = params.breaks ?? [];
	let totalBreakMinutes = 0;
	let explicitSterilizationMins = 0;
	for (const brk of explicitBreaks) {
		if (brk.type === "cabinet_sterilization" || brk.type === "airing_sanpin") {
			explicitSterilizationMins += brk.durationMinutes;
		} else {
			totalBreakMinutes += brk.durationMinutes;
		}
	}

	const totalSterilizationMinutes = explicitSterilizationMins > 0
		? explicitSterilizationMins
		: completedList.length * (params.defaultSterilizationMinutesPerVisit ?? 10);

	const plannedShiftHours = params.plannedShiftHours ?? 6.0;
	const plannedShiftMinutes = Math.round(plannedShiftHours * 60);
	const chairUtilizationPercent = plannedShiftMinutes > 0
		? Math.min(100, Math.round((actualWorkMinutes / plannedShiftMinutes) * 100))
		: 0;

	const shiftNumber = generateDoctorShiftNumber(targetDate, {
		seedKey: params.doctorId,
		customShiftNumber: params.customShiftNumber,
	});

	return {
		shiftNumber,
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
			actualWorkMinutes,
			totalSterilizationMinutes,
			totalBreakMinutes,
			chairUtilizationPercent,
		},
	};
}

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
