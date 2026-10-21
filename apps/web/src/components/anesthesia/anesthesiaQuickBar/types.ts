import type { AnestheticDrugId, AnestheticDrugInfo, InjectionTechniqueId } from '../anesthesiaCatalog';
import {
	formatAnesthesiaPatientMemo,
	type AnesthesiaPatientMemoParams,
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
} from '../anesthesiaEngine';

export * from './primaryAnestheticDrugsData';
export {
	formatAnesthesiaPatientMemo,
	type AnesthesiaPatientMemoParams,
	type AnestheticDrugId,
	type AnestheticDrugInfo,
	type InjectionTechniqueId,
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
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
	onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	onDisposalCarpules?: ((carpulesCount: number, drugId?: AnestheticDrugId | undefined) => void) | undefined;
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
	readonly onApplyCarpules: (count: number, bypassCheck?: boolean | undefined, overrideDrugId?: AnestheticDrugId | undefined) => void;
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
