import React from "react";
import { Check, Copy, Sparkles } from "lucide-react";

export interface EmrProtocolActionFooterProps {
	readonly isCopied: boolean;
	readonly onCopy: () => void;
	readonly onClose: () => void;
	readonly onApply: () => void;
}

export const EmrProtocolActionFooter: React.FC<EmrProtocolActionFooterProps> = React.memo(
	function EmrProtocolActionFooter({ isCopied, onCopy, onClose, onApply }) {
		return (
			<div className="flex flex-wrap items-center justify-between gap-2.5">
				<button
					type="button"
					onClick={onCopy}
					className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-bold hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer"
				>
					{isCopied ? <Check className="w-4 h-4 text-[var(--ok-fg,#059669)]" /> : <Copy className="w-4 h-4" />}
					<span className="hidden sm:inline">{isCopied ? "Скопировано в буфер!" : "Копировать SOAP текст"}</span>
					<span className="sm:hidden">{isCopied ? "Скопировано!" : "Копировать SOAP"}</span>
				</button>

				<div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs sm:text-sm font-bold hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={onApply}
						className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer select-none active:scale-98 whitespace-nowrap"
						data-testid="apply-emr-protocol-btn"
					>
						<Sparkles className="w-4 h-4 shrink-0" />
						<span className="hidden sm:inline">Применить в дневник приёма</span>
						<span className="sm:hidden">Применить в дневник</span>
					</button>
				</div>
			</div>
		);
	},
);
