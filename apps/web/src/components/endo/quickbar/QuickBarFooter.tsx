import React from "react";
import { Check, Plus } from "lucide-react";

export interface QuickBarFooterProps {
	readonly onAddCanal: () => void;
	readonly onTransferToDiary: () => void;
}

export const QuickBarFooter: React.FC<QuickBarFooterProps> = ({
	onAddCanal,
	onTransferToDiary,
}) => {
	return (
		<div className="p-2.5 sm:p-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onAddCanal}
					data-testid="btn-add-quick-canal"
					className="secondary-button min-h-[36px] sm:min-h-[38px] h-9 px-3 text-xs font-bold rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
				>
					<Plus size={14} className="text-rose-600 dark:text-rose-400" />
					<span>Добавить канал</span>
				</button>

				<span className="text-[11px] text-[var(--muted,#64748b)] font-medium hidden md:inline">
					Ирригация: 3% NaOCl + 17% EDTA с УЗ-активацией
				</span>
			</div>

			{/* Ровно ОДНА Primary CTA кнопка: «Перенести в дневник» (Мандаты 8e, 8am) */}
			<button
				type="button"
				onClick={onTransferToDiary}
				data-testid="btn-endo-transfer-to-diary"
				className="primary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--primary,#0d9488)] hover:brightness-110 active:scale-98 text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer touch-manipulation"
				title="Зафиксировать протокол каналов и перенести в дневник"
			>
				<Check size={16} />
				<span>Перенести в дневник</span>
			</button>
		</div>
	);
};
