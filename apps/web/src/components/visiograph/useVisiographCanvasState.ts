/**
 * useVisiographCanvasState.ts
 * High-performance RAF-throttled canvas interaction & rendering hook (Mandates 8b, 8e).
 */

import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { VisiographImageProcessor, type VisiographImageParams } from "./VisiographImageProcessor";
import type { CalibrationReference, RulerMeasurement, AngleMeasurement, PeriapicalLesion, Point2D } from "./VisiographMeasurementMath";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";
import { areParamsEqual, cleanupCanvasBackingStore, renderVisiographFrame } from "./VisiographCanvasRenderEngine";

export interface UseVisiographCanvasStateOptions {
	imageUrl: string;
	params: VisiographImageParams;
	rulers: RulerMeasurement[];
	angles: AngleMeasurement[];
	lesions: PeriapicalLesion[];
	calibration: CalibrationReference;
	isCalibrated: boolean;
	activeTool: ActiveVisiographToolType;
	drawingPoints: Point2D[];
	hoverPos: Point2D | null;
	setHoverPos: (pos: Point2D | null) => void;
}

export function useVisiographCanvasState(opts: UseVisiographCanvasStateOptions) {
	const { imageUrl, params, rulers, angles, lesions, calibration, isCalibrated, activeTool, drawingPoints, hoverPos, setHoverPos } = opts;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const processorRef = useRef<VisiographImageProcessor>(new VisiographImageProcessor());
	const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const lastProcessedParamsRef = useRef<VisiographImageParams | null>(null);
	const lastProcessedImageRef = useRef<HTMLImageElement | null>(null);
	const pendingHoverPosRef = useRef<Point2D | null>(null);
	const hoverRafIdRef = useRef<number | null>(null);

	const updateProcessedImage = useCallback(() => {
		const img = imageRef.current;
		if (!img) return;
		if (!processedCanvasRef.current || lastProcessedImageRef.current !== img || !areParamsEqual(lastProcessedParamsRef.current, params)) {
			if (!processedCanvasRef.current && typeof document !== "undefined") {
				processedCanvasRef.current = document.createElement("canvas");
			}
			if (processedCanvasRef.current) {
				processorRef.current.render(img, processedCanvasRef.current, params);
				lastProcessedImageRef.current = img;
				lastProcessedParamsRef.current = { ...params };
			}
		}
	}, [params]);

	const drawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const img = imageRef.current;
		if (!canvas || !img) return;
		updateProcessedImage();
		renderVisiographFrame({
			canvas, offscreen: processedCanvasRef.current, img, processor: processorRef.current, params,
			rulers, angles, lesions, calibration, isCalibrated, activeTool, drawingPoints, hoverPos,
		});
	}, [updateProcessedImage, params, rulers, angles, lesions, isCalibrated, calibration, drawingPoints, hoverPos, activeTool]);

	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => { imageRef.current = img; updateProcessedImage(); drawCanvas(); };
		img.src = imageUrl;
		if (img.complete && img.naturalWidth > 0) { imageRef.current = img; updateProcessedImage(); drawCanvas(); }
	}, [imageUrl, updateProcessedImage, drawCanvas]);

	useEffect(() => { drawCanvas(); }, [drawCanvas]);

	const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point2D => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const pt = getCanvasPoint(e);
		pendingHoverPosRef.current = pt;
		if (hoverRafIdRef.current === null) {
			if (typeof requestAnimationFrame !== "undefined") {
				hoverRafIdRef.current = requestAnimationFrame(() => {
					hoverRafIdRef.current = null;
					if (pendingHoverPosRef.current) setHoverPos(pendingHoverPosRef.current);
				});
			} else { setHoverPos(pt); }
		}
	};

	const handleMouseLeave = () => {
		pendingHoverPosRef.current = null;
		if (hoverRafIdRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
			cancelAnimationFrame(hoverRafIdRef.current);
			hoverRafIdRef.current = null;
		}
		setHoverPos(null);
	};

	useEffect(() => {
		return () => {
			if (hoverRafIdRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
				cancelAnimationFrame(hoverRafIdRef.current);
			}
			cleanupCanvasBackingStore(canvasRef.current, processedCanvasRef.current, imageRef.current);
			processedCanvasRef.current = null;
			imageRef.current = null;
			lastProcessedImageRef.current = null;
			lastProcessedParamsRef.current = null;
		};
	}, []);

	return { canvasRef, getCanvasPoint, handleMouseMove, handleMouseLeave, drawCanvas };
}
