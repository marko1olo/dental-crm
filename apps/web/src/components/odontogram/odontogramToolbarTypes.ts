import type { OdontogramViewMode } from "@dental/shared";
import type React from "react";
import type { ToothState } from "./ToothChart";

export interface OdontogramToolbarProps {
	activeMode: OdontogramViewMode;
	handleModeSwitch: (mode: OdontogramViewMode) => void;
	onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	handleQuickTriggerState: (state: ToothState) => void;
	activeStampTool: ToothState | null;
	setActiveStampTool: React.Dispatch<React.SetStateAction<ToothState | null>>;
	onDentitionModeChange?:
		| ((mode: "adult" | "pediatric" | "mixed") => void)
		| undefined;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	onInvertSelection?: (() => void) | undefined;
	onClearSelection?: (() => void) | undefined;
	pediatricMode?: boolean | undefined;
	isPediatricEffective: boolean;
	handleMarkIntactDentition: () => void;
	handleMarkWisdomTeethMissing: () => void;
	onSyncAllToDiary?: (() => void) | undefined;
	liveGrossTotalRub?: number | undefined;
	onOpenFastCheckout?: (() => void) | undefined;
	allergyText?: string | undefined;
	selectedTeeth?: number[] | undefined;
	onOneClickLabOrder?: ((teeth: number[]) => void) | undefined;
	onToggleEstimator?: (() => void) | undefined;
	isEstimatorOpen?: boolean | undefined;
	isLiveInvoiceOpen: boolean;
	setIsLiveInvoiceOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setIsPlanWizardOpen: (open: boolean) => void;
	onOpenVoiceDictation?: (() => void) | undefined;
	toggleVoiceEngine: () => void;
	isVoiceListening: boolean;
	handleBatchSelectGroup: (teeth: number[]) => void;
	setActiveJawModalTarget: (target: "JU" | "JL" | "C") => void;
	ADULT_Q1: number[];
	ADULT_Q2: number[];
	ADULT_Q3: number[];
	ADULT_Q4: number[];
	ADULT_FRONT: number[];
	PEDIATRIC_Q5: number[];
	PEDIATRIC_Q6: number[];
	PEDIATRIC_Q7: number[];
	PEDIATRIC_Q8: number[];
	PEDIATRIC_FRONT: number[];
	isMoreMenuOpen: boolean;
	setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isFastExtractMode: boolean;
	setIsFastExtractMode: React.Dispatch<React.SetStateAction<boolean>>;
	isMultiSelectMode?: boolean | undefined;
	onToggleMultiSelect?: ((enabled: boolean) => void) | undefined;
	isPerioOpen?: boolean | undefined;
	onTogglePerio?: (() => void) | undefined;
	isOrthoCephOpen: boolean;
	setIsOrthoCephOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isSmartOpgOpen?: boolean | undefined;
	setIsSmartOpgOpen?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
	setContextDrawerTooth: (tooth: number | null) => void;
	onOpenPediatricModal?: (() => void) | undefined;
	onLoadDiagnocat?: (() => void) | undefined;
	diagnocatLoading?: boolean | undefined;
	showWisdomTeeth: boolean;
	setShowWisdomTeeth: React.Dispatch<React.SetStateAction<boolean>>;
	showPulpAndCanals: boolean;
	setShowPulpAndCanals: React.Dispatch<React.SetStateAction<boolean>>;
}
