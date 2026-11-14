import type { Appointment, Patient, PatientInsight } from "@dental/shared";
import { money } from "../../../utils/financeUtils";

export type ReliabilityCategory = "reliable" | "attention" | "risk" | "new";
export type ReliabilityStatus = "reliable" | "new" | "high_risk" | "attention" | "debt";

export interface PatientReliabilityBadge {
	readonly category: ReliabilityCategory;
	readonly status: ReliabilityStatus;
	readonly badgeText: string;
	readonly shortLabel: string;
	readonly emoji: string;
	readonly recommendation: string;
	readonly summary: string;
	readonly badgeClass: string;
	readonly requiresTwoHourConfirmation: boolean;
}

export interface PatientFinancialBadge {
	readonly balanceRub: number;
	readonly status: "debt" | "deposit" | "settled";
	readonly label: string;
	readonly shortLabel: string;
	readonly formattedAmount: string;
	readonly badgeClass: string;
	readonly isDebt: boolean;
	readonly isDeposit: boolean;
}

export interface PatientVisitHistoryStats {
	readonly totalAppointments: number;
	readonly completedCount: number;
	readonly noShowCount: number;
	readonly cancelledCount: number;
	readonly lateCount: number;
	readonly consecutiveNoShows: number;
	readonly maxConsecutiveNoShows: number;
	readonly onTimeRatePercent: number;
	readonly attendanceRatePercent: number;
}

export interface ClassifierParams {
	totalFinished: number;
	completedCount: number;
	noShowCount: number;
	consecutiveNoShows: number;
	maxConsecutiveNoShows: number;
	lateCount: number;
	cancelledCount: number;
	attendanceRatePercent: number;
	onTimeRatePercent: number;
	isInsightHighRisk: boolean;
}

export interface PatientReliabilityAssessment {
	readonly patientId: string;
	readonly score: number; // 0..100
	readonly category: ReliabilityCategory;
	readonly stats: PatientVisitHistoryStats;
	readonly reliabilityBadge: PatientReliabilityBadge;
	readonly financialBadge: PatientFinancialBadge;
	readonly flags: readonly string[];
	readonly receptionistAlert?: string | undefined;
}

export interface ReliabilityCalculationOptions {
	readonly referenceTimeIso?: string | undefined;
	readonly latenessThresholdMinutes?: number | undefined;
	readonly overrideInsight?: PatientInsight | null | undefined;
}

export interface DurationPreset {
	readonly minutes: number;
	readonly label: string;
	readonly serviceHint: string;
}

export const DURATION_PRESETS: readonly DurationPreset[] = [
	{ minutes: 15, label: "15 мин", serviceHint: "Осмотр" },
	{ minutes: 30, label: "30 мин", serviceHint: "Терапия" },
	{ minutes: 45, label: "45 мин", serviceHint: "Терапия" },
	{ minutes: 60, label: "60 мин", serviceHint: "Эндо/Коронка" },
	{ minutes: 90, label: "90 мин", serviceHint: "Хирургия/Имплантация" },
	{ minutes: 120, label: "120 мин", serviceHint: "Ортопедия" },
];

export type QuickBookingAppointmentType = "primary" | "secondary" | "emergency";

export interface AppointmentTypePreset {
	readonly type: QuickBookingAppointmentType;
	readonly label: string;
	readonly description: string;
	readonly defaultReason: string;
	readonly defaultDurationMinutes: number;
	readonly defaultStatus: Appointment["status"];
	readonly isEmergency: boolean;
}

export const APPOINTMENT_TYPE_PRESETS: readonly AppointmentTypePreset[] = [
	{
		type: "primary",
		label: "Первичный",
		description: "Осмотр и консультация",
		defaultReason: "Первичный осмотр",
		defaultDurationMinutes: 30,
		defaultStatus: "planned",
		isEmergency: false,
	},
	{
		type: "secondary",
		label: "Повторный",
		description: "Лечение по плану",
		defaultReason: "Повторный прием (Лечение)",
		defaultDurationMinutes: 60,
		defaultStatus: "planned",
		isEmergency: false,
	},
	{
		type: "emergency",
		label: "Острая боль",
		description: "Срочный приём (CITO)",
		defaultReason: "Срочно! Острая боль",
		defaultDurationMinutes: 30,
		defaultStatus: "confirmed",
		isEmergency: true,
	},
];

/**
 * Formats financial status (debt, deposit, zero balance) for quick receptionist badge.
 */
