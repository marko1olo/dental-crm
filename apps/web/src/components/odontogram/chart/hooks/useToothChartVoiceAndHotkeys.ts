import { useEffect } from "react";
import { globalDentalVoiceEngine } from "../../../../services/voice";
import { SoundFeedbackService } from "../../../../services/audio/SoundFeedbackService";
import { showToast } from "../../../GlobalToast";
import { type ToothState, getToothStateFromHotkey } from "../toothChartTypes";

export function useToothChartVoiceAndHotkeys(
	selectedTeeth: number[],
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined,
) {
	// Voice dictation listener
	useEffect(() => {
		const unsub = globalDentalVoiceEngine.addListener({
			onIntentParsed: (intent) => {
				if (!intent.teethUpdates || intent.teethUpdates.length === 0) return;
				if (onQuickStateChange) {
					for (const upd of intent.teethUpdates) {
						if (upd.toothNumber && upd.state) {
							onQuickStateChange([upd.toothNumber], upd.state as ToothState, upd.surfaces);
						}
					}
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast(`Голосовой ввод: обновлено зубов: ${intent.teethUpdates.length}`, "success");
				}
			},
		});
		return () => unsub();
	}, [onQuickStateChange]);

	// Global Keyboard Hotkey Handler
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
			const quickState = getToothStateFromHotkey(e.key);
			if (quickState && onQuickStateChange && selectedTeeth.length > 0) {
				e.preventDefault();
				onQuickStateChange(selectedTeeth, quickState, []);
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [selectedTeeth, onQuickStateChange]);
}
