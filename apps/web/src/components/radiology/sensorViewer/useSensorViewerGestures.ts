import { useRef, useCallback } from "react";
import type React from "react";
import {
	calculateCursorCenteredZoom,
	calculatePhysicalDistanceMm,
	type ViewerPoint2D,
} from "../dentalViewerMath.js";
import type { ViewerTool } from "./types.js";

export interface UseSensorViewerGesturesOptions {
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly rawImageRef: React.RefObject<HTMLImageElement | null>;
	readonly zoom: number;
	readonly setZoom: React.Dispatch<React.SetStateAction<number>>;
	readonly panX: number;
	readonly setPanX: React.Dispatch<React.SetStateAction<number>>;
	readonly panY: number;
	readonly setPanY: React.Dispatch<React.SetStateAction<number>>;
	readonly activeTool: ViewerTool;
	readonly draftStart: ViewerPoint2D | null;
	readonly setDraftStart: React.Dispatch<React.SetStateAction<ViewerPoint2D | null>>;
	readonly setDraftCurrent: React.Dispatch<React.SetStateAction<ViewerPoint2D | null>>;
	readonly setMagnifierPos: React.Dispatch<React.SetStateAction<ViewerPoint2D | null>>;
	readonly setMeasurements: React.Dispatch<React.SetStateAction<any[]>>;
	readonly setDraftCurvedPoints: React.Dispatch<React.SetStateAction<ViewerPoint2D[]>>;
	readonly setDraftLesionPoints: React.Dispatch<React.SetStateAction<ViewerPoint2D[]>>;
	readonly calibratedMmPerPx: number;
}

