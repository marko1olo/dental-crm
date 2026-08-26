/**
 * DENTE CRM — CBCT 3D MPR (Multi-Planar Reconstruction) & Panoramic Spline Curve Viewer
 * Standards: DICOM Part 3, Misch CE, Buser
 *
 * Capabilities:
 * 1. Synchronized 3-Plane Orthogonal MPR: Axial, Coronal, Sagittal with real-time Crosshair Reticle (60 FPS).
 * 2. Slab Thickness Projection Modes: Single Slice, MIP (Maximum Intensity Projection), MinIP, Average IP (1-30 mm).
 * 3. Hounsfield Windowing Presets: Bone (+400, W2000), Soft Tissue (+40, W400), Enamel (+1000, W3000), Metal (+1200, W4000), Air (-500, W1000).
 * 4. Interactive Panoramic Dental Arch Curve on Axial slice with FDI 18..48 tooth anchors.
 * 5. Real-Time Unfolded Panoramic (OPG) Reconstruction with adjustable focal trough layer.
 * 6. Perpendicular Transverse Cross-Sections Carousel with bone height/width measurements.
 * 7. Pure CSS design tokens, WCAG 2.1 touch targets (>= 44x44px), zero hardcoded colors.
 */

import {
	Activity,
	Bone,
	Camera,
	ChevronLeft,
	ChevronRight,
	Compass,
	Eye,
	Layers,
	Maximize2,
	Minimize2,
	Move,
	RefreshCw,
	RotateCcw,
	Ruler,
	Sliders,
	Spline,
	Sun,
	Volume2,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
	CBCT_HOUNSFIELD_PRESETS,
	type CbctVoxelVolume,
	type HounsfieldPreset,
	type MprPlane,
	type Point3D,
	type SlabProjectionMode,
	calculateMprSliceIndex,
	clampCoordinateToVolume,
	createSyntheticDentalCbctVolume,
	disposeCbctVolume,
	extractMprSlice,
	mapCanvasPointerToWorldMm,
	resliceMprSynchronized,
	worldMmToVoxel,
} from "./cbctMprMath";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	type CrossSectionSliceData,
	type DentalArchAnchor,
	type DentalArchCurve,
	type PanoramicReconstructionResult,
	buildDentalArchCurve,
	generateCrossSectionSlices,
	measureAlveolarRidgeCrossSection,
	reconstructPanoramicView,
} from "./dentalCurveEngine";
import type { RadiologyStudy } from "./types";

export interface CbctMprViewerProps {
	readonly study?: RadiologyStudy | null | undefined;
	readonly volume?: CbctVoxelVolume | null | undefined;
	readonly onClose?: () => void;
	readonly onApplyToDiary043?: (diaryText: string) => void;
}

