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
import {
	type ImplantData,
	VIEWPORT_IDS,
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
