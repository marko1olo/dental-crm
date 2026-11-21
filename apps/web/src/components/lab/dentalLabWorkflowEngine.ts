/**
 * dentalLabWorkflowEngine.ts — Движок зуботехнической лаборатории (ЗТЛ).
 * Канонический доменный слой ЗТЛ по Мандатам 8b, 8e, 8am, 8bm.
 * Декомпозирован и консолидирован с ./orderEngine/ (Мандат 8b).
 */

import { rublesToKopecks, kopecksToRubles } from "@dental/shared";
import {
	parseDateOnly,
	toIsoDate,
	formatRuDate,
	addWorkingDaysRu,
} from "./orderEngine/labDateUtils";

// ─── 1. ORTHOPEDIC WORK TYPES (DELEGATED TO ORDER ENGINE) ──────────────────────
export * from "./orderEngine/labOrthopedicWorkTypes";

// ─── 2. WORKFLOW STATUSES & STAGES ─────────────────────────────────────────────
export type LabWorkflowStatus =
	| "draft"
	| "sent_to_lab"
	| "fitting_scheduled"
	| "installed_completed"
	| "warranty_rework";

export type LabProductionStageId = LabWorkflowStatus;

export interface LabWorkflowStatusDefinition {
	readonly id: LabWorkflowStatus;
	readonly stepIndex: number;
	readonly nameRu: string;
	readonly shortTitleRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
	readonly badgeClass: string;
	readonly colorHex: string;
}

export const LAB_WORKFLOW_STATUSES: Record<LabWorkflowStatus, LabWorkflowStatusDefinition> = {
	draft: {
		id: "draft",
		stepIndex: 1,
		nameRu: "Черновик",
		shortTitleRu: "Черновик",
		descriptionRu: "Наряд-заказ первично оформлен ортопедом, уточняются параметры слепка и оттенок.",
		icon: "FileText",
		badgeClass: "badge-slate",
		colorHex: "#64748b",
	},
	sent_to_lab: {
		id: "sent_to_lab",
		stepIndex: 2,
		nameRu: "Отправлено в ЗТЛ",
		shortTitleRu: "В лаборатории",
		descriptionRu: "Слепки / цифровые сканы переданы курьеру и поступили в зуботехническую лабораторию.",
		icon: "Truck",
		badgeClass: "badge-blue",
		colorHex: "#3b82f6",
	},
	fitting_scheduled: {
		id: "fitting_scheduled",
		stepIndex: 3,
		nameRu: "Примерка назначена",
		shortTitleRu: "Примерка",
		descriptionRu: "Работа изготовлена ЗТЛ, назначена дата клинической примерки или сдачи в расписании приема.",
		icon: "Calendar",
		badgeClass: "badge-amber",
		colorHex: "#f59e0b",
	},
	installed_completed: {
		id: "installed_completed",
		stepIndex: 4,
		nameRu: "Сдано пациенту",
		shortTitleRu: "Сдано",
		descriptionRu: "Ортопедическая конструкция окончательно зафиксирована в полости рта пациента, наряд закрыт.",
		icon: "CheckCircle2",
		badgeClass: "badge-emerald",
		colorHex: "#10b981",
	},
	warranty_rework: {
		id: "warranty_rework",
		stepIndex: 5,
		nameRu: "Гарантийная переделка / рекламация",
		shortTitleRu: "Переделка / Рекламация",
		descriptionRu: "Работа направлена в ЗТЛ на гарантийную переделку или доработку.",
		icon: "RotateCcw",
		badgeClass: "badge-rose",
		colorHex: "#f43f5e",
	},
};

export const LAB_WORKFLOW_STATUS_ORDER: readonly LabWorkflowStatus[] = [
	"draft",
	"sent_to_lab",
	"fitting_scheduled",
	"installed_completed",
];

export const ALL_LAB_WORKFLOW_STATUSES: readonly LabWorkflowStatus[] = [
	...LAB_WORKFLOW_STATUS_ORDER,
	"warranty_rework",
];

export const LAB_PRODUCTION_STAGES = LAB_WORKFLOW_STATUSES;
export const LAB_PRODUCTION_STAGE_ORDER = LAB_WORKFLOW_STATUS_ORDER;

