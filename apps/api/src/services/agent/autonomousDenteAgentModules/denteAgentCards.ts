/**
 * denteAgentCards.ts — Action cards builder and clinical verdict formatter for DENTE Copilot.
 *
 * Mandate 8e: Doctor autonomy, zero blocking disabled buttons, 1-click apply.
 * Mandate 8x & 8ap: Clean clinical domain language.
 */

import crypto from "node:crypto";
import type {
	ActionCardType,
	ProactiveActionCard,
} from "./denteAgentExecution.js";
import type {
	CalculateTreatmentEstimateResult,
	CreateDentalLabOrderResult,
	BookChairsideAppointmentResult,
	DraftClinicalSoapDiaryResult,
	UpdateToothStatusResult,
	CalculateAnestheticDosageResult,
	GenerateInformedConsentIdsResult,
	CheckWarehouseSuppliesResult,
} from "../tools/denteAgentTools.js";
import type { ChairsideSafetyAlert } from "../chairsideSentinelEngine.js";

export function createAnestheticActionCard(
	anesthetic: CalculateAnestheticDosageResult,
): ProactiveActionCard {
	return {
		id: `card_anesth_${crypto.randomUUID().slice(0, 8)}`,
		type: "apply_anesthetic_dosage",
		title: `Анестезия: ${anesthetic.drugName} (${anesthetic.recommendedCarpules} карп.)`,
		description: `Масса тела: ${anesthetic.patientWeightKg} кг. Макс: ${anesthetic.maxCarpules} карп. по 1.7 мл (${anesthetic.isCardiovascularRisk ? "кардио-протокол без адреналина / 0.04 мг" : "физиологическая норма"}). Списание в 1 клик.`,
		payload: anesthetic as any,
		readyForOneClickApply: true,
		doctorAutonomyGuaranteed: true,
	};
}

export function createToothStatusActionCard(
	toothStatus: UpdateToothStatusResult,
	fdiToothFormatted: string,
): ProactiveActionCard {
	return {
		id: `card_tooth_${crypto.randomUUID().slice(0, 8)}`,
		type: "apply_tooth_status",
		title: `Обновление одонтограммы: зуб ${fdiToothFormatted}`,
		description: `Статус: ${toothStatus.newStatus} (код: ${toothStatus.statusCode}, поверхности: ${toothStatus.surfaces.join("") || "все"})`,
		payload: toothStatus as any,
		readyForOneClickApply: true,
		doctorAutonomyGuaranteed: true,
	};
}

export function createEstimateActionCard(
	estimate: CalculateTreatmentEstimateResult,
	resolvedDiscount: number,
): ProactiveActionCard {
	return {
		id: `card_est_${crypto.randomUUID().slice(0, 8)}`,
		type: "apply_treatment_estimate",
		title: `Смета услуг: ${estimate.formattedTotal} (скидка ${resolvedDiscount}%)`,
		description: `Услуг: ${estimate.items.length}. Итого: ${estimate.totalRub} ₽ (${estimate.totalKopecks} коп.). Применение без административных паролей.`,
		payload: estimate as any,
		readyForOneClickApply: true,
		doctorAutonomyGuaranteed: true,
	};
}

export function createSoapDiaryActionCard(
	diary: DraftClinicalSoapDiaryResult,
): ProactiveActionCard {
	return {
		id: `card_diary_${crypto.randomUUID().slice(0, 8)}`,
		type: "apply_soap_diary",
		title: `Дневник приёма: ${diary.soapDiary.assessment.icd10Name}`,
		description: `Готовый SOAP-протокол. Штамп «ЧЕРНОВИК». Редактирование в 1 клик.`,
		payload: diary.soapDiary as any,
		readyForOneClickApply: true,
		doctorAutonomyGuaranteed: true,
	};
}

export function createLabOrderActionCard(
	labOrder: CreateDentalLabOrderResult,
	workType: string,
	vitaShade: string,
	dueDate: string,
	fdiToothFormatted: string,
): ProactiveActionCard {
	return {
		id: `card_lab_${crypto.randomUUID().slice(0, 8)}`,
		type: "apply_lab_order",
		title: `Наряд ЗТЛ: ${workType} (${vitaShade.toUpperCase()})`,
		description: `Зуб: ${fdiToothFormatted}. Срок: ${dueDate}. Портальный токен создан.`,
		payload: labOrder as any,
		readyForOneClickApply: true,
		doctorAutonomyGuaranteed: true,
	};
}

export function createAppointmentActionCard(
	appointment: BookChairsideAppointmentResult,
	startsAt: string,
	reason: string,
): ProactiveActionCard {
	return {
		id: `card_app_${crypto.randomUUID().slice(0, 8)}`,
		type: "apply_appointment",
		title: `Запись на повторный прием: ${startsAt.slice(0, 16).replace("T", " ")}`,
		description: `Причина: ${reason}. Назначение ассистента опционально.`,
		payload: appointment as any,
		readyForOneClickApply: true,
		doctorAutonomyGuaranteed: true,
	};
}

