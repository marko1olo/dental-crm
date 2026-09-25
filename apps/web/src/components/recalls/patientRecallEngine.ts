/**
 * Clinical Patient Recalls & Hygiene Dispensary Engine (DOMAIN: RECALLS)
 *
 * Диспансерный учет, профилактические осмотры и когортный возврат пациентов.
 * Соответствует клиническим рекомендациям Стоматологической Ассоциации России (СтАР),
 * протоколам периодонтологии (EFP/AAP), этапам остеоинтеграции имплантатов и стандартам ортодонтии.
 */

// 1. Re-export all submodules
export * from "./recallCycleCatalog";
export * from "./recallDateMath";
export * from "./recallCohortRetention";
export * from "./recallSmsAndMessaging";
export * from "./recallClinicalTriggers";
export * from "./recallLegacyCandidates";

import type {
	PatientRecallRecord,
	RecallCycleType,
	RecallFilterOptions,
	RecallPeriodFilter,
	RecallUrgencyStatus,
} from "./recallCycleCatalog";
import {
	RECALL_CYCLE_CATALOG,
	toCanonicalRecallStatus,
} from "./recallCycleCatalog";
import {
	addCalendarMonthsSafe,
	addWeeksSafe,
	calculateDaysOverdue,
	calculateImplantRecallMilestones,
	formatIsoDateOnly,
	resolveUrgencyStatus,
} from "./recallDateMath";
import { resolveCandidateTriggerType } from "./recallClinicalTriggers";

/**
 * Проверка вхождения даты планового визита в выбранный период выборки
 */
export function isDateInPeriod(
	dueDateStr: string,
	period: RecallPeriodFilter,
	referenceDate: Date | string = new Date(),
): boolean {
	if (period === "all") return true;

	const ref =
		typeof referenceDate === "string"
			? new Date(referenceDate)
			: new Date(referenceDate.getTime());
	const due = new Date(dueDateStr);
	if (Number.isNaN(due.getTime()) || Number.isNaN(ref.getTime())) return true;

	const dueUtc = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
	const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
	const diffDays = Math.floor((refUtc - dueUtc) / (1000 * 60 * 60 * 24)); // >0 = overdue, <0 = future

	if (period === "overdue") {
		return diffDays > 0;
	}

	if (period === "this_month") {
		return (
			due.getFullYear() === ref.getFullYear() &&
			due.getMonth() === ref.getMonth()
		);
	}

	if (period === "next_month") {
		const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
		return (
			due.getFullYear() === nextMonth.getFullYear() &&
			due.getMonth() === nextMonth.getMonth()
		);
	}

	if (period === "next_30_days") {
		return diffDays <= 0 && diffDays >= -30;
	}

	return true;
}

export function calculateRecallProfile(params: {
	readonly lastVisitDate: Date | string;
	readonly cycleType: RecallCycleType;
	readonly customIntervalValue?: number | undefined;
	readonly customIntervalMonths?: number | undefined;
	readonly referenceDate?: (Date | string) | undefined;
	readonly isCompleted?: boolean | undefined;
	readonly implantSurgeryDate?: (Date | string) | undefined;
}): {
	readonly dueDate: Date;
	readonly formattedDueDate: string;
	readonly daysOverdue: number;
	readonly urgencyStatus: RecallUrgencyStatus;
	readonly intervalDescription: string;
	readonly intervalMonths: number;
} {
	const refDate = params.referenceDate ?? new Date();
	const cycleDef = RECALL_CYCLE_CATALOG[params.cycleType];
	const rawCustom = params.customIntervalValue ?? params.customIntervalMonths;

	let dueDate: Date;
	let intervalDescription: string;
	let intervalMonths: number;

	if (params.cycleType === "orthodontic_braces") {
		const weeks = rawCustom && rawCustom > 0 ? rawCustom : 4;
		dueDate = addWeeksSafe(params.lastVisitDate, weeks);
		intervalDescription = `${weeks} нед.`;
		intervalMonths = Math.max(1, Math.round((weeks * 7) / 30));
	} else if (params.cycleType === "orthodontic_aligners") {
		const weeks = rawCustom && rawCustom > 0 ? rawCustom : 6;
		dueDate = addWeeksSafe(params.lastVisitDate, weeks);
		intervalDescription = `${weeks} нед.`;
		intervalMonths = Math.max(1, Math.round((weeks * 7) / 30));
	} else if (params.cycleType === "implant_monitoring" && params.implantSurgeryDate) {
		const implantCalc = calculateImplantRecallMilestones(params.implantSurgeryDate, refDate);
		dueDate = implantCalc.nextDueDate;
		intervalDescription = `${implantCalc.nextMilestoneMonth} мес. с операции`;
		intervalMonths = implantCalc.nextMilestoneMonth;
	} else {
		const months =
			rawCustom && rawCustom > 0
				? rawCustom
				: (cycleDef?.defaultIntervalMonths ?? cycleDef?.defaultIntervalValue ?? 6);
		dueDate = addCalendarMonthsSafe(params.lastVisitDate, months);
		intervalDescription = `${months} мес.`;
		intervalMonths = months;
	}

	const formattedDueDate = formatIsoDateOnly(dueDate);
	const daysOverdue = calculateDaysOverdue(dueDate, refDate);
	const urgencyStatus = resolveUrgencyStatus(dueDate, refDate, params.isCompleted);

	return {
		dueDate,
		formattedDueDate,
		daysOverdue,
		urgencyStatus,
		intervalDescription,
		intervalMonths,
	};
}

