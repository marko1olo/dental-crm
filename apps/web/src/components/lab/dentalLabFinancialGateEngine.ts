/**
 * dentalLabFinancialGateEngine.ts — Финансовый шлюз наряд-заказов в зуботехническую лабораторию (ЗТЛ).
 * 
 * НОРМАТИВНАЯ И ФИНАНСОВАЯ ЛОГИКА:
 * • Защита клиники от неликвидных лабораторных затрат (CAD/CAM фрезерование, диоксид циркония, элайнеры).
 * • Порог блокировки: если по текущему ортопедическому этапу оплачено < 50% сметы (или депозита недостаточно),
 *   отправка наряда в лабораторию блокируется.
 * • Исключение: персональный оверрайд (разрешение) Главного врача клиники («Отправить под ответственность главврача»).
 * • Интеграция с 1-клик банковской рассрочкой (Сбер / Т-Банк / Подели) для мгновенного закрытия аванса пациентом.
 */

import {
	type Kopecks,
	formatKopecksRu,
	parseKopecks,
	percentageOfKopecks,
	rublesToKopecks,
} from "@dental/shared";

export type DentalLabGateStatus =
	| "CLEARED" // Оплачено >= 50%, наряд разрешен к отправке в ЗТЛ
	| "BLOCKED_REQUIRES_ADVANCE" // Оплачено < 50%, требуется внесение аванса или рассрочка
	| "CHIEF_DOCTOR_OVERRIDE"; // Одобрено главным врачом под личную ответственность

export interface DentalLabFinancialGateParams {
	readonly stageTotalKopecks: Kopecks;
	readonly paidKopecks: Kopecks;
	readonly availableDepositKopecks?: Kopecks | undefined;
	readonly labOrderPriceKopecks?: Kopecks | undefined;
	readonly minAdvancePercent?: number | undefined; // По умолчанию 50%
	readonly chiefDoctorOverride?: {
		readonly authorized: boolean;
		readonly doctorName: string;
		readonly timestampIso: string;
		readonly reason?: string | undefined;
	} | undefined;
}

export interface DentalLabFinancialGateResult {
	readonly isGatePassed: boolean;
	readonly gateStatus: DentalLabGateStatus;
	readonly minAdvancePercent: number;
	readonly stageTotalKopecks: Kopecks;
	readonly totalPaidAndCoveredKopecks: Kopecks;
	readonly requiredAdvanceKopecks: Kopecks;
	readonly missingAdvanceKopecks: Kopecks;
	readonly missingAdvanceRub: number;
	readonly paidPercent: number;
	readonly warningMessageRu: string;
	readonly detailedReasonRu: string;
	readonly chiefDoctorOverrideAuthorized: boolean;
	readonly overrideMeta?: {
		readonly doctorName: string;
		readonly timestampIso: string;
		readonly reason?: string | undefined;
	} | undefined;
}

/**
 * Проверка финансового шлюза ЗТЛ
 */
