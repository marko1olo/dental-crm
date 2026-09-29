import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import { vec3 } from "gl-matrix";
import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	exportSnapshotToClinicalRecord,
} from "../visiograph/VisiographExportService";
import {
	VISIOGRAPH_WINDOW_PRESETS,
	type VisiographPresetId,
} from "./VisiographWindowPresets";
import {
	calculateImplantBoneDensity,
	distancePointToSpline,
	mat3ToMat4Direction,
	type Point2D,
	toTransferableScalarData,
} from "../../utils/math/mprMath";
import { mapCtCoordinatesToFdiNumber } from "../../utils/dicom/fdiMapper";
import { logger } from "../../utils/logger";
import {
	type ImplantData,
	VIEWPORT_IDS as BASE_VIEWPORT_IDS,
	classifyExtendedBoneDensity,
	implantProtocolLog,
} from "./cornerstoneTypes";
import {
	getImplantSystem,
	getPlatformForDiameter,
} from "./implantCatalog";
import {
	archFromStoredControlPoints,
	type CtPlanningMarkup,
	type WorldPoint3,
} from "./ctPlanningPersistence";
import {
	buildPanoramicArch,
	type DrawnArchAnnotation,
	type PanoramicIssue,
	readVolumeScalarData,
} from "./panoramicArch";
import type { PanoramicVolumeInput } from "./PanoramicRendererWindow";

export const VIEWPORT_IDS = {
	...BASE_VIEWPORT_IDS,
	volume3d: "VOLUME_3D",
} as const;

/**
 * Custom transfer function optimized for maxillofacial CBCT:
 * - HU < 150: completely transparent (air, fat, fluids, soft tissue)
 * - HU 150..400: trabecular / cancellous bone with warm ivory-apricot color
 * - HU 400..1200: cortical bone with bright bone ivory color
 * - HU 1200..2000+: dense enamel, dental crowns and titanium implants
 */
export const DENTAL_SKULL_BONE_PRESET = {
	name: "Dental-Skull-Bone",
	gradientOpacity: "4 0 1 255 1",
	specularPower: "15",
	scalarOpacity: "10 -1000 0 150 0 350 0.25 800 0.70 2000 0.85",
	specular: "0.25",
	shade: "1",
	ambient: "0.15",
	colorTransfer: "20 -1000 0 0 0 150 0.7 0.3 0.2 350 0.85 0.65 0.45 800 0.95 0.88 0.75 2000 1 1 1",
	diffuse: "0.85",
	interpolation: "1",
} as const;

export interface Volume3DPresetSpec {
	id: string;
	name: string;
	label: string;
	description: string;
	huRange: string;
	preset: any;
}

export const VOLUME_3D_PRESETS: readonly Volume3DPresetSpec[] = [
	{
		id: "bone",
		name: "CT-Bone",
		label: "Кость (CT-Bone)",
		description: "Стандартная клиническая реконструкция костной ткани",
		huRange: "150..2000 HU",
		preset: "CT-Bone",
	},
	{
		id: "skull_jaw",
		name: "Dental-Skull-Bone",
		label: "Череп / Челюсти",
		description: "Оптимизировано для челюстно-лицевой хирургии и имплантации",
		huRange: "150..2000 HU",
		preset: DENTAL_SKULL_BONE_PRESET,
	},
	{
		id: "dense_bone",
		name: "CT-Bones",
		label: "Плотная кость / Зубы",
		description: "Высококонтрастная кортикальная пластинка и зубной ряд",
		huRange: "400..3000 HU",
		preset: "CT-Bones",
	},
	{
		id: "tissue_bone",
		name: "CT-Chest-Vessels",
		label: "Ткани + Кость",
		description: "Визуализация мягкотканного контура лица и кости",
		huRange: "-200..1500 HU",
		preset: "CT-Chest-Vessels",
	},
	{
		id: "airway",
		name: "CT-Air",
		label: "Дыхательные пути",
		description: "Просвет воздухоносных путей и верхнечелюстных пазух",
		huRange: "-1000..-200 HU",
		preset: "CT-Air",
	},
] as const;

