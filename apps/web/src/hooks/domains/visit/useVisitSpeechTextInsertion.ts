import type { SpeechTranscriptionResponse } from "@dental/shared";
import { useCallback, useRef } from "react";
import { speechQualityLabels } from "../../../AppHelpers";
import { useAppStore } from "../../../store/appStore";
import { useVisitStore } from "../../../store/visitStore";
import { speechChunkApplyKey, speechTranscriptionMatchesActiveVisit } from "./helpers";

interface UseVisitSpeechTextInsertionParams {
	appendVisitDictationText: (value: string) => void;
	loadSpeechRecordingRecovery: (options?: { silent?: boolean }) => Promise<void>;
}

export function useVisitSpeechTextInsertion({
	appendVisitDictationText,
	loadSpeechRecordingRecovery,
}: UseVisitSpeechTextInsertionParams) {
	const { setSpeechLastQuality } = useVisitStore();
	const { setSpeechGatewayStatus, setSpeechStatusNote } = useAppStore();
	const appliedSpeechChunkKeysRef = useRef<Set<string>>(new Set());

	const applySpeechTranscription = useCallback(
		(result: SpeechTranscriptionResponse) => {
			setSpeechGatewayStatus(result.gateway);
			void loadSpeechRecordingRecovery({ silent: true });
			const applyKey = speechChunkApplyKey(result);
			if (appliedSpeechChunkKeysRef.current.has(applyKey)) {
				setSpeechStatusNote(`Фрагмент ${result.chunk.chunkIndex + 1} уже учтен, дубль не добавлен.`);
				return;
			}
			if (!speechTranscriptionMatchesActiveVisit(result)) {
				setSpeechStatusNote("Фрагмент распознавания относится к другому приему и не добавлен в текущую карту.");
				return;
			}
			const text = result.chunk.transcript.trim();
			const quality = result.chunk.quality;
			setSpeechLastQuality(quality);
			const qualitySuffix = quality.level === "clear" ? "" : ` · ${speechQualityLabels[quality.level]}`;
			if (text) {
				appliedSpeechChunkKeysRef.current.add(applyKey);
				appendVisitDictationText(text);
				setSpeechStatusNote(
					result.chunk.status === "transcribed"
						? `${result.chunk.providerLabel}: фрагмент ${result.chunk.chunkIndex + 1}${qualitySuffix}`
						: `Сохранен фрагмент ${result.chunk.chunkIndex + 1}${qualitySuffix}: ${quality.nextAction}`,
				);
				return;
			}
			setSpeechStatusNote(`${speechQualityLabels[quality.level]}: ${quality.nextAction}`);
		},
		[setSpeechLastQuality, setSpeechStatusNote, appendVisitDictationText, loadSpeechRecordingRecovery, setSpeechGatewayStatus],
	);

	return { appliedSpeechChunkKeysRef, applySpeechTranscription };
}
