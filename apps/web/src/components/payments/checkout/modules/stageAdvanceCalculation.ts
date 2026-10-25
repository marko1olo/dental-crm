import type {
	StageAdvanceCalculation,
	StagePaymentMode,
	TreatmentPlanStageOption,
} from "./types.js";

export const DEFAULT_TREATMENT_STAGES: readonly TreatmentPlanStageOption[] = [
	{
		id: "full_plan",
		titleRu: "Весь план лечения (100%)",
		stageKind: "full",
		amountKop: 9400000,
		itemsCount: 3,
	},
	{
		id: "stage_1_therapy",
		titleRu: "Этап 1: Терапия (санация)",
		stageKind: "stage_1_therapy",
		amountKop: 400000,
		itemsCount: 1,
	},
	{
		id: "stage_2_surgery",
		titleRu: "Этап 2: Хирургия (имплантация)",
		stageKind: "stage_2_surgery",
		amountKop: 4500000,
		itemsCount: 1,
	},
	{
		id: "stage_3_orthopedics",
		titleRu: "Этап 3: Ортопедия (протезирование)",
		stageKind: "stage_3_orthopedics",
		amountKop: 4500000,
		itemsCount: 1,
	},
];

export function calculateStageAdvanceAmount(
	stageAmountKop: number,
	mode: StagePaymentMode = "full",
	advanceAlreadyPaidKop = 0,
): StageAdvanceCalculation {
	const sanitizedStageKop = Number.isFinite(stageAmountKop) ? Math.max(0, Math.round(stageAmountKop)) : 0;
	const sanitizedPrevPaidKop = Number.isFinite(advanceAlreadyPaidKop) ? Math.max(0, Math.round(advanceAlreadyPaidKop)) : 0;

	if (mode === "advance_30") {
		const requiredAmountKop = Math.round((sanitizedStageKop * 30) / 100);
		return {
			mode: "advance_30",
			totalStageAmountKop: sanitizedStageKop,
			requiredAmountKop,
			advanceOffsetTag1215Kop: 0,
			remainingDueKop: Math.max(0, sanitizedStageKop - requiredAmountKop),
			ffdTag1214: 2,
			ffdTag1214NameRu: "Частичная предоплата (30%)",
			ffdTag1212: 4,
			ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
			isAdvanceReceipt: true,
			isAdvanceOffsetReceipt: false,
		};
	}

	if (mode === "advance_50") {
		const requiredAmountKop = Math.round((sanitizedStageKop * 50) / 100);
		return {
			mode: "advance_50",
			totalStageAmountKop: sanitizedStageKop,
			requiredAmountKop,
			advanceOffsetTag1215Kop: 0,
			remainingDueKop: Math.max(0, sanitizedStageKop - requiredAmountKop),
			ffdTag1214: 2,
			ffdTag1214NameRu: "Частичная предоплата (50%)",
			ffdTag1212: 4,
			ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
			isAdvanceReceipt: true,
			isAdvanceOffsetReceipt: false,
		};
	}

	if (mode === "advance_offset_tag1215") {
		const advanceOffsetTag1215Kop = Math.min(sanitizedPrevPaidKop, sanitizedStageKop);
		const requiredAmountKop = Math.max(0, sanitizedStageKop - advanceOffsetTag1215Kop);
		return {
			mode: "advance_offset_tag1215",
			totalStageAmountKop: sanitizedStageKop,
			requiredAmountKop,
			advanceOffsetTag1215Kop,
			remainingDueKop: 0,
			ffdTag1214: 4,
			ffdTag1214NameRu: "Полный расчет с зачетом ранее внесенного аванса",
			ffdTag1212: 4,
			ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
			isAdvanceReceipt: false,
			isAdvanceOffsetReceipt: true,
		};
	}

	return {
		mode: "full",
		totalStageAmountKop: sanitizedStageKop,
		requiredAmountKop: sanitizedStageKop,
		advanceOffsetTag1215Kop: 0,
		remainingDueKop: 0,
		ffdTag1214: 4,
		ffdTag1214NameRu: "Полный расчет (100%)",
		ffdTag1212: 4,
		ffdTag1212NameRu: "Медицинская услуга",
		isAdvanceReceipt: false,
		isAdvanceOffsetReceipt: false,
	};
}
