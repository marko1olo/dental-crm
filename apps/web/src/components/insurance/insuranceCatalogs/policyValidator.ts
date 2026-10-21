/**
 * policyValidator.ts — Валидатор полисов ДМС с соблюдением Мандата 8e (автономия врача)
 */

import { getDmsInsurerById } from "./insurersCatalog.js";
import type { DmsPolicy } from "./types.js";

export function validateDmsPolicy(
	policy: Partial<DmsPolicy>,
	checkDate: string = new Date().toISOString().slice(0, 10),
	options: { isEmergency?: boolean } = {},
): {
	isValid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (options.isEmergency) {
		warnings.push(
			"Экстренный приём / Гарантия в пути: отсутствие номера полиса или истекший срок не блокируют оказание неотложной помощи.",
		);
		return { isValid: true, errors: [], warnings };
	}

	if (!policy.insurerId || !getDmsInsurerById(policy.insurerId)) {
		errors.push("Не выбрана или не найдена страховая компания в реестре ДМС.");
	}
	if (!policy.policyNumber || policy.policyNumber.trim().length < 3) {
		errors.push("Номер страхового полиса ДМС должен содержать не менее 3 символов.");
	}
	if (!policy.patientFullName || policy.patientFullName.trim().length < 3) {
		errors.push("Ф.И.О. застрахованного пациента обязательно для заполнения.");
	}

	if (!policy.validFrom || !policy.validTo) {
		errors.push("Не указан срок действия страхового полиса (даты начала и окончания).");
	} else {
		const from = new Date(policy.validFrom).getTime();
		const to = new Date(policy.validTo).getTime();
		const current = new Date(checkDate).getTime();

		if (Number.isNaN(from) || Number.isNaN(to)) {
			errors.push("Некорректный формат дат срока действия полиса.");
		} else if (from > to) {
			errors.push("Дата начала действия полиса не может быть позже даты окончания.");
		} else {
			if (current < from) {
				errors.push(`Срок действия полиса еще не наступил (действителен с ${policy.validFrom}).`);
			}
			if (current > to) {
				errors.push(`Срок действия полиса истек (${policy.validTo}). Требуется продление или гарантийное письмо.`);
			}
			const daysLeft = Math.floor((to - current) / (1000 * 60 * 60 * 24));
			if (daysLeft >= 0 && daysLeft <= 14) {
				warnings.push(`Внимание: срок действия полиса истекает через ${daysLeft} дн.`);
			}
		}
	}

	if (policy.liabilityLimitKopecks !== undefined && policy.liabilityLimitKopecks <= 0) {
		errors.push("Лимит ответственности по полису должен быть положительным числом.");
	}

	if (policy.franchiseType === "percent") {
		if (policy.franchisePercent === undefined || policy.franchisePercent < 0 || policy.franchisePercent > 100) {
			errors.push("Процент франшизы должен быть в диапазоне от 0% до 100%.");
		}
	} else if (policy.franchiseType === "fixed") {
		if (policy.franchiseFixedKopecks === undefined || policy.franchiseFixedKopecks < 0) {
			errors.push("Сумма фиксированной франшизы не может быть отрицательной.");
		}
	}

	return { isValid: errors.length === 0, errors, warnings };
}
