/**
 * @dental/web/components/orthodontics/CephalometricCanvas.tsx
 *
 * Интерактивный холст боковой рентгенограммы ТРГ и анатомических ориентиров (DEF-ORTHO-01, Мандаты 8b, 8e, 8am).
 * Поддерживает:
 * 1. Реальный рендеринг рентгенограммы ТРГ (<img> с сохранением пропорций и аппаратными фильтрами).
 * 2. Интерактивный SVG-оверлей плоскостей (FH, SN, Ba-N, NA, NB, Y-axis, MP, резцы).
 * 3. 16 анатомических точек (S, N, A, B, Pog, Gn, Me, Go, Ba, Pt, Or, Po, U1t, U1a, L1t, L1a)
 *    с поддержкой Pointer / Touch Drag-and-Drop перемещения координат [x, y].
 * 4. Дропзона для загрузки снимка ТРГ (DICOM/JPG/PNG).
 */

import React, { useState, useRef, useCallback } from "react";
import { UploadCloud, ZoomIn, ZoomOut, RotateCcw, Ruler } from "lucide-react";

export type XrayFilterMode = "normal" | "invert" | "contrast" | "bone_enhance";
export const SAMPLE_TRG_CEPHALOGRAM_URL = "/radiology/sample_trg_cephalogram.jpg";

export interface PointCoord {
	x: number;
	y: number;
}

export interface CephalometricCanvasProps {
	readonly imageUrl?: string | null | undefined;
	readonly landmarks?: Record<string, PointCoord> | undefined;
	readonly onLandmarkChange?: ((id: string, pt: PointCoord) => void) | undefined;
	readonly onRemoveLandmark?: ((id: string) => void) | undefined;
	readonly activeTargetKey?: string | null | undefined;
	readonly onSelectTargetKey?: ((key: string | null) => void) | undefined;
	readonly onImageUpload?: ((url: string) => void) | undefined;
	readonly filterMode?: XrayFilterMode | undefined;
	readonly onFilterModeChange?: ((mode: XrayFilterMode) => void) | undefined;
	readonly brightness?: number | undefined;
	readonly contrast?: number | undefined;
	readonly showPolygon?: boolean | undefined;
	readonly onTogglePolygon?: (() => void) | undefined;
	readonly showPlanes?: boolean | undefined;
	readonly onTogglePlanes?: (() => void) | undefined;
	readonly showLabels?: boolean | undefined;
	readonly onToggleLabels?: (() => void) | undefined;
	readonly scaleMmPerPixel?: number | undefined;
	readonly onScaleChange?: ((scale: number) => void) | undefined;
	readonly onLoadPreset?: (() => void) | undefined;
	readonly onResetLandmarks?: (() => void) | undefined;
	readonly onRunAiAutoPlacement?: (() => void) | undefined;
	readonly isAiInferring?: boolean | undefined;
	readonly aiBackendBadge?: string | undefined;
	readonly aiBackendLabel?: string | undefined;
	readonly aiBackendPref?: string | undefined;
	readonly onChangeAiBackendPref?: ((pref: string) => void) | undefined;
	readonly aiInferenceStats?: unknown;
	readonly children?: React.ReactNode | undefined;
	readonly className?: string | undefined;
}

const LANDMARK_COLORS: Record<string, string> = {
	S: "#38bdf8",
	N: "#38bdf8",
	Or: "#38bdf8",
	Po: "#38bdf8",
	ANS: "#38bdf8",
	PNS: "#38bdf8",
	A: "#38bdf8",
	B: "#38bdf8",
	Pog: "#38bdf8",
	Gn: "#38bdf8",
	Me: "#38bdf8",
	Go: "#38bdf8",
	Ba: "#38bdf8",
	Ar: "#38bdf8",
	Pt: "#38bdf8",
	Prn: "#f43f5e",
	Ls: "#f43f5e",
	Li: "#f43f5e",
	Pog_prime: "#f43f5e",
	U1t: "#22c55e",
	U1a: "#22c55e",
	L1t: "#22c55e",
	L1a: "#22c55e",
	U1T: "#22c55e",
	U1A: "#22c55e",
	L1T: "#22c55e",
	L1A: "#22c55e",
};

