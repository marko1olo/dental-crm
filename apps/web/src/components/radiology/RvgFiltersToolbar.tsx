import type React from "react";
import { useState } from "react";
import {
	Activity,
	ChevronDown,
	ChevronUp,
	Contrast,
	Eye,
	RotateCcw,
	RotateCw,
	Ruler,
	Sliders,
	Sparkles,
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
	layout?: "toolbar" | "dock";
	onToggleMeasure?: () => void;
	isMeasuring?: boolean;
	onRotate?: () => void;
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
	layout = "dock",
	onToggleMeasure,
	isMeasuring = false,
	onRotate,
}) => {
	const [showFineTuning, setShowFineTuning] = useState<boolean>(layout === "dock");

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

	// Strict 1-Row Hick's Law Toolbar (32-36px: Invert, Contrast, Sharpness, Measurement, Rotate, Reset)
	const render1RowHickToolbar = () => (
		<div
			className="rvg-filters-1row-toolbar flex items-center justify-between gap-1.5 p-1 rounded-lg border border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)] h-9 min-h-[34px] max-h-[36px] overflow-x-auto whitespace-nowrap text-xs"
			data-testid="rvg-filters-1row-toolbar"
		>
			<div className="flex items-center gap-1.5 shrink-0">
				{/* 1. Инверсия (Негатив) */}
				<button
					type="button"
					onClick={() => handleToggle("invert")}
					disabled={disabled}
					className={`px-2 py-1 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
						filters.invert
							? "bg-[var(--teal,#0d9488)] border-[var(--teal,#14b8a6)] text-white shadow-sm"
							: "bg-[var(--paper-strong,#0f172a)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:text-white"
					}`}
					title="Инверсия (Негатив / Позитив)"
					data-testid="rvg-toggle-invert-btn"
				>
					<Contrast className="w-3.5 h-3.5" />
					<span>Негатив</span>
				</button>

				{/* 2. Контраст (1-клик выбор клинического пресета) */}
				<select
					value={activePresetId}
					onChange={(e) => {
						const p = RVG_FILTER_PRESETS.find((item) => item.id === e.target.value);
						if (p) handlePresetClick(p);
					}}
					disabled={disabled}
					className="px-2 py-0.5 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-semibold border border-[var(--line,#334155)] bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#c9d1d9)] outline-none cursor-pointer shrink-0"
					title="Клинический контраст (Закон Хика)"
					data-testid="rvg-contrast-preset-select"
				>
					{RVG_FILTER_PRESETS.map((p) => (
						<option key={p.id} value={p.id} className="bg-[var(--paper-strong,#0f172a)] text-white">
							{p.label}
						</option>
					))}
				</select>

				{/* 3. Четкость (USM шаг: 0% -> 50% -> 100%) */}
				<button
					type="button"
					onClick={() => {
						const nextSharpness = filters.sharpness === 0 ? 50 : filters.sharpness === 50 ? 100 : 0;
						handleSliderChange("sharpness", nextSharpness);
					}}
					disabled={disabled}
					className={`px-2 py-1 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
						filters.sharpness > 0
							? "bg-[var(--teal-soft,rgba(13,148,136,0.2))] border-[var(--teal,#14b8a6)] text-[var(--teal,#2dd4bf)]"
							: "bg-[var(--paper-strong,#0f172a)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:text-white"
					}`}
					title="Четкость (USM): клик переключает 0% -> 50% -> 100%"
					data-testid="rvg-sharpness-quick-btn"
				>
					<Sliders className="w-3.5 h-3.5" />
					<span>Четкость {filters.sharpness > 0 ? `${filters.sharpness}%` : ""}</span>
				</button>

				{/* 4. Измерение (Линейка) */}
				{onToggleMeasure && (
					<button
						type="button"
						onClick={onToggleMeasure}
						disabled={disabled}
						className={`px-2 py-1 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
							isMeasuring
								? "bg-[var(--primary,#1f6feb)] border-[var(--primary,#58a6ff)] text-white shadow-sm"
								: "bg-[var(--paper-strong,#0f172a)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:text-white"
						}`}
						title="Инструмент измерения (линейка)"
						data-testid="rvg-measure-btn"
					>
						<Ruler className="w-3.5 h-3.5" />
						<span>Замер</span>
					</button>
				)}

				{/* 5. Поворот 90° */}
				{onRotate && (
					<button
						type="button"
						onClick={onRotate}
						disabled={disabled}
						className="px-2 py-1 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-semibold border border-[var(--line,#334155)] bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#c9d1d9)] hover:text-white transition-all cursor-pointer flex items-center gap-1 shrink-0"
						title="Повернуть снимок на 90° (R)"
						data-testid="rvg-rotate-btn-toolbar"
					>
						<RotateCw className="w-3.5 h-3.5" />
						<span>90°</span>
					</button>
				)}

				{/* 6. Сброс всех настроек */}
				<button
					type="button"
					onClick={handleReset}
					disabled={disabled}
					className="px-2 py-1 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-semibold border border-[var(--line,#334155)] bg-[var(--paper-strong,#0f172a)] text-[var(--muted,#94a3b8)] hover:text-[var(--danger,#f43f5e)] transition-all cursor-pointer flex items-center gap-1 shrink-0"
					title="Сбросить все фильтры"
					data-testid="rvg-reset-filters-btn"
				>
					<RotateCcw className="w-3.5 h-3.5" />
					<span>Сброс</span>
				</button>
			</div>

			{/* Right Controls in 1-Row Toolbar */}
			<div className="flex items-center gap-1.5 shrink-0 ml-auto">
				{onToggleSplitCompare && (
					<button
						type="button"
						onClick={() => onToggleSplitCompare(!isSplitCompare)}
						disabled={disabled}
						className={`px-2 py-1 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
							isSplitCompare
								? "bg-cyan-600 border-cyan-500 text-white shadow-sm"
								: "bg-[var(--paper-strong,#0f172a)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:text-white"
						}`}
						title="Сравнить (До / После)"
						data-testid="rvg-toggle-split-btn"
					>
						<Eye className="w-3.5 h-3.5" />
						<span>До/После</span>
					</button>
				)}

				{layout === "dock" && (
					<button
						type="button"
						onClick={() => setShowFineTuning((prev) => !prev)}
						disabled={disabled}
						className="px-2 py-1 h-7 min-h-[28px] max-h-[30px] rounded text-xs font-medium border border-[var(--line,#334155)] bg-[var(--paper-strong,#0f172a)] text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#c9d1d9)] transition-all cursor-pointer flex items-center gap-1 shrink-0"
						title="Тонкая настройка слайдеров"
						data-testid="rvg-toggle-fine-tuning-btn"
					>
						<span>Слайдеры</span>
						{showFineTuning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
					</button>
				)}
			</div>
		</div>
	);

	if (layout === "toolbar") {
		return render1RowHickToolbar();
	}

	return (
		<div className="rvg-filters-toolbar flex flex-col gap-2.5 w-full" data-testid="rvg-filters-toolbar">
			{/* Strict 1-Row Hick's Law Toolbar Header */}
			{render1RowHickToolbar()}

			{/* Collapsible / Expandable Fine Tuning Dock */}
			{showFineTuning && (
				<div className="flex flex-col gap-2.5 pt-1 animate-in fade-in duration-150">
					{/* Quick Presets Section */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#c9d1d9)] flex items-center gap-1.5">
								<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#14b8a6)]" />
								Клинические пресеты (1 клик)
							</span>
						</div>

						<div className="rvg-presets-grid grid grid-cols-2 gap-1.5">
							{RVG_FILTER_PRESETS.map((preset) => {
								const isSelected = activePresetId === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => handlePresetClick(preset)}
										disabled={disabled}
										className={`rvg-preset-chip flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
											isSelected
												? "bg-[var(--teal,#0d9488)] border-[var(--teal,#14b8a6)] text-white shadow-sm"
												: "bg-[var(--paper-soft,#1e293b)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:bg-[var(--line,#334155)]"
										}`}
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
					<div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--line,#334155)]">
						<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#c9d1d9)] flex items-center gap-1.5">
							<Sliders className="w-3.5 h-3.5 text-[var(--teal,#14b8a6)]" />
							Тонкая настройка фильтров
						</span>

						{/* 1. CLAHE (Local Adaptive Contrast) */}
						<div className="rvg-slider-control-row flex flex-col gap-1">
							<div className="rvg-slider-label-bar flex justify-between text-xs text-[var(--muted,#94a3b8)]">
								<span>CLAHE (Локальный контраст)</span>
								<span className="font-mono text-[var(--teal,#14b8a6)] font-bold">
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
								className="rvg-slider-input w-full accent-[var(--teal,#14b8a6)]"
								data-testid="rvg-slider-clahe"
							/>
						</div>

						{/* 2. Sharpness */}
						<div className="rvg-slider-control-row flex flex-col gap-1">
							<div className="rvg-slider-label-bar flex justify-between text-xs text-[var(--muted,#94a3b8)]">
								<span>Резкость (Unsharp Mask)</span>
								<span className="font-mono text-[var(--teal,#14b8a6)] font-bold">
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
								className="rvg-slider-input w-full accent-[var(--teal,#14b8a6)]"
								data-testid="rvg-slider-sharpness"
							/>
						</div>

						{/* 3. Brightness */}
						<div className="rvg-slider-control-row flex flex-col gap-1">
							<div className="rvg-slider-label-bar flex justify-between text-xs text-[var(--muted,#94a3b8)]">
								<span>Яркость</span>
								<span className="font-mono text-[var(--ink,#c9d1d9)]">
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
								className="rvg-slider-input w-full accent-[var(--teal,#14b8a6)]"
								data-testid="rvg-slider-brightness"
							/>
						</div>

						{/* 4. Contrast */}
						<div className="rvg-slider-control-row flex flex-col gap-1">
							<div className="rvg-slider-label-bar flex justify-between text-xs text-[var(--muted,#94a3b8)]">
								<span>Контрастность</span>
								<span className="font-mono text-[var(--ink,#c9d1d9)]">
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
								className="rvg-slider-input w-full accent-[var(--teal,#14b8a6)]"
								data-testid="rvg-slider-contrast"
							/>
						</div>

						{/* 5. Gamma */}
						<div className="rvg-slider-control-row flex flex-col gap-1">
							<div className="rvg-slider-label-bar flex justify-between text-xs text-[var(--muted,#94a3b8)]">
								<span>Гамма (γ)</span>
								<span className="font-mono text-[var(--ink,#c9d1d9)]">
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
								className="rvg-slider-input w-full accent-[var(--teal,#14b8a6)]"
								data-testid="rvg-slider-gamma"
							/>
						</div>

						{/* Toggle Buttons: Invert & Denoise */}
						<div className="flex flex-wrap items-center gap-2 pt-1">
							<button
								type="button"
								onClick={() => handleToggle("invert")}
								disabled={disabled}
								className={`px-3 py-1.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
									filters.invert
										? "bg-[var(--teal,#0d9488)] border-[var(--teal,#14b8a6)] text-white shadow-sm"
										: "bg-[var(--paper-soft,#1e293b)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:text-white"
								}`}
								data-testid="rvg-toggle-invert-btn-dock"
							>
								<Contrast className="w-3.5 h-3.5" />
								<span>Инверсия (Негатив)</span>
							</button>

							<button
								type="button"
								onClick={() => handleToggle("denoise")}
								disabled={disabled}
								className={`px-3 py-1.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
									filters.denoise
										? "bg-[var(--teal,#0d9488)] border-[var(--teal,#14b8a6)] text-white shadow-sm"
										: "bg-[var(--paper-soft,#1e293b)] border-[var(--line,#334155)] text-[var(--ink,#c9d1d9)] hover:text-white"
								}`}
								data-testid="rvg-toggle-denoise-btn"
							>
								<Activity className="w-3.5 h-3.5" />
								<span>Шумоподавление</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

