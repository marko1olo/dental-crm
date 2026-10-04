/**
 * DENTE CRM — EzDent-i Consultation Viewport Pane (ConsultationViewportPane)
 *
 * Dedicated dual-view viewport pane for chairside consultation:
 * - High-contrast clinical X-ray presentation
 * - 3px #00C853 emerald active slot focus border (Screenshot 25 invariant)
 * - Header telemetry pill: "ДО ЛЕЧЕНИЯ" / "ПОСЛЕ ЛЕЧЕНИЯ" / "АТЛАС ПАТОЛОГИИ"
 * - HTML5 Canvas with Pan/Zoom, Laser spotlight, and Vector markers
 *
 * Mandate 8b: Decomposed helper module (<150 lines).
 */

import React from "react";
import type { ConsultationSlot, ViewportState } from "./consultationCanvasRenderers.js";
import type { ConsultationSplitMode } from "./ConsultationTopToolbar.js";

export interface ConsultationViewportPaneProps {
	readonly slot: ConsultationSlot;
	readonly isActive: boolean;
	readonly state: ViewportState;
	readonly splitMode: ConsultationSplitMode;
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly activeTool: "pan" | "laser" | "arrow" | "pencil" | "eraser";
	readonly onSelectSlot: (slot: ConsultationSlot) => void;
	readonly onWheel: (slot: ConsultationSlot, e: React.WheelEvent<HTMLCanvasElement>) => void;
	readonly onMouseDown: (slot: ConsultationSlot, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly onMouseMove: (slot: ConsultationSlot, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly onMouseUp: (slot: ConsultationSlot) => void;
}

export const ConsultationViewportPane: React.FC<ConsultationViewportPaneProps> = ({
	slot,
	isActive,
	state,
	splitMode,
	canvasRef,
	activeTool,
	onSelectSlot,
	onWheel,
	onMouseDown,
	onMouseMove,
	onMouseUp,
}) => {
	const isLeft = slot === "left";
	const isAtlas = splitMode === "atlas";

	// Status badge configuration
	const badgeColor = isLeft ? "#10b981" : isAtlas ? "#06b6d4" : "#38bdf8";
	const badgeBg = isLeft
		? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
		: isAtlas
			? "bg-cyan-950/80 text-cyan-400 border-cyan-800/60"
			: "bg-sky-950/80 text-sky-400 border-sky-800/60";
	const badgeLabel = isLeft
		? "ДО ЛЕЧЕНИЯ"
		: isAtlas
			? "АТЛАС ПАТОЛОГИИ"
			: "ПОСЛЕ ЛЕЧЕНИЯ";

	return (
		<div
			data-testid={`viewport-${slot}-container`}
			onClick={() => onSelectSlot(slot)}
			style={{
				flex: 1,
				position: "relative",
				borderRadius: "8px",
				overflow: "hidden",
				backgroundColor: "#070b14",
				border: isActive ? "3px solid #00C853" : "1px solid #1e293b",
				boxShadow: isActive ? "0 0 16px rgba(0, 200, 83, 0.4)" : "none",
			}}
			className={`viewport-${slot} flex flex-col transition-all duration-150`}
		>
			{/* Top Header Floating Telemetry Pill */}
			<div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-[#070b14]/90 backdrop-blur-xs px-2.5 py-1 rounded border border-[#334155] shadow-sm select-none">
				<span
					style={{ backgroundColor: badgeColor }}
					className="w-2.5 h-2.5 rounded-full animate-pulse"
				/>
				<span
					className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badgeBg}`}
				>
					{badgeLabel}
				</span>
				<span className="text-[11px] font-bold text-white max-w-[260px] truncate">
					{state.title}
				</span>
				{state.toothCode && (
					<span
						style={{
							backgroundColor: isLeft ? "#00C853" : "#06b6d4",
							color: isLeft ? "#022c15" : "#042f2e",
						}}
						className="text-[10px] font-mono font-bold px-1 rounded"
					>
						#{state.toothCode}
					</span>
				)}
				<span className="text-[10px] text-slate-400 font-mono">{state.subtitle}</span>
			</div>

			{/* HTML5 Diagnostic Canvas */}
			<canvas
				ref={canvasRef as any}
				data-testid={`consultation-canvas-${slot}`}
				className="w-full h-full block"
				style={{
					cursor:
						activeTool === "pan"
							? "grab"
							: activeTool === "laser"
								? "none"
								: "crosshair",
				}}
				onWheel={(e) => onWheel(slot, e)}
				onMouseDown={(e) => onMouseDown(slot, e)}
				onMouseMove={(e) => onMouseMove(slot, e)}
				onMouseUp={() => onMouseUp(slot)}
				onContextMenu={(e) => e.preventDefault()}
			/>
		</div>
	);
};
