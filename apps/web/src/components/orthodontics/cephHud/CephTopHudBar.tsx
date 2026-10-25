import React from "react";
import { Eye, Layers, Sliders } from "lucide-react";
import { CephZoomCalibrationControls } from "./CephZoomCalibrationControls";

export type XrayFilterMode = "normal" | "invert" | "bone" | "edge";

export interface CephTopHudBarProps {
	readonly filterMode: XrayFilterMode;
	readonly onFilterModeChange?: ((mode: XrayFilterMode) => void) | undefined;
	readonly zoom: number;
	readonly onZoomIn: () => void;
	readonly onZoomOut: () => void;
	readonly onResetView: () => void;
	readonly isCalibrating: boolean;
	readonly onToggleCalibrating: () => void;
	readonly showPolygon: boolean;
	readonly onTogglePolygon?: (() => void) | undefined;
	readonly showPlanes: boolean;
	readonly onTogglePlanes?: (() => void) | undefined;
	readonly showLabels: boolean;
	readonly onToggleLabels?: (() => void) | undefined;
}

const FILTER_OPTIONS = [
	{ id: "normal" as const, label: "Стандарт" },
	{ id: "invert" as const, label: "Инверсия" },
	{ id: "bone" as const, label: "Костный (Bone+)" },
	{ id: "edge" as const, label: "Контуры" },
];

export const CephTopHudBar: React.FC<CephTopHudBarProps> = ({
	filterMode,
	onFilterModeChange,
	zoom,
	onZoomIn,
	onZoomOut,
	onResetView,
	isCalibrating,
	onToggleCalibrating,
	showPolygon,
	onTogglePolygon,
	showPlanes,
	onTogglePlanes,
	showLabels,
	onToggleLabels,
}) => {
	return (
		<div
			data-testid="ceph-unified-hud-strip"
			className="absolute top-2 sm:top-2.5 left-2 sm:left-3 right-2 sm:right-3 z-30 flex items-center justify-between gap-1 sm:gap-1.5 bg-[var(--paper)]/95 border border-[var(--line)] rounded-xl p-1 shadow-2xl backdrop-blur-md min-h-[36px] h-9 select-none flex-nowrap whitespace-nowrap pointer-events-auto text-[var(--ink)]"
		>
			<div className="dente-segmented-bar shrink-0 flex-nowrap">
				{FILTER_OPTIONS.map((flt) => (
					<button
						key={flt.id}
						type="button"
						onClick={() => onFilterModeChange?.(flt.id)}
						className={`dente-segmented-item ${filterMode === flt.id ? "active" : ""}`}
						title={`Фильтр рентгенограммы: ${flt.label}`}
					>
						{flt.label}
					</button>
				))}
			</div>

			<div className="w-[1px] h-5 bg-[var(--line)] shrink-0 mx-0.5" />

			<CephZoomCalibrationControls
				zoom={zoom}
				onZoomIn={onZoomIn}
				onZoomOut={onZoomOut}
				onResetView={onResetView}
				isCalibrating={isCalibrating}
				onToggleCalibrating={onToggleCalibrating}
			/>

			<div className="w-[1px] h-5 bg-[var(--line)] shrink-0 mx-0.5" />

			<div className="dente-segmented-bar shrink-0 flex-nowrap">
				<button
					type="button"
					onClick={onTogglePolygon}
					className={`dente-segmented-item ${showPolygon ? "active" : ""}`}
					title="Включить / отключить цефалометрический полигон"
				>
					<Layers size={13} />
					<span>Полигон</span>
				</button>
				<button
					type="button"
					onClick={onTogglePlanes}
					className={`dente-segmented-item ${showPlanes ? "active" : ""}`}
					title="Включить / отключить плоскости (SN, FH, MP, OP)"
				>
					<Sliders size={13} />
					<span>Плоскости</span>
				</button>
				<button
					type="button"
					onClick={onToggleLabels}
					className={`dente-segmented-item ${showLabels ? "active" : ""}`}
					title="Включить / отключить подписи анатомических точек"
				>
					<Eye size={13} />
					<span>Подписи</span>
				</button>
			</div>
		</div>
	);
};