export function formatPatientBalanceBadge(
	rawBalance: number | string | null | undefined,
): PatientFinancialBadge {
	const parsed =
		typeof rawBalance === "string"
			? rawBalance.trim() === ""
				? 0
				: Number(rawBalance)
			: typeof rawBalance === "number"
				? rawBalance
				: 0;

	const balanceRub = Number.isFinite(parsed) ? parsed : 0;
	const formatted = money(balanceRub);
	const absAmount = Math.abs(balanceRub);
	const absFormatted = money(absAmount);

	if (balanceRub < 0) {
		return {
			balanceRub,
			status: "debt",
			label: `Долг: ${absFormatted}`,
			shortLabel: `-${absFormatted}`,
			formattedAmount: absFormatted,
			badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40",
			isDebt: true,
			isDeposit: false,
		};
	}

	if (balanceRub > 0) {
		return {
			balanceRub,
			status: "deposit",
			label: `Депозит: ${formatted}`,
			shortLabel: `+${formatted}`,
			formattedAmount: formatted,
			badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40",
			isDebt: false,
			isDeposit: true,
		};
	}

	return {
		balanceRub: 0,
		status: "settled",
		label: "Баланс: 0 ₽",
		shortLabel: "0 ₽",
		formattedAmount: "0 ₽",
		badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
		isDebt: false,
		isDeposit: false,
	};
}

export interface ClassifierResult {
	category: ReliabilityCategory;
	status: ReliabilityStatus;
	score: number;
	badge: PatientReliabilityBadge;
	receptionistAlert?: string | undefined;
}

export function classifyReliability(params: ClassifierParams): ClassifierResult {
	const {
		totalFinished,
		completedCount,
		noShowCount,
		consecutiveNoShows,
		maxConsecutiveNoShows,
		lateCount,
		cancelledCount,
		attendanceRatePercent,
		onTimeRatePercent,
		isInsightHighRisk,
	} = params;

	// 1. Первичный / новый пациент (0 завершённых визитов)
	if (totalFinished === 0) {
		const badge: PatientReliabilityBadge = {
			category: "new",
			status: "new",
			badgeText: "Новый пациент (история визитов формируется)",
			shortLabel: "Новый",
			emoji: "new",
			recommendation: "Первичный прием: запросить паспорт и оформить согласие на лечение.",
			summary: "История визитов формируется",
			badgeClass: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/40",
			requiresTwoHourConfirmation: false,
		};
		return {
			category: "new",
			status: "new",
			score: 0,
			badge,
			receptionistAlert: "Первичный визит. Оформить договор и согласие на лечение (или распечатать бланк со строками _______).",
		};
	}

	// 2. Риск неявки (2+ неявки подряд или 3+ неявки суммарно)
	if (
		consecutiveNoShows >= 2 ||
		noShowCount >= 3 ||
		(maxConsecutiveNoShows >= 2 && attendanceRatePercent < 60) ||
		(isInsightHighRisk && noShowCount >= 2)
	) {
		const summary =
			consecutiveNoShows >= 2
				? `${consecutiveNoShows} неявки подряд.`
				: `${noShowCount} неявок из ${totalFinished} визитов.`;
		const badge: PatientReliabilityBadge = {
			category: "risk",
			status: "high_risk",
			badgeText: "Риск неявки",
			shortLabel: "Риск неявки",
			emoji: "high_risk",
			recommendation: "Рекомендуется контрольный звонок накануне (запись без блокировок)",
			summary,
			badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40",
			requiresTwoHourConfirmation: false,
		};
		return {
			category: "risk",
			status: "high_risk",
			score: Math.max(0, 100 - noShowCount * 25),
			badge,
			receptionistAlert: `[Внимание] У пациента в истории ${
				consecutiveNoShows >= 2 ? `${consecutiveNoShows} неявки подряд` : `${noShowCount} неявок`
			}. Запись не блокируется.`,
		};
	}

	// 3. Зона внимания (единичные пропуски, опоздания или отмены)
	if (
		noShowCount >= 1 ||
		lateCount >= 2 ||
		(lateCount === 1 && noShowCount === 1) ||
		attendanceRatePercent < 90 ||
		onTimeRatePercent < 90 ||
		cancelledCount >= 3
	) {
		const reasonParts: string[] = [];
		if (noShowCount > 0) reasonParts.push(`${noShowCount} пропуск(а)`);
		if (lateCount > 0) reasonParts.push(`${lateCount} опоздани(е/й) >15м`);
		if (cancelledCount >= 2) reasonParts.push(`${cancelledCount} отмен`);
		const summary = reasonParts.join(", ") || `${onTimeRatePercent}% визитов вовремя`;
		const badge: PatientReliabilityBadge = {
			category: "attention",
			status: "attention",
			badgeText: "Зона внимания",
			shortLabel: "Внимание",
			emoji: "attention",
			recommendation: "Рекомендуется контрольный звонок накануне визита",
			summary,
			badgeClass: "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40",
			requiresTwoHourConfirmation: false,
		};
		return {
			category: "attention",
			status: "attention",
			score: 75,
			badge,
			receptionistAlert: `Рекомендуется контрольный звонок накануне: ${summary}.`,
		};
	}

	// 4. Постоянный надёжный пациент
	const badge: PatientReliabilityBadge = {
		category: "reliable",
		status: "reliable",
		badgeText: "Надежный пациент",
		shortLabel: "Надежный",
		emoji: "reliable",
		recommendation: "Высокая дисциплина визитов. Стандартная запись.",
		summary: `${onTimeRatePercent}% визитов вовремя (${completedCount}/${totalFinished}), 0 срывов`,
		badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40",
		requiresTwoHourConfirmation: false,
	};
	return { category: "reliable", status: "reliable", score: 100, badge };
}

