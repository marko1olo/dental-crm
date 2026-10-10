import type {
	AnestheticDrugId,
	InjectionTechniqueId,
} from "../anesthesiaCatalog";
import {
	formatAnesthesiaPatientMemo,
	type AnesthesiaPatientMemoParams,
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
} from "../anesthesiaEngine";

export {
	formatAnesthesiaPatientMemo,
	type AnesthesiaPatientMemoParams,
	type AnestheticDrugId,
	type InjectionTechniqueId,
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
};

export interface AnesthesiaQuickBarProps {
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
	targetToothNumberFdi?: number | string | undefined;
	onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	onDisposalCarpules?: ((carpulesCount: number, drugId: AnestheticDrugId) => void) | undefined;
	onOpenEmergencyProtocol?: (() => void) | undefined;
	onOpenAspirationJournal?: (() => void) | undefined;
	disabled?: boolean | undefined;
}

export const WEIGHT_QUICK_PRESETS: readonly number[] = [15, 30, 50, 70, 85, 100];
export const WEIGHT_PRESETS: readonly number[] = WEIGHT_QUICK_PRESETS;

export interface PrimaryAnestheticDrug {
	readonly id: AnestheticDrugId;
	readonly labelRu: string;
	readonly subLabelRu: string;
	readonly activeSubstanceRu: string;
	readonly vasoRatio: string;
	readonly isAdrenalineFree: boolean;
	readonly isCardioRecommended: boolean;
}

export const PRIMARY_ANESTHETIC_DRUGS: readonly PrimaryAnestheticDrug[] = [
	{
		id: "articaine_1_200k",
		labelRu: "Артикаин 1:200 000 (Ультракаин Д-С)",
		subLabelRu: "Артикаин 4% • Щадящий адреналин • МДД 7 мг/кг",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000",
		vasoRatio: "1:200 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "articaine_1_100k",
		labelRu: "Артикаин 1:100 000 (Ультракаин Форте / Септанест)",
		subLabelRu: "Артикаин 4% • Глубокая анестезия • МДД 7 мг/кг",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000",
		vasoRatio: "1:100 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "mepivacaine_plain",
		labelRu: "Мепивакаин 3% (Скандонест 3% без адреналина)",
		subLabelRu: "Мепивакаин 3% • Кардио-защита • Без сульфитов • МДД 4.4 мг/кг",
		activeSubstanceRu: "Мепивакаин 3% (чистый)",
		vasoRatio: "Без адреналина",
		isAdrenalineFree: true,
		isCardioRecommended: true,
	},
];

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
	readonly selectedDrugId: AnestheticDrugId;
	readonly selectedDrugInfo: {
		readonly isAdrenalineFree: boolean;
		readonly tradeNamesRu: readonly string[];
	};
	readonly safetyWarning: SafetyWarningState | null;
	readonly onSelectDrug: (drugId: AnestheticDrugId) => void;
	readonly onDismissWarning: () => void;
	readonly onConfirmWarningOverride: (carpulesCount: number) => void;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly onOpenAspirationJournal?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
}

export interface AnesthesiaQuickBarActionsProps {
	readonly patientWeightKg: number;
	readonly selectedDrugId: AnestheticDrugId;
	readonly selectedDrugInfo: {
		readonly tradeNamesRu: readonly string[];
	};
	readonly singleCarpuleResult: AnesthesiaCalculationResult;
	readonly maxSafeCarpules: number;
	readonly sessionInjectedCarpules: number;
	readonly selectedCarpulesCount: number;
	readonly onChangeSelectedCarpulesCount: (count: number) => void;
	readonly onApplyCarpules: (
		carpulesCount: number,
		bypassCheck?: boolean,
		overrideDrugId?: AnestheticDrugId,
	) => void;
	readonly onApplyStandardNormPreset: () => void;
	readonly onApplyUltracainForteCombined: () => void;
	readonly onApplySeptanestInfiltration: () => void;
	readonly onNurseQuickDisposal: (carpulesCount?: number) => void;
	readonly onNursePacketDisposal: () => void;
	readonly onNurseSeptanestDisposal: () => void;
	readonly onSelectDrug: (drugId: AnestheticDrugId) => void;
	readonly disabled?: boolean | undefined;
}