export function useSensorViewerGestures(options: UseSensorViewerGesturesOptions) {
	const {
		canvasRef,
		rawImageRef,
		zoom,
		setZoom,
		panX,
		setPanX,
		panY,
		setPanY,
		activeTool,
		draftStart,
		setDraftStart,
		setDraftCurrent,
		setMagnifierPos,
		setMeasurements,
		setDraftCurvedPoints,
		setDraftLesionPoints,
		calibratedMmPerPx,
	} = options;

	// Mouse drag tracking
	const isDraggingRef = useRef<boolean>(false);
	const dragStartPosRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });
	const dragStartPanRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });

	// Touch tracking refs
	const touchStartDistanceRef = useRef<number | null>(null);
	const touchStartZoomRef = useRef<number>(1.0);
	const touchStartCenterRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });
	const touchLastPosRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });
	const isTouchPinchingRef = useRef<boolean>(false);

	// Cursor-centered Wheel Zoom
	const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const cursorX = e.clientX - rect.left;
		const cursorY = e.clientY - rect.top;
		const factor = e.deltaY < 0 ? 1.15 : 0.87;

		const result = calculateCursorCenteredZoom({
			currentZoom: zoom,
			zoomFactor: factor,
			cursorX,
			cursorY,
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			currentPanX: panX,
			currentPanY: panY,
			minZoom: 0.2,
			maxZoom: 16.0,
		});

		setZoom(result.nextZoom);
		setPanX(result.nextPanX);
		setPanY(result.nextPanY);
	}, [zoom, panX, panY, canvasRef, setZoom, setPanX, setPanY]);

	// Mouse Down (Pan or Ruler)
	const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (e.button === 0 && activeTool === "pan") {
			isDraggingRef.current = true;
			dragStartPosRef.current = { x: e.clientX, y: e.clientY };
			dragStartPanRef.current = { x: panX, y: panY };
		}
	}, [activeTool, panX, panY]);

	const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;

		if (activeTool === "magnifier") {
			setMagnifierPos({ x: canvasX, y: canvasY });
		}

		if (isDraggingRef.current && activeTool === "pan") {
			const dx = e.clientX - dragStartPosRef.current.x;
			const dy = e.clientY - dragStartPosRef.current.y;
			setPanX(dragStartPanRef.current.x + dx);
			setPanY(dragStartPanRef.current.y + dy);
			return;
		}

		// Ruler drafting update
		if (activeTool === "ruler" && draftStart) {
			const currentX = (canvasX - (canvas.width / 2 + panX)) / zoom + (rawImageRef.current?.width || 0) / 2;
			const currentY = (canvasY - (canvas.height / 2 + panY)) / zoom + (rawImageRef.current?.height || 0) / 2;
			setDraftCurrent({ x: currentX, y: currentY });
		}
	}, [activeTool, draftStart, panX, panY, zoom, canvasRef, rawImageRef, setMagnifierPos, setPanX, setPanY, setDraftCurrent]);

	const handleMouseLeave = useCallback(() => {
		isDraggingRef.current = false;
		if (activeTool === "magnifier") {
			setMagnifierPos(null);
		}
	}, [activeTool, setMagnifierPos]);

	const handleMouseUp = useCallback(() => {
		isDraggingRef.current = false;
	}, []);

	const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const clickX = (e.clientX - rect.left - (canvas.width / 2 + panX)) / zoom + (rawImageRef.current?.width || 0) / 2;
		const clickY = (e.clientY - rect.top - (canvas.height / 2 + panY)) / zoom + (rawImageRef.current?.height || 0) / 2;
		const pt: ViewerPoint2D = { x: clickX, y: clickY };

		if (activeTool === "ruler") {
			if (!draftStart) {
				setDraftStart(pt);
				setDraftCurrent(pt);
			} else {
				const distMm = calculatePhysicalDistanceMm(draftStart, pt, calibratedMmPerPx);
				setMeasurements((prev) => [
					...prev,
					{
						id: `ruler-${Date.now()}`,
						startX: draftStart.x,
						startY: draftStart.y,
						endX: pt.x,
						endY: pt.y,
						lengthMm: distMm,
						label: `${distMm.toFixed(1)} мм`,
						color: "#00C853",
					},
				]);
				setDraftStart(null);
				setDraftCurrent(null);
			}
		} else if (activeTool === "curved_canal") {
			setDraftCurvedPoints((prev) => [...prev, pt]);
		} else if (activeTool === "lesion_contour") {
			setDraftLesionPoints((prev) => [...prev, pt]);
		}
	}, [activeTool, panX, panY, zoom, draftStart, calibratedMmPerPx, canvasRef, rawImageRef, setDraftStart, setDraftCurrent, setMeasurements, setDraftCurvedPoints, setDraftLesionPoints]);

	// Touch Navigation & Gestures (1-finger pan/loupe, 2-finger pinch-to-zoom)
	const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 2) {
			isTouchPinchingRef.current = true;
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			touchStartDistanceRef.current = dist;
			touchStartZoomRef.current = zoom;
			touchStartCenterRef.current = {
				x: (t1.clientX + t2.clientX) / 2,
				y: (t1.clientY + t2.clientY) / 2,
			};
			return;
		}

		if (e.touches.length === 1) {
			const t = e.touches[0]!;
			touchLastPosRef.current = { x: t.clientX, y: t.clientY };

			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const canvasX = t.clientX - rect.left;
			const canvasY = t.clientY - rect.top;

			if (activeTool === "pan") {
				isDraggingRef.current = true;
				dragStartPosRef.current = { x: t.clientX, y: t.clientY };
				dragStartPanRef.current = { x: panX, y: panY };
			} else if (activeTool === "magnifier") {
				setMagnifierPos({ x: canvasX, y: canvasY });
			}
		}
	}, [activeTool, panX, panY, zoom, canvasRef, setMagnifierPos]);

	const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 2 && isTouchPinchingRef.current && touchStartDistanceRef.current) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			const scale = dist / touchStartDistanceRef.current;
			const nextZoom = Math.min(16.0, Math.max(0.2, touchStartZoomRef.current * scale));
			setZoom(nextZoom);
			return;
		}

		if (e.touches.length === 1) {
			const t = e.touches[0]!;
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const canvasX = t.clientX - rect.left;
			const canvasY = t.clientY - rect.top;

			if (activeTool === "magnifier") {
				setMagnifierPos({ x: canvasX, y: canvasY });
				return;
			}

			if (isDraggingRef.current && activeTool === "pan") {
				const dx = t.clientX - dragStartPosRef.current.x;
				const dy = t.clientY - dragStartPosRef.current.y;
				setPanX(dragStartPanRef.current.x + dx);
				setPanY(dragStartPanRef.current.y + dy);
				return;
			}

			if (activeTool === "ruler" && draftStart) {
				const currentX = (canvasX - (canvas.width / 2 + panX)) / zoom + (rawImageRef.current?.width || 0) / 2;
				const currentY = (canvasY - (canvas.height / 2 + panY)) / zoom + (rawImageRef.current?.height || 0) / 2;
				setDraftCurrent({ x: currentX, y: currentY });
			}
		}
	}, [activeTool, draftStart, panX, panY, zoom, canvasRef, rawImageRef, setZoom, setMagnifierPos, setPanX, setPanY, setDraftCurrent]);

	const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length < 2) {
			isTouchPinchingRef.current = false;
			touchStartDistanceRef.current = null;
		}

		if (e.touches.length === 0) {
			isDraggingRef.current = false;
			if (activeTool === "magnifier") {
				setMagnifierPos(null);
			}
		}
	}, [activeTool, setMagnifierPos]);

	const handleTouchCancel = useCallback(() => {
		isTouchPinchingRef.current = false;
		touchStartDistanceRef.current = null;
		isDraggingRef.current = false;
		if (activeTool === "magnifier") {
			setMagnifierPos(null);
		}
	}, [activeTool, setMagnifierPos]);

	return {
		handleWheel,
		handleMouseDown,
		handleMouseMove,
		handleMouseLeave,
		handleMouseUp,
		handleCanvasClick,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		handleTouchCancel,
	};
}