export function evaluateClinicalCycleSuggestion(clinicalData: {
	readonly maxPocketDepthMm?: number | undefined;
	readonly hasBleedingOnProbing?: boolean | undefined;
	readonly hasImplants?: boolean | undefined;
	readonly monthsSinceImplantSurgery?: number | undefined;
	readonly hasBraces?: boolean | undefined;
	readonly hasAligners?: boolean | undefined;
	readonly hasBracesOrAligners?: boolean | undefined;
	readonly orthodonticStageMonth?: number | undefined;
	readonly hasActiveRetention?: boolean | undefined;
	readonly isChildUnder14?: boolean | undefined;
	readonly hasDeepCaries?: boolean | undefined;
	readonly decayedTeethCount?: number | undefined;
	readonly hasCrownsOrVeneers?: boolean | undefined;
}): {
	readonly suggestedCycle: RecallCycleType;
	readonly reason: string;
	readonly recommendedIntervalValue: number;
	readonly recommendedIntervalMonths: number;
	readonly intervalUnit: "months" | "weeks";
} {
	if (
		(clinicalData.maxPocketDepthMm && clinicalData.maxPocketDepthMm >= 4) ||
		clinicalData.hasBleedingOnProbing
	) {
		return {
			suggestedCycle: "periodontal_maintenance",
			reason: `Пародонтит: глубина ПК ${clinicalData.maxPocketDepthMm ?? 4} мм, кровоточивость BOP. Поддерживающая терапия раз в 3–4 месяца.`,
			recommendedIntervalValue: 3,
			recommendedIntervalMonths: 3,
			intervalUnit: "months",
		};
	}

	if (clinicalData.hasImplants) {
		const months = clinicalData.monthsSinceImplantSurgery ?? 6;
		let val = 3;
		if (months > 12) {
			val = 6;
		} else if (months > 3) {
			val = 4;
		} else {
			val = 3;
		}
		return {
			suggestedCycle: "implant_monitoring",
			reason: "Контроль остеоинтеграции и краевой кости имплантатов по этапам 1, 3, 6, 12 месяцев.",
			recommendedIntervalValue: val,
			recommendedIntervalMonths: val,
			intervalUnit: "months",
		};
	}

	if (clinicalData.hasBraces) {
		return {
			suggestedCycle: "orthodontic_braces",
			reason: "Брекет-система: плановая смена дуг и активация каждые 4 недели (28 дней).",
			recommendedIntervalValue: 4,
			recommendedIntervalMonths: 1,
			intervalUnit: "weeks",
		};
	}

	if (clinicalData.hasAligners) {
		return {
			suggestedCycle: "orthodontic_aligners",
			reason: "Лечение на элайнерах: ревизия трекинга и выдача капп каждые 6–8 недель.",
			recommendedIntervalValue: 6,
			recommendedIntervalMonths: 2,
			intervalUnit: "weeks",
		};
	}

	if (clinicalData.hasActiveRetention || clinicalData.hasBracesOrAligners) {
		return {
			suggestedCycle: "orthodontic_retention",
			reason: "Ретенционный контроль: проверка проволочных ретейнеров и капп раз в 3 месяца.",
			recommendedIntervalValue: 3,
			recommendedIntervalMonths: 3,
			intervalUnit: "months",
		};
	}

	if (clinicalData.isChildUnder14) {
		return {
			suggestedCycle: "pediatric_fluoridation",
			reason: "Детский возраст (<14 лет): фторирование эмали и герметизация фиссур каждые 3–6 месяцев.",
			recommendedIntervalValue: 3,
			recommendedIntervalMonths: 3,
			intervalUnit: "months",
		};
	}

	if (clinicalData.hasDeepCaries || (clinicalData.decayedTeethCount ?? 0) >= 3) {
		return {
			suggestedCycle: "caries_high_risk",
			reason: `Высокий КПУ (${clinicalData.decayedTeethCount ?? "множественный"}). Ремотерапия и ревизия пломб каждые 3 месяца.`,
			recommendedIntervalValue: 3,
			recommendedIntervalMonths: 3,
			intervalUnit: "months",
		};
	}

	if (clinicalData.hasCrownsOrVeneers) {
		return {
			suggestedCycle: "prosthetic_check",
			reason: "Контроль окклюзии и краевого прилегания коронок/виниров каждые 6 месяцев.",
			recommendedIntervalValue: 6,
			recommendedIntervalMonths: 6,
			intervalUnit: "months",
		};
	}

	return {
		suggestedCycle: "standard_prophylaxis",
		reason: "Плановая диспансеризация: комплексная гигиена и онкоскрининг каждые 6 месяцев.",
		recommendedIntervalValue: 6,
		recommendedIntervalMonths: 6,
		intervalUnit: "months",
	};
}

