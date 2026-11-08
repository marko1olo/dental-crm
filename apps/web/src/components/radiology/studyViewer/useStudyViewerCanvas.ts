/**
 * useStudyViewerCanvas.ts — Канонический хук рендеринга 2D радиовизиографического холста.
 * Управляет зумом, панорамированием, сенсорными жестами (Pinch-to-zoom), фильтрами и линейкой.
 * Mandate 8b: строго < 250 строк.
 */

import { useState, useRef, useEffect, useCallback } from "react";

export interface UseStudyViewerCanvasOptions {
	readonly currentImage: string;
	readonly mmPerPixel: number;
}

export function useStudyViewerCanvas({
	currentImage,
	mmPerPixel,
}: UseStudyViewerCanvasOptions) {
	// Фильтры изображения
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [isInverted, setIsInverted] = useState<boolean>(false);
	const [isSharpnessOn, setIsSharpnessOn] = useState<boolean>(false);

	// Зум и панорамирование
	const [zoom, setZoom] = useState<number>(1);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	// Линейка измерений
	const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
	const [rulerPoints, setRulerPoints] = useState<{ x: number; y: number }[]>([]);
	const [measurementsMm, setMeasurementsMm] = useState<number[]>([]);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const imageObjRef = useRef<HTMLImageElement | null>(null);
	const touchStartDistRef = useRef<number | null>(null);
	const initialZoomRef = useRef<number>(1);
	const touchDragStartRef = useRef<{ x: number; y: number } | null>(null);

	// Сброс вида
	const handleResetView = useCallback(() => {
		setBrightness(100);
		setContrast(100);
		setIsInverted(false);
		setIsSharpnessOn(false);
		setZoom(1);
		setPan({ x: 0, y: 0 });
		setRulerPoints([]);
	}, []);

	// Отрисовка холста при изменении параметров
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const rect = canvas.getBoundingClientRect();
		if (canvas.width !== (rect.width || 600) || canvas.height !== (rect.height || 450)) {
			canvas.width = rect.width || 600;
			canvas.height = rect.height || 450;
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (!currentImage) return;

		let isCancelled = false;
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = currentImage;

		img.onload = () => {
			if (isCancelled) return;
			imageObjRef.current = img;

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.save();

			ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${isInverted ? "invert(100%)" : "invert(0%)"}`;

			const cx = canvas.width / 2;
			const cy = canvas.height / 2;
			ctx.translate(cx + pan.x, cy + pan.y);
			ctx.scale(zoom, zoom);

			const scale = Math.min((canvas.width * 0.85) / img.width, (canvas.height * 0.85) / img.height);
			const dw = img.width * scale;
			const dh = img.height * scale;
			ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
			ctx.restore();

			// Отрисовка линейки с защитной темной плашкой (WCAG AAA)
			if (rulerPoints.length >= 2) {
				ctx.save();
				ctx.strokeStyle = "#0d9488";
				ctx.fillStyle = "#0d9488";
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.moveTo(rulerPoints[0]!.x, rulerPoints[0]!.y);
				ctx.lineTo(rulerPoints[1]!.x, rulerPoints[1]!.y);
				ctx.stroke();

				for (const p of rulerPoints) {
					ctx.beginPath();
					ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
					ctx.fill();
				}

				const midX = (rulerPoints[0]!.x + rulerPoints[1]!.x) / 2;
				const midY = (rulerPoints[0]!.y + rulerPoints[1]!.y) / 2 - 8;
				const pixelDist = Math.hypot(rulerPoints[1]!.x - rulerPoints[0]!.x, rulerPoints[1]!.y - rulerPoints[0]!.y);
				const realMm = ((pixelDist / zoom) * mmPerPixel).toFixed(1);

				ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
				const labelText = `${realMm} мм`;
				const textMetrics = ctx.measureText(labelText);
				const pillWidth = textMetrics.width + 12;
				const pillHeight = 20;

				ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
				ctx.beginPath();
				if (typeof ctx.roundRect === "function") {
					ctx.roundRect(midX - pillWidth / 2, midY - 14, pillWidth, pillHeight, 4);
				} else {
					ctx.rect(midX - pillWidth / 2, midY - 14, pillWidth, pillHeight);
				}
				ctx.fill();

				ctx.fillStyle = "#ffffff";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(labelText, midX, midY - 4);
				ctx.restore();
			}
		};

		return () => {
			isCancelled = true;
		};
	}, [currentImage, brightness, contrast, isInverted, isSharpnessOn, zoom, pan, rulerPoints, mmPerPixel]);

	// Мышь: клик для линейки
	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isRulerActive) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (rulerPoints.length >= 2) {
			setRulerPoints([{ x, y }]);
		} else {
			const next = [...rulerPoints, { x, y }];
			setRulerPoints(next);
			if (next.length === 2) {
				const pixelDist = Math.hypot(next[1]!.x - next[0]!.x, next[1]!.y - next[0]!.y);
				const calcMm = Number(((pixelDist / zoom) * mmPerPixel).toFixed(1));
				setMeasurementsMm((prev) => [...prev, calcMm]);
			}
		}
	};

	// Мышь: зум колесиком
	const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 1.15 : 0.85;
		setZoom((prev) => Math.min(Math.max(0.5, prev * zoomDelta), 5));
	};

	// Мышь: перетаскивание (Pan)
	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (isRulerActive) return;
		setIsDragging(true);
		setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDragging || isRulerActive) return;
		setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
	};

	const handleMouseUp = () => setIsDragging(false);

	// Сенсор: Pinch-to-zoom и Touch-pan (Apple HIG)
	const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 2) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			touchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			initialZoomRef.current = zoom;
			touchDragStartRef.current = null;
		} else if (e.touches.length === 1 && !isRulerActive) {
			const t = e.touches[0]!;
			touchDragStartRef.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
			touchStartDistRef.current = null;
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 2 && touchStartDistRef.current !== null) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			if (currentDist > 0 && touchStartDistRef.current > 0) {
				const ratio = currentDist / touchStartDistRef.current;
				setZoom(Math.min(Math.max(0.5, initialZoomRef.current * ratio), 5));
			}
		} else if (e.touches.length === 1 && touchDragStartRef.current && !isRulerActive) {
			const t = e.touches[0]!;
			setPan({ x: t.clientX - touchDragStartRef.current.x, y: t.clientY - touchDragStartRef.current.y });
		}
	};

	const handleTouchEnd = () => {
		touchStartDistRef.current = null;
		touchDragStartRef.current = null;
	};

	return {
		canvasRef,
		brightness,
		setBrightness,
		contrast,
		setContrast,
		isInverted,
		setIsInverted,
		isSharpnessOn,
		setIsSharpnessOn,
		zoom,
		setZoom,
		isRulerActive,
		setIsRulerActive,
		rulerPoints,
		setRulerPoints,
		measurementsMm,
		handleResetView,
		handleCanvasClick,
		handleWheel,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
	};
}
