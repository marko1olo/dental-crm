import type React from "react";
import { PanoramicHeader } from "./PanoramicHeader";
import { PanoramicToolbar } from "./PanoramicToolbar";
import { PanoramicDensityHud } from "./PanoramicDensityHud";
import { PanoramicSafetyWarning } from "./PanoramicSafetyWarning";
import { PanoramicImplantRecommender } from "./PanoramicImplantRecommender";
import { PanoramicMeasurementOverlay } from "./PanoramicMeasurementOverlay";
import {
	type PanoramicVolumeInput,
	type PanoramicRendererWindowProps,
	paintHuPixelsToCanvas,
} from "./panoramic/panoramicTypes";
import { usePanoramicRenderer } from "./panoramic/usePanoramicRenderer";
import "./panoramicMpr.css";

export * from "./PanoramicHeader";
export * from "./PanoramicToolbar";
export * from "./PanoramicDensityHud";
export * from "./PanoramicSafetyEngine";
export * from "./PanoramicSafetyWarning";
export * from "./PanoramicImplantRecommender";
export * from "./PanoramicMeasurementOverlay";
export * from "./panoramic/panoramicTypes";

export { paintHuPixelsToCanvas };

export function PanoramicRendererWindow(props: PanoramicRendererWindowProps) {
	const {
		splinePoints,
		volume,
		onClose,
		thickness = 0,
		blendMode = "mip",
		zStartWorld,
		zEndWorld,
		zStepWorld = 0.5,
		patientId = null,
		authHeaders = {},
	} = props;

	const {
		canvasRef,
		crossSectionCanvasRef,
		loading,
		error,
		activePreset,
		setActivePreset,
		isExporting,
		sliceThicknessMm,
		setSliceThicknessMm,
		activeCrossSectionIdx,
		setActiveCrossSectionIdx,
		isSharpenActive,
		setIsSharpenActive,
		isInvertColors,
		setIsInvertColors,
		activeTool,
		setActiveTool,
		rulers,
		setRulers,
		angles,
		setAngles,
		probedHU,
		cursorPos,
		crossSections,
		activeSlice,
		proximityAudit,
		boneRecommendation,
		handleReset,
		handleAutoDetectArch,
		handleCanvasMouseEnter,
		handleCanvasMouseLeave,
		handleCanvasMouseMove,
		handleExportToClinicalRecord,
		handleLocalDownload,
	} = usePanoramicRenderer({
		splinePoints,
		volume,
		thickness,
		blendMode,
		zStartWorld,
		zEndWorld,
		zStepWorld,
		patientId,
		authHeaders,
	});

	return (
		<div
			className="panoramic-renderer-modal-backdrop fixed inset-0 z-[100060] flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 select-none"
			role="dialog"
			aria-modal="true"
			data-testid="panoramic-renderer-modal-overlay"
		>
			<div
				className="mpr-container shadow-2xl rounded-2xl border border-[var(--line-strong)] overflow-hidden flex flex-col w-full max-w-5xl h-[88vh] max-h-[850px] text-white"
				style={{ background: "var(--paper, #09090b)" }}
				data-testid="panoramic-renderer-window-shell"
			>
				{/* CLINICAL HEADER (Авто-дуга, экспорт в медкарту, локальная загрузка) */}
				<PanoramicHeader
					sliceThicknessMm={sliceThicknessMm}
					blendMode={blendMode}
					loading={loading}
					isExporting={isExporting}
					onAutoDetectArch={handleAutoDetectArch}
					onExportTo043={handleExportToClinicalRecord}
					onLocalDownload={handleLocalDownload}
					onClose={onClose}
				/>

				{/* SECONDARY TOOLBAR: 1-ROW 48PX CLINICAL TOOLS & WINDOWING */}
				<PanoramicToolbar
					activePreset={activePreset}
					onSelectPreset={setActivePreset}
					crossSections={crossSections}
					activeCrossSectionIdx={activeCrossSectionIdx}
					onSelectCrossSectionIdx={setActiveCrossSectionIdx}
					sliceThicknessMm={sliceThicknessMm}
					onChangeSliceThicknessMm={setSliceThicknessMm}
					isSharpenActive={isSharpenActive}
					onToggleSharpen={() => setIsSharpenActive((p) => !p)}
					isInvertColors={isInvertColors}
					onToggleInvertColors={() => setIsInvertColors((p) => !p)}
					activeTool={activeTool}
					onSelectTool={setActiveTool}
					onReset={handleReset}
				/>

				{/* SOFT NON-BLOCKING ANATOMICAL SAFETY BANNER (MANDATE 8e) */}
				<PanoramicSafetyWarning audit={proximityAudit} className="mx-2 mt-1 shrink-0" />

				{/* MAIN VIEWPORT BODY */}
				<div className="flex-1 relative bg-black flex flex-col sm:flex-row items-center justify-center p-2 min-h-0 overflow-hidden">
					{loading && (
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20">
							<div className="w-10 h-10 border-4 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
							<span className="text-[var(--teal)] mt-4 text-sm font-bold animate-pulse">
								Построение трилинейной интерполяции и кросс-срезов...
							</span>
						</div>
					)}

					{error && (
						<div className="text-red-400 font-bold text-sm px-4 text-center z-20">
							{error}
						</div>
					)}

					{/* PANORAMIC REFORMAT CANVAS WITH 1:1 METRIC MEASUREMENTS */}
					<div className="flex-1 w-full h-full relative flex items-center justify-center min-w-0 min-h-[140px]">
						<canvas
							ref={canvasRef}
							width={800}
							height={300}
							onMouseEnter={handleCanvasMouseEnter}
							onMouseLeave={handleCanvasMouseLeave}
							onMouseMove={handleCanvasMouseMove}
							className={`w-full h-full object-contain cursor-crosshair panoramic-canvas-overlay ${
								isSharpenActive ? "mpr-sharpen-active" : ""
							}`}
							style={{
								filter: `${isInvertColors ? "invert(1) hue-rotate(180deg)" : ""} ${isSharpenActive ? "contrast(1.25) brightness(1.05)" : ""}`.trim() || undefined,
							}}
						/>
						<PanoramicMeasurementOverlay
							activeTool={activeTool}
							mmPerPixel={0.25}
							width={800}
							height={300}
							rulers={rulers}
							onUpdateRulers={setRulers}
							angles={angles}
							onUpdateAngles={setAngles}
						/>
					</div>

					{/* CROSS-SECTION SLICE VIEWPORT (240x240px) & IMPLANT RECOMMENDER */}
					<div className="w-[200px] sm:w-[240px] shrink-0 sm:ml-2 mt-2 sm:mt-0 flex flex-col gap-1.5 z-10 max-h-full overflow-y-auto no-scrollbar">
						<div className="h-[170px] sm:h-[190px] relative rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col shadow-lg">
							<div className="bg-neutral-900/90 px-2.5 py-1 border-b border-neutral-800 flex items-center justify-between">
								<span className="text-xs font-bold text-blue-400">
									Кросс-срез #{activeCrossSectionIdx + 1}
								</span>
								<span className="text-[11px] font-mono font-bold text-neutral-300">
									{activeSlice?.arcLengthMm.toFixed(1)} мм
								</span>
							</div>
							<div className="flex-1 relative flex items-center justify-center bg-black">
								<canvas
									ref={crossSectionCanvasRef}
									width={240}
									height={240}
									className="w-full h-full object-contain"
								/>
							</div>
						</div>

						{/* MISCH BONE IMPLANT AUTO-RECOMMENDATION */}
						<PanoramicImplantRecommender probedHU={probedHU} />
					</div>

					{/* REAL-TIME MISCH BONE QUALITY DENSITY METER (HUD) */}
					<PanoramicDensityHud
						boneRecommendation={boneRecommendation}
						probedHU={probedHU}
					/>

					{/* HUD Crosshair Indicator */}
					{cursorPos && (
						<div className="mpr-hud-overlay">
							<span>X: {cursorPos.x} | Y: {cursorPos.y}</span>
							<span className="mpr-hud-value">{probedHU ?? 0} HU</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
