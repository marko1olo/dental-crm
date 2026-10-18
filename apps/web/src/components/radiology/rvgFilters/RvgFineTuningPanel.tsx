import React from "react";
import { Activity, Contrast, Layers, Sliders, Sparkles } from "lucide-react";
import { RVG_FILTER_PRESETS, type RvgFilterPreset, type RvgFilterValues } from "./rvgFilterTypes.js";

export interface RvgFineTuningPanelProps {
	filters: RvgFilterValues;
	activePresetId: string;
	disabled: boolean;
	onPresetClick: (preset: RvgFilterPreset) => void;
	onSliderChange: (key: keyof RvgFilterValues, value: number) => void;
	onToggle: (key: "invert" | "denoise" | "emboss") => void;
}

const SLIDER_CONFIGS: { key: keyof RvgFilterValues; label: string; min: number; max: number; step: number; isFormatted?: boolean }[] = [
	{ key: "clahe", label: "CLAHE (Локальный контраст)", min: 0, max: 100, step: 5 },
	{ key: "sharpness", label: "Резкость (Unsharp Mask)", min: 0, max: 100, step: 5 },
	{ key: "brightness", label: "Яркость", min: 20, max: 200, step: 5 },
	{ key: "contrast", label: "Контрастность", min: 50, max: 300, step: 5 },
	{ key: "gamma", label: "Гамма (γ)", min: 0.5, max: 2.5, step: 0.05, isFormatted: true },
];

export function RvgFineTuningPanel({
	filters, activePresetId, disabled, onPresetClick, onSliderChange, onToggle,
}: RvgFineTuningPanelProps) {
	return (
		<div className="flex flex-col gap-2.5 pt-1 animate-in fade-in duration-150">
			<div className="flex flex-col gap-1.5">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#c9d1d9)] flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#14b8a6)]" /> Клинические пресеты
				</span>
				<div className="rvg-presets-grid grid grid-cols-2 gap-1.5">
					{RVG_FILTER_PRESETS.map((p) => {
						const isSel = activePresetId === p.id;
						return (
							<button
								key={p.id}
								type="button"
								onClick={() => onPresetClick(p)}
								disabled={disabled}
								className={`rvg-preset-chip flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
									isSel ? "!bg-[#0d9488] !border-[#14b8a6] !text-white shadow-sm" : "!bg-[#1e293b] !border-[#334155] !text-slate-200 hover:!bg-[#334155]"
								}`}
								title={p.description}
								data-testid={`rvg-preset-${p.id}`}
							>
								<span>{p.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--line,#334155)]">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#c9d1d9)] flex items-center gap-1.5">
					<Sliders className="w-3.5 h-3.5 text-[var(--teal,#14b8a6)]" /> Тонкая настройка фильтров
				</span>

				{SLIDER_CONFIGS.map((s) => (
					<div key={s.key} className="rvg-slider-control-row flex flex-col gap-1">
						<div className="rvg-slider-label-bar flex justify-between text-xs text-[var(--muted,#94a3b8)]">
							<span>{s.label}</span>
							<span className={`font-mono font-bold ${s.key === "clahe" || s.key === "sharpness" ? "text-[var(--teal,#14b8a6)]" : "text-[var(--ink,#c9d1d9)]"}`}>
								{s.isFormatted ? (Number(filters[s.key])).toFixed(2) : `${filters[s.key]}%`}
							</span>
						</div>
						<input
							type="range"
							min={s.min}
							max={s.max}
							step={s.step}
							value={Number(filters[s.key])}
							onChange={(e) => onSliderChange(s.key, Number(e.target.value))}
							disabled={disabled}
							className="rvg-slider-input w-full accent-[var(--teal,#14b8a6)]"
							data-testid={`rvg-slider-${s.key}`}
						/>
					</div>
				))}

				<div className="flex flex-wrap items-center gap-2 pt-1">
					<button type="button" onClick={() => onToggle("invert")} disabled={disabled} className={`px-3 py-1.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${filters.invert ? "bg-[var(--teal,#0d9488)] border-[var(--teal,#14b8a6)] text-white shadow-sm" : "bg-[var(--paper-soft,#1e293b)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:text-white"}`} data-testid="rvg-toggle-invert-btn-dock">
						<Contrast className="w-3.5 h-3.5" /> <span>Инверсия (Негатив)</span>
					</button>
					<button type="button" onClick={() => onToggle("denoise")} disabled={disabled} className={`px-3 py-1.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${filters.denoise ? "bg-[var(--teal,#0d9488)] border-[var(--teal,#14b8a6)] text-white shadow-sm" : "bg-[var(--paper-soft,#1e293b)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:text-white"}`} data-testid="rvg-toggle-denoise-btn">
						<Activity className="w-3.5 h-3.5" /> <span>Шумоподавление</span>
					</button>
					<button type="button" onClick={() => onToggle("emboss")} disabled={disabled} className={`px-3 py-1.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${filters.emboss ? "bg-[var(--teal,#0d9488)] border-[var(--teal,#14b8a6)] text-white shadow-sm" : "bg-[var(--paper-soft,#1e293b)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:text-white"}`} data-testid="rvg-toggle-emboss-btn-dock">
						<Layers className="w-3.5 h-3.5" /> <span>Рельеф (Emboss 3D)</span>
					</button>
				</div>
			</div>
		</div>
	);
}
