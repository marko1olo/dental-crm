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
	UploadCloud,
} from "lucide-react";
import {
	measureDistanceToMandibularNerve,
	measureDistanceToMaxillarySinus,
	measure3DDistanceMm,
	parseDicomDataset,
	type ParsedDicomDataset,
	type Point3D,
	type MandibularNerveMeasurement,
	type MaxillarySinusMeasurement,
} from "@dental/shared";
import * as fflate from "fflate";
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
	readonly initialStudyFile?: File | null;
	readonly initialIsStudyLoaded?: boolean;
}

/**
 * Helper to locate PixelData tag (7FE0, 0010) in DICOM binary stream.
 */
function findDicomPixelDataOffset(buffer: Uint8Array): { offset: number; length: number } | null {
	for (let i = 128; i < buffer.length - 12; i++) {
		if (
			buffer[i] === 0xe0 &&
			buffer[i + 1] === 0x7f &&
			buffer[i + 2] === 0x10 &&
			buffer[i + 3] === 0x00
		) {
			const vr0 = String.fromCharCode(buffer[i + 4] ?? 0);
			const vr1 = String.fromCharCode(buffer[i + 5] ?? 0);
			const vr = vr0 + vr1;
			const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

			if (vr === "OW" || vr === "OB" || vr === "UN") {
				const length = view.getUint32(i + 8, true);
				return {
					offset: i + 12,
					length: length === 0xffffffff ? buffer.length - (i + 12) : length,
				};
			}
			const length = view.getUint32(i + 4, true);
			return {
				offset: i + 8,
				length: length === 0xffffffff ? buffer.length - (i + 8) : length,
			};
		}
	}
	return null;
}

/**
 * Decodes raw uncompressed DICOM slice bytes to an ImageBitmap with Hounsfield windowing.
 */
