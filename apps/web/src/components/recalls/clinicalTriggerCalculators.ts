import type { ClinicalRecallTriggerInfo } from "./recallCycleTypes";
import { addCalendarMonthsSafe, addWeeksSafe, formatIsoDateOnly } from "./recallDateMath";

export function calculateHygieneRecallTrigger(lastCleaningDate: Date | string, customMonths = 6): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 6;
	const nextDueDate = addCalendarMonthsSafe(lastCleaningDate, months);
	return {
		triggerType: "hygiene_6m",
		title: "Плановый осмотр и профессиональная гигиена полости рта",
		shortTitle: "Профгигиена 6 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Снятие зубных отложений (Air-Flow + УЗ), онкоскрининг слизистой и сохранение гарантийных обязательств через 6 месяцев после последней чистки.",
		mappedCycleType: "standard_prophylaxis",
	};
}

export function calculateImplantProstheticRecallTrigger(lastProcedureDate: Date | string, customMonths = 12): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 12;
	const nextDueDate = addCalendarMonthsSafe(lastProcedureDate, months);
	return {
		triggerType: "implant_prosthetic_12m",
		title: "Контрольный осмотр после имплантации и протезирования",
		shortTitle: "Импланты/Ортопедия 12 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Годовой рентген-контроль остеоинтеграции имплантатов по протоколу СтАР/ITI, ревизия окклюзионного баланса и краевого прилегания ортопедии.",
		mappedCycleType: "implant_monitoring",
	};
}

export function calculateOrthoActivationRecallTrigger(lastActivationDate: Date | string, customWeeks = 4): ClinicalRecallTriggerInfo {
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
		clinicalRationale: "Плановая смена и активация ортодонтических дуг каждые 4 недели (28 дней) для непрерывного перемещения зубов.",
		mappedCycleType: "orthodontic_braces",
	};
}

export function calculatePediatricRecallTrigger(lastVisitDate: Date | string, intervalMonths: 3 | 4 = 3): ClinicalRecallTriggerInfo {
	const months = intervalMonths === 4 ? 4 : 3;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, months);
	return {
		triggerType: "pediatric_3_4m",
		title: `Детский профилактический осмотр и минерализация эмали (${months} мес.)`,
		shortTitle: `Детский осмотр ${months} мес.`,
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Высокая скорость деминерализации незрелой эмали временных и сменных зубов у детей требует контрольного осмотра гигиены, фторирования и герметизации фиссур каждые 3–4 месяца.",
		mappedCycleType: "pediatric_fluoridation",
	};
}

export function calculateEndodonticRecallTrigger(lastProcedureDate: Date | string, customMonths = 1): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 1;
	const nextDueDate = addCalendarMonthsSafe(lastProcedureDate, months);
	return {
		triggerType: "endodontic_1m",
		title: "Контрольный осмотр и визиография после эндодонтии (1 мес.)",
		shortTitle: "Эндодонтия 1 мес.",
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Прицельный рентген-контроль через 1 месяц после пломбирования корневых каналов для оценки репарации костной ткани.",
		mappedCycleType: "endodontic_check",
	};
}

export function calculatePeriodontalRecallTrigger(lastProcedureDate: Date | string, customMonths = 3): ClinicalRecallTriggerInfo {
	const months = customMonths > 0 ? customMonths : 3;
	const nextDueDate = addCalendarMonthsSafe(lastProcedureDate, months);
	return {
		triggerType: "periodontal_3m",
		title: `Поддерживающая пародонтальная терапия (SPT) и контроль карманов (${months} мес.)`,
		shortTitle: `Пародонтология ${months} мес.`,
		intervalMonths: months,
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		clinicalRationale: "Хронический пародонтит, глубина карманов >= 4 мм, кровоточивость BOP. Поддерживающая терапия каждые 3–4 месяца.",
		mappedCycleType: "periodontal_maintenance",
	};
}

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
	if (clinicalData.hasImplants || clinicalData.hasCrownsOrVeneers || clinicalData.hasProsthetics) {
		return calculateImplantProstheticRecallTrigger(lastDate, clinicalData.customIntervalMonths ?? 12);
	}
	return calculateHygieneRecallTrigger(lastDate, clinicalData.customIntervalMonths ?? 6);
}