export function canAdvanceLabStage(
	currentStage: LabWorkflowStatus,
	targetStage: LabWorkflowStatus,
): boolean {
	if (currentStage === targetStage) return true;
	if (targetStage === "warranty_rework") {
		return currentStage === "installed_completed" || currentStage === "fitting_scheduled";
	}
	if (currentStage === "warranty_rework") {
		return targetStage === "sent_to_lab" || targetStage === "fitting_scheduled" || targetStage === "installed_completed";
	}
	const currentIndex = LAB_WORKFLOW_STATUSES[currentStage]?.stepIndex ?? 1;
	const targetIndex = LAB_WORKFLOW_STATUSES[targetStage]?.stepIndex ?? 1;
	return targetIndex >= 1 && targetIndex <= 5 && currentIndex >= 1;
}

export function getNextLabProductionStage(
	currentStage: LabWorkflowStatus,
): LabWorkflowStatus | null {
	if (currentStage === "warranty_rework") {
		return "sent_to_lab";
	}
	const currentIndex = LAB_WORKFLOW_STATUS_ORDER.indexOf(currentStage);
	if (currentIndex === -1 || currentIndex >= LAB_WORKFLOW_STATUS_ORDER.length - 1) {
		return null;
	}
	return LAB_WORKFLOW_STATUS_ORDER[currentIndex + 1] ?? null;
}

// ─── 3. TECHNOLOGICAL STAGES ───────────────────────────────────────────────────
export type CanonicalLabTechnologicalStageId =
	| "impression_scan"
	| "in_lab"
	| "ready_in_clinic"
	| "fitting_fixation";

export type LegacyLabTechnologicalStageId =
	| "waxup_cad"
	| "milling_framework"
	| "clinical_fitting"
	| "ceramic_layering"
	| "glaze_finish"
	| "patient_fixation";

export type LabTechnologicalStageId = CanonicalLabTechnologicalStageId | LegacyLabTechnologicalStageId;

export interface LabTechnologicalStageDefinition {
	id: LabTechnologicalStageId;
	stepIndex: number;
	stepNumber: number;
	nameRu: string;
	shortTitleRu: string;
	departmentRu: string;
	descriptionRu: string;
	icon: string;
	colorToken: string;
}

const IMPRESSION: LabTechnologicalStageDefinition = {
	id: "impression_scan",
	stepIndex: 1,
	stepNumber: 1,
	nameRu: "1. Скан/Слепок снят",
	shortTitleRu: "Скан/Слепок снят",
	departmentRu: "Клинический кабинет",
	descriptionRu: "Снятие оттисков или интраоральное цифровое 3D-сканирование.",
	icon: "scan",
	colorToken: "var(--brand-500, #3b82f6)",
};

const IN_LAB: LabTechnologicalStageDefinition = {
	id: "in_lab",
	stepIndex: 2,
	stepNumber: 2,
	nameRu: "2. В лаборатории",
	shortTitleRu: "В лаборатории",
	departmentRu: "Зуботехническая лаборатория",
	descriptionRu: "Изготовление ортопедической конструкции в лаборатории.",
	icon: "settings",
	colorToken: "var(--teal, #0d9488)",
};

const READY_CLINIC: LabTechnologicalStageDefinition = {
	id: "ready_in_clinic",
	stepIndex: 3,
	stepNumber: 3,
	nameRu: "3. Готово в клинике",
	shortTitleRu: "Готово в клинике",
	departmentRu: "Регистратура / Склад клиники",
	descriptionRu: "Работа доставлена в клинику, готова к примерке или фиксации.",
	icon: "truck",
	colorToken: "var(--warn, #f59e0b)",
};

const FITTING: LabTechnologicalStageDefinition = {
	id: "fitting_fixation",
	stepIndex: 4,
	stepNumber: 4,
	nameRu: "4. Примерка / Фиксация",
	shortTitleRu: "Примерка / Фиксация",
	departmentRu: "Клинический кабинет ортопеда",
	descriptionRu: "Клиническая примерка и окончательная фиксация конструкции.",
	icon: "check",
	colorToken: "var(--ok, #10b981)",
};

export const LAB_TECHNOLOGICAL_STAGES: Record<LabTechnologicalStageId, LabTechnologicalStageDefinition> = {
	impression_scan: IMPRESSION,
	in_lab: IN_LAB,
	ready_in_clinic: READY_CLINIC,
	fitting_fixation: FITTING,
	waxup_cad: IN_LAB,
	milling_framework: IN_LAB,
	ceramic_layering: IN_LAB,
	glaze_finish: IN_LAB,
	clinical_fitting: FITTING,
	patient_fixation: FITTING,
};

