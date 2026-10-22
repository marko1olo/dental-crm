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

export {
	type AnesthesiaCalculationResult,
	type AnesthesiaPatientMemoParams,
	type AnestheticDrugId,
	type AnestheticDrugInfo,
	type AsaPhysicalStatus,
	formatAnesthesiaPatientMemo,
	type InjectionTechniqueId,
};

export {
	PRIMARY_ANESTHETIC_DRUGS,
	WEIGHT_PRESETS,
	WEIGHT_QUICK_PRESETS,
	type AnesthesiaQuickBarProps,
} from "../AnesthesiaQuickBar";

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
