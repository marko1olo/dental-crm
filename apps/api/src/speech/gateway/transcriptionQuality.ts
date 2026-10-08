import type {
	SpeechTranscriptionQuality,
	SpeechTranscriptionStatus,
} from "@dental/shared";
import {
	countTranscriptWords,
	roundMetric,
	uniqueNonEmpty,
} from "./audioBufferUtils.js";

export function buildSpeechTranscriptionQuality(input: {
	transcript: string;
	confidence: number | null;
	status: SpeechTranscriptionStatus;
	warnings: string[];
	byteLength: number;
	durationMs: number | null;
	providerLabel: string;
}): SpeechTranscriptionQuality {
	const normalizedTranscript = input.transcript.replace(/\s+/g, " ").trim();
	const wordCount = countTranscriptWords(normalizedTranscript);
	const charCount = normalizedTranscript.length;
	const durationMs =
		input.durationMs && input.durationMs > 0 ? input.durationMs : null;
	const bytesPerSecond = durationMs
		? roundMetric(input.byteLength / (durationMs / 1000), 1)
		: null;
	const providerWarnings = uniqueNonEmpty(input.warnings).slice(0, 8);
	const signals: string[] = [];

	if (input.status === "failed") signals.push("provider_failed");
	if (input.status === "fallback_text")
		signals.push("local_fallback_transcript");
	if (input.status === "needs_provider_key")
		signals.push("provider_key_missing");
	if (!normalizedTranscript) signals.push("empty_transcript");
	if (input.confidence !== null && input.confidence < 0.72)
		signals.push("low_confidence");
	if (durationMs !== null && durationMs > 6000 && wordCount <= 1)
		signals.push("short_text_for_audio");
	if (durationMs !== null && durationMs > 120000) signals.push("long_chunk");
	if (bytesPerSecond !== null && bytesPerSecond > 0 && bytesPerSecond < 500)
		signals.push("tiny_audio_payload");
	if (providerWarnings.length) signals.push("provider_warning");

	const uniqueSignals = uniqueNonEmpty(signals);
	const level: SpeechTranscriptionQuality["level"] =
		input.status === "failed"
			? "failed"
			: !normalizedTranscript
				? "empty"
				: uniqueSignals.length
					? "review"
					: "clear";
	const emptyNextAction = uniqueSignals.includes("tiny_audio_payload")
		? "CRM получила почти пустой аудиофрагмент. Проверьте выбранный микрофон, говорите ближе и повторите запись."
		: providerWarnings.some((warning) => /тишин|пуст/i.test(warning))
			? "Похоже, в фрагменте была тишина или голос был слишком далеко. Проверьте микрофон и повторите фразу."
			: durationMs !== null && durationMs > 6000
				? "Запись длинная, но слов нет. Проверьте, выбран ли правильный микрофон, и повторите фразу ближе к нему."
				: "Повторите фразу ближе к микрофону или допечатайте текст вручную.";
	const nextAction =
		level === "clear"
			? "Можно использовать как черновик; врач подтверждает смысл перед сохранением."
			: level === "review"
				? `Проверьте фрагмент ${input.providerLabel}: распознавание сохранило текст, но есть признаки риска.`
				: level === "empty"
					? `Не блокировать прием: ${emptyNextAction}`
					: !normalizedTranscript
						? `Не блокировать прием: ${emptyNextAction}`
						: "Не блокировать прием: фрагмент сохранен в аудио/recovery, используйте локальный текст или повторите отправку.";

	return {
		level,
		confidence: input.confidence,
		wordCount,
		charCount,
		durationMs,
		bytesPerSecond,
		providerWarnings,
		signals: uniqueSignals,
		nextAction,
	};
}
