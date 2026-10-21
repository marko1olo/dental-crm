import { useEffect } from "react";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { globalDentalVoiceEngine } from "../../services/voice";
import { showToast } from "../GlobalToast";
import type { OdontogramQuadrantId, ToothState } from "./ToothChart";
import { getQuadrantTitle } from "./ToothChart";

export interface UseGlobalVoiceListenerParams {
	readonly setIsVoiceListening: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setVoiceInterimText: React.Dispatch<React.SetStateAction<string>>;
	readonly onQuadrantChange?:
		| ((quadrant: OdontogramQuadrantId) => void)
		| undefined;
	readonly onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	readonly onTogglePerio?: (() => void) | undefined;
	readonly isPerioOpen?: boolean | undefined;
	readonly setIsOrthoCephOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly pediatricMode?: boolean | undefined;
}

export function useGlobalVoiceListener({
	setIsVoiceListening,
	setVoiceInterimText,
	onQuadrantChange,
	onQuickStateChange,
	onTogglePerio,
	isPerioOpen,
	setIsOrthoCephOpen,
	pediatricMode,
}: UseGlobalVoiceListenerParams) {
	useEffect(() => {
		const unsub = globalDentalVoiceEngine.addListener({
			onListeningChange: (isL) => {
				setIsVoiceListening(isL);
				if (!isL) setVoiceInterimText("");
			},
			onTranscriptChange: (interim, final) => {
				setVoiceInterimText(interim || final || "");
			},
			onIntentParsed: (intent) => {
				if (intent.targetQuadrant !== undefined && onQuadrantChange) {
					onQuadrantChange(intent.targetQuadrant);
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast(
						`Голос: ${getQuadrantTitle(intent.targetQuadrant, Boolean(pediatricMode))}`,
						"info",
					);
				}

				if (onQuickStateChange && intent.teethUpdates.length > 0) {
					for (const t of intent.teethUpdates) {
						onQuickStateChange([t.toothNumber], t.state, t.surfaces);
					}
					void SoundFeedbackService.getInstance().playActionSuccess();
					const summary = intent.teethUpdates
						.map((t) => `Зуб ${t.toothNumber}: ${t.state}`)
						.join(", ");
					showToast(`Голос: ${summary}`, "success");
				}

				if (
					intent.type === "perio_measurement" ||
					(intent.perioMeasurements && intent.perioMeasurements.length > 0)
				) {
					if (onTogglePerio && !isPerioOpen) onTogglePerio();
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast("Голос: Пародонтологическая карта", "info");
				}

				if (
					intent.type === "ceph_landmark" ||
					(intent.cephLandmarks && intent.cephLandmarks.length > 0)
				) {
					setIsOrthoCephOpen(true);
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast("Голос: Цефалометрия ТРГ", "info");
				}
			},
		});
		return () => unsub();
	}, [
		onQuickStateChange,
		onQuadrantChange,
		pediatricMode,
		onTogglePerio,
		isPerioOpen,
		setIsVoiceListening,
		setVoiceInterimText,
		setIsOrthoCephOpen,
	]);
}
