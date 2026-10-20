import type React from "react";
import { Check, Sparkles, X } from "lucide-react";

export interface VisitDiarySuggestionBannerProps {
	readonly suggestion: {
		title: string;
		source: string;
	};
	readonly onApply: () => void;
	readonly onDismiss: () => void;
}

export const VisitDiarySuggestionBanner: React.FC<VisitDiarySuggestionBannerProps> = ({
	suggestion,
	onApply,
	onDismiss,
}) => {
	return (
		<div
			className="p-3.5 rounded-2xl bg-[var(--teal-surface)] border-2 border-[var(--teal)] text-[var(--ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
			data-testid="soap-suggestion-banner"
		>
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] flex items-center justify-center shrink-0">
					<Sparkles size={22} className="text-[var(--teal,var(--brand-primary))]" />
				</div>
				<div className="min-w-0">
					<div className="text-sm sm:text-base font-black text-[var(--ink)] flex items-center gap-2 flex-wrap">
						<span>Подставить клинический протокол в дневник?</span>
						<span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] truncate">
							{suggestion.title}
						</span>
					</div>
					<div className="text-xs text-[var(--muted)] mt-0.5 truncate">
						{suggestion.source}: Жалобы, осмотр, диагноз, план лечения
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={onApply}
					className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] font-black text-sm sm:text-base shadow-sm transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]"
					data-testid="btn-apply-soap-suggestion"
					title="Внести клинический протокол в дневник приёма"
				>
					<Check size={18} />
					<span>Применить</span>
				</button>
				<button
					type="button"
					onClick={onDismiss}
					className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--border)] font-bold text-sm transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
					title="Скрыть предложение и продолжить ручной ввод"
					data-testid="btn-dismiss-soap-suggestion"
				>
					<X size={18} />
					<span>Скрыть</span>
				</button>
			</div>
		</div>
	);
};
