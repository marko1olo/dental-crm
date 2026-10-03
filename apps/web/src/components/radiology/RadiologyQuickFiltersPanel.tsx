/**
 * DENTE CRM — EzDent-i 1-Click Quick Filter Toggles Panel
 * Implements 1-click fast toggles: Unsharp Masking, High-Boost, Inversion, and 45° Emboss pseudo-relief.
 * Standards: EzDent-i screenshot 22 ("УПРАВЛЕНИЕ ОКНАМИ"); Mandate 8b (<=800 lines); Desktop density (32-36px).
 */

import React from "react";
import {
	Activity,
	Check,
	Contrast,
	Layers,
	RotateCcw,
	Sliders,
	Sparkles,
	Sun,
	Zap,
} from "lucide-react";

export interface RadiologyQuickFilterState {
	readonly sharpness: boolean; // Unsharp Masking (USM)
	readonly maxSharpness: boolean; // High-Boost edge amplification
	readonly invert: boolean; // Inversion (Negative)
	readonly pseudoRelief: boolean; // Emboss 45° for microcracks & fissures
}

export const DEFAULT_QUICK_FILTERS_STATE: RadiologyQuickFilterState = {
	sharpness: false,
	maxSharpness: false,
	invert: false,
	pseudoRelief: false,
};

export interface RadiologyQuickFiltersPanelProps {
	readonly filterState: RadiologyQuickFilterState;
	readonly onFilterChange: (nextState: Partial<RadiologyQuickFilterState>) => void;
	readonly onReset: () => void;
	readonly orientation?: "horizontal" | "vertical";
	readonly brightnessPct?: number; // e.g. 0%
	readonly contrastPct?: number; // e.g. 0%
	readonly onAdjustBrightness?: (step: number) => void;
	readonly onAdjustContrast?: (step: number) => void;
	readonly disabled?: boolean;
	readonly className?: string;
}

