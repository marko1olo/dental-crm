/**
 * implantPlanner.ts — Расчет и виртуальное позиционирование имплантата в объеме КЛКТ (Мандат 8b <= 120 строк).
 */

import * as cornerstone from "@cornerstonejs/core";
import { vec3 } from "gl-matrix";
import { calculateImplantBoneDensity, distancePointToSpline, mat3ToMat4Direction } from "../../../utils/math/mprMath";
import { mapCtCoordinatesToFdiNumber } from "../../../utils/dicom/fdiMapper";
import { type ImplantData, classifyExtendedBoneDensity } from "../cornerstoneTypes";
import { getImplantSystem, getPlatformForDiameter } from "../implantCatalog";
import { readVolumeScalarData } from "../panoramicArch";
import { VIEWPORT_IDS } from "./presets";
import type { ImplantPlacementParams, ImplantPlacementResult } from "./implantPlannerTypes";

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
		return { result: null, error: "Установка имплантата заблокирована: исследование КЛКТ не загружено." };
	}

	const voxels = readVolumeScalarData(
		{ dimensions: volume.dimensions, imageIds: volume.imageIds, voxelManager: volume.voxelManager },
		(imageId) => cornerstone.cache.getImage(imageId) !== undefined,
	);
	if (voxels.status !== "ready") {
		return { result: null, error: "Установка имплантата заблокирована: исследование КЛКТ не загружено." };
	}

	const renderingEngine = params.renderingEngineId
		? cornerstone.getRenderingEngine(params.renderingEngineId)
		: (cornerstone.getRenderingEngine("my-engine") ?? cornerstone.getRenderingEngines?.()?.[0]);
	const axialVp = renderingEngine?.getViewport(VIEWPORT_IDS.axial);
	const focal = axialVp?.getCamera()?.focalPoint;
	if (!focal || focal.length < 3 || !Number.isFinite(focal[0]) || !Number.isFinite(focal[1]) || !Number.isFinite(focal[2])) {
		return { result: null, warning: "Точка фокуса не определена. Выберите анатомическую область кликом." };
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
	const densityClassification = classifyExtendedBoneDensity(computed.averageHU);

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
			averageHU: Math.round(computed.averageHU),
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

	return { result: { implant: newImplant, fdiCode, distToNerve } };
}