export function filterAndSortRecallCandidates(
	candidates: readonly PatientRecallRecord[],
	options: RecallFilterOptions,
): PatientRecallRecord[] {
	const rawQuery = (options.searchQuery ?? "").trim();
	const queryLower = rawQuery.toLowerCase();
	const queryDigits = rawQuery.replace(/\D/g, "");

	const filtered = candidates.filter((c) => {
		if (options.status && options.status !== "all") {
			if (options.status === "due_now") {
				const isPending = c.status === "pending" || c.status === "due_now";
				const isDue = c.urgencyStatus === "due_now" || c.urgencyStatus === "overdue_30" || c.urgencyStatus === "overdue_90";
				if (!isPending || !isDue) {
					return false;
				}
			} else if (options.status === "invited") {
				if (c.status !== "invited" && c.status !== "contacted") {
					return false;
				}
			} else if (c.status !== options.status) {
				return false;
			}
		}

		if (options.urgencyStatus && options.urgencyStatus !== "all") {
			if (c.urgencyStatus !== options.urgencyStatus) {
				return false;
			}
		}

		if (options.canonicalStatus && options.canonicalStatus !== "all") {
			if (toCanonicalRecallStatus(c.status) !== options.canonicalStatus) {
				return false;
			}
		}

		if (options.triggerType && options.triggerType !== "all") {
			if (resolveCandidateTriggerType(c) !== options.triggerType) {
				return false;
			}
		}

		if (options.cycleType && options.cycleType !== "all") {
			if (c.cycleType !== options.cycleType) {
				return false;
			}
		}

		if (options.doctorId && options.doctorId !== "all") {
			if (c.attendingDoctorId !== options.doctorId) {
				return false;
			}
		}

		if (options.period && options.period !== "all") {
			if (!isDateInPeriod(c.dueDate, options.period, options.referenceDate)) {
				return false;
			}
		}

		if (rawQuery) {
			const nameMatch = c.fullName.toLowerCase().includes(queryLower);
			const phoneDigits = c.phone ? c.phone.replace(/\D/g, "") : "";
			const phoneMatch =
				queryDigits.length > 0 && phoneDigits.length > 0
					? phoneDigits.includes(queryDigits)
					: false;
			const doctorMatch = c.attendingDoctorName
				? c.attendingDoctorName.toLowerCase().includes(queryLower)
				: false;

			if (!nameMatch && !phoneMatch && !doctorMatch) {
				return false;
			}
		}

		return true;
	});

	const sortBy = options.sortBy ?? "daysOverdue";
	const sortDirection = options.sortDirection ?? "desc";
	const dirMultiplier = sortDirection === "asc" ? 1 : -1;

	return filtered.slice().sort((a, b) => {
		if (sortBy === "daysOverdue") {
			return (a.daysOverdue - b.daysOverdue) * dirMultiplier;
		}
		if (sortBy === "dueDate") {
			return a.dueDate.localeCompare(b.dueDate) * dirMultiplier;
		}
		if (sortBy === "lastVisitDate") {
			return a.lastVisitDate.localeCompare(b.lastVisitDate) * dirMultiplier;
		}
		if (sortBy === "fullName") {
			return a.fullName.localeCompare(b.fullName, "ru") * dirMultiplier;
		}
		if (sortBy === "ltv") {
			return ((a.historicalRevenueRub || 0) - (b.historicalRevenueRub || 0)) * dirMultiplier;
		}
		return 0;
	});
}
