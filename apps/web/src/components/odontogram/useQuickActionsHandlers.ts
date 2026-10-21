import { useCallback } from "react";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import { TOOTH_STATE_LABELS } from "./chart/toothChartTypes";
import type { ToothState } from "./ToothChart";

export interface UseQuickActionsHandlersParams {
	readonly allDentitionTeeth: number[];
	readonly activeStampTool?: ToothState | null | undefined;
	readonly selectedTeeth?: number[] | undefined;
	readonly onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	readonly handleMarkIntactDentition: () => void;
	readonly handleMarkWisdomTeethMissing: () => void;
	readonly handleBatchSelectGroup: (teeth: number[]) => void;
	readonly onInvertSelection?: (() => void) | undefined;
	readonly onClearSelection?: (() => void) | undefined;
}

export function useQuickActionsHandlers({
	allDentitionTeeth,
	activeStampTool,
	selectedTeeth,
	onQuickStateChange,
	handleMarkIntactDentition,
	handleMarkWisdomTeethMissing,
	handleBatchSelectGroup,
	onInvertSelection,
	onClearSelection,
}: UseQuickActionsHandlersParams) {
	const handleSanitizeAll = useCallback(() => {
		onQuickStateChange?.(allDentitionTeeth, "Healthy", []);
		handleMarkIntactDentition();
	}, [allDentitionTeeth, onQuickStateChange, handleMarkIntactDentition]);

	const handleWisdomMissing = useCallback(() => {
		onQuickStateChange?.([18, 28, 38, 48], "Missing", []);
		handleMarkWisdomTeethMissing();
	}, [onQuickStateChange, handleMarkWisdomTeethMissing]);

	const handleInvert = useCallback(() => {
		if (onInvertSelection) {
			onInvertSelection();
			return;
		}
		const selectedSet = new Set(selectedTeeth ?? []);
		const inverted = allDentitionTeeth.filter((t) => !selectedSet.has(t));
		handleBatchSelectGroup(inverted);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Инвертировано: выделено ${inverted.length} из ${allDentitionTeeth.length} зубов`,
			"info",
			3000,
		);
	}, [
		onInvertSelection,
		allDentitionTeeth,
		selectedTeeth,
		handleBatchSelectGroup,
	]);

	const handleClear = useCallback(() => {
		if (onClearSelection) {
			onClearSelection();
			return;
		}
		handleBatchSelectGroup([]);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Выделение зубов снято", "info", 2000);
	}, [onClearSelection, handleBatchSelectGroup]);

	const handleGroupAction = useCallback(
		(teeth: number[]) => {
			if (activeStampTool && onQuickStateChange) {
				onQuickStateChange(teeth, activeStampTool, []);
				SoundFeedbackService.getInstance().playActionSuccess();
				const label = TOOTH_STATE_LABELS[activeStampTool] || activeStampTool;
				showToast(
					`Штамп «${label}» применён ко всем ${teeth.length} зубам`,
					"success",
					3500,
				);
				return;
			}
			handleBatchSelectGroup(teeth);
		},
		[activeStampTool, onQuickStateChange, handleBatchSelectGroup],
	);

	return {
		handleSanitizeAll,
		handleWisdomMissing,
		handleInvert,
		handleClear,
		handleGroupAction,
	};
}
