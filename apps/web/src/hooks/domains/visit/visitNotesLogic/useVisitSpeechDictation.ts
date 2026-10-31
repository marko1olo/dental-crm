import { useCallback, useMemo } from "react";
import type { SpeechGatewayStatus } from "@dental/shared";
import { appendSpeechTextWithoutDuplicateTail } from "../../../../AppHelpers";
import { useAppStore } from "../../../../store/appStore";
import { useVisitStore } from "../../../../store/visitStore";

export interface UseVisitSpeechDictationParams {
	speechGatewayStatus: SpeechGatewayStatus | null;
}

export interface UseVisitSpeechDictationReturn {
	hasVisitTranscriptText: boolean;
	appendToTranscript: (text: string) => void;
	appendVisitDictationText: (value: string) => void;
	clearTranscriptWithUndo: () => void;
	undoTranscriptClear: () => void;
}

/**
 * useVisitSpeechDictation
 *
 * Dedicated speech dictation and transcript manipulation hook for active clinical visits.
 * Complies with Mandate 8e (Doctor Autonomy) and Voice-First CRM Invariants:
 * - Real-time speech transcription capture without UI freezing.
 * - Deduplicated tail buffering (appendSpeechTextWithoutDuplicateTail).
 * - Instant undo/redo snapshot buffering for accidental transcript wipes.
 */
export function useVisitSpeechDictation({
	speechGatewayStatus,
}: UseVisitSpeechDictationParams): UseVisitSpeechDictationReturn {
	const transcript = useVisitStore((s) => s.transcript);
	const setTranscript = useVisitStore((s) => s.setTranscript);
	const setDraft = useVisitStore((s) => s.setDraft);
	const clearedTranscriptSnapshot = useVisitStore(
		(s) => s.clearedTranscriptSnapshot,
	);
	const setClearedTranscriptSnapshot = useVisitStore(
		(s) => s.setClearedTranscriptSnapshot,
	);
	const visitDraftUserEditedRef = useVisitStore(
		(s) => s.visitDraftUserEditedRef,
	);
	const setSpeechStatusNote = useAppStore((s) => s.setSpeechStatusNote);

	const dedupeWindow = useMemo(() => {
		return speechGatewayStatus?.chunkingPolicy?.dedupeWindowChars ?? 600;
	}, [speechGatewayStatus?.chunkingPolicy?.dedupeWindowChars]);

	const hasVisitTranscriptText = useMemo(() => {
		return transcript.trim().length > 0;
	}, [transcript]);

	const appendVisitDictationText = useCallback(
		(value: string) => {
			const cleanValue = value.trim();
			if (!cleanValue) return;

			visitDraftUserEditedRef.current = true;
			setClearedTranscriptSnapshot(null);

			// biome-ignore lint/suspicious/noExplicitAny: functional state update
			setTranscript((current: any) =>
				appendSpeechTextWithoutDuplicateTail(current, cleanValue, dedupeWindow),
			);
			setDraft(null);
		},
		[
			setDraft,
			visitDraftUserEditedRef,
			dedupeWindow,
			setTranscript,
			setClearedTranscriptSnapshot,
		],
	);

	const appendToTranscript = useCallback(
		(text: string) => {
			if (!text.trim()) return;

			visitDraftUserEditedRef.current = true;
			setClearedTranscriptSnapshot(null);

			// biome-ignore lint/suspicious/noExplicitAny: functional state update
			setTranscript((current: any) =>
				appendSpeechTextWithoutDuplicateTail(current, text, dedupeWindow),
			);
		},
		[
			setClearedTranscriptSnapshot,
			visitDraftUserEditedRef,
			dedupeWindow,
			setTranscript,
		],
	);

	const clearTranscriptWithUndo = useCallback(() => {
		const previousTranscript = transcript;
		if (!previousTranscript.trim()) {
			setSpeechStatusNote("Диктовка уже пустая. Нечего очищать.");
			return;
		}

		visitDraftUserEditedRef.current = true;
		setClearedTranscriptSnapshot(previousTranscript);
		setTranscript("");
		setSpeechStatusNote(
			"Диктовка очищена. Можно сразу вернуть текст кнопкой «Вернуть».",
		);
	}, [
		transcript,
		visitDraftUserEditedRef,
		setTranscript,
		setSpeechStatusNote,
		setClearedTranscriptSnapshot,
	]);

	const undoTranscriptClear = useCallback(() => {
		if (!clearedTranscriptSnapshot) {
			setSpeechStatusNote("Нет очищенной диктовки для восстановления.");
			return;
		}

		visitDraftUserEditedRef.current = true;
		setTranscript(clearedTranscriptSnapshot);
		setClearedTranscriptSnapshot(null);
		setSpeechStatusNote("Диктовка восстановлена из локального черновика.");
	}, [
		setTranscript,
		visitDraftUserEditedRef,
		setSpeechStatusNote,
		setClearedTranscriptSnapshot,
		clearedTranscriptSnapshot,
	]);

	return {
		hasVisitTranscriptText,
		appendToTranscript,
		appendVisitDictationText,
		clearTranscriptWithUndo,
		undoTranscriptClear,
	};
}
