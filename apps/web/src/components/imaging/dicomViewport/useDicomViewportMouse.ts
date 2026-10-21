import { useCallback, useRef, useState } from "react";
import {
	calculate2FingerWindowLevel,
	measureDistanceMm,
	type CalibratedRulerMeasurement,
	type DicomViewportState,
	type Point2D,
} from "../rvgViewerEngine.js";

export interface UseDicomViewportMouseProps {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	rawImageRef: React.RefObject<HTMLImageElement | null>;
	canvasRectRef: React.MutableRefObject<DOMRect | null>;
	viewportState: DicomViewportState;
	scheduleViewportUpdate: (update: Partial<DicomViewportState>) => void;
	flushViewportUpdate: () => void;
	onViewportChange: (nextState: Partial<DicomViewportState>) => void;
	onAddMeasurement?: ((m: CalibratedRulerMeasurement) => void) | undefined;
}

export function useDicomViewportMouse({
	canvasRef, rawImageRef, canvasRectRef, viewportState,
	scheduleViewportUpdate, flushViewportUpdate, onViewportChange, onAddMeasurement,
}: UseDicomViewportMouseProps) {
	const isMouseDownRef = useRef(false);
	const mouseDragModeRef = useRef<"pan" | "window_level" | null>(null);
	const mouseDragStartPosRef = useRef<Point2D>({ x: 0, y: 0 });
	const mouseDragStartPanRef = useRef<Point2D>({ x: 0, y: 0 });
	const mouseDragStartWwWlRef = useRef({ ww: 2000, wl: 500 });

	const [draftRulerStart, setDraftRulerStart] = useState<Point2D | null>(null);
	const [draftRulerCurrent, setDraftRulerCurrent] = useState<Point2D | null>(null);
	const [draftCanalPoints, setDraftCanalPoints] = useState<Point2D[]>([]);

	const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point2D => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvasRectRef.current || (canvasRectRef.current = canvas.getBoundingClientRect());
		const currentX = (e.clientX - rect.left - (rect.width / 2 + viewportState.panX)) / viewportState.zoom + (rawImageRef.current?.width || 0) / 2;
		const currentY = (e.clientY - rect.top - (rect.height / 2 + viewportState.panY)) / viewportState.zoom + (rawImageRef.current?.height || 0) / 2;
		return { x: currentX, y: currentY };
	}, [canvasRef, canvasRectRef, viewportState.panX, viewportState.panY, viewportState.zoom, rawImageRef]);

	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		isMouseDownRef.current = true;
		mouseDragStartPosRef.current = { x: e.clientX, y: e.clientY };
		mouseDragStartPanRef.current = { x: viewportState.panX, y: viewportState.panY };
		mouseDragStartWwWlRef.current = { ww: viewportState.windowWidth, wl: viewportState.windowCenter };

		if (e.button === 1 || (e.button === 0 && viewportState.activeTool === "pan")) {
			mouseDragModeRef.current = "pan";
		} else if (e.button === 2 || (e.button === 0 && viewportState.activeTool === "window_level")) {
			mouseDragModeRef.current = "window_level";
		} else if (e.button === 0 && viewportState.activeTool === "ruler") {
			mouseDragModeRef.current = null;
			const pt = getCanvasPoint(e);
			setDraftRulerStart(pt);
			setDraftRulerCurrent(pt);
		} else if (e.button === 0 && viewportState.activeTool === "root_canal_tracer") {
			mouseDragModeRef.current = null;
			setDraftCanalPoints((prev) => [...prev, getCanvasPoint(e)]);
		} else mouseDragModeRef.current = null;
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (isMouseDownRef.current && mouseDragModeRef.current) {
			const dx = e.clientX - mouseDragStartPosRef.current.x;
			const dy = e.clientY - mouseDragStartPosRef.current.y;
			if (mouseDragModeRef.current === "pan") {
				scheduleViewportUpdate({ panX: mouseDragStartPanRef.current.x + dx, panY: mouseDragStartPanRef.current.y + dy });
			} else if (mouseDragModeRef.current === "window_level") {
				const next = calculate2FingerWindowLevel(dx, dy, mouseDragStartWwWlRef.current.ww, mouseDragStartWwWlRef.current.wl, 2.5);
				scheduleViewportUpdate({ windowWidth: next.windowWidth, windowCenter: next.windowCenter });
			}
			return;
		}
		if (draftRulerStart || draftCanalPoints.length > 0) setDraftRulerCurrent(getCanvasPoint(e));
	};

	const handleMouseUp = () => {
		isMouseDownRef.current = false;
		mouseDragModeRef.current = null;
		flushViewportUpdate();

		if (draftRulerStart && draftRulerCurrent && onAddMeasurement) {
			const m = measureDistanceMm(draftRulerStart, draftRulerCurrent, viewportState.calibrationMmPerPixel);
			if (m.distanceMm > 0.5) {
				onAddMeasurement({
					id: `ruler-${Date.now()}`,
					p1: draftRulerStart,
					p2: draftRulerCurrent,
					lengthPx: m.distancePx,
					lengthMm: m.distanceMm,
					calibrationMmPerPixel: viewportState.calibrationMmPerPixel,
					clinicalType: "general",
					labelRu: `${m.distanceMm.toFixed(1)} мм`,
					colorHex: "#06b6d4",
				});
			}
			setDraftRulerStart(null);
			setDraftRulerCurrent(null);
		}
	};

	const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		canvasRectRef.current = null;
		const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
		const nextZoom = Number(Math.max(0.2, Math.min(16.0, viewportState.zoom * zoomFactor)).toFixed(3));
		onViewportChange({ zoom: nextZoom });
	};

	return { draftRulerStart, draftRulerCurrent, draftCanalPoints, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel };
}
