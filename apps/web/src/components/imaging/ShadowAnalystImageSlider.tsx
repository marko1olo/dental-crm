import React, {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { UploadCloud, X } from "lucide-react";
import { useSafeObjectUrl } from "../../hooks/useMemoryLeakGuard";

export interface ViewerRulerMeasurement {
	id: string;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	lengthMm: number;
	label?: string;
}

export interface ShadowAnalystImageSliderProps {
	imageUrl: string | Blob | File;
	enhanced?: boolean;
	autoRevokeBlobUrl?: boolean;
	viewerStyle?: CSSProperties;
	isRulerActive?: boolean;
	pixelSpacingMm?: number;
	measurements?: ViewerRulerMeasurement[];
	onMeasurementsChange?: (measurements: ViewerRulerMeasurement[]) => void;
	isPanActive?: boolean;
	pan?: { x: number; y: number };
	onPanChange?: (pan: { x: number; y: number }) => void;
}

export function extractTransformParams(transformStr?: string): {
	zoom: number;
	panX: number;
	panY: number;
	rotationDeg: number;
	flipHorizontal: boolean;
} {
	if (!transformStr || transformStr === "none") {
		return { zoom: 1, panX: 0, panY: 0, rotationDeg: 0, flipHorizontal: false };
	}
	const scaleMatch = transformStr.match(/scale\(([-0-9.]+)\)/);
	const zoom = scaleMatch ? Math.max(0.1, Number.parseFloat(scaleMatch[1] ?? "1") || 1) : 1;

	const translateMatch = transformStr.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
	const panX = translateMatch ? Number.parseFloat(translateMatch[1] ?? "0") || 0 : 0;
	const panY = translateMatch ? Number.parseFloat(translateMatch[2] ?? "0") || 0 : 0;

	const rotateMatch = transformStr.match(/rotate\(([-0-9.]+)deg\)/);
	const rotationDeg = rotateMatch ? Number.parseFloat(rotateMatch[1] ?? "0") || 0 : 0;

	const flipHorizontal = /scaleX\(-1\)/.test(transformStr);

	return { zoom, panX, panY, rotationDeg, flipHorizontal };
}

export function ShadowAnalystImageSlider({
	imageUrl,
	enhanced = true,
	viewerStyle,
	autoRevokeBlobUrl,
	isRulerActive = false,
	pixelSpacingMm = 0.04,
	measurements,
	onMeasurementsChange,
	isPanActive = false,
	pan,
	onPanChange,
}: ShadowAnalystImageSliderProps) {
	const resolvedImageUrl = useSafeObjectUrl(imageUrl, {
		autoRevokeBlobStrings: autoRevokeBlobUrl,
	});
	const [sliderPos, setSliderPos] = useState(50);
	const [isDragging, setIsDragging] = useState(false);
	const [isPanning, setIsPanning] = useState(false);
	const [internalPan, setInternalPan] = useState({ x: 0, y: 0 });
	const [imageLoadError, setImageLoadError] = useState(false);
	const [internalMeasurements, setInternalMeasurements] = useState<ViewerRulerMeasurement[]>([]);
	const [drawingRuler, setDrawingRuler] = useState<{
		startX: number;
		startY: number;
		endX: number;
		endY: number;
	} | null>(null);

	const activeMeasurements = measurements ?? internalMeasurements;
	const activePan = pan ?? internalPan;
	const containerRef = useRef<HTMLDivElement>(null);
	const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	useEffect(() => {
		setImageLoadError(false);
	}, [resolvedImageUrl]);

	const calcPos = useCallback((clientX: number) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		let pos = ((clientX - rect.left) / rect.width) * 100;
		pos = Math.max(0, Math.min(pos, 100));
		setSliderPos(pos);
	}, []);

	const getClientToImagePercent = useCallback(
		(clientX: number, clientY: number) => {
			if (!containerRef.current) return { x: 50, y: 50 };
			const rect = containerRef.current.getBoundingClientRect();
			const cx = rect.left + rect.width / 2;
			const cy = rect.top + rect.height / 2;

			const transformParams = extractTransformParams(viewerStyle?.transform as string | undefined);
			const { zoom, panX, panY } = transformParams;

			// Screen offset relative to transformed center (container center + pan)
			const dxScreen = clientX - (cx + panX);
			const dyScreen = clientY - (cy + panY);

			// Invert zoom to map into unzoomed image coordinate space
			const dxUnzoomed = dxScreen / zoom;
			const dyUnzoomed = dyScreen / zoom;

			// Convert back to container percentage (0% to 100%)
			const unzoomedX = cx + dxUnzoomed;
			const unzoomedY = cy + dyUnzoomed;

			let xPct = ((unzoomedX - rect.left) / rect.width) * 100;
			let yPct = ((unzoomedY - rect.top) / rect.height) * 100;

			xPct = Math.max(0, Math.min(100, xPct));
			yPct = Math.max(0, Math.min(100, yPct));

			return { x: xPct, y: yPct };
		},
		[viewerStyle?.transform]
	);

	// Global mouse tracking while dragging divider, panning, or measuring
	useEffect(() => {
		if (!isDragging && !isPanning && !drawingRuler) return;

		const onMove = (e: MouseEvent) => {
			if (isDragging) {
				calcPos(e.clientX);
			} else if (isPanning) {
				const dx = e.clientX - lastMousePos.current.x;
				const dy = e.clientY - lastMousePos.current.y;
				lastMousePos.current = { x: e.clientX, y: e.clientY };
				const nextPan = { x: activePan.x + dx, y: activePan.y + dy };
				if (onPanChange) {
					onPanChange(nextPan);
				} else {
					setInternalPan(nextPan);
				}
			} else if (drawingRuler && containerRef.current) {
				const { x, y } = getClientToImagePercent(e.clientX, e.clientY);
				setDrawingRuler((prev) => (prev ? { ...prev, endX: x, endY: y } : null));
			}
		};

		const onUp = (e: MouseEvent) => {
			if (isDragging) {
				setIsDragging(false);
			}
			if (isPanning) {
				setIsPanning(false);
			}
			if (drawingRuler && containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				const { x: currentEndX, y: currentEndY } = getClientToImagePercent(e.clientX, e.clientY);
				const dxPx = ((currentEndX - drawingRuler.startX) / 100) * rect.width;
				const dyPx = ((currentEndY - drawingRuler.startY) / 100) * rect.height;
				const distPx = Math.hypot(dxPx, dyPx);

				if (distPx > 8) {
					const lengthMm = Math.round(distPx * (pixelSpacingMm || 0.04) * 10) / 10;
					const newM: ViewerRulerMeasurement = {
						id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
						startX: drawingRuler.startX,
						startY: drawingRuler.startY,
						endX: currentEndX,
						endY: currentEndY,
						lengthMm,
					};
					const next = [...activeMeasurements, newM];
					if (onMeasurementsChange) {
						onMeasurementsChange(next);
					} else {
						setInternalMeasurements(next);
					}
				}
				setDrawingRuler(null);
			}
		};

		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [
		isDragging,
		isPanning,
		drawingRuler,
		calcPos,
		getClientToImagePercent,
		activePan,
		onPanChange,
		activeMeasurements,
		onMeasurementsChange,
		pixelSpacingMm,
	]);

	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button !== 0) return; // Only primary mouse button

		if (isRulerActive) {
			e.preventDefault();
			if (!containerRef.current) return;
			const { x, y } = getClientToImagePercent(e.clientX, e.clientY);
			setDrawingRuler({ startX: x, startY: y, endX: x, endY: y });
			return;
		}

		if (isPanActive) {
			e.preventDefault();
			setIsPanning(true);
			lastMousePos.current = { x: e.clientX, y: e.clientY };
			return;
		}

		if (enhanced) {
			e.preventDefault();
			setIsDragging(true);
			calcPos(e.clientX);
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (!isRulerActive && !isPanActive && enhanced && e.touches?.[0]) {
			calcPos(e.touches[0].clientX);
		}
	};

	const deleteMeasurement = (id: string) => {
		const next = activeMeasurements.filter((m) => m.id !== id);
		if (onMeasurementsChange) {
			onMeasurementsChange(next);
		} else {
			setInternalMeasurements(next);
		}
	};

	const viewerFilter = (viewerStyle?.filter as string) || "none";
	const effectiveChain = viewerFilter === "none" ? "" : viewerFilter;
	const viewerVariables = {
		"--sa-viewer-filter": viewerFilter,
		"--sa-viewer-filter-chain": effectiveChain,
		"--sa-viewer-transform": (viewerStyle?.transform as string) ?? "none",
	} as CSSProperties;

	const cursorStyle = isRulerActive
		? "crosshair"
		: isPanActive
			? isPanning
				? "grabbing"
				: "grab"
			: enhanced
				? isDragging
					? "grabbing"
					: "col-resize"
				: "default";

	if (!resolvedImageUrl || !resolvedImageUrl.trim() || imageLoadError) {
		return (
			<div
				className="sa-image-container flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] min-h-[70vh] flex-1 w-full"
				ref={containerRef}
				data-testid="shadow-analyst-placeholder"
			>
				<UploadCloud size={40} className="mb-2 text-[var(--teal,var(--brand-primary))] opacity-75" />
				<strong className="text-sm font-bold text-[var(--ink)] mb-1">
					{imageLoadError
						? "Снимок недоступен или повреждён"
						: "Снимок не выбран или ожидает загрузки"}
				</strong>
				<p className="text-xs text-[var(--muted)] max-w-sm m-0">
					{imageLoadError
						? "Не удалось отобразить графический файл. Выберите другой снимок из списка или загрузите новый."
						: "Выберите файл DICOM/Рентген из списка слева или перетащите снимок в рабочую область"}
				</p>
			</div>
		);
	}

	const renderRulerOverlay = () => {
		const transformParams = extractTransformParams(viewerStyle?.transform as string | undefined);
		const badgeCounterScale = 1 / Math.max(0.2, transformParams.zoom);

		return (
			<svg
				className="sa-ruler-overlay"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					pointerEvents: isRulerActive ? "auto" : "none",
					zIndex: 25,
					transform: (viewerStyle?.transform as string) ?? "none",
					transformOrigin: "center center",
				}}
			>
				<title>Калиброванная линейка измерений</title>
				{activeMeasurements.map((m) => {
					const midX = (m.startX + m.endX) / 2;
					const midY = (m.startY + m.endY) / 2;
					const dx = m.endX - m.startX;
					const dy = m.endY - m.startY;
					const len = Math.hypot(dx, dy) || 1;
					const perpX = (-dy / len) * 1.5;
					const perpY = (dx / len) * 1.5;

					return (
						<g key={m.id} className="sa-ruler-measurement-group">
							{/* Dark contrast underlay */}
							<line
								x1={`${m.startX}%`}
								y1={`${m.startY}%`}
								x2={`${m.endX}%`}
								y2={`${m.endY}%`}
								stroke="rgba(15, 23, 42, 0.92)"
								strokeWidth="4"
								strokeLinecap="round"
							/>
							{/* Cyan calibrated line */}
							<line
								x1={`${m.startX}%`}
								y1={`${m.startY}%`}
								x2={`${m.endX}%`}
								y2={`${m.endY}%`}
								stroke="#06b6d4"
								strokeWidth="2"
								strokeLinecap="round"
							/>
							{/* End ticks */}
							<line
								x1={`${m.startX - perpX}%`}
								y1={`${m.startY - perpY}%`}
								x2={`${m.startX + perpX}%`}
								y2={`${m.startY + perpY}%`}
								stroke="#06b6d4"
								strokeWidth="2"
							/>
							<line
								x1={`${m.endX - perpX}%`}
								y1={`${m.endY - perpY}%`}
								x2={`${m.endX + perpX}%`}
								y2={`${m.endY + perpY}%`}
								stroke="#06b6d4"
								strokeWidth="2"
							/>
							{/* Distance badge with delete button */}
							<g
								transform={`translate(${midX}%, ${midY}%) scale(${badgeCounterScale})`}
								style={{ pointerEvents: "auto", cursor: "pointer" }}
								onClick={(e) => {
									e.stopPropagation();
									deleteMeasurement(m.id);
								}}
							>
							<rect
								x="-32"
								y="-11"
								width="64"
								height="22"
								rx="5"
								fill="rgba(15, 23, 42, 0.94)"
								stroke="#06b6d4"
								strokeWidth="1.2"
							/>
							<text
								x="-6"
								y="4"
								textAnchor="middle"
								fill="#f8fafc"
								fontSize="11"
								fontFamily="ui-monospace, monospace"
								fontWeight="700"
							>
								{m.lengthMm.toFixed(1)} мм
							</text>
							<g>
								<title>Удалить измерение</title>
								<text
									x="22"
									y="4"
									textAnchor="middle"
									fill="#ef4444"
									fontSize="11"
									fontWeight="900"
								>
									×
								</text>
							</g>
						</g>
					</g>
				);
			})}

			{drawingRuler && (
				<g className="sa-ruler-drawing-group">
					<line
						x1={`${drawingRuler.startX}%`}
						y1={`${drawingRuler.startY}%`}
						x2={`${drawingRuler.endX}%`}
						y2={`${drawingRuler.endY}%`}
						stroke="rgba(15, 23, 42, 0.9)"
						strokeWidth="3.5"
						strokeDasharray="4 2"
					/>
					<line
						x1={`${drawingRuler.startX}%`}
						y1={`${drawingRuler.startY}%`}
						x2={`${drawingRuler.endX}%`}
						y2={`${drawingRuler.endY}%`}
						stroke="#38bdf8"
						strokeWidth="2"
						strokeDasharray="4 2"
					/>
				</g>
			)}
		</svg>
	);
};

	if (!enhanced) {
		return (
			<div
				className="sa-image-container min-h-[70vh] flex-1"
				ref={containerRef}
				style={{
					...viewerVariables,
					cursor: cursorStyle,
				}}
				onMouseDown={handleMouseDown}
			>
				<img
					src={resolvedImageUrl}
					alt="Рентгеновский снимок"
					loading="lazy"
					decoding="async"
					className="sa-img-original"
					onError={() => setImageLoadError(true)}
				/>
				{renderRulerOverlay()}
			</div>
		);
	}

	return (
		<div
			className="sa-image-container min-h-[70vh] flex-1"
			ref={containerRef}
			role={isRulerActive || isPanActive ? "region" : "slider"}
			tabIndex={0}
			aria-valuenow={isRulerActive || isPanActive ? undefined : Math.round(sliderPos)}
			aria-valuemin={isRulerActive || isPanActive ? undefined : 0}
			aria-valuemax={isRulerActive || isPanActive ? undefined : 100}
			aria-label={
				isRulerActive
					? "Измерение расстояний на снимке"
					: isPanActive
						? "Панорамирование снимка"
						: "Сравнение изображений"
			}
			onMouseDown={handleMouseDown}
			onTouchMove={handleTouchMove}
			onKeyDown={(e) => {
				if (!isRulerActive && !isPanActive) {
					if (e.key === "ArrowLeft") {
						e.preventDefault();
						setSliderPos((prev) => Math.max(0, prev - 5));
					} else if (e.key === "ArrowRight") {
						e.preventDefault();
						setSliderPos((prev) => Math.min(100, prev + 5));
					}
				}
			}}
			style={{
				...viewerVariables,
				cursor: cursorStyle,
			}}
		>
			{/* Исходный снимок — нижний слой */}
			<img
				src={resolvedImageUrl}
				alt="Снимок без обработки"
				loading="lazy"
				decoding="async"
				className="sa-img-original"
				onError={() => setImageLoadError(true)}
			/>

			{/* Обработанный снимок — обрезан по положению разделителя */}
			<div
				className="sa-img-enhanced-wrapper"
				style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
			>
				<img
					src={resolvedImageUrl}
					alt="Снимок с усилением контраста"
					loading="lazy"
					decoding="async"
					className="sa-img-enhanced"
					onError={() => setImageLoadError(true)}
				/>
			</div>

			{/* Подписи по сторонам разделителя — видны только в режиме слайдера */}
			{!isRulerActive && !isPanActive && (
				<>
					<span className="sa-label sa-label--left">Оригинал</span>
					<span className="sa-label sa-label--right">С обработкой</span>

					{/* Divider handle */}
					<div
						className="sa-slider-handle"
						aria-hidden="true"
						style={{ left: `${sliderPos}%` }}
					>
						<div className="sa-slider-line" />
						<div className="sa-slider-button">
							<svg
								viewBox="0 0 24 24"
								width="14"
								height="14"
								stroke="currentColor"
								strokeWidth="2.5"
								fill="none"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>Слайдер</title>
								<polyline points="8 17 3 12 8 7" />
								<polyline points="16 7 21 12 16 17" />
							</svg>
						</div>
					</div>
				</>
			)}

			{renderRulerOverlay()}
		</div>
	);
}
