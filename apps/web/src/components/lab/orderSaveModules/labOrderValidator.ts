/**
 * labOrderValidator.ts — Клиническая и регламентная валидация зуботехнического наряда ЗТЛ.
 *
 * Инварианты:
 * 1. Проверка заполнения зубов по формуле FDI (11..48) либо выбор челюсти (JawScope).
 * 2. Проверка шкалы цвета VITA (Classical A1-D4, Bleach OM/BL, 3D-Master).
 * 3. Проверка сроков и дедлайнов: предотвращение назначения примерки раньше готовности ЗТЛ.
 * 4. Связка с SSOT SLA риска (@dental/shared evaluateLabSlaRisk).
 */

import {
	type LabSlaRiskLevel,
	evaluateLabSlaRisk,
	type AutonomousLabOrder,
} from "@dental/shared";
import type {
	LabOrderValidationInput,
	LabOrderValidationResult,
} from "./labOrderValidationTypes";

export type { LabOrderValidationInput, LabOrderValidationResult };

// Допустимые классические (A1-D4), отбеливающие (BL1-4, OM1-3) и 3D-Master (1M1-5M3) оттенки VITA
const VALID_VITA_REGEX = /^([A-D][1-4](\.5)?|BL[1-4]|OM[1-3]|[1-5][MLR][1-3](\.5)?)$/i;

export function isValidVitaShade(shade?: string | null): boolean {
	if (!shade) return false;
	const trimmed = shade.trim();
	if (trimmed.length < 2) return false;
	return VALID_VITA_REGEX.test(trimmed);
}

export function validateLabOrderInput(input: LabOrderValidationInput): LabOrderValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// 1. Пациент и врач
	if (!input.patientName || input.patientName.trim().length === 0) {
		errors.push("Не указано Ф.И.О. пациента");
	}

	// 2. Зубы или челюсть
	const hasTeeth = input.selectedTeeth && input.selectedTeeth.length > 0;
	const hasJawScope = Boolean(input.jawScope);
	if (!hasTeeth && !hasJawScope) {
		errors.push("Не выбраны зубы по формуле FDI и не указана челюсть наряда");
	}

	if (hasTeeth) {
		for (const tooth of input.selectedTeeth) {
			if (tooth < 11 || tooth > 48) {
				errors.push(`Недопустимый номер зуба FDI: ${tooth} (допустимы 11..48)`);
			}
		}
	}

	// 3. Конструкция и материал
	if (!input.constructionType || input.constructionType.trim().length === 0) {
		errors.push("Не указан тип ортопедической конструкции");
	}
	if (!input.material || input.material.trim().length === 0) {
		errors.push("Не указан материал реставрации");
	}

	// 4. Оттенок VITA
	if (!input.shadeFinal || input.shadeFinal.trim().length === 0) {
		warnings.push("Не указан оттенок VITA (по умолчанию будет использован цвет A2)");
	} else if (!isValidVitaShade(input.shadeFinal)) {
		warnings.push(`Оттенок '${input.shadeFinal}' не является стандартным кодом VITA`);
	}

	// 5. Дедлайн и коллизии примерки
	let slaRisk: LabSlaRiskLevel = "safe";
	if (input.dueDate) {
		const labDate = new Date(input.dueDate);
		if (Number.isNaN(labDate.getTime())) {
			errors.push("Некорректная дата готовности ЗТЛ");
		} else {
			const visitDateStr = input.scheduledVisitDate || input.ceramicTrialDate || input.frameworkTrialDate;
			if (visitDateStr) {
				const visitDate = new Date(visitDateStr);
				if (!Number.isNaN(visitDate.getTime())) {
					if (visitDate < labDate) {
						warnings.push("Дата визита на примерку назначена раньше даты готовности заказа из ЗТЛ!");
					}
					// Оценка SLA риска через каноническую функцию
					const simulatedOrder: Partial<AutonomousLabOrder> = {
						currentStage: "created",
						patientAppointmentAt: visitDate.toISOString(),
					};
					slaRisk = evaluateLabSlaRisk(simulatedOrder as AutonomousLabOrder, labDate);
				}
			}
		}
	}

	// 6. Стоимость
	if (input.totalLabPriceRub !== undefined && input.totalLabPriceRub < 0) {
		errors.push("Стоимость наряда не может быть отрицательной");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		slaRisk,
	};
}
