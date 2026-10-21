import type React from "react";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import type { ToothState } from "./ToothChart";

export function invertSelectionAction(
	getAllTeeth: () => number[],
	selectedTeeth: number[] | undefined,
	onSelectTeethGroup?: ((teeth: number[]) => void) | undefined,
) {
	const allTeeth = getAllTeeth();
	const selectedSet = new Set(selectedTeeth ?? []);
	const inverted = allTeeth.filter((t) => !selectedSet.has(t));
	onSelectTeethGroup?.(inverted);
	SoundFeedbackService.getInstance().playActionSuccess();
	showToast(
		`Инвертировано: выделено ${inverted.length} из ${allTeeth.length} зубов`,
		"info",
		3000,
	);
}

export function clearSelectionAction(
	onSelectTeethGroup?: ((teeth: number[]) => void) | undefined,
) {
	onSelectTeethGroup?.([]);
	SoundFeedbackService.getInstance().playActionSuccess();
	showToast("Выделение зубов снято", "info", 2000);
}

export function batchSelectGroupAction(
	teeth: number[],
	activeStampTool: ToothState | null,
	onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined,
	onSelectTeethGroup?: ((teeth: number[]) => void) | undefined,
) {
	if (activeStampTool && onQuickStateChange) {
		onQuickStateChange(teeth, activeStampTool, []);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Штамп «${activeStampTool}» применён к ${teeth.length} зубам`,
			"success",
		);
		return;
	}
	onSelectTeethGroup?.(teeth);
	SoundFeedbackService.getInstance().playActionSuccess();
	showToast(`Выделено: ${teeth.length} зубов (пакетный режим)`, "info");
}

export function triggerQuickStateAction(
	state: ToothState,
	selectedTeeth: number[] | undefined,
	activeStampTool: ToothState | null,
	setActiveStampTool: React.Dispatch<React.SetStateAction<ToothState | null>>,
	onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined,
) {
	if (selectedTeeth && selectedTeeth.length > 0 && onQuickStateChange) {
		onQuickStateChange(selectedTeeth, state, []);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Статус «${state}» применён к ${selectedTeeth.length} зубам`,
			"success",
		);
	} else {
		setActiveStampTool((prev) => (prev === state ? null : state));
		if (activeStampTool !== state)
			SoundFeedbackService.getInstance().playActionSuccess();
	}
}
