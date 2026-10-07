/**
 * DENTE CRM — Dedicated Interactive CBCT MPR Viewport Component (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Encapsulates an individual multiplanar viewport (Axial, Coronal, Sagittal, Cross-Section)
 * with base voxel canvas, vector overlay canvas, HUD telemetry, and guaranteed
 * two-stage adaptive interaction notification on mouse wheel, dragging, and oblique rotation.
 */

import React, { useCallback } from "react";
import type { CbctViewportType, MprPlane } from "../cbctMprMath";
import { notifyCbctSliceInteraction } from "./cbctAdaptiveSlicePipeline";

export interface CbctMprViewportProps {
	readonly viewportType: CbctViewportType;
	readonly isActive?: boolean;
	readonly extraClassName?: string;
	readonly baseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly cursor?: string;
	readonly testId?: string;
	readonly onWheel?: (e: React.WheelEvent<HTMLCanvasElement>) => void;
	readonly onMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly onMouseUp?: () => void;
	readonly onDoubleClick?: (e: React.MouseEvent<HTMLElement>) => void;
	readonly onPointerDownCapture?: () => void;
	readonly onMouseEnter?: () => void;
	readonly onMouseLeave?: () => void;
	readonly onContextMenu?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly children?: React.ReactNode;
}

export const CbctMprViewport: React.FC<CbctMprViewportProps> = ({
	viewportType,
	isActive = false,
	extraClassName = "flex-1 flex flex-col",
	baseCanvasRef,
	overlayCanvasRef,
	cursor = "crosshair",
	testId,
	onWheel,
	onMouseDown,
	onMouseMove,
	onMouseUp,
	onDoubleClick,
	onPointerDownCapture,
	onMouseEnter,
	onMouseLeave,
	onContextMenu,
	children,
}) => {
	// Guaranteed interaction dispatch on wheel (0–80 ms bilinear fast-path activation)
	const handleWheelWithNotification = useCallback(
		(e: React.WheelEvent<HTMLCanvasElement>) => {
			notifyCbctSliceInteraction();
			onWheel?.(e);
		},
		[onWheel],
	);

	// Guaranteed interaction dispatch on pointer down (drag / scrub start)
	const handleMouseDownWithNotification = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			notifyCbctSliceInteraction();
			onMouseDown?.(e);
		},
		[onMouseDown],
	);

	// Interaction dispatch on mouse movement during active drags
	const handleMouseMoveWithNotification = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (e.buttons !== 0) {
				notifyCbctSliceInteraction();
			}
			onMouseMove?.(e);
		},
		[onMouseMove],
	);

	const getBorderColors = () => {
		switch (viewportType) {
			case "axial":
				return isActive
					? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
					: "border border-cyan-500/30 hover:border-cyan-500/60";
			case "coronal":
				return isActive
					? "ring-1 ring-emerald-500/50 border border-emerald-500/80 shadow-emerald-950/30"
					: "border border-emerald-500/30 hover:border-emerald-500/60";
			case "sagittal":
				return isActive
					? "ring-1 ring-rose-500/50 border border-rose-500/80 shadow-rose-950/30"
					: "border border-rose-500/30 hover:border-rose-500/60";
			case "cross_section":
				return isActive
					? "ring-1 ring-amber-500/50 border border-amber-500/80 shadow-amber-950/30"
					: "border border-amber-500/30 hover:border-amber-500/60";
			default:
				return isActive
					? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
					: "border border-zinc-800 hover:border-zinc-700";
		}
	};

	return (
		<div
			onDoubleClick={onDoubleClick}
			onPointerDownCapture={onPointerDownCapture}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${getBorderColors()} ${extraClassName}`}
			style={{ backgroundColor: "#000000" }}
			data-testid={testId ?? `cbct-viewport-container-${viewportType}`}
		>
			<div
				className="absolute inset-0 w-full h-full min-h-0 min-w-0 overflow-hidden"
				style={{ backgroundColor: "#000000" }}
			>
				{/* Layer 1: Hardware WebGL2 GPU / Web Worker Voxel Slice Base Canvas */}
				<canvas
					ref={baseCanvasRef}
					style={{ backgroundColor: "#000000" }}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
				/>

				{/* Layer 2: Vector Overlay & Event Capture Canvas */}
				<canvas
					ref={overlayCanvasRef}
					onDoubleClick={onDoubleClick}
					onMouseDown={handleMouseDownWithNotification}
					onMouseMove={handleMouseMoveWithNotification}
					onMouseUp={onMouseUp}
					onMouseLeave={onMouseUp}
					onWheel={handleWheelWithNotification}
					onContextMenu={onContextMenu ?? ((e) => e.preventDefault())}
					style={{ cursor, backgroundColor: "transparent" }}
					className="absolute inset-0 w-full h-full object-contain z-10"
					data-testid={`cbct-overlay-canvas-${viewportType}`}
				/>

				{/* Layer 3: HUD Telemetry, Rulers & Tools */}
				{children}
			</div>
		</div>
	);
};
