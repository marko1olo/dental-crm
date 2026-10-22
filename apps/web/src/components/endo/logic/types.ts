import type React from "react";
import type {
	EndoCanalData,
	EndoToothClinicalData,
	EndoTreatmentBillingEstimateResult,
} from "@dental/shared";
import type { EndoStageStamp } from "../endoCanalConstants";

export interface UseEndoCanalLogicProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly patientId?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRotarySystem?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly onInsertToProtocol?: ((protocolText: string, canals: EndoCanalData[]) => void) | undefined;
	readonly onSaveCanals?: ((canals: EndoCanalData[], clinicalData: EndoToothClinicalData) => Promise<void> | void) | undefined;
	readonly onSave?: ((savedCanals: EndoCanalData[], noteText?: string) => void) | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
}

export interface UseEndoCanalLogicReturn {
	activeTooth: number;
	toothAnatomicalName: string;
	canals: EndoCanalData[];
	irrigation: string;
	setIrrigation: React.Dispatch<React.SetStateAction<string>>;
	rotarySystem: string;
	setRotarySystem: React.Dispatch<React.SetStateAction<string>>;
	radiologyControl: string;
	setRadiologyControl: React.Dispatch<React.SetStateAction<string>>;
	copied: boolean;
	isSaving: boolean;
	isLoadingFromDb: boolean;
	stageStamp: EndoStageStamp;
	setStageStamp: React.Dispatch<React.SetStateAction<EndoStageStamp>>;
	isPresetsMenuOpen: boolean;
	setIsPresetsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isFooterMenuOpen: boolean;
	setIsFooterMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	suggestedCanalNames: string[];
	generatedProtocolText: string;
	handleSwitchTooth: (newTooth: number) => void;
	handleCanalChange: (id: string, field: keyof EndoCanalData, value: string | number) => void;
	handleCanalLengthInputChange: (id: string, rawVal: string) => void;
	handleAdjustCanalLength: (id: string, delta: number) => void;
	handleToggleCanalObliteration: (id: string) => void;
	handleSetCanalLength: (id: string, length: number) => void;
	handleAddCanal: () => void;
	handleRemoveCanal: (id: string) => void;
	handleResetToDefaults: () => void;
	handleApplyExpressApicalPreset: () => void;
	handleApplyCaOh2Protocol: () => void;
	handleApplyPulpitisPreset: () => void;
	handleApplyPrimaryEndoPreset: () => void;
	handleApplyRetreatmentPreset: () => void;
	handleApplyObturationPreset: () => void;
	handleApplyPulpitisObturationPreset: () => void;
	handleApplyPeriodontitisDestructivePreset: () => void;
	handleApplyStandardProtocol: () => void;
	handleApplyAnatomicalLengths: () => void;
	handleSaveCanalsOnly: () => Promise<void>;
	handleInsertToProtocol: () => Promise<void>;
	handleCopyText: () => Promise<void>;
	handleCopyPatientMemo: () => Promise<void>;
	handlePrintWorksheet: () => void;
	renderIsoColorBadge: (mafOption: string) => React.ReactNode;
	billingEstimate: EndoTreatmentBillingEstimateResult;
}
