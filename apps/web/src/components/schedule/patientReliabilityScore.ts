/**
 * patientReliabilityScore.ts — Patient Discipline & Reliability Assessment Engine.
 *
 * Evaluates patient visit history, attendance rates, lateness, unexcused no-shows,
 * and financial balances to provide instant receptionist guidance during appointment scheduling:
 *  - 🌟 Надежный пациент (>90% вовремя, 0 срывов)
 *  - ⚠️ Зона внимания (1-2 пропуска без предупреждения или частые опоздания >15 мин)
 *  - 🔴 Риск срыва приема (>2 неявок подряд, «Требуется подтверждение за 2 часа»)
 *  - 💳 Финансовый долг / Депозит (отображение точного баланса)
 */

import type { Appointment, Patient, PatientInsight } from "@dental/shared";
import { money } from "../../utils/financeUtils";

export type ReliabilityCategory = "reliable" | "attention" | "risk" | "new";

export interface PatientReliabilityBadge {
	readonly category: ReliabilityCategory;
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

/**
 * Extracts lateness in minutes from appointment reason, comment or admin notes.
 * Matches patterns: "опоздал на 20 мин", "опоздание 15 минут", "задержка 30м", "+25 мин опоздание", "late 20 min".
 */
export function extractLatenessMinutes(text: string | null | undefined): number | null {
	if (!text || typeof text !== "string") return null;

	const normalized = text.toLowerCase();

	// Pattern 1: "опоздал(а)? (на)? X мин" / "опоздала на 10м"
	const match1 = normalized.match(
		/(?:опозда(?:л[аио]?|ние|ть|ла|ли|ло|вш[а-я]*))\s*(?:на\s*)?(\d+)\s*(?:мин(?:ут[а-я]*)?|м(?![а-я0-9]))/iu,
	);
	if (match1 && match1[1]) {
		const mins = Number.parseInt(match1[1], 10);
		if (!Number.isNaN(mins) && mins > 0) return mins;
	}

	// Pattern 2: "задержка (на)? X мин"
	const match2 = normalized.match(
		/(?:задержк[а-я]*|задержал(?:ся|ась|ись)?)\s*(?:на\s*)?(\d+)\s*(?:мин(?:ут[а-я]*)?|м(?![а-я0-9]))/iu,
	);
	if (match2 && match2[1]) {
		const mins = Number.parseInt(match2[1], 10);
		if (!Number.isNaN(mins) && mins > 0) return mins;
	}

	// Pattern 3: "+X мин опоздание" or "X мин опоздания"
	const match3 = normalized.match(
		/(?:\+)?(\d+)\s*(?:мин(?:ут[а-я]*)?|м(?![а-я0-9]))\s*(?:опоздан|задержк)/iu,
	);
	if (match3 && match3[1]) {
		const mins = Number.parseInt(match3[1], 10);
		if (!Number.isNaN(mins) && mins > 0) return mins;
	}

	// Pattern 4: "late X min"
	const match4 = normalized.match(/late\s*(?:by\s*)?(\d+)\s*(?:min(?:utes?)?|m\b)/i);
	if (match4 && match4[1]) {
		const mins = Number.parseInt(match4[1], 10);
		if (!Number.isNaN(mins) && mins > 0) return mins;
	}

	// Generic lateness mentions without explicit minutes (e.g. "сильное опоздание", "опоздал на прием")
	if (/опозда(?:л|ние)|задержка\s*пациента/i.test(normalized)) {
		return 15; // default benchmark for unquantified lateness
	}

	return null;
}

/**
 * Determines if an appointment belongs to past finalized visit history.
 */
export function isAppointmentFinalizedOrPast(
	appointment: Appointment,
	referenceTimeMs: number,
): boolean {
	const status = appointment.status;

	// Completed, no-show, or cancelled are always finalized
	if (status === "completed" || status === "no_show" || status === "arrived" || status === "in_treatment") {
		return true;
	}

	if (status === "cancelled") {
		return true;
	}

	// For planned or confirmed appointments, only count if start time has already passed
	if (appointment.startsAt) {
		const startMs = Date.parse(appointment.startsAt);
		if (!Number.isNaN(startMs) && startMs < referenceTimeMs) {
			return true;
		}
	}

	return false;
}

/**
 * Determines whether an appointment is considered an unexcused missed visit (no-show).
 * Supports explicit 'no_show' status as well as unexcused cancellation notes.
 */
export function isUnexcusedNoShow(appt: Appointment): boolean {
	if (appt.status === "no_show") return true;
	if (appt.status === "cancelled") {
		const rawNotes = typeof (appt as Record<string, unknown>).notes === "string" ? ((appt as Record<string, unknown>).notes as string) : "";
		const text = `${rawNotes} ${appt.reason || ""} ${appt.comment || ""}`.toLowerCase();
		return (
			text.includes("не яв") ||
			text.includes("неявк") ||
			text.includes("не приш") ||
			text.includes("no show") ||
			text.includes("сорвал") ||
			text.includes("без предупрежд")
		);
	}
	return false;
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

	if (relevant.length === 0) {
		return { currentStreak: 0, maxStreak: 0 };
	}

	let currentStreak = 0;
	// Walk backwards from latest appointment
	for (let i = relevant.length - 1; i >= 0; i--) {
		const appt = relevant[i];
		if (!appt) continue;
		if (isUnexcusedNoShow(appt)) {
			currentStreak++;
		} else if (appt.status === "completed" || appt.status === "arrived" || appt.status === "in_treatment") {
			// Attended appointment breaks the current no-show streak
			break;
		}
	}

	let maxStreak = 0;
	let tempStreak = 0;
	for (const appt of relevant) {
		if (isUnexcusedNoShow(appt)) {
			tempStreak++;
			if (tempStreak > maxStreak) {
				maxStreak = tempStreak;
			}
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
			label: `💳 Долг: ${absFormatted}`,
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
			label: `💳 Депозит: ${formatted}`,
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
		label: "💳 Баланс: 0 ₽",
		shortLabel: "0 ₽",
		formattedAmount: "0 ₽",
		badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
		isDebt: false,
		isDeposit: false,
	};
}

/**
 * Core Reliability Assessment Engine.
 * Analyzes patient attendance, no-shows, lateness, cancellations, and balances.
 */
export function calculatePatientReliability(
	patient: Patient | null | undefined,
	appointments?: readonly Appointment[] | null | undefined,
	options?: ReliabilityCalculationOptions,
): PatientReliabilityAssessment {
	const patientId = patient?.id || "";
	const refMs = options?.referenceTimeIso ? Date.parse(options.referenceTimeIso) : Date.now();
	const latenessThreshold = options?.latenessThresholdMinutes ?? 15;

	const rawBalance = patient?.balanceRub ?? 0;
	const financialBadge = formatPatientBalanceBadge(rawBalance);

	const allAppts = appointments ?? [];
	const patientAppts = patientId
		? allAppts.filter((a) => a.patientId === patientId && isAppointmentFinalizedOrPast(a, refMs))
		: [];

	// Chronological sorting
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
			const latenessMin =
				extractLatenessMinutes(appt.comment) ??
				extractLatenessMinutes(appt.reason) ??
				extractLatenessMinutes(typeof (appt as Record<string, unknown>).notes === "string" ? ((appt as Record<string, unknown>).notes as string) : null);
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

	const { currentStreak: consecutiveNoShows, maxStreak: maxConsecutiveNoShows } =
		patientId ? calculateConsecutiveNoShows(allAppts, patientId, options?.referenceTimeIso) : { currentStreak: 0, maxStreak: 0 };

	const attendanceRatePercent =
		totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 100;

	const onTimeCount = Math.max(0, completedCount - lateCount);
	const onTimeRatePercent =
		totalFinished > 0 ? Math.round((onTimeCount / totalFinished) * 100) : 100;

	const stats: PatientVisitHistoryStats = {
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

	const flags: string[] = [];

	if (consecutiveNoShows >= 2) {
		flags.push(`${consecutiveNoShows} неявки подряд («Требуется подтверждение за 2 часа»)`);
	} else if (noShowCount > 0) {
		flags.push(`${noShowCount} неявка(и) без предупреждения`);
	}

	if (lateCount > 0) {
		flags.push(`Опоздания >15 мин: ${lateCount} раз(а)`);
	}

	if (cancelledCount >= 2) {
		flags.push(`Отмен визитов: ${cancelledCount}`);
	}

	if (financialBadge.isDebt) {
		flags.push(`Задолженность: ${financialBadge.formattedAmount}`);
	} else if (financialBadge.isDeposit) {
		flags.push(`Депозит: ${financialBadge.formattedAmount}`);
	}

	// Determine category and scoring
	let category: ReliabilityCategory = "reliable";
	let score = 100;
	let badgeText = "🌟 Надежный пациент";
	let shortLabel = "Надежный";
	let emoji = "🌟";
	let recommendation = "Высокая дисциплина визитов. Стандартное подтверждение.";
	let summary = "100% визитов вовремя, 0 срывов";
	let badgeClass = "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40";
	let requiresTwoHourConfirmation = false;
	let receptionistAlert: string | undefined = undefined;

	// Check if insight overrides
	const isInsightHighRisk = options?.overrideInsight?.riskLevel === "high";

	if (totalFinished === 0) {
		// New patient with no historical visits
		category = "new";
		score = 85;
		badgeText = "✨ Новый пациент";
		shortLabel = "Новый";
		emoji = "✨";
		recommendation = "Первичный прием. Запросить паспорт и оформить ИДС.";
		summary = "Нет истории визитов";
		badgeClass = "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/40";
		requiresTwoHourConfirmation = false;
		receptionistAlert = "Первичный визит. Напомнить пациенту взять паспорт и СНИЛС для оформления договора.";
	} else if (
		consecutiveNoShows >= 2 ||
		noShowCount >= 3 ||
		(maxConsecutiveNoShows >= 2 && attendanceRatePercent < 60) ||
		(isInsightHighRisk && noShowCount >= 2)
	) {
		// 🔴 High Risk Category
		category = "risk";
		score = Math.max(0, Math.min(45, 100 - noShowCount * 30 - consecutiveNoShows * 15 - lateCount * 10));
		badgeText = "🔴 Риск срыва приема";
		shortLabel = "Риск срыва";
		emoji = "🔴";
		recommendation = "Требуется подтверждение за 2 часа";
		requiresTwoHourConfirmation = true;
		summary =
			consecutiveNoShows >= 2
				? `${consecutiveNoShows} неявки подряд. Высокий риск отмены.`
				: `${noShowCount} неявок из ${totalFinished} визитов.`;
		badgeClass = "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40";
		receptionistAlert = `⚠️ Внимание администратора: Требуется обязательное подтверждение за 2 часа до приема! У пациента ${consecutiveNoShows >= 2 ? `${consecutiveNoShows} неявки подряд` : `${noShowCount} неявок`}.`;
	} else if (
		noShowCount >= 1 ||
		lateCount >= 2 ||
		(lateCount === 1 && noShowCount === 1) ||
		attendanceRatePercent < 90 ||
		onTimeRatePercent < 90 ||
		cancelledCount >= 3
	) {
		// ⚠️ Attention Zone Category
		category = "attention";
		score = Math.max(46, Math.min(80, 100 - noShowCount * 25 - lateCount * 15 - cancelledCount * 8));
		badgeText = "⚠️ Зона внимания";
		shortLabel = "Внимание";
		emoji = "⚠️";
		recommendation = "Рекомендуется контрольный звонок накануне визита";
		requiresTwoHourConfirmation = false;
		const reasonParts: string[] = [];
		if (noShowCount > 0) reasonParts.push(`${noShowCount} пропуск(а)`);
		if (lateCount > 0) reasonParts.push(`${lateCount} опоздани(е/й) >15м`);
		if (cancelledCount >= 2) reasonParts.push(`${cancelledCount} отмен`);
		summary = reasonParts.join(", ") || `${onTimeRatePercent}% визитов вовремя`;
		badgeClass = "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40";
		receptionistAlert = `Рекомендуется контрольный звонок накануне: ${summary}.`;
	} else {
		// 🌟 Reliable Category (>90% on-time, 0 no-shows)
		category = "reliable";
		score = Math.min(100, Math.max(90, 95 + completedCount));
		badgeText = "🌟 Надежный пациент";
		shortLabel = "Надежный";
		emoji = "🌟";
		recommendation = "Высокая дисциплина визитов. Стандартная запись.";
		requiresTwoHourConfirmation = false;
		summary = `${onTimeRatePercent}% визитов вовремя (${completedCount}/${totalFinished}), 0 срывов`;
		badgeClass = "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40";
	}

	// Financial debt adjustments to alert
	if (financialBadge.isDebt) {
		if (receptionistAlert) {
			receptionistAlert += ` Долг: ${financialBadge.formattedAmount}.`;
		} else {
			receptionistAlert = `У пациента задолженность ${financialBadge.formattedAmount}. Напомнить при записи.`;
		}
	}

	const reliabilityBadge: PatientReliabilityBadge = {
		category,
		badgeText,
		shortLabel,
		emoji,
		recommendation,
		summary,
		badgeClass,
		requiresTwoHourConfirmation,
	};

	return {
		patientId,
		score,
		category,
		stats,
		reliabilityBadge,
		financialBadge,
		flags,
		receptionistAlert,
	};
}

/**
 * Formats a quick 1-line HTML/JSX summary for schedule tooltips.
 */
export function getReliabilityBadgeConfig(
	assessment: PatientReliabilityAssessment,
): PatientReliabilityBadge {
	return assessment.reliabilityBadge;
}

export interface DurationPreset {
	readonly minutes: number;
	readonly label: string;
	readonly serviceHint: string;
}

/**
 * Receptionist fast booking duration presets:
 *  - 15 мин (Осмотр)
 *  - 30 мин (Гигиена/Швы)
 *  - 60 мин (Лечение)
 *  - 90 мин (Хирургия)
 *  - 120 мин (Ортопедия)
 */
export const DURATION_PRESETS: readonly DurationPreset[] = [
	{ minutes: 15, label: "15 мин", serviceHint: "Осмотр" },
	{ minutes: 30, label: "30 мин", serviceHint: "Гигиена/Швы" },
	{ minutes: 60, label: "60 мин", serviceHint: "Лечение" },
	{ minutes: 90, label: "90 мин", serviceHint: "Хирургия" },
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
		description: "Первичный осмотр и консультация",
		defaultReason: "Первичный осмотр",
		defaultDurationMinutes: 30,
		defaultStatus: "planned",
		isEmergency: false,
	},
	{
		type: "secondary",
		label: "Повторный",
		description: "Плановое лечение / повторный прием",
		defaultReason: "Повторный прием (Лечение)",
		defaultDurationMinutes: 60,
		defaultStatus: "planned",
		isEmergency: false,
	},
	{
		type: "emergency",
		label: "Острая боль",
		description: "Экстренный слот CITO (высокий приоритет)",
		defaultReason: "CITO! Острая боль",
		defaultDurationMinutes: 30,
		defaultStatus: "confirmed",
		isEmergency: true,
	},
];