export function setupMprToolGroup(toolGroupId: string, renderingEngineId: string): void {
	let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
	if (!toolGroup) {
		toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)!;
	}

	toolGroup.addTool(cornerstoneTools.CrosshairsTool.toolName);
	toolGroup.setToolConfiguration(cornerstoneTools.CrosshairsTool.toolName, {
		viewportIndicators: false,
		autoPan: { enabled: false },
		mobile: { enabled: true, opacity: 1, handleRadius: 6 },
	});
	toolGroup.setToolActive(cornerstoneTools.CrosshairsTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
	});
	toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
	toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
	});
	toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
	toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
		bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
	});
	toolGroup.addTool(cornerstoneTools.PanTool.toolName);
	toolGroup.addTool(cornerstoneTools.LengthTool.toolName);
	toolGroup.addTool(cornerstoneTools.SplineROITool.toolName);
	toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);
	toolGroup.addTool(cornerstoneTools.ProbeTool.toolName);

	toolGroup.addViewport(VIEWPORT_IDS.axial, renderingEngineId);
	toolGroup.addViewport(VIEWPORT_IDS.sagittal, renderingEngineId);
	toolGroup.addViewport(VIEWPORT_IDS.coronal, renderingEngineId);
}

/**
 * Configures the dedicated 3D Volume viewport tool group with TrackballRotateTool (Primary LMB),
 * ZoomTool (Auxiliary MMB) and PanTool (Secondary RMB).
 */
export function setupVolume3DToolGroup(toolGroupId: string, renderingEngineId: string): void {
	let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
	if (!toolGroup) {
		toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)!;
	}

	try {
		toolGroup.addTool(cornerstoneTools.TrackballRotateTool.toolName);
		toolGroup.setToolActive(cornerstoneTools.TrackballRotateTool.toolName, {
			bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
		});
	} catch {
		// Tool already registered
	}

	try {
		toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
		toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
			bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
		});
	} catch {
		// Tool already registered
	}

	try {
		toolGroup.addTool(cornerstoneTools.PanTool.toolName);
		toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
			bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
		});
	} catch {
		// Tool already registered
	}

	try {
		toolGroup.addViewport(VIEWPORT_IDS.volume3d, renderingEngineId);
	} catch {
		// Viewport already added
	}
}

/**
 * Applies a 3D volume rendering preset or transfer function to the specified viewport.
 */
export function applyVolume3DPreset(
	viewport: any,
	presetInput: string | Record<string, any>,
): boolean {
	if (!viewport) return false;
	try {
		if (typeof viewport.setProperties === "function") {
			viewport.setProperties({ preset: presetInput });
			if (typeof viewport.render === "function") {
				viewport.render();
			}
			return true;
		}
	} catch (err) {
		logger.warn("[applyVolume3DPreset] Could not apply preset to volume3d:", err);
	}
	return false;
}

/**
 * Resets camera orientation, zoom and pan for the 3D Volume viewport.
 */
export function resetVolume3DCamera(viewport: any): boolean {
	if (!viewport) return false;
	try {
		if (typeof viewport.resetCamera === "function") {
			viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true });
			if (typeof viewport.render === "function") {
				viewport.render();
			}
			return true;
		}
	} catch (err) {
		logger.warn("[resetVolume3DCamera] Failed to reset 3D camera:", err);
	}
	return false;
}

/**
 * Rotates the 3D volume camera to a canonical clinical orientation (axial, sagittal, coronal).
 */
export function setVolume3DOrientation(
	viewport: any,
	orientation: "axial" | "sagittal" | "coronal",
): boolean {
	if (!viewport) return false;
	try {
		const map: Record<string, any> = {
			axial: cornerstone.Enums.OrientationAxis.AXIAL,
			sagittal: cornerstone.Enums.OrientationAxis.SAGITTAL,
			coronal: cornerstone.Enums.OrientationAxis.CORONAL,
		};
		const target = map[orientation];
		if (target && typeof viewport.applyViewOrientation === "function") {
			viewport.applyViewOrientation(target);
			if (typeof viewport.render === "function") {
				viewport.render();
			}
			return true;
		}
	} catch (err) {
		logger.warn("[setVolume3DOrientation] Failed to set orientation:", err);
	}
	return false;
}