export const LAB_TECHNOLOGICAL_STAGE_ORDER: readonly LabTechnologicalStageId[] = [
	"impression_scan",
	"in_lab",
	"ready_in_clinic",
	"fitting_fixation",
];

// ─── 4. IMPLANTS & ABUTMENTS (DELEGATED TO ORDER ENGINE) ────────────────────────
export * from "./orderEngine/labImplantCatalogOptions";

// ─── 5. DATE UTILITIES (DELEGATED TO ORDER ENGINE) ─────────────────────────────
export const parseDateToMidnight = parseDateOnly;
export const formatDateToIsoDay = toIsoDate;
export const formatRussianDate = formatRuDate;
export { addWorkingDaysRu };

// ─── 6. FINANCIALS (EXACT KOPECKS ENGINE — MANDATE 8bm) ────────────────────────
export type WarrantyLiabilityType = "clinic_warranty" | "lab_defect" | "patient_fault";

export interface DentalLabWorkflowFinancials {
	readonly unitsCount: number;
	readonly pricePerUnitKopecks: number;
	readonly costPerUnitKopecks: number;
	readonly patientPriceTotalKopecks: number;
	readonly labCostKopecks: number;
	readonly labCostTotalKopecks: number;
	readonly clinicGrossMarginKopecks: number;
	readonly grossMarginPercent: number;
	readonly doctorPercent: number;
	readonly doctorWageBaseKopecks: number;
	readonly doctorWageKopecks: number;
	readonly clinicNetProfitKopecks: number;
	readonly patientPriceTotalRub: number;
	readonly labCostTotalRub: number;
	readonly clinicGrossMarginRub: number;
	readonly doctorWageRub: number;
	readonly clinicNetProfitRub: number;
	readonly isBalanced: boolean;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: WarrantyLiabilityType | undefined;
	readonly warrantyLiabilityKopecks?: number | undefined;
	readonly warrantyLiabilityRub?: number | undefined;
	readonly warrantyLiabilityLabelRu?: string | undefined;
}

export interface CalculateLabFinancialsParams {
	readonly unitsCount: number;
	readonly pricePerUnitKopecks?: number | undefined;
	readonly costPerUnitKopecks?: number | undefined;
	readonly pricePerUnitRub?: number | undefined;
	readonly costPerUnitRub?: number | undefined;
	readonly doctorPercent?: number | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: WarrantyLiabilityType | undefined;
}

