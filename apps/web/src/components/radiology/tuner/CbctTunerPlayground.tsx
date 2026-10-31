/**
 * DENTE CRM — CBCT Contrast & Slice Tuner Playground (FEAT-010 / CLINICAL TUNER)
 * Independent fullscreen playground for real-time fine-tuning of CBCT voxel contrast,
 * window width/level, soft-knee rational compression, slice slab thickness, and panoramic CPR.
 *
 * Direct URL access: http://127.0.0.1:5173/?cbct=tuner
 * Header bar button: "🧪 Тюнер контраста"
 * Decomposed per Mandates 8b (Sweet Spot 100–160 lines), 8e, 8n, 8am.
 */

import React, { useId } from "react";
import { useCbctTunerPlaygroundState } from "./studio/useCbctTunerPlaygroundState";
import { CbctTunerHeader } from "./studio/CbctTunerHeader";
import { CbctViewportControls } from "./studio/CbctViewportControls";
import { CbctDensityPresetSelector } from "./studio/CbctDensityPresetSelector";
import { CbctHistogramPanel } from "./studio/CbctHistogramPanel";
import { CbctSlidersPanel } from "./studio/CbctSlidersPanel";
import "./cbctTunerStyles.css";

export interface CbctTunerPlaygroundProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly initialPatientId?: string;
}

export const CbctTunerPlayground: React.FC<CbctTunerPlaygroundProps> = ({
	isOpen = true,
	onClose,
	initialPatientId = "zakharov",
}) => {
	const playgroundId = useId();
	const state = useCbctTunerPlaygroundState(initialPatientId);

	if (!isOpen) return null;

	return (
		<div
			id={`cbct-tuner-playground-${playgroundId}`}
			data-testid="cbct-tuner-playground"
			data-cbct-cockpit="true"
			data-theme="dark"
			style={{ colorScheme: "dark" }}
			className="fixed inset-0 z-[999999] flex flex-col bg-black text-zinc-100 select-none overflow-hidden font-sans cbct-dark-cockpit"
		>
			<CbctTunerHeader
				selectedPatientId={state.selectedPatientId}
				onSelectPatientId={state.setSelectedPatientId}
				mobileSection={state.mobileSection}
				onSetMobileSection={state.setMobileSection}
				viewLayout={state.viewLayout}
				onToggleViewLayout={() =>
					state.setViewLayout((l) => (l === "stacked" ? "columns" : "stacked"))
				}
				onCopyParams={state.handleCopyParams}
				copiedFeedback={state.copiedFeedback}
				onAttachToVisit={state.handleAttachToVisit}
				attachFeedback={state.attachFeedback}
				onClose={onClose}
			/>

			{/* Main Workspace Body */}
			<div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
				{/* Viewports (Axial + OPG) */}
				<div
					className={`${
						state.mobileSection === "slices" ? "flex" : "hidden lg:flex"
					} flex-1 min-h-0 overflow-hidden`}
				>
					<CbctViewportControls
						params={state.params}
						onSetParams={state.setParams}
						viewLayout={state.viewLayout}
						currentZMm={state.currentZMm}
						maxDepth={state.maxDepth}
						cursorHU={state.cursorHU}
						axialCanvasRef={state.axialCanvasRef}
						panoCanvasRef={state.panoCanvasRef}
						onAxialWheel={state.handleAxialWheel}
						onAxialMouseMove={state.handleAxialMouseMove}
						onAxialMouseLeave={() => state.setCursorHU(null)}
						onAxialTouchStart={state.handleAxialTouchStart}
						onAxialTouchMove={state.handleAxialTouchMove}
						onAxialTouchEnd={state.handleAxialTouchEnd}
					/>
				</div>

				{/* Controls Drawer (Desktop sidebar / Mobile dedicated view with Drag Handle) */}
				<aside
					className={`${
						state.mobileSection === "controls"
							? "flex fixed inset-x-0 bottom-0 top-12 z-30 lg:static lg:top-0 lg:z-auto"
							: "hidden lg:flex"
					} w-full lg:w-96 bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800 flex-col shrink-0 overflow-y-auto p-3 gap-3`}
				>
					{/* Mobile Sheet Drag Handle Indicator (Apple HIG) */}
					<div className="flex lg:hidden flex-col items-center pt-1 pb-2 shrink-0">
						<div className="w-9 h-1 rounded-full bg-zinc-700" />
						<span className="text-[10px] text-zinc-500 font-medium mt-1">
							Параметры и пресеты контраста
						</span>
					</div>

					<CbctHistogramPanel params={state.params} cursorHU={state.cursorHU} />
					<CbctDensityPresetSelector
						activePresetId={state.params.activePresetId}
						onApplyPreset={state.handleApplyPreset}
					/>
					<CbctSlidersPanel params={state.params} onSetParams={state.setParams} />
				</aside>
			</div>
		</div>
	);
};
