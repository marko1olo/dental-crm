/**
 * VoiceModalHeader.tsx — Шапка голосового ассистента DENTE с тач-кнопкой закрытия.
 * Строго <= 120 строк по Мандату 8b.
 */

import { Sparkles, X } from "lucide-react";

interface VoiceModalHeaderProps {
	onClose: () => void;
	activeToothNumber?: number | null;
}

export function VoiceModalHeader({ onClose, activeToothNumber }: VoiceModalHeaderProps) {
	return (
		<div className="dnt-voice-modal-header">
			<div className="dnt-voice-modal-title-group">
				<div className="dnt-voice-modal-icon-badge">
					<Sparkles size={22} aria-hidden="true" />
				</div>
				<div>
					<h2 id="voice-assistant-title" className="dnt-voice-modal-title">
						Голосовой клинический ассистент
					</h2>
					<p className="dnt-voice-modal-subtitle">
						Диктовка протокола приёма, зубной формулы, диагнозов и манипуляций
						{activeToothNumber ? ` (активен зуб ${activeToothNumber})` : ""}
					</p>
				</div>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<button
					type="button"
					onClick={onClose}
					className="dnt-voice-modal-close-btn"
					aria-label="Закрыть голосовой ассистент"
					title="Закрыть"
				>
					<X size={22} aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