export function calculateLabWorkflowFinancials(
	params: CalculateLabFinancialsParams,
): DentalLabWorkflowFinancials {
	const count = Math.max(1, Math.round(params.unitsCount || 1));
	const pricePerUnit = Math.max(
		0,
		Math.round(
			params.pricePerUnitKopecks ??
				(params.pricePerUnitRub ? rublesToKopecks(params.pricePerUnitRub) : 0),
		),
	);
	const costPerUnit = Math.max(
		0,
		Math.round(
			params.costPerUnitKopecks ??
				(params.costPerUnitRub ? rublesToKopecks(params.costPerUnitRub) : 0),
		),
	);
	const doctorPct = Math.max(0, Math.min(100, params.doctorPercent ?? 20));

	if (params.isWarrantyRework) {
		const liabilityType: WarrantyLiabilityType = params.warrantyLiabilityType || "clinic_warranty";
		const isLabDefect = liabilityType === "lab_defect";
		const effectiveLabCostKopecks = isLabDefect ? 0 : costPerUnit * count;
		const labelRu = isLabDefect
			? "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)"
			: "Гарантийные обязательства клиники";

		return {
			unitsCount: count,
			pricePerUnitKopecks: 0,
			costPerUnitKopecks: costPerUnit,
			patientPriceTotalKopecks: 0,
			labCostKopecks: effectiveLabCostKopecks,
			labCostTotalKopecks: effectiveLabCostKopecks,
			clinicGrossMarginKopecks: 0,
			grossMarginPercent: 0,
			doctorPercent: doctorPct,
			doctorWageBaseKopecks: 0,
			doctorWageKopecks: 0,
			clinicNetProfitKopecks: effectiveLabCostKopecks === 0 ? 0 : -effectiveLabCostKopecks,
			patientPriceTotalRub: 0,
			labCostTotalRub: kopecksToRubles(effectiveLabCostKopecks),
			clinicGrossMarginRub: 0,
			doctorWageRub: 0,
			clinicNetProfitRub: effectiveLabCostKopecks === 0 ? 0 : -kopecksToRubles(effectiveLabCostKopecks),
			isBalanced: true,
			isWarrantyRework: true,
			warrantyLiabilityType: liabilityType,
			warrantyLiabilityKopecks: effectiveLabCostKopecks,
			warrantyLiabilityRub: kopecksToRubles(effectiveLabCostKopecks),
			warrantyLiabilityLabelRu: labelRu,
		};
	}

	const patientPriceTotalKopecks = pricePerUnit * count;
	const labCostKopecks = costPerUnit * count;
	const clinicGrossMarginKopecks = Math.max(0, patientPriceTotalKopecks - labCostKopecks);
	const grossMarginPercent =
		patientPriceTotalKopecks > 0
			? Number(((clinicGrossMarginKopecks / patientPriceTotalKopecks) * 100).toFixed(1))
			: 0;

	const doctorWageBaseKopecks = clinicGrossMarginKopecks;
	const doctorWageKopecks = Math.round((doctorWageBaseKopecks * doctorPct) / 100);
	const clinicNetProfitKopecks = doctorWageBaseKopecks - doctorWageKopecks;

	return {
		unitsCount: count,
		pricePerUnitKopecks: pricePerUnit,
		costPerUnitKopecks: costPerUnit,
		patientPriceTotalKopecks,
		labCostKopecks,
		labCostTotalKopecks: labCostKopecks,
		clinicGrossMarginKopecks,
		grossMarginPercent,
		doctorPercent: doctorPct,
		doctorWageBaseKopecks,
		doctorWageKopecks,
		clinicNetProfitKopecks,
		patientPriceTotalRub: kopecksToRubles(patientPriceTotalKopecks),
		labCostTotalRub: kopecksToRubles(labCostKopecks),
		clinicGrossMarginRub: kopecksToRubles(clinicGrossMarginKopecks),
		doctorWageRub: kopecksToRubles(doctorWageKopecks),
		clinicNetProfitRub: kopecksToRubles(clinicNetProfitKopecks),
		isBalanced: doctorWageKopecks + clinicNetProfitKopecks === doctorWageBaseKopecks,
		isWarrantyRework: false,
	};
}

// ─── 7. DEADLINE ALERTS ────────────────────────────────────────────────────────
export type LabDeadlineStatus =
	| "ON_TRACK"
	| "APPROACHING"
	| "URGENT_TODAY"
	| "OVERDUE"
	| "VISIT_CONFLICT";

export interface LabDelayAlert {
	readonly hasAlert: boolean;
	readonly isDelayedAlert: boolean;
	readonly lab_delay_alert: boolean;
	readonly status: LabDeadlineStatus;
	readonly severity: "CRITICAL" | "WARNING" | "INFO" | "OK";
	readonly daysDifference: number;
	readonly expectedLabDateIso: string;
	readonly scheduledVisitDateIso?: string | undefined;
	readonly fittingDateIso?: string | undefined;
	readonly appointmentId?: string | undefined;
	readonly alertMessageRu: string;
	readonly detailedReasonRu: string;
	readonly recommendedActionRu: string;
}

export interface CheckLabDeadlineParams {
	readonly expectedLabDate: string | Date;
	readonly scheduledVisitDate?: string | Date | null | undefined;
	readonly fittingDate?: string | Date | null | undefined;
	readonly appointmentId?: string | null | undefined;
	readonly currentDate?: string | Date | undefined;
	readonly isInstalledOrCompleted?: boolean | undefined;
	readonly orderNumber?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly labName?: string | undefined;
}