export function checkDentalLabFinancialGate(
	params: DentalLabFinancialGateParams,
): DentalLabFinancialGateResult {
	const minAdvancePercent = params.minAdvancePercent ?? 50;
	const stageTotal = Math.max(0, params.stageTotalKopecks);
	const directPaid = Math.max(0, params.paidKopecks);
	const deposit = Math.max(0, params.availableDepositKopecks ?? 0);

	// Суммарное покрытие: внесенный аванс по этапу + свободный депозит пациента
	const totalCovered = directPaid + deposit;

	// Требуемый аванс (по умолчанию 50% от общей стоимости этапа или стоимости наряда)
	const baseAmountKopecks = stageTotal > 0 ? stageTotal : (params.labOrderPriceKopecks ?? 0);
	const requiredAdvanceKopecks = percentageOfKopecks(
		baseAmountKopecks,
		minAdvancePercent * 100,
	);

	const missingAdvanceKopecks = Math.max(0, requiredAdvanceKopecks - totalCovered);
	const missingAdvanceRub = Math.ceil(missingAdvanceKopecks / 100);

	const paidPercent =
		baseAmountKopecks > 0
			? Math.min(100, Math.round((totalCovered / baseAmountKopecks) * 100))
			: 100;

	// Проверка оверрайда главврача
	const isOverrideActive = Boolean(
		params.chiefDoctorOverride && params.chiefDoctorOverride.authorized,
	);

	let gateStatus: DentalLabGateStatus;
	let isGatePassed: boolean;

	if (totalCovered >= requiredAdvanceKopecks || baseAmountKopecks === 0) {
		gateStatus = "CLEARED";
		isGatePassed = true;
	} else if (isOverrideActive) {
		gateStatus = "CHIEF_DOCTOR_OVERRIDE";
		isGatePassed = true;
	} else {
		gateStatus = "BLOCKED_REQUIRES_ADVANCE";
		isGatePassed = false;
	}

	const formattedMissingAdvance = formatKopecksRu(missingAdvanceKopecks);
	const formattedRequiredAdvance = formatKopecksRu(requiredAdvanceKopecks);

	const warningMessageRu =
		gateStatus === "BLOCKED_REQUIRES_ADVANCE"
			? `Внимание: этап не оплачен. Требуется аванс ${formattedMissingAdvance}. Отправить наряд под ответственность главврача?`
			: gateStatus === "CHIEF_DOCTOR_OVERRIDE"
				? `Наряд ЗТЛ отправлен в производство под личную ответственность Главного врача (${params.chiefDoctorOverride?.doctorName || "Главврач"}).`
				: "Финансовый контроль пройден: аванс за этап внесен в полном объеме.";

	const detailedReasonRu =
		gateStatus === "BLOCKED_REQUIRES_ADVANCE"
			? `По этапу внесено ${paidPercent}% (${formatKopecksRu(totalCovered)}) из требуемых ${minAdvancePercent}% (${formattedRequiredAdvance}). Заказ дорогостоящих конструкций CAD/CAM без аванса влечет кассовый разрыв клиники.`
			: gateStatus === "CHIEF_DOCTOR_OVERRIDE"
				? `Авторизован оверрайд главного врача: ${params.chiefDoctorOverride?.doctorName} в ${params.chiefDoctorOverride?.timestampIso?.slice(0, 16) || "сегодня"}. Недостающий аванс: ${formattedMissingAdvance}.`
				: `Внесено ${paidPercent}% (${formatKopecksRu(totalCovered)}), что полностью покрывает лабораторный депозит этапа (${formattedRequiredAdvance}).`;

	return {
		isGatePassed,
		gateStatus,
		minAdvancePercent,
		stageTotalKopecks: baseAmountKopecks,
		totalPaidAndCoveredKopecks: totalCovered,
		requiredAdvanceKopecks,
		missingAdvanceKopecks,
		missingAdvanceRub,
		paidPercent,
		warningMessageRu,
		detailedReasonRu,
		chiefDoctorOverrideAuthorized: isOverrideActive,
		...(isOverrideActive && params.chiefDoctorOverride
			? {
					overrideMeta: {
						doctorName: params.chiefDoctorOverride.doctorName,
						timestampIso: params.chiefDoctorOverride.timestampIso,
						reason: params.chiefDoctorOverride.reason,
					},
				}
			: {}),
	};
}

/**
 * Создание записи об оверрайде Главным врачом
 */
export function createChiefDoctorOverride(
	doctorName: string,
	reason = "Согласовано с главврачом клиники ввиду срочности клинического этапа",
): {
	readonly authorized: boolean;
	readonly doctorName: string;
	readonly timestampIso: string;
	readonly reason: string;
} {
	return {
		authorized: true,
		doctorName: doctorName.trim() || "Главный врач клиники",
		timestampIso: new Date().toISOString(),
		reason: reason.trim(),
	};
}
