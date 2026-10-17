import { useState, useCallback, useEffect, useRef } from "react";
import type { LandmarkKey, LandmarkMap, Point2D } from "../cephalometricMath";
import { CEPHALOMETRIC_LANDMARKS } from "../cephalometricMath";

interface UseCephInteractionsProps {
	landmarks: LandmarkMap;
	onLandmarkChange: (key: LandmarkKey, point: Point2D) => void;
	activeTargetKey: LandmarkKey | null;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	onScaleChange?: ((scale: number) => void) | undefined;
}

export function useCephInteractions({
	landmarks, onLandmarkChange, activeTargetKey, onSelectTargetKey, onScaleChange,
}: UseCephInteractionsProps) {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });
	const [draggingKey, setDraggingKey] = useState<LandmarkKey | null>(null);
	const [hoveredKey, setHoveredKey] = useState<LandmarkKey | null>(null);
	const [cursorImgPos, setCursorImgPos] = useState<Point2D | null>(null);
	const [isCalibrating, setIsCalibrating] = useState(false);
	const [calibrationPoints, setCalibrationPoints] = useState<Point2D[]>([]);

	const handleResetView = useCallback(() => { setZoom(1.0); setPan({ x: 0, y: 0 }); }, []);

	const getSvgCoordinates = useCallback((clientX: number, clientY: number): Point2D | null => {
		if (!svgRef.current) return null;
		const pt = svgRef.current.createSVGPoint();
		pt.x = clientX; pt.y = clientY;
		const ctm = svgRef.current.getScreenCTM();
		if (!ctm) return null;
		const transformed = pt.matrixTransform(ctm.inverse());
		return { x: Math.round(transformed.x * 10) / 10, y: Math.round(transformed.y * 10) / 10 };
	}, []);

	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
		setZoom((prev) => Math.max(0.4, Math.min(3.5, Number((prev + zoomDelta).toFixed(2)))));
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button === 1 || e.altKey || (!activeTargetKey && !hoveredKey)) {
			setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); return;
		}
		const svgCoords = getSvgCoordinates(e.clientX, e.clientY);
		if (!svgCoords) return;
		if (isCalibrating) {
			if (calibrationPoints.length < 2) {
				const nextPts = [...calibrationPoints, svgCoords];
				setCalibrationPoints(nextPts);
				const p0 = nextPts[0]; const p1 = nextPts[1];
				if (nextPts.length === 2 && p0 && p1 && onScaleChange) {
					const distPx = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
					if (distPx > 5) onScaleChange(Number((10 / distPx).toFixed(4)));
					setIsCalibrating(false); setCalibrationPoints([]);
				}
			}
			return;
		}
		if (hoveredKey) { setDraggingKey(hoveredKey); return; }
		if (activeTargetKey) {
			onLandmarkChange(activeTargetKey, svgCoords);
			const idx = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === activeTargetKey);
			if (idx !== -1 && idx < CEPHALOMETRIC_LANDMARKS.length - 1) {
				const next = CEPHALOMETRIC_LANDMARKS[idx + 1];
				if (next && !landmarks[next.key]) onSelectTargetKey(next.key);
			}
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (isPanning) { setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }
		const coords = getSvgCoordinates(e.clientX, e.clientY);
		if (coords) {
			setCursorImgPos(coords);
			if (draggingKey) onLandmarkChange(draggingKey, coords);
		}
	};

	const handleMouseUp = () => { setIsPanning(false); setDraggingKey(null); };

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isCalibrating) { setIsCalibrating(false); setCalibrationPoints([]); }
				else if (activeTargetKey) onSelectTargetKey(null);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeTargetKey, isCalibrating, onSelectTargetKey]);

	return {
		svgRef, zoom, setZoom, pan, isPanning,
		draggingKey, setDraggingKey, hoveredKey, setHoveredKey,
		cursorImgPos, isCalibrating, setIsCalibrating, calibrationPoints, setCalibrationPoints,
		handleResetView, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp,
	};
}
