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

			// Slice Coordinate Annotation
			ctx.fillStyle = "#a1a1aa";
			ctx.font = "11px Inter, system-ui, sans-serif";
			if (type === "axial") ctx.fillText(`Z: ${axialSliceZ} мм`, 12, h - 12);
			if (type === "coronal") ctx.fillText(`Y: ${coronalSliceY} мм`, 12, h - 12);
			if (type === "sagittal") ctx.fillText(`X: ${sagittalSliceX} мм`, 12, h - 12);
			if (type === "panoramic") ctx.fillText("Curved 3D Panorama (FDI 11..48)", 12, h - 12);
		},
		[
			axialSliceZ,
			coronalSliceY,
			sagittalSliceX,
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
					<div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/40">
						<Activity className="w-4 h-4" />
					</div>
					<div>
						<h2 className="text-sm font-bold text-white flex items-center gap-2">
							3D КЛКТ Multi-Planar Reconstruction (MPR)
							<span className="text-[11px] font-medium px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
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
										? "bg-teal-600 text-white shadow"
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
						className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
					>
						<Camera className="w-3.5 h-3.5" />
						<span>В карту 043/у</span>
					</button>
					<button
						type="button"
						onClick={handleDownloadJpg}
						className="h-8 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
					>
						<Download className="w-3.5 h-3.5" />
						<span>JPG</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть 3D MPR просмотрщик"
						className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* 4-QUADRANT VIEWPORT GRID */}
			<div className="cbct-mpr-grid">
				{/* 1. AXIAL VIEWPORT (Z-PLANE) */}
				<div className="cbct-viewport-box">
					<div className="cbct-viewport-header">
						<span className="text-teal-400">1. Аксиальный срез (Axial)</span>
						<span className="text-neutral-400">Z: {axialSliceZ} мм</span>
					</div>
					<div className="cbct-viewport-canvas-container">
						<canvas ref={axialCanvasRef} width={480} height={320} className="w-full h-full object-contain" />
					</div>
				</div>

				{/* 2. CORONAL VIEWPORT (Y-PLANE) */}
				<div className="cbct-viewport-box">
					<div className="cbct-viewport-header">
						<span className="text-blue-400">2. Фронтальный срез (Coronal)</span>
						<span className="text-neutral-400">Y: {coronalSliceY} мм</span>
					</div>
					<div className="cbct-viewport-canvas-container">
						<canvas ref={coronalCanvasRef} width={480} height={320} className="w-full h-full object-contain" />
					</div>
				</div>

				{/* 3. SAGITTAL VIEWPORT (X-PLANE) */}
				<div className="cbct-viewport-box">
					<div className="cbct-viewport-header">
						<span className="text-amber-400">3. Сагиттальный срез (Sagittal)</span>
						<span className="text-neutral-400">X: {sagittalSliceX} мм</span>
					</div>
					<div className="cbct-viewport-canvas-container">
						<canvas ref={sagittalCanvasRef} width={480} height={320} className="w-full h-full object-contain" />
					</div>
				</div>

				{/* 4. CURVED PANORAMIC / 3D RECONSTRUCTION */}
				<div className="cbct-viewport-box">
					<div className="cbct-viewport-header">
						<span className="text-emerald-400">4. Панорамная кривая дуги (Curved MPR)</span>
						<span className="text-neutral-400">FDI 11..48</span>
					</div>
					<div className="cbct-viewport-canvas-container">
						<canvas ref={panoramicCanvasRef} width={480} height={320} className="w-full h-full object-contain" />
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
								<Sliders className="w-3.5 h-3.5 text-teal-400" />
								Дно гайморовой пазухи (Sinus Floor):
							</span>
							<span className="px-2 py-0.5 rounded text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">
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
						<span className="font-bold text-teal-400">{boneQuality.label}</span>
					</div>
					<span className="font-mono text-neutral-300">{probedHU} HU</span>
				</div>
			</div>
		</div>
	);
};
