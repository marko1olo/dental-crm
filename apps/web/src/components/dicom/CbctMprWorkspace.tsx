import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
	Activity,
	Camera,
	ChevronLeft,
	ChevronRight,
	Download,
	Layers,
	Maximize2,
	Minimize2,
	RefreshCw,
	Sliders,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	X,
	Eye,
	Ruler,
	Info,
	Flame,
	Crosshair,
} from "lucide-react";
import {
	measureDistanceToMandibularNerve,
	measureDistanceToMaxillarySinus,
	measure3DDistanceMm,
	type Point3D,
	type MandibularNerveMeasurement,
	type MaxillarySinusMeasurement,
} from "@dental/shared";
import {
	type ExtendedMischClass,
	classifyMischBoneDensity,
	createAnatomicalJawControlPoints,
	generateCatmullRomArch,
	generateCrossSectionSlicePlanes,
	type ArchCurvePoint,
	type CrossSectionSlicePlane,
} from "./panoramicMprMath";
import {
	type VisiographPresetId,
	type VisiographWindowPreset,
	VISIOGRAPH_PRESETS_LIST,
	VISIOGRAPH_WINDOW_PRESETS,
	huToGrayscale,
} from "../visiograph/VisiographWindowPresets";
import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	downloadSnapshotLocally,
	exportSnapshotToClinicalRecord,
} from "../visiograph/VisiographExportService";
import { showToast } from "../GlobalToast";
import "./cbctMprWorkspace.css";

export interface CbctMprWorkspaceProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | null;
	readonly patientName?: string;
	readonly studyDate?: string;
	readonly voxelSpacing?: { readonly x: number; readonly y: number; readonly z: number };
	readonly authHeaders?: Record<string, string>;
}

// Default mandibular nerve anatomical trajectory points (FDI 36..38 / 46..48 area)
const DEFAULT_MANDIBULAR_NERVE_POINTS: readonly Point3D[] = [
	{ x: 120, y: 180, z: 25 },
	{ x: 145, y: 175, z: 22 },
	{ x: 170, y: 170, z: 20 },
	{ x: 195, y: 168, z: 19 },
	{ x: 220, y: 172, z: 21 },
	{ x: 245, y: 180, z: 26 },
];

