import React, { type CSSProperties, useEffect, useRef, useState } from "react";
import { useSafeObjectUrl } from "../../hooks/useMemoryLeakGuard.js";
import {
	type ClinicalImageViewerProps,
	type ViewerRulerMeasurement,
} from "./clinicalImageViewer/types.js";
import { extractTransformParams } from "./clinicalImageViewer/transformHelpers.js";
import { ClinicalRulerOverlay } from "./clinicalImageViewer/ClinicalRulerOverlay.js";
import { ClinicalEmptyDropzone } from "./clinicalImageViewer/ClinicalEmptyDropzone.js";
import { useClinicalImageInteractions } from "./clinicalImageViewer/useClinicalImageInteractions.js";

export type { ClinicalImageViewerProps, ViewerRulerMeasurement };
export { extractTransformParams };

export function ClinicalImageViewer({
	imageUrl,
	viewerStyle,
	autoRevokeBlobUrl,
	isRulerActive = false,
	pixelSpacingMm = 0.04,
	measurements,
	onMeasurementsChange,
	isPanActive = false,
	pan,
	onPanChange,
	studyTitle,
	toothCode,
	onMeasureApexLength,
}: ClinicalImageViewerProps) {
	const resolvedImageUrl = useSafeObjectUrl(imageUrl, { autoRevokeBlobStrings: autoRevokeBlobUrl });
	const [imageLoadError, setImageLoadError] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setImageLoadError(false);
	}, [resolvedImageUrl]);

	const {
		activeMeasurements,
		drawingRuler,
		handleMouseDown,
		deleteMeasurement,
		isPanning,
	} = useClinicalImageInteractions({
		containerRef,
		transformStr: viewerStyle?.transform as string | undefined,
		isRulerActive,
		isPanActive,
		pan,
		onPanChange,
		measurements,
		onMeasurementsChange,
		pixelSpacingMm,
		toothCode,
		onMeasureApexLength,
	});

	if (!resolvedImageUrl || !resolvedImageUrl.trim() || imageLoadError) {
		return <ClinicalEmptyDropzone imageLoadError={imageLoadError} containerRef={containerRef} />;
	}

	const viewerFilter = (viewerStyle?.filter as string) || "none";
	const cursorStyle = isRulerActive ? "crosshair" : isPanActive ? (isPanning ? "grabbing" : "grab") : "default";

	return (
		<div
			className="clinical-image-container relative w-full h-full min-h-[300px] max-h-full flex-1 flex items-center justify-center overflow-hidden bg-[#090d16] rounded-xl border border-[#1e293b] shadow-inner"
			ref={containerRef}
			role={isRulerActive || isPanActive ? "region" : "img"}
			tabIndex={0}
			aria-label={isRulerActive ? "Измерение длины корневого канала" : isPanActive ? "Панорамирование снимка" : "Просмотрщик снимка"}
			onMouseDown={handleMouseDown}
			style={{
				backgroundColor: "#090d16",
				"--clinical-viewer-filter": viewerFilter,
				"--clinical-viewer-transform": (viewerStyle?.transform as string) ?? "none",
				cursor: cursorStyle,
			} as CSSProperties}
		>
			{(toothCode || studyTitle) && (
				<div className="absolute top-2 left-2 z-20 pointer-events-none px-2.5 py-1 rounded-md bg-slate-900/85 backdrop-blur-xs border border-teal-500/30 text-white text-xs font-semibold flex items-center gap-2 shadow-xs">
					{toothCode && <span className="text-teal-400 font-mono font-bold">Зуб #{toothCode}</span>}
					<span className="text-slate-300 font-normal truncate max-w-[220px]">{studyTitle || "Рентген-снимок"}</span>
				</div>
			)}

			<img
				src={resolvedImageUrl}
				alt={studyTitle || "Рентгеновский снимок"}
				decoding="async"
				className="clinical-xray-img max-w-none transition-transform duration-75 select-none"
				style={{
					filter: viewerFilter,
					transform: (viewerStyle?.transform as string) ?? "none",
					transformOrigin: "center center",
				}}
				onError={() => setImageLoadError(true)}
			/>

			<ClinicalRulerOverlay
				activeMeasurements={activeMeasurements}
				isRulerActive={isRulerActive}
				transformStr={viewerStyle?.transform as string | undefined}
				drawingRuler={drawingRuler}
				onDeleteMeasurement={deleteMeasurement}
			/>
		</div>
	);
}

export default ClinicalImageViewer;