export function calculateAppointmentLatenessMinutes(
	appt: Appointment | Record<string, unknown> | null | undefined,
): number | null {
	if (!appt || typeof appt !== "object") return null;
	const record = appt as Record<string, unknown>;
	const rawActual = record.actualStartTime ?? record.actualStartsAt;
	const rawPlanned = record.startTime ?? (record as { startsAt?: unknown }).startsAt;
	if (!rawActual || !rawPlanned) return null;

	const actualMs = typeof rawActual === "number" ? rawActual : Date.parse(String(rawActual));
	const plannedMs = typeof rawPlanned === "number" ? rawPlanned : Date.parse(String(rawPlanned));
	if (Number.isNaN(actualMs) || Number.isNaN(plannedMs)) return null;

	const diffMinutes = Math.round((actualMs - plannedMs) / 60_000);
	return diffMinutes > 0 ? diffMinutes : 0;
}

export function isAppointmentFinalizedOrPast(
	appointment: Appointment,
	referenceTimeMs: number,
): boolean {
	const status = appointment.status;
	if (status === "completed" || status === "no_show" || status === "arrived" || status === "in_treatment") {
		return true;
	}
	if (status === "cancelled") return true;

	if (appointment.startsAt) {
		const startMs = Date.parse(appointment.startsAt);
		if (!Number.isNaN(startMs) && startMs < referenceTimeMs) return true;
	}
	return false;
}

export function isUnexcusedNoShow(appt: Appointment): boolean {
	return appt.status === "no_show";
}

/**
 * Computes the streak of consecutive trailing no-shows and the max historical streak.
 */
export function calculateConsecutiveNoShows(
	appointments: readonly Appointment[],
	patientId: string,
	referenceTimeIso?: string,
): { currentStreak: number; maxStreak: number } {
	const refMs = referenceTimeIso ? Date.parse(referenceTimeIso) : Date.now();

	const relevant = appointments
		.filter((a) => a.patientId === patientId && isAppointmentFinalizedOrPast(a, refMs))
		.sort((a, b) => {
			const timeA = a.startsAt ? Date.parse(a.startsAt) : 0;
			const timeB = b.startsAt ? Date.parse(b.startsAt) : 0;
			return timeA - timeB;
		});

	if (relevant.length === 0) return { currentStreak: 0, maxStreak: 0 };

	let currentStreak = 0;
	for (let i = relevant.length - 1; i >= 0; i--) {
		const appt = relevant[i];
		if (!appt) continue;
		if (isUnexcusedNoShow(appt)) {
			currentStreak++;
		} else if (appt.status === "completed" || appt.status === "arrived" || appt.status === "in_treatment") {
			break;
		}
	}

	let maxStreak = 0;
	let tempStreak = 0;
	for (const appt of relevant) {
		if (isUnexcusedNoShow(appt)) {
			tempStreak++;
			if (tempStreak > maxStreak) maxStreak = tempStreak;
		} else if (appt.status === "completed" || appt.status === "arrived" || appt.status === "in_treatment") {
			tempStreak = 0;
		}
	}

	return { currentStreak, maxStreak };
}

/**
 * Checks if the patient has a streak of consecutive unexcused no-shows meeting or exceeding threshold.
 */
export function hasConsecutiveNoShows(
	appointments: readonly Appointment[],
	patientId: string,
	threshold: number = 2,
	referenceTimeIso?: string,
): boolean {
	const { currentStreak, maxStreak } = calculateConsecutiveNoShows(appointments, patientId, referenceTimeIso);
	return currentStreak >= threshold || maxStreak >= threshold;
}

