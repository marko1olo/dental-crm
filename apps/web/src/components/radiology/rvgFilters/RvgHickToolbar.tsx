import React from "react";
import {
	ChevronDown, ChevronUp, Contrast, Eye, Layers,
	RotateCcw, RotateCw, Ruler, Sliders, Sparkles,
} from "lucide-react";
import { RVG_FILTER_PRESETS, type RvgFilterPreset, type RvgFilterValues } from "./rvgFilterTypes.js";

export interface RvgHickToolbarProps {
	filters: RvgFilterValues; activePresetId: string; layout: "toolbar" | "dock"; disabled: boolean;
	showFineTuning: boolean; setShowFineTuning: React.Dispatch<React.SetStateAction<boolean>>;
	isSplitCompare: boolean; onToggleSplitCompare?: ((enabled: boolean) => void) | undefined;
	isMeasuring: boolean; onToggleMeasure?: (() => void) | undefined; onRotate?: (() => void) | undefined;
	onToggle: (key: "invert" | "denoise" | "emboss") => void;
	onSliderChange: (key: keyof RvgFilterValues, value: number) => void;
	onPresetClick: (preset: RvgFilterPreset) => void; onReset: () => void;
}

export function RvgHickToolbar({
	filters, activePresetId, layout, disabled, showFineTuning, setShowFineTuning,
	isSplitCompare, onToggleSplitCompare, isMeasuring, onToggleMeasure, onRotate,
	onToggle, onSliderChange, onPresetClick, onReset,
}: RvgHickToolbarProps) {
	const btnBase = "px-2.5 py-1 h-8 min-h-[32px] max-h-[34px] rounded-md text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0";
	const btnInactive = "bg-slate-800/90 border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700";
	const btnActive = "bg-teal-600 border-teal-500 text-white shadow-sm";

	return (
		<div
			className={`rvg-filters-1row-toolbar flex items-center gap-1.5 p-1 rounded-lg border border-slate-700/80 bg-slate-950/85 backdrop-blur-md text-xs shadow-xl ${
				layout === "dock" ? "flex-wrap justify-start" : "justify-between h-9 min-h-[34px] max-h-[36px] overflow-x-auto whitespace-nowrap"
			}`}
			data-testid="rvg-filters-1row-toolbar"
		>
			<div className={`flex items-center gap-1.5 ${layout === "dock" ? "flex-wrap" : "shrink-0"}`}>
				<button type="button" onClick={() => onToggle("invert")} disabled={disabled} className={`${btnBase} ${filters.invert ? btnActive : btnInactive}`} title="Инверсия (Негатив / Позитив)" data-testid="rvg-toggle-invert-btn">
					<Contrast className="w-3.5 h-3.5" /> <span>Негатив</span>
				</button>

				<select value={activePresetId} onChange={(e) => { const p = RVG_FILTER_PRESETS.find((item) => item.id === e.target.value); if (p) onPresetClick(p); }} disabled={disabled} className="px-2.5 py-0.5 h-8 min-h-[32px] max-h-[34px] rounded-md text-xs font-semibold border border-slate-700/80 bg-slate-800/90 text-slate-200 outline-none cursor-pointer shrink-0" title="Клинический контраст (Закон Хика)" data-testid="rvg-contrast-preset-select">
					{RVG_FILTER_PRESETS.map((p) => (<option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">{p.label}</option>))}
				</select>

				<button type="button" onClick={() => onSliderChange("sharpness", filters.sharpness === 0 ? 50 : filters.sharpness === 50 ? 100 : 0)} disabled={disabled} className={`${btnBase} ${filters.sharpness > 0 ? "bg-teal-600/30 border-teal-500 text-teal-300" : btnInactive}`} title="Резкость (USM): 0% -> 50% -> 100%" data-testid="rvg-sharpness-quick-btn">
					<Sliders className="w-3.5 h-3.5" /> <span>Резкость {filters.sharpness > 0 ? `${filters.sharpness}%` : ""}</span>
				</button>

				<button type="button" onClick={() => { const perio = RVG_FILTER_PRESETS.find((p) => p.id === "perio"); const std = RVG_FILTER_PRESETS.find((p) => p.id === "standard"); if (perio && std) onPresetClick(activePresetId === "perio" ? std : perio); }} disabled={disabled} className={`${btnBase} ${activePresetId === "perio" ? btnActive : btnInactive}`} title="Костный фильтр: визуализация трабекул" data-testid="rvg-toggle-bone-filter-btn">
					<Sparkles className="w-3.5 h-3.5" /> <span>Кость</span>
				</button>

				<button type="button" onClick={() => onToggle("emboss")} disabled={disabled} className={`${btnBase} ${filters.emboss ? btnActive : btnInactive}`} title="Псевдорельеф 45° (Emboss)" data-testid="rvg-toggle-emboss-btn">
					<Layers className="w-3.5 h-3.5" /> <span>Рельеф</span>
				</button>

				{onToggleMeasure && (
					<button type="button" onClick={onToggleMeasure} disabled={disabled} className={`${btnBase} ${isMeasuring ? btnActive : btnInactive}`} title="Инструмент измерения (линейка)" data-testid="rvg-measure-btn">
						<Ruler className="w-3.5 h-3.5" /> <span>Замер</span>
					</button>
				)}

				{onRotate && (
					<button type="button" onClick={onRotate} disabled={disabled} className={`${btnBase} ${btnInactive}`} title="Повернуть снимок на 90° (R)" data-testid="rvg-rotate-btn-toolbar">
						<RotateCw className="w-3.5 h-3.5" /> <span>90°</span>
					</button>
				)}

				<button type="button" onClick={onReset} disabled={disabled} className={`${btnBase} bg-slate-800/90 border-slate-700/80 text-slate-300 hover:text-rose-400 hover:bg-slate-700`} title="Сбросить все фильтры" data-testid="rvg-reset-filters-btn">
					<RotateCcw className="w-3.5 h-3.5" /> <span>Сброс</span>
				</button>
			</div>

			<div className="flex items-center gap-1.5 shrink-0 ml-auto">
				{onToggleSplitCompare && (
					<button type="button" onClick={() => onToggleSplitCompare(!isSplitCompare)} disabled={disabled} className={`px-2 py-1 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${isSplitCompare ? "bg-cyan-600 border-cyan-500 text-white shadow-sm" : btnInactive}`} title="Сравнить (До / После)" data-testid="rvg-toggle-split-btn">
						<Eye className="w-3.5 h-3.5" /> <span>До/После</span>
					</button>
				)}
				{layout === "dock" && (
					<button type="button" onClick={() => setShowFineTuning((prev) => !prev)} disabled={disabled} className="px-2 py-1 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-medium border border-[var(--line,#334155)] bg-[var(--paper-strong,#0f172a)] text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#c9d1d9)] transition-all cursor-pointer flex items-center gap-1 shrink-0" title="Тонкая настройка слайдеров" data-testid="rvg-toggle-fine-tuning-btn">
						<span>Слайдеры</span>
						{showFineTuning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
					</button>
				)}
			</div>
		</div>
	);
}
