/**
 * StudyViewerFloatingToolbar.tsx — Плавающий тулбар манипуляций со снимком визиографа.
 * Включает зум, яркость, контраст, инверсию, калиброванную линейку и сброс.
 * Mandate 8b: строго < 150 строк.
 */

import React from "react";
import {
	ZoomIn,
	ZoomOut,
	RotateCcw,
	Sun,
	Contrast as ContrastIcon,
	Ruler,
	Eye,
} from "lucide-react";

export interface StudyViewerFloatingToolbarProps {
	readonly zoom: number;
	readonly onZoomIn: () => void;
	readonly onZoomOut: () => void;
	readonly brightness: number;
	readonly onCycleBrightness: () => void;
	readonly contrast: number;
	readonly onCycleContrast: () => void;
	readonly isInverted: boolean;
	readonly onToggleInvert: () => void;
	readonly isRulerActive: boolean;
	readonly onToggleRuler: () => void;
	readonly onResetView: () => void;
}

export const StudyViewerFloatingToolbar: React.FC<StudyViewerFloatingToolbarProps> = ({
	zoom,
	onZoomIn,
	onZoomOut,
	brightness,
	onCycleBrightness,
	contrast,
	onCycleContrast,
	isInverted,
	onToggleInvert,
	isRulerActive,
	onToggleRuler,
	onResetView,
}) => {
	return (
		<div
			className="absolute top-3 left-3 flex items-center gap-1.5 p-1.5 rounded-xl shadow-lg z-10 max-w-[calc(100%-24px)] overflow-x-auto"
			style={{
				backgroundColor: "rgba(15, 23, 42, 0.95)",
				border: "1px solid rgba(255, 255, 255, 0.2)",
			}}
		>
			<button
				type="button"
				onClick={onZoomIn}
				style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
				className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
				title="Увеличить (Zoom In)"
				data-testid="btn-zoom-in"
			>
				<ZoomIn className="h-4 w-4" style={{ color: "#ffffff" }} />
			</button>
			<button
				type="button"
				onClick={onZoomOut}
				style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
				className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
				title="Уменьшить (Zoom Out)"
				data-testid="btn-zoom-out"
			>
				<ZoomOut className="h-4 w-4" style={{ color: "#ffffff" }} />
			</button>
			<div className="w-[1px] h-4 bg-white/20 mx-0.5" />
			<button
				type="button"
				onClick={onCycleBrightness}
				style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
				className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
				title={`Яркость: ${brightness}%`}
				data-testid="btn-brightness"
			>
				<Sun className="h-4 w-4" style={{ color: "#ffffff" }} />
			</button>
			<button
				type="button"
				onClick={onCycleContrast}
				style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
				className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
				title={`Контраст: ${contrast}%`}
				data-testid="btn-contrast"
			>
				<ContrastIcon className="h-4 w-4" style={{ color: "#ffffff" }} />
			</button>
			<button
				type="button"
				onClick={onToggleInvert}
				style={{
					backgroundColor: isInverted ? "#0d9488" : "#1e293b",
					color: "#ffffff",
					borderColor: isInverted ? "#0d9488" : "#475569",
				}}
				className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border active:scale-95 transition-all"
				title="Негатив / Инверсия"
				data-testid="btn-invert"
			>
				<Eye className="h-4 w-4" style={{ color: "#ffffff" }} />
			</button>
			<div className="w-[1px] h-4 bg-white/20 mx-0.5" />
			<button
				type="button"
				onClick={onToggleRuler}
				style={{
					backgroundColor: isRulerActive ? "#0d9488" : "#1e293b",
					color: "#ffffff",
					borderColor: isRulerActive ? "#0d9488" : "#475569",
				}}
				className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border active:scale-95 transition-all"
				title="Калиброванная линейка (мм)"
				data-testid="btn-ruler"
			>
				<Ruler className="h-4 w-4" style={{ color: "#ffffff" }} />
			</button>
			<button
				type="button"
				onClick={onResetView}
				style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
				className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
				title="Сбросить вид"
				data-testid="btn-reset-view"
			>
				<RotateCcw className="h-4 w-4" style={{ color: "#ffffff" }} />
			</button>
		</div>
	);
};
