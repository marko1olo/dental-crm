import React from "react";
import { Check, Maximize2, RotateCcw, ShieldCheck, Sparkles, Zap } from "lucide-react";

export interface QuickBarHeaderProps {
	readonly activeTooth: number;
	readonly toothState?: string | undefined;
	readonly toothAnatomicalName: string;
	readonly onApplyPulpitis1Visit: () => void;
	readonly onApplyBioceramic: () => void;
	readonly onApplyCaOh2: () => void;
	readonly onApplyNorm: () => void;
	readonly onOpenFullModal?: (() => void) | undefined;
}

export const QuickBarHeader: React.FC<QuickBarHeaderProps> = ({
	activeTooth,
	toothState,
	toothAnatomicalName,
	onApplyPulpitis1Visit,
	onApplyBioceramic,
	onApplyCaOh2,
	onApplyNorm,
	onOpenFullModal,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/60">
			<div className="flex items-center gap-2 min-w-0">
				<div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
					<Zap size={16} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
							Протокол эндодонтии
						</span>
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-500/30">
							Зуб #{activeTooth}
						</span>
						{toothState && (
							<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-500/30 truncate max-w-[140px]">
								{toothState}
							</span>
						)}
					</div>
					<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white truncate">
						{toothAnatomicalName}
					</div>
				</div>
			</div>

			{/* 1-Click Клинические пресеты в едином стиле DENTE (Мандат 8e, Мандат 8am: secondary-чипы) */}
			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={onApplyPulpitis1Visit}
					data-testid="btn-quick-pulpitis-1visit"
					className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-bold rounded-lg border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-98"
					title="Экспресс-пресет: ProTaper + AH Plus гуттаперча латерально (21.5 мм · 25/.04)"
				>
					<Check size={13} className="text-emerald-600 dark:text-emerald-400" />
					<span className="hidden sm:inline">ProTaper + AH Plus</span>
					<span className="sm:hidden">ProTaper</span>
				</button>

				<button
					type="button"
					onClick={onApplyBioceramic}
					data-testid="btn-quick-periodontitis-bio"
					className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-bold rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-98"
					title="Периодонтит / Обтурация биокерамикой (21 мм · 30/.04 · BioRoot)"
				>
					<Sparkles size={13} className="text-teal-600 dark:text-teal-400" />
					<span className="hidden sm:inline">Биокерамика</span>
					<span className="sm:hidden">Био</span>
				</button>

				<button
					type="button"
					onClick={onApplyCaOh2}
					data-testid="btn-quick-caoh2"
					className="secondary-button min-h-[32px] h-8 px-2 text-xs font-bold rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-98"
					title="Временная повязка гидроксида кальция Ca(OH)2 (Каласепт) на 10-14 дней"
				>
					<ShieldCheck size={13} className="text-amber-600 dark:text-amber-400" />
					<span className="hidden sm:inline">Временная Ca(OH)2</span>
					<span className="sm:hidden">Ca(OH)2</span>
				</button>

				<button
					type="button"
					onClick={onApplyNorm}
					data-testid="btn-quick-norm"
					className="secondary-button min-h-[32px] h-8 px-2 text-xs font-bold rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-all cursor-pointer"
					title="Сброс параметров каналов к анатомической норме FDI"
				>
					<RotateCcw size={12} className="text-slate-500" />
					<span className="hidden sm:inline">Норма</span>
				</button>

				{onOpenFullModal && (
					<button
						type="button"
						onClick={onOpenFullModal}
						data-testid="btn-open-full-endo-modal"
						className="secondary-button min-h-[32px] h-8 px-2 text-xs font-bold rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
						title="Открыть подробный эндодонтический протокол"
					>
						<Maximize2 size={12} />
						<span className="hidden md:inline">Подробнее</span>
					</button>
				)}
			</div>
		</div>
	);
};
