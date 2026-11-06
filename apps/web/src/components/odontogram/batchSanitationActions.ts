import {
	FRONTAL_HYGIENE_SECTOR_ADULT,
	FRONTAL_HYGIENE_SECTOR_PEDIATRIC,
	resolveSafeSanitationTargets,
} from "@dental/shared";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import type { ToothData, ToothState } from "./ToothChart";

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
	teethData?: readonly ToothData[] | undefined,
) {
	if (onMarkIntactDentition) {
		onMarkIntactDentition();
		return;
	}
	const allTeeth = getAllTeeth();
	let targets = allTeeth;
	let preservedSurgicalCount = 0;

	if (teethData && teethData.length > 0) {
		const stateMap = new Map<number, string>();
		for (const t of teethData) {
			stateMap.set(t.toothNumber, t.state);
		}
		const resolved = resolveSafeSanitationTargets(allTeeth, stateMap);
		targets = resolved.sanitizedTargets;
		preservedSurgicalCount = resolved.preservedSurgicalCount;
	}

	onQuickStateChange?.(targets, "Healthy", []);
	SoundFeedbackService.getInstance().playActionSuccess();
	if (preservedSurgicalCount > 0) {
		showToast(
			`Санирован: ${targets.length} зубов отмечено нормой (сохранено хирургических/ортопедических: ${preservedSurgicalCount})`,
			"success",
		);
	} else {
		showToast(
			"Санирован: вся зубная формула отмечена интактной (здоровой)",
			"success",
		);
	}
}

export function markFrontalHygieneAction(
	isPediatric: boolean,
	onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined,
	onMarkFrontalHygiene?: (() => void) | undefined,
) {
	if (onMarkFrontalHygiene) {
		onMarkFrontalHygiene();
		return;
	}
	const targets = isPediatric
		? [...FRONTAL_HYGIENE_SECTOR_PEDIATRIC]
		: [...FRONTAL_HYGIENE_SECTOR_ADULT];

	onQuickStateChange?.(targets, "Healthy", []);
	SoundFeedbackService.getInstance().playActionSuccess();
	showToast(
		isPediatric
			? "Пакетная профгигиена: фронтальный сектор 53–63 и 83–73 очищен"
			: "Пакетная профгигиена: фронтальный сектор 13–23 и 33–43 очищен (налет и зубной камень сняты)",
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
