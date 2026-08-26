import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Box,
	Check,
	ChevronLeft,
	ChevronRight,
	Columns2,
	Compass,
	Copy,
	Crosshair,
	Download,
	Eye,
	FileArchive,
	FileText,
	FolderOpen,
	Grid2X2,
	Info,
	Layers,
	LayoutGrid,
	Loader2,
	Maximize2,
	Minimize2,
	Play,
	Plus,
	RotateCw,
	Ruler,
	Save,
	Scan,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Spline,
	Trash2,
	UploadCloud,
	Volume2,
	VolumeX,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	CBCT_HOUNSFIELD_PRESETS,
	type CbctVoxelVolume,
	type HounsfieldPreset,
	type MprPlane,
	type Point3D,
	type SlabProjectionMode,
	ROMEXIS_COLORS,
	createSyntheticDentalCbctVolume,
	disposeCbctVolume,
	drawCalibratedMillimeterRulers,
	drawRomexisSlabCorridor,
	extractMprSlice,
	huToGrayscale,
	sampleVoxelHU,
	voxelToWorldMm,
	worldMmToVoxel,
} from "./cbctMprMath";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	type CrossSectionSliceData,
	type DentalArchAnchor,
	type DentalArchCurve,
	type PanoramicReconstructionResult,
	type PanoramicSliceFanTick,
	buildDentalArchCurve,
	createDentalArchCurve,
	findNearestCrossSectionIndexByPanoX,
	generateCrossSectionSlices,
	generateCrossSectionsAlongArch,
	getFocalTroughBoundaryCurves,
	getPanoramicSliceFanTicks,
	mapSliceToPanoramicX,
	reconstructPanoramicOpg,
	reconstructPanoramicView,
} from "./dentalCurveEngine";
import { CbctViewportHud } from "./CbctViewportHud";
import {
	STANDARD_IMPLANT_CATALOG,
	type CrossSectionImplantPose,
	type ImplantBrandKey,
	type MandibularCanalCrossSection,
	type VirtualImplantSpec,
	type Implant3DWorldProjection,
	type AxialImplantIntersection,
	auditAlveolarBoneContainment,
	auditNerveSafetyMargin,
	calculateApexCoordinates,
	calculateImplant3DWorldPose,
	calculateAxialImplantIntersection,
	generateForm043CbctDiary,
	playNerveSafetyAudioAlarm,
	sampleCrossSectionHUProfile,
} from "./implantSafetyEngine";
import {
	type HUZoneSampling,
	type MischClassificationResult,
	classifyMischBoneQuality,
	computeHUZoneProfile,
} from "./boneDensityMischMath";
import {
	buildVolumeFromDicomFiles,
	buildVolumeFromDicomZip,
} from "./realDicomVolumeLoader";
import type { RadiologyStudy } from "./types";
import { showToast } from "../GlobalToast";
import type { CbctViewportType } from "./cbctMprMath";

export type StudioMode = "diagnostic" | "implant";
export type ViewLayoutMode = "quad_view" | "layout_1_plus_3";

export function getTissueNameFromHU(hu: number): string {
	if (hu >= 2000) return "Эмаль / Пломбировочный материал";
	if (hu >= 1000) return "Кортикальная кость / Дентин";
	if (hu >= 300) return "Трабекулярная губчатая кость";
	if (hu >= 0) return "Мягкие ткани / Пульпа / Десна";
	if (hu >= -400) return "Жировая клетчатка / Экссудат";
	return "Воздух / Синус / Дыхательные пути";
}

export interface CbctMprImplantStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly study?: RadiologyStudy | null | undefined;
	readonly onApplyToDiary043?: ((diaryText: string) => void) | undefined;
}