export interface ImplantPlacementParams {
	volumeId: string | null;
	selectedSystemId: string;
	selectedDiameter: number;
	selectedLength: number;
	selectedFdiCode: string;
	restoredMarkup: CtPlanningMarkup | null;
	renderingEngineId?: string;
}

export interface ImplantPlacementResult {
	implant: ImplantData;
	fdiCode: string;
	distToNerve: number | null;
}

export function computeImplantPlacement(params: ImplantPlacementParams): {
	result: ImplantPlacementResult | null;
	error?: string;
	warning?: string;
} {
	const activeVolumeId = params.volumeId ?? "my-volume";
	let volume = activeVolumeId ? cornerstone.cache.getVolume(activeVolumeId) : undefined;
	if (!volume) {
		const allVolumes = cornerstone.cache.getVolumes();
		if (allVolumes && allVolumes.length > 0) volume = allVolumes[0];
	}
	if (!volume) {
		return { result: null, error: "Установка имплантата заблокирована: исследование КЛКТ не загружено. Планирование на пустом холсте запрещено стандартом клиники" };
	}

	const voxels = readVolumeScalarData(
		{ dimensions: volume.dimensions, imageIds: volume.imageIds, voxelManager: volume.voxelManager },
		(imageId) => cornerstone.cache.getImage(imageId) !== undefined,
	);
	if (voxels.status !== "ready") {
		return { result: null, error: "Установка имплантата заблокирована: исследование КЛКТ не загружено. Планирование на пустом холсте запрещено стандартом клиники" };
	}

	const renderingEngine = params.renderingEngineId
		? cornerstone.getRenderingEngine(params.renderingEngineId)
		: (cornerstone.getRenderingEngine("my-engine") ?? cornerstone.getRenderingEngines?.()?.[0]);
	const axialVp = renderingEngine?.getViewport(VIEWPORT_IDS.axial);
	const focal = axialVp?.getCamera()?.focalPoint;
	if (!focal || focal.length < 3 || !Number.isFinite(focal[0]) || !Number.isFinite(focal[1]) || !Number.isFinite(focal[2])) {
		return { result: null, warning: "Точка фокуса не определена. Выберите целевую анатомическую область кликом по срезу челюсти" };
	}

	const startX = focal[0];
	const startY = focal[1];
	const startZ = focal[2];
	const implantStart = vec3.fromValues(startX, startY, startZ);
	const implantEnd = vec3.fromValues(startX, startY, startZ - params.selectedLength);
	const sysSpec = getImplantSystem(params.selectedSystemId);
	const platform = getPlatformForDiameter(sysSpec.id, params.selectedDiameter);

	let distToNerve: number | null = null;
	const nervePoints = params.restoredMarkup?.nervePoints;
	if (nervePoints && nervePoints.length > 0) {
		const nerveSpline = nervePoints.map((p) => vec3.fromValues(p.x, p.y, p.z));
		distToNerve = distancePointToSpline(implantEnd, nerveSpline);
	}

	const computed = calculateImplantBoneDensity(
		voxels.scalarData as Float32Array,
		volume.dimensions,
		vec3.fromValues(volume.origin[0], volume.origin[1], volume.origin[2]),
		mat3ToMat4Direction(volume.direction),
		vec3.fromValues(volume.spacing[0], volume.spacing[1], volume.spacing[2]),
		implantStart,
		implantEnd,
		params.selectedDiameter,
	);
	const avgHUVal = computed.averageHU;
	const densityClassification = classifyExtendedBoneDensity(avgHUVal);

	let fdiCode = params.selectedFdiCode || "36";
	const jawSpline = params.restoredMarkup?.splinePoints;
	if (jawSpline && jawSpline.length >= 2) {
		const computedFdi = mapCtCoordinatesToFdiNumber({ x: startX, y: startY, z: startZ }, jawSpline);
		if (computedFdi) fdiCode = String(computedFdi);
	}

	const implantId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: `implant-${Date.now()}-${Math.round(startX)}-${Math.round(startY)}`;

	const newImplant: ImplantData = {
		id: implantId,
		fdiCode,
		diameter: params.selectedDiameter,
		length: params.selectedLength,
		startWorld: implantStart,
		endWorld: implantEnd,
		boneDensity: {
			averageHU: Math.round(avgHUVal),
			classification: densityClassification.mischClass,
			drillingAdvice: densityClassification.drillingRecommendation,
		},
		distanceToNerve: distToNerve,
		systemId: sysSpec.id,
		brandName: sysSpec.brand,
		lineName: sysSpec.line,
		platformCode: platform.code,
		platformColor: platform.hexColor,
	};

	return {
		result: {
			implant: newImplant,
			fdiCode,
			distToNerve,
		},
	};
}