async function decodeDicomBytesToBitmap(
	byteArray: Uint8Array,
	windowCenter: number,
	windowWidth: number,
): Promise<{ bitmap: ImageBitmap; dataset: ParsedDicomDataset } | null> {
	try {
		const dataset = parseDicomDataset(byteArray);
		const pixelInfo = findDicomPixelDataOffset(byteArray);
		if (!pixelInfo) return null;

		const width = dataset.columns || 512;
		const height = dataset.rows || 512;
		const bitsAllocated = dataset.bitsAllocated || 16;
		const rescaleSlope = dataset.rescaleSlope ?? 1;
		const rescaleIntercept = dataset.rescaleIntercept ?? 0;

		const imgData = new ImageData(width, height);
		const data = imgData.data;

		if (bitsAllocated === 16) {
			const view = new DataView(
				byteArray.buffer,
				byteArray.byteOffset + pixelInfo.offset,
				pixelInfo.length,
			);
			const pixelCount = Math.min(width * height, Math.floor(pixelInfo.length / 2));
			const isSigned = dataset.pixelRepresentation === 1;

			for (let i = 0; i < pixelCount; i++) {
				const raw = isSigned ? view.getInt16(i * 2, true) : view.getUint16(i * 2, true);
				const hu = raw * rescaleSlope + rescaleIntercept;
				const gray = huToGrayscale(hu, windowCenter, windowWidth);
				const idx = i * 4;
				data[idx] = gray;
				data[idx + 1] = gray;
				data[idx + 2] = gray;
				data[idx + 3] = 255;
			}
		} else if (bitsAllocated === 8) {
			const offset = pixelInfo.offset;
			const pixelCount = Math.min(width * height, pixelInfo.length);
			for (let i = 0; i < pixelCount; i++) {
				const gray = byteArray[offset + i] ?? 0;
				const idx = i * 4;
				data[idx] = gray;
				data[idx + 1] = gray;
				data[idx + 2] = gray;
				data[idx + 3] = 255;
			}
		} else {
			return null;
		}

		const bitmap = await createImageBitmap(imgData);
		return { bitmap, dataset };
	} catch {
		return null;
	}
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
	initialStudyFile = null,
	initialIsStudyLoaded = false,
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

	// Study loading state & Zero-Mock Fallback management
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [loadedFile, setLoadedFile] = useState<File | null>(initialStudyFile ?? null);
	const [loadedStudyName, setLoadedStudyName] = useState<string | null>(
		initialStudyFile ? initialStudyFile.name : initialIsStudyLoaded ? "DICOM серия КЛКТ" : null,
	);
	const [isStudyLoaded, setIsStudyLoaded] = useState<boolean>(
		Boolean(initialStudyFile || initialIsStudyLoaded),
	);
	const [isLoadingStudy, setIsLoadingStudy] = useState<boolean>(false);
	const [loadedSliceBitmap, setLoadedSliceBitmap] = useState<ImageBitmap | null>(null);

	useEffect(() => {
		if (initialStudyFile) {
			setLoadedFile(initialStudyFile);
			setLoadedStudyName(initialStudyFile.name);
			setIsStudyLoaded(true);
		} else if (initialIsStudyLoaded) {
			setIsStudyLoaded(true);
			setLoadedStudyName("DICOM серия КЛКТ");
		}
	}, [initialStudyFile, initialIsStudyLoaded]);

	const axialCanvasRef = useRef<HTMLCanvasElement>(null);
	const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
	const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
	const panoramicCanvasRef = useRef<HTMLCanvasElement>(null);

	const currentPreset: VisiographWindowPreset = VISIOGRAPH_WINDOW_PRESETS[activePreset];

	// Update slice bitmap when active preset changes on an already loaded file
	useEffect(() => {
		if (!loadedFile) return;
		let isCancelled = false;

		const updatePresetBitmap = async () => {
			try {
				const lower = loadedFile.name.toLowerCase();
				const arrayBuffer = await loadedFile.arrayBuffer();
				const byteArray = new Uint8Array(arrayBuffer);

				if (lower.endsWith(".zip")) {
					const unzipped = fflate.unzipSync(byteArray, {
						filter(f) {
							const fn = f.name.toLowerCase();
							return fn.endsWith(".dcm") || fn.endsWith(".dicom");
						},
					});
					const dcmKeys = Object.keys(unzipped);
					if (dcmKeys.length > 0 && dcmKeys[0]) {
						const firstDcmBytes = unzipped[dcmKeys[0]];
						if (firstDcmBytes) {
							const decoded = await decodeDicomBytesToBitmap(
								firstDcmBytes,
								currentPreset.windowCenter,
								currentPreset.windowWidth,
							);
							if (!isCancelled && decoded) {
								setLoadedSliceBitmap((prev) => {
									prev?.close?.();
									return decoded.bitmap;
								});
							}
						}
					}
				} else {
					const decoded = await decodeDicomBytesToBitmap(
						byteArray,
						currentPreset.windowCenter,
						currentPreset.windowWidth,
					);
					if (!isCancelled && decoded) {
						setLoadedSliceBitmap((prev) => {
							prev?.close?.();
							return decoded.bitmap;
						});
					}
				}
			} catch {
				// Keep current bitmap on preset decode error
			}
		};

		void updatePresetBitmap();

		return () => {
			isCancelled = true;
		};
	}, [activePreset, currentPreset.windowCenter, currentPreset.windowWidth, loadedFile]);

	// Handle loading real CBCT/DICOM research
	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const lower = file.name.toLowerCase();
		const isValid = lower.endsWith(".dcm") || lower.endsWith(".dicom") || lower.endsWith(".zip");
		if (!isValid) {
			showToast("Недопустимый формат файла. Поддерживаются только .dcm, .dicom или архивы .zip", "error");
			return;
		}

		setIsLoadingStudy(true);
		try {
			const arrayBuffer = await file.arrayBuffer();
			const byteArray = new Uint8Array(arrayBuffer);

			if (lower.endsWith(".zip")) {
				try {
					const unzipped = fflate.unzipSync(byteArray, {
						filter(f) {
							const fn = f.name.toLowerCase();
							return fn.endsWith(".dcm") || fn.endsWith(".dicom");
						},
					});
					const dcmKeys = Object.keys(unzipped);
					if (dcmKeys.length > 0 && dcmKeys[0]) {
						const firstDcmBytes = unzipped[dcmKeys[0]];
						if (firstDcmBytes) {
							const decoded = await decodeDicomBytesToBitmap(
								firstDcmBytes,
								currentPreset.windowCenter,
								currentPreset.windowWidth,
							);
							if (decoded) {
								setLoadedSliceBitmap((prev) => {
									prev?.close?.();
									return decoded.bitmap;
								});
							}
						}
					}
				} catch {
					// Archive marked as loaded even if direct in-memory decode encounters issues
				}
				setLoadedFile(file);
				setLoadedStudyName(file.name);
				setIsStudyLoaded(true);
				showToast(`КЛКТ архив "${file.name}" загружен (${(file.size / (1024 * 1024)).toFixed(1)} МБ)`, "success");
			} else {
				const decoded = await decodeDicomBytesToBitmap(
					byteArray,
					currentPreset.windowCenter,
					currentPreset.windowWidth,
				);
				if (decoded) {
					setLoadedSliceBitmap((prev) => {
						prev?.close?.();
						return decoded.bitmap;
					});
				}
				setLoadedFile(file);
				setLoadedStudyName(file.name);
				setIsStudyLoaded(true);
				showToast(`КЛКТ срез "${file.name}" успешно загружен (${(file.size / (1024 * 1024)).toFixed(1)} МБ)`, "success");
			}
		} catch {
			showToast("Ошибка при чтении файла КЛКТ исследования", "error");
		} finally {
			setIsLoadingStudy(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

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

			if (!isStudyLoaded) {
				// Pure calibration grid (#09090b + thin lines 40px)
				ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
				ctx.lineWidth = 1;
				ctx.beginPath();
				for (let x = 0; x <= w; x += 40) {
					ctx.moveTo(x + 0.5, 0);
					ctx.lineTo(x + 0.5, h);
				}
				for (let y = 0; y <= h; y += 40) {
					ctx.moveTo(0, y + 0.5);
					ctx.lineTo(w, y + 0.5);
				}
				ctx.stroke();

				// Clear clinical state message on canvas
				ctx.fillStyle = "#e4e4e7";
				ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("КЛКТ исследование не загружено.", w / 2, h / 2 - 12);

				ctx.fillStyle = "#a1a1aa";
				ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
				ctx.fillText(
					"Нажмите кнопку загрузки для выбора DICOM серии пациента",
					w / 2,
					h / 2 + 12,
				);
				return;
			}

			// REAL STUDY RENDERING
			if (loadedSliceBitmap) {
				ctx.drawImage(loadedSliceBitmap, 0, 0, w, h);
			} else {
				// Real study loaded without decoded single-slice bitmap (e.g. multi-volume archive)
				ctx.fillStyle = "#09090b";
				ctx.fillRect(0, 0, w, h);

				// Calibrated grid for loaded study
				ctx.strokeStyle = "rgba(45, 212, 191, 0.15)";
				ctx.lineWidth = 1;
				ctx.beginPath();
				for (let x = 0; x <= w; x += 40) {
					ctx.moveTo(x + 0.5, 0);
					ctx.lineTo(x + 0.5, h);
				}
				for (let y = 0; y <= h; y += 40) {
					ctx.moveTo(0, y + 0.5);
					ctx.lineTo(w, y + 0.5);
				}
				ctx.stroke();

				// Slice information
				ctx.fillStyle = "#a1a1aa";
				ctx.font = "11px monospace";
				ctx.textAlign = "left";
				ctx.textBaseline = "top";
				ctx.fillText(`Срез: ${type.toUpperCase()}`, 12, 12);
				if (loadedStudyName) {
					ctx.fillText(`Файл: ${loadedStudyName}`, 12, 28);
				}
			}

			// Crosshair Lines
			if (crosshairActive) {
				ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
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
			isStudyLoaded,
			loadedSliceBitmap,
			loadedStudyName,
			crosshairActive,
		],
	);

	useEffect(() => {
		renderSlice(axialCanvasRef.current, "axial");
		renderSlice(coronalCanvasRef.current, "coronal");
		renderSlice(sagittalCanvasRef.current, "sagittal");
		renderSlice(panoramicCanvasRef.current, "panoramic");
	}, [renderSlice]);

	// Cleanup canvas buffers, 2D contexts, and ImageBitmaps upon unmount to prevent memory leaks
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
			loadedSliceBitmap?.close?.();
		};
	}, [loadedSliceBitmap]);

	if (!isOpen) return null;

	const handleExportTo043 = async () => {
		if (!isStudyLoaded) {
			showToast(
				"Экспорт заблокирован: исследование КЛКТ не загружено. Прикрепление синтетических макетов запрещено стандартом клиники",
				"error",
			);
			return;
		}

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
		if (!isStudyLoaded) {
			showToast(
				"Экспорт заблокирован: исследование КЛКТ не загружено. Прикрепление синтетических макетов запрещено стандартом клиники",
				"error",
			);
			return;
		}

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
							{loadedStudyName ? (
								<span
									className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 max-w-[200px] truncate"
									title={loadedStudyName}
								>
									{loadedStudyName}
								</span>
							) : (
								<span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
									Нет файла КТ
								</span>
							)}
						</h2>
						<p className="text-xs text-neutral-400">
							{patientName} • {studyDate} • Воксель: {voxelSpacing.x}×{voxelSpacing.y}×{voxelSpacing.z} мм
							{!isStudyLoaded && (
								<span className="text-amber-400 font-medium ml-1.5">
									• Исследование не загружено
								</span>
							)}
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
					<input
						ref={fileInputRef}
						type="file"
						accept=".dcm,.dicom,.zip"
						className="hidden"
						onChange={handleFileUpload}
					/>
					<button
						type="button"
						onClick={handleUploadClick}
						disabled={isLoadingStudy}
						className="min-h-[44px] px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-neutral-700"
						title="Загрузить реальное КЛКТ исследование (.dcm, .dicom, .zip)"
					>
						<UploadCloud className="w-4 h-4 text-[var(--teal)]" />
						<span>{isLoadingStudy ? "Загрузка..." : isStudyLoaded ? "Сменить КЛКТ" : "Загрузить КЛКТ"}</span>
					</button>

					<button
						type="button"
						onClick={handleExportTo043}
						disabled={isExporting}
						className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer ${
							isStudyLoaded
								? "bg-[var(--teal)] hover:opacity-90 text-white"
								: "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 cursor-not-allowed"
						}`}
						title={
							isStudyLoaded
								? "Прикрепить срез к форме 043/у"
								: "Экспорт заблокирован: исследование КЛКТ не загружено"
						}
					>
						<Camera className="w-4 h-4" />
						<span>В карту 043/у</span>
					</button>
					<button
						type="button"
						onClick={handleDownloadJpg}
						className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
							isStudyLoaded
								? "bg-neutral-800 hover:bg-neutral-700 text-white"
								: "bg-neutral-900 text-neutral-500 cursor-not-allowed border border-neutral-800"
						}`}
						title={
							isStudyLoaded
								? "Сохранить JPG срез на диск"
								: "Скачивание заблокировано: исследование КЛКТ не загружено"
						}
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
						{!isStudyLoaded && (
							<div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none select-none text-center bg-black/20">
								<UploadCloud className="w-7 h-7 text-neutral-500 mb-2 opacity-60" />
								<p className="text-xs font-bold text-neutral-300 mb-0.5">
									КЛКТ исследование не загружено
								</p>
								<p className="text-[11px] text-neutral-400 max-w-[240px] leading-tight">
									Нажмите кнопку загрузки для выбора DICOM серии пациента
								</p>
							</div>
						)}
					</div>
					{/* High-contrast DOM coordinate badge (>=13px bold with backdrop-blur-md) */}
					<div className="cbct-slice-coord-badge">
						<span className="cbct-coord-label">Срез:</span>
						<span className="cbct-coord-value text-[var(--teal)]">
							{isStudyLoaded ? `Z: ${axialSliceZ} мм` : "Сетка калибровки"}
						</span>
						{isStudyLoaded && transforms.axial.zoom !== 1 && (
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
						{!isStudyLoaded && (
							<div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none select-none text-center bg-black/20">
								<UploadCloud className="w-7 h-7 text-neutral-500 mb-2 opacity-60" />
								<p className="text-xs font-bold text-neutral-300 mb-0.5">
									КЛКТ исследование не загружено
								</p>
								<p className="text-[11px] text-neutral-400 max-w-[240px] leading-tight">
									Нажмите кнопку загрузки для выбора DICOM серии пациента
								</p>
							</div>
						)}
					</div>
					{/* High-contrast DOM coordinate badge (>=13px bold with backdrop-blur-md) */}
					<div className="cbct-slice-coord-badge">
						<span className="cbct-coord-label">Срез:</span>
						<span className="cbct-coord-value text-blue-400">
							{isStudyLoaded ? `Y: ${coronalSliceY} мм` : "Сетка калибровки"}
						</span>
						{isStudyLoaded && transforms.coronal.zoom !== 1 && (
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
						{!isStudyLoaded && (
							<div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none select-none text-center bg-black/20">
								<UploadCloud className="w-7 h-7 text-neutral-500 mb-2 opacity-60" />
								<p className="text-xs font-bold text-neutral-300 mb-0.5">
									КЛКТ исследование не загружено
								</p>
								<p className="text-[11px] text-neutral-400 max-w-[240px] leading-tight">
									Нажмите кнопку загрузки для выбора DICOM серии пациента
								</p>
							</div>
						)}
					</div>
					{/* High-contrast DOM coordinate badge (>=13px bold with backdrop-blur-md) */}
					<div className="cbct-slice-coord-badge">
						<span className="cbct-coord-label">Срез:</span>
						<span className="cbct-coord-value text-amber-400">
							{isStudyLoaded ? `X: ${sagittalSliceX} мм` : "Сетка калибровки"}
						</span>
						{isStudyLoaded && transforms.sagittal.zoom !== 1 && (
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
						{!isStudyLoaded && (
							<div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none select-none text-center bg-black/20">
								<UploadCloud className="w-7 h-7 text-neutral-500 mb-2 opacity-60" />
								<p className="text-xs font-bold text-neutral-300 mb-0.5">
									КЛКТ исследование не загружено
								</p>
								<p className="text-[11px] text-neutral-400 max-w-[240px] leading-tight">
									Нажмите кнопку загрузки для выбора DICOM серии пациента
								</p>
							</div>
						)}
					</div>
					{/* High-contrast DOM coordinate badge (>=13px bold with backdrop-blur-md) */}
					<div className="cbct-slice-coord-badge">
						<span className="cbct-coord-label">Дуга:</span>
						<span className="cbct-coord-value text-emerald-400">
							{isStudyLoaded ? "FDI 11..48" : "Сетка калибровки"}
						</span>
						{isStudyLoaded && transforms.panoramic.zoom !== 1 && (
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
				{!isStudyLoaded ? (
					<div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
						<Info className="w-4 h-4 text-amber-400 shrink-0" />
						<span>Калибры и плотность HU неактивны: загрузите DICOM серию исследования КЛКТ.</span>
					</div>
				) : (
					<>
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
					</>
				)}
			</div>
		</div>
	);
};
