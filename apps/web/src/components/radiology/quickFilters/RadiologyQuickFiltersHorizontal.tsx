import React from "react";
import { RotateCcw, Sliders } from "lucide-react";
import type { RadiologyQuickFilterState } from "./quickFilterTypes.js";

export interface RadiologyQuickFiltersHorizontalProps {
	filterState: RadiologyQuickFilterState;
	isAnyActive: boolean;
	disabled: boolean;
	className?: string;
	onToggle: (key: keyof RadiologyQuickFilterState) => void;
	onReset: () => void;
}

const FILTER_ITEMS = [
	{ key: "sharpness" as const, label: "Резкость", testId: "sharpness", active: "bg-[#0d9488]/30 border-[#14b8a6] text-[#2dd4bf]", accent: "accent-[#00C853]" },
	{ key: "maxSharpness" as const, label: "Макс. резкость", testId: "max-sharpness", active: "bg-[#00C853]/25 border-[#00C853] text-[#00C853]", accent: "accent-[#00C853]" },
	{ key: "invert" as const, label: "Инверсия", testId: "invert", active: "bg-[#e11d48]/30 border-[#f43f5e] text-[#fb7185]", accent: "accent-[#e11d48]" },
	{ key: "pseudoRelief" as const, label: "Псевдо-рельеф", testId: "emboss", active: "bg-[#d97706]/30 border-[#f59e0b] text-[#fbbf24]", accent: "accent-[#d97706]" },
];

export function RadiologyQuickFiltersHorizontal({
	filterState, isAnyActive, disabled, className = "", onToggle, onReset,
}: RadiologyQuickFiltersHorizontalProps) {
	return (
		<div
			data-testid="radiology-quick-filters-panel"
			className={`radiology-quick-filters-horizontal flex items-center gap-2 px-2.5 py-1 bg-[#0b1320] border border-[#1e293b] rounded-lg text-xs select-none h-9 min-h-[34px] max-h-[36px] overflow-x-auto whitespace-nowrap ${className}`}
		>
			<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
				<Sliders size={12} className="text-[#00C853]" />
				ФИЛЬТРЫ:
			</span>

			{FILTER_ITEMS.map((item) => (
				<label
					key={item.key}
					data-testid={`quick-filter-${item.testId}-label`}
					className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer transition-colors shrink-0 ${
						filterState[item.key] ? item.active : "border-[#334155] bg-[#0f172a] text-slate-300 hover:text-white"
					}`}
				>
					<input
						type="checkbox"
						checked={filterState[item.key]}
						onChange={() => onToggle(item.key)}
						disabled={disabled}
						className={`w-3.5 h-3.5 ${item.accent} cursor-pointer`}
						data-testid={`quick-filter-${item.testId}`}
					/>
					<span>{item.label}</span>
				</label>
			))}

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
}
