import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import type { ToothState } from "./ToothChart";

export function markIntactDentitionAction(
	getAllTeeth: () => number[],
	onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined,
	onMarkIntactDentition?: (() => void) | undefined,
) {
	if (onMarkIntactDentition) {
		onMarkIntactDentition();
		return;
	}
	const allTeeth = getAllTeeth();
	onQuickStateChange?.(allTeeth, "Healthy", []);
	SoundFeedbackService.getInstance().playActionSuccess();
	showToast(
		"Санирован: вся зубная формула отмечена интактной (здоровой)",
		"success",
	);
}

export function markWisdomTeethMissingAction(
	onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined,
	onMarkWisdomTeethMissing?: (() => void) | undefined,
) {
	if (onMarkWisdomTeethMissing) {
		onMarkWisdomTeethMissing();
		return;
	}
	onQuickStateChange?.([18, 28, 38, 48], "Missing", []);
	SoundFeedbackService.getInstance().playActionSuccess();
	showToast(
		"Адентия 8-ок: зубы 18, 28, 38, 48 отмечены отсутствующими",
		"info",
	);
}
