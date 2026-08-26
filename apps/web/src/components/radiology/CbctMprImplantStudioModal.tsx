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
	Compass,
	Copy,
	Crosshair,
	Download,
	Eye,
	FileText,
	Info,
	Layers,
	Maximize2,
	Minimize2,
	Play,
	Plus,
	RotateCw,
	Ruler,
	Save,
	Scan,
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Spline,
	Trash2,
	Volume2,
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
	createSyntheticDentalCbctVolume,
	disposeCbctVolume,
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
	buildDentalArchCurve,
	createDentalArchCurve,
	generateCrossSectionSlices,
	generateCrossSectionsAlongArch,
	reconstructPanoramicOpg,
	reconstructPanoramicView,
} from "./dentalCurveEngine";
import {
	STANDARD_IMPLANT_CATALOG,
	type CrossSectionImplantPose,
	type ImplantBrandKey,
	type MandibularCanalCrossSection,
	type VirtualImplantSpec,
	auditAlveolarBoneContainment,
	auditNerveSafetyMargin,
	calculateApexCoordinates,
	generateForm043CbctDiary,
	sampleCrossSectionHUProfile,
} from "./implantSafetyEngine";
import {
	type HUZoneSampling,
	type MischClassificationResult,
	classifyMischBoneQuality,
	computeHUZoneProfile,
} from "./boneDensityMischMath";
import type { RadiologyStudy } from "./types";
import { showToast } from "../GlobalToast";

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

	// Viewport Layout Mode
	const [viewLayout, setViewLayout] = useState<"3plane_mpr" | "panoramic_cross_sections" | "quad_view">("quad_view");

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

	// Mandibular Canal position in cross-section (Relative to slice center)
	const [canalXOffsetMm, setCanalXOffsetMm] = useState<number>(2.0);
	const [canalYDepthMm, setCanalYDepthMm] = useState<number>(16.5);

	// ─── CANVAS REFS FOR ZERO-GC RENDERING ───────────────────────────────────
	const axialCanvasRef = useRef<HTMLCanvasElement>(null);
	const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
	const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
	const panoCanvasRef = useRef<HTMLCanvasElement>(null);
	const crossSectionCanvasRef = useRef<HTMLCanvasElement>(null);

	// Crosshair dragging state
	const [isDraggingCrosshair, setIsDraggingCrosshair] = useState<MprPlane | null>(null);

	// Initialize Volume on Open
	useEffect(() => {
		if (!isOpen) return;

		const vol = createSyntheticDentalCbctVolume(120, 120, 120, 0.5);
		setVolume(vol);
		setCrosshairMm({ x: 0, y: 0, z: 0 });

		const anchors = jawType === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;
		const arch = buildDentalArchCurve(anchors, jawType);
		setArchCurve(arch);

		return () => {
			if (vol) {
				disposeCbctVolume(vol);
			}
		};
	}, [isOpen, jawType]);

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

	// ─── RENDER 3-PLANE MPR SLICES (ZERO-GC CANVAS) ───────────────────────────
	useEffect(() => {
		if (!volume || !isOpen) return;

		const vox = worldMmToVoxel(crosshairMm, volume);

		// 1. Axial
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


				// Draw Dental Arch Spline on Axial
				ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				const spline = archCurve.splinePointsMm;
				for (let i = 0; i < spline.length; i++) {
					const pt = spline[i]!;
					const v = worldMmToVoxel({ x: pt.x, y: pt.y, z: crosshairMm.z }, volume);
					if (i === 0) ctx.moveTo(v.x, v.y);
					else ctx.lineTo(v.x, v.y);
				}
				ctx.stroke();

				// Draw Crosshair lines
				ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
				ctx.lineWidth = 1.0;
				// Horizontal
				ctx.beginPath();
				ctx.moveTo(0, vox.y);
				ctx.lineTo(canvas.width, vox.y);
				ctx.stroke();
				// Vertical
				ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
				ctx.beginPath();
				ctx.moveTo(vox.x, 0);
				ctx.lineTo(vox.x, canvas.height);
				ctx.stroke();
			}
		}

		// 2. Coronal
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

		// 3. Sagittal
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
	}, [volume, isOpen, crosshairMm, windowWidth, windowLevel, invertColors, slabMode, slabThicknessMm, archCurve]);

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

		// Render Panorama Canvas
		if (panoCanvasRef.current) {
			const canvas = panoCanvasRef.current;
			canvas.width = pano.widthPx;
			canvas.height = pano.heightPx;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const imgData = ctx.createImageData(pano.widthPx, pano.heightPx);
				imgData.data.set(pano.pixelData);
				ctx.putImageData(imgData, 0, 0);
			}
		}

		// Reconstruct Cross-Sections
		const csList = generateCrossSectionSlices(volume, archCurve, 1.5, 0.0, {
			windowWidth,
			windowLevel,
		});
		setCrossSections(csList);
	}, [volume, isOpen, archCurve, windowWidth, windowLevel, slabMode]);

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

		// 2. Draw Millimeter Scale Grid
		ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
		ctx.lineWidth = 1;
		const stepPx = 5.0 / pxSpacing; // 5 mm major lines
		for (let x = 0; x <= canvas.width; x += stepPx) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}
		for (let y = 0; y <= canvas.height; y += stepPx) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvas.width, y);
			ctx.stroke();
		}

		// 3. Draw Mandibular Canal & 2.0 mm Safety Corridor
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

		// 4. Draw Virtual Implant Caliper Outline
		const entryPxX = centerX + (currentImplantPose.entryPoint.x / pxSpacing);
		const entryPxY = topY + (currentImplantPose.entryPoint.y / pxSpacing);
		const apexCoord = calculateApexCoordinates(currentImplantPose.entryPoint, currentImplantPose.angulationDeg, currentImplantSpec.lengthMm);
		const apexPxX = centerX + (apexCoord.x / pxSpacing);
		const apexPxY = topY + (apexCoord.y / pxSpacing);
		const radiusPx = (currentImplantSpec.diameterMm / 2.0) / pxSpacing;


		ctx.save();
		ctx.translate(entryPxX, entryPxY);
		ctx.rotate((currentImplantPose.angulationDeg * Math.PI) / 180);

		const lengthPx = currentImplantSpec.lengthMm / pxSpacing;

		// Implant Body
		ctx.fillStyle = nerveAuditResult.isDangerous ? "rgba(239, 68, 68, 0.45)" : "rgba(6, 182, 212, 0.35)";
		ctx.strokeStyle = nerveAuditResult.isDangerous ? "#ef4444" : "#06b6d4";
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
	}, [activeCrossSection, currentCanal, currentImplantPose, currentImplantSpec, nerveAuditResult]);

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

	return createPortal(
		<div
			id={`cbct-mpr-studio-modal-${modalId}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby={`cbct-studio-title-${modalId}`}
			className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden"
		>
			{/* ─── HEADER BAR (TIER 1 HOT CONTROLS) ───────────────────────────── */}
			<header className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
						<Box className="w-5 h-5" />
					</div>
					<div>
						<h2 id={`cbct-studio-title-${modalId}`} className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
							3D КЛКТ MPR & Имплант-планировщик
							<span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
								60 FPS Sync
							</span>
						</h2>
						<p className="text-[11px] text-slate-400">
							Панорамная кривая · Косоугольные срезы · Коридор безопасности N. Alveolaris Inferior (2.0 мм) · Шкала Misch (HU)
						</p>
					</div>
				</div>

				{/* Center Toolbar: WW/WL Presets & Slab Modes */}
				<div className="flex items-center gap-2">
					<div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
						{CBCT_HOUNSFIELD_PRESETS.map((p) => (
							<button
								key={p.id}
								type="button"
								onClick={() => handleSelectPreset(p.id)}
								className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
									activePreset === p.id
										? "bg-cyan-600 text-white shadow"
										: "text-slate-400 hover:text-slate-200"
								}`}
							>
								{p.label.split(" ")[0]}
							</button>
						))}
					</div>

					<div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
						<button
							type="button"
							onClick={() => setSlabMode("single")}
							className={`px-2 py-1 rounded-lg text-xs font-medium min-h-[36px] ${slabMode === "single" ? "bg-slate-700 text-white" : "text-slate-400"}`}
						>
							Срез 1 мм
						</button>
						<button
							type="button"
							onClick={() => setSlabMode("mip")}
							className={`px-2 py-1 rounded-lg text-xs font-medium min-h-[36px] ${slabMode === "mip" ? "bg-slate-700 text-white" : "text-slate-400"}`}
						>
							Slab MIP
						</button>
						<button
							type="button"
							onClick={() => setSlabMode("average")}
							className={`px-2 py-1 rounded-lg text-xs font-medium min-h-[36px] ${slabMode === "average" ? "bg-slate-700 text-white" : "text-slate-400"}`}
						>
							Avg IP
						</button>
					</div>

					<div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
						<button
							type="button"
							onClick={() => handleToggleJawType("mandible")}
							className={`px-2.5 py-1 rounded-lg text-xs font-bold min-h-[36px] ${jawType === "mandible" ? "bg-amber-600/30 text-amber-300 border border-amber-500/50" : "text-slate-400"}`}
						>
							Нижняя челюсть
						</button>
						<button
							type="button"
							onClick={() => handleToggleJawType("maxilla")}
							className={`px-2.5 py-1 rounded-lg text-xs font-bold min-h-[36px] ${jawType === "maxilla" ? "bg-amber-600/30 text-amber-300 border border-amber-500/50" : "text-slate-400"}`}
						>
							Верхняя челюсть
						</button>
					</div>
				</div>

				{/* Right Actions: 1-Click Form 043 & Close */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleExportForm043Diary}
						className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center gap-1.5 min-h-[44px] transition-all"
					>
						<FileText className="w-4 h-4" />
						В карту 043/у
					</button>

					<button
						type="button"
						onClick={onClose}
						className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center min-h-[44px] min-w-[44px] transition-all"
						aria-label="Закрыть КЛКТ студию"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</header>

			{/* ─── MAIN WORKSPACE (4 VIEWPORTS + IMPLANT & NERVE PANEL) ───────── */}
			<div className="flex-1 grid grid-cols-12 gap-1 p-1 bg-slate-950 min-h-0 overflow-hidden">
				{/* ─── 4 VIEWPORTS GRID (COLS 1..8) ────────────────────────────── */}
				<div className="col-span-8 grid grid-cols-2 grid-rows-2 gap-1 min-h-0">
					{/* 1. AXIAL VIEWPORT (Z-PLANE) */}
					<div className="relative bg-black rounded-lg overflow-hidden border border-slate-800 flex flex-col">
						<div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/80 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
							<span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
							AXIAL (Горизонтальный срез)
						</div>
						<div className="absolute top-2 right-2 z-10 text-[10px] text-slate-400 font-mono">
							Z: {crosshairMm.z.toFixed(1)} мм
						</div>
						<div className="flex-1 flex items-center justify-center min-h-0 relative">
							<canvas
								ref={axialCanvasRef}
								onMouseDown={(e) => handleCanvasMouseDown("axial", e)}
								onMouseMove={(e) => handleCanvasMouseMove("axial", e)}
								onMouseUp={() => setIsDraggingCrosshair(null)}
								onWheel={(e) => handleCanvasWheel("axial", e)}
								className="max-w-full max-h-full object-contain cursor-crosshair"
							/>
						</div>
					</div>

					{/* 2. CORONAL VIEWPORT (Y-PLANE) */}
					<div className="relative bg-black rounded-lg overflow-hidden border border-slate-800 flex flex-col">
						<div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/80 border border-blue-500/40 text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
							<span className="w-2 h-2 rounded-full bg-blue-400" />
							CORONAL (Фронтальный срез)
						</div>
						<div className="absolute top-2 right-2 z-10 text-[10px] text-slate-400 font-mono">
							Y: {crosshairMm.y.toFixed(1)} мм
						</div>
						<div className="flex-1 flex items-center justify-center min-h-0 relative">
							<canvas
								ref={coronalCanvasRef}
								onMouseDown={(e) => handleCanvasMouseDown("coronal", e)}
								onMouseMove={(e) => handleCanvasMouseMove("coronal", e)}
								onMouseUp={() => setIsDraggingCrosshair(null)}
								onWheel={(e) => handleCanvasWheel("coronal", e)}
								className="max-w-full max-h-full object-contain cursor-crosshair"
							/>
						</div>
					</div>

					{/* 3. SAGITTAL VIEWPORT (X-PLANE) */}
					<div className="relative bg-black rounded-lg overflow-hidden border border-slate-800 flex flex-col">
						<div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
							<span className="w-2 h-2 rounded-full bg-emerald-400" />
							SAGITTAL (Сагиттальный профиль)
						</div>
						<div className="absolute top-2 right-2 z-10 text-[10px] text-slate-400 font-mono">
							X: {crosshairMm.x.toFixed(1)} мм
						</div>
						<div className="flex-1 flex items-center justify-center min-h-0 relative">
							<canvas
								ref={sagittalCanvasRef}
								onMouseDown={(e) => handleCanvasMouseDown("sagittal", e)}
								onMouseMove={(e) => handleCanvasMouseMove("sagittal", e)}
								onMouseUp={() => setIsDraggingCrosshair(null)}
								onWheel={(e) => handleCanvasWheel("sagittal", e)}
								className="max-w-full max-h-full object-contain cursor-crosshair"
							/>
						</div>
					</div>

					{/* 4. UNFOLDED PANORAMA (OPG FOCAL TROUGH) */}
					<div className="relative bg-black rounded-lg overflow-hidden border border-slate-800 flex flex-col">
						<div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/80 border border-purple-500/40 text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
							<span className="w-2 h-2 rounded-full bg-purple-400" />
							UNFOLDED PANORAMA (ОПТГ) · Толщина {archCurve.focalTroughThicknessMm} мм
						</div>
						<div className="flex-1 flex items-center justify-center min-h-0 relative">
							<canvas
								ref={panoCanvasRef}
								className="max-w-full max-h-full object-contain"
							/>
						</div>
					</div>
				</div>

				{/* ─── RIGHT WORKSPACE: CROSS-SECTION & IMPLANT PLANNER (COLS 9..12) ─── */}
				<aside className="col-span-4 bg-slate-900 rounded-lg border border-slate-800 flex flex-col min-h-0 overflow-y-auto p-3 gap-3">
					{/* Active Cross-Section Carousel Header */}
					<div className="flex items-center justify-between pb-2 border-b border-slate-800">
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold text-cyan-400">
								Срез #{activeCrossSection?.sliceIndex ?? 1} из {crossSections.length}
							</span>
							<span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-xs">
								Зуб FDI: {activeCrossSection?.nearestToothFdi ?? "46"}
							</span>
						</div>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setActiveCrossSectionIdx((prev) => Math.max(0, prev - 1))}
								className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[36px] min-w-[36px] flex items-center justify-center"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={() => setActiveCrossSectionIdx((prev) => Math.min(crossSections.length - 1, prev + 1))}
								className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[36px] min-w-[36px] flex items-center justify-center"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Cross-Section Viewport Canvas with Implant & Nerve Overlays */}
					<div className="relative h-56 bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
						<canvas
							ref={crossSectionCanvasRef}
							className="max-w-full max-h-full object-contain"
						/>

						{/* Quick Ridge Measurements Badge */}
						<div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-slate-900/90 text-[10px] text-slate-300 border border-slate-700 font-mono">
							<div>Высота: <strong className="text-cyan-300">{activeCrossSection?.corticalCrestHeightMm ?? 14.2} мм</strong></div>
							<div>Ширина: <strong className="text-cyan-300">{activeCrossSection?.alveolarRidgeWidthMm ?? 7.8} мм</strong></div>
						</div>
					</div>

					{/* ─── MANDIBULAR NERVE SAFETY ALARM BANNER ────────────────────── */}
					<div
						className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
							nerveAuditResult.isDangerous
								? "bg-rose-950/60 border-rose-500/80 text-rose-200 animate-pulse"
								: nerveAuditResult.isWarning
									? "bg-amber-950/60 border-amber-500/80 text-amber-200"
									: "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
						}`}
					>
						{nerveAuditResult.isDangerous ? (
							<ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
						) : nerveAuditResult.isWarning ? (
							<AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
						) : (
							<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
						)}
						<div className="text-xs">
							<div className="font-bold flex items-center justify-between">
								<span>Зазор до нерва: {nerveAuditResult.netClearanceToCanalWallMm} мм</span>
								<span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40">
									Норма {">="} 2.0 мм
								</span>
							</div>
							<p className="text-[11px] mt-0.5 opacity-90 leading-tight">
								{nerveAuditResult.clinicalMessageRu}
							</p>
						</div>
					</div>

					{/* ─── MISCH BONE DENSITY (HU) & DRILLING PROTOCOL ────────────── */}
					<div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
						<div className="flex items-center justify-between text-xs">
							<span className="font-bold text-slate-300">Плотность кости (Misch):</span>
							<span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
								Класс {mischClassification.mischClass} ({huSamplingResult.overallMeanHU} HU)
							</span>
						</div>
						<div className="grid grid-cols-3 gap-1 text-center text-[10px] bg-slate-900/60 p-2 rounded-lg">
							<div>
								<div className="text-slate-400">Кортекс (20%)</div>
								<div className="font-mono font-bold text-cyan-300">{huSamplingResult.coronalCrestalHU} HU</div>
							</div>
							<div>
								<div className="text-slate-400">Спонгиоза (60%)</div>
								<div className="font-mono font-bold text-cyan-300">{huSamplingResult.trabecularCoreHU} HU</div>
							</div>
							<div>
								<div className="text-slate-400">Апекс (20%)</div>
								<div className="font-mono font-bold text-cyan-300">{huSamplingResult.apicalBaseHU} HU</div>
							</div>
						</div>
						<div className="text-[11px] text-slate-400">
							Протокол: <strong className="text-slate-200">{mischClassification.recommendedDrillingRpm}</strong>.
							{mischClassification.underdrillingRecommended && (
								<span className="text-amber-400 font-semibold ml-1">Показан недопрепарирование (Underdrilling).</span>
							)}
						</div>
					</div>

					{/* ─── VIRTUAL IMPLANT CALIPER SELECTION ───────────────────────── */}
					<div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5">
						<div className="text-xs font-bold text-slate-300">Выбор имплантата (Библиотека):</div>

						{/* Brand selector */}
						<div className="grid grid-cols-4 gap-1">
							{(["straumann", "nobel", "osstem", "dentium"] as ImplantBrandKey[]).map((b) => (
								<button
									key={b}
									type="button"
									onClick={() => setSelectedBrand(b)}
									className={`py-1.5 rounded-lg text-xs font-bold capitalize min-h-[38px] transition-all ${
										selectedBrand === b
											? "bg-cyan-600 text-white shadow"
											: "bg-slate-800 text-slate-400 hover:text-slate-200"
									}`}
								>
									{b}
								</button>
							))}
						</div>

						{/* Diameter & Length Selectors */}
						<div className="grid grid-cols-2 gap-2 text-xs">
							<div>
								<label className="text-[10px] text-slate-400 block mb-1">Диаметр (мм):</label>
								<select
									value={selectedDiameterMm}
									onChange={(e) => setSelectedDiameterMm(Number.parseFloat(e.target.value))}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white min-h-[38px]"
								>
									<option value={3.5}>Ø 3.5 мм (Узкий)</option>
									<option value={4.0}>Ø 4.0 мм (Стандарт)</option>
									<option value={4.5}>Ø 4.5 мм (Широкий)</option>
									<option value={5.0}>Ø 5.0 мм (Молярный)</option>
								</select>
							</div>

							<div>
								<label className="text-[10px] text-slate-400 block mb-1">Длина (мм):</label>
								<select
									value={selectedLengthMm}
									onChange={(e) => setSelectedLengthMm(Number.parseFloat(e.target.value))}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white min-h-[38px]"
								>
									<option value={8.0}>L 8.0 мм</option>
									<option value={10.0}>L 10.0 мм</option>
									<option value={11.5}>L 11.5 мм</option>
									<option value={13.0}>L 13.0 мм</option>
								</select>
							</div>
						</div>

						{/* Angulation Slider */}
						<div className="flex flex-col gap-1 text-xs">
							<div className="flex items-center justify-between text-[11px] text-slate-400">
								<span>Наклон оси:</span>
								<span className="font-mono font-bold text-white">{implantAngulationDeg}°</span>
							</div>
							<input
								type="range"
								min={-30}
								max={30}
								step={1}
								value={implantAngulationDeg}
								onChange={(e) => setImplantAngulationDeg(Number.parseInt(e.target.value, 10))}
								className="w-full accent-cyan-500 min-h-[32px]"
							/>
						</div>
					</div>
				</aside>
			</div>
		</div>,
		document.body,
	);
};
