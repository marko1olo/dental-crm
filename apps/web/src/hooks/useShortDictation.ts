/**
 * useShortDictation.ts — Тонкий канонический фасад к useUnifiedDictation (Мандат 8bf: SSOT).
 *
 * Исключает параллельные экземпляры UnifiedAudioClient и дублирование состояния аудио.
 * Обеспечивает 100% обратную совместимость для всех кнопок и полей ввода.
 */

import {
	useUnifiedDictation,
	type UseUnifiedDictationOptions,
} from "./useUnifiedDictation";

export type ContextType =
	| "schedule"
	| "visit"
	| "patient"
	| "price"
	| "payment"
	| "general";

export interface ShortDictationOptions {
	readonly onResult?: (text: string) => void;
	readonly onInterim?: (interim: string) => void;
	readonly autoFallback?: boolean;
	readonly specialty?: string;
}

export function useShortDictation(
	context: ContextType,
	handlerOrOptions?: ((text: string) => void) | ShortDictationOptions,
) {
	const options: ShortDictationOptions =
		typeof handlerOrOptions === "function"
			? { onResult: handlerOrOptions }
			: (handlerOrOptions ?? {});

	const mappedContext: UseUnifiedDictationOptions["context"] =
		context === "visit" || context === "patient" ? context : "general";

	const dictation = useUnifiedDictation({
		context: mappedContext,
		specialty: options.specialty ?? "therapy",
		autoFallback: options.autoFallback ?? true,
		onResult: options.onResult,
		onInterim: options.onInterim,
	});

	return {
		isRecording: dictation.isRecording,
		isProcessing: dictation.isProcessing,
		isSpeaking: dictation.isSpeaking,
		interimText: dictation.interimText,
		finalText: dictation.finalText,
		fullTranscript: dictation.fullTranscript,
		audioLevel: dictation.audioLevel,
		rms: dictation.rms,
		toggleRecording: dictation.toggleDictation,
		startRecording: dictation.startDictation,
		stopRecording: dictation.stopDictation,
		clearTranscript: dictation.clearTranscript,
	};
}
