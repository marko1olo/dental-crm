import type {
	ClinicalRecallTriggerInfo,
	ClinicalRecallTriggerType,
	PatientRecallRecord,
} from "./recallCycleCatalog";
import {
	addCalendarMonthsSafe,
	addWeeksSafe,
	formatIsoDateOnly,
} from "./recallDateMath";

/**
 * Триггер 1: Профгигиена — 6 месяцев после последней чистки.
 * Золотой стандарт профилактики и сохранения гарантийных обязательств клиники.
 */
export function calculateHygieneRecallTrigger(
	lastCleaningDate: Date | string,
	customMonths = 6,
): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 6;
	const nextDueDate = addCalendarMonthsSafe(lastCleaningDate, months);
	return {
		triggerType: "hygiene_6m",
		title: "Плановый осмотр и профессиональная гигиена полости рта",
		shortTitle: "Профгигиена 6 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale:
			"Золотой стандарт стоматологической профилактики. Снятие зубных отложений (Air-Flow + УЗ), " +
			"онкоскрининг слизистой и сохранение гарантийных обязательств через 6 месяцев после последней чистки.",
		mappedCycleType: "standard_prophylaxis",
	};
}

/**
 * Триггер 2: Осмотр после имплантации / протезирования — 12 месяцев.
 * Годовой рентген-контроль остеоинтеграции и краевого прилегания ортопедии.
 */
export function calculateImplantProstheticRecallTrigger(
	lastProcedureDate: Date | string,
	customMonths = 12,
): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 12;
	const nextDueDate = addCalendarMonthsSafe(lastProcedureDate, months);
	return {
		triggerType: "implant_prosthetic_12m",
		title: "Контрольный осмотр после имплантации и протезирования",
		shortTitle: "Импланты/Ортопедия 12 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale:
			"Годовой рентген-контроль остеоинтеграции имплантатов по протоколу СтАР/ITI, ревизия окклюзионного баланса " +
			"и краевого прилегания ортопедических конструкций для сохранения гарантий.",
		mappedCycleType: "implant_monitoring",
	};
}

/**
 * Триггер 3: Ортодонтическая активация — 1 месяц (строго 4 недели / 28 дней).
 * Плановая смена и активация дуг, замена лигатур и эластиков.
 */
export function calculateOrthoActivationRecallTrigger(
	lastActivationDate: Date | string,
	customWeeks = 4,
): ClinicalRecallTriggerInfo {
	const weeks = customWeeks > 0 ? customWeeks : 4;
	const nextDueDate = addWeeksSafe(lastActivationDate, weeks);
	return {
		triggerType: "ortho_activation_1m",
		title: "Ортодонтический контроль: плановая активация и замена дуг",
		shortTitle: "Орто-активация 1 мес.",
		intervalMonths: 1,
		intervalWeeks: weeks,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale:
			"Плановая замена и активация ортодонтических дуг (NiTi / TMA / SS), смена лигатур и эластиков " +
			"строго каждые 4 недели (28 дней) для непрерывного и прогнозируемого перемещения зубов.",
		mappedCycleType: "orthodontic_braces",
	};
}

/**
 * Триггер 4: Детский осмотр — 3–4 месяца.
 * Контроль формирующегося прикуса, ремотерапия незрелой эмали и герметизация фиссур.
 */
export function calculatePediatricRecallTrigger(
	lastVisitDate: Date | string,
	intervalMonths: 3 | 4 = 3,
): ClinicalRecallTriggerInfo {
	const months = intervalMonths === 4 ? 4 : 3;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, months);
	return {
		triggerType: "pediatric_3_4m",
		title: `Детский профилактический осмотр и минерализация эмали (${months} мес.)`,
		shortTitle: `Детский осмотр ${months} мес.`,
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale:
			"Высокая скорость деминерализации незрелой эмали временных и сменных зубов у детей требует " +
			"диспансерного контроля гигиены, фторирования и герметизации фиссур каждые 3–4 месяца.",
		mappedCycleType: "pediatric_fluoridation",
	};
}

/**
 * Единый автоматический классификатор клинического триггера возврата.
 */
export function evaluateClinicalRecallTrigger(clinicalData: {
	readonly lastVisitDate?: (Date | string) | undefined;
	readonly isChildUnder14?: boolean | undefined;
	readonly hasBraces?: boolean | undefined;
	readonly hasOrthodonticAppliance?: boolean | undefined;
	readonly hasImplants?: boolean | undefined;
	readonly hasCrownsOrVeneers?: boolean | undefined;
	readonly hasProsthetics?: boolean | undefined;
	readonly maxPocketDepthMm?: number | undefined;
	readonly hasBleedingOnProbing?: boolean | undefined;
	readonly customIntervalMonths?: number | undefined;
}): ClinicalRecallTriggerInfo {
	const lastDate = clinicalData.lastVisitDate ?? new Date();

	if (clinicalData.isChildUnder14) {
		const interval = clinicalData.customIntervalMonths === 4 ? 4 : 3;
		return calculatePediatricRecallTrigger(lastDate, interval);
	}

	if (clinicalData.hasBraces || clinicalData.hasOrthodonticAppliance) {
		return calculateOrthoActivationRecallTrigger(lastDate, 4);
	}

	if (
		clinicalData.hasImplants ||
		clinicalData.hasCrownsOrVeneers ||
		clinicalData.hasProsthetics
	) {
		return calculateImplantProstheticRecallTrigger(
			lastDate,
			clinicalData.customIntervalMonths ?? 12,
		);
	}

	return calculateHygieneRecallTrigger(
		lastDate,
		clinicalData.customIntervalMonths ?? 6,
	);
}

/**
 * Автоматическое сопоставление карточки кандидата с клиническим триггером.
 */
export function resolveCandidateTriggerType(candidate: PatientRecallRecord): ClinicalRecallTriggerType {
	if (candidate.clinicalTriggerType) {
		return candidate.clinicalTriggerType;
	}

	const lowerPlan = (candidate.treatmentPlanTitle ?? "").toLowerCase();
	const lowerProcs = (candidate.lastProcedures ?? []).join(" ").toLowerCase();
	const notes = (candidate.clinicalNotes ?? "").toLowerCase();
	const combined = `${lowerPlan} ${lowerProcs} ${notes}`;

	if (
		candidate.isChildUnder14 ||
		candidate.age !== undefined && candidate.age < 14 ||
		combined.includes("детск") ||
		combined.includes("молочн")
	) {
		return "pediatric_3_4m";
	}

	if (
		candidate.hasBraces ||
		candidate.cycleType === "orthodontic_braces" ||
		candidate.cycleType === "orthodontic_aligners" ||
		combined.includes("брекет") ||
		combined.includes("элайнер") ||
		combined.includes("дуг")
	) {
		return "ortho_activation_1m";
	}

	if (
		(candidate.implantsCount && candidate.implantsCount > 0) ||
		candidate.cycleType === "implant_monitoring" ||
		candidate.cycleType === "prosthetic_check" ||
		combined.includes("имплант") ||
		combined.includes("коронк") ||
		combined.includes("протез")
	) {
		return "implant_prosthetic_12m";
	}

	return "hygiene_6m";
}
