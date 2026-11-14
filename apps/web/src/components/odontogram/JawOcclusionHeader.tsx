import React from "react";
import { Compass, X, Zap } from "lucide-react";

export interface JawOcclusionHeaderProps {
	readonly targetLabelRu: string;
	readonly onApplyNorm: () => void;
	readonly onClose: () => void;
}

export const JawOcclusionHeader: React.FC<JawOcclusionHeaderProps> = ({
	targetLabelRu,
	onApplyNorm,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.1))] border border-[var(--teal,#0d9488)]/25 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
					<Compass size={20} />
				</div>
				<div className="flex flex-col min-w-0">
					<h3 className="text-base font-bold text-[var(--ink,#0f172a)] truncate">
						{targetLabelRu}
					</h3>
					<span className="text-xs text-[var(--ink-muted,#64748b)]">
						Челюстно-окклюзионная диагностика и внесение в медицинскую карту
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onApplyNorm}
					className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 touch-manipulation"
					title="Физиологическая норма (ортогнатический прикус)"
					data-testid="jaw-1click-norm-btn"
				>
					<Zap size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Физиологическая норма</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="min-w-[44px] min-h-[44px] sm:min-h-[36px] w-9 h-9 rounded-xl bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer shrink-0 border border-[var(--line,#e2e8f0)]"
					title="Закрыть (Esc)"
					aria-label="Закрыть"
					data-testid="jaw-modal-close-btn"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
};
