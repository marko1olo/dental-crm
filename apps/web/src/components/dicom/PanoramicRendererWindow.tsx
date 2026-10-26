/**
 * PanoramicRendererWindow.tsx — Окно панорамного рендеринга и реконструкции
 * Mandate 8b: строго <= 120 строк.
 * Поддерживает: Авто-дуга, ref={crossSectionCanvasRef}, computeCrossSection.
 */

import type React from "react";
import { PanoramicHeader } from "./PanoramicHeader.js";
import { PanoramicToolbar } from "./PanoramicToolbar.js";
import { PanoramicSafetyWarning } from "./PanoramicSafetyWarning.js";
import {
	type PanoramicVolumeInput,
	type PanoramicRendererWindowProps,
	paintHuPixelsToCanvas,
} from "./panoramic/panoramicTypes.js";
import { computeCrossSection } from "./panoramicMprMath.js";
import { usePanoramicRenderer } from "./panoramic/usePanoramicRenderer.js";
import { PanoramicViewportArea } from "./panoramic/PanoramicViewportArea.js";
import "./panoramicMpr.css";

export * from "./PanoramicHeader.js";
export * from "./PanoramicToolbar.js";
export * from "./PanoramicDensityHud.js";
export * from "./PanoramicSafetyEngine.js";
export * from "./PanoramicSafetyWarning.js";
export * from "./PanoramicImplantRecommender.js";
export * from "./PanoramicMeasurementOverlay.js";
export * from "./panoramic/panoramicTypes.js";
export { paintHuPixelsToCanvas, computeCrossSection };

export function PanoramicRendererWindow(props: PanoramicRendererWindowProps) {
	const { blendMode = "mip" } = props;
	const r = usePanoramicRenderer(props);
	const { crossSectionCanvasRef } = r;

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
				{/* Авто-дуга, экспорт в медкарту, локальная загрузка */}
				<PanoramicHeader
					sliceThicknessMm={r.sliceThicknessMm}
					blendMode={blendMode}
					loading={r.loading}
					isExporting={r.isExporting}
					onAutoDetectArch={r.handleAutoDetectArch}
					onExportTo043={r.handleExportToClinicalRecord}
					onLocalDownload={r.handleLocalDownload}
					onClose={props.onClose}
				/>

				<PanoramicToolbar
					activePreset={r.activePreset}
					onSelectPreset={r.setActivePreset}
					crossSections={r.crossSections}
					activeCrossSectionIdx={r.activeCrossSectionIdx}
					onSelectCrossSectionIdx={r.setActiveCrossSectionIdx}
					sliceThicknessMm={r.sliceThicknessMm}
					onChangeSliceThicknessMm={r.setSliceThicknessMm}
					isSharpenActive={r.isSharpenActive}
					onToggleSharpen={() => r.setIsSharpenActive((p) => !p)}
					isInvertColors={r.isInvertColors}
					onToggleInvertColors={() => r.setIsInvertColors((p) => !p)}
					activeTool={r.activeTool}
					onSelectTool={r.setActiveTool}
					onReset={r.handleReset}
				/>

				<PanoramicSafetyWarning audit={r.proximityAudit} className="mx-2 mt-1 shrink-0" />

				<PanoramicViewportArea
					loading={r.loading}
					error={r.error}
					canvasRef={r.canvasRef}
					crossSectionCanvasRef={crossSectionCanvasRef}
					isSharpenActive={r.isSharpenActive}
					isInvertColors={r.isInvertColors}
					activeTool={r.activeTool}
					rulers={r.rulers}
					setRulers={r.setRulers}
					angles={r.angles}
					setAngles={r.setAngles}
					activeCrossSectionIdx={r.activeCrossSectionIdx}
					activeSlice={r.activeSlice}
					probedHU={r.probedHU}
					boneRecommendation={r.boneRecommendation}
					cursorPos={r.cursorPos}
					onCanvasMouseEnter={r.handleCanvasMouseEnter}
					onCanvasMouseLeave={r.handleCanvasMouseLeave}
					onCanvasMouseMove={r.handleCanvasMouseMove}
				/>
			</div>
		</div>
	);
}
