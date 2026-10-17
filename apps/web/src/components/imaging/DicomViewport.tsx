import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import type { DicomViewportProps } from "./dicomViewport/types.js";
import { updateDicomFilteredBuffer } from "./dicomViewport/dicomBufferFilter.js";
import { renderDicomScene } from "./dicomViewport/dicomSceneRenderer.js";
import { useDicomViewportMouse } from "./dicomViewport/useDicomViewportMouse.js";
import { useDicomViewportTouch } from "./dicomViewport/useDicomViewportTouch.js";
import { useThrottledViewportUpdate } from "./dicomViewport/useThrottledViewportUpdate.js";
import { teardownViewportCanvases } from "../../utils/viewportTeardownHelper.js";
import { disposeWebGlRenderingContext } from "./rvgViewerEngine.js";

export type { DicomViewportProps };

export const DicomViewport: React.FC<DicomViewportProps> = ({
	imageSrc,
	viewportState,
	onViewportChange,
	measurements = [],
	onAddMeasurement,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const rawImageRef = useRef<HTMLImageElement | null>(null);
	const filteredCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const canvasRectRef = useRef<DOMRect | null>(null);
	const glRef = useRef<WebGLRenderingContext | null>(null);

	const { scheduleViewportUpdate, flushViewportUpdate } = useThrottledViewportUpdate(onViewportChange);

	const mouse = useDicomViewportMouse({
		canvasRef, rawImageRef, canvasRectRef, viewportState,
		scheduleViewportUpdate, flushViewportUpdate, onViewportChange, onAddMeasurement,
	});

	const touch = useDicomViewportTouch({
		viewportState, scheduleViewportUpdate, flushViewportUpdate, onViewportChange,
	});

	const renderScene = useCallback(() => {
		renderDicomScene({
			canvas: canvasRef.current, img: rawImageRef.current, filteredCanvas: filteredCanvasRef.current,
			viewportState, measurements,
			draftRulerStart: mouse.draftRulerStart, draftRulerCurrent: mouse.draftRulerCurrent,
			draftCanalPoints: mouse.draftCanalPoints,
		});
	}, [viewportState, measurements, mouse.draftRulerStart, mouse.draftRulerCurrent, mouse.draftCanalPoints]);

	const updateFilteredBuffer = useCallback(() => {
		filteredCanvasRef.current = updateDicomFilteredBuffer(rawImageRef.current, filteredCanvasRef.current, viewportState);
	}, [viewportState]);

	useEffect(() => {
		if (!imageSrc) return;
		const img = new Image();
		if (!imageSrc.startsWith("data:") && !imageSrc.startsWith("blob:")) img.crossOrigin = "anonymous";
		let isCancelled = false;
		const onLoaded = () => {
			if (isCancelled) return;
			rawImageRef.current = img;
			updateFilteredBuffer();
			renderScene();
		};
		img.src = imageSrc;
		if (img.complete && img.naturalWidth > 0) onLoaded();
		else img.onload = onLoaded;
		return () => { isCancelled = true; img.onload = null; };
	}, [imageSrc, updateFilteredBuffer, renderScene]);

	useEffect(() => {
		if (rawImageRef.current) { updateFilteredBuffer(); renderScene(); }
	}, [updateFilteredBuffer, renderScene]);

	useEffect(() => {
		return () => {
			if (glRef.current) disposeWebGlRenderingContext(glRef.current);
			teardownViewportCanvases(containerRef.current);
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center select-none"
			onContextMenu={(e) => e.preventDefault()}
		>
			<canvas
				ref={canvasRef}
				className="w-full h-full block cursor-crosshair"
				onMouseDown={mouse.handleMouseDown}
				onMouseMove={mouse.handleMouseMove}
				onMouseUp={mouse.handleMouseUp}
				onWheel={mouse.handleWheel}
				onTouchStart={touch.handleTouchStart}
				onTouchMove={touch.handleTouchMove}
				onTouchEnd={touch.handleTouchEnd}
			/>
		</div>
	);
};

export default DicomViewport;
