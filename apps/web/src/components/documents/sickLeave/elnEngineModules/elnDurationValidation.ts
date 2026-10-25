/**
 * SICK LEAVE DURATION & CLINICAL VALIDATION
 * Pure clinical logic without bureaucratic decrees
 */

import type { SickLeaveFormState, SickLeaveValidationResult } from "./types.js";
import {
	SINGLE_DOCTOR_MAX_DAYS,
	calculateDaysBetween,
	formatDateRu,
	addDays,
} from "./dentalIcd10DurationNorms.js";
import { validateElnNumber } from "./elnMod11Utils.js";

export function validateSickLeaveDuration(
	form: SickLeaveFormState,
): SickLeaveValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const infoMessages: string[] = [];

	if (!form.elnNumber || form.elnNumber.replace(/\D/g, "").length !== 12) {
		warnings.push("Номер листка нетрудоспособности должен состоять из 12 цифр.");
	} else if (!validateElnNumber(form.elnNumber)) {
		warnings.push("Контрольный разряд номера ЭЛН не совпадает с расчетным по алгоритму проверки.");
	}

	if (!form.periods || form.periods.length === 0) {
		errors.push("Отсутствуют периоды освобождения от работы.");
		return { isValid: false, totalDays: 0, isVkRequired: false, singleDoctorLimitExceeded: false, errors, warnings, infoMessages };
	}

	let totalDays = 0;
	for (let i = 0; i < form.periods.length; i++) {
		const p = form.periods[i];
		if (!p || !p.dateFrom || !p.dateTo) {
			errors.push(`В периоде №${i + 1} не заполнены даты начала или окончания.`);
			continue;
		}
		const periodDays = calculateDaysBetween(p.dateFrom, p.dateTo);
		if (periodDays <= 0) {
			errors.push(`В периоде №${i + 1} дата окончания (${formatDateRu(p.dateTo)}) предшествует дате начала (${formatDateRu(p.dateFrom)}).`);
			continue;
		}
		totalDays += periodDays;

		if (i > 0) {
			const prevPeriod = form.periods[i - 1];
			if (prevPeriod && prevPeriod.dateTo) {
				const expectedNextStart = addDays(prevPeriod.dateTo, 1);
				if (p.dateFrom !== expectedNextStart) {
					warnings.push(`Период №${i + 1} начинается с даты ${formatDateRu(p.dateFrom)}, нарушая непрерывность с предыдущим периодом (ожидалось ${formatDateRu(expectedNextStart)}).`);
				}
			}
		}
	}

	const singleDoctorLimitExceeded = totalDays > SINGLE_DOCTOR_MAX_DAYS;
	const isVkRequired = singleDoctorLimitExceeded || form.isVkRequired;

	if (singleDoctorLimitExceeded) {
		if (!form.isVkRequired) {
			errors.push(`Общая продолжительность нетрудоспособности составляет ${totalDays} дн., что превышает установленный законом 15-дневный лимит единоличной экспертизы лечащего врача. Требуется согласование с главным врачом / ВК.`);
		} else if (!form.vkProtocol || !form.vkProtocol.protocolNumber || form.vkProtocol.protocolNumber.trim() === "") {
			errors.push("Для продления освобождения свыше 15 дней требуется заполнить номер согласования.");
		} else {
			infoMessages.push(`Продление освобождения свыше 15 дней согласовано (Протокол ВК № ${form.vkProtocol.protocolNumber} от ${formatDateRu(form.vkProtocol.protocolDate)}).`);
		}
	} else {
		infoMessages.push(`Срок нетрудоспособности (${totalDays} дн.) находится в пределах 15-дневного лимита единоличной выдачи лечащим врачом.`);
	}

	if (form.closingCode === "31") {
		if (!form.workResumeDate) {
			errors.push('При статусе закрытия "31 - Приступить к работе" обязательно указание даты выхода на работу.');
		} else {
			const lastPeriod = form.periods[form.periods.length - 1];
			if (lastPeriod && lastPeriod.dateTo) {
				const expectedWorkResumeDate = addDays(lastPeriod.dateTo, 1);
				if (form.workResumeDate < expectedWorkResumeDate) {
					warnings.push(`Дата выхода на работу (${formatDateRu(form.workResumeDate)}) должна быть не ранее дня, следующего за окончанием последнего периода нетрудоспособности (${formatDateRu(expectedWorkResumeDate)}).`);
				}
			}
		}
	}

	if (form.closingCode === "32" && !form.nextElnNumber) {
		warnings.push('При статусе закрытия "32 - Продолжает болеть" рекомендуется указать номер нового листка нетрудоспособности.');
	}

	if (form.violationCode && !form.violationDate) {
		warnings.push("При отметке о нарушении режима необходимо указать дату фиксации нарушения.");
	}

	return { isValid: errors.length === 0, totalDays, isVkRequired, singleDoctorLimitExceeded, errors, warnings, infoMessages };
}
