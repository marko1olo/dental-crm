import React from "react";
import { Check, Clipboard, MoreHorizontal, RotateCcw } from "lucide-react";

interface EndoFooterActionsMenuProps {
	readonly isOpen: boolean;
	readonly setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onSaveCanalsOnly: () => void;
	readonly onCopyText: () => void;
	readonly onResetToDefaults: () => void;
}

export const EndoFooterActionsMenu: React.FC<EndoFooterActionsMenuProps> = ({
	isOpen,
	setIsOpen,
	onSaveCanalsOnly,
	onCopyText,
	onResetToDefaults,
}) => (
	<div className="relative">
		<button
			type="button"
			onClick={() => setIsOpen((v) => !v)}
			className="secondary-button min-h-[44px] px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
			title="Дополнительные действия (сохранение черновика, сброс параметров)"
			aria-label="Дополнительные действия"
		>
			<MoreHorizontal size={18} />
			<span className="hidden sm:inline">Действия</span>
		</button>

		{isOpen && (
			<div
				className="absolute left-0 bottom-full mb-1.5 z-50 w-64 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl shadow-xl p-1.5 space-y-1 text-xs"
				role="menu"
			>
				<button
					type="button"
					data-testid="save-endo-canals-btn"
					onClick={() => {
						onSaveCanalsOnly();
						setIsOpen(false);
					}}
					className="secondary-button w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[44px]"
					title="Сохранить параметры каналов в БД без вставки в дневник визита"
				>
					<Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Сохранить только каналы</span>
				</button>

				<button
					type="button"
					onClick={() => {
						onCopyText();
						setIsOpen(false);
					}}
					className="secondary-button w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[44px]"
				>
					<Clipboard size={15} className="text-slate-500 shrink-0" />
					<span>Копировать текст протокола</span>
				</button>

				<div className="border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 my-1" />

				<button
					type="button"
					onClick={() => {
						onResetToDefaults();
						setIsOpen(false);
					}}
					className="secondary-button w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[44px]"
				>
					<RotateCcw size={15} className="shrink-0" />
					<span>Сбросить к стандарту FDI</span>
				</button>
			</div>
		)}
	</div>
);
