import React from "react";
import {
	Contrast,
	RotateCw,
	Ruler,
	Sliders,
	Sparkles,
	X,
	ZoomIn,
} from "lucide-react";
import type { MobileRadiologyFilterToolbarProps } from "./types.js";

/**
 * MobileRadiologyFilterToolbar: Tactile bottom panel for natural thumb zone (>=44x44px touch targets).
 * Provides quick toggle for negative invert, contrast cycles, ruler caliper, step zoom, rotation,
 * and popup sliders for fine-tuning brightness, contrast, and CLAHE sharpness.
 */
export const MobileRadiologyFilterToolbar: React.FC<MobileRadiologyFilterToolbarProps> = ({
	inverted,
	contrast,
	brightness,
	enhancementClahe,
	zoom,
	rotationDeg,
	isRulerActive,
	isFilterPopoverOpen,
	onToggleInvert,
	onCycleContrast,
	onToggleRuler,
	onCycleZoom,
	onRotate,
	onToggleFilterPopover,
	onChangeBrightness,
	onChangeContrast,
	onToggleClahe,
	onResetFilters,
	onCloseFilterPopover,
}) => {
	return (
		<>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. FLOATING THUMB ACTION BAR (NATURAL THUMB ZONE >=44px)
			    ═══════════════════════════════════════════════════════════════════ */}
			<nav
				className="mobile-radiology-thumb-bar"
				data-testid="mobile-radiology-thumb-bar"
				role="toolbar"
				aria-label="Инструменты управления снимком"
			>
				{/* 1. Invert (Negative / Positive) */}
				<button
					type="button"
					onClick={onToggleInvert}
					className={`mobile-radiology-thumb-btn ${inverted ? "active" : ""}`}
					data-testid="btn-mobile-thumb-invert"
					aria-label="Инвертировать рентген (Негатив/Позитив)"
					title="Инверсия (Негатив)"
				>
					<Contrast size={19} />
					<span>Негатив</span>
				</button>

				{/* 2. Contrast presets & popup */}
				<button
					type="button"
					onClick={onCycleContrast}
					onContextMenu={(e) => {
						e.preventDefault();
						onToggleFilterPopover();
					}}
					className={`mobile-radiology-thumb-btn ${contrast > 1.0 || enhancementClahe ? "active" : ""}`}
					data-testid="btn-mobile-thumb-contrast"
					aria-label="Усиление контраста деталей"
					title="Контраст"
				>
					<Sparkles size={19} />
					<span>{contrast > 1.0 ? `${Math.round(contrast * 100)}%` : "Контраст"}</span>
				</button>

				{/* 3. Measurement Caliper (Ruler) */}
				<button
					type="button"
					onClick={onToggleRuler}
					className={`mobile-radiology-thumb-btn ${isRulerActive ? "active" : ""}`}
					data-testid="btn-mobile-thumb-ruler"
					aria-label="Калиброванная линейка (измерение в мм)"
					title="Линейка"
				>
					<Ruler size={19} />
					<span>Линейка</span>
				</button>

				{/* 4. Zoom cycle (1.0x -> 1.5x -> 2.0x -> 2.5x) */}
				<button
					type="button"
					onClick={onCycleZoom}
					className={`mobile-radiology-thumb-btn ${zoom > 1.0 ? "active" : ""}`}
					data-testid="btn-mobile-thumb-zoom"
					aria-label="Увеличить снимок"
					title="Зум"
				>
					<ZoomIn size={19} />
					<span>{zoom > 1.0 ? `${zoom.toFixed(1)}x` : "Зум"}</span>
				</button>

				{/* 5. Rotate 90° CW */}
				<button
					type="button"
					onClick={onRotate}
					className={`mobile-radiology-thumb-btn ${rotationDeg !== 0 ? "active" : ""}`}
					data-testid="btn-mobile-thumb-rotate"
					aria-label="Повернуть снимок на 90 градусов"
					title="Поворот"
				>
					<RotateCw size={19} />
					<span>{rotationDeg !== 0 ? `${rotationDeg}°` : "Поворот"}</span>
				</button>

				{/* 6. Settings popover (Sliders for brightness & contrast) */}
				<button
					type="button"
					onClick={onToggleFilterPopover}
					className={`mobile-radiology-thumb-btn ${isFilterPopoverOpen ? "active" : ""}`}
					data-testid="btn-mobile-thumb-sliders"
					aria-label="Тонкая настройка яркости и контраста"
					title="Фильтры"
				>
					<Sliders size={19} />
					<span>Фильтр</span>
				</button>
			</nav>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. CONTRAST & BRIGHTNESS POPOVER
			    ═══════════════════════════════════════════════════════════════════ */}
			{isFilterPopoverOpen && (
				<div
					className="mobile-radiology-slider-popover"
					data-testid="mobile-contrast-popover"
				>
					<div className="flex items-center justify-between pb-1 border-b border-white/10">
						<span className="text-xs font-bold text-white flex items-center gap-1.5">
							<Sliders size={14} className="text-teal-400" />
							<span>Тонкая настройка видимости</span>
						</span>
						<button
							type="button"
							onClick={onCloseFilterPopover}
							className="text-slate-400 hover:text-white p-1 cursor-pointer"
							aria-label="Закрыть настройки"
						>
							<X size={15} />
						</button>
					</div>

					<div className="space-y-3 pt-1">
						<label className="flex flex-col gap-1 text-xs text-slate-300">
							<div className="flex justify-between font-semibold">
								<span>Яркость:</span>
								<span className="text-teal-400 font-mono">{Math.round(brightness * 100)}%</span>
							</div>
							<input
								type="range"
								min="0.6"
								max="1.5"
								step="0.05"
								value={brightness}
								onChange={(e) => onChangeBrightness(Number(e.target.value))}
								className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
							/>
						</label>

						<label className="flex flex-col gap-1 text-xs text-slate-300">
							<div className="flex justify-between font-semibold">
								<span>Контраст:</span>
								<span className="text-teal-400 font-mono">{Math.round(contrast * 100)}%</span>
							</div>
							<input
								type="range"
								min="0.7"
								max="2.0"
								step="0.05"
								value={contrast}
								onChange={(e) => onChangeContrast(Number(e.target.value))}
								className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
							/>
						</label>

						<div className="flex items-center justify-between pt-1">
							<button
								type="button"
								onClick={onResetFilters}
								className="text-xs font-semibold text-slate-400 hover:text-white underline cursor-pointer"
							>
								Сброс фильтров
							</button>

							<button
								type="button"
								onClick={onToggleClahe}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
									enhancementClahe ? "bg-teal-600 text-white" : "bg-white/10 text-slate-200"
								}`}
							>
								CLAHE четкость
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
