import type {
	AnestheticDrugId,
	InjectionTechniqueId,
	NeedleGaugeType,
} from "../anesthesiaCatalog";
import {
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
	calculateAnesthesiaSafety,
} from "../anesthesiaEngine";
import { persistAnesthesiaLog } from "./anesthesiaApiPersistence";

export interface DispatchPresetParams {
	drugId: AnestheticDrugId;
	techniqueId: InjectionTechniqueId;
	needleType: NeedleGaugeType;
	carpulesCount?: number;
	effectiveWeight: number;
	patientAgeYears: number;
	asaStatus: AsaPhysicalStatus;
	isCardioRisk: boolean;
	hasCardiovascularRisk?: boolean;
	hasSulfiteAllergy?: boolean;
	hasBronchialAsthma?: boolean;
	isPregnantOrLactating?: boolean;
	targetToothNumberFdi?: number | string | undefined;
	patientId?: string | undefined;
	visitId?: string | undefined;
	patientWeightKg: number;
	diaryText: string;
	toastText: string;
	showQuickToast: (msg: string, durationMs?: number) => void;
	onApplyAnesthesia?:
		| ((diaryEntry: string, result: AnesthesiaCalculationResult) => void)
		| undefined;
}

export function dispatchAnesthesiaPreset(params: DispatchPresetParams): void {
	const result = calculateAnesthesiaSafety({
		drugId: params.drugId,
		carpulesCount: params.carpulesCount ?? 1.0,
		patientWeightKg: params.effectiveWeight,
		patientAgeYears: params.patientAgeYears,
		asaStatus: params.asaStatus,
		hasCardiovascularRisk: Boolean(params.hasCardiovascularRisk),
		hasSulfiteAllergy: Boolean(params.hasSulfiteAllergy),
		hasBronchialAsthma: Boolean(params.hasBronchialAsthma),
		isPregnantOrLactating: Boolean(params.isPregnantOrLactating),
		techniqueId: params.techniqueId,
		needleType: params.needleType,
		targetToothNumberFdi: params.targetToothNumberFdi,
		aspirationNegativeConfirmed: true,
	});

	persistAnesthesiaLog({
		patientId: params.patientId,
		visitId: params.visitId,
		drugId: params.drugId,
		techniqueId: params.techniqueId,
		carpulesCount: params.carpulesCount ?? 1.0,
		patientWeightKg: params.patientWeightKg,
		patientAgeYears: params.patientAgeYears,
		isCardioRisk: params.isCardioRisk,
		targetToothNumberFdi: params.targetToothNumberFdi,
		diaryEntry: params.diaryText,
	});

	params.onApplyAnesthesia?.(params.diaryText, result);
	params.showQuickToast(params.toastText, 3500);
}
