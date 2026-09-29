/**
 * Clinical Patient Recalls & Hygiene Dispensary Engine (DOMAIN: RECALLS)
 *
 * Плановые профосмотры, профилактическая гигиена и когортный возврат пациентов.
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
	RecallContactStatus,
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
	addDaysSafe,
	addWeeksSafe,
	calculateDaysOverdue,
	calculateImplantRecallMilestones,
	formatIsoDateOnly,
	resolveUrgencyStatus,
} from "./recallDateMath";
import {
	evaluateMultiRecallChannels,
	resolveCandidateTriggerType,
	shouldResetRecallTimer,
	type ClinicalProcedureIdentifier,
	type PatientClinicalStatusInput,
} from "./recallClinicalTriggers";

declare module "./recallCycleCatalog" {
	interface PatientRecallRecord {
		readonly isArchived?: boolean | undefined;
		readonly isDeceased?: boolean | undefined;
		readonly patientStatus?: string | undefined;
		readonly postponedUntil?: string | undefined;
		readonly postponeReason?: string | undefined;
		readonly channelId?: string | undefined;
	}

	interface RecallFilterOptions {
		readonly includeArchived?: boolean | undefined;
	}
}

/**
 * Проверка права пациента на участие в диспансерном учете.
 * Исключает архивированных и умерших пациентов без orphaned-записей в очередях.
 */
export function isPatientEligibleForRecall(candidate: {
	readonly isArchived?: boolean | undefined;
	readonly isDeceased?: boolean | undefined;
	readonly patientStatus?: string | undefined;
}): boolean {
	if (candidate.isArchived === true) return false;
	if (candidate.isDeceased === true) return false;
	if (
		candidate.patientStatus === "archived" ||
		candidate.patientStatus === "deceased" ||
		candidate.patientStatus === "inactive"
	) {
		return false;
	}
	return true;
}

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
		reason: "Плановый профосмотр: комплексная гигиена и онкоскрининг каждые 6 месяцев.",
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
		// Автоматическая очистка: recalls для архивированных или умерших пациентов исключаются из очередей
		if (!options.includeArchived && !isPatientEligibleForRecall(c)) {
			return false;
		}

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

/**
 * 1-Click перенос срока планового осмотра (пациент в отпуске / отъезд / личные причины)
 */
export function postponeRecallRecord(
	record: PatientRecallRecord,
	duration: "2_weeks" | "1_month" | number,
	reason = "Пациент в отпуске / перенос визита",
	referenceDate?: Date | string,
): PatientRecallRecord {
	const ref = referenceDate ?? new Date();
	const baseDate = record.dueDate;
	const parsedDue = new Date(baseDate);
	const parsedRef = typeof ref === "string" ? new Date(ref) : ref;

	// Если плановый срок уже давно наступил или просрочен, откладываем от referenceDate
	const effectiveFrom = parsedDue.getTime() < parsedRef.getTime() ? parsedRef : parsedDue;

	let newDueDate: Date;
	let durationDesc: string;
	if (duration === "2_weeks") {
		newDueDate = addWeeksSafe(effectiveFrom, 2);
		durationDesc = "2 недели";
	} else if (duration === "1_month") {
		newDueDate = addCalendarMonthsSafe(effectiveFrom, 1);
		durationDesc = "1 месяц";
	} else {
		newDueDate = addDaysSafe(effectiveFrom, duration);
		durationDesc = `${duration} дн.`;
	}

	const formattedDueDate = formatIsoDateOnly(newDueDate);
	const daysOverdue = calculateDaysOverdue(newDueDate, ref);
	const urgencyStatus = resolveUrgencyStatus(newDueDate, ref, false);

	const note = `[Отложено на ${durationDesc} до ${formattedDueDate}: ${reason}]`;
	const updatedNotes = record.clinicalNotes
		? `${record.clinicalNotes}\n${note}`
		: note;

	return {
		...record,
		dueDate: formattedDueDate,
		daysOverdue,
		urgencyStatus,
		status: "declined", // в каноническом канбане "Отказ / Перенос"
		clinicalNotes: updatedNotes,
		postponedUntil: formattedDueDate,
		postponeReason: reason,
	};
}

/**
 * 1-Click подтверждение записи пациента: «Связались — записан на прием»
 */
export function markRecallRecordScheduled(
	record: PatientRecallRecord,
	scheduledDate?: string,
	scheduledAppointmentId?: string,
): PatientRecallRecord {
	return {
		...record,
		status: "scheduled",
		urgencyStatus: "upcoming",
		scheduledDate: scheduledDate ?? record.dueDate,
		scheduledAppointmentId: scheduledAppointmentId ?? `appt-${record.id}-${Date.now()}`,
	};
}