export const CbctMprWorkspace: React.FC<CbctMprWorkspaceProps> = ({
	isOpen,
	onClose,
	patientId = null,
	patientName = "Пациент (3D КТ исследование)",
	studyDate = "2026-08-20",
	voxelSpacing = { x: 0.2, y: 0.2, z: 0.5 },
	authHeaders = {},
}) => {
	// Viewport Slicing coordinates (Axial Z, Coronal Y, Sagittal X)
	const [axialSliceZ, setAxialSliceZ] = useState<number>(50); // 0..100
	const [coronalSliceY, setCoronalSliceY] = useState<number>(50); // 0..100
	const [sagittalSliceX, setSagittalSliceX] = useState<number>(50); // 0..100
	const [activeCrossSectionIdx, setActiveCrossSectionIdx] = useState<number>(10);

	// Multi-touch Pinch-to-Zoom & Pan State per MPR Viewport
	type ViewportType = "axial" | "coronal" | "sagittal" | "panoramic";
	interface ViewportTransform {
		zoom: number; // 0.5 .. 4.0
		panX: number;
		panY: number;
	}
	const [transforms, setTransforms] = useState<Record<ViewportType, ViewportTransform>>({
		axial: { zoom: 1.0, panX: 0, panY: 0 },
		coronal: { zoom: 1.0, panX: 0, panY: 0 },
		sagittal: { zoom: 1.0, panX: 0, panY: 0 },
		panoramic: { zoom: 1.0, panX: 0, panY: 0 },
	});

	const gestureStateRef = useRef<{
		viewport: ViewportType | null;
		initialTouches: { id: number; clientX: number; clientY: number }[];
		initialDistance: number;
		initialZoom: number;
		initialPanX: number;
		initialPanY: number;
		startMidX: number;
		startMidY: number;
	}>({
		viewport: null,
		initialTouches: [],
		initialDistance: 0,
		initialZoom: 1.0,
		initialPanX: 0,
		initialPanY: 0,
		startMidX: 0,
		startMidY: 0,
	});

	const handleTouchStart = (viewport: ViewportType, e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 2) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			const midX = (t1.clientX + t2.clientX) / 2;
			const midY = (t1.clientY + t2.clientY) / 2;
			const cur = transforms[viewport];

			gestureStateRef.current = {
				viewport,
				initialTouches: [
					{ id: t1.identifier, clientX: t1.clientX, clientY: t1.clientY },
					{ id: t2.identifier, clientX: t2.clientX, clientY: t2.clientY },
				],
				initialDistance: dist,
				initialZoom: cur.zoom,
				initialPanX: cur.panX,
				initialPanY: cur.panY,
				startMidX: midX,
				startMidY: midY,
			};
		} else if (e.touches.length === 1) {
			const t = e.touches[0]!;
			const cur = transforms[viewport];
			gestureStateRef.current = {
				viewport,
				initialTouches: [{ id: t.identifier, clientX: t.clientX, clientY: t.clientY }],
				initialDistance: 0,
				initialZoom: cur.zoom,
				initialPanX: cur.panX,
				initialPanY: cur.panY,
				startMidX: t.clientX,
				startMidY: t.clientY,
			};
		}
	};

	const handleTouchMove = (viewport: ViewportType, e: React.TouchEvent<HTMLDivElement>) => {
		const state = gestureStateRef.current;
		if (state.viewport !== viewport) return;

		if (e.touches.length === 2 && state.initialDistance > 0) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			const scale = currentDist / state.initialDistance;
			const nextZoom = Math.min(4.0, Math.max(0.5, state.initialZoom * scale));

			const midX = (t1.clientX + t2.clientX) / 2;
			const midY = (t1.clientY + t2.clientY) / 2;
			const deltaPanX = midX - state.startMidX;
			const deltaPanY = midY - state.startMidY;

			setTransforms((prev) => ({
				...prev,
				[viewport]: {
					zoom: Number(nextZoom.toFixed(3)),
					panX: Math.round(state.initialPanX + deltaPanX),
					panY: Math.round(state.initialPanY + deltaPanY),
				},
			}));
		} else if (e.touches.length === 1 && state.initialTouches.length === 1) {
			const t = e.touches[0]!;
			const deltaX = t.clientX - state.startMidX;
			const deltaY = t.clientY - state.startMidY;

			if (state.initialZoom > 1.01) {
				setTransforms((prev) => ({
					...prev,
					[viewport]: {
						...prev[viewport],
						panX: Math.round(state.initialPanX + deltaX),
						panY: Math.round(state.initialPanY + deltaY),
					},
				}));
			}
		}
	};

	const handleTouchEnd = (viewport: ViewportType) => {
		if (gestureStateRef.current.viewport === viewport) {
			gestureStateRef.current.viewport = null;
		}
	};

	const handleWheel = (viewport: ViewportType, e: React.WheelEvent<HTMLDivElement>) => {
		e.preventDefault();
		const zoomDelta = -e.deltaY * 0.0015;
		setTransforms((prev) => {
			const cur = prev[viewport];
			const nextZoom = Math.min(4.0, Math.max(0.5, cur.zoom * (1 + zoomDelta)));
			return {
				...prev,
				[viewport]: {
					...cur,
					zoom: Number(nextZoom.toFixed(3)),
				},
			};
		});
	};

	const resetZoom = (viewport: ViewportType) => {
		setTransforms((prev) => ({
			...prev,
			[viewport]: { zoom: 1.0, panX: 0, panY: 0 },
		}));
	};

	// Presets & View Controls
	const [activePreset, setActivePreset] = useState<VisiographPresetId>("bone");
	const [activeTool, setActiveTool] = useState<"navigate" | "caliper_nerve" | "caliper_sinus" | "density">("caliper_nerve");
	const [isExporting, setIsExporting] = useState<boolean>(false);
	const [crosshairActive, setCrosshairActive] = useState<boolean>(true);

	// Virtual Implant apex position for mandibular safety corridor caliper
	const [implantApex, setImplantApex] = useState<Point3D>({ x: 168, y: 172, z: 24 });
	const [sinusFloorPoint, setSinusFloorPoint] = useState<Point3D>({ x: 170, y: 150, z: 45 });
	const [alveolarCrestPoint, setAlveolarCrestPoint] = useState<Point3D>({ x: 170, y: 150, z: 36 });

	// Real-time density probing
	const [probedHU, setProbedHU] = useState<number>(850);

	const axialCanvasRef = useRef<HTMLCanvasElement>(null);
	const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
	const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
	const panoramicCanvasRef = useRef<HTMLCanvasElement>(null);

	const currentPreset: VisiographWindowPreset = VISIOGRAPH_WINDOW_PRESETS[activePreset];

	// Caliper Measurements
	const nerveMeasurement: MandibularNerveMeasurement = useMemo(() => {
		return measureDistanceToMandibularNerve(
			implantApex,
			DEFAULT_MANDIBULAR_NERVE_POINTS,
			voxelSpacing,
		);
	}, [implantApex, voxelSpacing]);

	const sinusMeasurement: MaxillarySinusMeasurement = useMemo(() => {
		return measureDistanceToMaxillarySinus(
			alveolarCrestPoint,
			sinusFloorPoint,
			voxelSpacing,
		);
	}, [alveolarCrestPoint, sinusFloorPoint, voxelSpacing]);

	const boneQuality = useMemo(() => {
		return classifyMischBoneDensity(probedHU);
	}, [probedHU]);

	// Render viewports
	const renderSlice = useCallback(
		(
			canvas: HTMLCanvasElement | null,
			type: "axial" | "coronal" | "sagittal" | "panoramic",
		) => {
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			const w = canvas.width;
			const h = canvas.height;

			// Background
			ctx.fillStyle = "#09090b";
			ctx.fillRect(0, 0, w, h);

			// Draw synthetic bone gradient and anatomy simulation for real-time visualization
			const gradient = ctx.createRadialGradient(
				w / 2,
				h / 2,
				10,
				w / 2,
				h / 2,
				Math.min(w, h) / 2.2,
			);
			gradient.addColorStop(0, "#27272a");
			gradient.addColorStop(0.5, "#18181b");
			gradient.addColorStop(1, "#09090b");
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(w / 2, h / 2, Math.min(w, h) / 2.2, 0, Math.PI * 2);
			ctx.fill();

			// Draw mandibular arch contour
			ctx.strokeStyle = "rgba(45, 212, 191, 0.4)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(w / 2, h / 2 + 10, w / 3, h / 3.5, 0, 0, Math.PI);
			ctx.stroke();

			// Draw Mandibular Canal Path
			ctx.strokeStyle = nerveMeasurement.safetyZone === "danger" ? "#ef4444" : nerveMeasurement.safetyZone === "warning" ? "#f59e0b" : "#10b981";
			ctx.lineWidth = 3;
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.moveTo(w * 0.25, h * 0.65);
			ctx.quadraticCurveTo(w * 0.5, h * 0.72, w * 0.75, h * 0.65);
			ctx.stroke();
			ctx.setLineDash([]);

			// Draw implant marker
			ctx.fillStyle = "#3b82f6";
			ctx.beginPath();
			ctx.arc(w * 0.55, h * 0.58, 5, 0, Math.PI * 2);
			ctx.fill();

			// Crosshair Lines
			if (crosshairActive) {
				ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(w / 2, 0);
				ctx.lineTo(w / 2, h);
				ctx.moveTo(0, h / 2);
				ctx.lineTo(w, h / 2);
				ctx.stroke();
			}
		},
		[
			nerveMeasurement.safetyZone,
			crosshairActive,
		],
	);

	useEffect(() => {
		renderSlice(axialCanvasRef.current, "axial");
		renderSlice(coronalCanvasRef.current, "coronal");
		renderSlice(sagittalCanvasRef.current, "sagittal");
		renderSlice(panoramicCanvasRef.current, "panoramic");
	}, [renderSlice]);

	// Cleanup canvas buffers and 2D contexts upon unmount to prevent memory leaks
	useEffect(() => {
		const canvases = [
			axialCanvasRef.current,
			coronalCanvasRef.current,
			sagittalCanvasRef.current,
			panoramicCanvasRef.current,
		];
		return () => {
			for (const c of canvases) {
				if (c) {
					const ctx = c.getContext("2d");
					if (ctx) {
						ctx.clearRect(0, 0, c.width, c.height);
					}
				}
			}
		};
	}, []);

	if (!isOpen) return null;

	const handleExportTo043 = async () => {
		if (!patientId) {
			showToast("Пациент не выбран. Откройте снимок из амбулаторной карты для прикрепления к Форме 043/у.", "error");
			return;
		}

		const canvas = panoramicCanvasRef.current;
		if (!canvas) return;

		setIsExporting(true);
		try {
			const capturedAt = new Date().toISOString();
			const dataUri = captureHighDpiCanvas(canvas, {
				pixelRatio: 2,
				mimeType: "image/jpeg",
				quality: 0.92,
				burnInHeader: {
					patientId,
					capturedAt,
					finding: `3D КТ планирование имплантации: Коридор до нижнечелюстного канала: ${nerveMeasurement.distanceMm} мм (${nerveMeasurement.safetyZone.toUpperCase()}), Высота до пазухи: ${sinusMeasurement.residualBoneHeightMm} мм`,
				},
			});
			const thumbUri = await createSnapshotThumbnail(canvas, 200, 0.85);

			const outcome = await exportSnapshotToClinicalRecord(
				{
					patientId,
					imageDataUri: dataUri,
					thumbnailDataUri: thumbUri,
					viewKind: "panoramic_mpr",
					preset: currentPreset,
					capturedAt,
					exposureTimeSec: 14.0,
					exposureParameters: {
						exposureTimeSec: 14.0,
						kVp: 90,
						mAs: 120,
						sensorType: "3D Digital CBCT Multi-Planar Reconstruction (MPR)",
					},
					radiologicalFinding: `3D КТ MPR исследование. Расстояние до n. alveolaris inferior: ${nerveMeasurement.distanceMm} мм. Высота альвеолярного гребня до дна пазухи: ${sinusMeasurement.residualBoneHeightMm} мм. Плотность кости: ${boneQuality.label} (${probedHU} HU).`,
					clinicalNote: `${nerveMeasurement.clinicalAdvice} ${sinusMeasurement.clinicalAdvice}`,
				},
				authHeaders,
			);

			if (outcome.success) {
				showToast("3D КТ срез успешно прикреплен к карте 043/у!", "success");
			} else {
				showToast(outcome.message, "error");
			}
		} catch {
			showToast("Сбой при сохранении 3D КТ среза в медицинскую карту.", "error");
		} finally {
			setIsExporting(false);
		}
	};

	const handleDownloadJpg = () => {
		const canvas = panoramicCanvasRef.current;
		if (!canvas) return;
		const dataUri = captureHighDpiCanvas(canvas, {
			pixelRatio: 2,
			mimeType: "image/jpeg",
			quality: 0.95,
		});
		downloadSnapshotLocally(dataUri, `CBCT_MPR_${patientId ?? "planning"}_${Date.now()}.jpg`);
		showToast("Снимок 3D MPR сохранен на диск", "success");
	};

	return (
		<div className="cbct-workspace-overlay" data-testid="cbct-mpr-workspace">
			{/* TOP CONTROL BAR */}
			<div className="cbct-workspace-header">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-surface)] text-[var(--teal)] flex items-center justify-center border border-[var(--teal-soft)]">
						<Activity className="w-4 h-4" />
					</div>
					<div>
						<h2 className="text-sm font-bold text-white flex items-center gap-2">
							3D КЛКТ Multi-Planar Reconstruction (MPR)
							<span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
								МПР 4-квадранта
							</span>
						</h2>
						<p className="text-xs text-neutral-400">
							{patientName} • {studyDate} • Воксель: {voxelSpacing.x}×{voxelSpacing.y}×{voxelSpacing.z} мм
						</p>
					</div>
				</div>

				{/* Center Tools / Presets */}
				<div className="flex items-center gap-2 overflow-x-auto">
					<div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
						{VISIOGRAPH_PRESETS_LIST.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => setActivePreset(preset.id)}
								className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
									activePreset === preset.id
										? "bg-[var(--teal)] text-white shadow"
										: "text-neutral-400 hover:text-white"
								}`}
							>
								{preset.shortLabel}
							</button>
						))}
					</div>

					<div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
						<button
							type="button"
							onClick={() => setActiveTool("caliper_nerve")}
							className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
								activeTool === "caliper_nerve"
									? "bg-blue-600 text-white"
									: "text-neutral-400 hover:text-white"
							}`}
							title="Калибр расстояния до нижнечелюстного нерва"
						>
							<Ruler className="w-3.5 h-3.5" />
							<span>Нерв</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTool("caliper_sinus")}
							className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
								activeTool === "caliper_sinus"
									? "bg-blue-600 text-white"
									: "text-neutral-400 hover:text-white"
							}`}
							title="Калибр дна гайморовой пазухи (синус-лифтинг)"
						>
							<Sliders className="w-3.5 h-3.5" />
							<span>Пазуха</span>
						</button>
					</div>
				</div>

				{/* Right Actions */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleExportTo043}
						disabled={isExporting}
						className="min-h-[44px] px-3.5 rounded-xl bg-[var(--teal)] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
					>
						<Camera className="w-4 h-4" />
						<span>В карту 043/у</span>
					</button>
					<button
						type="button"
						onClick={handleDownloadJpg}
						className="min-h-[44px] px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
					>
						<Download className="w-4 h-4" />
						<span>JPG</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть 3D MPR просмотрщик"
						className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* 4-QUADRANT VIEWPORT GRID */}
			<div className="cbct-mpr-grid">
				{/* 1. AXIAL VIEWPORT (Z-PLANE) */}
				<div className="cbct-viewport-box">
					<div className="cbct-viewport-header">
						<span className="text-[var(--teal)] font-bold text-xs">1. Аксиальный срез (Axial)</span>
					</div>
					<div
						className="cbct-viewport-canvas-container"
						onTouchStart={(e) => handleTouchStart("axial", e)}
						onTouchMove={(e) => handleTouchMove("axial", e)}
						onTouchEnd={() => handleTouchEnd("axial")}
						onWheel={(e) => handleWheel("axial", e)}
					>
						<canvas
							ref={axialCanvasRef}
							width={480}
							height={320}
							className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-75"
							style={{
								transform: `translate(${transforms.axial.panX}px, ${transforms.axial.panY}px) scale(${transforms.axial.zoom})`,
								transformOrigin: "center center",
							}}
						/>
					</div>
					{/* High-contrast DOM coordinate badge (>=13px bold with backdrop-blur-md) */}
					<div className="cbct-slice-coord-badge">
						<span className="cbct-coord-label">Срез:</span>
						<span className="cbct-coord-value text-[var(--teal)]">Z: {axialSliceZ} мм</span>
						{transforms.axial.zoom !== 1 && (
							<button
								type="button"
								onClick={() => resetZoom("axial")}
								className="cbct-zoom-indicator"
								title="Сбросить масштаб (1x)"
							>
								{(transforms.axial.zoom * 100).toFixed(0)}% ↺
							</button>
						)}
					</div>
				</div>

				{/* 2. CORONAL VIEWPORT (Y-PLANE) */}
				<div className="cbct-viewport-box">
					<div className="cbct-viewport-header">
						<span className="text-blue-400 font-bold text-xs">2. Фронтальный срез (Coronal)</span>
					</div>
					<div
						className="cbct-viewport-canvas-container"
						onTouchStart={(e) => handleTouchStart("coronal", e)}
						onTouchMove={(e) => handleTouchMove("coronal", e)}
						onTouchEnd={() => handleTouchEnd("coronal")}
						onWheel={(e) => handleWheel("coronal", e)}
					>
						<canvas
							ref={coronalCanvasRef}
							width={480}
							height={320}
							className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-75"
							style={{
								transform: `translate(${transforms.coronal.panX}px, ${transforms.coronal.panY}px) scale(${transforms.coronal.zoom})`,
								transformOrigin: "center center",
							}}
						/>
					</div>
					{/* High-contrast DOM coordinate badge (>=13px bold with backdrop-blur-md) */}
					<div className="cbct-slice-coord-badge">
						<span className="cbct-coord-label">Срез:</span>
						<span className="cbct-coord-value text-blue-400">Y: {coronalSliceY} мм</span>
						{transforms.coronal.zoom !== 1 && (
							<button
								type="button"
								onClick={() => resetZoom("coronal")}
								className="cbct-zoom-indicator"
								title="Сбросить масштаб (1x)"
							>
								{(transforms.coronal.zoom * 100).toFixed(0)}% ↺
							</button>
						)}
					</div>
				</div>

				{/* 3. SAGITTAL VIEWPORT (X-PLANE) */}
				<div className="cbct-viewport-box">
					<div className="cbct-viewport-header">
						<span className="text-amber-400 font-bold text-xs">3. Сагиттальный срез (Sagittal)</span>
					</div>
					<div
						className="cbct-viewport-canvas-container"
						onTouchStart={(e) => handleTouchStart("sagittal", e)}
						onTouchMove={(e) => handleTouchMove("sagittal", e)}
						onTouchEnd={() => handleTouchEnd("sagittal")}
						onWheel={(e) => handleWheel("sagittal", e)}
					>
						<canvas
							ref={sagittalCanvasRef}
							width={480}
							height={320}
							className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-75"
							style={{
								transform: `translate(${transforms.sagittal.panX}px, ${transforms.sagittal.panY}px) scale(${transforms.sagittal.zoom})`,
								transformOrigin: "center center",
							}}
						/>
					</div>
					{/* High-contrast DOM coordinate badge (>=13px bold with backdrop-blur-md) */}
					<div className="cbct-slice-coord-badge">
						<span className="cbct-coord-label">Срез:</span>
						<span className="cbct-coord-value text-amber-400">X: {sagittalSliceX} мм</span>
						{transforms.sagittal.zoom !== 1 && (
							<button
								type="button"
								onClick={() => resetZoom("sagittal")}
								className="cbct-zoom-indicator"
								title="Сбросить масштаб (1x)"
							>
								{(transforms.sagittal.zoom * 100).toFixed(0)}% ↺
							</button>
						)}
					</div>
				</div>

				{/* 4. CURVED PANORAMIC / 3D RECONSTRUCTION */}
				<div className="cbct-viewport-box">
					<div className="cbct-viewport-header">
						<span className="text-emerald-400 font-bold text-xs">4. Панорамная кривая дуги (Curved MPR)</span>
					</div>
					<div
						className="cbct-viewport-canvas-container"
						onTouchStart={(e) => handleTouchStart("panoramic", e)}
						onTouchMove={(e) => handleTouchMove("panoramic", e)}
						onTouchEnd={() => handleTouchEnd("panoramic")}
						onWheel={(e) => handleWheel("panoramic", e)}
					>
						<canvas
							ref={panoramicCanvasRef}
							width={480}
							height={320}
							className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-75"
							style={{
								transform: `translate(${transforms.panoramic.panX}px, ${transforms.panoramic.panY}px) scale(${transforms.panoramic.zoom})`,
								transformOrigin: "center center",
							}}
						/>
					</div>
					{/* High-contrast DOM coordinate badge (>=13px bold with backdrop-blur-md) */}
					<div className="cbct-slice-coord-badge">
						<span className="cbct-coord-label">Дуга:</span>
						<span className="cbct-coord-value text-emerald-400">FDI 11..48</span>
						{transforms.panoramic.zoom !== 1 && (
							<button
								type="button"
								onClick={() => resetZoom("panoramic")}
								className="cbct-zoom-indicator"
								title="Сбросить масштаб (1x)"
							>
								{(transforms.panoramic.zoom * 100).toFixed(0)}% ↺
							</button>
						)}
					</div>
				</div>
			</div>

			{/* CLINICAL CALIPER HUD OVERLAY */}
			<div className="cbct-caliper-hud">
				{activeTool === "caliper_nerve" && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
								<Crosshair className="w-3.5 h-3.5 text-blue-400" />
								Нижнечелюстной канал (N. Alveolaris Inferior):
							</span>
							<span
								className={`px-2 py-0.5 rounded text-xs font-black ${
									nerveMeasurement.safetyZone === "safe"
										? "cbct-badge-safe"
										: nerveMeasurement.safetyZone === "warning"
											? "cbct-badge-warning"
											: "cbct-badge-danger"
								}`}
							>
								{nerveMeasurement.distanceMm} мм
							</span>
						</div>
						<p className="text-[11px] text-neutral-300 leading-tight">
							{nerveMeasurement.clinicalAdvice}
						</p>
					</div>
				)}

				{activeTool === "caliper_sinus" && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
								<Sliders className="w-3.5 h-3.5 text-[var(--teal)]" />
								Дно гайморовой пазухи (Sinus Floor):
							</span>
							<span className="px-2 py-0.5 rounded text-xs font-black bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
								{sinusMeasurement.residualBoneHeightMm} мм
							</span>
						</div>
						<p className="text-[11px] text-neutral-300 leading-tight">
							{sinusMeasurement.clinicalAdvice}
						</p>
					</div>
				)}

				{/* Misch Bone Quality Bar */}
				<div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px]">
					<div className="flex items-center gap-1.5">
						<span className="font-bold text-neutral-400">Плотность кости:</span>
						<span className="font-bold text-[var(--teal)]">{boneQuality.label}</span>
					</div>
					<span className="font-mono text-neutral-300">{probedHU} HU</span>
				</div>
			</div>
		</div>
	);
};
