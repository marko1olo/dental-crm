import React from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

export interface PediatricResorptionActionsProps {
	readonly currentAge: number;
	readonly onApplyNorm: () => void;
	readonly onApplyAllZero: () => void;
}

export const PediatricResorptionActions: React.FC<PediatricResorptionActionsProps> = ({
	currentAge,
	onApplyNorm,
	onApplyAllZero,
}) => {
	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 dark:from-teal-950/30 dark:via-emerald-950/20 dark:to-slate-900 border border-teal-500/30 dark:border-teal-600/30 space-y-3">
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
				<div className="space-y-1">
					<div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-black text-sm sm:text-base">
						<Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Физиологическая резорбция корней</span>
					</div>
					<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-300 font-medium">
						Автоматическая установка клинической нормы рассасывания корней для всех 20 молочных зубов по возрасту пациента ({currentAge.toFixed(1)} лет).
					</p>
				</div>

				<div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
					<button
						type="button"
						onClick={onApplyNorm}
						className="min-h-[48px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 select-none"
					>
						<Sparkles className="w-4 h-4 shrink-0" />
						<span>Физиологическая резорбция в норме ({currentAge.toFixed(1)} лет)</span>
					</button>

					<button
						type="button"
						onClick={onApplyAllZero}
						className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-800 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-200 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-700 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-700 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 select-none"
						title="Установить 0% для всех 20 зубов (интактные корни)"
					>
						<ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Все 0% (Интактные)</span>
					</button>
				</div>
			</div>
		</div>
	);
};
