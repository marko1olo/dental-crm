import { useEffect } from "react";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import {
	UnifiedAudioClient,
	parseDentalVoiceSpeech,
	type DentalVoiceIntent,
} from "../../services/voice";
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

export function dispatchVoiceTeethUpdatesBatch(
	teethUpdates: DentalVoiceIntent["teethUpdates"],
	onQuickStateChange?: UseGlobalVoiceListenerParams["onQuickStateChange"],
	pediatricMode?: boolean,
	onNotifySuccess?: (summary: string) => void,
): number {
	if (!onQuickStateChange || teethUpdates.length === 0) return 0;
	const batchedGroups = new Map<
		string,
		{
			teeth: number[];
			state: DentalVoiceIntent["teethUpdates"][number]["state"];
			surfaces: DentalVoiceIntent["teethUpdates"][number]["surfaces"];
		}
	>();
	for (const t of teethUpdates) {
		const surfacesKey = t.surfaces ? [...t.surfaces].sort().join(",") : "";
		const groupKey = `${t.state}::${surfacesKey}`;
		const existing = batchedGroups.get(groupKey);
		if (existing) {
			existing.teeth.push(t.toothNumber);
		} else {
			batchedGroups.set(groupKey, {
				teeth: [t.toothNumber],
				state: t.state,
				surfaces: t.surfaces,
			});
		}
	}
	for (const group of batchedGroups.values()) {
		onQuickStateChange(group.teeth, group.state, group.surfaces);
	}
	const summary = teethUpdates
		.map((t) => `Зуб ${t.toothNumber}: ${t.state}`)
		.join(", ");
	if (onNotifySuccess) {
		onNotifySuccess(summary);
	} else {
		void SoundFeedbackService.getInstance().playActionSuccess();
		showToast(`Голос: ${summary}`, "success");
	}
	return batchedGroups.size;
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
		const handleIntent = (intent: DentalVoiceIntent) => {
			if (intent.targetQuadrant !== undefined && onQuadrantChange) {
				onQuadrantChange(intent.targetQuadrant);
				void SoundFeedbackService.getInstance().playActionSuccess();
				showToast(
					`Голос: ${getQuadrantTitle(intent.targetQuadrant, Boolean(pediatricMode))}`,
					"info",
				);
			}

			dispatchVoiceTeethUpdatesBatch(
				intent.teethUpdates,
				onQuickStateChange,
				pediatricMode,
			);

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
		};

		const client = UnifiedAudioClient.getInstance();
		const unsub = client.subscribe({
			onStateChange: (state) => {
				const isL = state === "listening" || state === "connecting";
				setIsVoiceListening(isL);
				if (!isL) setVoiceInterimText("");
			},
			onInterimText: (interim) => {
				setVoiceInterimText(interim || "");
				if (interim && interim.trim()) {
					const intent = parseDentalVoiceSpeech(interim.trim());
					handleIntent(intent);
				}
			},
			onFinalText: (_final, accumulated) => {
				const full = (accumulated || _final || "").trim();
				setVoiceInterimText(full);
				if (full) {
					const intent = parseDentalVoiceSpeech(full);
					handleIntent(intent);
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
