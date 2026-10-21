import type React from "react";
import { useCallback } from "react";
import {
	markIntactDentitionAction,
	markWisdomTeethMissingAction,
} from "./batchSanitationActions";
import {
	batchSelectGroupAction,
	clearSelectionAction,
	invertSelectionAction,
	triggerQuickStateAction,
} from "./batchSelectionActions";
import type { ToothState } from "./ToothChart";
import {
	ALL_ADULT_TEETH_NUMBERS,
	PEDIATRIC_BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
} from "./ToothChart";

export interface UseOdontogramContainerBatchActionsParams {
	readonly isMixedEffective: boolean;
	readonly isPediatricEffective: boolean;
	readonly selectedTeeth?: number[] | undefined;
	readonly activeStampTool: ToothState | null;
	readonly setActiveStampTool: React.Dispatch<
		React.SetStateAction<ToothState | null>
	>;
	readonly onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	readonly onSelectTeethGroup?: ((teeth: number[]) => void) | undefined;
	readonly onMarkIntactDentition?: (() => void) | undefined;
	readonly onMarkWisdomTeethMissing?: (() => void) | undefined;
}

export function useOdontogramContainerBatchActions({
	isMixedEffective,
	isPediatricEffective,
	selectedTeeth,
	activeStampTool,
	setActiveStampTool,
	onQuickStateChange,
	onSelectTeethGroup,
	onMarkIntactDentition,
	onMarkWisdomTeethMissing,
}: UseOdontogramContainerBatchActionsParams) {
	const getAllTeeth = useCallback(() => {
		return isMixedEffective
			? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH, 16, 26, 36, 46]
			: isPediatricEffective
				? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH]
				: [...ALL_ADULT_TEETH_NUMBERS];
	}, [isMixedEffective, isPediatricEffective]);

	const handleMarkIntactDentition = useCallback(
		() =>
			markIntactDentitionAction(
				getAllTeeth,
				onQuickStateChange,
				onMarkIntactDentition,
			),
		[getAllTeeth, onQuickStateChange, onMarkIntactDentition],
	);

	const handleMarkWisdomTeethMissing = useCallback(
		() =>
			markWisdomTeethMissingAction(
				onQuickStateChange,
				onMarkWisdomTeethMissing,
			),
		[onQuickStateChange, onMarkWisdomTeethMissing],
	);

	const handleInvertSelection = useCallback(
		() => invertSelectionAction(getAllTeeth, selectedTeeth, onSelectTeethGroup),
		[getAllTeeth, selectedTeeth, onSelectTeethGroup],
	);

	const handleClearSelection = useCallback(
		() => clearSelectionAction(onSelectTeethGroup),
		[onSelectTeethGroup],
	);

	const handleBatchSelectGroup = useCallback(
		(teeth: number[]) =>
			batchSelectGroupAction(
				teeth,
				activeStampTool,
				onQuickStateChange,
				onSelectTeethGroup,
			),
		[activeStampTool, onQuickStateChange, onSelectTeethGroup],
	);

	const handleQuickTriggerState = useCallback(
		(state: ToothState) =>
			triggerQuickStateAction(
				state,
				selectedTeeth,
				activeStampTool,
				setActiveStampTool,
				onQuickStateChange,
			),
		[selectedTeeth, activeStampTool, setActiveStampTool, onQuickStateChange],
	);

	return {
		handleMarkIntactDentition,
		handleMarkWisdomTeethMissing,
		handleInvertSelection,
		handleClearSelection,
		handleBatchSelectGroup,
		handleQuickTriggerState,
	};
}
