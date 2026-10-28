import React from "react";
import { Grid2X2, ChevronLeft, ChevronRight } from "lucide-react";

export const STEP_OPTIONS = [
	{ step: 1.0, label: "1 мм" },
	{ step: 1.5, label: "1.5 мм" },
	{ step: 2.0, label: "2 мм" },
] as const;

export const COUNT_OPTIONS = [6, 8, 10] as const;

export interface PanoramicCrossSectionToolbarProps {
	readonly activeStep: number;
	readonly onStepChange: (step: number) => void;
	readonly sliceCount: 6 | 8 | 10;
	readonly onSliceCountChange: (count: 6 | 8 | 10) => void;
	readonly onNavigateCenter: (delta: number) => void;
	readonly activeCrossSectionIdx: number;
	readonly totalSectionsCount: number;
}

export const PanoramicCrossSectionToolbar: React.FC<PanoramicCrossSectionToolbarProps> = ({
	activeStep, onStepChange, sliceCount, onSliceCountChange,
	onNavigateCenter, activeCrossSectionIdx, totalSectionsCount,
}) => {
	return (
		<div className="h-7 px-2 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between gap-1.5 text-xs shrink-0">
			<div className="flex items-center gap-1.5 min-w-0">
				<Grid2X2 className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
				<span className="font-medium text-zinc-400 text-[11px] truncate">Срезы гребня (2 ряда)</span>
			</div>

			<div className="flex items-center gap-2">
				<div className="flex items-center bg-zinc-900/90 rounded border border-zinc-800 p-0.5 text-[10px]" role="group" aria-label="Шаг срезов">
					<span className="text-zinc-500 px-1 font-semibold hidden sm:inline">Шаг:</span>
					{STEP_OPTIONS.map((opt) => {
						const isCur = Math.abs(activeStep - opt.step) < 0.2;
						return (
							<button
								key={opt.step} type="button" onClick={() => onStepChange(opt.step)}
								className={`px-1.5 py-0.2 rounded font-mono font-medium transition-colors cursor-pointer ${
									isCur ? "bg-amber-950/70 text-amber-200 border border-amber-500/50 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
								}`}
								title={`Шаг нарезки ${opt.label}`} data-testid={`cbct-grid-step-${opt.step}`}
							>
								{opt.label}
							</button>
						);
					})}
				</div>

				<div className="flex items-center bg-zinc-900/90 rounded border border-zinc-800 p-0.5 text-[10px]" role="group" aria-label="Количество срезов">
					<span className="text-zinc-500 px-1 font-semibold hidden md:inline">Срезов:</span>
					{COUNT_OPTIONS.map((cnt) => {
						const isCur = sliceCount === cnt;
						return (
							<button
								key={cnt} type="button" onClick={() => onSliceCountChange(cnt)}
								className={`w-5 h-4.5 rounded font-mono font-medium flex items-center justify-center transition-colors cursor-pointer ${
									isCur ? "bg-purple-950/70 text-purple-200 border border-purple-500/50 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
								}`}
								title={`${cnt} срезов в 2 ряда`} data-testid={`cbct-grid-count-${cnt}`}
							>
								{cnt}
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex items-center gap-0.5 shrink-0">
				<button
					type="button" onClick={() => onNavigateCenter(-1)} disabled={activeCrossSectionIdx <= 0}
					className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
					title="Сдвиг центра назад" data-testid="cbct-grid-nav-prev"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
				</button>
				<button
					type="button" onClick={() => onNavigateCenter(1)} disabled={totalSectionsCount === 0 || activeCrossSectionIdx >= totalSectionsCount - 1}
					className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
					title="Сдвиг центра вперед" data-testid="cbct-grid-nav-next"
				>
					<ChevronRight className="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	);
};
