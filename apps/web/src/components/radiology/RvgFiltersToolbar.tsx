import type React from "react";
import {
	Activity,
	Contrast,
	Eye,
	Layers,
	RotateCcw,
	Sliders,
	Sparkles,
	Sun,
	Zap,
} from "lucide-react";

export interface RvgFilterValues {
	brightness: number; // 0..200 (100 = 1.0)
	contrast: number; // 0..300 (100 = 1.0)
	gamma: number; // 0.5..2.5 (1.0 = 1.0)
	sharpness: number; // 0..100
	clahe: number; // 0..100 (Contrast Limited Adaptive Histogram Equalization)
	invert: boolean;
	denoise: boolean;
}

export interface RvgFilterPreset {
	id: string;
	label: string;
	description: string;
	iconName: string;
	values: RvgFilterValues;
}

export const RVG_FILTER_PRESETS: readonly RvgFilterPreset[] = [
	{
		id: "standard",
		label: "Стандарт",
		description: "Естественная гамма и сбалансированная яркость снимка",
		iconName: "Sun",
		values: {
			brightness: 100,
			contrast: 100,
			gamma: 1.0,
			sharpness: 0,
			clahe: 0,
			invert: false,
			denoise: false,
		},
	},
	{
		id: "endo",
		label: "Эндодонтия",
		description: "Высокая детализация апексов, устьев каналов и качества обтурации",
		iconName: "Zap",
		values: {
			brightness: 105,
			contrast: 175,
			gamma: 0.9,
			sharpness: 60,
			clahe: 70,
			invert: false,
			denoise: false,
		},
	},
	{
		id: "perio",
		label: "Пародонт / Кость",
		description: "Оптимизация кортикальной пластинки, периодонтальной щели и трабекул",
		iconName: "Layers",
		values: {
			brightness: 110,
			contrast: 160,
			gamma: 1.1,
			sharpness: 40,
			clahe: 85,
			invert: false,
			denoise: false,
		},
	},
	{
		id: "caries",
		label: "Кариес / Эмаль",
		description: "Контрастирование эмалево-дентинной границы для скрытого кариеса",
		iconName: "Sparkles",
		values: {
			brightness: 95,
			contrast: 190,
			gamma: 0.85,
			sharpness: 50,
			clahe: 60,
			invert: false,
			denoise: false,
		},
	},
	{
		id: "implant",
		label: "Импланты / Металл",
		description: "Подавление засветов от металлических коронок и контроль витков имплантата",
		iconName: "Activity",
		values: {
			brightness: 85,
			contrast: 220,
			gamma: 1.2,
			sharpness: 30,
			clahe: 40,
			invert: false,
			denoise: true,
		},
	},
	{
		id: "negative",
		label: "Негатив / Трещины",
		description: "Инвертированный рентген для выявления микротрещин и вертикальных фрактур",
		iconName: "Contrast",
		values: {
			brightness: 100,
			contrast: 120,
			gamma: 1.0,
			sharpness: 45,
			clahe: 50,
			invert: true,
			denoise: false,
		},
	},
];

export const DEFAULT_RVG_FILTERS: RvgFilterValues = {
	brightness: 100,
	contrast: 100,
	gamma: 1.0,
	sharpness: 0,
	clahe: 0,
	invert: false,
	denoise: false,
};

export interface RvgFiltersToolbarProps {
	filters: RvgFilterValues;
	onChange: (updated: RvgFilterValues) => void;
	onReset?: () => void;
	activePresetId?: string;
	onSelectPreset?: (preset: RvgFilterPreset) => void;
	isSplitCompare?: boolean;
	onToggleSplitCompare?: (enabled: boolean) => void;
	disabled?: boolean;
}

