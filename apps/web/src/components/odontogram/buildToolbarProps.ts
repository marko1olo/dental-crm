import { globalDentalVoiceEngine } from "../../services/voice";
import type { OdontogramViewContainerProps } from "./OdontogramViewTypes";
import {
	ADULT_FRONT,
	ADULT_Q1,
	ADULT_Q2,
	ADULT_Q3,
	ADULT_Q4,
	PEDIATRIC_FRONT,
	PEDIATRIC_Q5,
	PEDIATRIC_Q6,
	PEDIATRIC_Q7,
	PEDIATRIC_Q8,
} from "./odontogramContainerDentition";
import type { OdontogramToolbarProps } from "./odontogramToolbarTypes";
import type { useOdontogramContainerBatchActions } from "./useOdontogramContainerBatchActions";
import type { useOdontogramContainerState } from "./useOdontogramContainerState";

export function buildToolbarProps(
	props: OdontogramViewContainerProps,
	st: ReturnType<typeof useOdontogramContainerState>,
	batch: ReturnType<typeof useOdontogramContainerBatchActions>,
	dent: {
		isPediatricEffective: boolean;
		isMixedEffective: boolean;
		effectiveDentition: "adult" | "pediatric" | "mixed";
	},
): OdontogramToolbarProps {
	return {
		activeMode: st.activeMode,
		handleModeSwitch: st.handleModeSwitch,
		onQuickStateChange: props.onQuickStateChange,
		handleQuickTriggerState: batch.handleQuickTriggerState,
		activeStampTool: st.activeStampTool,
		setActiveStampTool: st.setActiveStampTool,
		onDentitionModeChange: props.onDentitionModeChange,
		dentitionMode: props.dentitionMode,
		pediatricMode: props.pediatricMode,
		isPediatricEffective: dent.isPediatricEffective,
		onInvertSelection: batch.handleInvertSelection,
		onClearSelection: batch.handleClearSelection,
		handleMarkIntactDentition: batch.handleMarkIntactDentition,
		handleMarkWisdomTeethMissing: batch.handleMarkWisdomTeethMissing,
		onSyncAllToDiary: props.onSyncAllToDiary,
		liveGrossTotalRub: props.liveGrossTotalRub,
		onOpenFastCheckout: props.onOpenFastCheckout,
		allergyText: props.allergyText,
		selectedTeeth: props.selectedTeeth,
		onOneClickLabOrder: (teeth) => {
			props.onOneClickLabOrder?.(teeth);
			st.setOrthoDrawerTooth(teeth[0] || props.selectedTeeth?.[0] || 16);
		},
		onToggleEstimator: props.onToggleEstimator,
		isEstimatorOpen: props.isEstimatorOpen,
		isLiveInvoiceOpen: st.isLiveInvoiceOpen,
		setIsLiveInvoiceOpen: st.setIsLiveInvoiceOpen,
		setIsPlanWizardOpen: st.setIsPlanWizardOpen,
		onOpenVoiceDictation: props.onOpenVoiceDictation,
		toggleVoiceEngine: () => globalDentalVoiceEngine.toggle(),
		isVoiceListening: st.isVoiceListening,
		handleBatchSelectGroup: batch.handleBatchSelectGroup,
		setActiveJawModalTarget: st.setActiveJawModalTarget,
		ADULT_Q1: [...ADULT_Q1],
		ADULT_Q2: [...ADULT_Q2],
		ADULT_Q3: [...ADULT_Q3],
		ADULT_Q4: [...ADULT_Q4],
		ADULT_FRONT: [...ADULT_FRONT],
		PEDIATRIC_Q5: [...PEDIATRIC_Q5],
		PEDIATRIC_Q6: [...PEDIATRIC_Q6],
		PEDIATRIC_Q7: [...PEDIATRIC_Q7],
		PEDIATRIC_Q8: [...PEDIATRIC_Q8],
		PEDIATRIC_FRONT: [...PEDIATRIC_FRONT],
		isMoreMenuOpen: st.isMoreMenuOpen,
		setIsMoreMenuOpen: st.setIsMoreMenuOpen,
		isFastExtractMode: st.isFastExtractMode,
		setIsFastExtractMode: st.setIsFastExtractMode,
		isMultiSelectMode: props.isMultiSelectMode,
		onToggleMultiSelect: props.onToggleMultiSelect,
		isPerioOpen: props.isPerioOpen,
		onTogglePerio: props.onTogglePerio,
		isOrthoCephOpen: st.isOrthoCephOpen,
		setIsOrthoCephOpen: st.setIsOrthoCephOpen,
		isSmartOpgOpen: st.isSmartOpgOpen,
		setIsSmartOpgOpen: st.setIsSmartOpgOpen,
		setContextDrawerTooth: st.setContextDrawerTooth,
		onOpenPediatricModal: props.onOpenPediatricModal,
		onLoadDiagnocat: props.onLoadDiagnocat,
		diagnocatLoading: props.diagnocatLoading,
		showWisdomTeeth: st.showWisdomTeeth,
		setShowWisdomTeeth: st.setShowWisdomTeeth,
		showPulpAndCanals: st.showPulpAndCanals,
		setShowPulpAndCanals: st.setShowPulpAndCanals,
	};
}
