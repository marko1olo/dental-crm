import { useCallback, useMemo } from "react";
import type { OdontogramViewContainerProps } from "./OdontogramViewTypes";
import type { useOdontogramContainerBatchActions } from "./useOdontogramContainerBatchActions";
import type { useOdontogramContainerState } from "./useOdontogramContainerState";

export interface UseSharedViewPropsParams {
	readonly props: OdontogramViewContainerProps;
	readonly dent: {
		isPediatricEffective: boolean;
		isMixedEffective: boolean;
		effectiveDentition: "adult" | "pediatric" | "mixed";
	};
	readonly handleToothClickIntercept: (
		arg1: number | React.MouseEvent,
		arg2?: DOMRect | null | number,
		surface?: string,
	) => void;
	readonly st: ReturnType<typeof useOdontogramContainerState>;
	readonly batch: ReturnType<typeof useOdontogramContainerBatchActions>;
}

export function useSharedViewProps({
	props,
	dent,
	handleToothClickIntercept,
	st,
	batch,
}: UseSharedViewPropsParams) {
	const { setActiveJawModalTarget } = st;
	const handleJawClick = useCallback(
		(target: "JU" | "JL" | "C") => setActiveJawModalTarget(target),
		[setActiveJawModalTarget],
	);

	return useMemo(
		() => ({
			teethData: props.teethData,
			pediatricMode: dent.isPediatricEffective,
			mixedDentition: dent.isMixedEffective,
			dentitionMode: dent.effectiveDentition,
			onDentitionModeChange: props.onDentitionModeChange,
			topTeeth: props.topTeeth,
			bottomTeeth: props.bottomTeeth,
			selectedTeeth: props.selectedTeeth,
			onToothClick: handleToothClickIntercept,
			onQuickStateChange: props.onQuickStateChange,
			useSurfaces: props.useSurfaces ?? false,
			hideHeader: props.hideHeader,
			hideLegend: props.hideLegend,
			hideQuadrantSwitcher: true,
			hideExpressActions: true,
			activeQuadrant: props.activeQuadrant,
			onQuadrantChange: props.onQuadrantChange,
			activeStamp: st.activeStampTool,
			onMarkIntactDentition: batch.handleMarkIntactDentition,
			onMarkWisdomTeethMissing: batch.handleMarkWisdomTeethMissing,
			onSelectTeethGroup: props.onSelectTeethGroup,
			onClearSelection: batch.handleClearSelection,
			onInvertSelection: batch.handleInvertSelection,
			onJawClick: handleJawClick,
			showWisdomTeeth: st.showWisdomTeeth,
			showPulpAndCanals: st.showPulpAndCanals,
			className: "",
		}),
		[
			props.teethData,
			dent.isPediatricEffective,
			dent.isMixedEffective,
			dent.effectiveDentition,
			props.onDentitionModeChange,
			props.topTeeth,
			props.bottomTeeth,
			props.selectedTeeth,
			handleToothClickIntercept,
			props.onQuickStateChange,
			props.useSurfaces,
			props.hideHeader,
			props.hideLegend,
			props.activeQuadrant,
			props.onQuadrantChange,
			st.activeStampTool,
			batch.handleMarkIntactDentition,
			batch.handleMarkWisdomTeethMissing,
			props.onSelectTeethGroup,
			batch.handleClearSelection,
			batch.handleInvertSelection,
			handleJawClick,
			st.showWisdomTeeth,
			st.showPulpAndCanals,
		],
	);
}
