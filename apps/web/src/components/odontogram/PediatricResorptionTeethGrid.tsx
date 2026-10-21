import React from "react";
import { Check, Sparkles } from "lucide-react";
import {
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	RESORPTION_STAGE_DEFINITIONS,
	type ResorptionStagePercent,
} from "./pediatricDentitionEngine";
import { UPPER_PRIMARY_TEETH, LOWER_PRIMARY_TEETH } from "./pediatricResorptionConstants";

export interface PediatricResorptionTeethGridProps {
	readonly selectedPrimaryTooth: number;
	readonly onSelectPrimaryTooth: (tooth: number) => void;
	readonly selectedResorptionStage: ResorptionStagePercent;
	readonly expectedForSelected: ResorptionStagePercent;
	readonly currentAge: number;
	readonly physiologicalResorptionMap: Map<number, ResorptionStagePercent>;
	readonly onApplyExpectedForSelected: () => void;
	readonly onApplyCurrent: () => void;
	readonly hasUpdateCallback: boolean;
}

export const PediatricResorptionTeethGrid: React.FC<PediatricResorptionTeethGridProps> = ({
	selectedPrimaryTooth,
	onSelectPrimaryTooth,
	selectedResorptionStage,
	expectedForSelected,
	currentAge,
	physiologicalResorptionMap,
	onApplyExpectedForSelected,
	onApplyCurrent,
	hasUpdateCallback,
}) => {
	const renderTeethRow = (teeth: readonly number[]) => (
		<div className="flex flex-wrap gap-2 sm:gap-2.5">
			{teeth.map((num) => {
				const isSelected = selectedPrimaryTooth === num;
				const expectedStage = physiologicalResorptionMap.get(num) ?? 0;
				const stageDef = RESORPTION_STAGE_DEFINITIONS[expectedStage];
				return (
					<button
						key={num}
						type="button"
						onClick={() => onSelectPrimaryTooth(num)}
						className={`min-w-[56px] min-h-[50px] px-2.5 py-1.5 rounded-xl text-sm font-mono font-black border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center select-none ${
							isSelected
								? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/30 scale-105"
								: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-800 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-200 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-700 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-700"
						}`}
					>
						<div className="flex items-center gap-1 leading-none">
							<span className="text-sm sm:text-base font-black">{num}</span>
							<span className="text-[10px] font-sans opacity-75 font-semibold">
								→{PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num]}
							</span>
						</div>
						<span
							className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded-md mt-0.5 leading-none ${isSelected ? "bg-white/20 text-white" : ""}`}
							style={!isSelected ? { backgroundColor: stageDef.badgeBg, color: stageDef.badgeColor } : undefined}
							title={`Физиологическая резорбция в ${currentAge.toFixed(1)} лет: ${expectedStage}%`}
						>
							{expectedStage}%
						</span>
					</button>
				);
			})}
		</div>
	);

	return (
		<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div>
					<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
						Выберите молочный зуб для применения резорбции
					</h4>
					<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-300 font-medium mt-0.5">
						Выбранный: <strong className="text-teal-600 dark:text-teal-400 font-mono text-sm sm:text-base font-black">Зуб {selectedPrimaryTooth}</strong> (преемник: постоянный {PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[selectedPrimaryTooth] ?? "—"}) • Норма ({currentAge.toFixed(1)} лет): <span className="font-bold text-teal-700 dark:text-teal-300">{expectedForSelected}%</span>
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2 shrink-0">
					<button type="button" onClick={onApplyExpectedForSelected} className="min-h-[44px] sm:min-h-[32px] px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-300 dark:border-teal-700 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 select-none">
						<Sparkles className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
						<span>Норма ({expectedForSelected}%) к зубу {selectedPrimaryTooth}</span>
					</button>
					{hasUpdateCallback && (
						<button type="button" onClick={onApplyCurrent} className="min-h-[44px] sm:min-h-[32px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0 select-none">
							<Check className="w-4 h-4 shrink-0" />
							<span>Применить {selectedResorptionStage}% к зубу {selectedPrimaryTooth}</span>
						</button>
					)}
				</div>
			</div>
			<div className="space-y-2">
				<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">Верхний молочный ряд (55–65):</div>
				{renderTeethRow(UPPER_PRIMARY_TEETH)}
			</div>
			<div className="space-y-2">
				<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">Нижний молочный ряд (85–75):</div>
				{renderTeethRow(LOWER_PRIMARY_TEETH)}
			</div>
		</div>
	);
};
