import React, { useRef, useState, useCallback } from "react";
import { showToast } from "../GlobalToast";
import { CEPHALOMETRIC_LANDMARKS } from "./cephalometricMath";
import { CephalometricHudStrip, type XrayFilterMode } from "./CephalometricHudStrip";
import { CephalometricSvgOverlay } from "./CephalometricSvgOverlay";
import { type CephalometricCanvasProps, SAMPLE_TRG_CEPHALOGRAM_URL } from "./cephalometricCanvas/types";
import { CephDropzone } from "./cephalometricCanvas/CephDropzone";
import { CephViewport } from "./cephalometricCanvas/CephViewport";
import { CephMagnifier } from "./cephalometricCanvas/CephMagnifier";
import { useCephInteractions } from "./cephalometricCanvas/useCephInteractions";

export { CephalometricHudStrip, CephalometricSvgOverlay, type XrayFilterMode, SAMPLE_TRG_CEPHALOGRAM_URL };
export type { CephalometricCanvasProps };

export function CephalometricCanvas(props: CephalometricCanvasProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	const interactions = useCephInteractions({
		landmarks: props.landmarks, onLandmarkChange: props.onLandmarkChange,
		activeTargetKey: props.activeTargetKey, onSelectTargetKey: props.onSelectTargetKey,
		onScaleChange: props.onScaleChange,
	});

	const handleFileProcess = useCallback((file: File) => {
		if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".dcm")) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			if (typeof ev.target?.result === "string" && props.onImageUpload) props.onImageUpload(ev.target.result);
		};
		reader.readAsDataURL(file);
	}, [props.onImageUpload]);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
		const file = e.dataTransfer.files?.[0];
		if (file) handleFileProcess(file);
	}, [handleFileProcess]);

	const ensureCephImage = useCallback((action: () => void) => {
		if (!props.imageUrl) { showToast("Сначала загрузите снимок ТРГ для калибровки и масштабирования", "info"); return; }
		action();
	}, [props.imageUrl]);

	const placedCount = CEPHALOMETRIC_LANDMARKS.filter((l) => props.landmarks[l.key] !== undefined).length;
	const isAllPlaced = placedCount >= CEPHALOMETRIC_LANDMARKS.length;

	return (
		<div
			ref={containerRef}
			data-testid="cephalometric-canvas-container"
			className="relative w-full h-full min-h-[340px] sm:min-h-[440px] lg:min-h-[620px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center select-none"
			onWheel={props.imageUrl ? interactions.handleWheel : undefined}
			onMouseDown={props.imageUrl ? interactions.handleMouseDown : undefined}
			onMouseMove={props.imageUrl ? interactions.handleMouseMove : undefined}
			onMouseUp={props.imageUrl ? interactions.handleMouseUp : undefined}
			onMouseLeave={props.imageUrl ? interactions.handleMouseUp : undefined}
			onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
			onDragLeave={() => setIsDragOver(false)}
			onDrop={handleDrop}
			style={{
				backgroundColor: "var(--paper-canvas, #020617)", borderColor: "var(--line, #334155)", color: "var(--ink, #f8fafc)",
				cursor: interactions.isPanning ? "grabbing" : (props.activeTargetKey && props.imageUrl) ? "crosshair" : "default",
			}}
		>
			<CephalometricHudStrip
				filterMode={props.filterMode} onFilterModeChange={props.onFilterModeChange} zoom={interactions.zoom}
				onZoomIn={() => ensureCephImage(() => interactions.setZoom((z) => Math.min(3.5, Number((z + 0.2).toFixed(1)))))}
				onZoomOut={() => ensureCephImage(() => interactions.setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1)))))}
				onResetView={() => ensureCephImage(interactions.handleResetView)} isCalibrating={interactions.isCalibrating}
				onToggleCalibrating={() => ensureCephImage(() => interactions.setIsCalibrating((c) => !c))}
				showPolygon={props.showPolygon} onTogglePolygon={props.onTogglePolygon} showPlanes={props.showPlanes}
				onTogglePlanes={props.onTogglePlanes} showLabels={props.showLabels} onToggleLabels={props.onToggleLabels}
				imageUrl={props.imageUrl} isAllLandmarksPlaced={isAllPlaced} activeTargetKey={props.activeTargetKey}
				landmarks={props.landmarks} onSelectTargetKey={props.onSelectTargetKey} onFileProcess={handleFileProcess}
				onLoadPreset={props.onLoadPreset} onResetLandmarks={props.onResetLandmarks} onRunAiAutoPlacement={props.onRunAiAutoPlacement}
				isAiInferring={props.isAiInferring} aiBackendBadge={props.aiBackendBadge} aiBackendLabel={props.aiBackendLabel}
				aiBackendPref={props.aiBackendPref} onChangeAiBackendPref={props.onChangeAiBackendPref} aiInferenceStats={props.aiInferenceStats}
			/>

			{!props.imageUrl ? (
				<CephDropzone isDragOver={isDragOver} onFileProcess={handleFileProcess} onLoadDemoSample={props.onImageUpload} />
			) : (
				<>
					<CephViewport
						imageUrl={props.imageUrl} pan={interactions.pan} zoom={interactions.zoom}
						brightness={props.brightness} contrast={props.contrast} filterMode={props.filterMode}
						landmarks={props.landmarks} showPlanes={props.showPlanes} showPolygon={props.showPolygon}
						showLabels={props.showLabels} calibrationPoints={interactions.calibrationPoints}
						activeTargetKey={props.activeTargetKey} hoveredKey={interactions.hoveredKey}
						draggingKey={interactions.draggingKey} onHoverKey={interactions.setHoveredKey}
						onStartDrag={interactions.setDraggingKey} onSelectTargetKey={props.onSelectTargetKey}
						onRemoveLandmark={props.onRemoveLandmark} svgRef={interactions.svgRef}
					/>
					<CephMagnifier draggingKey={interactions.draggingKey} hoveredKey={interactions.hoveredKey} cursorImgPos={interactions.cursorImgPos} />
				</>
			)}
		</div>
	);
}
