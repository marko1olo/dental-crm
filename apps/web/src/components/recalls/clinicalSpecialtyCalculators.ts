import type { ClinicalRecallTriggerInfo } from "./recallCycleTypes";
import { addCalendarMonthsSafe, formatIsoDateOnly } from "./recallDateMath";

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
