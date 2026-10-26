/**
 * ImagingViewport.tsx — Основная рабочая область отображения рентгеновских снимков и КЛКТ 3D
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { ClinicalImageViewer } from "./ClinicalImageViewer";
import { uploadImagingScanFile } from "./imagingUploadService";
import { showToast } from "../GlobalToast";
import { RvgSensorVectorVisualizer } from "./viewport/RvgSensorVectorVisualizer";
import { CbctStudyActiveCard } from "./viewport/CbctStudyActiveCard";
import type { ImagingViewportProps } from "./viewport/types";

export { RvgSensorVectorVisualizer };
export type { RvgSensorVectorVisualizerProps } from "./viewport/RvgSensorVectorVisualizer";
export type { ImagingViewportProps };

export function ImagingViewport({
	selectedImagingStudy, localImageIds, setLocalImageIds,
	imagingViewerState, setImagingViewerState, computedViewerImageStyle,
	effectivePreviewUrl, isPreviewLoading, previewLoadError, selectedStudyHasFile,
	imagingKindLabels, isDicomwebLoading, dicomwebLoadProgress, onOpenCbctStudio,
	onLoadFromDicomweb, enhancementOn, isRulerActive, currentPixelSpacingMm,
	rulerMeasurements, setRulerMeasurements, isPanActive, onAttachFile,
	isAnalyzingAI, onStudyUploaded,
}: ImagingViewportProps) {
	const isCbctOrLocalArchive = localImageIds?.length > 0 || selectedImagingStudy?.kind === "cbct";

	const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0 && files[0]) {
			const file = files[0];
			const patientId = selectedImagingStudy?.patientId;
			if (patientId) {
				showToast(`Загрузка «${file.name}»...`, "info");
				try {
					const res = await uploadImagingScanFile(file, { patientId, toothCode: selectedImagingStudy?.toothCode ?? null });
					if (res.success && res.study && onStudyUploaded) onStudyUploaded(res.study);
				} catch (err: any) {
					showToast(err?.message || "Ошибка загрузки снимка", "error");
				}
			}
			window.dispatchEvent(new CustomEvent("dente-radiology-file-dropped", { detail: { file, toothCode: selectedImagingStudy?.toothCode } }));
		}
	};

	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		if (isCbctOrLocalArchive) return;
		e.preventDefault();
		const delta = e.deltaY < 0 ? 0.1 : -0.1;
		setImagingViewerState((state: any) => ({
			...state,
			zoom: Math.min(3.0, Math.max(0.4, Number(((state.zoom || 1) + delta).toFixed(2)))),
		}));
	};

	return (
		<div
			className="imaging-viewer-stage min-h-[460px] max-h-[calc(100vh-220px)] flex-1 w-full flex flex-col bg-[#090d16] rounded-xl border border-[#1e293b] overflow-hidden"
			style={{ position: "relative", minHeight: "460px", backgroundColor: "#090d16" }}
			onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
			onDrop={handleDrop}
			onWheel={handleWheel}
		>
			{isCbctOrLocalArchive ? (
				<CbctStudyActiveCard
					selectedImagingStudy={selectedImagingStudy}
					localImageIds={localImageIds}
					setLocalImageIds={setLocalImageIds}
					isDicomwebLoading={isDicomwebLoading}
					dicomwebLoadProgress={dicomwebLoadProgress}
					onOpenCbctStudio={onOpenCbctStudio}
					onLoadFromDicomweb={onLoadFromDicomweb}
				/>
			) : effectivePreviewUrl && !previewLoadError ? (
				<ClinicalImageViewer
					imageUrl={effectivePreviewUrl}
					enhanced={enhancementOn}
					viewerStyle={computedViewerImageStyle}
					isRulerActive={isRulerActive}
					pixelSpacingMm={currentPixelSpacingMm}
					measurements={rulerMeasurements}
					onMeasurementsChange={setRulerMeasurements}
					isPanActive={isPanActive}
					pan={imagingViewerState.pan || { x: 0, y: 0 }}
					onPanChange={(pan) => setImagingViewerState((state: any) => ({ ...state, pan }))}
					studyTitle={selectedImagingStudy?.title}
					toothCode={selectedImagingStudy?.toothCode}
				/>
			) : (
				<RvgSensorVectorVisualizer
					study={selectedImagingStudy}
					loading={isPreviewLoading}
					hasFile={selectedStudyHasFile}
					viewerStyle={computedViewerImageStyle}
					kindLabels={imagingKindLabels}
					onAttachFile={onAttachFile}
				/>
			)}

			{isAnalyzingAI && (
				<div className="sa-analyze-overlay" aria-live="polite">
					<div className="sa-analyze-spinner" />
					<span>Анализ рентгеновского снимка...</span>
				</div>
			)}
		</div>
	);
}
