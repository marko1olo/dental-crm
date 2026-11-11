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
import { UploadCloud, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export type XrayFilterMode = "normal" | "invert" | "contrast" | "bone_enhance";
export const SAMPLE_TRG_CEPHALOGRAM_URL = "/radiology/sample_trg_cephalogram.jpg";

export interface PointCoord {
	x: number;
	y: number;
}

export interface CephalometricCanvasProps {
	readonly imageUrl?: string | null;
	readonly landmarks?: Record<string, PointCoord>;
	readonly onLandmarkChange?: (id: string, pt: PointCoord) => void;
	readonly onRemoveLandmark?: (id: string) => void;
	readonly activeTargetKey?: string | null;
	readonly onSelectTargetKey?: (key: string | null) => void;
	readonly onImageUpload?: (url: string) => void;
	readonly filterMode?: XrayFilterMode;
	readonly onFilterModeChange?: (mode: XrayFilterMode) => void;
	readonly brightness?: number;
	readonly contrast?: number;
	readonly showPolygon?: boolean;
	readonly onTogglePolygon?: () => void;
	readonly showPlanes?: boolean;
	readonly onTogglePlanes?: () => void;
	readonly showLabels?: boolean;
	readonly onToggleLabels?: () => void;
	readonly scaleMmPerPixel?: number;
	readonly onScaleChange?: (scale: number) => void;
	readonly onLoadPreset?: () => void;
	readonly onResetLandmarks?: () => void;
	readonly onRunAiAutoPlacement?: () => void;
	readonly isAiInferring?: boolean;
	readonly aiBackendBadge?: string;
	readonly aiBackendLabel?: string;
	readonly aiBackendPref?: string;
	readonly onChangeAiBackendPref?: (pref: string) => void;
	readonly aiInferenceStats?: unknown;
	readonly children?: React.ReactNode;
	readonly className?: string;
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
	Pt: "#38bdf8",
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
		if (draggingKey || isPanning) return;
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
	const pU1t = getPt("U1t") || getPt("U1T");
	const pU1a = getPt("U1a") || getPt("U1A");
	const pL1t = getPt("L1t") || getPt("L1T");
	const pL1a = getPt("L1a") || getPt("L1A");

	return (
		<div
			ref={containerRef}
			data-testid="cephalometric-canvas"
			className={`w-full h-full relative select-none overflow-hidden bg-slate-950 flex items-center justify-center ${className || ""}`}
			style={{ backgroundColor: "#020617" }}
			onDrop={handleDrop}
			onDragOver={(e) => e.preventDefault()}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
		>
			{!imageUrl ? (
				<div
					data-testid="ceph-dropzone"
					onClick={() => fileInputRef.current?.click()}
					className="flex flex-col items-center justify-center p-8 text-center text-slate-300 border-2 border-dashed border-teal-500/40 rounded-2xl hover:border-teal-400 hover:bg-teal-950/20 transition-all cursor-pointer m-4 max-w-md"
				>
					<UploadCloud className="w-12 h-12 text-teal-400 mb-3 animate-pulse" />
					<p className="text-sm font-bold text-white mb-1">
						Для проведения цефалометрического анализа требуется реальный рентгеновский снимок
					</p>
					<p className="text-xs text-slate-400">
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
								stroke="#0d9488"
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
					</svg>
				</div>
			)}

			{/* Тулбар управления масштабом ТРГ */}
			{imageUrl && (
				<div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg">
					<button
						type="button"
						onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
						className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
						title="Увеличить снимок"
					>
						<ZoomIn size={16} />
					</button>
					<button
						type="button"
						onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
						className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
						title="Уменьшить снимок"
					>
						<ZoomOut size={16} />
					</button>
					<button
						type="button"
						onClick={() => {
							setZoom(1);
							setPan({ x: 0, y: 0 });
						}}
						className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
						title="Сбросить зум и панорамирование"
					>
						<RotateCcw size={16} />
					</button>
					<span className="text-[11px] font-mono text-teal-300 px-1.5 font-bold">
						{Math.round(zoom * 100)}%
					</span>
				</div>
			)}

			{children}
		</div>
	);
};

export default CephalometricCanvas;