/**
 * Создание независимых карточек диспансерного контроля для пациента (Multi-Recall Separation).
 * Гарантирует, что импланты, ортодонтия, детство и гигиена существуют как независимые сущности с отдельными таймерами.
 */
export function createMultiRecallRecordsForPatient(
	patient: {
		readonly id: string;
		readonly fullName: string;
		readonly phone?: string | null | undefined;
		readonly email?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly age?: number | undefined;
		readonly attendingDoctorId?: string | undefined;
		readonly attendingDoctorName?: string | undefined;
		readonly isArchived?: boolean | undefined;
		readonly isDeceased?: boolean | undefined;
	},
	clinicalData: PatientClinicalStatusInput,
): PatientRecallRecord[] {
	if (!isPatientEligibleForRecall(patient)) {
		return [];
	}

	const multiResult = evaluateMultiRecallChannels(clinicalData);
	const refDate = clinicalData.referenceDate ?? new Date();

	return multiResult.triggers.map((trigger) => {
		const daysOverdue = calculateDaysOverdue(trigger.nextDueDate, refDate);
		const urgencyStatus = resolveUrgencyStatus(trigger.nextDueDate, refDate, false);
		const cycleDef = RECALL_CYCLE_CATALOG[trigger.mappedCycleType];

		const recordId = `${patient.id}_${trigger.channelId}`;

		return {
			id: recordId,
			patientId: patient.id,
			fullName: patient.fullName,
			phone: patient.phone ?? null,
			email: patient.email ?? null,
			birthDate: patient.birthDate,
			age: patient.age,
			cycleType: trigger.mappedCycleType,
			clinicalTriggerType: trigger.triggerType,
			channelId: trigger.channelId,
			lastVisitDate: formatIsoDateOnly(
				clinicalData.lastVisitDate ? new Date(clinicalData.lastVisitDate) : new Date(),
			),
			dueDate: trigger.formattedDueDate,
			daysOverdue,
			urgencyStatus,
			status: "due_now",
			attendingDoctorId: patient.attendingDoctorId,
			attendingDoctorName: patient.attendingDoctorName,
			clinicalNotes: trigger.clinicalRationale,
			historicalRevenueRub: cycleDef?.estimatedAverageCheckRub ?? 6500,
			isArchived: patient.isArchived,
			isDeceased: patient.isDeceased,
		};
	});
}

/**
 * Обработка завершенного визита пациента с защитой от ложного сброса диспансерных таймеров (Mandate 2).
 * Обычные терапевтические визиты (кариес, пломбирование A16.07.002, пульпит A16.07.030)
 * НЕ СБРАСЫВАЮТ таймер профессиональной гигиены!
 * Таймер гигиены сбрасывается ТОЛЬКО если оказана услуга A16.07.051 или комплексная гигиена.
 */
export function processVisitForPatientRecalls(
	currentRecalls: readonly PatientRecallRecord[],
	visit: {
		readonly visitDate: string; // YYYY-MM-DD
		readonly procedures: readonly ClinicalProcedureIdentifier[];
		readonly isCompleted?: boolean | undefined;
	},
	referenceDate?: Date | string,
): {
	readonly updatedRecalls: PatientRecallRecord[];
	readonly resetCount: number;
	readonly unchangedCount: number;
} {
	const ref = referenceDate ?? new Date();
	let resetCount = 0;
	let unchangedCount = 0;

	const updatedRecalls = currentRecalls.map((recall) => {
		const shouldReset = shouldResetRecallTimer(
			{
				cycleType: recall.cycleType,
				clinicalTriggerType: recall.clinicalTriggerType,
			},
			visit.procedures,
		);

		if (!shouldReset) {
			unchangedCount++;
			return recall;
		}

		resetCount++;
		const cycleDef = RECALL_CYCLE_CATALOG[recall.cycleType];
		const intervalMonths =
			recall.customIntervalValue && recall.customIntervalValue > 0
				? recall.customIntervalValue
				: (cycleDef?.defaultIntervalMonths ?? 6);

		const newDueDate = addCalendarMonthsSafe(visit.visitDate, intervalMonths);
		const formattedDueDate = formatIsoDateOnly(newDueDate);
		const daysOverdue = calculateDaysOverdue(newDueDate, ref);
		const urgencyStatus = resolveUrgencyStatus(newDueDate, ref, false);

		return {
			...recall,
			lastVisitDate: visit.visitDate,
			dueDate: formattedDueDate,
			daysOverdue,
			urgencyStatus,
			status: "due_now" as RecallContactStatus,
		};
	});

	return {
		updatedRecalls,
		resetCount,
		unchangedCount,
	};
}

