import type React from "react";
import { type CallTranscriptUtterance, formatDurationTimer } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";

export function copyCallTranscript(
	utterances: CallTranscriptUtterance[],
	onCopied: (v: boolean) => void,
) {
	const text = utterances
		.map((u) => `[${formatDurationTimer(u.startTimeSeconds)}] ${u.speaker === "operator" ? "Оператор" : "Пациент"}: ${u.text}`)
		.join("\n");
	navigator.clipboard?.writeText(text).then(() => {
		onCopied(true);
		showToast("Расшифровка звонка скопирована в буфер", "success");
		setTimeout(() => onCopied(false), 2000);
	});
}

export function calculateWaveformSeek(
	e: React.MouseEvent<HTMLDivElement>,
	waveformEl: HTMLDivElement | null,
	duration: number,
): number {
	if (!waveformEl) return 0;
	const rect = waveformEl.getBoundingClientRect();
	const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
	const progress = clickX / rect.width;
	return progress * (duration || 1);
}