export const CbctMprImplantStudioModal: React.FC<CbctMprImplantStudioModalProps> = ({
	isOpen,
	onClose,
	study,
	onApplyToDiary043,
}) => {
	const modalId = useId();

	// ─── CLINICAL STUDIO MODE & VIEWPORT LAYOUT ──────────────────────────────
	const [studioMode, setStudioMode] = useState<StudioMode>("diagnostic");
	const [viewLayout, setViewLayout] = useState<ViewLayoutMode>("quad_view");
	const [maximizedViewport, setMaximizedViewport] = useState<CbctViewportType | null>(null);

	const handleToggleMaximize = useCallback((type: CbctViewportType) => {
		setMaximizedViewport((prev) => (prev === type ? null : type));
	}, []);

	// ─── 3D CBCT VOXEL VOLUME STATE ───────────────────────────────────────────
	const [volume, setVolume] = useState<CbctVoxelVolume | null>(null);
	const [activePreset, setActivePreset] = useState<string>("bone_dense");
	const [windowWidth, setWindowWidth] = useState<number>(2000);
	const [windowLevel, setWindowLevel] = useState<number>(400);
	const [invertColors, setInvertColors] = useState<boolean>(false);
	const [slabMode, setSlabMode] = useState<SlabProjectionMode>("single");
	const [slabThicknessMm, setSlabThicknessMm] = useState<number>(2.0);

	// ─── SYNCHRONIZED 3D CROSSHAIR COORDINATE (PHYSICAL MM) ───────────────────
	const [crosshairMm, setCrosshairMm] = useState<Point3D>({ x: 0, y: 0, z: 0 });
	const [mobileActiveTab, setMobileActiveTab] = useState<"axial" | "coronal" | "sagittal" | "panoramic" | "planner">("axial");

	const sampledVoxelHU = useMemo(() => {
		if (!volume) return 0;
		const vox = worldMmToVoxel(crosshairMm, volume);
		return sampleVoxelHU(vox.x, vox.y, vox.z, volume);
	}, [volume, crosshairMm]);

	// ─── DENTAL ARCH & PANORAMA STATE ─────────────────────────────────────────
	const [jawType, setJawType] = useState<"mandible" | "maxilla">("mandible");
	const [archCurve, setArchCurve] = useState<DentalArchCurve>(() =>
		buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible"),
	);
	const [panoramicData, setPanoramicData] = useState<PanoramicReconstructionResult | null>(null);
	const [crossSections, setCrossSections] = useState<CrossSectionSliceData[]>([]);
	const [activeCrossSectionIdx, setActiveCrossSectionIdx] = useState<number>(0);

	// ─── IMPLANT PLANNING & NERVE SAFETY STATE ────────────────────────────────
	const [selectedBrand, setSelectedBrand] = useState<ImplantBrandKey>("osstem");
	const [selectedDiameterMm, setSelectedDiameterMm] = useState<number>(4.0);
	const [selectedLengthMm, setSelectedLengthMm] = useState<number>(10.0);
	const [implantEntryXOffsetMm, setImplantEntryXOffsetMm] = useState<number>(0.0);
	const [implantEntryDepthMm, setImplantEntryDepthMm] = useState<number>(2.0);
	const [implantAngulationDeg, setImplantAngulationDeg] = useState<number>(0.0);
	const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);

	// Mandibular Canal position in cross-section (Relative to slice center)
	const [canalXOffsetMm, setCanalXOffsetMm] = useState<number>(2.0);
	const [canalYDepthMm, setCanalYDepthMm] = useState<number>(16.5);

	// ─── REAL DICOM INGESTION STATE ──────────────────────────────────────────
	const [dicomLoadingStatus, setDicomLoadingStatus] = useState<string | null>(null);
	const [dicomProgress, setDicomProgress] = useState<number>(0);
	const [patientDisplayName, setPatientDisplayName] = useState<string>(study?.patientName || "Пациент КЛКТ");
	const [loadedSliceCount, setLoadedSliceCount] = useState<number>(0);
	const [isDragOverWindow, setIsDragOverWindow] = useState<boolean>(false);

	const folderInputRef = useRef<HTMLInputElement>(null);
	const zipInputRef = useRef<HTMLInputElement>(null);

	// ─── CANVAS REFS FOR ZERO-GC RENDERING ───────────────────────────────────
	const axialCanvasRef = useRef<HTMLCanvasElement>(null);
	const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
	const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
	const panoCanvasRef = useRef<HTMLCanvasElement>(null);
	const crossSectionCanvasRef = useRef<HTMLCanvasElement>(null);

	// Crosshair and Panorama dragging state
	const [isDraggingCrosshair, setIsDraggingCrosshair] = useState<MprPlane | null>(null);
	const [isDraggingPano, setIsDraggingPano] = useState<boolean>(false);

	// Initialize Volume on Open
	useEffect(() => {
		if (!isOpen) return;

		// Attach window global hook for external automation & Playwright volume injection
		if (typeof window !== "undefined") {
			(window as unknown as { __INJECT_CBCT_VOLUME__?: (vol: CbctVoxelVolume, name?: string) => void }).__INJECT_CBCT_VOLUME__ = (vol: CbctVoxelVolume, name?: string) => {
				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				setCrosshairMm({ x: 0, y: 0, z: 0 });
				if (name) setPatientDisplayName(name);
				const anchors = jawType === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;
				const arch = buildDentalArchCurve(anchors, jawType);
				setArchCurve(arch);
			};
		}

		// Default initial volume if no real DICOM loaded yet
		if (!volume) {
			const vol = createSyntheticDentalCbctVolume(120, 120, 120, 0.5);
			setVolume(vol);
			setLoadedSliceCount(120);
			setCrosshairMm({ x: 0, y: 0, z: 0 });
		}

		const anchors = jawType === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;
		const arch = buildDentalArchCurve(anchors, jawType);
		setArchCurve(arch);
	}, [isOpen, jawType, volume]);

	// Ingest Real DICOM Folder
	const handleSelectDicomFolder = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files ? Array.from(e.target.files) : [];
		if (files.length === 0) return;

		const dcmFiles = files.filter(
			(f) => f.name.toLowerCase().endsWith(".dcm") || f.name.toLowerCase().endsWith(".dicom") || !f.name.includes("."),
		);

		if (dcmFiles.length === 0) {
			showToast("В выбранной папке не найдено файлов DICOM (.dcm)", "error");
			return;
		}

		setDicomLoadingStatus("Чтение DICOM файлов...");
		setDicomProgress(5);

		try {
			const vol = await buildVolumeFromDicomFiles(dcmFiles, (pct, msg) => {
				setDicomProgress(pct);
				setDicomLoadingStatus(msg);
			});

			setVolume(vol);
			setLoadedSliceCount(vol.dimensions.depth);
			setPatientDisplayName("Барабаш С.В.");
			setCrosshairMm({ x: 0, y: 0, z: 0 });
			const arch = buildDentalArchCurve(
				jawType === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS,
				jawType,
			);
			setArchCurve(arch);
			showToast(`Успешно загружено реальное КТ: ${vol.dimensions.width}x${vol.dimensions.height}x${vol.dimensions.depth} вокселей`, "success");
			setDicomLoadingStatus(null);
		} catch (err: unknown) {
			setDicomLoadingStatus(null);
			const msg = err instanceof Error ? err.message : "Ошибка чтения DICOM";
			showToast(msg, "error");
		}
	}, [jawType]);

	// Ingest Real DICOM ZIP
	const handleSelectDicomZip = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setDicomLoadingStatus("Распаковка ZIP-архива КТ...");
		setDicomProgress(5);

		try {
			const buf = await file.arrayBuffer();
			const vol = await buildVolumeFromDicomZip(buf, (pct, msg) => {
				setDicomProgress(pct);
				setDicomLoadingStatus(msg);
			});

			setVolume(vol);
			setLoadedSliceCount(vol.dimensions.depth);
			setCrosshairMm({ x: 0, y: 0, z: 0 });
			const arch = buildDentalArchCurve(
				jawType === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS,
				jawType,
			);
			setArchCurve(arch);
			showToast(`Успешно загружен архив КТ: ${vol.dimensions.width}x${vol.dimensions.height}x${vol.dimensions.depth} вокселей`, "success");
			setDicomLoadingStatus(null);
		} catch (err: unknown) {
			setDicomLoadingStatus(null);
			const msg = err instanceof Error ? err.message : "Ошибка чтения архива DICOM";
			showToast(msg, "error");
		}
	}, [jawType]);

	// Drag and Drop DICOM files
	const handleDropFiles = useCallback(async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOverWindow(false);

		const items = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
		if (items.length === 0) return;

		const zipFile = items.find((f) => f.name.toLowerCase().endsWith(".zip"));
		if (zipFile) {
			setDicomLoadingStatus("Распаковка ZIP-архива КТ...");
			try {
				const buf = await zipFile.arrayBuffer();
				const vol = await buildVolumeFromDicomZip(buf, (pct, msg) => {
					setDicomProgress(pct);
					setDicomLoadingStatus(msg);
				});
				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				setCrosshairMm({ x: 0, y: 0, z: 0 });
				setDicomLoadingStatus(null);
				showToast(`Загружен архив КТ: ${vol.dimensions.depth} срезов`, "success");
			} catch (err: unknown) {
				setDicomLoadingStatus(null);
				showToast(err instanceof Error ? err.message : "Ошибка архива", "error");
			}
			return;
		}

		const dcmFiles = items.filter(
			(f) => f.name.toLowerCase().endsWith(".dcm") || f.name.toLowerCase().endsWith(".dicom") || !f.name.includes("."),
		);

		if (dcmFiles.length > 0) {
			setDicomLoadingStatus(`Загрузка ${dcmFiles.length} срезов DICOM...`);
			try {
				const vol = await buildVolumeFromDicomFiles(dcmFiles, (pct, msg) => {
					setDicomProgress(pct);
					setDicomLoadingStatus(msg);
				});
				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				setCrosshairMm({ x: 0, y: 0, z: 0 });
				setDicomLoadingStatus(null);
				showToast(`Загружено ${vol.dimensions.depth} срезов реального КТ`, "success");
			} catch (err: unknown) {
				setDicomLoadingStatus(null);
				showToast(err instanceof Error ? err.message : "Ошибка DICOM", "error");
			}
		}
	}, []);

	// Update Dental Arch when jaw type changes
	const handleToggleJawType = useCallback((type: "mandible" | "maxilla") => {
		setJawType(type);
		const anchors = type === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;
		const newArch = buildDentalArchCurve(anchors, type);
		setArchCurve(newArch);
	}, []);

	// Update Window/Level when preset selected
	const handleSelectPreset = useCallback((presetId: string) => {
		setActivePreset(presetId);
		const found = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === presetId);
		if (found) {
			setWindowWidth(found.windowWidth);
			setWindowLevel(found.windowLevel);
		}
	}, []);

	// Active implant spec
	const currentImplantSpec: VirtualImplantSpec = useMemo(() => {
		const match = STANDARD_IMPLANT_CATALOG.find(
			(i) => i.brand === selectedBrand && Math.abs(i.diameterMm - selectedDiameterMm) <= 0.25 && Math.abs(i.lengthMm - selectedLengthMm) <= 0.5,
		);
		const fallback = STANDARD_IMPLANT_CATALOG[0]!;
		return match ?? fallback;
	}, [selectedBrand, selectedDiameterMm, selectedLengthMm]);

	// Active cross-section slice
	const activeCrossSection: CrossSectionSliceData | null = useMemo(() => {
		if (crossSections.length === 0) return null;
		const idx = Math.max(0, Math.min(crossSections.length - 1, activeCrossSectionIdx));
		return crossSections[idx] ?? null;
	}, [crossSections, activeCrossSectionIdx]);

	// Calculate Implant Pose & Safety on active cross-section
	const currentImplantPose: CrossSectionImplantPose = useMemo(() => {
		const entry = { x: implantEntryXOffsetMm, y: implantEntryDepthMm };
		const apex = calculateApexCoordinates(entry, implantAngulationDeg, currentImplantSpec.lengthMm);
		return {
			implantSpec: currentImplantSpec,
			entryPoint: entry,
			apexPoint: apex,
			angulationDeg: implantAngulationDeg,
			targetToothFdi: Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46,
		};
	}, [currentImplantSpec, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg, activeCrossSection]);

	// Compute 3D World Physical Coordinates of Virtual Implant
	const implant3DWorld: Implant3DWorldProjection | null = useMemo(() => {
		if (!activeCrossSection) return null;
		return calculateImplant3DWorldPose(
			currentImplantPose,
			activeCrossSection.centerPointMm,
			activeCrossSection.normalVector2D,
			activeCrossSection.heightMm,
			4.0,
		);
	}, [currentImplantPose, activeCrossSection]);

	const currentCanal: MandibularCanalCrossSection = useMemo(() => {
		return {
			center: { x: canalXOffsetMm, y: canalYDepthMm },
			radiusMm: 1.4,
			safetyMarginMm: 2.0,
		};
	}, [canalXOffsetMm, canalYDepthMm]);

	// Alveolar Ridge Envelope
	const currentEnvelope = useMemo(() => {
		return {
			crestPoint: { x: 0, y: 0 },
			basePoint: { x: 0, y: 22.0 },
			buccalCrestPoint: { x: -4.0, y: 0 },
			lingualCrestPoint: { x: 4.0, y: 0 },
			ridgeWidthMm: 8.0,
			ridgeHeightMm: 22.0,
		};
	}, []);

	// Safety Audit & HU Sampling
	const nerveAuditResult = useMemo(() => {
		return auditNerveSafetyMargin(currentImplantPose, currentCanal);
	}, [currentImplantPose, currentCanal]);

	const boneContainmentResult = useMemo(() => {
		return auditAlveolarBoneContainment(currentImplantPose, currentEnvelope);
	}, [currentImplantPose, currentEnvelope]);

	const huSamplingResult: HUZoneSampling = useMemo(() => {
		if (!volume) return { coronalCrestalHU: 1100, trabecularCoreHU: 700, apicalBaseHU: 850, overallMeanHU: 837 };
		return sampleCrossSectionHUProfile(volume, currentImplantPose);
	}, [volume, currentImplantPose]);

	const mischClassification: MischClassificationResult = useMemo(() => {
		return classifyMischBoneQuality(huSamplingResult);
	}, [huSamplingResult]);

	// ─── AUDIO ALARM SENTINEL EFFECT ──────────────────────────────────────────
	useEffect(() => {
		if (nerveAuditResult.shouldTriggerAudioAlarm && isAudioEnabled) {
			playNerveSafetyAudioAlarm(nerveAuditResult.safetyStatus, isAudioEnabled);
		}
	}, [nerveAuditResult.shouldTriggerAudioAlarm, nerveAuditResult.safetyStatus, isAudioEnabled]);

	// ─── RENDER 3-PLANE MPR SLICES (ZERO-GC CANVAS) ───────────────────────────
	useEffect(() => {
		if (!volume || !isOpen) return;

		const vox = worldMmToVoxel(crosshairMm, volume);

		// 1. Axial Viewport (Z-Plane: Intersects with Coronal (Amber) & Sagittal (Green))
		if (axialCanvasRef.current) {
			const canvas = axialCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = extractMprSlice(volume, "axial", vox.z, {
					windowWidth,
					windowLevel,
					invert: invertColors,
					slabMode,
					slabThicknessMm,
				});
				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}
				const imgData = ctx.createImageData(metadata.widthPx, metadata.heightPx);
				imgData.data.set(data);
				ctx.putImageData(imgData, 0, 0);

				// Draw Calibrated Millimeter Rulers (1mm, 5mm, 10mm + scale bar)
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: metadata.widthPx,
					heightPx: metadata.heightPx,
					pixelSpacingMmX: metadata.pixelSpacingX,
					pixelSpacingMmY: metadata.pixelSpacingY,
					showScaleBar: true,
				});

				// Draw Focal Trough Corridor on Axial (Purple dashed bounds)
				if (archCurve.focalTroughThicknessMm > 0 && archCurve.splinePointsMm.length > 1) {
					const { innerBoundary, outerBoundary } = getFocalTroughBoundaryCurves(
						archCurve.splinePointsMm,
						archCurve.focalTroughThicknessMm,
					);

					// Focal trough translucent fill corridor
					ctx.save();
					ctx.fillStyle = ROMEXIS_COLORS.panoramicRgba(0.06);
					ctx.beginPath();
					for (let i = 0; i < outerBoundary.length; i++) {
						const v = worldMmToVoxel({ x: outerBoundary[i]!.x, y: outerBoundary[i]!.y, z: crosshairMm.z }, volume);
						if (i === 0) ctx.moveTo(v.x, v.y);
						else ctx.lineTo(v.x, v.y);
					}
					for (let i = innerBoundary.length - 1; i >= 0; i--) {
						const v = worldMmToVoxel({ x: innerBoundary[i]!.x, y: innerBoundary[i]!.y, z: crosshairMm.z }, volume);
						ctx.lineTo(v.x, v.y);
					}
					ctx.closePath();
					ctx.fill();

					// Inner and outer dashed curves
					ctx.strokeStyle = ROMEXIS_COLORS.panoramicRgba(0.5);
					ctx.lineWidth = 1.0;
					ctx.setLineDash([4, 3]);

					ctx.beginPath();
					for (let i = 0; i < innerBoundary.length; i++) {
						const v = worldMmToVoxel({ x: innerBoundary[i]!.x, y: innerBoundary[i]!.y, z: crosshairMm.z }, volume);
						if (i === 0) ctx.moveTo(v.x, v.y);
						else ctx.lineTo(v.x, v.y);
					}
					ctx.stroke();

					ctx.beginPath();
					for (let i = 0; i < outerBoundary.length; i++) {
						const v = worldMmToVoxel({ x: outerBoundary[i]!.x, y: outerBoundary[i]!.y, z: crosshairMm.z }, volume);
						if (i === 0) ctx.moveTo(v.x, v.y);
						else ctx.lineTo(v.x, v.y);
					}
					ctx.stroke();
					ctx.restore();
				}

				// Draw Dental Arch Spline on Axial (Purple #a855f7)
				ctx.strokeStyle = ROMEXIS_COLORS.panoramicRgba(0.95);
				ctx.lineWidth = 2.0;
				ctx.beginPath();
				const spline = archCurve.splinePointsMm;
				for (let i = 0; i < spline.length; i++) {
					const pt = spline[i]!;
					const v = worldMmToVoxel({ x: pt.x, y: pt.y, z: crosshairMm.z }, volume);
					if (i === 0) ctx.moveTo(v.x, v.y);
					else ctx.lineTo(v.x, v.y);
				}
				ctx.stroke();

				// Draw Active Cross-Section Reslice Ray across Ridge (Yellow #eab308)
				if (activeCrossSection) {
					const norm2D = activeCrossSection.normalVector2D;
					const rayHalfLenMm = activeCrossSection.widthMm / 2.0;
					const rayP1Mm = {
						x: activeCrossSection.centerPointMm.x - norm2D.x * rayHalfLenMm,
						y: activeCrossSection.centerPointMm.y - norm2D.y * rayHalfLenMm,
						z: crosshairMm.z,
					};
					const rayP2Mm = {
						x: activeCrossSection.centerPointMm.x + norm2D.x * rayHalfLenMm,
						y: activeCrossSection.centerPointMm.y + norm2D.y * rayHalfLenMm,
						z: crosshairMm.z,
					};
					const v1 = worldMmToVoxel(rayP1Mm, volume);
					const v2 = worldMmToVoxel(rayP2Mm, volume);

					ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
					ctx.lineWidth = 2.0;
					ctx.beginPath();
					ctx.moveTo(v1.x, v1.y);
					ctx.lineTo(v2.x, v2.y);
					ctx.stroke();
				}

				// Synchronized Virtual Implant 3D Projection on Axial (Z)
				if (studioMode === "implant" && implant3DWorld) {
					const axialIntersection = calculateAxialImplantIntersection(implant3DWorld, crosshairMm.z, 2.0);
					const statusColor = nerveAuditResult.isDangerous
						? "#ef4444"
						: nerveAuditResult.isWarning
							? "#f59e0b"
							: "#10b981";
					const statusFill = nerveAuditResult.isDangerous
						? "rgba(239, 68, 68, 0.45)"
						: nerveAuditResult.isWarning
							? "rgba(245, 158, 11, 0.4)"
							: "rgba(16, 185, 129, 0.35)";

					const centerVox = worldMmToVoxel(axialIntersection.centerMm, volume);
					const spX = volume.spacingMm.x || 0.4;
					const spY = volume.spacingMm.y || 0.4;

					const bodyMajorPx = axialIntersection.semiMajorMm / spX;
					const bodyMinorPx = axialIntersection.semiMinorMm / spY;
					const haloMajorPx = axialIntersection.safetyHaloSemiMajorMm / spX;
					const haloMinorPx = axialIntersection.safetyHaloSemiMinorMm / spY;

					ctx.save();
					ctx.translate(centerVox.x, centerVox.y);
					ctx.rotate(axialIntersection.rotationRad);

					if (axialIntersection.isInsideSpan) {
						// 2.0 mm IAN Safety Halo Ellipse (dashed)
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 1.5;
						ctx.setLineDash([3, 2]);
						ctx.beginPath();
						ctx.ellipse(0, 0, Math.max(1, haloMajorPx), Math.max(1, haloMinorPx), 0, 0, Math.PI * 2);
						ctx.stroke();
						ctx.setLineDash([]);

						// Implant Body Ellipse (Solid fill + stroke)
						ctx.fillStyle = statusFill;
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 2.0;
						ctx.beginPath();
						ctx.ellipse(0, 0, Math.max(1, bodyMajorPx), Math.max(1, bodyMinorPx), 0, 0, Math.PI * 2);
						ctx.fill();
						ctx.stroke();

						// Central Axis Crosshair
						ctx.strokeStyle = "#ffffff";
						ctx.lineWidth = 1.0;
						ctx.beginPath();
						ctx.moveTo(-3, 0);
						ctx.lineTo(3, 0);
						ctx.moveTo(0, -3);
						ctx.lineTo(0, 3);
						ctx.stroke();
					} else if (Math.abs(axialIntersection.signedDistanceToZMm) <= 8.0) {
						// Out of slice range projection footprint (Dotted)
						ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
						ctx.lineWidth = 1.0;
						ctx.setLineDash([2, 2]);
						ctx.beginPath();
						ctx.ellipse(0, 0, Math.max(1, bodyMajorPx), Math.max(1, bodyMinorPx), 0, 0, Math.PI * 2);
						ctx.stroke();
						ctx.setLineDash([]);
					}
					ctx.restore();
				}

				// Coronal Slab MIP Bounding Corridor (Orange #f59e0b)
				if (slabMode !== "single" && slabThicknessMm > 1.0) {
					drawRomexisSlabCorridor(ctx, {
						orientation: "horizontal",
						centerPx: vox.y,
						thicknessMm: slabThicknessMm,
						pixelSpacingMm: metadata.pixelSpacingY,
						lengthPx: metadata.widthPx,
						colorRgba: ROMEXIS_COLORS.coronalRgba(0.65),
						fillColorRgba: ROMEXIS_COLORS.coronalRgba(0.08),
					});
				}

				// Coronal Crosshair Line (Horizontal: Orange #f59e0b)
				ctx.strokeStyle = ROMEXIS_COLORS.coronal;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.moveTo(0, vox.y);
				ctx.lineTo(canvas.width, vox.y);
				ctx.stroke();

				// Sagittal Slab MIP Bounding Corridor (Emerald Green #10b981)
				if (slabMode !== "single" && slabThicknessMm > 1.0) {
					drawRomexisSlabCorridor(ctx, {
						orientation: "vertical",
						centerPx: vox.x,
						thicknessMm: slabThicknessMm,
						pixelSpacingMm: metadata.pixelSpacingX,
						lengthPx: metadata.heightPx,
						colorRgba: ROMEXIS_COLORS.sagittalRgba(0.65),
						fillColorRgba: ROMEXIS_COLORS.sagittalRgba(0.08),
					});
				}

				// Sagittal Crosshair Line (Vertical: Emerald Green #10b981)
				ctx.strokeStyle = ROMEXIS_COLORS.sagittal;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.moveTo(vox.x, 0);
				ctx.lineTo(vox.x, canvas.height);
				ctx.stroke();
			}
		}

		// 2. Coronal Viewport (Y-Plane: Intersects with Axial (Cyan) & Sagittal (Green))
		if (coronalCanvasRef.current) {
			const canvas = coronalCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = extractMprSlice(volume, "coronal", vox.y, {
					windowWidth,
					windowLevel,
					invert: invertColors,
					slabMode,
					slabThicknessMm,
				});
				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}
				const imgData = ctx.createImageData(metadata.widthPx, metadata.heightPx);
				imgData.data.set(data);
				ctx.putImageData(imgData, 0, 0);

				// Draw Calibrated Millimeter Rulers
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: metadata.widthPx,
					heightPx: metadata.heightPx,
					pixelSpacingMmX: metadata.pixelSpacingX,
					pixelSpacingMmY: metadata.pixelSpacingY,
					showScaleBar: true,
				});

				// Synchronized Virtual Implant 3D Projection on Coronal (Y)
				if (studioMode === "implant" && implant3DWorld) {
					const vEntry = worldMmToVoxel(implant3DWorld.entry3D, volume);
					const vApex = worldMmToVoxel(implant3DWorld.apex3D, volume);
					const depthMax = volume.dimensions.depth - 1;

					const pEntry = { x: vEntry.x, y: depthMax - vEntry.z };
					const pApex = { x: vApex.x, y: depthMax - vApex.z };

					const spX = volume.spacingMm.x || 0.4;
					const rPlatPx = (implant3DWorld.platformDiameterMm / 2.0) / spX;
					const rApexPx = (implant3DWorld.apexDiameterMm / 2.0) / spX;
					const rHaloPlatPx = rPlatPx + 2.0 / spX;
					const rHaloApexPx = rApexPx + 2.0 / spX;

					const dx = pApex.x - pEntry.x;
					const dy = pApex.y - pEntry.y;
					const len = Math.hypot(dx, dy) || 1.0;
					const nx = -dy / len;
					const ny = dx / len;

					const statusColor = nerveAuditResult.isDangerous
						? "#ef4444"
						: nerveAuditResult.isWarning
							? "#f59e0b"
							: "#10b981";
					const statusFill = nerveAuditResult.isDangerous
						? "rgba(239, 68, 68, 0.45)"
						: nerveAuditResult.isWarning
							? "rgba(245, 158, 11, 0.4)"
							: "rgba(16, 185, 129, 0.35)";

					// 2.0 mm Safety Halo boundary
					ctx.strokeStyle = statusColor;
					ctx.lineWidth = 1.5;
					ctx.setLineDash([3, 2]);
					ctx.beginPath();
					ctx.moveTo(pEntry.x + nx * rHaloPlatPx, pEntry.y + ny * rHaloPlatPx);
					ctx.lineTo(pApex.x + nx * rHaloApexPx, pApex.y + ny * rHaloApexPx);
					ctx.lineTo(pApex.x - nx * rHaloApexPx, pApex.y - ny * rHaloApexPx);
					ctx.lineTo(pEntry.x - nx * rHaloPlatPx, pEntry.y - ny * rHaloPlatPx);
					ctx.closePath();
					ctx.stroke();
					ctx.setLineDash([]);

					// Tapered Implant cylinder body
					ctx.fillStyle = statusFill;
					ctx.strokeStyle = statusColor;
					ctx.lineWidth = 2.0;
					ctx.beginPath();
					ctx.moveTo(pEntry.x + nx * rPlatPx, pEntry.y + ny * rPlatPx);
					ctx.lineTo(pApex.x + nx * rApexPx, pApex.y + ny * rApexPx);
					ctx.lineTo(pApex.x - nx * rApexPx, pApex.y - ny * rApexPx);
					ctx.lineTo(pEntry.x - nx * rPlatPx, pEntry.y - ny * rPlatPx);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();

					// Central Axis
					ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
					ctx.lineWidth = 1.0;
					ctx.beginPath();
					ctx.moveTo(pEntry.x, pEntry.y);
					ctx.lineTo(pApex.x, pApex.y);
					ctx.stroke();

					// Tooth FDI badge
					ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
					ctx.strokeStyle = statusColor;
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.roundRect(pEntry.x - 14, Math.max(2, pEntry.y - 16), 28, 13, 3);
					ctx.fill();
					ctx.stroke();
					ctx.fillStyle = "#ffffff";
					ctx.font = "bold 9px monospace";
					ctx.textAlign = "center";
					ctx.fillText(`#${implant3DWorld.targetToothFdi}`, pEntry.x, Math.max(2, pEntry.y - 16) + 10);
				}

				const zPx = metadata.heightPx - 1 - vox.z;

				// Axial Slab MIP Bounding Corridor (Cyan #06b6d4)
				if (slabMode !== "single" && slabThicknessMm > 1.0) {
					drawRomexisSlabCorridor(ctx, {
						orientation: "horizontal",
						centerPx: zPx,
						thicknessMm: slabThicknessMm,
						pixelSpacingMm: metadata.pixelSpacingY,
						lengthPx: metadata.widthPx,
						colorRgba: ROMEXIS_COLORS.axialRgba(0.65),
						fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
					});
				}

				// Axial Crosshair Line (Horizontal: Cyan #06b6d4)
				ctx.strokeStyle = ROMEXIS_COLORS.axial;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.moveTo(0, zPx);
				ctx.lineTo(canvas.width, zPx);
				ctx.stroke();

				// Sagittal Slab MIP Bounding Corridor (Emerald Green #10b981)
				if (slabMode !== "single" && slabThicknessMm > 1.0) {
					drawRomexisSlabCorridor(ctx, {
						orientation: "vertical",
						centerPx: vox.x,
						thicknessMm: slabThicknessMm,
						pixelSpacingMm: metadata.pixelSpacingX,
						lengthPx: metadata.heightPx,
						colorRgba: ROMEXIS_COLORS.sagittalRgba(0.65),
						fillColorRgba: ROMEXIS_COLORS.sagittalRgba(0.08),
					});
				}

				// Sagittal Crosshair Line (Vertical: Emerald Green #10b981)
				ctx.strokeStyle = ROMEXIS_COLORS.sagittal;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.moveTo(vox.x, 0);
				ctx.lineTo(vox.x, canvas.height);
				ctx.stroke();
			}
		}

		// 3. Sagittal Viewport (X-Plane: Intersects with Axial (Cyan) & Coronal (Amber))
		if (sagittalCanvasRef.current) {
			const canvas = sagittalCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = extractMprSlice(volume, "sagittal", vox.x, {
					windowWidth,
					windowLevel,
					invert: invertColors,
					slabMode,
					slabThicknessMm,
				});
				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}
				const imgData = ctx.createImageData(metadata.widthPx, metadata.heightPx);
				imgData.data.set(data);
				ctx.putImageData(imgData, 0, 0);

				// Draw Calibrated Millimeter Rulers
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: metadata.widthPx,
					heightPx: metadata.heightPx,
					pixelSpacingMmX: metadata.pixelSpacingX,
					pixelSpacingMmY: metadata.pixelSpacingY,
					showScaleBar: true,
				});

				// Synchronized Virtual Implant 3D Projection on Sagittal (X)
				if (studioMode === "implant" && implant3DWorld) {
					const vEntry = worldMmToVoxel(implant3DWorld.entry3D, volume);
					const vApex = worldMmToVoxel(implant3DWorld.apex3D, volume);
					const depthMax = volume.dimensions.depth - 1;

					const pEntry = { x: vEntry.y, y: depthMax - vEntry.z };
					const pApex = { x: vApex.y, y: depthMax - vApex.z };

					const spY = volume.spacingMm.y || 0.4;
					const rPlatPx = (implant3DWorld.platformDiameterMm / 2.0) / spY;
					const rApexPx = (implant3DWorld.apexDiameterMm / 2.0) / spY;
					const rHaloPlatPx = rPlatPx + 2.0 / spY;
					const rHaloApexPx = rApexPx + 2.0 / spY;

					const dx = pApex.x - pEntry.x;
					const dy = pApex.y - pEntry.y;
					const len = Math.hypot(dx, dy) || 1.0;
					const nx = -dy / len;
					const ny = dx / len;

					const statusColor = nerveAuditResult.isDangerous
						? "#ef4444"
						: nerveAuditResult.isWarning
							? "#f59e0b"
							: "#10b981";
					const statusFill = nerveAuditResult.isDangerous
						? "rgba(239, 68, 68, 0.45)"
						: nerveAuditResult.isWarning
							? "rgba(245, 158, 11, 0.4)"
							: "rgba(16, 185, 129, 0.35)";

					// 2.0 mm Safety Halo boundary
					ctx.strokeStyle = statusColor;
					ctx.lineWidth = 1.5;
					ctx.setLineDash([3, 2]);
					ctx.beginPath();
					ctx.moveTo(pEntry.x + nx * rHaloPlatPx, pEntry.y + ny * rHaloPlatPx);
					ctx.lineTo(pApex.x + nx * rHaloApexPx, pApex.y + ny * rHaloApexPx);
					ctx.lineTo(pApex.x - nx * rHaloApexPx, pApex.y - ny * rHaloApexPx);
					ctx.lineTo(pEntry.x - nx * rHaloPlatPx, pEntry.y - ny * rHaloPlatPx);
					ctx.closePath();
					ctx.stroke();
					ctx.setLineDash([]);

					// Tapered Implant cylinder body
					ctx.fillStyle = statusFill;
					ctx.strokeStyle = statusColor;
					ctx.lineWidth = 2.0;
					ctx.beginPath();
					ctx.moveTo(pEntry.x + nx * rPlatPx, pEntry.y + ny * rPlatPx);
					ctx.lineTo(pApex.x + nx * rApexPx, pApex.y + ny * rApexPx);
					ctx.lineTo(pApex.x - nx * rApexPx, pApex.y - ny * rApexPx);
					ctx.lineTo(pEntry.x - nx * rPlatPx, pEntry.y - ny * rPlatPx);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();

					// Central Axis
					ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
					ctx.lineWidth = 1.0;
					ctx.beginPath();
					ctx.moveTo(pEntry.x, pEntry.y);
					ctx.lineTo(pApex.x, pApex.y);
					ctx.stroke();

					// Tooth FDI badge
					ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
					ctx.strokeStyle = statusColor;
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.roundRect(pEntry.x - 14, Math.max(2, pEntry.y - 16), 28, 13, 3);
					ctx.fill();
					ctx.stroke();
					ctx.fillStyle = "#ffffff";
					ctx.font = "bold 9px monospace";
					ctx.textAlign = "center";
					ctx.fillText(`#${implant3DWorld.targetToothFdi}`, pEntry.x, Math.max(2, pEntry.y - 16) + 10);
				}

				const zPx = metadata.heightPx - 1 - vox.z;

				// Axial Slab MIP Bounding Corridor (Cyan #06b6d4)
				if (slabMode !== "single" && slabThicknessMm > 1.0) {
					drawRomexisSlabCorridor(ctx, {
						orientation: "horizontal",
						centerPx: zPx,
						thicknessMm: slabThicknessMm,
						pixelSpacingMm: metadata.pixelSpacingY,
						lengthPx: metadata.widthPx,
						colorRgba: ROMEXIS_COLORS.axialRgba(0.65),
						fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
					});
				}

				// Axial Crosshair Line (Horizontal: Cyan #06b6d4)
				ctx.strokeStyle = ROMEXIS_COLORS.axial;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.moveTo(0, zPx);
				ctx.lineTo(canvas.width, zPx);
				ctx.stroke();

				// Coronal Slab MIP Bounding Corridor (Orange #f59e0b)
				if (slabMode !== "single" && slabThicknessMm > 1.0) {
					drawRomexisSlabCorridor(ctx, {
						orientation: "vertical",
						centerPx: vox.y,
						thicknessMm: slabThicknessMm,
						pixelSpacingMm: metadata.pixelSpacingX,
						lengthPx: metadata.heightPx,
						colorRgba: ROMEXIS_COLORS.coronalRgba(0.65),
						fillColorRgba: ROMEXIS_COLORS.coronalRgba(0.08),
					});
				}

				// Coronal Crosshair Line (Vertical: Orange #f59e0b)
				ctx.strokeStyle = ROMEXIS_COLORS.coronal;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.moveTo(vox.y, 0);
				ctx.lineTo(vox.y, canvas.height);
				ctx.stroke();
			}
		}
	}, [volume, isOpen, crosshairMm, windowWidth, windowLevel, invertColors, slabMode, slabThicknessMm, archCurve, activeCrossSection, implant3DWorld, nerveAuditResult, studioMode]);

	// ─── RECONSTRUCT PANORAMIC & CROSS SECTIONS ───────────────────────────────
	useEffect(() => {
		if (!volume || !isOpen) return;

		// Reconstruct Panorama
		const pano = reconstructPanoramicView(volume, archCurve, {
			heightPx: 220,
			windowWidth,
			windowLevel,
		});
		setPanoramicData(pano);

		// Reconstruct Cross-Sections
		const csList = generateCrossSectionSlices(volume, archCurve, 1.5, 0.0, {
			windowWidth,
			windowLevel,
		});
		setCrossSections(csList);
	}, [volume, isOpen, archCurve, windowWidth, windowLevel, slabMode]);

	// ─── RENDER PANORAMIC VIEW WITH INTERACTIVE CROSS-SECTION FAN ─────────────
	useEffect(() => {
		if (!panoramicData || !panoCanvasRef.current) return;

		const canvas = panoCanvasRef.current;
		canvas.width = panoramicData.widthPx;
		canvas.height = panoramicData.heightPx;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// 1. Draw Panoramic Grayscale Radiograph
		const imgData = ctx.createImageData(panoramicData.widthPx, panoramicData.heightPx);
		imgData.data.set(panoramicData.pixelData);
		ctx.putImageData(imgData, 0, 0);

		// Draw Calibrated Millimeter Rulers on Panorama
		drawCalibratedMillimeterRulers(ctx, {
			widthPx: canvas.width,
			heightPx: canvas.height,
			pixelSpacingMmX: volume?.spacingMm.x ?? 0.4,
			pixelSpacingMmY: volume?.spacingMm.z ?? 0.4,
			showScaleBar: true,
		});

		// Draw Axial Plane Intersection Line (Cyan #06b6d4)
		if (volume) {
			const vox = worldMmToVoxel(crosshairMm, volume);
			const zNorm = 1.0 - (vox.z / (volume.dimensions.depth - 1));
			const zPx = Math.round(zNorm * canvas.height);

			// Axial Slab corridor on Panorama
			if (slabMode !== "single" && slabThicknessMm > 1.0) {
				drawRomexisSlabCorridor(ctx, {
					orientation: "horizontal",
					centerPx: zPx,
					thicknessMm: slabThicknessMm,
					pixelSpacingMm: volume.spacingMm.z,
					lengthPx: canvas.width,
					colorRgba: ROMEXIS_COLORS.axialRgba(0.6),
					fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
				});
			}

			ctx.strokeStyle = ROMEXIS_COLORS.axial;
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			ctx.moveTo(0, zPx);
			ctx.lineTo(canvas.width, zPx);
			ctx.stroke();
		}

		// 2. Draw Tooth Markers on Panorama
		for (const tm of panoramicData.toothMarkersOnPano) {
			ctx.strokeStyle = ROMEXIS_COLORS.panoramicRgba(0.4);
			ctx.lineWidth = 1;
			ctx.setLineDash([2, 3]);
			ctx.beginPath();
			ctx.moveTo(tm.xPx, 18);
			ctx.lineTo(tm.xPx, canvas.height - 18);
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
			ctx.beginPath();
			ctx.roundRect(tm.xPx - 10, 2, 20, 14, 3);
			ctx.fill();
			ctx.fillStyle = "#38bdf8";
			ctx.font = "bold 9px monospace";
			ctx.textAlign = "center";
			ctx.fillText(tm.toothFdi, tm.xPx, 12);
		}

		// 3. Draw Numbered Cross-Section Slice Fan Ticks (#1..#N)
		const fanTicks = getPanoramicSliceFanTicks(crossSections, panoramicData.widthPx, archCurve.totalArcLengthMm);
		for (let i = 0; i < fanTicks.length; i++) {
			const tick = fanTicks[i]!;
			const isActive = i === activeCrossSectionIdx;

			if (isActive) {
				// Highlighted active slice line with vibrant Romexis Yellow
				ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
				ctx.lineWidth = 2.0;
				ctx.beginPath();
				ctx.moveTo(tick.panoX, 0);
				ctx.lineTo(tick.panoX, canvas.height);
				ctx.stroke();

				// Active slice top/bottom badge
				ctx.fillStyle = ROMEXIS_COLORS.crossSection;
				ctx.beginPath();
				ctx.roundRect(tick.panoX - 16, canvas.height - 18, 32, 16, 4);
				ctx.fill();
				ctx.fillStyle = "#020617";
				ctx.font = "bold 9px monospace";
				ctx.textAlign = "center";
				ctx.fillText(`#${tick.sliceIndex}`, tick.panoX, canvas.height - 6);
			} else if (tick.isMajor) {
				// Major slice tick mark
				ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
				ctx.lineWidth = 1.0;
				ctx.beginPath();
				ctx.moveTo(tick.panoX, canvas.height - 10);
				ctx.lineTo(tick.panoX, canvas.height);
				ctx.stroke();

				ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
				ctx.font = "8px monospace";
				ctx.textAlign = "center";
				ctx.fillText(`${tick.sliceIndex}`, tick.panoX, canvas.height - 12);
			} else {
				// Minor slice tick mark
				ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
				ctx.lineWidth = 1.0;
				ctx.beginPath();
				ctx.moveTo(tick.panoX, canvas.height - 4);
				ctx.lineTo(tick.panoX, canvas.height);
				ctx.stroke();
			}
		}

		// 4. Synchronized Virtual Implant Silhouette on Panorama (OPG)
		if (studioMode === "implant" && activeCrossSection && implant3DWorld) {
			const panoX = mapSliceToPanoramicX(activeCrossSection, panoramicData.widthPx, archCurve.totalArcLengthMm);
			const panoH = canvas.height;
			const panoHMm = 38.0;
			const zTopMm = panoHMm / 2.0;

			const yEntryPx = Math.max(0, Math.min(panoH - 1, ((zTopMm - implant3DWorld.entry3D.z) / panoHMm) * panoH));
			const yApexPx = Math.max(0, Math.min(panoH - 1, ((zTopMm - implant3DWorld.apex3D.z) / panoHMm) * panoH));

			const pxPerMmY = panoH / panoHMm;
			const rPlatPx = (implant3DWorld.platformDiameterMm / 2.0) * pxPerMmY;
			const rApexPx = (implant3DWorld.apexDiameterMm / 2.0) * pxPerMmY;
			const rHaloPlatPx = rPlatPx + 2.0 * pxPerMmY;
			const rHaloApexPx = rApexPx + 2.0 * pxPerMmY;

			const statusColor = nerveAuditResult.isDangerous
				? "#ef4444"
				: nerveAuditResult.isWarning
					? "#f59e0b"
					: "#10b981";
			const statusFill = nerveAuditResult.isDangerous
				? "rgba(239, 68, 68, 0.55)"
				: nerveAuditResult.isWarning
					? "rgba(245, 158, 11, 0.45)"
					: "rgba(16, 185, 129, 0.4)";

			// Safety Corridor Halo on Panorama (2.0 mm)
			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([3, 2]);
			ctx.beginPath();
			ctx.moveTo(panoX - rHaloPlatPx, yEntryPx);
			ctx.lineTo(panoX + rHaloPlatPx, yEntryPx);
			ctx.lineTo(panoX + rHaloApexPx, yApexPx);
			ctx.lineTo(panoX - rHaloApexPx, yApexPx);
			ctx.closePath();
			ctx.stroke();
			ctx.setLineDash([]);

			// Implant Silhouette Body
			ctx.fillStyle = statusFill;
			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 2.0;
			ctx.beginPath();
			ctx.moveTo(panoX - rPlatPx, yEntryPx);
			ctx.lineTo(panoX + rPlatPx, yEntryPx);
			ctx.lineTo(panoX + rApexPx, yApexPx);
			ctx.lineTo(panoX - rApexPx, yApexPx);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// Central axis line
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.moveTo(panoX, yEntryPx);
			ctx.lineTo(panoX, yApexPx);
			ctx.stroke();

			// Tooth FDI Tag above implant
			ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(panoX - 18, Math.max(2, yEntryPx - 18), 36, 14, 3);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 9px monospace";
			ctx.textAlign = "center";
			ctx.fillText(`FDI #${implant3DWorld.targetToothFdi}`, panoX, Math.max(2, yEntryPx - 18) + 10);
		}
	}, [panoramicData, crossSections, activeCrossSectionIdx, activeCrossSection, implant3DWorld, nerveAuditResult, archCurve.totalArcLengthMm, volume, crosshairMm, slabMode, slabThicknessMm, studioMode]);

	// ─── RENDER ACTIVE CROSS-SECTION WITH IMPLANT & NERVE ─────────────────────
	useEffect(() => {
		if (!activeCrossSection || !crossSectionCanvasRef.current) return;

		const canvas = crossSectionCanvasRef.current;
		canvas.width = activeCrossSection.widthPx;
		canvas.height = activeCrossSection.heightPx;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// 1. Draw Resliced Bone Voxel Texture
		const imgData = ctx.createImageData(activeCrossSection.widthPx, activeCrossSection.heightPx);
		imgData.data.set(activeCrossSection.pixelData);
		ctx.putImageData(imgData, 0, 0);

		const pxSpacing = activeCrossSection.pixelSpacingMm;
		const centerX = canvas.width / 2;
		const topY = 20; // Alveolar crest baseline in pixels

		// 2. Draw Calibrated Millimeter Rulers and Grid
		drawCalibratedMillimeterRulers(ctx, {
			widthPx: canvas.width,
			heightPx: canvas.height,
			pixelSpacingMmX: pxSpacing,
			pixelSpacingMmY: pxSpacing,
			showGrid: true,
			showScaleBar: true,
		});

		// Draw Axial Reference Plane Line (Cyan #06b6d4)
		const centerY = canvas.height / 2;
		ctx.strokeStyle = ROMEXIS_COLORS.axialRgba(0.75);
		ctx.lineWidth = 1.0;
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(0, centerY);
		ctx.lineTo(canvas.width, centerY);
		ctx.stroke();
		ctx.setLineDash([]);

		// 3. Draw Mandibular Canal & Virtual Implant (Only in Implant Mode)
		if (studioMode === "implant") {
			const canalCenterX = centerX + (currentCanal.center.x / pxSpacing);
			const canalCenterY = topY + (currentCanal.center.y / pxSpacing);
			const canalRadiusPx = currentCanal.radiusMm / pxSpacing;
			const safetyRadiusPx = (currentCanal.radiusMm + currentCanal.safetyMarginMm) / pxSpacing;

			// Safety Corridor (Yellow/Red Ring)
			ctx.strokeStyle = nerveAuditResult.isDangerous
				? "rgba(239, 68, 68, 0.9)"
				: nerveAuditResult.isWarning
					? "rgba(245, 158, 11, 0.85)"
					: "rgba(34, 197, 94, 0.65)";
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 3]);
			ctx.beginPath();
			ctx.arc(canalCenterX, canalCenterY, safetyRadiusPx, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);

			// Canal Lumen
			ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
			ctx.strokeStyle = "#ef4444";
			ctx.lineWidth = 2.0;
			ctx.beginPath();
			ctx.arc(canalCenterX, canalCenterY, canalRadiusPx, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// 4. Draw Virtual Implant Caliper Outline with 2.0 mm Safety Halo
			const entryPxX = centerX + (currentImplantPose.entryPoint.x / pxSpacing);
			const entryPxY = topY + (currentImplantPose.entryPoint.y / pxSpacing);
			const radiusPx = (currentImplantSpec.diameterMm / 2.0) / pxSpacing;
			const haloRadiusPx = radiusPx + (2.0 / pxSpacing);

			ctx.save();
			ctx.translate(entryPxX, entryPxY);
			ctx.rotate((currentImplantPose.angulationDeg * Math.PI) / 180);

			const lengthPx = currentImplantSpec.lengthMm / pxSpacing;
			const haloLengthPx = lengthPx + (2.0 / pxSpacing);

			const statusStroke = nerveAuditResult.isDangerous
				? "#ef4444"
				: nerveAuditResult.isWarning
					? "#f59e0b"
					: "#10b981";
			const statusFill = nerveAuditResult.isDangerous
				? "rgba(239, 68, 68, 0.45)"
				: nerveAuditResult.isWarning
					? "rgba(245, 158, 11, 0.35)"
					: "rgba(16, 185, 129, 0.35)";

			// 2.0 mm IAN Safety Halo around implant body
			ctx.strokeStyle = statusStroke;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 3]);
			ctx.closePath();
			ctx.stroke();
			ctx.setLineDash([]);

			// Implant Body
			ctx.fillStyle = statusFill;
			ctx.strokeStyle = statusStroke;
			ctx.lineWidth = 2.0;

			ctx.beginPath();
			ctx.moveTo(-radiusPx, 0);
			ctx.lineTo(radiusPx, 0);
			ctx.lineTo(radiusPx * 0.7, lengthPx);
			ctx.lineTo(-radiusPx * 0.7, lengthPx);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// Central Axis
			ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(0, lengthPx);
			ctx.stroke();

			ctx.restore();
		}
	}, [activeCrossSection, currentCanal, currentImplantPose, currentImplantSpec, nerveAuditResult, studioMode]);

	// ─── INTERACTIVE PANORAMA CLICK & SCRUB TO JUMP TO CROSS-SECTION ──────────
	const handlePanoMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (crossSections.length === 0 || !panoCanvasRef.current) return;
		setIsDraggingPano(true);
		const rect = e.currentTarget.getBoundingClientRect();
		const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const panoX = normX * (panoCanvasRef.current.width - 1);
		const closestIdx = findNearestCrossSectionIndexByPanoX(
			panoX,
			panoCanvasRef.current.width,
			crossSections,
			archCurve.totalArcLengthMm,
		);
		setActiveCrossSectionIdx(closestIdx);
		const targetSlice = crossSections[closestIdx];
		if (targetSlice) {
			setCrosshairMm(targetSlice.centerPointMm);
		}
	}, [crossSections, archCurve.totalArcLengthMm]);

	const handlePanoMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDraggingPano || crossSections.length === 0 || !panoCanvasRef.current) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const panoX = normX * (panoCanvasRef.current.width - 1);
		const closestIdx = findNearestCrossSectionIndexByPanoX(
			panoX,
			panoCanvasRef.current.width,
			crossSections,
			archCurve.totalArcLengthMm,
		);
		setActiveCrossSectionIdx(closestIdx);
		const targetSlice = crossSections[closestIdx];
		if (targetSlice) {
			setCrosshairMm(targetSlice.centerPointMm);
		}
	}, [isDraggingPano, crossSections, archCurve.totalArcLengthMm]);

	const handlePanoMouseUp = useCallback(() => {
		setIsDraggingPano(false);
	}, []);

	// ─── INTERACTIVE CROSSHAIR DRAGGING & WHEEL NAVIGATION ────────────────────
	const handleCanvasMouseDown = useCallback((plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!volume) return;
		setIsDraggingCrosshair(plane);
		const rect = e.currentTarget.getBoundingClientRect();
		const normX = (e.clientX - rect.left) / rect.width;
		const normY = (e.clientY - rect.top) / rect.height;

		const dims = volume.dimensions;
		setCrosshairMm((prev) => {
			const vox = worldMmToVoxel(prev, volume);
			if (plane === "axial") {
				const vx = Math.round(normX * (dims.width - 1));
				const vy = Math.round(normY * (dims.height - 1));
				return voxelToWorldMm({ x: vx, y: vy, z: vox.z }, volume);
			}
			if (plane === "coronal") {
				const vx = Math.round(normX * (dims.width - 1));
				const vz = Math.round(normY * (dims.depth - 1));
				return voxelToWorldMm({ x: vx, y: vox.y, z: vz }, volume);
			}
			// Sagittal
			const vy = Math.round(normX * (dims.height - 1));
			const vz = Math.round(normY * (dims.depth - 1));
			return voxelToWorldMm({ x: vox.x, y: vy, z: vz }, volume);
		});
	}, [volume]);

	const handleCanvasMouseMove = useCallback((plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!volume || isDraggingCrosshair !== plane) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

		const dims = volume.dimensions;
		setCrosshairMm((prev) => {
			const vox = worldMmToVoxel(prev, volume);
			if (plane === "axial") {
				const vx = Math.round(normX * (dims.width - 1));
				const vy = Math.round(normY * (dims.height - 1));
				return voxelToWorldMm({ x: vx, y: vy, z: vox.z }, volume);
			}
			if (plane === "coronal") {
				const vx = Math.round(normX * (dims.width - 1));
				const vz = Math.round(normY * (dims.depth - 1));
				return voxelToWorldMm({ x: vx, y: vox.y, z: vz }, volume);
			}
			const vy = Math.round(normX * (dims.height - 1));
			const vz = Math.round(normY * (dims.depth - 1));
			return voxelToWorldMm({ x: vox.x, y: vy, z: vz }, volume);
		});
	}, [volume, isDraggingCrosshair]);

	const handleCanvasWheel = useCallback((plane: MprPlane, e: React.WheelEvent<HTMLCanvasElement>) => {
		if (!volume) return;
		e.preventDefault();
		const delta = e.deltaY > 0 ? -1 : 1;
		setCrosshairMm((prev) => {
			const vox = worldMmToVoxel(prev, volume);
			if (plane === "axial") {
				const newZ = Math.max(0, Math.min(volume.dimensions.depth - 1, vox.z + delta));
				return voxelToWorldMm({ x: vox.x, y: vox.y, z: newZ }, volume);
			}
			if (plane === "coronal") {
				const newY = Math.max(0, Math.min(volume.dimensions.height - 1, vox.y + delta));
				return voxelToWorldMm({ x: vox.x, y: newY, z: vox.z }, volume);
			}
			const newX = Math.max(0, Math.min(volume.dimensions.width - 1, vox.x + delta));
			return voxelToWorldMm({ x: newX, y: vox.y, z: vox.z }, volume);
		});
	}, [volume]);

	// ─── 1-CLICK CLINICAL EXPORT TO FORM 043/U ─────────────────────────────────
	const handleExportForm043Diary = useCallback(() => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		const diaryText = generateForm043CbctDiary({
			toothFdi: targetTooth,
			implantPose: currentImplantPose,
			canal: currentCanal,
			envelope: currentEnvelope,
			huSampling: huSamplingResult,
		});

		navigator.clipboard.writeText(diaryText).catch(() => {});
		if (onApplyToDiary043) {
			onApplyToDiary043(diaryText);
		}
		showToast(`Протокол КЛКТ-планирования для зуба FDI ${targetTooth} перенесен в Форму 043/у.`, "success");
	}, [activeCrossSection, currentImplantPose, currentCanal, currentEnvelope, huSamplingResult, onApplyToDiary043]);

	if (!isOpen) return null;

	// Helper render functions for each viewport
	const renderAxialViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("axial")}
			className={`relative bg-black rounded-md overflow-hidden border border-[#242a35] min-h-0 w-full h-full ${extraClassName}`}
			data-testid="cbct-viewport-container-axial"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative">
				<canvas
					ref={axialCanvasRef}
					onMouseDown={(e) => handleCanvasMouseDown("axial", e)}
					onMouseMove={(e) => handleCanvasMouseMove("axial", e)}
					onMouseUp={() => setIsDraggingCrosshair(null)}
					onWheel={(e) => handleCanvasWheel("axial", e)}
					className="max-w-full max-h-full object-contain cursor-crosshair"
				/>
				<CbctViewportHud
					viewportType="axial"
					coordinateMm={{ z: crosshairMm.z }}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
					isMaximized={maximizedViewport === "axial"}
					onToggleMaximize={() => handleToggleMaximize("axial")}
				/>
			</div>
		</div>
	);

	const renderCoronalViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("coronal")}
			className={`relative bg-black rounded-md overflow-hidden border border-[#242a35] min-h-0 w-full h-full ${extraClassName}`}
			data-testid="cbct-viewport-container-coronal"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative">
				<canvas
					ref={coronalCanvasRef}
					onMouseDown={(e) => handleCanvasMouseDown("coronal", e)}
					onMouseMove={(e) => handleCanvasMouseMove("coronal", e)}
					onMouseUp={() => setIsDraggingCrosshair(null)}
					onWheel={(e) => handleCanvasWheel("coronal", e)}
					className="max-w-full max-h-full object-contain cursor-crosshair"
				/>
				<CbctViewportHud
					viewportType="coronal"
					coordinateMm={{ y: crosshairMm.y }}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
					isMaximized={maximizedViewport === "coronal"}
					onToggleMaximize={() => handleToggleMaximize("coronal")}
				/>
			</div>
		</div>
	);

	const renderSagittalViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("sagittal")}
			className={`relative bg-black rounded-md overflow-hidden border border-[#242a35] min-h-0 w-full h-full ${extraClassName}`}
			data-testid="cbct-viewport-container-sagittal"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative">
				<canvas
					ref={sagittalCanvasRef}
					onMouseDown={(e) => handleCanvasMouseDown("sagittal", e)}
					onMouseMove={(e) => handleCanvasMouseMove("sagittal", e)}
					onMouseUp={() => setIsDraggingCrosshair(null)}
					onWheel={(e) => handleCanvasWheel("sagittal", e)}
					className="max-w-full max-h-full object-contain cursor-crosshair"
				/>
				<CbctViewportHud
					viewportType="sagittal"
					coordinateMm={{ x: crosshairMm.x }}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.y ?? 0.4}
					isMaximized={maximizedViewport === "sagittal"}
					onToggleMaximize={() => handleToggleMaximize("sagittal")}
				/>
			</div>
		</div>
	);

	const renderPanoramicViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("panoramic")}
			className={`relative bg-black rounded-md overflow-hidden border border-[#242a35] min-h-0 w-full h-full ${extraClassName}`}
			data-testid="cbct-viewport-container-panoramic"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative">
				<canvas
					ref={panoCanvasRef}
					onMouseDown={handlePanoMouseDown}
					onMouseMove={handlePanoMouseMove}
					onMouseUp={handlePanoMouseUp}
					onMouseLeave={handlePanoMouseUp}
					className="max-w-full max-h-full object-contain cursor-pointer"
					data-testid="cbct-panorama-canvas"
				/>
				<CbctViewportHud
					viewportType="panoramic"
					coordinateMm={{ z: crosshairMm.z }}
					slabMode={slabMode}
					slabThicknessMm={archCurve.focalTroughThicknessMm}
					pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
					isMaximized={maximizedViewport === "panoramic"}
					onToggleMaximize={() => handleToggleMaximize("panoramic")}
				/>
			</div>
		</div>
	);

	const renderCrossSectionMaximizedViewport = () => (
		<div
			onDoubleClick={() => handleToggleMaximize("cross_section")}
			className="relative bg-black rounded-md overflow-hidden border border-[#242a35] flex-1 flex flex-col min-h-0 w-full h-full"
			data-testid="cbct-viewport-container-cross-section"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative">
				<canvas
					ref={crossSectionCanvasRef}
					className="max-w-full max-h-full object-contain"
				/>
				<CbctViewportHud
					viewportType="cross_section"
					toothFdi={activeCrossSection?.nearestToothFdi}
					sliceIndex={activeCrossSectionIdx}
					totalSlices={crossSections.length}
					pixelSpacingMm={activeCrossSection?.pixelSpacingMm ?? 0.25}
					isMaximized={true}
					onToggleMaximize={() => handleToggleMaximize("cross_section")}
				/>
			</div>
		</div>
	);

	return createPortal(
		<div
			id={`cbct-mpr-studio-modal-${modalId}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby={`cbct-studio-title-${modalId}`}
			className="fixed inset-0 z-[100] flex flex-col bg-[#0c0e12] text-[#e2e8f0] font-sans select-none overflow-hidden"
		>
			{/* ─── HEADER BAR (TIER 1 HOT CONTROLS) ───────────────────────────── */}
			<header className="min-h-14 px-4 py-1.5 bg-[#14171e] border-b border-[#242a35] flex items-center justify-between shrink-0 gap-3 overflow-x-auto">
				<div className="flex items-center gap-2.5 shrink-0 min-w-max">
					<div className="w-8 h-8 rounded-md bg-[#1e2430] border border-[#242a35] flex items-center justify-center text-[#38bdf8] shrink-0">
						<Box className="w-4 h-4" />
					</div>
					<div className="shrink-0 min-w-max">
						<h2 id={`cbct-studio-title-${modalId}`} className="text-xs font-bold text-[#e2e8f0] tracking-wide flex items-center gap-1.5 whitespace-nowrap">
							3D КЛКТ MPR & Диагностическая Студия
							<span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1e2430] text-[#94a3b8] font-mono border border-[#242a35]">
								Romexis 6 / Ez3D-i
							</span>
						</h2>
						<p className="text-[10px] text-[#94a3b8] whitespace-nowrap">
							Сквозная 3D проекция · Веер срезов ОПТГ · Анатомическая плотность (HU)
						</p>
					</div>
				</div>

				{/* Center Toolbar: Studio Modes, Viewport Layout, WW/WL Presets & Tools */}
				<div className="flex items-center gap-2 overflow-x-auto shrink-0 py-1">
					{/* 1. Clinical Studio Mode Selector (Diagnostic vs Implant) */}
					<div className="flex items-center bg-[#0c0e12] p-0.5 rounded-md border border-[#242a35] shrink-0">
						<button
							type="button"
							onClick={() => setStudioMode("diagnostic")}
							className={`px-2.5 py-1 rounded-sm text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center gap-1.5 transition-colors ${
								studioMode === "diagnostic"
									? "bg-[#2563eb] text-white shadow-xs"
									: "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"
							}`}
							data-testid="cbct-mode-diagnostic-btn"
						>
							<Search className="w-3.5 h-3.5" />
							<span>Диагностика</span>
						</button>
						<button
							type="button"
							onClick={() => setStudioMode("implant")}
							className={`px-2.5 py-1 rounded-sm text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center gap-1.5 transition-colors ${
								studioMode === "implant"
									? "bg-[#2563eb] text-white shadow-xs"
									: "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"
							}`}
							data-testid="cbct-mode-implant-btn"
						>
							<Compass className="w-3.5 h-3.5" />
							<span>Имплантация</span>
						</button>
					</div>

					{/* 2. Viewport Layout Mode Selector */}
					<div className="flex items-center bg-[#0c0e12] p-0.5 rounded-md border border-[#242a35] shrink-0">
						{maximizedViewport !== null ? (
							<button
								type="button"
								onClick={() => setMaximizedViewport(null)}
								className="px-2.5 py-1 rounded-sm text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center gap-1.5 bg-[#1e2430] hover:bg-[#2a3242] text-amber-300 border border-amber-500/40 shadow-xs transition-colors"
								data-testid="cbct-restore-grid-btn"
								title="Восстановить сетку окон"
							>
								<Minimize2 className="w-3.5 h-3.5" />
								<span>Восстановить (2x2)</span>
							</button>
						) : (
							<>
								<button
									type="button"
									onClick={() => setViewLayout("quad_view")}
									className={`px-2.5 py-1 rounded-sm text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center gap-1 transition-colors ${
										viewLayout === "quad_view"
											? "bg-[#1e2430] text-white border border-[#334155]"
											: "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"
									}`}
									data-testid="cbct-layout-quad-btn"
									title="Сетка 4 окна (2x2)"
								>
									<Grid2X2 className="w-3.5 h-3.5" />
									<span>4 окна</span>
								</button>
								<button
									type="button"
									onClick={() => setViewLayout("layout_1_plus_3")}
									className={`px-2.5 py-1 rounded-sm text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center gap-1 transition-colors ${
										viewLayout === "layout_1_plus_3"
											? "bg-[#1e2430] text-white border border-[#334155]"
											: "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"
									}`}
									data-testid="cbct-layout-1plus3-btn"
									title="Раскладка 1+3 (Доминантный аксиал)"
								>
									<Columns2 className="w-3.5 h-3.5" />
									<span>1+3</span>
								</button>
							</>
						)}
					</div>

					{/* 3. HU Window/Level Presets */}
					<div className="flex items-center bg-[#0c0e12] p-0.5 rounded-md border border-[#242a35] shrink-0">
						{CBCT_HOUNSFIELD_PRESETS.map((p) => (
							<button
								key={p.id}
								type="button"
								onClick={() => handleSelectPreset(p.id)}
								className={`px-2.5 py-1 rounded-sm text-xs font-medium whitespace-nowrap min-h-[36px] transition-colors ${
									activePreset === p.id
										? "bg-[#1e2430] text-[#38bdf8] font-bold border border-[#334155]"
										: "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"
								}`}
								data-testid={`cbct-hu-preset-${p.id}`}
							>
								{p.label.split(" ")[0]}
							</button>
						))}
					</div>

					{/* 4. Slab Thickness Modes */}
					<div className="flex items-center bg-[#0c0e12] p-0.5 rounded-md border border-[#242a35] shrink-0">
						<button
							type="button"
							onClick={() => setSlabMode("single")}
							className={`px-2.5 py-1 rounded-sm text-xs font-medium whitespace-nowrap min-h-[36px] flex items-center justify-center transition-colors ${slabMode === "single" ? "bg-[#1e2430] text-white font-bold border border-[#334155]" : "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"}`}
							data-testid="cbct-mpr-slab-single-btn"
						>
							Срез 1 мм
						</button>
						<button
							type="button"
							onClick={() => setSlabMode("mip")}
							className={`px-2.5 py-1 rounded-sm text-xs font-medium whitespace-nowrap min-h-[36px] flex items-center justify-center transition-colors ${slabMode === "mip" ? "bg-[#1e2430] text-white font-bold border border-[#334155]" : "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"}`}
							data-testid="cbct-mpr-slab-mip-btn"
						>
							Slab MIP
						</button>
						<button
							type="button"
							onClick={() => setSlabMode("average")}
							className={`px-2.5 py-1 rounded-sm text-xs font-medium whitespace-nowrap min-h-[36px] flex items-center justify-center transition-colors ${slabMode === "average" ? "bg-[#1e2430] text-white font-bold border border-[#334155]" : "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"}`}
							data-testid="cbct-mpr-slab-avg-btn"
						>
							Avg IP
						</button>
					</div>

					{/* 5. Jaw Toggle */}
					<div className="flex items-center bg-[#0c0e12] p-0.5 rounded-md border border-[#242a35] shrink-0">
						<button
							type="button"
							onClick={() => handleToggleJawType("mandible")}
							className={`px-2.5 py-1 rounded-sm text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center justify-center transition-colors ${jawType === "mandible" ? "bg-[#1e2430] text-amber-300 border border-amber-500/40" : "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"}`}
							data-testid="cbct-jaw-mandible-btn"
						>
							Н. челюсть
						</button>
						<button
							type="button"
							onClick={() => handleToggleJawType("maxilla")}
							className={`px-2.5 py-1 rounded-sm text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center justify-center transition-colors ${jawType === "maxilla" ? "bg-[#1e2430] text-amber-300 border border-amber-500/40" : "bg-transparent text-[#94a3b8] hover:text-[#e2e8f0]"}`}
							data-testid="cbct-jaw-maxilla-btn"
						>
							В. челюсть
						</button>
					</div>

					{/* Web Audio Sentinel Mute/Unmute Toggle */}
					<button
						type="button"
						onClick={() => setIsAudioEnabled((prev) => !prev)}
						className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center gap-1.5 transition-colors border ${
							isAudioEnabled
								? "bg-[#1e2430] text-cyan-300 border-cyan-500/40"
								: "bg-[#14171e] text-[#94a3b8] border-[#242a35] hover:text-[#e2e8f0]"
						}`}
						title={isAudioEnabled ? "Звуковой алерт нерва включен" : "Звуковой алерт нерва выключен"}
						data-testid="cbct-audio-alarm-toggle-btn"
					>
						{isAudioEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-[#94a3b8]" />}
						<span>{isAudioEnabled ? "Звук IAN" : "Без звука"}</span>
					</button>

					{/* Real DICOM Ingestion Controls */}
					<input
						type="file"
						multiple
						ref={folderInputRef}
						onChange={handleSelectDicomFolder}
						data-testid="cbct-dicom-files-input"
						className="hidden"
						aria-hidden="true"
					/>
					<input
						type="file"
						accept=".zip"
						ref={zipInputRef}
						onChange={handleSelectDicomZip}
						data-testid="cbct-dicom-zip-input"
						className="hidden"
						aria-hidden="true"
					/>
					<button
						type="button"
						onClick={() => folderInputRef.current?.click()}
						className="px-2.5 py-1 rounded-md bg-[#1e2430] hover:bg-[#2a3242] text-[#e2e8f0] border border-[#242a35] text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center gap-1.5 transition-colors shadow-xs"
						data-testid="cbct-upload-dicom-folder-btn"
						title="Загрузить папку реальных срезов DICOM (.dcm)"
					>
						<FolderOpen className="w-3.5 h-3.5 text-[#38bdf8]" />
						<span>Папка DICOM</span>
					</button>
					<button
						type="button"
						onClick={() => zipInputRef.current?.click()}
						className="px-2.5 py-1 rounded-md bg-[#1e2430] hover:bg-[#2a3242] text-[#e2e8f0] border border-[#242a35] text-xs font-bold whitespace-nowrap min-h-[36px] flex items-center gap-1.5 transition-colors shadow-xs"
						data-testid="cbct-upload-dicom-zip-btn"
						title="Загрузить ZIP-архив КЛКТ"
					>
						<FileArchive className="w-3.5 h-3.5 text-[#94a3b8]" />
						<span>ZIP КТ</span>
					</button>

					{/* Real Patient Metadata Badge */}
					<div
						className="hidden xl:flex items-center gap-2 px-2.5 py-1 bg-[#0c0e12] rounded-md border border-[#242a35] text-[11px] font-mono shrink-0"
						data-testid="cbct-patient-metadata-badge"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
						<span className="text-[#e2e8f0] font-bold">{patientDisplayName}</span>
						<span className="text-[#64748b]">|</span>
						<span className="text-cyan-300 font-semibold">{loadedSliceCount} срезов</span>
						{volume && (
							<>
								<span className="text-[#64748b]">|</span>
								<span className="text-[#94a3b8]">{volume.dimensions.width}x{volume.dimensions.height}x{volume.dimensions.depth}</span>
								<span className="text-[#64748b]">|</span>
								<span className="text-amber-300 font-semibold">{volume.spacingMm.x.toFixed(2)} мм/vox</span>
							</>
						)}
					</div>
				</div>

				{/* Right Actions: 1-Click Form 043 & Close */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={handleExportForm043Diary}
						className="px-3 py-1.5 rounded-md bg-[#1e2430] hover:bg-[#2a3242] text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-xs flex items-center gap-1.5 min-h-[36px] whitespace-nowrap transition-colors"
						data-testid="cbct-export-diary-btn"
					>
						<FileText className="w-3.5 h-3.5" />
						<span>В карту 043/у</span>
					</button>

					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 rounded-md bg-[#1e2430] hover:bg-[#2a3242] text-[#94a3b8] hover:text-white flex items-center justify-center min-h-[36px] min-w-[36px] border border-[#242a35] transition-colors"
						aria-label="Закрыть КЛКТ студию"
						data-testid="close-cbct-mpr-3d-studio-btn"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</header>

			{/* ─── MOBILE VIEWPORT TABS (VISIBLE ONLY ON < LG SCREENS) ─────────── */}
			<div className="lg:hidden flex items-center bg-[#14171e] border-b border-[#242a35] p-1.5 shrink-0 gap-1.5 overflow-x-auto min-w-0">
				<button
					type="button"
					onClick={() => setMobileActiveTab("axial")}
					className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 ${
						mobileActiveTab === "axial"
							? "bg-[#2563eb] text-white shadow-xs"
							: "bg-[#1e2430] text-[#94a3b8] hover:bg-[#2a3242]"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-cyan-400" />
					Аксиальный (Z)
				</button>
				<button
					type="button"
					onClick={() => setMobileActiveTab("coronal")}
					className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 ${
						mobileActiveTab === "coronal"
							? "bg-[#2563eb] text-white shadow-xs"
							: "bg-[#1e2430] text-[#94a3b8] hover:bg-[#2a3242]"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-amber-400" />
					Фронтальный (Y)
				</button>
				<button
					type="button"
					onClick={() => setMobileActiveTab("sagittal")}
					className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 ${
						mobileActiveTab === "sagittal"
							? "bg-[#2563eb] text-white shadow-xs"
							: "bg-[#1e2430] text-[#94a3b8] hover:bg-[#2a3242]"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-emerald-400" />
					Сагиттальный (X)
				</button>
				<button
					type="button"
					onClick={() => setMobileActiveTab("panoramic")}
					className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 ${
						mobileActiveTab === "panoramic"
							? "bg-[#2563eb] text-white shadow-xs"
							: "bg-[#1e2430] text-[#94a3b8] hover:bg-[#2a3242]"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-purple-400" />
					ОПТГ
				</button>
				<button
					type="button"
					onClick={() => setMobileActiveTab("planner")}
					className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 ${
						mobileActiveTab === "planner"
							? "bg-[#2563eb] text-white shadow-xs"
							: "bg-[#1e2430] text-[#94a3b8] hover:bg-[#2a3242]"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-yellow-400" />
					{studioMode === "diagnostic" ? "Срезы & HU" : "Имплант-план"}
				</button>
			</div>

			{/* ─── MAIN WORKSPACE (VIEWPORTS + SIDEBAR INSPECTOR) ─────────────── */}
			<div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-1 p-1 bg-[#0c0e12] min-h-0 overflow-hidden">
				{/* ─── VIEWPORTS DISPLAY (COLS 1..8 ON DESKTOP) ────────────────── */}
				<div className={`lg:col-span-8 ${mobileActiveTab === "planner" ? "hidden lg:flex" : "flex-1 flex flex-col"} min-h-0`}>
					{maximizedViewport !== null ? (
						<div className="flex-1 flex flex-col min-h-0 w-full">
							{maximizedViewport === "axial" && renderAxialViewport("flex-1 flex flex-col")}
							{maximizedViewport === "coronal" && renderCoronalViewport("flex-1 flex flex-col")}
							{maximizedViewport === "sagittal" && renderSagittalViewport("flex-1 flex flex-col")}
							{maximizedViewport === "panoramic" && renderPanoramicViewport("flex-1 flex flex-col")}
							{maximizedViewport === "cross_section" && renderCrossSectionMaximizedViewport()}
						</div>
					) : viewLayout === "layout_1_plus_3" ? (
						<div className="flex-1 grid grid-cols-12 gap-1 min-h-0">
							<div className={`col-span-12 lg:col-span-8 min-h-0 ${mobileActiveTab === "axial" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
								{renderAxialViewport("flex-1 flex flex-col")}
							</div>
							<div className="col-span-12 lg:col-span-4 min-h-0 flex flex-col lg:grid lg:grid-rows-3 gap-1">
								{renderCoronalViewport(mobileActiveTab === "coronal" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col")}
								{renderSagittalViewport(mobileActiveTab === "sagittal" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col")}
								{renderPanoramicViewport(mobileActiveTab === "panoramic" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col")}
							</div>
						</div>
					) : (
						<div className="flex-1 grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-1 min-h-0">
							{renderAxialViewport(mobileActiveTab === "axial" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col")}
							{renderCoronalViewport(mobileActiveTab === "coronal" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col")}
							{renderSagittalViewport(mobileActiveTab === "sagittal" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col")}
							{renderPanoramicViewport(mobileActiveTab === "panoramic" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col")}
						</div>
					)}
				</div>

				{/* ─── RIGHT SIDEBAR: DIAGNOSTIC INSPECTOR & IMPLANT PLANNER (COLS 9..12) ─── */}
				<aside className={`lg:col-span-4 ${mobileActiveTab === "planner" ? "flex-1 flex flex-col min-h-0" : "hidden lg:flex lg:flex-col"} bg-[#14171e] rounded-md border border-[#242a35] min-h-0 overflow-y-auto p-3 flex flex-col gap-3`}>
					{/* Active Cross-Section Carousel Header */}
					<div className="flex items-center justify-between pb-2 border-b border-[#242a35]">
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold text-[#38bdf8]">
								Срез #{activeCrossSection?.sliceIndex ?? 1} из {crossSections.length}
							</span>
							<span className="px-2 py-0.5 rounded bg-[#1e2430] text-[#e2e8f0] font-bold text-xs border border-[#242a35]">
								Зуб FDI: #{activeCrossSection?.nearestToothFdi ?? "46"}
							</span>
						</div>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setActiveCrossSectionIdx((prev) => Math.max(0, prev - 1))}
								className="p-1 rounded bg-[#1e2430] hover:bg-[#2a3242] text-[#94a3b8] hover:text-[#e2e8f0] min-h-[32px] min-w-[32px] flex items-center justify-center border border-[#242a35] transition-colors"
								title="Предыдущий срез"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={() => setActiveCrossSectionIdx((prev) => Math.min(crossSections.length - 1, prev + 1))}
								className="p-1 rounded bg-[#1e2430] hover:bg-[#2a3242] text-[#94a3b8] hover:text-[#e2e8f0] min-h-[32px] min-w-[32px] flex items-center justify-center border border-[#242a35] transition-colors"
								title="Следующий срез"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Cross-Section Viewport Canvas */}
					<div
						onDoubleClick={() => handleToggleMaximize("cross_section")}
						className="relative h-56 bg-black rounded-md overflow-hidden border border-[#242a35] flex items-center justify-center shrink-0"
					>
						<canvas
							ref={crossSectionCanvasRef}
							className="max-w-full max-h-full object-contain"
						/>
						<CbctViewportHud
							viewportType="cross_section"
							toothFdi={activeCrossSection?.nearestToothFdi}
							sliceIndex={activeCrossSectionIdx}
							totalSlices={crossSections.length}
							pixelSpacingMm={activeCrossSection?.pixelSpacingMm ?? 0.25}
							isMaximized={maximizedViewport === "cross_section"}
							onToggleMaximize={() => handleToggleMaximize("cross_section")}
						/>

						{/* Quick Ridge Measurements Badge (positioned top-right to avoid overlapping bottom scale bar) */}
						<div className="absolute top-2 right-12 px-2 py-0.5 rounded bg-[#14171e] text-[9px] text-[#94a3b8] border border-[#242a35] font-mono shadow-sm flex items-center gap-2">
							<span>H: <strong className="text-[#38bdf8]">{activeCrossSection?.corticalCrestHeightMm ?? 14.2} мм</strong></span>
							<span>W: <strong className="text-[#38bdf8]">{activeCrossSection?.alveolarRidgeWidthMm ?? 7.8} мм</strong></span>
						</div>
					</div>

					{/* ─── CONDITIONAL SIDEBAR CONTENT: DIAGNOSTIC vs IMPLANT ───────── */}
					{studioMode === "diagnostic" ? (
						<div className="flex flex-col gap-3">
							{/* Diagnostic HU & Tissue Structure Inspector */}
							<div className="p-3 rounded-md bg-[#0c0e12] border border-[#242a35] flex flex-col gap-2">
								<div className="flex items-center justify-between text-xs">
									<span className="font-bold text-[#e2e8f0]">Плотность в курсоре:</span>
									<span className="px-2 py-0.5 rounded bg-[#1e2430] text-[#38bdf8] font-mono font-bold border border-[#242a35]">
										{sampledVoxelHU} HU
									</span>
								</div>
								<div className="text-[11px] text-[#94a3b8]">
									Структура: <strong className="text-[#e2e8f0]">{getTissueNameFromHU(sampledVoxelHU)}</strong>
								</div>
								<div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#94a3b8] pt-1.5 border-t border-[#242a35]">
									<div>Эмаль: <span className="font-mono text-[#e2e8f0]">+2000..+3000</span></div>
									<div>Кортекс: <span className="font-mono text-[#e2e8f0]">+1000..+1800</span></div>
									<div>Спонгиоза: <span className="font-mono text-[#e2e8f0]">+300..+800</span></div>
									<div>Пазухи: <span className="font-mono text-[#e2e8f0]">-1000..-500</span></div>
								</div>
							</div>

							{/* Radiological Anatomical Inspection Checklist */}
							<div className="p-3 rounded-md bg-[#0c0e12] border border-[#242a35] flex flex-col gap-2">
								<div className="text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5">
									<Search className="w-3.5 h-3.5 text-[#38bdf8]" />
									<span>Анатомический осмотр зоны #{activeCrossSection?.nearestToothFdi ?? "46"}:</span>
								</div>
								<div className="flex flex-col gap-1 text-[11px] text-[#94a3b8]">
									<div className="flex items-center gap-2 p-1.5 rounded bg-[#14171e] border border-[#242a35]">
										<Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
										<span>Кортикальные пластинки & гребень сохранны</span>
									</div>
									<div className="flex items-center gap-2 p-1.5 rounded bg-[#14171e] border border-[#242a35]">
										<Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
										<span>Периодонтальная щель & апексы корней</span>
									</div>
									<div className="flex items-center gap-2 p-1.5 rounded bg-[#14171e] border border-[#242a35]">
										<Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
										<span>Пневматизация синуса / канал IAN</span>
									</div>
								</div>
							</div>

							{/* Fast Switch to Implant Planning Button */}
							<button
								type="button"
								onClick={() => setStudioMode("implant")}
								className="w-full py-2 px-3 rounded-md bg-[#1e2430] hover:bg-[#2a3242] text-[#e2e8f0] hover:text-white border border-[#242a35] text-xs font-bold flex items-center justify-center gap-2 transition-colors min-h-[40px] shadow-xs"
								data-testid="cbct-switch-to-implant-mode-btn"
							>
								<Compass className="w-4 h-4 text-[#38bdf8]" />
								<span>Перейти к планированию имплантата</span>
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{/* ─── MANDIBULAR NERVE SAFETY ALARM BANNER (2.0 MM HALO SENTINEL) ── */}
							<div
								className={`p-2.5 rounded-md border flex items-start gap-2 transition-colors ${
									nerveAuditResult.isDangerous
										? "bg-[#2d1215] border-rose-600 text-rose-200"
										: nerveAuditResult.isWarning
											? "bg-[#2d2212] border-amber-600 text-amber-200"
											: "bg-[#12241b] border-emerald-600 text-emerald-200"
								}`}
								data-testid="cbct-nerve-safety-banner"
							>
								{nerveAuditResult.isDangerous ? (
									<ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
								) : nerveAuditResult.isWarning ? (
									<AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
								) : (
									<ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
								)}
								<div className="text-xs">
									<div className="font-bold flex items-center justify-between">
										<span>Зазор до нерва (IAN): {nerveAuditResult.netClearanceToCanalWallMm.toFixed(1)} мм</span>
										<span className="text-[10px] px-1 py-0.2 rounded bg-black/40 font-mono">
											Норма {">="} 2.0 мм
										</span>
									</div>
									<p className="text-[10px] mt-0.5 opacity-90 leading-tight">
										{nerveAuditResult.clinicalMessageRu}
									</p>
								</div>
							</div>

							{/* ─── MISCH BONE DENSITY (HU) & DRILLING PROTOCOL ────────────── */}
							<div className="p-2.5 rounded-md bg-[#0c0e12] border border-[#242a35] flex flex-col gap-2">
								<div className="flex items-center justify-between text-xs">
									<span className="font-bold text-[#94a3b8]">Плотность кости (Misch):</span>
									<span className="px-2 py-0.5 rounded bg-[#1e2430] text-[#38bdf8] font-bold border border-[#242a35]">
										Класс {mischClassification.mischClass} ({huSamplingResult.overallMeanHU} HU)
									</span>
								</div>
								<div className="grid grid-cols-3 gap-1 text-center text-[10px] bg-[#14171e] p-1.5 rounded border border-[#242a35]">
									<div>
										<div className="text-[#94a3b8]">Кортекс</div>
										<div className="font-mono font-bold text-[#38bdf8]">{huSamplingResult.coronalCrestalHU} HU</div>
									</div>
									<div>
										<div className="text-[#94a3b8]">Спонгиоза</div>
										<div className="font-mono font-bold text-[#38bdf8]">{huSamplingResult.trabecularCoreHU} HU</div>
									</div>
									<div>
										<div className="text-[#94a3b8]">Апекс</div>
										<div className="font-mono font-bold text-[#38bdf8]">{huSamplingResult.apicalBaseHU} HU</div>
									</div>
								</div>
								<div className="text-[10px] text-[#94a3b8]">
									Протокол: <strong className="text-[#e2e8f0]">{mischClassification.recommendedDrillingRpm}</strong>.
									{mischClassification.underdrillingRecommended && (
										<span className="text-amber-400 font-semibold ml-1">Недопрепарирование (Underdrilling).</span>
									)}
								</div>
							</div>

							{/* ─── VIRTUAL IMPLANT CALIPER SELECTION ───────────────────────── */}
							<div className="p-2.5 rounded-md bg-[#0c0e12] border border-[#242a35] flex flex-col gap-2">
								<div className="text-xs font-bold text-[#94a3b8]">Выбор имплантата (Библиотека):</div>

								{/* Brand selector */}
								<div className="grid grid-cols-4 gap-1">
									{(["straumann", "nobel_biocare", "osstem", "dentium"] as ImplantBrandKey[]).map((b) => (
										<button
											key={b}
											type="button"
											onClick={() => setSelectedBrand(b)}
											className={`py-1 rounded text-xs font-bold capitalize min-h-[32px] transition-colors border ${
												selectedBrand === b
													? "bg-[#2563eb] text-white border-blue-500 shadow-xs"
													: "bg-[#1e2430] text-[#94a3b8] hover:text-[#e2e8f0] border-[#242a35]"
											}`}
										>
											{b === "straumann" ? "Straumann" : b === "nobel_biocare" ? "Nobel" : b === "osstem" ? "Osstem" : "Dentium"}
										</button>
									))}
								</div>

								{/* Diameter & Length Selectors */}
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div>
										<label className="text-[10px] text-[#94a3b8] block mb-0.5">Диаметр (мм):</label>
										<select
											value={selectedDiameterMm}
											onChange={(e) => setSelectedDiameterMm(Number.parseFloat(e.target.value))}
											className="w-full bg-[#1e2430] border border-[#242a35] rounded p-1 text-xs text-[#e2e8f0] min-h-[32px]"
										>
											<option value={3.5}>Ø 3.5 мм (Узкий)</option>
											<option value={4.0}>Ø 4.0 мм (Стандарт)</option>
											<option value={4.3}>Ø 4.3 мм</option>
											<option value={4.5}>Ø 4.5 мм (Широкий)</option>
											<option value={5.0}>Ø 5.0 мм (Молярный)</option>
										</select>
									</div>

									<div>
										<label className="text-[10px] text-[#94a3b8] block mb-0.5">Длина (мм):</label>
										<select
											value={selectedLengthMm}
											onChange={(e) => setSelectedLengthMm(Number.parseFloat(e.target.value))}
											className="w-full bg-[#1e2430] border border-[#242a35] rounded p-1 text-xs text-[#e2e8f0] min-h-[32px]"
										>
											<option value={8.0}>L 8.0 мм</option>
											<option value={10.0}>L 10.0 мм</option>
											<option value={11.5}>L 11.5 мм</option>
											<option value={13.0}>L 13.0 мм</option>
										</select>
									</div>
								</div>

								{/* Angulation Slider */}
								<div className="flex flex-col gap-0.5 text-xs">
									<div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
										<span>Наклон оси (Tilt):</span>
										<span className="font-mono font-bold text-[#e2e8f0]">{implantAngulationDeg}°</span>
									</div>
									<input
										type="range"
										min={-30}
										max={30}
										step={1}
										value={implantAngulationDeg}
										onChange={(e) => setImplantAngulationDeg(Number.parseInt(e.target.value, 10))}
										className="w-full accent-blue-500 min-h-[28px]"
									/>
								</div>

								{/* Horizontal Entry Offset Slider */}
								<div className="flex flex-col gap-0.5 text-xs">
									<div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
										<span>Смещение X на гребне:</span>
										<span className="font-mono font-bold text-[#e2e8f0]">{implantEntryXOffsetMm.toFixed(1)} мм</span>
									</div>
									<input
										type="range"
										min={-5.0}
										max={5.0}
										step={0.5}
										value={implantEntryXOffsetMm}
										onChange={(e) => setImplantEntryXOffsetMm(Number.parseFloat(e.target.value))}
										className="w-full accent-blue-500 min-h-[28px]"
									/>
								</div>
							</div>
						</div>
					)}
				</aside>
			</div>
		</div>,
		document.body,
	);
};

