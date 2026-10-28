import React from "react";
import { Grid2X2, Sparkles, Ruler, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

export const STEP_OPTIONS = [
	{ step: 1.0, label: "1.0 мм", desc: "Высокая точность (шаг 1 мм)" },
	{ step: 2.0, label: "2.0 мм", desc: "Стандартный шаг (2 мм)" },
	{ step: 3.0, label: "3.0 мм", desc: "Обзорный шаг (3 мм)" },
] as const;

export const GRID_SIZE_OPTIONS = [4, 6, 8] as const;

export interface ImplantGridToolbarProps {
	readonly totalSlices: number;
	readonly activeCrossSectionIdx: number;
	readonly nearestToothFdi?: string | null;
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly gamma: number;
	readonly slabThicknessMm: number;
	readonly crossSectionStepMm: number;
	readonly onChangeCrossSectionStepMm?: (step: number) => void;
	readonly showMorphometryLines: boolean;
	readonly onToggleMorphometry: () => void;
	readonly onNavigate: (delta: number) => void;
	readonly gridCount: number;
	readonly onSetGridCount: (count: number) => void;
	readonly onToggleMaximize?: () => void;
	readonly isMaximized?: boolean;
}

export const ImplantGridToolbar: React.FC<ImplantGridToolbarProps> = ({
	totalSlices, activeCrossSectionIdx, nearestToothFdi, windowWidth, windowLevel, gamma, slabThicknessMm,
	crossSectionStepMm, onChangeCrossSectionStepMm, showMorphometryLines, onToggleMorphometry,
	onNavigate, gridCount, onSetGridCount, onToggleMaximize, isMaximized = false,
}) => {
	return (
		<div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900 border-b border-zinc-800 shrink-0 gap-2 text-xs">
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1 text-amber-400 font-bold">
					<Grid2X2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Плитка срезов гребня</span>
				</div>
				{totalSlices > 0 && (
					<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold" data-testid="cbct-grid-active-indicator">
						#{activeCrossSectionIdx + 1} / {totalSlices}{nearestToothFdi && ` (Зуб #${nearestToothFdi})`}
					</span>
				)}
				<div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/90 border border-amber-500/40 text-[10px] font-mono text-amber-300" data-testid="cbct-grid-canonical-contrast-badge">
					<Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
					<span>W:{windowWidth}/L:{windowLevel} • γ{gamma.toFixed(2)} • {slabThicknessMm.toFixed(1)}мм</span>
				</div>
			</div>

			<div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800" role="group" aria-label="Шаг срезов">
				<span className="text-[10px] text-zinc-400 px-1 font-semibold hidden md:inline">Шаг:</span>
				{STEP_OPTIONS.map((opt) => {
					const isCur = Math.abs((crossSectionStepMm ?? 2.0) - opt.step) < 0.2;
					return (
						<button
							key={opt.step} type="button" onClick={() => onChangeCrossSectionStepMm?.(opt.step)}
							className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
								isCur ? "bg-teal-600 text-white shadow-xs border border-teal-500" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
							}`} title={opt.desc} data-testid={`cbct-grid-step-${opt.step}`}
						>
							{opt.label}
						</button>
					);
				})}
			</div>

			<div className="flex items-center gap-1">
				<button
					type="button" onClick={onToggleMorphometry}
					className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
						showMorphometryLines ? "bg-cyan-950 text-cyan-300 border-cyan-500/60" : "bg-zinc-800 text-zinc-400 border-zinc-700"
					}`} title={showMorphometryLines ? "Скрыть замеры W2/W4/W6" : "Показать замеры гребня W2/W4/W6"} data-testid="cbct-grid-toggle-calipers"
				>
					<Ruler className="w-3 h-3 text-cyan-400" /><span className="hidden lg:inline">W2/W4/W6</span>
				</button>

				<div className="flex items-center gap-0.5">
					<button type="button" onClick={() => onNavigate(-1)} disabled={activeCrossSectionIdx <= 0} className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-200" title="Предыдущий срез" data-testid="cbct-grid-nav-prev">
						<ChevronLeft className="w-3.5 h-3.5" />
					</button>
					<button type="button" onClick={() => onNavigate(1)} disabled={activeCrossSectionIdx >= totalSlices - 1} className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-200" title="Следующий срез" data-testid="cbct-grid-nav-next">
						<ChevronRight className="w-3.5 h-3.5" />
					</button>
				</div>

				<div className="hidden sm:flex items-center gap-0.5 pl-1 border-l border-zinc-800">
					{GRID_SIZE_OPTIONS.map((num) => (
						<button key={num} type="button" onClick={() => onSetGridCount(num)} className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center cursor-pointer ${gridCount === num ? "bg-zinc-700 text-white font-mono" : "text-zinc-500 hover:text-zinc-300"}`}>
							{num}
						</button>
					))}
				</div>

				{onToggleMaximize && (
					<button type="button" onClick={onToggleMaximize} className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 ml-1 cursor-pointer" data-testid="cbct-grid-maximize-btn">
						{isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
					</button>
				)}
			</div>
		</div>
	);
};