export const RvgFiltersToolbar: React.FC<RvgFiltersToolbarProps> = ({
	filters,
	onChange,
	onReset,
	activePresetId = "standard",
	onSelectPreset,
	isSplitCompare = false,
	onToggleSplitCompare,
	disabled = false,
}) => {
	const handlePresetClick = (preset: RvgFilterPreset) => {
		if (disabled) return;
		onChange(preset.values);
		if (onSelectPreset) {
			onSelectPreset(preset);
		}
	};

	const handleSliderChange = (key: keyof RvgFilterValues, value: number) => {
		if (disabled) return;
		onChange({
			...filters,
			[key]: value,
		});
	};

	const handleToggle = (key: "invert" | "denoise") => {
		if (disabled) return;
		onChange({
			...filters,
			[key]: !filters[key],
		});
	};

	const handleReset = () => {
		if (disabled) return;
		onChange(DEFAULT_RVG_FILTERS);
		if (onReset) {
			onReset();
		}
	};

	return (
		<div className="rvg-filters-toolbar" data-testid="rvg-filters-toolbar">
			{/* Quick Presets Section */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
						<Sparkles className="w-3.5 h-3.5 text-teal-400" />
						Клинические пресеты
					</span>
					<button
						type="button"
						onClick={handleReset}
						disabled={disabled}
						className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-teal-400 transition-colors cursor-pointer disabled:opacity-50"
						title="Сбросить все фильтры"
						data-testid="rvg-reset-filters-btn"
					>
						<RotateCcw className="w-3 h-3" />
						Сброс
					</button>
				</div>

				<div className="rvg-presets-grid">
					{RVG_FILTER_PRESETS.map((preset) => {
						const isSelected = activePresetId === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handlePresetClick(preset)}
								disabled={disabled}
								className={`rvg-preset-chip ${isSelected ? "active" : ""}`}
								title={preset.description}
								data-testid={`rvg-preset-${preset.id}`}
							>
								<span>{preset.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Filter Sliders Section */}
			<div className="flex flex-col gap-3 pt-2 border-t border-slate-700/60">
				<span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
					<Sliders className="w-3.5 h-3.5 text-teal-400" />
					Тонкая настройка фильтров
				</span>

				{/* 1. CLAHE (Local Adaptive Contrast) */}
				<div className="rvg-slider-control-row">
					<div className="rvg-slider-label-bar">
						<span className="flex items-center gap-1">
							CLAHE (Локальный контраст)
						</span>
						<span className="font-mono text-teal-400 font-bold">
							{filters.clahe}%
						</span>
					</div>
					<input
						type="range"
						min="0"
						max="100"
						step="5"
						value={filters.clahe}
						onChange={(e) => handleSliderChange("clahe", Number(e.target.value))}
						disabled={disabled}
						className="rvg-slider-input"
						data-testid="rvg-slider-clahe"
					/>
				</div>

				{/* 2. Sharpness */}
				<div className="rvg-slider-control-row">
					<div className="rvg-slider-label-bar">
						<span>Резкость (Unsharp Mask)</span>
						<span className="font-mono text-teal-400 font-bold">
							{filters.sharpness}%
						</span>
					</div>
					<input
						type="range"
						min="0"
						max="100"
						step="5"
						value={filters.sharpness}
						onChange={(e) => handleSliderChange("sharpness", Number(e.target.value))}
						disabled={disabled}
						className="rvg-slider-input"
						data-testid="rvg-slider-sharpness"
					/>
				</div>

				{/* 3. Brightness */}
				<div className="rvg-slider-control-row">
					<div className="rvg-slider-label-bar">
						<span>Яркость</span>
						<span className="font-mono text-slate-300">
							{filters.brightness}%
						</span>
					</div>
					<input
						type="range"
						min="20"
						max="200"
						step="5"
						value={filters.brightness}
						onChange={(e) => handleSliderChange("brightness", Number(e.target.value))}
						disabled={disabled}
						className="rvg-slider-input"
						data-testid="rvg-slider-brightness"
					/>
				</div>

				{/* 4. Contrast */}
				<div className="rvg-slider-control-row">
					<div className="rvg-slider-label-bar">
						<span>Контрастность</span>
						<span className="font-mono text-slate-300">
							{filters.contrast}%
						</span>
					</div>
					<input
						type="range"
						min="50"
						max="300"
						step="5"
						value={filters.contrast}
						onChange={(e) => handleSliderChange("contrast", Number(e.target.value))}
						disabled={disabled}
						className="rvg-slider-input"
						data-testid="rvg-slider-contrast"
					/>
				</div>

				{/* 5. Gamma */}
				<div className="rvg-slider-control-row">
					<div className="rvg-slider-label-bar">
						<span>Гамма (γ)</span>
						<span className="font-mono text-slate-300">
							{filters.gamma.toFixed(2)}
						</span>
					</div>
					<input
						type="range"
						min="0.5"
						max="2.5"
						step="0.05"
						value={filters.gamma}
						onChange={(e) => handleSliderChange("gamma", Number(e.target.value))}
						disabled={disabled}
						className="rvg-slider-input"
						data-testid="rvg-slider-gamma"
					/>
				</div>

				{/* Toggle Buttons: Invert & Denoise & Split Compare */}
				<div className="flex flex-wrap items-center gap-2 pt-2">
					<button
						type="button"
						onClick={() => handleToggle("invert")}
						disabled={disabled}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
							filters.invert
								? "bg-teal-600 border-teal-500 text-white shadow-sm"
								: "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
						}`}
						data-testid="rvg-toggle-invert-btn"
					>
						<Contrast className="w-3.5 h-3.5" />
						<span>Инверсия (Негатив)</span>
					</button>

					<button
						type="button"
						onClick={() => handleToggle("denoise")}
						disabled={disabled}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
							filters.denoise
								? "bg-teal-600 border-teal-500 text-white shadow-sm"
								: "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
						}`}
						data-testid="rvg-toggle-denoise-btn"
					>
						<Activity className="w-3.5 h-3.5" />
						<span>Шумоподавление</span>
					</button>

					{onToggleSplitCompare && (
						<button
							type="button"
							onClick={() => onToggleSplitCompare(!isSplitCompare)}
							disabled={disabled}
							className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
								isSplitCompare
									? "bg-cyan-600 border-cyan-500 text-white shadow-sm"
									: "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
							}`}
							data-testid="rvg-toggle-split-btn"
						>
							<Eye className="w-3.5 h-3.5" />
							<span>Сравнить (До / После)</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
