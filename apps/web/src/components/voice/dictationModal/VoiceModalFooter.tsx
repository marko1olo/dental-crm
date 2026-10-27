/**
 * VoiceModalFooter.tsx — Подвал модального окна: «Закрыть» и единая Primary CTA «Применить всё».
 * Строго <= 120 строк по Мандату 8b.
 */

import { CheckCheck } from "lucide-react";

interface VoiceModalFooterProps {
	onClose: () => void;
	onApplyAll: () => void;
	commandCount: number;
}

export function VoiceModalFooter({
	onClose,
	onApplyAll,
	commandCount,
}: VoiceModalFooterProps) {
	return (
		<div className="dnt-voice-modal-footer">
			<button
				type="button"
				onClick={onClose}
				className="voice-btn-secondary"
			>
				Закрыть
			</button>

			<div className="dnt-voice-footer-actions">
				<button
					type="button"
					onClick={onApplyAll}
					disabled={false}
					className="voice-btn-primary"
				>
					<CheckCheck size={18} />
					<span>Применить всё ({commandCount})</span>
				</button>
			</div>
		</div>
	);
}
