import type {
	AnestheticDrugId,
	AnestheticDrugInfo,
} from "../anesthesiaCatalog";
import type { AnesthesiaCalculationResult } from "../anesthesiaEngine";
import type { SafetyWarningState } from "./types";

export interface AnesthesiaSafetyAllergyHudProps {
	readonly patientWeightKg: number;
	readonly isCardioRisk: boolean;
	readonly takesBetaBlockers: boolean;
	readonly hasSulfiteAllergy: boolean;
	readonly hasBronchialAsthma: boolean;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly selectedDrugId: AnestheticDrugId;
	readonly selectedDrugInfo: AnestheticDrugInfo;
	readonly safetyWarning: SafetyWarningState | null;
	readonly onSelectDrug: (drugId: AnestheticDrugId) => void;
	readonly onDismissWarning: () => void;
	readonly onConfirmWarningOverride: (carpulesCount: number) => void;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
}

export interface AnesthesiaQuickBarActionsProps {
	readonly patientWeightKg: number;
	readonly selectedDrugId: AnestheticDrugId;
	readonly selectedDrugInfo: { readonly tradeNamesRu: readonly string[] };
	readonly singleCarpuleResult: AnesthesiaCalculationResult;
	readonly maxSafeCarpules: number;
	readonly sessionInjectedCarpules: number;
	readonly selectedCarpulesCount: number;
	readonly onChangeSelectedCarpulesCount: (count: number) => void;
	readonly onApplyCarpules: (
		count: number,
		bypassCheck?: boolean | undefined,
		overrideDrugId?: AnestheticDrugId | undefined,
	) => void;
	readonly onApplyUbistesinForte?: (() => void) | undefined;
	readonly onApplyUbistesin?: (() => void) | undefined;
	readonly onApplyStandardNormPreset: () => void;
	readonly onApplyUltracainForteCombined: () => void;
	readonly onApplySeptanestInfiltration: () => void;
	readonly onApplyInfiltrationArticaine200k?: (() => void) | undefined;
	readonly onApplyMandibularArticaine100k?: (() => void) | undefined;
	readonly onApplyScandonestCardio?: (() => void) | undefined;
	readonly onWriteoffAntishockKit?: (() => void) | undefined;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly onNurseQuickDisposal?: ((carpulesCount: number) => void) | undefined;
	readonly onNursePacketDisposal?: (() => void) | undefined;
	readonly onNurseSeptanestDisposal?: (() => void) | undefined;
	readonly onSelectDrug: (drugId: AnestheticDrugId) => void;
	readonly disabled?: boolean | undefined;
}