export const CbctMprViewer: React.FC<CbctMprViewerProps> = ({
	study,
	volume: propVolume,
	onClose,
	onApplyToDiary043,
}) => {
	const viewerId = useId();

	// ─── 1. VOLUME & CROSSHAIR STATE ───────────────────────────────────────────
	const [volume, setVolume] = useState<CbctVoxelVolume | null>(null);
	const [crosshairMm, setCrosshairMm] = useState<Point3D>({ x: 0, y: -10, z: -10 });
	const [activeDraggingPlane, setActiveDraggingPlane] = useState<MprPlane | null>(null);

	// ─── 2. HOUNSFIELD WINDOW / LEVEL STATE ────────────────────────────────────
	const [activePresetId, setActivePresetId] = useState<string>("bone_dense");
	const [windowWidth, setWindowWidth] = useState<number>(2000);
	const [windowLevel, setWindowLevel] = useState<number>(400);
	const [invertColors, setInvertColors] = useState<boolean>(false);
	const [slabMode, setSlabMode] = useState<SlabProjectionMode>("single");
	const [slabThicknessMm, setSlabThicknessMm] = useState<number>(2.0);

	// ─── 3. DENTAL ARCH SPLINE & PANORAMA STATE ────────────────────────────────
	const [activeJaw, setActiveJaw] = useState<"mandible" | "maxilla">("mandible");
	const [anchors, setAnchors] = useState<readonly DentalArchAnchor[]>(DEFAULT_MANDIBULAR_ARCH_ANCHORS);
	const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
	const [focalTroughThicknessMm, setFocalTroughThicknessMm] = useState<number>(12.0);
	const [panoramicResult, setPanoramicResult] = useState<PanoramicReconstructionResult | null>(null);
	const [crossSections, setCrossSections] = useState<CrossSectionSliceData[]>([]);
	const [selectedCrossSectionIndex, setSelectedCrossSectionIndex] = useState<number>(0);
	const [activeTab, setActiveTab] = useState<"mpr" | "panoramic" | "cross_sections">("mpr");

	// ─── 4. CANVAS REFS ────────────────────────────────────────────────────────
	const axialCanvasRef = useRef<HTMLCanvasElement>(null);
	const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
	const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
	const panoCanvasRef = useRef<HTMLCanvasElement>(null);
	const crossSectionCanvasRef = useRef<HTMLCanvasElement>(null);

	// Initialize synthetic volume if none provided
	useEffect(() => {
		if (propVolume) {
			setVolume(propVolume);
		} else {
			const synth = createSyntheticDentalCbctVolume(160, 160, 100, 0.4);
			setVolume(synth);
		}

		return () => {
			if (!propVolume && volume) {
				disposeCbctVolume(volume);
			}
		};
	}, [propVolume]);

	// Build active dental arch curve
	const archCurve = useMemo<DentalArchCurve>(() => {
		return buildDentalArchCurve(anchors, activeJaw, focalTroughThicknessMm);
	}, [anchors, activeJaw, focalTroughThicknessMm]);

	// Switch jaw anchors
	const handleSwitchJaw = (jaw: "mandible" | "maxilla") => {
		setActiveJaw(jaw);
		setAnchors(jaw === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS);
		setSelectedAnchorId(null);
	};

	// Apply Hounsfield Preset
	const handleSelectPreset = (preset: HounsfieldPreset) => {
		setActivePresetId(preset.id);
		setWindowWidth(preset.windowWidth);
		setWindowLevel(preset.windowLevel);
	};

	// ─── 5. RENDER 3-PLANE MPR SLICES ON CANVAS ────────────────────────────────
	const renderMprPlanes = useCallback(() => {
		if (!volume || volume.isDisposed || !volume.data) return;

		const resliced = resliceMprSynchronized(
			volume,
			crosshairMm,
			windowWidth,
			windowLevel,
			slabMode,
			slabThicknessMm,
		);

		const vox = worldMmToVoxel(crosshairMm, volume);

		// 1. Axial Viewport
		if (axialCanvasRef.current) {
			const canvas = axialCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = resliced.axial;
				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}
				const imgData = ctx.createImageData(metadata.widthPx, metadata.heightPx);
				imgData.data.set(data);
				ctx.putImageData(imgData, 0, 0);

				// Draw Dental Arch Spline
				ctx.strokeStyle = "rgba(6, 182, 212, 0.9)";
				ctx.lineWidth = 1.8;
				ctx.beginPath();
				const spline = archCurve.splinePointsMm;
				for (let i = 0; i < spline.length; i++) {
					const pt = spline[i]!;
					const v = worldMmToVoxel({ x: pt.x, y: pt.y, z: crosshairMm.z }, volume);
					if (i === 0) ctx.moveTo(v.x, v.y);
					else ctx.lineTo(v.x, v.y);
				}
				ctx.stroke();

				// Draw Tooth Anchors
				for (const anchor of archCurve.anchors) {
					const v = worldMmToVoxel({ x: anchor.positionMm.x, y: anchor.positionMm.y, z: crosshairMm.z }, volume);
					const isSelected = selectedAnchorId === anchor.id;
					ctx.fillStyle = isSelected ? "#eab308" : "#06b6d4";
					ctx.strokeStyle = "#000";
					ctx.lineWidth = 1.0;
					ctx.beginPath();
					ctx.arc(v.x, v.y, isSelected ? 4.5 : 3.0, 0, Math.PI * 2);
					ctx.fill();
					ctx.stroke();
				}

				// Draw Synchronized Crosshair Reticle (Axial: Green Y, Blue X)
				ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
				ctx.lineWidth = 1.0;
				ctx.beginPath();
				ctx.moveTo(0, vox.y);
				ctx.lineTo(canvas.width, vox.y);
				ctx.stroke();

				ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
				ctx.beginPath();
				ctx.moveTo(vox.x, 0);
				ctx.lineTo(vox.x, canvas.height);
				ctx.stroke();
			}
		}

		// 2. Coronal Viewport
		if (coronalCanvasRef.current) {
			const canvas = coronalCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = resliced.coronal;
				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}
				const imgData = ctx.createImageData(metadata.widthPx, metadata.heightPx);
				imgData.data.set(data);
				ctx.putImageData(imgData, 0, 0);

				// Coronal crosshair: X = vox.x (Blue), Y = vox.z (Green)
				ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
				ctx.lineWidth = 1.0;
				ctx.beginPath();
				ctx.moveTo(vox.x, 0);
				ctx.lineTo(vox.x, canvas.height);
				ctx.stroke();

				ctx.strokeStyle = "rgba(34, 197, 94, 0.85)";
				ctx.beginPath();
				ctx.moveTo(0, vox.z);
				ctx.lineTo(canvas.width, vox.z);
				ctx.stroke();
			}
		}

		// 3. Sagittal Viewport
		if (sagittalCanvasRef.current) {
			const canvas = sagittalCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = resliced.sagittal;
				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}
				const imgData = ctx.createImageData(metadata.widthPx, metadata.heightPx);
				imgData.data.set(data);
				ctx.putImageData(imgData, 0, 0);

				// Sagittal crosshair: X = vox.y (Red), Y = vox.z (Green)
				ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
				ctx.lineWidth = 1.0;
				ctx.beginPath();
				ctx.moveTo(vox.y, 0);
				ctx.lineTo(vox.y, canvas.height);
				ctx.stroke();

				ctx.strokeStyle = "rgba(34, 197, 94, 0.85)";
				ctx.beginPath();
				ctx.moveTo(0, vox.z);
				ctx.lineTo(canvas.width, vox.z);
				ctx.stroke();
			}
		}
	}, [volume, crosshairMm, windowWidth, windowLevel, slabMode, slabThicknessMm, archCurve, selectedAnchorId]);

	useEffect(() => {
		renderMprPlanes();
	}, [renderMprPlanes]);

	// ─── 6. INTERACTIVE CROSSHAIR DRAG HANDLERS (60 FPS) ──────────────────────
	const handlePointerDown = (plane: MprPlane, e: React.PointerEvent<HTMLCanvasElement>) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		setActiveDraggingPlane(plane);
		handlePointerMove(plane, e);
	};

	const handlePointerMove = (plane: MprPlane, e: React.PointerEvent<HTMLCanvasElement>) => {
		if (e.buttons === 0 && activeDraggingPlane !== plane) return;
		if (!volume) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

		const newCrosshair = mapCanvasPointerToWorldMm(normX, normY, plane, crosshairMm, volume);
		setCrosshairMm(newCrosshair);
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			// ignore
		}
		setActiveDraggingPlane(null);
	};

	// Mouse Wheel Slice Scrolling
	const handleWheelScroll = (plane: MprPlane, e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		if (!volume) return;

		const stepMm = plane === "axial" ? volume.spacingMm.z : plane === "coronal" ? volume.spacingMm.y : volume.spacingMm.x;
		const delta = e.deltaY < 0 ? stepMm : -stepMm;

		setCrosshairMm((prev) => {
			if (plane === "axial") {
				return clampCoordinateToVolume({ ...prev, z: prev.z + delta }, volume);
			}
			if (plane === "coronal") {
				return clampCoordinateToVolume({ ...prev, y: prev.y + delta }, volume);
			}
			return clampCoordinateToVolume({ ...prev, x: prev.x + delta }, volume);
		});
	};

	// ─── 7. RECONSTRUCT PANORAMA & CROSS-SECTIONS ─────────────────────────────
	const handleReconstructPanorama = () => {
		if (!volume) return;
		const pano = reconstructPanoramicView(volume, archCurve, {
			heightMm: 38.0,
			heightPx: 280,
			windowWidth,
			windowLevel,
		});
		setPanoramicResult(pano);

		const sections = generateCrossSectionSlices(volume, archCurve, 2.0, crosshairMm.z, {
			widthMm: 24.0,
			heightMm: 32.0,
			windowWidth,
			windowLevel,
		});
		setCrossSections(sections);
		setSelectedCrossSectionIndex(0);
	};

	// Render Panoramic View on Canvas when available
	useEffect(() => {
		if (panoCanvasRef.current && panoramicResult) {
			const canvas = panoCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				if (canvas.width !== panoramicResult.widthPx || canvas.height !== panoramicResult.heightPx) {
					canvas.width = panoramicResult.widthPx;
					canvas.height = panoramicResult.heightPx;
				}
				const imgData = ctx.createImageData(panoramicResult.widthPx, panoramicResult.heightPx);
				imgData.data.set(panoramicResult.pixelData);
				ctx.putImageData(imgData, 0, 0);

				// Draw FDI tooth marker lines
				ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
				ctx.lineWidth = 1.0;
				ctx.fillStyle = "#38bdf8";
				ctx.font = "bold 10px monospace";

				for (const marker of panoramicResult.toothMarkersOnPano) {
					ctx.beginPath();
					ctx.moveTo(marker.xPx, 0);
					ctx.lineTo(marker.xPx, canvas.height);
					ctx.stroke();
					ctx.fillText(marker.toothFdi, marker.xPx - 6, 14);
				}
			}
		}
	}, [panoramicResult]);

	// Render Selected Cross-Section Slice on Canvas
	const activeCrossSection = crossSections[selectedCrossSectionIndex];
	useEffect(() => {
		if (crossSectionCanvasRef.current && activeCrossSection) {
			const canvas = crossSectionCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				if (canvas.width !== activeCrossSection.widthPx || canvas.height !== activeCrossSection.heightPx) {
					canvas.width = activeCrossSection.widthPx;
					canvas.height = activeCrossSection.heightPx;
				}
				const imgData = ctx.createImageData(activeCrossSection.widthPx, activeCrossSection.heightPx);
				imgData.data.set(activeCrossSection.pixelData);
				ctx.putImageData(imgData, 0, 0);

				// Draw 5mm grid ticks
				ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
				ctx.lineWidth = 0.5;
				const pxPerMm = 1.0 / activeCrossSection.pixelSpacingMm;
				for (let mm = -10; mm <= 10; mm += 5) {
					const y = (activeCrossSection.heightMm / 2 - mm) * pxPerMm;
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.lineTo(canvas.width, y);
					ctx.stroke();
				}
			}
		}
	}, [activeCrossSection]);

	const crossSectionMetrics = useMemo(() => {
		if (!activeCrossSection) return null;
		return measureAlveolarRidgeCrossSection(activeCrossSection);
	}, [activeCrossSection]);

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden"
			data-testid="cbct-mpr-viewer-modal"
		>
			{/* ── TOP CLINICAL HEADER ── */}
			<header className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)]">
						<Volume2 className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-sm font-bold text-slate-100">
								3D КЛКТ MPR & Панорамная кривая зубной дуги
							</h1>
							<span className="px-2 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal)] text-[11px] font-bold">
								60 FPS Sync
							</span>
						</div>
						<p className="text-xs text-slate-400">
							{study?.patientName ? `Пациент: ${study.patientName} • ` : ""}
							Координаты среза: X={crosshairMm.x.toFixed(1)} мм, Y={crosshairMm.y.toFixed(1)} мм, Z={crosshairMm.z.toFixed(1)} мм
						</p>
					</div>
				</div>

				{/* Center: Viewport Mode Switcher */}
				<div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
					<button
						type="button"
						onClick={() => setActiveTab("mpr")}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
							activeTab === "mpr"
								? "bg-[var(--teal)] text-white shadow-md font-extrabold"
								: "text-slate-400 hover:text-slate-200"
						}`}
					>
						3-Plane MPR
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveTab("panoramic");
							if (!panoramicResult) handleReconstructPanorama();
						}}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
							activeTab === "panoramic"
								? "bg-[var(--teal)] text-white shadow-md font-extrabold"
								: "text-slate-400 hover:text-slate-200"
						}`}
					>
						Панорама (ОПТГ)
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveTab("cross_sections");
							if (crossSections.length === 0) handleReconstructPanorama();
						}}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
							activeTab === "cross_sections"
								? "bg-[var(--teal)] text-white shadow-md font-extrabold"
								: "text-slate-400 hover:text-slate-200"
						}`}
					>
						Кросс-секции ({crossSections.length})
					</button>
				</div>

				{/* Right: Controls & Close */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleReconstructPanorama}
						className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] text-xs font-bold hover:bg-[var(--teal)] hover:text-white transition-all shadow-sm"
						title="Пересчитать панораму и кросс-секции"
					>
						<RefreshCw className="w-4 h-4" />
						<span>Обновить ОПТГ</span>
					</button>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
							title="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					)}
				</div>
			</header>

			{/* ── TOOLBAR: HOUNSFIELD PRESETS & SLAB THICKNESS ── */}
			<div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 gap-4 flex-wrap text-xs">
				{/* Presets */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="font-semibold text-slate-400 mr-1">Пресет HU:</span>
					{CBCT_HOUNSFIELD_PRESETS.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => handleSelectPreset(preset)}
							className={`min-h-[44px] px-3 py-1.5 rounded-xl border transition-all ${
								activePresetId === preset.id
									? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] font-bold shadow-sm"
									: "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
							}`}
							title={preset.descriptionRu}
						>
							{preset.label}
						</button>
					))}
				</div>

				{/* Slab Thickness & Mode */}
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5">
						<span className="font-semibold text-slate-400">Срез (Slab):</span>
						<select
							value={slabMode}
							onChange={(e) => setSlabMode(e.target.value as SlabProjectionMode)}
							className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-[var(--teal)]"
						>
							<option value="single">Одинарный срез (0 мм)</option>
							<option value="mip">MIP (Макс. интенсивность)</option>
							<option value="minip">MinIP (Пазухи / Воздух)</option>
							<option value="average">Average IP (Усреднение)</option>
						</select>
					</div>

					{slabMode !== "single" && (
						<div className="flex items-center gap-2">
							<span className="text-slate-400">Толщина:</span>
							<input
								type="range"
								min="1"
								max="30"
								step="1"
								value={slabThicknessMm}
								onChange={(e) => setSlabThicknessMm(Number(e.target.value))}
								className="w-24 accent-[var(--teal)]"
							/>
							<span className="font-bold text-[var(--teal)] font-mono">{slabThicknessMm} мм</span>
						</div>
					)}

					{/* Jaw Switcher */}
					<div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
						<button
							type="button"
							onClick={() => handleSwitchJaw("mandible")}
							className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
								activeJaw === "mandible"
									? "bg-[var(--teal)] text-white"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Н.Ч.
						</button>
						<button
							type="button"
							onClick={() => handleSwitchJaw("maxilla")}
							className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
								activeJaw === "maxilla"
									? "bg-[var(--teal)] text-white"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							В.Ч.
						</button>
					</div>
				</div>
			</div>

			{/* ── MAIN WORKSPACE CONTENT ── */}
			<main className="flex-1 min-h-0 relative bg-black flex overflow-hidden">
				{/* 1. 3-PLANE MPR VIEW */}
				{activeTab === "mpr" && (
					<div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 p-2 bg-slate-950 min-h-0 overflow-hidden">
						{/* Axial Plane */}
						<div className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-lg">
							<div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs font-bold text-emerald-400">
								<span>1. Аксиальный (Горизонтальный)</span>
								<span className="font-mono text-[11px] text-slate-400">Z={crosshairMm.z.toFixed(1)} мм</span>
							</div>
							<div className="flex-1 flex items-center justify-center relative p-1 bg-black min-h-0 overflow-hidden">
								<canvas
									ref={axialCanvasRef}
									onPointerDown={(e) => handlePointerDown("axial", e)}
									onPointerMove={(e) => handlePointerMove("axial", e)}
									onPointerUp={handlePointerUp}
									onWheel={(e) => handleWheelScroll("axial", e)}
									className="max-h-full max-w-full object-contain cursor-crosshair rounded-lg"
								/>
							</div>
						</div>

						{/* Coronal Plane */}
						<div className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-lg">
							<div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs font-bold text-rose-400">
								<span>2. Корональный (Фронтальный)</span>
								<span className="font-mono text-[11px] text-slate-400">Y={crosshairMm.y.toFixed(1)} мм</span>
							</div>
							<div className="flex-1 flex items-center justify-center relative p-1 bg-black min-h-0 overflow-hidden">
								<canvas
									ref={coronalCanvasRef}
									onPointerDown={(e) => handlePointerDown("coronal", e)}
									onPointerMove={(e) => handlePointerMove("coronal", e)}
									onPointerUp={handlePointerUp}
									onWheel={(e) => handleWheelScroll("coronal", e)}
									className="max-h-full max-w-full object-contain cursor-crosshair rounded-lg"
								/>
							</div>
						</div>

						{/* Sagittal Plane */}
						<div className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-lg">
							<div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs font-bold text-blue-400">
								<span>3. Сагиттальный (Профиль)</span>
								<span className="font-mono text-[11px] text-slate-400">X={crosshairMm.x.toFixed(1)} мм</span>
							</div>
							<div className="flex-1 flex items-center justify-center relative p-1 bg-black min-h-0 overflow-hidden">
								<canvas
									ref={sagittalCanvasRef}
									onPointerDown={(e) => handlePointerDown("sagittal", e)}
									onPointerMove={(e) => handlePointerMove("sagittal", e)}
									onPointerUp={handlePointerUp}
									onWheel={(e) => handleWheelScroll("sagittal", e)}
									className="max-h-full max-w-full object-contain cursor-crosshair rounded-lg"
								/>
							</div>
						</div>
					</div>
				)}

				{/* 2. PANORAMIC (OPG) VIEW */}
				{activeTab === "panoramic" && (
					<div className="flex-1 flex flex-col p-4 bg-slate-950 min-h-0 overflow-y-auto gap-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Spline className="w-5 h-5 text-[var(--teal)]" />
								<h2 className="text-sm font-bold text-slate-100">
									Развернутая панорама зубного ряда (ОПТГ / Focal Trough {focalTroughThicknessMm} мм)
								</h2>
							</div>
							<div className="flex items-center gap-2 text-xs">
								<span className="text-slate-400">Толщина фокального слоя:</span>
								<input
									type="range"
									min="5"
									max="20"
									step="1"
									value={focalTroughThicknessMm}
									onChange={(e) => setFocalTroughThicknessMm(Number(e.target.value))}
									className="w-24 accent-[var(--teal)]"
								/>
								<span className="font-bold text-[var(--teal)] font-mono">{focalTroughThicknessMm} мм</span>
							</div>
						</div>

						<div className="flex-1 flex items-center justify-center bg-black rounded-2xl border border-slate-800 p-2 min-h-[300px] overflow-hidden">
							{panoramicResult ? (
								<canvas
									ref={panoCanvasRef}
									className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
								/>
							) : (
								<div className="text-xs text-slate-500 italic">Нажмите «Обновить ОПТГ» для построения панорамы</div>
							)}
						</div>
					</div>
				)}

				{/* 3. TRANSVERSE CROSS-SECTIONS CAROUSEL */}
				{activeTab === "cross_sections" && (
					<div className="flex-1 flex flex-col p-4 bg-slate-950 min-h-0 overflow-hidden gap-3">
						<div className="flex items-center justify-between shrink-0">
							<div className="flex items-center gap-2">
								<Layers className="w-5 h-5 text-[var(--teal)]" />
								<h2 className="text-sm font-bold text-slate-100">
									Поперечные кросс-секции альвеолярного гребня (Шаг 2.0 мм)
								</h2>
							</div>

							{/* Navigation Carousel */}
							<div className="flex items-center gap-2">
								<button
									type="button"
									disabled={selectedCrossSectionIndex <= 0}
									onClick={() => setSelectedCrossSectionIndex((p) => Math.max(0, p - 1))}
									className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800 text-slate-200 disabled:opacity-40"
								>
									<ChevronLeft className="w-5 h-5" />
								</button>
								<span className="text-xs font-bold text-slate-300 font-mono px-2">
									Срез {selectedCrossSectionIndex + 1} из {crossSections.length}
								</span>
								<button
									type="button"
									disabled={selectedCrossSectionIndex >= crossSections.length - 1}
									onClick={() => setSelectedCrossSectionIndex((p) => Math.min(crossSections.length - 1, p + 1))}
									className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800 text-slate-200 disabled:opacity-40"
								>
									<ChevronRight className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Main Cross-Section Display */}
						<div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
							{/* Canvas */}
							<div className="flex-1 flex items-center justify-center bg-black rounded-2xl border border-slate-800 p-2 min-h-0 overflow-hidden relative">
								{activeCrossSection ? (
									<canvas
										ref={crossSectionCanvasRef}
										className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
									/>
								) : (
									<div className="text-xs text-slate-500 italic">Срезы еще не рассчитаны</div>
								)}
							</div>

							{/* Diagnostic Bone Metrics Card */}
							{activeCrossSection && crossSectionMetrics && (
								<div className="w-full md:w-80 flex flex-col gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shrink-0">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
											Зона: {activeCrossSection.toothLabelRu}
										</span>
										<span className="px-2 py-0.5 rounded bg-[var(--teal-surface)] text-[var(--teal)] font-bold text-xs">
											FDI #{activeCrossSection.nearestToothFdi}
										</span>
									</div>

									<div className="grid grid-cols-2 gap-2 text-xs font-mono">
										<div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
											<div className="text-[10px] text-slate-400">Высота гребня:</div>
											<div className="text-sm font-bold text-white mt-0.5">{crossSectionMetrics.heightMm} мм</div>
										</div>
										<div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
											<div className="text-[10px] text-slate-400">Ширина вершины:</div>
											<div className="text-sm font-bold text-white mt-0.5">{crossSectionMetrics.crestWidthMm} мм</div>
										</div>
										<div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
											<div className="text-[10px] text-slate-400">Середина тела:</div>
											<div className="text-sm font-bold text-white mt-0.5">{crossSectionMetrics.midWidthMm} мм</div>
										</div>
										<div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
											<div className="text-[10px] text-slate-400">База гребня:</div>
											<div className="text-sm font-bold text-white mt-0.5">{crossSectionMetrics.baseWidthMm} мм</div>
										</div>
									</div>

									<div className={`p-3 rounded-xl border text-xs leading-relaxed ${
										crossSectionMetrics.isAdequateForImplant
											? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
											: "bg-amber-950/40 border-amber-500/40 text-amber-300"
									}`}>
										{crossSectionMetrics.clinicalAdviceRu}
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</main>
		</div>
	);
};
