import { useRef, useState } from "react";

export function useDirectRvgPanZoom() {
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [rotation, setRotation] = useState<number>(0);
	const [flipH, setFlipH] = useState<boolean>(false);
	const [flipV, setFlipV] = useState<boolean>(false);
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const touchStartDist = useRef<number | null>(null);
	const touchStartZoom = useRef<number>(1.0);

	const handleResetTransform = () => {
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
		setRotation(0);
		setFlipH(false);
		setFlipV(false);
	};

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		setIsDragging(true);
		dragStartPos.current = {
			x: e.clientX - pan.x,
			y: e.clientY - pan.y,
		};
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging) return;
		setPan({
			x: e.clientX - dragStartPos.current.x,
			y: e.clientY - dragStartPos.current.y,
		});
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
		setZoom((prev) => Math.min(Math.max(Number((prev + zoomDelta).toFixed(2)), 0.5), 4.0));
	};

	// Apple HIG Mobile Touch Ergonomics: Pinch-to-Zoom & Touch Pan
	const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 1 && e.touches[0]) {
			const touch = e.touches[0];
			setIsDragging(true);
			dragStartPos.current = {
				x: touch.clientX - pan.x,
				y: touch.clientY - pan.y,
			};
			touchStartDist.current = null;
		} else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
			setIsDragging(false);
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			touchStartDist.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			touchStartZoom.current = zoom;
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 1 && isDragging && e.touches[0]) {
			const touch = e.touches[0];
			setPan({
				x: touch.clientX - dragStartPos.current.x,
				y: touch.clientY - dragStartPos.current.y,
			});
		} else if (e.touches.length === 2 && touchStartDist.current !== null && e.touches[0] && e.touches[1]) {
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			if (touchStartDist.current > 0) {
				const scale = currentDist / touchStartDist.current;
				const newZoom = Number((touchStartZoom.current * scale).toFixed(2));
				setZoom(Math.min(Math.max(newZoom, 0.5), 4.0));
			}
		}
	};

	const handleTouchEnd = () => {
		setIsDragging(false);
		touchStartDist.current = null;
	};

	const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4.0));
	const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
	const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
	const handleRotateCw = () => setRotation((prev) => (prev + 90) % 360);
	const handleRotateCcw = () => setRotation((prev) => (prev - 90 + 360) % 360);
	const handleToggleFlipH = () => setFlipH((prev) => !prev);
	const handleToggleFlipV = () => setFlipV((prev) => !prev);

	return {
		zoom,
		setZoom,
		pan,
		setPan,
		rotation,
		setRotation,
		flipH,
		setFlipH,
		flipV,
		setFlipV,
		isDragging,
		handleResetTransform,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleWheel,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		handleZoomIn,
		handleZoomOut,
		handleRotate,
		handleRotateCw,
		handleRotateCcw,
		handleToggleFlipH,
		handleToggleFlipV,
	};
}