export function createConsentActionCard(
	consent: GenerateInformedConsentIdsResult,
): ProactiveActionCard {
	return {
		id: `card_ids_${crypto.randomUUID().slice(0, 8)}`,
		type: "print_informed_consent",
		title: `Печать ИДС: ${consent.consentCode}`,
		description: `${consent.consentTitle}. Официальный бланк согласия. Готово к печати в 1 клик.`,
		payload: consent as any,
		readyForOneClickApply: true,
		doctorAutonomyGuaranteed: true,
	};
}

export function createWarehouseActionCard(
	warehouse: CheckWarehouseSuppliesResult,
): ProactiveActionCard {
	return {
		id: `card_warehouse_${crypto.randomUUID().slice(0, 8)}`,
		type: "check_warehouse_supplies",
		title: `Расходные материалы (автосписание): ${warehouse.itemName}`,
		description: warehouse.isSoftOverdraft
			? `Фоновое автосписание: списание под процедуру ${warehouse.currentStock} шт. (дефицит: ${warehouse.deficitCount} шт.). Приём врача не блокируется.`
			: `Фоновое автосписание: остаток ${warehouse.currentStock} шт. Списание выполняется бэкендом без участия врача.`,
		payload: warehouse as any,
		readyForOneClickApply: true,
		doctorAutonomyGuaranteed: true,
	};
}

export function formatTarsClinicalVerdict(params: {
	patientId: string;
	fdiToothFormatted: string;
	primaryIcd10: string;
	diagnosisName: string;
	safetyAlerts: ChairsideSafetyAlert[];
	anestheticResult?: CalculateAnestheticDosageResult | undefined;
	estimateResult?: CalculateTreatmentEstimateResult | undefined;
	resolvedDiscount: number;
	consentResult?: GenerateInformedConsentIdsResult | undefined;
	warehouseResult?: CheckWarehouseSuppliesResult | undefined;
	labOrderResult?: CreateDentalLabOrderResult | undefined;
	appointmentResult?: BookChairsideAppointmentResult | undefined;
	actionsCount: number;
}): string {
	const {
		patientId,
		fdiToothFormatted,
		primaryIcd10,
		diagnosisName,
		safetyAlerts,
		anestheticResult,
		estimateResult,
		resolvedDiscount,
		consentResult,
		warehouseResult,
		labOrderResult,
		appointmentResult,
		actionsCount,
	} = params;

	const criticalAlert = safetyAlerts.find((a) => a.severity === "critical");
	const warningAlert = safetyAlerts.find((a) => a.severity === "warning");

	let safetySummary = "Физиологическая норма. Противопоказаний нет.";
	if (criticalAlert) {
		safetySummary = `ВНИМАНИЕ: ${criticalAlert.title}. Рекомендовано: ${criticalAlert.safeAlternative}.`;
	} else if (warningAlert) {
		safetySummary = `ПРЕДОСТЕРЕЖЕНИЕ: ${warningAlert.title}. Альтернатива: ${warningAlert.safeAlternative}.`;
	}

	const totalDueStr = estimateResult?.formattedTotal || "0 ₽";
	return [
		`ВЕРДИКТ ГЛАВНОГО ВРАЧА DENTE (T.A.R.S. 100%):`,
		`• Пациент: ${patientId} | Зуб: ${fdiToothFormatted}.`,
		`• Клинический диагноз: ${primaryIcd10} ${diagnosisName}.`,
		`• Фармакологическая безопасность: ${safetySummary}`,
		anestheticResult
			? `• Анестезия: ${anestheticResult.drugName} — ${anestheticResult.recommendedCarpules} карп. (макс. ${anestheticResult.maxCarpules} карп. на ${anestheticResult.patientWeightKg} кг).`
			: null,
		`• Смета услуг: ${totalDueStr}${resolvedDiscount > 0 ? ` (скидка врача ${resolvedDiscount}%)` : ""}.`,
		`• Медицинская карта приёма: SOAP-дневник подготовлен со статусом ЧЕРНОВИК (врач правит только патологию).`,
		consentResult ? `• ИДС: ${consentResult.consentCode} (${consentResult.consentTitle}) — готово к печати.` : null,
		warehouseResult
			? `• Склад: ${warehouseResult.itemName} (${warehouseResult.isSoftOverdraft ? `мягкий овердрафт, дефицит ${warehouseResult.deficitCount} шт.` : `в наличии ${warehouseResult.currentStock} шт.`}) — приём не заблокирован.`
			: null,
		labOrderResult ? `• Наряд ЗТЛ: ${labOrderResult.workType} (${labOrderResult.vitaShade}) — портал готов.` : null,
		appointmentResult
			? `• Повторный визит: ${appointmentResult.startsAt.slice(0, 16).replace("T", " ")} — без обязательного ассистента.`
			: null,
		`• Готово к применению в 1 клик (${actionsCount} действий).`,
	]
		.filter(Boolean)
		.join("\n");
}
