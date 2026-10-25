/**
 * VisiographToolbarToolsCluster.tsx
 * Chairside measurement tools: pointer, ruler, angle, zoom, rotate.
 */

import { Compass, MousePointer, RotateCw, Ruler, ZoomIn } from "lucide-react";
import type React from "react";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";

export interface VisiographToolbarToolsClusterProps {
	activeTool: ActiveVisiographToolType;
	setActiveTool: (tool: ActiveVisiographToolType) => void;
	onClearDrawing: () => void;
	canvasZoom: number;
	setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
	setCanvasRotationDeg: React.Dispatch<React.SetStateAction<number>>;
}

export function VisiographToolbarToolsCluster({
	activeTool,
	setActiveTool,
	onClearDrawing,
	canvasZoom,
	setCanvasZoom,
	setCanvasRotationDeg,
}: VisiographToolbarToolsClusterProps) {
	return (
		<div className="visiograph-toolbar-cluster">
			<button
				type="button"
				className={`icon-button ${activeTool === "pointer" ? "is-active" : ""}`}
				data-testid="btn-tool-pointer"
				onClick={() => { setActiveTool("pointer"); onClearDrawing(); }}
				title="Указатель (Просмотр и навигация)"
				aria-pressed={activeTool === "pointer"}
				aria-label="Указатель"
			>
				<MousePointer size={14} />
			</button>

			<button
				type="button"
				className={`icon-button ${activeTool === "ruler" ? "is-active" : ""}`}
				data-testid="btn-tool-ruler"
				onClick={() => { setActiveTool("ruler"); onClearDrawing(); }}
				title="Линейка: замер длины канала и расстояний в мм"
				aria-pressed={activeTool === "ruler"}
				aria-label="Линейка в миллиметрах"
			>
				<Ruler size={14} />
			</button>

			<button
				type="button"
				className={`icon-button ${activeTool === "angle" ? "is-active" : ""}`}
				data-testid="btn-tool-angle"
				onClick={() => { setActiveTool("angle"); onClearDrawing(); }}
				title="Угломер: угол наклона оси корня или имплантата (°)"
				aria-pressed={activeTool === "angle"}
				aria-label="Угломер"
			>
				<Compass size={14} />
			</button>

			<button
				type="button"
				className={`icon-button ${canvasZoom !== 1.0 ? "is-active" : ""}`}
				data-testid="btn-tool-zoom"
				onClick={() => setCanvasZoom((z) => (z >= 2.0 ? 1.0 : Number((z + 0.5).toFixed(1))))}
				title={`Масштаб: ${Math.round(canvasZoom * 100)}% (клик для переключения)`}
				aria-label="Лупа / Масштаб"
			>
				<ZoomIn size={14} />
			</button>

			<button
				type="button"
				className="icon-button"
				data-testid="btn-tool-rotate"
				onClick={() => setCanvasRotationDeg((r) => (r + 90) % 360)}
				title="Повернуть снимок на 90° по часовой стрелке"
				aria-label="Повернуть снимок на 90 градусов"
			>
				<RotateCw size={14} />
			</button>
		</div>
	);
}
