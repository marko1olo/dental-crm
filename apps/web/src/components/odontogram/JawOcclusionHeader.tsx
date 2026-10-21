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
		<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)]">
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
					<Compass size={20} />
				</div>
				<div className="flex flex-col min-w-0">
					<h3 className="text-base font-black text-[var(--odontogram-ink,#0f172a)] truncate">
						{targetLabelRu}
					</h3>
					<span className="text-xs text-[var(--odontogram-ink-muted,#64748b)]">
						Челюстно-окклюзионная диагностика и внесение в медицинскую карту
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onApplyNorm}
					className="min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 touch-manipulation"
					title="Физиологическая норма (ортогнатический прикус)"
					data-testid="jaw-1click-norm-btn"
				>
					<Zap size={14} className="text-emerald-600 dark:text-emerald-400" />
					<span>Физиологическая норма</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="min-w-[44px] min-h-[44px] sm:min-h-[32px] w-10 h-10 rounded-xl bg-[var(--odontogram-surface-hover,#f1f5f9)] hover:bg-rose-500 hover:text-white text-[var(--odontogram-ink-muted,#64748b)] flex items-center justify-center transition-all cursor-pointer shrink-0"
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
