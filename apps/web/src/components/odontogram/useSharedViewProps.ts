import { useMemo } from "react";
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
			onJawClick: (target: "JU" | "JL" | "C") =>
				st.setActiveJawModalTarget(target),
			showWisdomTeeth: st.showWisdomTeeth,
			showPulpAndCanals: st.showPulpAndCanals,
			className: "",
		}),
		[props, dent, handleToothClickIntercept, st, batch],
	);
}