export async function exportCornerstoneSnapshot(params: {
	targetDiv: HTMLElement | null;
	patientId: string | null;
	implants: ImplantData[];
	activePresetId: VisiographPresetId;
	aiProtocolLog: string;
	authHeaders?: Record<string, string>;
}): Promise<{ success: boolean; message?: string }> {
	const { targetDiv, patientId, implants, activePresetId, aiProtocolLog, authHeaders = {} } = params;
	if (!targetDiv) return { success: false, message: "Контейнер среза не найден" };
	const canvas = targetDiv.querySelector("canvas");
	if (!canvas) return { success: false, message: "Холст 3D MPR не найден для создания снимка." };
	if (!patientId) return { success: false, message: "Пациент не выбран. Выберите пациента для прикрепления снимка к Форме 043/у." };

	const lastImplant = implants[implants.length - 1];
	const capturedAt = new Date().toISOString();
	const dataUri = captureHighDpiCanvas(canvas, {
		pixelRatio: 2,
		mimeType: "image/jpeg",
		quality: 0.92,
		burnInHeader: {
			patientId,
			toothCode: lastImplant?.fdiCode ? String(lastImplant.fdiCode) : undefined,
			capturedAt,
			finding: lastImplant
				? `Имплантат Ø${lastImplant.diameter}x${lastImplant.length}мм, ${lastImplant.boneDensity.classification} (${Math.round(lastImplant.boneDensity.averageHU)} HU)`
				: "3D КЛКТ MPR аксиальный срез",
		},
	});
	const thumbUri = await createSnapshotThumbnail(canvas, 200, 0.85);

	const outcome = await exportSnapshotToClinicalRecord(
		{
			patientId,
			imageDataUri: dataUri,
			thumbnailDataUri: thumbUri,
			viewKind: "mpr_axial",
			preset: VISIOGRAPH_WINDOW_PRESETS[activePresetId],
			capturedAt,
			...(lastImplant?.fdiCode ? { fdiToothCode: String(lastImplant.fdiCode), toothCode: String(lastImplant.fdiCode) } : {}),
			...(typeof lastImplant?.distanceToNerve === "number" ? { nerveDistanceMm: lastImplant.distanceToNerve } : {}),
			...(lastImplant?.boneDensity ? { boneDensity: { averageHU: lastImplant.boneDensity.averageHU, classification: String(lastImplant.boneDensity.classification) } } : {}),
			...(lastImplant ? { implantDetails: { diameterMm: lastImplant.diameter, lengthMm: lastImplant.length } } : {}),
			radiologicalFinding: lastImplant
				? `3D КЛКТ срез: планирование имплантации в области зуба № ${lastImplant.fdiCode}. Плотность костной ткани: ${lastImplant.boneDensity.classification} (${Math.round(lastImplant.boneDensity.averageHU)} HU). ${lastImplant.distanceToNerve != null ? `Дистанция до нижнечелюстного канала: ${lastImplant.distanceToNerve.toFixed(1)} мм.` : "Нижнечелюстной нерв не размечен. Контроль дистанции безопасности невозможен."}`
				: "3D КЛКТ MPR аксиальный срез челюстно-лицевой области.",
			...(aiProtocolLog ? { aiProtocolLog } : {}),
			clinicalNote: `3D MPR аксиальный срез КЛКТ. Режим HU: ${VISIOGRAPH_WINDOW_PRESETS[activePresetId].label}.`,
		},
		authHeaders,
	);

	return outcome;
}

