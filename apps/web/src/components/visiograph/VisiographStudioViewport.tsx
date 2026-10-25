/**
 * VisiographStudioViewport.tsx
 * Zoomable & Pannable radiological canvas viewport (Mandates 8b, 8e).
 */

import type React from "react";
import type { ActiveVisiographTool } from "./VisiographStudioTypes";

export interface VisiographStudioViewportProps {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	canvasZoom: number;
	setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
	canvasRotationDeg: number;
	activeTool: ActiveVisiographTool;
	onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	onCanvasDoubleClick: () => void;
	onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	onMouseLeave: () => void;
}

export function VisiographStudioViewport({
	canvasRef,
	canvasZoom,
	setCanvasZoom,
	canvasRotationDeg,
	activeTool,
	onCanvasClick,
	onCanvasDoubleClick,
	onMouseMove,
	onMouseLeave,
}: VisiographStudioViewportProps) {
	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		e.preventDefault();
		const delta = e.deltaY < 0 ? 0.1 : -0.1;
		setCanvasZoom((z) => Math.min(3.5, Math.max(0.4, Number((z + delta).toFixed(2)))));
	};

	return (
		<div
			style={{
				flex: 1,
				background: "var(--dark-bg, #010409)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				overflow: "auto",
				padding: "16px",
			}}
			onWheel={handleWheel}
		>
			<canvas
				ref={canvasRef}
				onClick={onCanvasClick}
				onDoubleClick={onCanvasDoubleClick}
				onMouseMove={onMouseMove}
				onMouseLeave={onMouseLeave}
				style={{
					maxWidth: "100%",
					maxHeight: "75vh",
					boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
					cursor: activeTool === "pointer" ? "default" : "crosshair",
					borderRadius: "4px",
					transform: `scale(${canvasZoom}) rotate(${canvasRotationDeg}deg)`,
					transition: "transform 0.1s ease-out",
				}}
			/>
		</div>
	);
}
