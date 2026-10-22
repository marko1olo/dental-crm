import {
	Contrast,
	RotateCw,
	Ruler,
	Sliders,
	Sparkles,
	ZoomIn,
} from "lucide-react";
import React from "react";
import type { MobileRadiologyFilterToolbarProps } from "./types.js";

export const MobileThumbActionButtons: React.FC<
	Pick<
		MobileRadiologyFilterToolbarProps,
		| "inverted"
		| "contrast"
		| "enhancementClahe"
		| "isRulerActive"
		| "zoom"
		| "rotationDeg"
		| "onToggleInvert"
		| "onCycleContrast"
		| "onToggleFilterPopover"
		| "onToggleRuler"
		| "onCycleZoom"
		| "onRotate"
	>
> = (p) => {
	return (
		<>
			<button
				type="button"
				onClick={p.onToggleInvert}
				className={`mobile-radiology-thumb-btn ${p.inverted ? "active" : ""}`}
				data-testid="btn-mobile-thumb-invert"
				aria-label="Инвертировать рентген (Негатив/Позитив)"
				title="Инверсия (Негатив)"
			>
				<Contrast size={19} />
				<span>Негатив</span>
			</button>

			<button
				type="button"
				onClick={p.onCycleContrast}
				onContextMenu={(e) => {
					e.preventDefault();
					p.onToggleFilterPopover();
				}}
				className={`mobile-radiology-thumb-btn ${p.contrast > 1.0 || p.enhancementClahe ? "active" : ""}`}
				data-testid="btn-mobile-thumb-contrast"
				aria-label="Усиление контраста деталей"
				title="Контраст"
			>
				<Sparkles size={19} />
				<span>
					{p.contrast > 1.0 ? `${Math.round(p.contrast * 100)}%` : "Контраст"}
				</span>
			</button>

			<button
				type="button"
				onClick={p.onToggleRuler}
				className={`mobile-radiology-thumb-btn ${p.isRulerActive ? "active" : ""}`}
				data-testid="btn-mobile-thumb-ruler"
				aria-label="Клиническая линейка (мм)"
				title="Линейка (мм)"
			>
				<Ruler size={19} />
				<span>Линейка</span>
			</button>

			<button
				type="button"
				onClick={p.onCycleZoom}
				className={`mobile-radiology-thumb-btn ${p.zoom > 1.0 ? "active" : ""}`}
				data-testid="btn-mobile-thumb-zoom"
				aria-label="Шаг масштаба 1x / 1.5x / 2.0x"
				title="Масштаб"
			>
				<ZoomIn size={19} />
				<span>{p.zoom > 1.0 ? `${p.zoom.toFixed(1)}x` : "Зум"}</span>
			</button>

			<button
				type="button"
				onClick={p.onRotate}
				className={`mobile-radiology-thumb-btn ${p.rotationDeg !== 0 ? "active" : ""}`}
				data-testid="btn-mobile-thumb-rotate"
				aria-label="Повернуть на 90 градусов"
				title="Поворот"
			>
				<RotateCw size={19} />
				<span>{p.rotationDeg !== 0 ? `${p.rotationDeg}°` : "90°"}</span>
			</button>

			<button
				type="button"
				onClick={p.onToggleFilterPopover}
				className="mobile-radiology-thumb-btn"
				data-testid="btn-mobile-thumb-sliders"
				aria-label="Тонкие фильтры (Яркость, Контраст, CLAHE)"
				title="Фильтры"
			>
				<Sliders size={19} />
				<span>Фильтры</span>
			</button>
		</>
	);
};
