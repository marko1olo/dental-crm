import React from "react";
import { Check, Plus } from "lucide-react";

interface EndoToolbarActionsProps {
	readonly onApplyAnatomicalLengths: () => void;
	readonly onAddCanal: () => void;
}

export const EndoToolbarActions: React.FC<EndoToolbarActionsProps> = ({
	onApplyAnatomicalLengths,
	onAddCanal,
}) => (
	<div className="flex items-center gap-1.5 shrink-0">
		<button
			type="button"
			data-testid="btn-endo-anatomical-autofill"
			id="btn-endo-anatomical-norm"
			onClick={onApplyAnatomicalLengths}
			className="secondary-button h-6 sm:h-7 px-2.5 rounded-lg text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-950 dark:text-indigo-200 border border-indigo-500/30 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-98"
			title="Автозаполнение: Анатомическая норма длины по стандарту FDI"
		>
			<Check
				size={13}
				className="text-indigo-600 dark:text-indigo-400 shrink-0 font-bold"
			/>
			<span data-testid="btn-endo-anatomical-norm" className="hidden md:inline">Анатомическая норма длины</span>
			<span className="hidden sm:inline md:hidden">Норма длины</span>
			<span className="sm:hidden">Норма</span>
		</button>

		<button
			type="button"
			onClick={onAddCanal}
			className="secondary-button h-6 sm:h-7 px-2 rounded-lg text-xs font-bold border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-98"
			title="Добавить дополнительный корневой канал"
		>
			<Plus size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
			<span className="hidden sm:inline">Канал</span>
		</button>
	</div>
);
