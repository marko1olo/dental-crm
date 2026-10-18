import React from "react";
import { RotateCcw, Sliders } from "lucide-react";
import type { RadiologyQuickFilterState } from "./quickFilterTypes.js";

export interface RadiologyQuickFiltersVerticalProps {
	filterState: RadiologyQuickFilterState;
	isAnyActive: boolean;
	disabled: boolean;
	className?: string;
	brightnessPct: number;
	contrastPct: number;
	onToggle: (key: keyof RadiologyQuickFilterState) => void;
	onReset: () => void;
	onAdjustBrightness?: ((step: number) => void) | undefined;
	onAdjustContrast?: ((step: number) => void) | undefined;
}

export function RadiologyQuickFiltersVertical({
	filterState, isAnyActive, disabled, className = "",
	brightnessPct, contrastPct, onToggle, onReset,
	onAdjustBrightness, onAdjustContrast,
}: RadiologyQuickFiltersVerticalProps) {
	return (
		<div
			data-testid="radiology-quick-filters-panel"
			className={`radiology-quick-filters-vertical flex flex-col gap-2 p-2.5 bg-[#0b1320] border border-[#1e293b] rounded-lg text-xs select-none w-56 ${className}`}
		>
			<div className="flex items-center justify-between pb-1.5 border-b border-[#1e293b]">
				<span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
					<Sliders size={13} className="text-[#00C853]" />
					УПРАВЛЕНИЕ ОКНАМИ
				</span>
				{isAnyActive && (
					<button
						type="button"
						onClick={onReset}
						disabled={disabled}
						className="text-[10px] text-[#00C853] hover:underline cursor-pointer flex items-center gap-0.5"
						data-testid="quick-filter-reset-top"
					>
						<RotateCcw size={10} />
						Сброс
					</button>
				)}
			</div>

			<div className="grid grid-cols-2 gap-1.5 my-0.5">
				<button
					type="button"
					onClick={() => onAdjustBrightness?.(10)}
					className="px-2 py-1 rounded bg-[#0369a1]/25 border border-[#0284c7]/40 text-[#38bdf8] text-[11px] font-bold flex items-center justify-between cursor-pointer hover:bg-[#0369a1]/40"
					title="Регулировка яркости"
					data-testid="quick-filter-brightness-pill"
				>
					<span className="text-[10px]">ЯРКОСТЬ:</span>
					<span>{brightnessPct > 0 ? `+${brightnessPct}%` : `${brightnessPct}%`}</span>
				</button>

				<button
					type="button"
					onClick={() => onAdjustContrast?.(10)}
					className="px-2 py-1 rounded bg-[#7c3aed]/25 border border-[#8b5cf6]/40 text-[#c084fc] text-[11px] font-bold flex items-center justify-between cursor-pointer hover:bg-[#7c3aed]/40"
					title="Регулировка контраста"
					data-testid="quick-filter-contrast-pill"
				>
					<span className="text-[10px]">КОНТРАСТ:</span>
					<span>{contrastPct > 0 ? `+${contrastPct}%` : `${contrastPct}%`}</span>
				</button>
			</div>

			<div className="flex flex-col gap-1 mt-1">
				<label data-testid="quick-filter-sharpness-label" className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${filterState.sharpness ? "bg-[#0d9488]/25 text-[#2dd4bf] font-bold" : "hover:bg-[#1e293b] text-slate-300"}`}>
					<input type="checkbox" checked={filterState.sharpness} onChange={() => onToggle("sharpness")} disabled={disabled} className="w-3.5 h-3.5 rounded accent-[#00C853] cursor-pointer" data-testid="quick-filter-sharpness" />
					<span className="text-[11px]">Резкость (USM)</span>
				</label>

				<label data-testid="quick-filter-max-sharpness-label" className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${filterState.maxSharpness ? "bg-[#00C853]/20 text-[#00C853] font-bold border border-[#00C853]/40" : "hover:bg-[#1e293b] text-slate-300"}`}>
					<input type="checkbox" checked={filterState.maxSharpness} onChange={() => onToggle("maxSharpness")} disabled={disabled} className="w-3.5 h-3.5 rounded accent-[#00C853] cursor-pointer" data-testid="quick-filter-max-sharpness" />
					<span className="text-[11px]">Макс. резкость</span>
				</label>

				<label data-testid="quick-filter-invert-label" className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${filterState.invert ? "bg-[#e11d48]/25 text-[#fb7185] font-bold" : "hover:bg-[#1e293b] text-slate-300"}`}>
					<input type="checkbox" checked={filterState.invert} onChange={() => onToggle("invert")} disabled={disabled} className="w-3.5 h-3.5 rounded accent-[#e11d48] cursor-pointer" data-testid="quick-filter-invert" />
					<span className="text-[11px]">Инверсия (Негатив)</span>
				</label>

				<label data-testid="quick-filter-emboss-label" className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${filterState.pseudoRelief ? "bg-[#d97706]/25 text-[#fbbf24] font-bold" : "hover:bg-[#1e293b] text-slate-300"}`}>
					<input type="checkbox" checked={filterState.pseudoRelief} onChange={() => onToggle("pseudoRelief")} disabled={disabled} className="w-3.5 h-3.5 rounded accent-[#d97706] cursor-pointer" data-testid="quick-filter-emboss" />
					<span className="text-[11px]">Псевдо-рельеф (45°)</span>
				</label>
			</div>

			<button
				type="button"
				onClick={onReset}
				disabled={disabled || !isAnyActive}
				className={`mt-2 w-full h-8 rounded font-semibold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
					isAnyActive ? "bg-[#1e293b] hover:bg-[#334155] border-[#475569] text-slate-200" : "bg-[#0f172a] border-[#1e293b] text-slate-500 cursor-not-allowed"
				}`}
				data-testid="quick-filter-reset"
			>
				<RotateCcw size={12} />
				<span>Сбросить</span>
			</button>
		</div>
	);
}