export function computeClickWorldCoords(
	vp: any,
	container: HTMLElement,
	clientX: number,
	clientY: number,
): WorldPoint3 | null {
	const rect = container.getBoundingClientRect();
	const canvasX = clientX - rect.left;
	const canvasY = clientY - rect.top;
	let worldX: number | null = null;
	let worldY: number | null = null;
	let worldZ: number | null = null;
	try {
		if (typeof vp?.canvasToWorld === "function") {
			const pt = vp.canvasToWorld([canvasX, canvasY]);
			if (pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1]) && Number.isFinite(pt[2])) {
				worldX = pt[0];
				worldY = pt[1];
				worldZ = pt[2];
			}
		}
	} catch {
		// fallback to camera
	}
	if (worldX === null || worldY === null || worldZ === null) {
		const focal = vp?.getCamera()?.focalPoint;
		if (focal && Number.isFinite(focal[0]) && Number.isFinite(focal[1]) && Number.isFinite(focal[2])) {
			worldX = focal[0];
			worldY = focal[1];
			worldZ = focal[2];
		}
	}
	if (worldX === null || worldY === null || worldZ === null) return null;
	return {
		x: Number(worldX.toFixed(2)),
		y: Number(worldY.toFixed(2)),
		z: Number(worldZ.toFixed(2)),
	};
}

export function generatePanorexVolumeInput(params: {
	element: HTMLElement | null;
	volumeId: string | null;
	restoredMarkup: CtPlanningMarkup | null;
}): {
	issue?: PanoramicIssue;
	archSummary?: { points: number; lengthMm: number };
	splinePoints?: Point2D[];
	panorexVolume?: PanoramicVolumeInput;
} {
	const { element, volumeId, restoredMarkup } = params;
	if (!element) return { issue: "read_failed" };
	let annotations: readonly DrawnArchAnnotation[];
	try {
		annotations =
			cornerstoneTools.annotation.state.getAnnotations(
				cornerstoneTools.SplineROITool.toolName,
				element as HTMLDivElement,
			) ?? [];
	} catch {
		return { issue: "read_failed" };
	}

	let arch = buildPanoramicArch(annotations);
	if (arch.status !== "ready" && arch.reason === "no_arch") {
		const stored = restoredMarkup?.splinePoints ?? [];
		if (stored.length > 0) arch = archFromStoredControlPoints(stored);
	}
	if (arch.status !== "ready") return { issue: arch.reason };
	if (!volumeId) return { issue: "volume_not_ready" };

	const volume = cornerstone.cache.getVolume(volumeId);
	const voxels = readVolumeScalarData(
		volume
			? {
					dimensions: volume.dimensions,
					imageIds: volume.imageIds,
					voxelManager: volume.voxelManager,
				}
			: null,
		(imageId) => cornerstone.cache.getImage(imageId) !== undefined,
	);
	if (voxels.status !== "ready" || !volume) return { issue: "volume_not_ready" };

	const [dx, dy, dz] = volume.dimensions;
	const [ox, oy, oz] = volume.origin;
	const [sx, sy, sz] = volume.spacing;

	return {
		archSummary: { points: arch.controlPoints.length, lengthMm: arch.lengthMm },
		splinePoints: arch.curve,
		panorexVolume: {
			scalarData: toTransferableScalarData(voxels.scalarData),
			dimensions: [dx, dy, dz],
			origin: [ox, oy, oz],
			direction: mat3ToMat4Direction(volume.direction),
			spacing: [sx, sy, sz],
		},
	};
}