export function checkLabDeadlineAndAlert(params: CheckLabDeadlineParams): LabDelayAlert {
	const expectedDate = parseDateOnly(params.expectedLabDate);
	const expectedIso = toIsoDate(expectedDate);
	const expectedRu = formatRuDate(expectedIso);
	const today = params.currentDate ? parseDateOnly(params.currentDate) : parseDateOnly(new Date());

	const visitDateRaw = params.fittingDate || params.scheduledVisitDate;
	const visitDate = visitDateRaw ? parseDateOnly(visitDateRaw) : null;
	const visitIso = visitDate ? toIsoDate(visitDate) : undefined;
	const visitRu = visitIso ? formatRuDate(visitIso) : "не назначен";
	const fittingIso = params.fittingDate ? toIsoDate(parseDateOnly(params.fittingDate)) : visitIso;
	const appointmentId = params.appointmentId || undefined;

	if (params.isInstalledOrCompleted) {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			lab_delay_alert: false,
			status: "ON_TRACK",
			severity: "OK",
			daysDifference: 0,
			expectedLabDateIso: expectedIso,
			scheduledVisitDateIso: visitIso,
			fittingDateIso: fittingIso,
			appointmentId,
			alertMessageRu: "Работа успешно зафиксирована в полости рта.",
			detailedReasonRu: "Заказ завершен.",
			recommendedActionRu: "Действий не требуется.",
		};
	}

	const daysToLab = Math.round((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	if (visitDate && expectedDate.getTime() > visitDate.getTime()) {
		const conflictDays = Math.round((expectedDate.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
		return {
			hasAlert: true,
			isDelayedAlert: true,
			lab_delay_alert: true,
			status: "VISIT_CONFLICT",
			severity: "CRITICAL",
			daysDifference: daysToLab,
			expectedLabDateIso: expectedIso,
			scheduledVisitDateIso: visitIso,
			fittingDateIso: fittingIso,
			appointmentId,
			alertMessageRu: `КРИТИЧЕСКИЙ КОНФЛИКТ: Готовность ЗТЛ (${expectedRu}) позже приема пациента (${visitRu}) на ${conflictDays} дн.!`,
			detailedReasonRu: `Пациент записан на прием ${visitRu}, а готовность только ${expectedRu}.`,
			recommendedActionRu: `Срочно свяжитесь с администратором для переноса визита на дату не ранее ${expectedRu}.`,
		};
	}

	if (daysToLab < 0) {
		const overdueDays = Math.abs(daysToLab);
		return {
			hasAlert: true,
			isDelayedAlert: true,
			lab_delay_alert: true,
			status: "OVERDUE",
			severity: "CRITICAL",
			daysDifference: daysToLab,
			expectedLabDateIso: expectedIso,
			scheduledVisitDateIso: visitIso,
			fittingDateIso: fittingIso,
			appointmentId,
			alertMessageRu: `ПРОСРОЧЕНО ЗТЛ: Заказ задерживается на ${overdueDays} дн. (план был: ${expectedRu})!`,
			detailedReasonRu: `Лаборатория не доставила конструкцию к нормативному сроку ${expectedRu}.`,
			recommendedActionRu: "Свяжитесь с курьерской службой или лабораторией для выяснения времени доставки.",
		};
	}

	if (daysToLab === 0) {
		return {
			hasAlert: true,
			isDelayedAlert: false,
			lab_delay_alert: false,
			status: "URGENT_TODAY",
			severity: "WARNING",
			daysDifference: 0,
			expectedLabDateIso: expectedIso,
			scheduledVisitDateIso: visitIso,
			fittingDateIso: fittingIso,
			appointmentId,
			alertMessageRu: `Сдача работы из ЗТЛ сегодня (${expectedRu})! Ожидается доставка курьером.`,
			detailedReasonRu: "Заказ должен поступить в клинику сегодня. Проверьте приемку.",
			recommendedActionRu: "Проконтролируйте приемку коробки с нарядом у администратора.",
		};
	}

	const isApproaching = daysToLab <= 2;
	return {
		hasAlert: false,
		isDelayedAlert: false,
		lab_delay_alert: false,
		status: isApproaching ? "APPROACHING" : "ON_TRACK",
		severity: isApproaching ? "INFO" : "OK",
		daysDifference: daysToLab,
		expectedLabDateIso: expectedIso,
		scheduledVisitDateIso: visitIso,
		fittingDateIso: fittingIso,
		appointmentId,
		alertMessageRu: isApproaching
			? `Срок сдачи ЗТЛ через ${daysToLab} дн. (${expectedRu}).`
			: `В графике. Срок готовности через ${daysToLab} дн. (${expectedRu}).`,
		detailedReasonRu: "Производственный цикл ЗТЛ протекает штатно.",
		recommendedActionRu: "Действий не требуется.",
	};
}

// ─── 8. RE-EXPORTS FROM MODEL & EXPORT ─────────────────────────────────────────
export * from "./dentalLabWorkflowModel";
export * from "./dentalLabWorkflowExport";
