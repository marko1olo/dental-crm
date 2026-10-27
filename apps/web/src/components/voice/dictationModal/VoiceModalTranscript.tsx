/**
 * VoiceModalTranscript.tsx — Карточка живого распознанного текста транскрипта с кнопкой очистки.
 * Строго <= 120 строк по Мандату 8b.
 */

import { Trash2 } from "lucide-react";

interface VoiceModalTranscriptProps {
	transcript: string;
	interimText: string;
	finalText: string;
	onClear: () => void;
}

export function VoiceModalTranscript({
	transcript,
	interimText,
	finalText,
	onClear,
}: VoiceModalTranscriptProps) {
	const hasContent = Boolean(finalText || interimText || transcript);

	return (
		<div className="dnt-voice-transcript-card">
			<div className="dnt-voice-transcript-head">
				<span>Транскрипт речи</span>
				{hasContent && (
					<button
						type="button"
						onClick={onClear}
						className="voice-btn-icon"
						style={{ minHeight: "28px", minWidth: "28px", padding: "4px" }}
						title="Очистить транскрипт"
						aria-label="Очистить транскрипт"
					>
						<Trash2 size={14} />
					</button>
				)}
			</div>
			<div className="dnt-voice-transcript-text" aria-live="polite">
				{hasContent ? (
					<div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
						{(finalText || transcript) && <span>{finalText || transcript}</span>}
						{interimText && (
							<span
								className="font-bold italic animate-pulse"
								style={{ color: "var(--info-fg)" }}
							>
								{finalText || transcript ? ` ${interimText}` : interimText}
							</span>
						)}
					</div>
				) : (
					<span className="dnt-voice-transcript-placeholder">
						Текст диктовки появится здесь при произнесении...
					</span>
				)}
			</div>
		</div>
	);
}