export function computePatientVisitStats(
	patientId: string,
	appointments: readonly Appointment[],
	options?: ReliabilityCalculationOptions,
): PatientVisitHistoryStats {
	const refMs = options?.referenceTimeIso ? Date.parse(options.referenceTimeIso) : Date.now();
	const latenessThreshold = options?.latenessThresholdMinutes ?? 15;
	const patientAppts = patientId
		? appointments.filter((a) => a.patientId === patientId && isAppointmentFinalizedOrPast(a, refMs))
		: [];

	const sortedAppts = [...patientAppts].sort((a, b) => {
		const timeA = a.startsAt ? Date.parse(a.startsAt) : 0;
		const timeB = b.startsAt ? Date.parse(b.startsAt) : 0;
		return timeA - timeB;
	});

	let completedCount = 0;
	let noShowCount = 0;
	let cancelledCount = 0;
	let lateCount = 0;

	for (const appt of sortedAppts) {
		const st = appt.status;
		if (st === "completed" || st === "arrived" || st === "in_treatment") {
			completedCount++;
			const latenessMin = calculateAppointmentLatenessMinutes(appt);
			if (latenessMin !== null && latenessMin >= latenessThreshold) {
				lateCount++;
			}
		} else if (isUnexcusedNoShow(appt)) {
			noShowCount++;
		} else if (st === "cancelled") {
			cancelledCount++;
		}
	}

	const totalAppointments = sortedAppts.length;
	const totalFinished = completedCount + noShowCount + cancelledCount;
	const { currentStreak: consecutiveNoShows, maxStreak: maxConsecutiveNoShows } = patientId
		? calculateConsecutiveNoShows(appointments, patientId, options?.referenceTimeIso)
		: { currentStreak: 0, maxStreak: 0 };

	const attendanceRatePercent = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 100;
	const onTimeCount = Math.max(0, completedCount - lateCount);
	const onTimeRatePercent = totalFinished > 0 ? Math.round((onTimeCount / totalFinished) * 100) : 100;

	return {
		totalAppointments,
		completedCount,
		noShowCount,
		cancelledCount,
		lateCount,
		consecutiveNoShows,
		maxConsecutiveNoShows,
		onTimeRatePercent,
		attendanceRatePercent,
	};
}

export function calculatePatientReliability(
	patient: Patient | null | undefined,
	appointments?: readonly Appointment[] | null | undefined,
	options?: ReliabilityCalculationOptions,
): PatientReliabilityAssessment {
	const patientId = patient?.id || "";
	const allAppts = appointments ?? [];
	const stats = computePatientVisitStats(patientId, allAppts, options);
	const financialBadge = formatPatientBalanceBadge(patient?.balanceRub);

	const isInsightHighRisk = options?.overrideInsight?.riskLevel === "high";

	const { category, status, score, badge, receptionistAlert: baseAlert } =
		classifyReliability({
			totalFinished: stats.totalAppointments,
			completedCount: stats.completedCount,
			noShowCount: stats.noShowCount,
			consecutiveNoShows: stats.consecutiveNoShows,
			maxConsecutiveNoShows: stats.maxConsecutiveNoShows,
			lateCount: stats.lateCount,
			cancelledCount: stats.cancelledCount,
			attendanceRatePercent: stats.attendanceRatePercent,
			onTimeRatePercent: stats.onTimeRatePercent,
			isInsightHighRisk,
		});

	const flags: string[] = [];
	if (stats.consecutiveNoShows >= 2) {
		flags.push(`${stats.consecutiveNoShows} неявки подряд`);
	} else if (stats.noShowCount > 0) {
		flags.push(`${stats.noShowCount} неявка(и) без предупреждения`);
	}
	if (stats.lateCount > 0) {
		flags.push(`Опоздания >15 мин: ${stats.lateCount} раз(а)`);
	}
	if (stats.cancelledCount >= 2) {
		flags.push(`Отмен визитов: ${stats.cancelledCount}`);
	}
	if (financialBadge.isDebt) {
		flags.push(`Задолженность: ${financialBadge.formattedAmount}`);
	} else if (financialBadge.isDeposit) {
		flags.push(`Депозит: ${financialBadge.formattedAmount}`);
	}

	let receptionistAlert = baseAlert;
	if (financialBadge.isDebt) {
		if (receptionistAlert) {
			receptionistAlert += ` Долг: ${financialBadge.formattedAmount}.`;
		} else {
			receptionistAlert = `У пациента задолженность ${financialBadge.formattedAmount}. Напомнить при записи.`;
		}
	}

	return {
		patientId,
		score,
		category,
		stats,
		reliabilityBadge: badge,
		financialBadge,
		flags,
		receptionistAlert,
	};
}

export const calculatePatientReliabilityScore = (
	patientId: string,
	appointments: readonly Appointment[] = [],
	patient?: Patient | null,
	options?: ReliabilityCalculationOptions,
) =>
	calculatePatientReliability(
		patient ? { ...patient, id: patientId } : ({ id: patientId } as Patient),
		appointments,
		options,
	);

export function getReliabilityBadgeConfig(
	assessment: PatientReliabilityAssessment,
): PatientReliabilityBadge {
	return assessment.reliabilityBadge;
}
