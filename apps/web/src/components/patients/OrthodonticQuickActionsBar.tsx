import React from "react";
import { ChevronRight, RotateCw, Sparkles, Zap } from "lucide-react";

interface OrthodonticQuickActionsBarProps {
	saving: boolean;
	currentAligner: number;
	totalAligners: number;
	onQuickIncrement: (count: number) => void;
	onQuickIssueSet: (count: number, days: number) => void;
	onQuickWireChange: () => void;
	onQuickLigatureActivate: () => void;
}

export const OrthodonticQuickActionsBar: React.FC<OrthodonticQuickActionsBarProps> = ({
	saving,
	currentAligner,
	totalAligners,
	onQuickIncrement,
	onQuickIssueSet,
	onQuickWireChange,
	onQuickLigatureActivate,
}) => (
	<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--line)]">
		<button
			type="button"
			disabled={saving || currentAligner >= totalAligners}
			onClick={() => onQuickIncrement(1)}
			className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-bold text-xs flex items-center justify-center gap-1 border border-[var(--glass-border)] cursor-pointer active:scale-95 transition-all"
			title="Выдать следующую 1 каппу"
		>
			<ChevronRight size={14} className="text-teal-600 dark:text-teal-400" />
			<span>+1 каппа</span>
		</button>

		<button
			type="button"
			disabled={saving || currentAligner >= totalAligners}
			onClick={() => onQuickIssueSet(2, 14)}
			className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center gap-1 border border-teal-200 dark:border-teal-800/60 cursor-pointer active:scale-95 transition-all"
			title="Выдать сет из 2 капп на 14 дней"
		>
			<Zap size={14} className="text-teal-600 dark:text-teal-400" />
			<span>Сет 2 каппы (+14 дн.)</span>
		</button>

		<button
			type="button"
			disabled={saving}
			onClick={onQuickWireChange}
			className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-bold text-xs flex items-center justify-center gap-1 border border-[var(--glass-border)] cursor-pointer active:scale-95 transition-all"
			title="Зафиксировать смену дуги"
		>
			<RotateCw size={14} className="text-blue-600 dark:text-blue-400" />
			<span>Смена дуги</span>
		</button>

		<button
			type="button"
			disabled={saving}
			onClick={onQuickLigatureActivate}
			className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-bold text-xs flex items-center justify-center gap-1 border border-[var(--glass-border)] cursor-pointer active:scale-95 transition-all shadow-2xs"
			title="Зафиксировать активацию замков / лигатур"
		>
			<Sparkles size={14} className="text-amber-500" />
			<span>Активация</span>
		</button>
	</div>
);