export const RadiologyQuickFiltersPanel: React.FC<RadiologyQuickFiltersPanelProps> = ({
	filterState,
	onFilterChange,
	onReset,
	orientation = "horizontal",
	brightnessPct = 0,
	contrastPct = 0,
	onAdjustBrightness,
	onAdjustContrast,
	disabled = false,
	className = "",
}) => {
	const handleToggle = (key: keyof RadiologyQuickFilterState) => {
		if (disabled) return;
		// If enabling maxSharpness, sharpness is also enhanced; if disabling, it turns off
		if (key === "maxSharpness" && !filterState.maxSharpness) {
			onFilterChange({ maxSharpness: true, sharpness: false });
		} else if (key === "sharpness" && !filterState.sharpness) {
			onFilterChange({ sharpness: true, maxSharpness: false });
		} else {
			onFilterChange({ [key]: !filterState[key] });
		}
	};

	const isAnyActive =
		filterState.sharpness ||
		filterState.maxSharpness ||
		filterState.invert ||
		filterState.pseudoRelief ||
		brightnessPct !== 0 ||
		contrastPct !== 0;

	if (orientation === "vertical") {
		return (
			<div
				data-testid="radiology-quick-filters-panel"
				className={`radiology-quick-filters-vertical flex flex-col gap-2 p-2.5 bg-[#0b1320] border border-[#1e293b] rounded-lg text-xs select-none w-56 ${className}`}
			>
				{/* Section Header */}
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

				{/* Brightness & Contrast Quick Pill Badges (EzDent-i screenshot 22) */}
				<div className="grid grid-cols-2 gap-1.5 my-0.5">
					<button
						type="button"
						onClick={() => onAdjustBrightness && onAdjustBrightness(10)}
						className="px-2 py-1 rounded bg-[#0369a1]/25 border border-[#0284c7]/40 text-[#38bdf8] text-[11px] font-bold flex items-center justify-between cursor-pointer hover:bg-[#0369a1]/40"
						title="Регулировка яркости"
						data-testid="quick-filter-brightness-pill"
					>
						<span className="text-[10px]">ЯРКОСТЬ:</span>
						<span>{brightnessPct > 0 ? `+${brightnessPct}%` : `${brightnessPct}%`}</span>
					</button>

					<button
						type="button"
						onClick={() => onAdjustContrast && onAdjustContrast(10)}
						className="px-2 py-1 rounded bg-[#7c3aed]/25 border border-[#8b5cf6]/40 text-[#c084fc] text-[11px] font-bold flex items-center justify-between cursor-pointer hover:bg-[#7c3aed]/40"
						title="Регулировка контраста"
						data-testid="quick-filter-contrast-pill"
					>
						<span className="text-[10px]">КОНТРАСТ:</span>
						<span>{contrastPct > 0 ? `+${contrastPct}%` : `${contrastPct}%`}</span>
					</button>
				</div>

				{/* 1-Click Checkboxes List */}
				<div className="flex flex-col gap-1 mt-1">
					{/* 1. Резкость (Unsharp Masking) */}
					<label
						data-testid="quick-filter-sharpness-label"
						className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
							filterState.sharpness
								? "bg-[#0d9488]/25 text-[#2dd4bf] font-bold"
								: "hover:bg-[#1e293b] text-slate-300"
						}`}
					>
						<input
							type="checkbox"
							checked={filterState.sharpness}
							onChange={() => handleToggle("sharpness")}
							disabled={disabled}
							className="w-3.5 h-3.5 rounded accent-[#00C853] cursor-pointer"
							data-testid="quick-filter-sharpness"
						/>
						<span className="text-[11px]">Резкость (USM)</span>
					</label>

					{/* 2. Макс. резкость (High-Boost) */}
					<label
						data-testid="quick-filter-max-sharpness-label"
						className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
							filterState.maxSharpness
								? "bg-[#00C853]/20 text-[#00C853] font-bold border border-[#00C853]/40"
								: "hover:bg-[#1e293b] text-slate-300"
						}`}
					>
						<input
							type="checkbox"
							checked={filterState.maxSharpness}
							onChange={() => handleToggle("maxSharpness")}
							disabled={disabled}
							className="w-3.5 h-3.5 rounded accent-[#00C853] cursor-pointer"
							data-testid="quick-filter-max-sharpness"
						/>
						<span className="text-[11px]">Макс. резкость</span>
					</label>

					{/* 3. Инверсия */}
					<label
						data-testid="quick-filter-invert-label"
						className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
							filterState.invert
								? "bg-[#e11d48]/25 text-[#fb7185] font-bold"
								: "hover:bg-[#1e293b] text-slate-300"
						}`}
					>
						<input
							type="checkbox"
							checked={filterState.invert}
							onChange={() => handleToggle("invert")}
							disabled={disabled}
							className="w-3.5 h-3.5 rounded accent-[#e11d48] cursor-pointer"
							data-testid="quick-filter-invert"
						/>
						<span className="text-[11px]">Инверсия (Негатив)</span>
					</label>

					{/* 4. Псевдо-рельеф (Emboss 45°) */}
					<label
						data-testid="quick-filter-emboss-label"
						className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
							filterState.pseudoRelief
								? "bg-[#d97706]/25 text-[#fbbf24] font-bold"
								: "hover:bg-[#1e293b] text-slate-300"
						}`}
					>
						<input
							type="checkbox"
							checked={filterState.pseudoRelief}
							onChange={() => handleToggle("pseudoRelief")}
							disabled={disabled}
							className="w-3.5 h-3.5 rounded accent-[#d97706] cursor-pointer"
							data-testid="quick-filter-emboss"
						/>
						<span className="text-[11px]">Псевдо-рельеф (45°)</span>
					</label>
				</div>

				{/* Reset Button (EzDent-i screenshot 22: [ Сбросить ]) */}
				<button
					type="button"
					onClick={onReset}
					disabled={disabled || !isAnyActive}
					className={`mt-2 w-full h-8 rounded font-semibold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						isAnyActive
							? "bg-[#1e293b] hover:bg-[#334155] border-[#475569] text-slate-200"
							: "bg-[#0f172a] border-[#1e293b] text-slate-500 cursor-not-allowed"
					}`}
					data-testid="quick-filter-reset"
				>
					<RotateCcw size={12} />
					<span>Сбросить</span>
				</button>
			</div>
		);
	}

	// Horizontal 1-Row Toolbar Layout (32-36px desktop density)
	return (
		<div
			data-testid="radiology-quick-filters-panel"
			className={`radiology-quick-filters-horizontal flex items-center gap-2 px-2.5 py-1 bg-[#0b1320] border border-[#1e293b] rounded-lg text-xs select-none h-9 min-h-[34px] max-h-[36px] overflow-x-auto whitespace-nowrap ${className}`}
		>
			<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
				<Sliders size={12} className="text-[#00C853]" />
				ФИЛЬТРЫ:
			</span>

			{/* 1. Резкость */}
			<label
				data-testid="quick-filter-sharpness-label"
				className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer transition-colors shrink-0 ${
					filterState.sharpness
						? "bg-[#0d9488]/30 border-[#14b8a6] text-[#2dd4bf]"
						: "border-[#334155] bg-[#0f172a] text-slate-300 hover:text-white"
				}`}
			>
				<input
					type="checkbox"
					checked={filterState.sharpness}
					onChange={() => handleToggle("sharpness")}
					disabled={disabled}
					className="w-3.5 h-3.5 accent-[#00C853] cursor-pointer"
					data-testid="quick-filter-sharpness"
				/>
				<span>Резкость</span>
			</label>

			{/* 2. Макс. резкость */}
			<label
				data-testid="quick-filter-max-sharpness-label"
				className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer transition-colors shrink-0 ${
					filterState.maxSharpness
						? "bg-[#00C853]/25 border-[#00C853] text-[#00C853]"
						: "border-[#334155] bg-[#0f172a] text-slate-300 hover:text-white"
				}`}
			>
				<input
					type="checkbox"
					checked={filterState.maxSharpness}
					onChange={() => handleToggle("maxSharpness")}
					disabled={disabled}
					className="w-3.5 h-3.5 accent-[#00C853] cursor-pointer"
					data-testid="quick-filter-max-sharpness"
				/>
				<span>Макс. резкость</span>
			</label>

			{/* 3. Инверсия */}
			<label
				data-testid="quick-filter-invert-label"
				className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer transition-colors shrink-0 ${
					filterState.invert
						? "bg-[#e11d48]/30 border-[#f43f5e] text-[#fb7185]"
						: "border-[#334155] bg-[#0f172a] text-slate-300 hover:text-white"
				}`}
			>
				<input
					type="checkbox"
					checked={filterState.invert}
					onChange={() => handleToggle("invert")}
					disabled={disabled}
					className="w-3.5 h-3.5 accent-[#e11d48] cursor-pointer"
					data-testid="quick-filter-invert"
				/>
				<span>Инверсия</span>
			</label>

			{/* 4. Псевдо-рельеф */}
			<label
				data-testid="quick-filter-emboss-label"
				className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer transition-colors shrink-0 ${
					filterState.pseudoRelief
						? "bg-[#d97706]/30 border-[#f59e0b] text-[#fbbf24]"
						: "border-[#334155] bg-[#0f172a] text-slate-300 hover:text-white"
				}`}
			>
				<input
					type="checkbox"
					checked={filterState.pseudoRelief}
					onChange={() => handleToggle("pseudoRelief")}
					disabled={disabled}
					className="w-3.5 h-3.5 accent-[#d97706] cursor-pointer"
					data-testid="quick-filter-emboss"
				/>
				<span>Псевдо-рельеф</span>
			</label>

			{/* Reset Button */}
			<button
				type="button"
				onClick={onReset}
				disabled={disabled || !isAnyActive}
				className={`px-2 py-0.5 h-7 rounded text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
					isAnyActive
						? "bg-[#1e293b] hover:bg-[#334155] border-[#475569] text-slate-200"
						: "bg-[#0f172a] border-[#1e293b] text-slate-500 cursor-not-allowed"
				}`}
				data-testid="quick-filter-reset"
				title="Сбросить фильтры (0)"
			>
				<RotateCcw size={11} />
				<span>Сброс</span>
			</button>
		</div>
	);
};
