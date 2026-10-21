import type {
	AnestheticDrugId,
	AnestheticDrugInfo,
	InjectionTechniqueId,
} from "../anesthesiaCatalog";
import type {
	AnesthesiaCalculationResult,
	AnesthesiaPatientMemoParams,
	AsaPhysicalStatus,
} from "../anesthesiaEngine";
import { formatAnesthesiaPatientMemo } from "../anesthesiaEngine";

export * from "./anesthesiaActionTypes";
export * from "./primaryAnestheticDrugsData";
export {
	type AnesthesiaCalculationResult,
	type AnesthesiaPatientMemoParams,
	type AnestheticDrugId,
	type AnestheticDrugInfo,
	type AsaPhysicalStatus,
	formatAnesthesiaPatientMemo,
	type InjectionTechniqueId,
};

export interface AnesthesiaQuickBarProps {
	patientId?: string | undefined;
	visitId?: string | undefined;
	patientWeightKg?: number | undefined;
	patientAgeYears?: number | undefined;
	hasCardiovascularRisk?: boolean | undefined;
	hasHypertension?: boolean | undefined;
	hasCardiacArrhythmia?: boolean | undefined;
	hasIschemicHeartDisease?: boolean | undefined;
	hasMyocardialInfarctionHistory?: boolean | undefined;
	takesBetaBlockers?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	isPregnantOrLactating?: boolean | undefined;
	hasLidocaineAllergy?: boolean | undefined;
	hasArticaineAllergy?: boolean | undefined;
	targetToothNumberFdi?: number | string | undefined;
	onApplyAnesthesia?:
		| ((diaryText: string, result: AnesthesiaCalculationResult) => void)
		| undefined;
	onDisposalCarpules?:
		| ((carpulesCount: number, drugId?: AnestheticDrugId | undefined) => void)
		| undefined;
	onOpenEmergencyProtocol?: (() => void) | undefined;
	servicePriceRub?: number | undefined;
	disabled?: boolean | undefined;
}

export interface SafetyWarningState {
	readonly title: string;
	readonly text: string;
	readonly carpulesCount?: number | undefined;
	readonly suggestedDrugId?: AnestheticDrugId | undefined;
}

export interface AnestheticDrugSelectorProps {
	readonly selectedDrugId: AnestheticDrugId;
	readonly onSelectDrug: (drugId: AnestheticDrugId) => void;
	readonly isCardioRisk: boolean;
	readonly hasSulfiteAllergy: boolean;
	readonly hasBronchialAsthma: boolean;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly disabled?: boolean | undefined;
}

export interface AnesthesiaMethodSelectorProps {
	readonly techniqueId: InjectionTechniqueId;
	readonly onSelectTechnique: (techniqueId: InjectionTechniqueId) => void;
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly disabled?: boolean | undefined;
}