export const CephalometricCanvas: React.FC<CephalometricCanvasProps> = ({
	imageUrl,
	landmarks = {},
	onLandmarkChange,
	onRemoveLandmark,
	activeTargetKey,
	onSelectTargetKey,
	onImageUpload,
	filterMode = "normal",
	brightness = 100,
	contrast = 100,
	showPolygon = true,
	showPlanes = true,
	showLabels = true,
	scaleMmPerPixel = 0.15,
	onScaleChange,
	children,
	className,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [draggingKey, setDraggingKey] = useState<string | null>(null);
	const [zoom, setZoom] = useState<number>(1);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState<boolean>(false);
	const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	// Двухточечная калибровка линейки (DEF-ORTHO-05, 10/50 мм)
	const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
	const [calibPoint1, setCalibPoint1] = useState<PointCoord>({ x: 120, y: 700 });
	const [calibPoint2, setCalibPoint2] = useState<PointCoord>({ x: 453, y: 700 }); // ~333px = 50mm
	const [calibDistanceMm, setCalibDistanceMm] = useState<number>(50);
	const [draggingCalib, setDraggingCalib] = useState<"p1" | "p2" | null>(null);

	const calibPixelDist = Math.hypot(calibPoint2.x - calibPoint1.x, calibPoint2.y - calibPoint1.y);
	const calculatedScale = calibPixelDist > 1 ? calibDistanceMm / calibPixelDist : scaleMmPerPixel;

	const handleApplyCalibration = () => {
		if (calibPixelDist > 5 && onScaleChange) {
			onScaleChange(Math.round(calculatedScale * 10000) / 10000);
		}
		setIsCalibrating(false);
	};

	// CSS-фильтры рентгенограммы
	const getFilterStyle = (): string => {
		const parts: string[] = [];
		if (filterMode === "invert") parts.push("invert(100%)");
		if (filterMode === "contrast") parts.push("contrast(160%) brightness(110%)");
		if (filterMode === "bone_enhance") parts.push("contrast(180%) brightness(120%) grayscale(100%)");
		if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
		if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
		return parts.length > 0 ? parts.join(" ") : "none";
	};

	// Перевод координат экрана в систему координат SVG (0..800 x 0..800)
	const getSvgCoords = useCallback((clientX: number, clientY: number): PointCoord | null => {
		if (!svgRef.current) return null;
		const pt = svgRef.current.createSVGPoint();
		pt.x = clientX;
		pt.y = clientY;
		const ctm = svgRef.current.getScreenCTM();
		if (!ctm) return null;
		const inverted = ctm.inverse();
		const svgPt = pt.matrixTransform(inverted);
		return { x: Math.round(svgPt.x), y: Math.round(svgPt.y) };
	}, []);

	// Обработка начала драга точки
	const handlePointerDownPoint = (e: React.PointerEvent, key: string) => {
		e.stopPropagation();
		(e.target as Element).setPointerCapture(e.pointerId);
		setDraggingKey(key);
		if (onSelectTargetKey) {
			onSelectTargetKey(key);
		}
	};

	// Обработка перемещения точки
	const handlePointerMove = (e: React.PointerEvent) => {
		if (draggingCalib) {
			const coords = getSvgCoords(e.clientX, e.clientY);
			if (coords) {
				if (draggingCalib === "p1") setCalibPoint1(coords);
				if (draggingCalib === "p2") setCalibPoint2(coords);
			}
			return;
		}

		if (draggingKey && onLandmarkChange) {
			const coords = getSvgCoords(e.clientX, e.clientY);
			if (coords) {
				onLandmarkChange(draggingKey, coords);
			}
			return;
		}

		if (isPanning) {
			setPan({
				x: e.clientX - panStart.x,
				y: e.clientY - panStart.y,
			});
		}
	};

	// Обработка отпускания точки
	const handlePointerUp = (e: React.PointerEvent) => {
		if (draggingCalib) {
			try {
				(e.target as Element).releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			setDraggingCalib(null);
		}
		if (draggingKey) {
			try {
				(e.target as Element).releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			setDraggingKey(null);
		}
		if (isPanning) {
			setIsPanning(false);
		}
	};

	// Клик по холсту для расстановки активного ориентира
	const handleCanvasClick = (e: React.MouseEvent) => {
		if (draggingKey || isPanning || draggingCalib) return;
		if (activeTargetKey && onLandmarkChange) {
			const coords = getSvgCoords(e.clientX, e.clientY);
			if (coords) {
				onLandmarkChange(activeTargetKey, coords);
			}
		}
	};

	// Загрузка файла через input или DnD
	const handleFileSelect = (file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string" && onImageUpload) {
				onImageUpload(reader.result);
			}
		};
		reader.readAsDataURL(file);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFileSelect(e.dataTransfer.files[0]);
		}
	};

	// Получение точки с поддержкой регистра (U1t / U1T, L1a / L1A)
	const getPt = (key: string): PointCoord | undefined => {
		return landmarks[key] || landmarks[key.toLowerCase()] || landmarks[key.toUpperCase()];
	};

	// Ключевые анатомические плоскости (DEF-ORTHO-01)
	const pS = getPt("S");
	const pN = getPt("N");
	const pPo = getPt("Po");
	const pOr = getPt("Or");
	const pBa = getPt("Ba") || getPt("Po");
	const pA = getPt("A");
	const pB = getPt("B");
	const pPog = getPt("Pog");
	const pGn = getPt("Gn") || pPog;
	const pMe = getPt("Me");
	const pGo = getPt("Go");
	const pANS = getPt("ANS");
	const pPNS = getPt("PNS");
	const pPrn = getPt("Prn");
	const pLs = getPt("Ls");
	const pLi = getPt("Li");
	const pPogPrime = getPt("Pog_prime") || getPt("Pog");
	const pU1t = getPt("U1t") || getPt("U1T");
	const pU1a = getPt("U1a") || getPt("U1A");
	const pL1t = getPt("L1t") || getPt("L1T");
	const pL1a = getPt("L1a") || getPt("L1A");

	return (
		<div
			ref={containerRef}
			data-testid="cephalometric-canvas"
			className={`w-full h-full relative select-none overflow-hidden bg-[var(--paper-strong)] flex items-center justify-center ${className || ""}`}
			onDrop={handleDrop}
			onDragOver={(e) => e.preventDefault()}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
		>
			{!imageUrl ? (
				<div
					data-testid="ceph-dropzone"
					onClick={() => fileInputRef.current?.click()}
					className="flex flex-col items-center justify-center p-8 text-center text-[var(--ink-muted)] border-2 border-dashed border-[var(--line)] rounded-2xl hover:border-[var(--primary)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer m-4 max-w-md"
				>
					<UploadCloud className="w-12 h-12 text-[var(--primary)] mb-3 animate-pulse" />
					<p className="text-sm font-bold text-[var(--ink)] mb-1">
						Для проведения цефалометрического анализа требуется реальный рентгеновский снимок
					</p>
					<p className="text-xs text-[var(--ink-muted)]">
						Загрузите или перетащите файл боковой ТРГ (DICOM, TIFF, JPG, PNG)
					</p>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*,.dcm"
						className="hidden"
						onChange={(e) => {
							if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
						}}
					/>
				</div>
			) : (
				<div
					className="relative w-full h-full flex items-center justify-center"
					style={{
						transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
						transformOrigin: "center center",
						transition: isPanning || draggingKey ? "none" : "transform 0.1s ease-out",
					}}
					onClick={handleCanvasClick}
				>
					{/* Изображение рентгенограммы ТРГ */}
					<img
						src={imageUrl}
						alt="Боковая телерентгенограмма (ТРГ)"
						className="max-w-full max-h-full object-contain pointer-events-none"
						style={{ filter: getFilterStyle() }}
						draggable={false}
					/>

					{/* Интерактивный векторный SVG-оверлей плоскостей и ориентиров */}
					<svg
						ref={svgRef}
						viewBox="0 0 800 800"
						className="absolute inset-0 w-full h-full"
						style={{ overflow: "visible", pointerEvents: "auto" }}
					>
						{/* 1. Краниофациальный полигон */}
						{showPolygon && pS && pN && pA && pB && pMe && pGo && (
							<polygon
								points={`${pS.x},${pS.y} ${pN.x},${pN.y} ${pA.x},${pA.y} ${pB.x},${pB.y} ${pPog ? `${pPog.x},${pPog.y} ` : ""}${pGn ? `${pGn.x},${pGn.y} ` : ""}${pMe.x},${pMe.y} ${pGo.x},${pGo.y}`}
								fill="rgba(13, 148, 136, 0.08)"
								stroke="var(--primary)"
								strokeWidth="1.5"
								strokeDasharray="4 3"
							/>
						)}

						{/* 2. Анатомические плоскости (DEF-ORTHO-01) */}
						{showPlanes && (
							<g className="ceph-planes" opacity="0.85">
								{/* Франкфуртская горизонталь FH: Po -> Or (желтая) */}
								{pPo && pOr && (
									<line
										x1={pPo.x} y1={pPo.y} x2={pOr.x} y2={pOr.y}
										stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 2"
									/>
								)}

								{/* Основание черепа SN: S -> N (бирюзовая) */}
								{pS && pN && (
									<line
										x1={pS.x} y1={pS.y} x2={pN.x} y2={pN.y}
										stroke="#38bdf8" strokeWidth="2"
									/>
								)}

								{/* Линия Ba-N (или Po-N) */}
								{pBa && pN && (
									<line
										x1={pBa.x} y1={pBa.y} x2={pN.x} y2={pN.y}
										stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 3"
									/>
								)}

								{/* Линия NA (Steiner SNA) */}
								{pN && pA && (
									<line
										x1={pN.x} y1={pN.y} x2={pA.x} y2={pA.y}
										stroke="#f43f5e" strokeWidth="1.5"
									/>
								)}

								{/* Линия NB (Steiner SNB) */}
								{pN && pB && (
									<line
										x1={pN.x} y1={pN.y} x2={pB.x} y2={pB.y}
										stroke="#f43f5e" strokeWidth="1.5"
									/>
								)}

								{/* Ростовая ось Y-axis: S -> Gn */}
								{pS && pGn && (
									<line
										x1={pS.x} y1={pS.y} x2={pGn.x} y2={pGn.y}
										stroke="#c084fc" strokeWidth="1.5" strokeDasharray="4 2"
									/>
								)}

								{/* Мандибулярная плоскость MP: Go -> Me */}
								{pGo && pMe && (
									<line
										x1={pGo.x} y1={pGo.y} x2={pMe.x} y2={pMe.y}
										stroke="#34d399" strokeWidth="1.8"
									/>
								)}

								{/* Небная плоскость ANS -> PNS */}
								{pANS && pPNS && (
									<line
										x1={pANS.x} y1={pANS.y} x2={pPNS.x} y2={pPNS.y}
										stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="3 2"
									/>
								)}

								{/* Эстетическая линия Риккетса E-line: Prn -> Pog' */}
								{pPrn && pPogPrime && (
									<line
										x1={pPrn.x} y1={pPrn.y} x2={pPogPrime.x} y2={pPogPrime.y}
										stroke="#f43f5e" strokeWidth="1.8" strokeDasharray="5 3"
									/>
								)}

								{/* Ось верхнего резца U1a -> U1t */}
								{pU1a && pU1t && (
									<line
										x1={pU1a.x} y1={pU1a.y} x2={pU1t.x} y2={pU1t.y}
										stroke="#22c55e" strokeWidth="1.8"
									/>
								)}

								{/* Ось нижнего резца L1a -> L1t */}
								{pL1a && pL1t && (
									<line
										x1={pL1a.x} y1={pL1a.y} x2={pL1t.x} y2={pL1t.y}
										stroke="#22c55e" strokeWidth="1.8"
									/>
								)}
							</g>
						)}

						{/* 3. 16 интерактивных анатомических точек с Drag-and-Drop */}
						<g className="ceph-landmarks">
							{Object.entries(landmarks).map(([key, pt]) => {
								if (!pt) return null;
								const isActive = key === activeTargetKey || key === draggingKey;
								const color = LANDMARK_COLORS[key] || "#38bdf8";

								return (
									<g
										key={key}
										transform={`translate(${pt.x}, ${pt.y})`}
										className="cursor-move"
										onPointerDown={(e) => handlePointerDownPoint(e, key)}
										onContextMenu={(e) => {
											e.preventDefault();
											if (onRemoveLandmark) onRemoveLandmark(key);
										}}
									>
										{/* Хитбокс для удобного захвата пальцем / мышью */}
										<circle r="14" fill="transparent" />

										{/* Внешний акцентный ореол активной точки */}
										{isActive && (
											<circle
												r="10"
												fill="none"
												stroke="#2dd4bf"
												strokeWidth="2.5"
												className="animate-ping"
												opacity="0.75"
											/>
										)}

										{/* Основная точка ориентира */}
										<circle
											r={isActive ? 6.5 : 5}
											fill={color}
											stroke="#ffffff"
											strokeWidth="2"
											className="transition-transform hover:scale-125"
										/>

										{/* Подпись точки */}
										{showLabels && (
											<g transform="translate(8, -6)">
												<rect
													x="-2"
													y="-10"
													width={key.length * 8 + 6}
													height="14"
													rx="3"
													fill="rgba(2, 6, 23, 0.85)"
												/>
												<text
													fill="#f8fafc"
													fontSize="10"
													fontWeight="bold"
													fontFamily="system-ui, sans-serif"
												>
													{key}
												</text>
											</g>
										)}
									</g>
								);
							})}
						</g>

						{/* 4. Интерактивная 2-точечная калибровочная линейка (DEF-ORTHO-05) */}
						{isCalibrating && (
							<g className="ceph-calibration-ruler" pointerEvents="auto">
								<line
									x1={calibPoint1.x}
									y1={calibPoint1.y}
									x2={calibPoint2.x}
									y2={calibPoint2.y}
									stroke="#38bdf8"
									strokeWidth="2.5"
									strokeDasharray="6 3"
								/>
								<g transform={`translate(${(calibPoint1.x + calibPoint2.x) / 2}, ${(calibPoint1.y + calibPoint2.y) / 2 - 14})`}>
									<rect
										x="-50"
										y="-10"
										width="100"
										height="20"
										rx="5"
										fill="rgba(15, 23, 42, 0.9)"
										stroke="#38bdf8"
										strokeWidth="1"
									/>
									<text
										fill="#38bdf8"
										fontSize="11"
										fontWeight="bold"
										textAnchor="middle"
										dominantBaseline="central"
										fontFamily="system-ui, monospace"
									>
										{calibDistanceMm} мм ({Math.round(calibPixelDist)} px)
									</text>
								</g>
								{/* Точка 1 */}
								<g
									transform={`translate(${calibPoint1.x}, ${calibPoint1.y})`}
									className="cursor-move"
									onPointerDown={(e) => {
										e.stopPropagation();
										(e.target as Element).setPointerCapture(e.pointerId);
										setDraggingCalib("p1");
									}}
								>
									<circle r="18" fill="transparent" />
									<circle r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
									<line x1="-12" y1="0" x2="12" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
									<line x1="0" y1="-12" x2="0" y2="12" stroke="#38bdf8" strokeWidth="1.5" />
								</g>
								{/* Точка 2 */}
								<g
									transform={`translate(${calibPoint2.x}, ${calibPoint2.y})`}
									className="cursor-move"
									onPointerDown={(e) => {
										e.stopPropagation();
										(e.target as Element).setPointerCapture(e.pointerId);
										setDraggingCalib("p2");
									}}
								>
									<circle r="18" fill="transparent" />
									<circle r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.5" />
									<line x1="-12" y1="0" x2="12" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
									<line x1="0" y1="-12" x2="0" y2="12" stroke="#38bdf8" strokeWidth="1.5" />
								</g>
							</g>
						)}
					</svg>
				</div>
			)}

			{/* Верхняя панель двухточечной калибровки (DEF-ORTHO-05) */}
			{isCalibrating && imageUrl && (
				<div
					data-testid="ceph-calibration-panel"
					className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 p-2 rounded-xl bg-[var(--paper-strong)]/95 border border-[var(--line)] backdrop-blur-md shadow-xl text-xs text-[var(--ink)] max-w-[94vw]"
				>
					<div className="flex items-center gap-1.5 font-medium pl-1">
						<Ruler className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span>Калибровка масштаба:</span>
					</div>
					<div className="flex items-center p-0.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
						<button
							type="button"
							onClick={() => setCalibDistanceMm(10)}
							className={`h-7 px-2.5 rounded-lg font-medium cursor-pointer transition-colors ${
								calibDistanceMm === 10
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							10 мм
						</button>
						<button
							type="button"
							onClick={() => setCalibDistanceMm(50)}
							className={`h-7 px-2.5 rounded-lg font-medium cursor-pointer transition-colors ${
								calibDistanceMm === 50
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							50 мм
						</button>
					</div>
					<div className="font-mono text-[var(--ink-muted)] tabular-nums px-1">
						{calibPixelDist.toFixed(1)} px → <strong className="text-[var(--primary)]">{calculatedScale.toFixed(4)} мм/px</strong>
					</div>
					<div className="flex items-center gap-1.5 ml-auto">
						<button
							type="button"
							onClick={handleApplyCalibration}
							className="h-8 px-3 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] font-medium cursor-pointer transition-colors"
						>
							Применить
						</button>
						<button
							type="button"
							onClick={() => setIsCalibrating(false)}
							className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
						>
							Отмена
						</button>
					</div>
				</div>
			)}

			{/* Тулбар управления масштабом ТРГ (Apple HIG тач-таргеты >= 44x44px) */}
			{imageUrl && (
				<div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-[var(--paper-strong)]/90 border border-[var(--line)] backdrop-blur-md shadow-lg">
					<button
						type="button"
						onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
						className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						title="Увеличить снимок"
						aria-label="Увеличить снимок"
					>
						<ZoomIn size={18} />
					</button>
					<button
						type="button"
						onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
						className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						title="Уменьшить снимок"
						aria-label="Уменьшить снимок"
					>
						<ZoomOut size={18} />
					</button>
					<button
						type="button"
						onClick={() => {
							setZoom(1);
							setPan({ x: 0, y: 0 });
						}}
						className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						title="Сбросить зум и панорамирование"
						aria-label="Сбросить зум и панорамирование"
					>
						<RotateCcw size={18} />
					</button>
					<button
						type="button"
						data-testid="ceph-calibration-toggle"
						onClick={() => setIsCalibrating((prev) => !prev)}
						className={`min-h-[44px] px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
							isCalibrating
								? "bg-[var(--primary)] text-white shadow-xs"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
						title="Интерактивная двухточечная калибровка линейки (10/50 мм)"
						aria-label="Калибровка линейки"
					>
						<Ruler size={16} />
						<span className="hidden sm:inline">Линейка {scaleMmPerPixel ? `(${scaleMmPerPixel.toFixed(3)} мм/px)` : ""}</span>
					</button>
					<span className="text-xs font-mono text-[var(--primary)] px-2 font-bold tabular-nums">
						{Math.round(zoom * 100)}%
					</span>
				</div>
			)}

			{children}
		</div>
	);
};

export default CephalometricCanvas;