import { useCallback, useEffect } from "react";
import {
	calculatePhysicalDistanceMm, calculateCurvedCanalLengthMm, calculateLesionAreaGaussMm2, type ViewerPoint2D,
} from "../../dentalViewerMath.js";
import { drawRuler, drawCurvedCanal, drawLesionContour, drawMagnifierOverlay } from "../../dentalViewerCanvasDraw.js";
import type { ViewerTool } from "../types.js";

interface UseSensorViewerCanvasRendererProps {
	containerRef: React.RefObject<HTMLDivElement | null>; canvasRef: React.RefObject<HTMLCanvasElement | null>;
	rawImageRef: React.MutableRefObject<HTMLImageElement | null>; filteredCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
	activeImageUrl: string; zoom: number; panX: number; panY: number; activeTool: ViewerTool;
	magnifierPos: ViewerPoint2D | null; calibratedMmPerPx: number; measurements: any[];
	draftStart: ViewerPoint2D | null; draftCurrent: ViewerPoint2D | null; curvedCanals: any[];
	draftCurvedPoints: ViewerPoint2D[]; lesionContours: any[]; draftLesionPoints: ViewerPoint2D[];
	updateFilteredBuffer: () => void;
}

export function useSensorViewerCanvasRenderer(p: UseSensorViewerCanvasRendererProps) {
	const renderScene = useCallback(() => {
		const canvas = p.canvasRef.current;
		const img = p.rawImageRef.current;
		if (!canvas || !img) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = canvas.parentElement?.clientWidth || 800;
		canvas.height = canvas.parentElement?.clientHeight || 600;

		ctx.save();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#020617";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.translate(canvas.width / 2 + p.panX, canvas.height / 2 + p.panY);
		ctx.scale(p.zoom, p.zoom);
		ctx.translate(-img.width / 2, -img.height / 2);

		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";

		const filteredCanvas = p.filteredCanvasRef.current;
		if (filteredCanvas) {
			ctx.drawImage(filteredCanvas, 0, 0, img.width, img.height);
		} else {
			ctx.drawImage(img, 0, 0);
		}

		for (const r of p.measurements) {
			drawRuler(ctx, { x: r.startX, y: r.startY }, { x: r.endX, y: r.endY }, r.label || `${r.lengthMm.toFixed(1)} мм`);
		}

		if (p.draftStart && p.draftCurrent) {
			const distMm = calculatePhysicalDistanceMm(p.draftStart, p.draftCurrent, p.calibratedMmPerPx);
			drawRuler(ctx, p.draftStart, p.draftCurrent, `${distMm.toFixed(1)} мм`, "#f59e0b");
		}

		for (const canal of p.curvedCanals) {
			drawCurvedCanal(ctx, canal.points, canal.totalLengthMm, canal.label, canal.color);
		}

		if (p.draftCurvedPoints.length > 0) {
			const draftLengthMm = calculateCurvedCanalLengthMm(p.draftCurvedPoints, p.calibratedMmPerPx);
			drawCurvedCanal(ctx, p.draftCurvedPoints, draftLengthMm, `WL: ${draftLengthMm.toFixed(1)} мм (в процессе)`, "#f59e0b", true);
		}

		for (const lesion of p.lesionContours) {
			drawLesionContour(ctx, lesion.points, lesion.areaMm2, lesion.perimeterMm, lesion.label, lesion.color);
		}

		if (p.draftLesionPoints.length > 0) {
			const draftArea = calculateLesionAreaGaussMm2(p.draftLesionPoints, p.calibratedMmPerPx);
			drawLesionContour(ctx, p.draftLesionPoints, draftArea, undefined, draftArea > 0 ? `Очаг: ${draftArea.toFixed(1)} мм²` : "Очаг...", "#f59e0b", true);
		}

		ctx.restore();

		if (p.activeTool === "magnifier" && p.magnifierPos) {
			drawMagnifierOverlay({
				ctx, canvasWidth: canvas.width, canvasHeight: canvas.height,
				img, filteredCanvas, magnifierPos: p.magnifierPos,
				zoom: p.zoom, panX: p.panX, panY: p.panY,
				magnificationFactor: 2.5, radius: 95,
			});
		}
	}, [p]);

	useEffect(() => {
		if (!p.activeImageUrl) return;
		const img = new Image();
		if (!p.activeImageUrl.startsWith("data:") && !p.activeImageUrl.startsWith("blob:")) {
			img.crossOrigin = "anonymous";
		}
		let isCancelled = false;
		img.onload = () => {
			if (isCancelled) return;
			p.rawImageRef.current = img;
			p.updateFilteredBuffer();
			renderScene();
		};
		img.src = p.activeImageUrl;
		if (img.complete && img.naturalWidth > 0) {
			p.rawImageRef.current = img;
			p.updateFilteredBuffer();
			renderScene();
		}
		return () => { isCancelled = true; img.onload = null; };
	}, [p.activeImageUrl, p.updateFilteredBuffer, renderScene]);

	useEffect(() => {
		if (!p.containerRef.current) return;
		const observer = new ResizeObserver(() => renderScene());
		observer.observe(p.containerRef.current);
		return () => observer.disconnect();
	}, [renderScene, p.containerRef]);

	return { renderScene };
}
