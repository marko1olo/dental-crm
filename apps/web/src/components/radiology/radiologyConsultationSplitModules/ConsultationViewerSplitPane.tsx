/**
 * DENTE CRM — Consultation Viewer Split Pane Component (Layer 4)
 * Directed Acyclic Graph (DAG): Layer 4 (Presentation Subcomponent)
 * Displays synchronized dual viewports side-by-side with 3px emerald focus border
 */

import React from "react";
import { ConsultationViewportPane } from "../ConsultationViewportPane.js";
import type {
	ConsultationSlot,
	ViewportState,
} from "../consultationCanvasRenderers.js";
import type { ConsultationSplitMode } from "../ConsultationTopToolbar.js";
import type { ActiveConsultationTool } from "./types.js";

export interface ConsultationViewerSplitPaneProps {
	readonly activeSlot: ConsultationSlot;
	readonly leftViewport: ViewportState;
	readonly rightViewport: ViewportState;
	readonly splitMode: ConsultationSplitMode;
	readonly leftCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly rightCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly activeTool: ActiveConsultationTool;
	readonly onSelectSlot: (slot: ConsultationSlot) => void;
	readonly onWheel: (slot: ConsultationSlot, e: React.WheelEvent<HTMLCanvasElement>) => void;
	readonly onMouseDown: (slot: ConsultationSlot, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly onMouseMove: (slot: ConsultationSlot, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly onMouseUp: (slot: ConsultationSlot) => void;
}

export const ConsultationViewerSplitPane: React.FC<ConsultationViewerSplitPaneProps> = ({
	activeSlot,
	leftViewport,
	rightViewport,
	splitMode,
	leftCanvasRef,
	rightCanvasRef,
	activeTool,
	onSelectSlot,
	onWheel,
	onMouseDown,
	onMouseMove,
	onMouseUp,
}) => {
	return (
		<div className="flex-1 flex overflow-hidden p-2 gap-2 bg-[#020617]">
			{/* LEFT VIEWPORT: PRIMARY / PRE-OP STUDY */}
			<ConsultationViewportPane
				slot="left"
				isActive={activeSlot === "left"}
				state={leftViewport}
				splitMode={splitMode}
				canvasRef={leftCanvasRef as React.RefObject<HTMLCanvasElement>}
				activeTool={activeTool}
				onSelectSlot={onSelectSlot}
				onWheel={onWheel}
				onMouseDown={onMouseDown}
				onMouseMove={onMouseMove}
				onMouseUp={onMouseUp}
			/>

			{/* RIGHT VIEWPORT: FOLLOWUP / POST-OP STUDY / CLINICAL REFERENCE */}
			<ConsultationViewportPane
				slot="right"
				isActive={activeSlot === "right"}
				state={rightViewport}
				splitMode={splitMode}
				canvasRef={rightCanvasRef as React.RefObject<HTMLCanvasElement>}
				activeTool={activeTool}
				onSelectSlot={onSelectSlot}
				onWheel={onWheel}
				onMouseDown={onMouseDown}
				onMouseMove={onMouseMove}
				onMouseUp={onMouseUp}
			/>
		</div>
	);
};
