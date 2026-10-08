import type { DentalSpecialty, SpeechTranscriptionResponse } from "@dental/shared";
import type { VisitNoteForm } from "../../../AppHelpers";
import { motionSafeScrollIntoView } from "../../../motionPreference";
import { useAppStore } from "../../../store/appStore";

/**
 * Плавный скролл к нужной секции рабочей области визита.
 */
export function scrollToVisitArea(selector: string): void {
	if (typeof window === "undefined") return;
	window.location.hash = "visit";
	window.requestAnimationFrame(() => {
		motionSafeScrollIntoView(document.querySelector(selector), {
			block: "start",
		});
	});
}

/**
 * Уникальный составной ключ фрагмента распознавания речи для предотвращения дублей.
 */
export function speechChunkApplyKey(result: SpeechTranscriptionResponse): string {
	return `${result.chunk.recordingId}:${result.chunk.chunkIndex}`;
}

/**
 * Выбор поддерживаемого MIME-типа записи аудио в текущем браузере.
 */
export function preferredSpeechMimeType(): string {
	if (typeof MediaRecorder === "undefined") return "";
	const candidates = [
		"audio/webm;codecs=opus",
		"audio/webm",
		"audio/ogg;codecs=opus",
		"audio/mp4",
	];
	return (
		candidates?.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ??
		""
	);
}

/**
 * Относится ли расшифрованный фрагмент речи к ОТКРЫТОМУ сейчас приёму.
 *
 * СТАЛО: неопределённость трактуется как «НЕ совпадает» (fail closed).
 * Фрагменты не из приёма (например, диктовка цен) по-прежнему проходят.
 */
export function speechTranscriptionMatchesActiveVisit(
	result: SpeechTranscriptionResponse,
): boolean {
	if (result.chunk.source !== "visit") return true;
	const activeVisitId = useAppStore.getState().dashboard?.activeVisit?.id;
	if (!result.chunk.visitId || !activeVisitId) return false;
	return result.chunk.visitId === activeVisitId;
}

/**
 * Детерминированная сигнатура черновика для пропуска холостых автосохранений.
 */
export function visitDraftSignature(
	nextTranscript: string,
	nextSpecialty: DentalSpecialty,
	nextForm: VisitNoteForm,
): string {
	return JSON.stringify([nextTranscript, nextSpecialty, nextForm]);
}
